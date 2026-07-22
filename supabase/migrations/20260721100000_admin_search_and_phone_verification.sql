-- Admin global search + customer phone verification
-- ------------------------------------------------------------------------
-- 1. admin_global_search: one round trip that looks a free-text query up
--    across customers, orders, products, and coupons for the new admin
--    search bar. Same trust model as the rest of the admin RPCs
--    (SECURITY DEFINER, gated on has_role, empty results for non-admins).
-- 2. Phone verification: adds a phone_verified flag plus the columns an
--    OTP flow needs (hash, expiry, attempt count, last-sent time — never
--    the raw code). Verification is checked/flipped from a trusted server
--    route (see src/routes/api.send-phone-otp.ts /
--    api.verify-phone-otp.ts), which uses the service-role client, so no
--    new client-writable RLS surface is needed for the OTP fields
--    themselves. A trigger clears phone_verified whenever the phone
--    number itself changes, so a verified flag can never quietly carry
--    over to a different number.

-- ============================================================
-- 1. Global admin search
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_global_search(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_term TEXT := trim(coalesce(p_query, ''));
  v_like TEXT;
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  IF length(v_term) < 2 THEN
    RETURN jsonb_build_object(
      'customers', '[]'::jsonb, 'orders', '[]'::jsonb,
      'products', '[]'::jsonb, 'coupons', '[]'::jsonb
    );
  END IF;

  v_like := '%' || v_term || '%';

  SELECT jsonb_build_object(
    'customers', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT p.id, p.customer_code, p.full_name, p.email, p.phone
        FROM public.profiles p
        WHERE p.full_name ILIKE v_like OR p.email ILIKE v_like
           OR p.customer_code ILIKE v_like OR p.phone ILIKE v_like
        ORDER BY p.created_at DESC LIMIT 8
      ) t
    ),
    'orders', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT o.id, o.customer_name, o.customer_email, o.total_cents, o.currency,
               o.status::text AS status, o.created_at
        FROM public.orders o
        WHERE o.customer_name ILIKE v_like
           OR o.customer_email ILIKE v_like
           OR o.id::text ILIKE v_like
           OR o.coupon_code ILIKE v_like
           OR o.shipping_address->>'phone' ILIKE v_like
        ORDER BY o.created_at DESC LIMIT 8
      ) t
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT DISTINCT ON (pr.id) pr.id, pr.name, pr.slug, pr.price_cents,
               pr.currency, pr.stock, pr.active
        FROM public.products pr
        LEFT JOIN public.product_variants pv ON pv.product_id = pr.id
        WHERE pr.name ILIKE v_like OR pr.description ILIKE v_like
           OR pv.sku ILIKE v_like OR pv.name ILIKE v_like
        ORDER BY pr.id, pr.name LIMIT 8
      ) t
    ),
    'coupons', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT c.id, c.code, c.description, c.active,
               c.discount_type::text AS discount_type, c.discount_value
        FROM public.coupons c
        WHERE c.code ILIKE v_like OR c.description ILIKE v_like
        ORDER BY c.created_at DESC LIMIT 8
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_global_search(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_global_search(TEXT) TO authenticated;

-- ============================================================
-- 2. Phone verification
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN phone_otp_hash TEXT,
  ADD COLUMN phone_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN phone_otp_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN phone_otp_last_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.phone_verified IS 'True once the customer has confirmed an OTP sent to profiles.phone. Flipped only by the service-role api.verify-phone-otp server route.';
COMMENT ON COLUMN public.profiles.phone_otp_hash IS 'SHA-256 hash of the current pending OTP (salted with a server-side pepper) — never the raw code.';

-- Editing the phone number (self-service, or admin) invalidates any prior
-- verification and any in-flight OTP — a verified flag must always refer
-- to the number currently on the row.
CREATE OR REPLACE FUNCTION public.reset_phone_verification_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_verified := false;
    NEW.phone_otp_hash := NULL;
    NEW.phone_otp_expires_at := NULL;
    NEW.phone_otp_attempts := 0;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_reset_phone_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reset_phone_verification_on_change();

-- Customers should never be able to set their own phone_verified flag (or
-- forge OTP bookkeeping) directly through the authenticated client —
-- only the service-role route may. RLS already restricts UPDATE to the
-- row's own owner; this column-level guard closes the one remaining gap.
CREATE OR REPLACE FUNCTION public.protect_phone_verification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.phone_verified := OLD.phone_verified;
    NEW.phone_otp_hash := OLD.phone_otp_hash;
    NEW.phone_otp_expires_at := OLD.phone_otp_expires_at;
    NEW.phone_otp_attempts := OLD.phone_otp_attempts;
    NEW.phone_otp_last_sent_at := OLD.phone_otp_last_sent_at;
    -- A genuine phone-number edit from the client should still reset
    -- verification, same as above — re-apply after locking the flag.
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      NEW.phone_verified := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_protect_phone_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_phone_verification_columns();