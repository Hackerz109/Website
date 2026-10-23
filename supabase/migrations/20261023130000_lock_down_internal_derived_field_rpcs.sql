-- Revoke the default PUBLIC EXECUTE grant from trigger-only callbacks and
-- their internal recalculation helpers. These functions either require
-- trigger context or update derived product fields and are not client RPCs.
REVOKE EXECUTE ON FUNCTION public.recalc_effective_price_stock(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_product_popularity(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_bulk_tier_variant_matches_product()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_items_popularity_trigger()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_status_popularity_trigger()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.product_variants_effective_trigger()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.products_effective_trigger()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_product_rating()
  FROM PUBLIC, anon, authenticated;
