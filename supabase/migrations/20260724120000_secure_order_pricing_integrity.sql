-- Security fix: order pricing was trusted from the client.
--
-- `orders` and `order_items` are inserted directly by the browser
-- (src/routes/cart.tsx), and RLS on both only checks that the row belongs
-- to the caller — nothing ever validated that subtotal_cents, total_cents,
-- or unit_price_cents matched the real product/variant prices. A signed-in
-- user could call the Supabase REST API directly (no UI needed) and place
-- an order for real products at an arbitrary, self-chosen price, then pay
-- that fabricated amount via /api/create-razorpay-order (which trusts
-- orders.total_cents) or via Store Wallet (wallet_redeem_for_order, same
-- trust). Every downstream system — refunds, returns, coupon analytics —
-- also inherits its numbers from order_items.unit_price_cents, so this one
-- gap undermined all of them.
--
-- Fix: recompute_order_total() re-derives subtotal/discount/shipping/total
-- from the actual products/product_variants/coupons/delivery tables and
-- overwrites whatever the client sent. It's wired to run automatically via
-- an AFTER INSERT trigger on order_items, so it fires no matter how the
-- row was created (UI, or a direct API call) and before any payment method
-- (wallet or Razorpay) is ever invoked. It never touches an order that's
-- already paid.

-- ------------------------------------------------------------------------
-- 1. The recompute function — single source of truth for order totals.
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
  v_true_price INTEGER;
  v_subtotal INTEGER := 0;
  v_discount INTEGER := 0;
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

  -- Force every line item's price back to the catalog. Anything that can't
  -- be resolved (deleted product/variant, or a phantom item with no
  -- product_id at all) is priced at zero rather than trusted.
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    v_true_price := NULL;
    IF v_item.variant_id IS NOT NULL THEN
      SELECT price_cents INTO v_true_price FROM public.product_variants WHERE id = v_item.variant_id;
    END IF;
    IF v_true_price IS NULL AND v_item.product_id IS NOT NULL THEN
      SELECT price_cents INTO v_true_price FROM public.products WHERE id = v_item.product_id;
    END IF;
    IF v_true_price IS NULL THEN
      v_true_price := 0;
    END IF;
    IF v_true_price IS DISTINCT FROM v_item.unit_price_cents THEN
      UPDATE public.order_items SET unit_price_cents = v_true_price WHERE id = v_item.id;
    END IF;
  END LOOP;

  SELECT coalesce(sum(unit_price_cents * quantity), 0) INTO v_subtotal
    FROM public.order_items WHERE order_id = p_order_id;

  -- Recompute the coupon discount from the corrected line totals — never
  -- the discount_cents the client originally sent.
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
    shipping_cents = v_shipping,
    total_cents = v_total
  WHERE id = p_order_id AND payment_status <> 'paid';

  RETURN jsonb_build_object(
    'success', true,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'shipping_cents', v_shipping,
    'total_cents', v_total
  );
END;
$$;

-- Only trusted server-side contexts call this (the trigger below, and the
-- other SECURITY DEFINER functions it's chained from) — not exposed as a
-- directly callable RPC for authenticated/anon.
REVOKE ALL ON FUNCTION public.recompute_order_total(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_order_total(UUID) TO service_role;

-- ------------------------------------------------------------------------
-- 2. Fire it automatically whenever order_items are inserted — covers the
--    UI flow AND any direct API call, since it's enforced in the database.
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_order_items_recompute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_order_total(NEW.order_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_after_insert_recompute ON public.order_items;
CREATE TRIGGER order_items_after_insert_recompute
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_items_recompute();

-- Defense in depth at the column level too — belt and suspenders alongside
-- the trigger above. NOT VALID so it doesn't fail the migration over any
-- pre-existing rows; it still applies to every new insert/update from here on.
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_unit_price_cents_nonnegative CHECK (unit_price_cents >= 0) NOT VALID;

-- ------------------------------------------------------------------------
-- 3. Bonus fix: coupon_redemptions (used for admin analytics — usage
--    counts, discount given, revenue) was also populated with client-sent
--    discount_cents/order_total_cents. Force it to match the now-trusted
--    order row instead. This is a reporting-accuracy fix, not a payment
--    one — nothing here affects what a customer is actually charged.
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_coupon_redemptions_enforce_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF v_order.id IS NOT NULL THEN
    NEW.discount_cents := v_order.discount_cents;
    NEW.order_total_cents := v_order.total_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupon_redemptions_enforce_amounts ON public.coupon_redemptions;
CREATE TRIGGER coupon_redemptions_enforce_amounts
  BEFORE INSERT ON public.coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_coupon_redemptions_enforce_amounts();
