-- Bulk / quantity discount pricing ("buy more, save more")
--
-- Tiers are defined at the PRODUCT level (not per-variant) — the same tier
-- ladder applies no matter which variant a shopper picks, applied against
-- whichever price is actually active for that line (the variant's own
-- price_cents if the product has variants, otherwise the product's own
-- price_cents). That keeps setup to one place per product instead of
-- duplicating the same tiers across every variant.
--
-- Enforcement follows the exact pattern already established in
-- 20260724120000_secure_order_pricing_integrity.sql: resolve_bulk_unit_price_cents()
-- is the single source of truth for "what does this quantity actually pay
-- per unit", and it's wired into recompute_order_total() so the real
-- charged price is always server-computed from this table — never trusted
-- from the client, no matter what a shopper's browser sends at checkout.

CREATE TYPE public.bulk_discount_type AS ENUM ('percentage', 'flat_amount', 'fixed_price');

CREATE TABLE public.bulk_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL CHECK (min_qty >= 2),
  discount_type public.bulk_discount_type NOT NULL DEFAULT 'percentage',
  -- percentage: whole number 1-100 (% off the unit's catalog price).
  -- flat_amount: cents off the unit's catalog price.
  -- fixed_price: the resulting unit price itself, in cents, at this tier.
  discount_value INTEGER NOT NULL CHECK (discount_value >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, min_qty)
);

COMMENT ON TABLE public.bulk_pricing_tiers IS
  'Quantity-break pricing per product. resolve_bulk_unit_price_cents() picks the highest min_qty tier a given quantity clears, so tiers do not need to be contiguous.';

CREATE INDEX bulk_pricing_tiers_product_idx ON public.bulk_pricing_tiers (product_id);

CREATE TRIGGER bulk_pricing_tiers_touch_updated_at BEFORE UPDATE ON public.bulk_pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT ON public.bulk_pricing_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_pricing_tiers TO authenticated;
GRANT ALL ON public.bulk_pricing_tiers TO service_role;
ALTER TABLE public.bulk_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- This is catalog pricing, not a secret code — same openness as
-- products.price_cents itself — so anyone can read ACTIVE tiers, which is
-- what lets the storefront show a "buy more, save more" table before the
-- shopper is even signed in. Only admins can see inactive/draft tiers or
-- ever write to this table.
CREATE POLICY "public read active bulk tiers" ON public.bulk_pricing_tiers FOR SELECT TO anon USING (active = true);
CREATE POLICY "auth read bulk tiers" ON public.bulk_pricing_tiers FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert bulk tiers" ON public.bulk_pricing_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update bulk tiers" ON public.bulk_pricing_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete bulk tiers" ON public.bulk_pricing_tiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------------------
-- Reporting columns — same spirit as coupons' discount_cents/coupon_code:
-- lets admin + customer order views show what bulk pricing actually saved,
-- without having to reverse-engineer it from unit_price_cents afterwards.
-- ------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN bulk_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (bulk_discount_cents >= 0);
COMMENT ON COLUMN public.orders.bulk_discount_cents IS
  'Total saved across all lines via bulk-quantity pricing. Informational only — already folded into subtotal_cents via each line''s tiered unit_price_cents, not subtracted again.';

ALTER TABLE public.order_items
  ADD COLUMN base_unit_price_cents INTEGER;
COMMENT ON COLUMN public.order_items.base_unit_price_cents IS
  'The catalog unit price before any bulk-quantity discount was applied. NULL when no bulk tier applied to this line — unit_price_cents alone is then the catalog price.';

-- ------------------------------------------------------------------------
-- The tier resolver. Given a product, the catalog unit price that's
-- actually in force for a line (variant price or product price — resolved
-- by the caller), and the quantity being bought, returns what that
-- quantity pays per unit. Only ever called from trusted server contexts
-- (recompute_order_total below), never exposed to anon/authenticated —
-- same reasoning as recompute_order_total itself: nothing here needs a
-- guessable secret, but the price math must never be client-influenced.
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_bulk_unit_price_cents(
  p_product_id UUID,
  p_base_price_cents INTEGER,
  p_quantity INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.bulk_pricing_tiers%ROWTYPE;
  v_price INTEGER;
BEGIN
  IF p_product_id IS NULL OR p_base_price_cents IS NULL OR p_base_price_cents <= 0
     OR p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN GREATEST(0, COALESCE(p_base_price_cents, 0));
  END IF;

  -- Best tier = the highest min_qty this quantity still clears. Tiers
  -- don't need to be contiguous (e.g. only 5 and 20 defined is fine).
  SELECT * INTO t FROM public.bulk_pricing_tiers
    WHERE product_id = p_product_id AND active = true AND min_qty <= p_quantity
    ORDER BY min_qty DESC
    LIMIT 1;

  IF t.id IS NULL THEN
    RETURN p_base_price_cents;
  END IF;

  IF t.discount_type = 'percentage' THEN
    v_price := p_base_price_cents - FLOOR(p_base_price_cents * LEAST(t.discount_value, 100) / 100.0)::INTEGER;
  ELSIF t.discount_type = 'flat_amount' THEN
    v_price := p_base_price_cents - t.discount_value;
  ELSE -- fixed_price
    v_price := t.discount_value;
  END IF;

  v_price := GREATEST(0, v_price);
  -- A percentage/flat tier can never end up pricier than just buying it at
  -- the normal price — clamp it. A fixed_price tier is trusted as the
  -- admin's deliberate override (e.g. round-number pricing) and is only
  -- floored at zero, not capped to the catalog price.
  IF t.discount_type <> 'fixed_price' THEN
    v_price := LEAST(v_price, p_base_price_cents);
  END IF;

  RETURN v_price;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_bulk_unit_price_cents(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_bulk_unit_price_cents(UUID, INTEGER, INTEGER) TO service_role;

-- ------------------------------------------------------------------------
-- recompute_order_total(): unchanged shape, now bulk-tier-aware. The
-- "true price" for each line is the tiered price for that line's actual
-- quantity, not just the flat catalog price — so a shopper who edits
-- quantity, or hits checkout with a stale client-computed price, always
-- gets charged exactly what the tiers table says that quantity is worth.
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_order_total(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_catalog_price INTEGER;
  v_tiered_price INTEGER;
  v_subtotal INTEGER := 0;
  v_discount INTEGER := 0;
  v_bulk_discount INTEGER := 0;
  v_shipping INTEGER := 0;
  v_total INTEGER := 0;
  v_items JSONB;
  v_coupon_result JSONB;
  v_delivery_result JSONB;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  -- Never rewrite the numbers on an order that's already been paid — those
  -- are a financial record at that point, not a draft.
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'message', 'Order already paid');
  END IF;

  -- Force every line item's price back to the catalog, then apply
  -- whatever bulk-quantity tier that line's quantity earns. Anything that
  -- can't be resolved (deleted product/variant, or a phantom item with no
  -- product_id at all) is priced at zero rather than trusted.
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    v_catalog_price := NULL;
    IF v_item.variant_id IS NOT NULL THEN
      SELECT price_cents INTO v_catalog_price FROM public.product_variants WHERE id = v_item.variant_id;
    END IF;
    IF v_catalog_price IS NULL AND v_item.product_id IS NOT NULL THEN
      SELECT price_cents INTO v_catalog_price FROM public.products WHERE id = v_item.product_id;
    END IF;
    IF v_catalog_price IS NULL THEN
      v_catalog_price := 0;
    END IF;

    v_tiered_price := v_catalog_price;
    IF v_item.product_id IS NOT NULL THEN
      v_tiered_price := public.resolve_bulk_unit_price_cents(v_item.product_id, v_catalog_price, v_item.quantity);
    END IF;

    v_bulk_discount := v_bulk_discount + GREATEST(0, v_catalog_price - v_tiered_price) * v_item.quantity;

    IF v_tiered_price IS DISTINCT FROM v_item.unit_price_cents
       OR v_item.base_unit_price_cents IS DISTINCT FROM (CASE WHEN v_tiered_price < v_catalog_price THEN v_catalog_price ELSE NULL END) THEN
      UPDATE public.order_items
        SET unit_price_cents = v_tiered_price,
            base_unit_price_cents = CASE WHEN v_tiered_price < v_catalog_price THEN v_catalog_price ELSE NULL END
        WHERE id = v_item.id;
    END IF;
  END LOOP;

  SELECT coalesce(sum(unit_price_cents * quantity), 0) INTO v_subtotal
    FROM public.order_items WHERE order_id = p_order_id;

  -- Recompute the coupon discount from the corrected (now bulk-tiered)
  -- line totals — never the discount_cents the client originally sent.
  IF v_order.coupon_code IS NOT NULL THEN
    SELECT jsonb_agg(jsonb_build_object(
      'product_id', oi.product_id,
      'category_id', p.category_id,
      'brand_id', p.brand_id,
      'line_total_cents', oi.unit_price_cents * oi.quantity
    ))
    INTO v_items
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id;

    v_coupon_result := public.validate_coupon(v_order.coupon_code, v_order.user_id, coalesce(v_items, '[]'::jsonb));
    IF (v_coupon_result->>'valid')::boolean THEN
      v_discount := coalesce((v_coupon_result->>'discount_cents')::integer, 0);
    ELSE
      v_discount := 0; -- coupon no longer applies (expired/limit hit/etc.) — no unearned discount
    END IF;
  END IF;

  -- Recompute shipping from the delivery/pickup settings rather than the
  -- client-supplied shipping_cents.
  IF v_order.fulfillment_type = 'pickup' THEN
    SELECT pickup_charge_cents INTO v_shipping FROM public.delivery_settings WHERE id = true;
    v_shipping := coalesce(v_shipping, 0);
  ELSIF v_order.delivery_lat IS NOT NULL AND v_order.delivery_lng IS NOT NULL THEN
    v_delivery_result := public.calculate_delivery_charge(v_order.delivery_lat, v_order.delivery_lng, v_subtotal);
    IF (v_delivery_result->>'eligible')::boolean THEN
      v_shipping := coalesce((v_delivery_result->>'charge_cents')::integer, 0);
    ELSE
      -- Zone eligibility can legitimately shift between order placement and
      -- now (admin edited zones) — that's a business edge case, not a
      -- pricing exploit, so fall back to what was already stored rather
      -- than blocking checkout here.
      v_shipping := v_order.shipping_cents;
    END IF;
  ELSE
    v_shipping := v_order.shipping_cents;
  END IF;

  IF v_coupon_result IS NOT NULL AND (v_coupon_result->>'free_shipping')::boolean THEN
    v_shipping := 0;
  END IF;

  v_total := greatest(0, v_subtotal - v_discount + v_shipping);

  UPDATE public.orders SET
    subtotal_cents = v_subtotal,
    discount_cents = v_discount,
    bulk_discount_cents = v_bulk_discount,
    shipping_cents = v_shipping,
    total_cents = v_total
  WHERE id = p_order_id AND payment_status <> 'paid';

  RETURN jsonb_build_object(
    'success', true,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'bulk_discount_cents', v_bulk_discount,
    'shipping_cents', v_shipping,
    'total_cents', v_total
  );
END;
$$;

-- Only trusted server-side contexts call this (the order_items trigger,
-- unchanged from the earlier migration) — not exposed as a directly
-- callable RPC for authenticated/anon. CREATE OR REPLACE preserves grants,
-- but this is restated for a file that reads correctly standalone.
REVOKE ALL ON FUNCTION public.recompute_order_total(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_order_total(UUID) TO service_role;
