-- Store Wallet
-- A single append-only ledger per customer (balance = SUM of their rows —
-- same "derive from the ledger, never store a counter" philosophy as the
-- coupon system). All writes go through SECURITY DEFINER RPCs that take an
-- advisory lock per user, so concurrent debits can never overdraw.

CREATE TYPE public.wallet_transaction_type AS ENUM ('credit', 'debit', 'refund', 'adjustment');

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0), -- signed: positive credits, negative debits
  type public.wallet_transaction_type NOT NULL,
  reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reference_return_id UUID REFERENCES public.return_requests(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- admin, for manual adjustments; null = system-generated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wallet_transactions_user_idx ON public.wallet_transactions (user_id, created_at);

-- SELECT only — every credit/debit is written by an RPC below, never by a
-- direct client insert, so balances can't be forged.
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Now that wallet_transactions exists, attach the trigger defined in
-- 20260719090200_orders_delivery_wallet_fields.sql.
CREATE TRIGGER orders_log_status_change
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Customer-facing: apply wallet balance toward an unpaid order, up to the
-- lesser of the requested amount, the remaining balance due, and the
-- customer's actual wallet balance. Locked per-user so two concurrent
-- redemptions can't both read the same starting balance.
CREATE OR REPLACE FUNCTION public.wallet_redeem_for_order(p_order_id UUID, p_amount_cents INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_balance INTEGER;
  v_remaining_due INTEGER;
  v_apply INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please sign in.');
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Enter an amount greater than zero.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL OR v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found.');
  END IF;
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'message', 'This order is already paid.');
  END IF;

  v_remaining_due := v_order.total_cents - v_order.wallet_used_cents;
  IF v_remaining_due <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nothing left to pay on this order.');
  END IF;

  SELECT coalesce(sum(amount_cents), 0) INTO v_balance FROM public.wallet_transactions WHERE user_id = auth.uid();
  IF v_balance <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Your wallet balance is ₹0.');
  END IF;

  v_apply := least(p_amount_cents, v_remaining_due, v_balance);

  INSERT INTO public.wallet_transactions (user_id, amount_cents, type, reference_order_id, description)
  VALUES (auth.uid(), -v_apply, 'debit', p_order_id, 'Applied to order #' || substr(p_order_id::text, 1, 8));

  UPDATE public.orders SET
    wallet_used_cents = wallet_used_cents + v_apply,
    payment_status = CASE WHEN wallet_used_cents + v_apply >= total_cents THEN 'paid' ELSE payment_status END,
    paid_at = CASE WHEN wallet_used_cents + v_apply >= total_cents THEN now() ELSE paid_at END
    WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied_cents', v_apply,
    'wallet_used_cents', v_order.wallet_used_cents + v_apply,
    'remaining_due_cents', greatest(0, v_remaining_due - v_apply)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.wallet_redeem_for_order(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_for_order(UUID, INTEGER) TO authenticated;

-- Admin-facing: manually credit or debit a customer's wallet with a reason.
-- p_amount_cents may be negative (debit); a debit that would take the
-- balance below zero is rejected.
CREATE OR REPLACE FUNCTION public.admin_wallet_adjust(p_user_id UUID, p_amount_cents INTEGER, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required.');
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Enter a non-zero amount.');
  END IF;
  IF trim(coalesce(p_reason, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'A reason is required for wallet adjustments.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  IF p_amount_cents < 0 THEN
    SELECT coalesce(sum(amount_cents), 0) INTO v_balance FROM public.wallet_transactions WHERE user_id = p_user_id;
    IF v_balance + p_amount_cents < 0 THEN
      RETURN jsonb_build_object('success', false, 'message', 'This would take the wallet balance below ₹0.');
    END IF;
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount_cents, type, description, created_by)
  VALUES (p_user_id, p_amount_cents, 'adjustment', p_reason, auth.uid());

  SELECT coalesce(sum(amount_cents), 0) INTO v_balance FROM public.wallet_transactions WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true, 'new_balance_cents', v_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_wallet_adjust(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_wallet_adjust(UUID, INTEGER, TEXT) TO authenticated;

-- Admin-facing: finalize the refund for an approved/partially-approved
-- return. Wallet credit is applied immediately and atomically here.
-- Original-payment-method refunds are initiated from the app server (which
-- calls the Razorpay Refunds API with the service-role key) and land on
-- this same function to record the outcome — see
-- src/routes/api.refund-razorpay-payment.ts.
CREATE OR REPLACE FUNCTION public.admin_process_refund(
  p_return_id UUID,
  p_method public.refund_method_type,
  p_external_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return public.return_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required.');
  END IF;

  SELECT * INTO v_return FROM public.return_requests WHERE id = p_return_id;
  IF v_return.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Return request not found.');
  END IF;
  IF v_return.status NOT IN ('approved', 'partially_approved') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only approved returns can be refunded.');
  END IF;
  IF v_return.refund_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nothing to refund.');
  END IF;

  IF p_method = 'wallet_credit' THEN
    INSERT INTO public.wallet_transactions (user_id, amount_cents, type, reference_order_id, reference_return_id, description, created_by)
    VALUES (v_return.user_id, v_return.refund_amount_cents, 'refund', v_return.order_id, v_return.id,
            'Refund — return #' || substr(v_return.id::text, 1, 8), auth.uid());
  END IF;
  -- For 'original_payment', the caller (api.refund-razorpay-payment.ts) has
  -- already confirmed the gateway refund succeeded before calling this
  -- function; p_external_ref carries the gateway refund id for the record.

  UPDATE public.return_requests
    SET status = 'refunded', refund_method = p_method, refunded_at = now(),
        admin_notes = coalesce(admin_notes, '') ||
          CASE WHEN p_external_ref IS NOT NULL THEN E'\nGateway refund ref: ' || p_external_ref ELSE '' END
    WHERE id = p_return_id;

  UPDATE public.orders SET status = 'refunded', payment_status = 'refunded' WHERE id = v_return.order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_process_refund(UUID, public.refund_method_type, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_refund(UUID, public.refund_method_type, TEXT) TO authenticated;
