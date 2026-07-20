-- Extends `orders` with delivery/pickup + wallet fields, and adds a full,
-- auditable status timeline so customers can see "Order Placed -> ... ->
-- Delivered" rather than just the current status.

CREATE TYPE public.fulfillment_type AS ENUM ('delivery', 'pickup');

ALTER TABLE public.orders
  ADD COLUMN fulfillment_type public.fulfillment_type NOT NULL DEFAULT 'delivery',
  ADD COLUMN delivery_zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN delivery_lat NUMERIC(9,6),
  ADD COLUMN delivery_lng NUMERIC(9,6),
  ADD COLUMN delivery_distance_km NUMERIC(6,2),
  ADD COLUMN delivery_instructions_snapshot TEXT,
  ADD COLUMN pickup_instructions_snapshot TEXT,
  ADD COLUMN wallet_used_cents INTEGER NOT NULL DEFAULT 0 CHECK (wallet_used_cents >= 0),
  ADD COLUMN confirmed_at TIMESTAMPTZ,
  ADD COLUMN packed_at TIMESTAMPTZ,
  ADD COLUMN ready_for_pickup_at TIMESTAMPTZ,
  ADD COLUMN out_for_delivery_at TIMESTAMPTZ,
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.shipping_cents IS 'The computed delivery or pickup charge actually applied to this order (see fulfillment_type). Populated from delivery_settings/delivery_rate_tiers at checkout time.';
COMMENT ON COLUMN public.orders.wallet_used_cents IS 'How much of this order was paid using Store Wallet credit. total_cents - wallet_used_cents is the amount still due via another payment method.';
COMMENT ON COLUMN public.orders.shipping_address IS 'Freeform/legacy address blob. For fulfillment_type=delivery, structured fields (line1/line2/city/state/pincode) are also stored here as JSON keys by the checkout flow; delivery_lat/delivery_lng hold the geocoded point used for zone matching.';

-- Full, append-only status timeline. One row per status the order has ever
-- been in, in order. This is what order detail pages render.
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON public.order_status_history (order_id, created_at);

-- Only SELECT is granted to authenticated — every row is written by the
-- trigger below (SECURITY DEFINER), never directly by a client.
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own order history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Logs every status change, stamps convenience timestamp columns, and
-- automatically refunds any wallet credit used on an order that gets
-- cancelled — so money is never silently stranded.
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.user_id);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());

    CASE NEW.status
      WHEN 'confirmed' THEN NEW.confirmed_at := now();
      WHEN 'packed' THEN NEW.packed_at := now();
      WHEN 'ready_for_pickup' THEN NEW.ready_for_pickup_at := now();
      WHEN 'out_for_delivery' THEN NEW.out_for_delivery_at := now();
      WHEN 'delivered' THEN NEW.delivered_at := now();
      WHEN 'cancelled' THEN
        NEW.cancelled_at := now();
        IF NEW.user_id IS NOT NULL AND NEW.wallet_used_cents > 0 THEN
          INSERT INTO public.wallet_transactions (user_id, amount_cents, type, reference_order_id, description)
          VALUES (NEW.user_id, NEW.wallet_used_cents, 'refund', NEW.id, 'Refund of wallet credit — order cancelled');
          NEW.wallet_used_cents := 0;
        END IF;
      ELSE
        -- no dedicated timestamp column for this status; history row above is enough
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

-- Deferred: this trigger references public.wallet_transactions, created in
-- the next migration. Created here as a no-op-safe forward reference isn't
-- possible in plpgsql (it's only checked at call time, not create time),
-- so the trigger itself is attached in the wallet migration instead, after
-- that table exists. See 20260719090300_store_wallet_system.sql.
