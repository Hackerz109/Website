-- Defense-in-depth only — PostgREST already can't expose a RETURNS TRIGGER
-- function as a callable RPC (these all reference NEW/OLD, which don't
-- exist outside trigger context, so a direct call would error immediately
-- regardless), but the Supabase advisor flags the raw EXECUTE grant
-- either way, and revoking it costs nothing.
--
-- Note: REVOKE ... FROM anon, authenticated alone is NOT sufficient when a
-- function still carries Postgres's default EXECUTE-to-PUBLIC grant from
-- creation time — every role implicitly inherits from PUBLIC, so that
-- grant has to be revoked explicitly too, or it keeps working underneath
-- the per-role revoke. All of these functions had that gap; PUBLIC is
-- included below for all of them.
REVOKE EXECUTE ON FUNCTION public.deduct_stock_on_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_single_default_address() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_order_trust_fields_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_coupon_redemptions_enforce_amounts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_order_items_recompute() FROM PUBLIC, anon, authenticated;
