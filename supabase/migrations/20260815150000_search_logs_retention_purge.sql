-- Adds search_logs to the existing nightly retention purge
-- (analytics_purge_old_data(), run by /api/analytics-cleanup via Vercel
-- Cron and the "Run cleanup now" admin button). search_logs previously had
-- no cleanup at all and grew forever. 30-day cutoff, since
-- get_trending_searches() already only ever looks back 30 days — nothing
-- past that window is used for anything.
--
-- Also folds in analytics_performance_metrics, which the live version of
-- this function already purges (added after the original
-- analytics_data_retention migration, directly via the SQL editor) but
-- which this migration history never caught up to. Restating the full
-- function here so the migration history and the live function match again
-- (see the note in ADMIN memory about migrations sometimes only landing via
-- the SQL editor).

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
  SEARCH_LOG_RETENTION_DAYS CONSTANT INTEGER := 30;

  BATCH_SIZE CONSTANT INTEGER := 5000;
  MAX_BATCHES_PER_TABLE CONSTANT INTEGER := 20;

  events_cutoff CONSTANT TIMESTAMPTZ := now() - (EVENT_RETENTION_DAYS || ' days')::INTERVAL;
  errors_cutoff CONSTANT TIMESTAMPTZ := now() - (ERROR_RETENTION_DAYS || ' days')::INTERVAL;
  sessions_cutoff CONSTANT TIMESTAMPTZ := now() - (SESSION_RETENTION_DAYS || ' days')::INTERVAL;
  performance_cutoff CONSTANT TIMESTAMPTZ := now() - (PERFORMANCE_RETENTION_DAYS || ' days')::INTERVAL;
  search_logs_cutoff CONSTANT TIMESTAMPTZ := now() - (SEARCH_LOG_RETENTION_DAYS || ' days')::INTERVAL;

  events_deleted INTEGER := 0;
  errors_deleted INTEGER := 0;
  sessions_deleted INTEGER := 0;
  performance_deleted INTEGER := 0;
  search_logs_deleted INTEGER := 0;

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
  -- NULL, not CASCADE), so it needs its own age-based loop rather than
  -- riding along with the sessions purge below.
  batches := 0;
  LOOP
    DELETE FROM public.analytics_performance_metrics
    WHERE id IN (SELECT id FROM public.analytics_performance_metrics WHERE created_at < performance_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    performance_deleted := performance_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- search_logs
  batches := 0;
  LOOP
    DELETE FROM public.search_logs
    WHERE id IN (SELECT id FROM public.search_logs WHERE created_at < search_logs_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    search_logs_deleted := search_logs_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- analytics_sessions (any lingering events on a purged session, past their
  -- own cutoff or not, cascade-delete automatically via the FK)
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
    'search_logs', jsonb_build_object(
      'deleted', search_logs_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.search_logs WHERE created_at < search_logs_cutoff)
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
