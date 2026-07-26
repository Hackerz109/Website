-- Lets admin tell, per delivery order, whether delivery_lat/delivery_lng
-- came from the shopper explicitly setting a location (GPS "use my
-- location", a map tap, or a pin drag — `coords` in cart.tsx) versus a
-- background best-guess geocoded from their typed address text
-- (`addressCoords`, only ever used when they never touched the map).
-- Nothing about checkout behavior changes — this just persists a signal
-- that already existed transiently in the client, so admin doesn't have to
-- guess how much to trust a delivery pin before dispatching.
--
-- Trust note: like delivery_lat/delivery_lng themselves, this is reported
-- by the client at order-insert time and isn't independently verifiable —
-- that's an accepted, pre-existing trust boundary for this table (see the
-- "insert own orders" RLS policy), not a new one introduced here. It's safe
-- to leave that way because this column is informational only: nothing in
-- pricing, delivery eligibility, or payment reads it (unlike total_cents,
-- which is why recompute_order_total exists — see
-- 20260724120000_secure_order_pricing_integrity.sql). And per the existing
-- "admin update orders" policy (admin-only UPDATE), a customer can never
-- edit this value after the order is placed — only the value sent at
-- insert time ever counts.

ALTER TABLE public.orders
  ADD COLUMN delivery_location_precise BOOLEAN;

COMMENT ON COLUMN public.orders.delivery_location_precise IS
  'True = shopper set delivery_lat/lng via GPS "use my location", a map tap, or a pin drag. False = coordinates were only a background geocode guess from their typed address, never confirmed on the map. NULL = pickup order, or an order placed before this column existed. Informational only for admin — not used in any pricing/eligibility logic.';
