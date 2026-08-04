-- Pins search_path on these two SQL helper functions so they can't be
-- affected by an unexpected schema/object earlier in the caller's
-- search_path. Low actual risk today (both run SECURITY INVOKER, not
-- DEFINER, so they only ever act with the caller's own privileges) but
-- this is what the Supabase linter flags, and it's free to fix.
ALTER FUNCTION public.coupon_item_matches(public.coupons, uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.coupon_user_eligible(public.coupons, uuid) SET search_path = public;
