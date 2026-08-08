-- Stock visibility & unlimited stock
--
-- Two independent switches:
--
--   1. products.show_stock_count — whether the storefront shows the exact
--      number left ("7 in stock") or just a plain In stock / Sold out
--      state. Lives on products only (not per-variant): a shopper seeing
--      one variant of a product show a number and another not would be
--      a strange inconsistency, so one switch covers every variant of
--      that product.
--
--   2. stock_unlimited — this item is always treated as available no
--      matter what the `stock` column says, and is never marked sold
--      out. Added to BOTH products and product_variants, matching the
--      existing granularity of the `stock` column itself (a product with
--      variants prices/stocks each variant independently, so "unlimited"
--      needs to be settable per variant too — e.g. a made-to-order size
--      vs. a genuinely limited one). The underlying stock number is left
--      alone rather than cleared/repurposed, so flipping this back off
--      later just resumes tracking from whatever it already was.
ALTER TABLE public.products
  ADD COLUMN show_stock_count BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN stock_unlimited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.product_variants
  ADD COLUMN stock_unlimited BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.show_stock_count IS
  'Whether the storefront shows the exact stock number ("7 in stock") for this product, vs. just In stock / Sold out.';
COMMENT ON COLUMN public.products.stock_unlimited IS
  'When true, this product (its own price/stock — only used when it has no variants) is always shown as in stock regardless of the stock column.';
COMMENT ON COLUMN public.product_variants.stock_unlimited IS
  'When true, this variant is always shown as in stock regardless of the stock column.';

-- deduct_stock_on_payment (see migration 20260730100000) is the only place
-- stock is ever decremented. Skip rows marked unlimited so their stock
-- number doesn't quietly drift down from real sales while "unlimited" is
-- what's actually gating availability — CREATE OR REPLACE preserves the
-- existing REVOKE/GRANT on this function (set in
-- 20260805090400_harden_trigger_only_functions.sql), so those don't need
-- repeating here.
CREATE OR REPLACE FUNCTION public.deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT variant_id, product_id, quantity FROM public.order_items WHERE order_id = NEW.id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
        SET stock = GREATEST(0, stock - v_item.quantity)
        WHERE id = v_item.variant_id AND stock_unlimited = false;
    ELSIF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
        SET stock = GREATEST(0, stock - v_item.quantity)
        WHERE id = v_item.product_id AND stock_unlimited = false;
    END IF;
    -- Neither id set, or the row is marked unlimited — nothing to deduct.
  END LOOP;

  RETURN NEW;
END;
$$;

-- admin_dashboard_stats' "low stock" widget (see migration
-- 20260720100000) should never surface a product that's marked unlimited
-- — its stock number is irrelevant to whether it needs restocking.
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'total_customers', (SELECT count(*) FROM public.profiles),
    'new_customers_30d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'total_orders', (SELECT count(*) FROM public.orders),
    'orders_last_30d', (SELECT count(*) FROM public.orders WHERE created_at >= now() - interval '30 days'),
    'orders_by_status', (
      SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
      FROM (SELECT status, count(*) AS cnt FROM public.orders GROUP BY status) s
    ),
    'revenue_total_cents', (
      SELECT COALESCE(sum(total_cents), 0) FROM public.orders WHERE payment_status = 'paid'
    ),
    'revenue_30d_cents', (
      SELECT COALESCE(sum(total_cents), 0) FROM public.orders
      WHERE payment_status = 'paid' AND created_at >= now() - interval '30 days'
    ),
    'revenue_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'revenue_cents', COALESCE(o.rev, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') AS d(day)
      LEFT JOIN (
        SELECT date_trunc('day', created_at) AS day, sum(total_cents) AS rev
        FROM public.orders
        WHERE payment_status = 'paid' AND created_at >= now() - interval '30 days'
        GROUP BY date_trunc('day', created_at)
      ) o ON o.day = d.day
    ),
    'wallet_liability_cents', (SELECT COALESCE(sum(amount_cents), 0) FROM public.wallet_transactions),
    'pending_returns', (SELECT count(*) FROM public.return_requests WHERE status = 'requested'),
    'low_stock', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'stock', t.stock)), '[]'::jsonb)
      FROM (
        SELECT id, name, stock FROM public.products
        WHERE stock <= 3 AND active = true AND stock_unlimited = false
        ORDER BY stock ASC, name ASC LIMIT 10
      ) t
    ),
    'avg_order_value_cents', (SELECT COALESCE(round(avg(total_cents)), 0) FROM public.orders WHERE payment_status = 'paid'),
    'top_products', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT oi.product_name, sum(oi.quantity) AS units_sold, sum(oi.quantity * oi.unit_price_cents) AS revenue_cents
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
        GROUP BY oi.product_name
        ORDER BY sum(oi.quantity) DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
