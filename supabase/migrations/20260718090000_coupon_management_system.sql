-- Coupon Management System
-- Fully database-driven: no coupon logic is hardcoded in the app. All
-- conditions below are optional (nullable / empty-array = "not restricted"),
-- and new conditions can be added later as extra nullable columns plus a
-- matching check inside validate_coupon() — existing coupons and calls keep
-- working unchanged.

CREATE TYPE public.coupon_discount_type AS ENUM ('percentage', 'fixed', 'free_shipping');
CREATE TYPE public.coupon_visibility AS ENUM ('visible', 'hidden', 'auto_apply');
CREATE TYPE public.coupon_customer_type AS ENUM ('any', 'new', 'existing');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,

  discount_type public.coupon_discount_type NOT NULL DEFAULT 'percentage',
  -- Percentage: whole number 1-100. Fixed: amount in cents. Free shipping: unused.
  discount_value INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  max_discount_cents INTEGER CHECK (max_discount_cents IS NULL OR max_discount_cents >= 0),

  visibility public.coupon_visibility NOT NULL DEFAULT 'visible',
  active BOOLEAN NOT NULL DEFAULT true,

  -- Conditions — every one of these is optional (NULL / empty = no restriction).
  min_order_cents INTEGER CHECK (min_order_cents IS NULL OR min_order_cents >= 0),
  max_order_cents INTEGER CHECK (max_order_cents IS NULL OR max_order_cents >= 0),
  first_order_only BOOLEAN NOT NULL DEFAULT false,
  login_required BOOLEAN NOT NULL DEFAULT false,
  customer_type public.coupon_customer_type NOT NULL DEFAULT 'any',
  eligible_product_ids UUID[] NOT NULL DEFAULT '{}',
  eligible_category_ids UUID[] NOT NULL DEFAULT '{}',
  eligible_brand_ids UUID[] NOT NULL DEFAULT '{}',
  excluded_product_ids UUID[] NOT NULL DEFAULT '{}',
  excluded_category_ids UUID[] NOT NULL DEFAULT '{}',
  excluded_brand_ids UUID[] NOT NULL DEFAULT '{}',
  stackable BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit >= 0),
  usage_limit_per_customer INTEGER CHECK (usage_limit_per_customer IS NULL OR usage_limit_per_customer >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coupons IS 'Database-driven coupon definitions. All condition columns are optional; validate_coupon() is the single source of truth for whether a coupon applies.';
COMMENT ON COLUMN public.coupons.stackable IS 'Reserved for future multi-coupon checkout support. The current checkout only accepts one coupon per order regardless of this flag.';

CREATE INDEX coupons_code_idx ON public.coupons (lower(code));
CREATE TRIGGER coupons_touch_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Only admins can browse the coupons table directly (so hidden codes can't
-- be enumerated). Everyone else goes through the RPCs below, which only
-- ever reveal a single coupon's applicability — never the full list.
CREATE POLICY "admin read coupons" ON public.coupons FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update coupons" ON public.coupons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Records every time a coupon is actually redeemed on a paid/placed order.
-- Usage limits and the admin analytics (usage count, discount given,
-- revenue generated) are all derived from this table — no separate
-- counters to keep in sync.
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  order_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (order_total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, coupon_id)
);

CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_user_idx ON public.coupon_redemptions (user_id);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own redemptions" ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- Orders now track which coupon (if any) was applied and how much it saved.
ALTER TABLE public.orders
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0);

-- Returns the coupons that should be proactively surfaced to shoppers
-- (visible + auto_apply, active, and within their date window). Hidden
-- coupons are deliberately excluded — they must be typed in.
CREATE OR REPLACE FUNCTION public.get_visible_coupons()
RETURNS TABLE (
  code TEXT,
  description TEXT,
  discount_type public.coupon_discount_type,
  discount_value INTEGER,
  max_discount_cents INTEGER,
  min_order_cents INTEGER,
  visibility public.coupon_visibility
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.code, c.description, c.discount_type, c.discount_value, c.max_discount_cents, c.min_order_cents, c.visibility
  FROM public.coupons c
  WHERE c.active = true
    AND c.visibility IN ('visible', 'auto_apply')
    AND (c.valid_from IS NULL OR c.valid_from <= now())
    AND (c.valid_until IS NULL OR c.valid_until >= now())
  ORDER BY c.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_visible_coupons() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visible_coupons() TO anon, authenticated;

-- The single source of truth for whether a coupon code applies to a given
-- cart. p_items is a JSON array of
--   { "product_id": uuid, "category_id": uuid|null, "brand_id": uuid|null, "line_total_cents": int }
-- Returns a JSON object describing the outcome — never raises for an
-- invalid/inapplicable code, so callers always get a clean message back.
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  v_subtotal_cents INTEGER := 0;
  v_eligible_cents INTEGER := 0;
  v_discount_cents INTEGER := 0;
  v_global_uses INTEGER := 0;
  v_customer_uses INTEGER := 0;
  v_prior_orders INTEGER := 0;
  item JSONB;
  v_product_id UUID;
  v_category_id UUID;
  v_brand_id UUID;
  v_line_cents INTEGER;
  v_included BOOLEAN;
  v_excluded BOOLEAN;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE lower(code) = lower(trim(p_code));

  IF c.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'That coupon code isn''t valid.');
  END IF;

  IF NOT c.active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is no longer active.');
  END IF;

  IF c.valid_from IS NOT NULL AND c.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon isn''t active yet.');
  END IF;

  IF c.valid_until IS NOT NULL AND c.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  END IF;

  IF c.login_required AND p_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Please sign in to use this coupon.');
  END IF;

  -- Order-history-based conditions.
  IF p_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_prior_orders FROM public.orders
      WHERE user_id = p_user_id AND status <> 'cancelled';
  END IF;

  IF c.first_order_only AND v_prior_orders > 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is only valid on your first order.');
  END IF;

  IF c.customer_type = 'new' AND v_prior_orders > 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is only valid for new customers.');
  END IF;

  IF c.customer_type = 'existing' AND v_prior_orders = 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is only valid for existing customers.');
  END IF;

  -- Usage limits, derived from actual redemptions (no counters to drift).
  IF c.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO v_global_uses FROM public.coupon_redemptions WHERE coupon_id = c.id;
    IF v_global_uses >= c.usage_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit.');
    END IF;
  END IF;

  IF c.usage_limit_per_customer IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_customer_uses FROM public.coupon_redemptions
      WHERE coupon_id = c.id AND user_id = p_user_id;
    IF v_customer_uses >= c.usage_limit_per_customer THEN
      RETURN jsonb_build_object('valid', false, 'message', 'You''ve already used this coupon the maximum number of times.');
    END IF;
  END IF;

  -- Walk the cart to compute the full subtotal and the subtotal of items
  -- this coupon actually applies to (respecting inclusion + exclusion).
  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  LOOP
    v_product_id := NULLIF(item->>'product_id', '')::UUID;
    v_category_id := NULLIF(item->>'category_id', '')::UUID;
    v_brand_id := NULLIF(item->>'brand_id', '')::UUID;
    v_line_cents := coalesce((item->>'line_total_cents')::INTEGER, 0);
    v_subtotal_cents := v_subtotal_cents + v_line_cents;

    v_included := (
      cardinality(c.eligible_product_ids) = 0
      AND cardinality(c.eligible_category_ids) = 0
      AND cardinality(c.eligible_brand_ids) = 0
    )
    OR (v_product_id IS NOT NULL AND v_product_id = ANY(c.eligible_product_ids))
    OR (v_category_id IS NOT NULL AND v_category_id = ANY(c.eligible_category_ids))
    OR (v_brand_id IS NOT NULL AND v_brand_id = ANY(c.eligible_brand_ids));

    v_excluded := (v_product_id IS NOT NULL AND v_product_id = ANY(c.excluded_product_ids))
      OR (v_category_id IS NOT NULL AND v_category_id = ANY(c.excluded_category_ids))
      OR (v_brand_id IS NOT NULL AND v_brand_id = ANY(c.excluded_brand_ids));

    IF v_included AND NOT v_excluded THEN
      v_eligible_cents := v_eligible_cents + v_line_cents;
    END IF;
  END LOOP;

  IF c.min_order_cents IS NOT NULL AND v_subtotal_cents < c.min_order_cents THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Add %s more to use this coupon.', to_char((c.min_order_cents - v_subtotal_cents) / 100.0, 'FM999999990.00'))
    );
  END IF;

  IF c.max_order_cents IS NOT NULL AND v_subtotal_cents > c.max_order_cents THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Your order total is above the limit for this coupon.');
  END IF;

  IF v_eligible_cents = 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon doesn''t apply to any items in your cart.');
  END IF;

  IF c.discount_type = 'percentage' THEN
    v_discount_cents := floor(v_eligible_cents * c.discount_value / 100.0);
    IF c.max_discount_cents IS NOT NULL THEN
      v_discount_cents := least(v_discount_cents, c.max_discount_cents);
    END IF;
  ELSIF c.discount_type = 'fixed' THEN
    v_discount_cents := least(c.discount_value, v_eligible_cents);
  ELSE
    v_discount_cents := 0; -- free_shipping: handled via free_shipping flag below
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Coupon applied!',
    'coupon_id', c.id,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_cents', v_discount_cents,
    'free_shipping', c.discount_type = 'free_shipping',
    'stackable', c.stackable
  );
END;
$$;
REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID, JSONB) TO anon, authenticated;

-- Admin-only analytics: per-coupon usage, discount given, and revenue
-- generated, all derived live from coupon_redemptions.
CREATE OR REPLACE FUNCTION public.get_coupon_stats()
RETURNS TABLE (
  coupon_id UUID,
  usage_count BIGINT,
  total_discount_cents BIGINT,
  revenue_cents BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    r.coupon_id,
    count(*) AS usage_count,
    coalesce(sum(r.discount_cents), 0) AS total_discount_cents,
    coalesce(sum(r.order_total_cents), 0) AS revenue_cents
  FROM public.coupon_redemptions r
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY r.coupon_id;
$$;
REVOKE ALL ON FUNCTION public.get_coupon_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coupon_stats() TO authenticated;
