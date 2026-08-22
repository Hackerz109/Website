-- Part 1: Performance advisor flagged 62 RLS policies across 34 tables that
-- call auth.uid() / has_role(auth.uid(), ...) directly. Postgres treats a
-- bare auth.<fn>() call in a policy as something to re-run for every row a
-- query touches; wrapping it as (select auth.uid()) lets the planner
-- evaluate it once per query (InitPlan) and reuse the result. Same access
-- rules, same rows returned — this changes nothing about who can see or
-- write what, only how many times the same true/false gets computed.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- Every USING/WITH CHECK expression below is identical to what's live now
-- except for that wrapping (confirmed against a fresh pg_policies read
-- immediately before writing this migration).

ALTER POLICY "own profile read" ON public.profiles USING ((select auth.uid()) = id);
ALTER POLICY "own profile update" ON public.profiles USING ((select auth.uid()) = id);
ALTER POLICY "own profile insert" ON public.profiles WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "read own roles" ON public.user_roles USING ((select auth.uid()) = user_id);

ALTER POLICY "admin insert products" ON public.products WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update products" ON public.products USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete products" ON public.products USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin insert variants" ON public.product_variants WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update variants" ON public.product_variants USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete variants" ON public.product_variants USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin insert images" ON public.product_images WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update images" ON public.product_images USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete images" ON public.product_images USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin insert categories" ON public.categories WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update categories" ON public.categories USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete categories" ON public.categories USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin insert brands" ON public.brands WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update brands" ON public.brands USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete brands" ON public.brands USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin read coupons" ON public.coupons USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin insert coupons" ON public.coupons WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update coupons" ON public.coupons USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete coupons" ON public.coupons USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "read own redemptions" ON public.coupon_redemptions
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "insert own redemptions" ON public.coupon_redemptions
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = coupon_redemptions.order_id AND o.user_id = (select auth.uid()))
  );

ALTER POLICY "read own orders" ON public.orders
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "insert own orders" ON public.orders WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "admin update orders" ON public.orders USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "read own order items" ON public.order_items
  USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_items.order_id
      AND (o.user_id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::app_role))
  ));
ALTER POLICY "insert own order items" ON public.order_items
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = (select auth.uid())));

ALTER POLICY "read own order history" ON public.order_status_history
  USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_status_history.order_id
      AND (o.user_id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::app_role))
  ));

ALTER POLICY "read own return requests" ON public.return_requests
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "read own return items" ON public.return_items
  USING (EXISTS (
    SELECT 1 FROM return_requests r WHERE r.id = return_items.return_request_id
      AND (r.user_id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::app_role))
  ));

ALTER POLICY "read own return images" ON public.return_images
  USING (EXISTS (
    SELECT 1 FROM return_requests r WHERE r.id = return_images.return_request_id
      AND (r.user_id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::app_role))
  ));

ALTER POLICY "read own wallet transactions" ON public.wallet_transactions
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "manage own addresses" ON public.user_addresses
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "admin read addresses" ON public.user_addresses USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin manage own push subscriptions" ON public.push_subscriptions
  USING (user_id = (select auth.uid()) AND has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (user_id = (select auth.uid()) AND has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "read own support tickets" ON public.support_tickets
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "read own support messages" ON public.support_messages
  USING (EXISTS (
    SELECT 1 FROM support_tickets t WHERE t.id = support_messages.ticket_id
      AND (t.user_id = (select auth.uid()) OR has_role((select auth.uid()), 'admin'::app_role))
  ));

ALTER POLICY "auth read bulk tiers" ON public.bulk_pricing_tiers
  USING (active = true OR has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin insert bulk tiers" ON public.bulk_pricing_tiers WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update bulk tiers" ON public.bulk_pricing_tiers USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete bulk tiers" ON public.bulk_pricing_tiers USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin manage store locations" ON public.store_locations
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage delivery zones" ON public.delivery_zones
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage rate tiers" ON public.delivery_rate_tiers
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage delivery settings" ON public.delivery_settings
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "own review insert" ON public.product_reviews WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "own review update" ON public.product_reviews USING ((select auth.uid()) = user_id);
ALTER POLICY "own review delete" ON public.product_reviews USING ((select auth.uid()) = user_id);

ALTER POLICY "admin insert synonyms" ON public.search_synonyms WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin update synonyms" ON public.search_synonyms USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin delete synonyms" ON public.search_synonyms USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin read search logs" ON public.search_logs USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "admin read sessions" ON public.analytics_sessions USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin read events" ON public.analytics_events USING (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage error logs" ON public.error_logs
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage alert rules" ON public.analytics_alert_rules
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage alert events" ON public.analytics_alert_events
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin manage scheduled reports" ON public.analytics_scheduled_reports
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
ALTER POLICY "admin read performance metrics" ON public.analytics_performance_metrics
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- Part 2: same defense-in-depth cleanup as 20260804232104_harden_trigger_only_functions,
-- for five trigger functions added after that pass (effective-price/stock
-- triggers on 8/15, popularity triggers on 8/13, bulk-tier guard, and the
-- review-rating recalc) that shipped with Postgres's default PUBLIC
-- EXECUTE and never got the same revoke. Same reasoning as that migration:
-- PostgREST can't call a RETURNS TRIGGER function directly (NEW/OLD don't
-- exist outside trigger context), so this closes an advisor warning, not
-- an active hole.
REVOKE EXECUTE ON FUNCTION public.product_variants_effective_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.products_effective_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_items_popularity_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_status_popularity_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bulk_tier_variant_matches_product() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_product_rating() FROM anon, authenticated;
