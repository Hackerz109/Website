-- profiles RLS is intentionally self-read-only (see 20260711073951_...sql).
-- The wallet admin page needs to look up a customer by email/name to view
-- their balance and make manual adjustments, so it goes through this
-- admin-gated function instead of relying on broader profile RLS.
CREATE OR REPLACE FUNCTION public.admin_search_customers(p_query TEXT)
RETURNS TABLE (id UUID, email TEXT, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.email, p.full_name
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
    AND (p.email ILIKE '%' || p_query || '%' OR p.full_name ILIKE '%' || p_query || '%')
  ORDER BY p.email
  LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.admin_search_customers(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_customers(TEXT) TO authenticated;
