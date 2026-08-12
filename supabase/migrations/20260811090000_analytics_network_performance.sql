-- ============================================================
-- Analytics system — network, resource & performance tracking
-- ============================================================
-- Closes the gap flagged in ANALYTICS_SYSTEM.md: error_logs already had
-- columns ready for it (error_type IN ('frontend','api','database','job'),
-- status_code) but only 'frontend' JS-crash rows were ever written, and
-- there was no page-performance signal (load time / Core Web Vitals) at
-- all. This migration adds:
--   1. A 'resource' error_type (broken images/scripts/stylesheets — a
--      failed <img>/<script> load is a different failure mode than an
--      uncaught JS exception, so it's worth its own bucket in the "by
--      type" breakdown rather than being lumped into 'frontend').
--   2. analytics_performance_metrics — one row per pageview with
--      LCP/CLS/FCP/TTFB/load-time and a long-task counter, captured
--      client-side via the native PerformanceObserver API (no new npm
--      dependency — see src/lib/performance-tracker.ts).
--   3. analytics_ingest_performance() — ingestion function, same
--      SECURITY DEFINER / service_role-only shape as analytics_ingest_event.
--   4. analytics_traffic_stats() gains a `performance` block, joined off
--      the same already-filtered session set (sess_f) so it respects the
--      same device/browser/source/country filters as the rest of the tab.
--   5. analytics_purge_old_data() now also ages out
--      analytics_performance_metrics on its own 60-day cutoff (it isn't
--      cascade-deleted with its session — see the table comment below for
--      why — so it needs its own purge loop, same batching shape as the
--      other three).
--   6. A new alertable metric, 'slow_pageviews_pct', so a spike in
--      poor-LCP pageviews can notify the admin the same way an
--      error-rate spike already does.
--
-- Trust model, matching every other table in this system: every
-- client-supplied value (error_type, status_code, each performance number)
-- is validated/whitelisted or clamped in the calling TS route BEFORE it
-- reaches these functions — see api.analytics-error.ts and
-- api.analytics-vitals.ts. The CHECK constraints and GREATEST/LEAST clamps
-- below are a second, independent layer so a malformed or hostile payload
-- still can't do anything worse than fail a single insert.
--
-- Constraint changes use a dynamic DROP (look up whatever the existing
-- CHECK on that column is actually named, rather than assuming Postgres's
-- default "table_column_check" naming) so this migration can't silently
-- leave the OLD, more restrictive constraint in place alongside a new one
-- — that would just make the new allowed value permanently unwritable.

-- ------------------------------------------------------------
-- 1. error_logs.error_type: add 'resource'
-- ------------------------------------------------------------
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'error_logs'
      AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%error_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.error_logs DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.error_logs ADD CONSTRAINT error_logs_error_type_check
  CHECK (error_type IN ('frontend', 'resource', 'api', 'database', 'job'));

-- ------------------------------------------------------------
-- 2. analytics_performance_metrics
-- ------------------------------------------------------------
CREATE TABLE public.analytics_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable + ON DELETE SET NULL (not NOT NULL/CASCADE like
  -- analytics_events) because this beacon fires late — on visibilitychange,
  -- well after the pageview beacon — so it's possible for it to arrive
  -- when the session row doesn't exist yet or has already aged out. Losing
  -- the session link on an old/rare row is fine; losing the whole metrics
  -- row to an FK failure over a race condition is not.
  session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
  path TEXT,
  lcp_ms INTEGER,
  cls NUMERIC(6,3),
  fcp_ms INTEGER,
  ttfb_ms INTEGER,
  load_ms INTEGER,
  long_tasks_count INTEGER,
  long_tasks_total_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.analytics_performance_metrics IS 'One row per pageview, sent on visibilitychange->hidden once LCP/CLS have settled (the same trigger point the web-vitals library uses) — hand-rolled via PerformanceObserver to avoid a new dependency. Any individual metric may be null if that PerformanceObserver entry type isn''t supported in the visitor''s browser, or the page was closed before it fired — null means "not measured", not zero.';

CREATE INDEX idx_analytics_perf_created_at ON public.analytics_performance_metrics (created_at);
CREATE INDEX idx_analytics_perf_session_id ON public.analytics_performance_metrics (session_id);

GRANT ALL ON public.analytics_performance_metrics TO service_role;
ALTER TABLE public.analytics_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read performance metrics" ON public.analytics_performance_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policy for authenticated/anon anywhere above —
-- same as every other analytics table, writes only ever happen via
-- analytics_ingest_performance() through the service_role key.

-- ------------------------------------------------------------
-- 3. Ingestion
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_ingest_performance(p_session_id UUID, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_performance_metrics (
    session_id, path, lcp_ms, cls, fcp_ms, ttfb_ms, load_ms, long_tasks_count, long_tasks_total_ms
  ) VALUES (
    p_session_id,
    p_payload->>'path',
    CASE WHEN p_payload->>'lcp_ms' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'lcp_ms')::INTEGER, 300000), 0) END,
    CASE WHEN p_payload->>'cls' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'cls')::NUMERIC, 50), 0) END,
    CASE WHEN p_payload->>'fcp_ms' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'fcp_ms')::INTEGER, 300000), 0) END,
    CASE WHEN p_payload->>'ttfb_ms' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'ttfb_ms')::INTEGER, 300000), 0) END,
    CASE WHEN p_payload->>'load_ms' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'load_ms')::INTEGER, 300000), 0) END,
    CASE WHEN p_payload->>'long_tasks_count' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'long_tasks_count')::INTEGER, 100000), 0) END,
    CASE WHEN p_payload->>'long_tasks_total_ms' IS NULL THEN NULL ELSE GREATEST(LEAST((p_payload->>'long_tasks_total_ms')::INTEGER, 300000), 0) END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_ingest_performance(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_ingest_performance(UUID, JSONB) TO service_role;

-- ------------------------------------------------------------
-- 4. analytics_traffic_stats(): add a `performance` block
-- ------------------------------------------------------------
-- "Poor" thresholds (LCP > 4000ms, CLS > 0.25) are the standard Core Web
-- Vitals thresholds, not something invented for this project.
CREATE OR REPLACE FUNCTION public.analytics_traffic_stats(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_prev_start TIMESTAMPTZ, p_prev_end TIMESTAMPTZ,
  p_device TEXT DEFAULT NULL, p_browser TEXT DEFAULT NULL, p_source TEXT DEFAULT NULL, p_country TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH sess AS (
    SELECT *,
      CASE
        WHEN referrer IS NULL OR referrer = '' THEN 'direct'
        WHEN utm_source IS NOT NULL AND utm_source != '' THEN 'campaign'
        WHEN referrer ~* '(google|bing|yahoo|duckduckgo|baidu)\.' THEN 'search'
        WHEN referrer ~* '(facebook|instagram|twitter|x\.com|linkedin|pinterest|whatsapp|t\.me)' THEN 'social'
        ELSE 'referral'
      END AS source
    FROM public.analytics_sessions
    WHERE started_at >= p_start AND started_at <= p_end
      AND (p_device IS NULL OR device_type = p_device)
      AND (p_browser IS NULL OR browser = p_browser)
      AND (p_country IS NULL OR country = p_country)
  ),
  sess_f AS (SELECT * FROM sess WHERE (p_source IS NULL OR source = p_source)),
  daily AS (
    SELECT date_trunc('day', d)::date AS day FROM generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') AS d
  ),
  daily_sessions AS (
    SELECT date_trunc('day', started_at)::date AS day, count(*) AS sessions,
      count(DISTINCT COALESCE(user_id::text, device_id, id::text)) AS visitors, sum(page_view_count) AS page_views
    FROM sess_f GROUP BY 1
  ),
  perf_f AS (
    SELECT m.* FROM public.analytics_performance_metrics m
    JOIN sess_f s ON s.id = m.session_id
    WHERE m.created_at >= p_start AND m.created_at <= p_end
  )
  SELECT CASE WHEN auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN jsonb_build_object('error', 'Admin access required') ELSE
  jsonb_build_object(
    'total_visitors', (SELECT count(*) FROM sess_f),
    'unique_visitors', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM sess_f),
    'sessions', (SELECT count(*) FROM sess_f),
    'sessions_prev', (SELECT count(*) FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end),
    'page_views', (SELECT COALESCE(sum(page_view_count), 0) FROM sess_f),
    'page_views_prev', (SELECT COALESCE(sum(page_view_count), 0) FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end),
    'avg_session_duration_seconds', (SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (last_seen_at - started_at)))), 0) FROM sess_f WHERE last_seen_at > started_at),
    'bounce_rate_pct', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE page_view_count <= 1) / count(*), 1) END FROM sess_f),
    'traffic_sources', (
      SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb) FROM (SELECT source, count(*) AS cnt FROM sess_f GROUP BY source) s
    ),
    'top_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT e.path, count(*) AS views FROM public.analytics_events e
        JOIN sess_f s ON s.id = e.session_id
        WHERE e.event_type = 'page_view' AND e.path IS NOT NULL
        GROUP BY e.path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'entry_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT entry_path AS path, count(*) AS sessions FROM sess_f WHERE entry_path IS NOT NULL
        GROUP BY entry_path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'exit_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT exit_path AS path, count(*) AS sessions FROM sess_f WHERE exit_path IS NOT NULL
        GROUP BY exit_path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', to_char(daily.day, 'YYYY-MM-DD'), 'sessions', COALESCE(ds.sessions, 0),
        'visitors', COALESCE(ds.visitors, 0), 'page_views', COALESCE(ds.page_views, 0)
      ) ORDER BY daily.day), '[]'::jsonb)
      FROM daily LEFT JOIN daily_sessions ds ON ds.day = daily.day
    ),
    'performance', jsonb_build_object(
      'samples', (SELECT count(*) FROM perf_f),
      'avg_lcp_ms', (SELECT round(avg(lcp_ms)) FROM perf_f WHERE lcp_ms IS NOT NULL),
      'avg_cls', (SELECT round(avg(cls), 3) FROM perf_f WHERE cls IS NOT NULL),
      'avg_fcp_ms', (SELECT round(avg(fcp_ms)) FROM perf_f WHERE fcp_ms IS NOT NULL),
      'avg_ttfb_ms', (SELECT round(avg(ttfb_ms)) FROM perf_f WHERE ttfb_ms IS NOT NULL),
      'avg_load_ms', (SELECT round(avg(load_ms)) FROM perf_f WHERE load_ms IS NOT NULL),
      'poor_lcp_pct', (
        SELECT CASE WHEN count(*) FILTER (WHERE lcp_ms IS NOT NULL) = 0 THEN NULL
          ELSE round(100.0 * count(*) FILTER (WHERE lcp_ms > 4000) / count(*) FILTER (WHERE lcp_ms IS NOT NULL), 1) END
        FROM perf_f
      ),
      'poor_cls_pct', (
        SELECT CASE WHEN count(*) FILTER (WHERE cls IS NOT NULL) = 0 THEN NULL
          ELSE round(100.0 * count(*) FILTER (WHERE cls > 0.25) / count(*) FILTER (WHERE cls IS NOT NULL), 1) END
        FROM perf_f
      )
    )
  ) END;
$$;
REVOKE ALL ON FUNCTION public.analytics_traffic_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_traffic_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_traffic_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------
-- 5. analytics_purge_old_data(): also age out performance metrics
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_purge_old_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  EVENT_RETENTION_DAYS CONSTANT INTEGER := 60;
  ERROR_RETENTION_DAYS CONSTANT INTEGER := 60;
  SESSION_RETENTION_DAYS CONSTANT INTEGER := 90;
  PERFORMANCE_RETENTION_DAYS CONSTANT INTEGER := 60;

  BATCH_SIZE CONSTANT INTEGER := 5000;
  MAX_BATCHES_PER_TABLE CONSTANT INTEGER := 20;

  events_cutoff CONSTANT TIMESTAMPTZ := now() - (EVENT_RETENTION_DAYS || ' days')::INTERVAL;
  errors_cutoff CONSTANT TIMESTAMPTZ := now() - (ERROR_RETENTION_DAYS || ' days')::INTERVAL;
  sessions_cutoff CONSTANT TIMESTAMPTZ := now() - (SESSION_RETENTION_DAYS || ' days')::INTERVAL;
  performance_cutoff CONSTANT TIMESTAMPTZ := now() - (PERFORMANCE_RETENTION_DAYS || ' days')::INTERVAL;

  events_deleted INTEGER := 0;
  errors_deleted INTEGER := 0;
  sessions_deleted INTEGER := 0;
  performance_deleted INTEGER := 0;

  batch_count INTEGER;
  batches INTEGER;
BEGIN
  -- analytics_events
  batches := 0;
  LOOP
    DELETE FROM public.analytics_events
    WHERE id IN (SELECT id FROM public.analytics_events WHERE created_at < events_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    events_deleted := events_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- error_logs
  batches := 0;
  LOOP
    DELETE FROM public.error_logs
    WHERE id IN (SELECT id FROM public.error_logs WHERE created_at < errors_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    errors_deleted := errors_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- analytics_performance_metrics — unlike analytics_events this does NOT
  -- cascade-delete when its session is purged (session_id is ON DELETE SET
  -- NULL, not CASCADE — see the table comment), so it needs its own
  -- age-based loop rather than riding along with the sessions purge below.
  batches := 0;
  LOOP
    DELETE FROM public.analytics_performance_metrics
    WHERE id IN (SELECT id FROM public.analytics_performance_metrics WHERE created_at < performance_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    performance_deleted := performance_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- analytics_sessions (any lingering events on a purged session, past their
  -- own cutoff or not, cascade-delete automatically via the FK — see header)
  batches := 0;
  LOOP
    DELETE FROM public.analytics_sessions
    WHERE id IN (SELECT id FROM public.analytics_sessions WHERE started_at < sessions_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    sessions_deleted := sessions_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  RETURN jsonb_build_object(
    'analytics_events', jsonb_build_object(
      'deleted', events_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.analytics_events WHERE created_at < events_cutoff)
    ),
    'error_logs', jsonb_build_object(
      'deleted', errors_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.error_logs WHERE created_at < errors_cutoff)
    ),
    'analytics_performance_metrics', jsonb_build_object(
      'deleted', performance_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.analytics_performance_metrics WHERE created_at < performance_cutoff)
    ),
    'analytics_sessions', jsonb_build_object(
      'deleted', sessions_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.analytics_sessions WHERE started_at < sessions_cutoff)
    ),
    'ran_at', now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_purge_old_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_purge_old_data() TO service_role;

-- ------------------------------------------------------------
-- 6. New alertable metric: slow_pageviews_pct
-- ------------------------------------------------------------
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'analytics_alert_rules'
      AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%metric%'
  LOOP
    EXECUTE format('ALTER TABLE public.analytics_alert_rules DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.analytics_alert_rules ADD CONSTRAINT analytics_alert_rules_metric_check
  CHECK (metric IN (
    'traffic', 'error_rate', 'revenue', 'failed_transactions', 'new_registrations',
    'api_traffic', 'system_errors', 'refunds', 'slow_pageviews_pct'
  ));

CREATE OR REPLACE FUNCTION public.analytics_evaluate_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  window_start TIMESTAMPTZ;
  prev_window_start TIMESTAMPTZ;
  current_value NUMERIC;
  previous_value NUMERIC;
  is_triggered BOOLEAN;
  existing_event_id UUID;
  newly_triggered JSONB := '[]'::JSONB;
  event_message TEXT;
BEGIN
  FOR rule IN SELECT * FROM public.analytics_alert_rules WHERE enabled = true LOOP
    window_start := now() - (rule.time_window_minutes || ' minutes')::INTERVAL;
    prev_window_start := window_start - (rule.time_window_minutes || ' minutes')::INTERVAL;

    current_value := COALESCE(CASE rule.metric
      WHEN 'traffic' THEN (SELECT count(*)::NUMERIC FROM public.analytics_sessions WHERE started_at >= window_start)
      WHEN 'error_rate' THEN (
        SELECT CASE WHEN count(*) = 0 THEN 0 ELSE
          (SELECT count(*) FROM public.error_logs WHERE created_at >= window_start)::NUMERIC / count(*) * 100
        END FROM public.analytics_events WHERE created_at >= window_start
      )
      WHEN 'revenue' THEN (SELECT COALESCE(sum(total_cents), 0)::NUMERIC FROM public.orders WHERE payment_status = 'paid' AND created_at >= window_start)
      WHEN 'failed_transactions' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE payment_status = 'failed' AND created_at >= window_start)
      WHEN 'new_registrations' THEN (SELECT count(*)::NUMERIC FROM public.profiles WHERE created_at >= window_start)
      WHEN 'api_traffic' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE created_at >= window_start)
      WHEN 'system_errors' THEN (SELECT count(*)::NUMERIC FROM public.error_logs WHERE severity IN ('critical', 'error') AND created_at >= window_start)
      WHEN 'refunds' THEN (SELECT count(*)::NUMERIC FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= window_start)
      WHEN 'slow_pageviews_pct' THEN (
        SELECT CASE WHEN count(*) FILTER (WHERE lcp_ms IS NOT NULL) = 0 THEN 0 ELSE
          round(100.0 * count(*) FILTER (WHERE lcp_ms > 4000) / count(*) FILTER (WHERE lcp_ms IS NOT NULL), 1)
        END FROM public.analytics_performance_metrics WHERE created_at >= window_start
      )
      ELSE 0
    END, 0);

    previous_value := COALESCE(CASE rule.metric
      WHEN 'traffic' THEN (SELECT count(*)::NUMERIC FROM public.analytics_sessions WHERE started_at >= prev_window_start AND started_at < window_start)
      WHEN 'error_rate' THEN (
        SELECT CASE WHEN count(*) = 0 THEN 0 ELSE
          (SELECT count(*) FROM public.error_logs WHERE created_at >= prev_window_start AND created_at < window_start)::NUMERIC / count(*) * 100
        END FROM public.analytics_events WHERE created_at >= prev_window_start AND created_at < window_start
      )
      WHEN 'revenue' THEN (SELECT COALESCE(sum(total_cents), 0)::NUMERIC FROM public.orders WHERE payment_status = 'paid' AND created_at >= prev_window_start AND created_at < window_start)
      WHEN 'failed_transactions' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE payment_status = 'failed' AND created_at >= prev_window_start AND created_at < window_start)
      WHEN 'new_registrations' THEN (SELECT count(*)::NUMERIC FROM public.profiles WHERE created_at >= prev_window_start AND created_at < window_start)
      WHEN 'api_traffic' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE created_at >= prev_window_start AND created_at < window_start)
      WHEN 'system_errors' THEN (SELECT count(*)::NUMERIC FROM public.error_logs WHERE severity IN ('critical', 'error') AND created_at >= prev_window_start AND created_at < window_start)
      WHEN 'refunds' THEN (SELECT count(*)::NUMERIC FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= prev_window_start AND refunded_at < window_start)
      WHEN 'slow_pageviews_pct' THEN (
        SELECT CASE WHEN count(*) FILTER (WHERE lcp_ms IS NOT NULL) = 0 THEN 0 ELSE
          round(100.0 * count(*) FILTER (WHERE lcp_ms > 4000) / count(*) FILTER (WHERE lcp_ms IS NOT NULL), 1)
        END FROM public.analytics_performance_metrics WHERE created_at >= prev_window_start AND created_at < window_start
      )
      ELSE 0
    END, 0);

    is_triggered := CASE rule.condition
      WHEN 'above' THEN current_value > rule.threshold
      WHEN 'below' THEN current_value < rule.threshold
      WHEN 'spike_pct' THEN previous_value > 0 AND ((current_value - previous_value) / previous_value * 100) > rule.threshold
      WHEN 'drop_pct' THEN previous_value > 0 AND ((previous_value - current_value) / previous_value * 100) > rule.threshold
      ELSE false
    END;

    SELECT id INTO existing_event_id FROM public.analytics_alert_events
      WHERE rule_id = rule.id AND status = 'triggered' ORDER BY triggered_at DESC LIMIT 1;

    IF is_triggered AND existing_event_id IS NULL THEN
      event_message := rule.name || ' — ' || rule.metric || ' is ' || round(current_value, 2)::TEXT ||
        CASE WHEN rule.condition IN ('above', 'below') THEN ' (threshold ' || rule.threshold::TEXT || ')'
        ELSE ' (' || round(CASE WHEN previous_value > 0 THEN abs(current_value - previous_value) / previous_value * 100 ELSE 0 END, 1)::TEXT || '% vs prior window)' END;

      INSERT INTO public.analytics_alert_events (rule_id, value, message, status)
      VALUES (rule.id, current_value, event_message, 'triggered');

      newly_triggered := newly_triggered || jsonb_build_object(
        'rule_id', rule.id, 'name', rule.name, 'severity', rule.severity,
        'message', event_message, 'notify_channels', to_jsonb(rule.notify_channels)
      );
    ELSIF NOT is_triggered AND existing_event_id IS NOT NULL THEN
      UPDATE public.analytics_alert_events SET status = 'resolved', resolved_at = now() WHERE id = existing_event_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('newly_triggered', newly_triggered);
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_evaluate_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_evaluate_alerts() TO service_role;
