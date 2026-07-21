-- Admin Console Expansion + Customer Profiles
-- ------------------------------------------------------------------------
-- Adds a durable, human-friendly Customer ID for every account; profile
-- fields (phone, avatar, last-seen); a saved-addresses table backing the
-- new /profile page; an avatars storage bucket; and the admin-only RPCs
-- behind the new Admin -> Users pages, the admin order detail page, and
-- the revamped dashboard. Nothing existing is removed, renamed, or
-- altered in behavior — see ADMIN_CONSOLE_AND_PROFILES.md for the full
-- feature writeup. Same trust model as the rest of the schema: direct
-- table access is owner/admin via RLS, cross-account reads and writes go
-- through SECURITY DEFINER RPCs.

-- ============================================================
-- 1. Profiles: customer_code, phone, avatar_url, last_seen_at
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN customer_code TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN last_seen_at TIMESTAMPTZ;

-- Sequential, zero-padded, human-friendly IDs ("CUS-000001") — easy to read
-- aloud over chat/phone support and to search on, unlike a raw UUID.
-- Backfilled in signup order so existing customers get the lowest numbers.
CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq;

ALTER TABLE public.profiles
  ALTER COLUMN customer_code SET DEFAULT ('CUS-' || lpad(nextval('public.customer_code_seq')::text, 6, '0'));

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE customer_code IS NULL ORDER BY created_at LOOP
    UPDATE public.profiles
      SET customer_code = 'CUS-' || lpad(nextval('public.customer_code_seq')::text, 6, '0')
      WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN customer_code SET NOT NULL,
  ADD CONSTRAINT profiles_customer_code_key UNIQUE (customer_code);

COMMENT ON COLUMN public.profiles.customer_code IS 'Human-friendly, immutable account identifier shown to the customer and used by admins to look them up. Auto-assigned; see profiles_protect_customer_code trigger.';

-- The ID only works as a trustworthy "look this person up" handle if a
-- customer can't quietly change it. RLS already limits UPDATE to the
-- row's own owner (or a SECURITY DEFINER function) — this trigger adds a
-- column-level guard on top: any non-admin write that touches
-- customer_code is silently reverted, the rest of the update proceeds.
CREATE OR REPLACE FUNCTION public.protect_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS DISTINCT FROM OLD.customer_code AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.customer_code := OLD.customer_code;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_protect_customer_code
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_customer_code();

-- Self-service: called once per session (see useAuth) purely so admins can
-- see roughly how recently a customer was last active. Not security
-- sensitive, so a plain SQL function is enough.
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- ============================================================
-- 2. Saved addresses — for the new /profile page ("manage their stuff")
-- ============================================================

CREATE TABLE public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT,
  phone TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_addresses_user_idx ON public.user_addresses (user_id);
CREATE TRIGGER user_addresses_touch BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own addresses" ON public.user_addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read addresses" ON public.user_addresses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only one default address per customer — flipping a new one on clears any
-- previous default for that same user.
CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_addresses SET is_default = false
      WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_addresses_single_default
  BEFORE INSERT OR UPDATE ON public.user_addresses
  FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION public.enforce_single_default_address();

-- ============================================================
-- 3. Storage bucket for avatars (public, same pattern as product-images)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Path convention enforced by policy: {user_id}/{file}
CREATE POLICY "own avatar upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatar update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatar delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- ============================================================
-- 4. Admin: customer directory + detail + role management
-- ============================================================

-- Paginated, searchable customer directory for the new Admin -> Users
-- page. profiles RLS is self-read-only (see base migration), so — same
-- reasoning as admin_search_customers — this goes through a SECURITY
-- DEFINER function gated on has_role, filtered to zero rows for non-admins
-- rather than raising, matching that function's existing convention.
CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  customer_code TEXT,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_admin BOOLEAN,
  order_count BIGINT,
  total_spent_cents BIGINT,
  wallet_balance_cents BIGINT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.customer_code,
    p.email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.created_at,
    p.last_seen_at,
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin,
    COALESCE(o.order_count, 0) AS order_count,
    COALESCE(o.total_spent_cents, 0) AS total_spent_cents,
    COALESCE(w.balance_cents, 0) AS wallet_balance_cents,
    count(*) OVER() AS total_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, count(*) AS order_count, sum(total_cents) AS total_spent_cents
    FROM public.orders
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) o ON o.user_id = p.id
  LEFT JOIN (
    SELECT user_id, sum(amount_cents) AS balance_cents
    FROM public.wallet_transactions
    GROUP BY user_id
  ) w ON w.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
    AND (
      p_search IS NULL OR trim(p_search) = '' OR
      p.email ILIKE '%' || p_search || '%' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.customer_code ILIKE '%' || p_search || '%' OR
      p.phone ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200) OFFSET GREATEST(p_offset, 0);
$$;
REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, INT, INT) TO authenticated;

-- Single-customer detail for the new Admin -> Users -> [customer] page.
CREATE OR REPLACE FUNCTION public.admin_get_customer(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  customer_code TEXT,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_admin BOOLEAN,
  order_count BIGINT,
  total_spent_cents BIGINT,
  wallet_balance_cents BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id, p.customer_code, p.email, p.full_name, p.phone, p.avatar_url, p.created_at, p.last_seen_at,
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'),
    COALESCE((SELECT count(*) FROM public.orders o WHERE o.user_id = p.id), 0),
    COALESCE((SELECT sum(o.total_cents) FROM public.orders o WHERE o.user_id = p.id), 0),
    COALESCE((SELECT sum(w.amount_cents) FROM public.wallet_transactions w WHERE w.user_id = p.id), 0)
  FROM public.profiles p
  WHERE p.id = p_user_id AND public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.admin_get_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_customer(UUID) TO authenticated;

-- Promote/demote admin access from the Users page. Guards against locking
-- the store out of its own admin panel: an admin can't remove their own
-- access, and the last remaining admin can't be demoted by anyone.
CREATE OR REPLACE FUNCTION public.admin_set_admin_role(p_user_id UUID, p_make_admin BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required.');
  END IF;
  IF p_user_id = auth.uid() AND NOT p_make_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'You can''t remove your own admin access.');
  END IF;

  IF p_make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'message', 'At least one admin must remain — promote someone else first.');
    END IF;
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_admin_role(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_admin_role(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- 5. Admin dashboard stats — one round trip for the Overview page
-- ============================================================

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
        WHERE stock <= 3 AND active = true
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
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- ============================================================
-- 6. Orders: a dedicated admin-notes field
-- ============================================================
-- `orders.notes` is the customer's own checkout note (e.g. delivery
-- instructions) — admin-facing annotations need a separate column so
-- reviewing an order never overwrites what the customer wrote. Covered by
-- the existing "admin update orders" policy — no new RLS needed.
ALTER TABLE public.orders ADD COLUMN admin_notes TEXT;
COMMENT ON COLUMN public.orders.admin_notes IS 'Internal admin-only annotation, distinct from the customer-supplied orders.notes checkout field.';

