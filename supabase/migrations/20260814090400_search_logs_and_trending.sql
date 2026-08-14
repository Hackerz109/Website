-- Mirrors analytics_events: no direct anon/authenticated grants at all —
-- writes only happen from the server (service role) via a new API route
-- (see src/routes/api.search-log.ts), same as analytics_ingest_event is
-- only ever called from api.analytics-track.ts. Reads for the storefront
-- go through a narrow SECURITY DEFINER aggregate function
-- (get_trending_searches) rather than opening the table, so individual
-- searchers' raw query history is never exposed client-side; admins can
-- still read raw rows the same way they already read analytics_events.
CREATE TABLE public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_logs_normalized_query ON public.search_logs(normalized_query, created_at DESC);
CREATE INDEX idx_search_logs_created_at ON public.search_logs(created_at DESC);

GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read search logs" ON public.search_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_trending_searches(p_limit INTEGER DEFAULT 8)
RETURNS TABLE(query TEXT, search_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    (ARRAY_AGG(sl.query ORDER BY sl.created_at DESC))[1] AS query,
    COUNT(*) AS search_count
  FROM public.search_logs sl
  WHERE sl.created_at > now() - interval '30 days'
    AND sl.result_count > 0
  GROUP BY sl.normalized_query
  HAVING COUNT(*) >= 2
  ORDER BY search_count DESC, MAX(sl.created_at) DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.get_trending_searches(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_searches(INTEGER) TO anon, authenticated;
