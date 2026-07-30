-- Two related fixes:
--
-- 1. Stock was never actually deducted anywhere. Every payment path
--    (Razorpay verify, the Razorpay webhook, wallet redemption, and
--    admin's manual "Mark paid") only ever flips orders.payment_status —
--    nothing ever touched products.stock / product_variants.stock. Fixed
--    below with a single trigger on `orders` that fires the instant
--    payment_status transitions to 'paid', no matter which of those paths
--    caused it — same "enforced in the database, not per call site"
--    philosophy as recompute_order_total / log_order_status_change.
--
-- 2. Cash on Pickup: a new payment_method so a shopper picking up in
--    store can place an order and pay with cash when they arrive, instead
--    of paying online through Razorpay. Explicitly NOT reserved — stock
--    only ever moves once payment_status actually becomes 'paid' (i.e.
--    staff collect the cash and hit "Mark paid"), so an unpaid
--    cash-on-pickup order can legitimately be sold to someone else in the
--    meantime. This is enforced by construction: fix #1's trigger is the
--    only thing that ever deducts stock, and it never fires for a
--    still-pending order.

-- ------------------------------------------------------------------------
-- 1. Deduct stock the moment an order actually becomes paid.
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Only the pending/failed -> paid edge, and only once per order: if
  -- payment_status is set to 'paid' again later (e.g. a second webhook
  -- delivery, or an admin re-saving the same status) OLD.payment_status
  -- is already 'paid' at that point, so this is skipped — stock is never
  -- double-deducted no matter how many times a caller marks the same
  -- order paid.
  FOR v_item IN
    SELECT variant_id, product_id, quantity FROM public.order_items WHERE order_id = NEW.id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      -- GREATEST(0, ...) rather than trusting stock - quantity to stay
      -- non-negative: money has already changed hands by this point, so an
      -- oversold edge case (two paid orders racing for the last unit) must
      -- never roll back a payment confirmation via the stock >= 0 check.
      -- That's a "go fix the stock count" problem for the shop owner, not
      -- something that should ever fail this transaction.
      UPDATE public.product_variants
        SET stock = GREATEST(0, stock - v_item.quantity)
        WHERE id = v_item.variant_id;
    ELSIF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
        SET stock = GREATEST(0, stock - v_item.quantity)
        WHERE id = v_item.product_id;
    END IF;
    -- Neither id set (product/variant deleted since order was placed) —
    -- nothing to deduct against; already priced at 0 by recompute_order_total.
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_deduct_stock_on_payment ON public.orders;
CREATE TRIGGER orders_deduct_stock_on_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public.deduct_stock_on_payment();

-- ------------------------------------------------------------------------
-- 2. Cash on Pickup payment method.
-- ------------------------------------------------------------------------
CREATE TYPE public.payment_method_type AS ENUM ('online', 'cash_on_pickup');

ALTER TABLE public.orders
  ADD COLUMN payment_method public.payment_method_type NOT NULL DEFAULT 'online';

COMMENT ON COLUMN public.orders.payment_method IS
  'How the shopper intends to pay. ''cash_on_pickup'' orders are placed with no online payment at all and stay payment_status=''pending'' (so no stock is deducted — see deduct_stock_on_payment) until staff collect cash in store and mark the order paid.';

-- Cash on Pickup only ever makes sense alongside in-store pickup — never
-- for home delivery. NOT VALID so existing rows (all currently 'online',
-- the column default) aren't re-checked on migration; it still applies to
-- every insert/update from here on.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_cash_on_pickup_requires_pickup
  CHECK (payment_method <> 'cash_on_pickup' OR fulfillment_type = 'pickup') NOT VALID;
