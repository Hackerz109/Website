-- Performance advisor flagged 22 foreign keys with no covering index across
-- 13 tables. Postgres doesn't auto-index FK columns (only the referenced
-- side, e.g. orders.id, gets one automatically) — the referencing side
-- needs an explicit index or every lookup/join/RLS-subquery on it is a
-- sequential scan. orders.user_id and order_items.order_id are the two
-- that matter most in practice: every "my orders" page, every order-detail
-- view, and the "read own order items" RLS policy's EXISTS subquery all
-- hit these on every request. Pure addition — cannot change query results,
-- only removes full-table scans on writes/deletes to the referenced tables
-- too (an unindexed FK also makes ON DELETE checks scan the child table).

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_zone_id ON public.orders(delivery_zone_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_return_requests_reviewed_by ON public.return_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item_id ON public.return_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_return_images_return_request_id ON public.return_images(return_request_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_by ON public.wallet_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_order_id ON public.wallet_transactions(reference_order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_return_id ON public.wallet_transactions(reference_return_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON public.support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by ON public.error_logs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON public.error_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alert_rules_created_by ON public.analytics_alert_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_scheduled_reports_created_by ON public.analytics_scheduled_reports(created_by);
