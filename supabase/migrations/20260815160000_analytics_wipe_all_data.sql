-- Full, unconditional wipe of all rows in the 5 analytics/search tables —
-- unlike analytics_purge_old_data() (age-filtered, batched DELETE), this
-- has no WHERE clause, so TRUNCATE is used instead of DELETE: it
-- deallocates pages rather than scanning/logging row-by-row, so it stays
-- fast regardless of table size, and batching (needed for DELETE to avoid
-- long-running statements) isn't a concern here.
--
-- All 5 tables are truncated together in one statement. Checked
-- pg_constraint / information_schema first: analytics_events, error_logs,
-- and analytics_performance_metrics each have a session_id FK to
-- analytics_sessions (CASCADE / SET NULL / SET NULL respectively), and
-- nothing else in the schema references any of these 5 tables. Truncating
-- the referencing tables and the referenced table together in the same
-- statement satisfies Postgres's FK requirement without needing CASCADE,
-- so no table outside this list of 5 is touched.
--
-- Row counts are captured before the TRUNCATE so the caller gets a
-- "deleted: N" summary in the same shape as analytics_purge_old_data(),
-- even though TRUNCATE itself reports no row count.
--
-- Admin-only: intentionally NOT exposed to the cron path (see
-- api.analytics-wipe.ts) — this is a manual, deliberate action.

CREATE OR REPLACE FUNCTION public.analytics_wipe_all_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  events_deleted INTEGER;
  errors_deleted INTEGER;
  performance_deleted INTEGER;
  search_logs_deleted INTEGER;
  sessions_deleted INTEGER;
BEGIN
  SELECT count(*) INTO events_deleted FROM public.analytics_events;
  SELECT count(*) INTO errors_deleted FROM public.error_logs;
  SELECT count(*) INTO performance_deleted FROM public.analytics_performance_metrics;
  SELECT count(*) INTO search_logs_deleted FROM public.search_logs;
  SELECT count(*) INTO sessions_deleted FROM public.analytics_sessions;

  TRUNCATE public.analytics_events, public.error_logs, public.analytics_performance_metrics,
    public.search_logs, public.analytics_sessions;

  RETURN jsonb_build_object(
    'analytics_events', jsonb_build_object('deleted', events_deleted, 'more_remaining', false),
    'error_logs', jsonb_build_object('deleted', errors_deleted, 'more_remaining', false),
    'analytics_performance_metrics', jsonb_build_object('deleted', performance_deleted, 'more_remaining', false),
    'search_logs', jsonb_build_object('deleted', search_logs_deleted, 'more_remaining', false),
    'analytics_sessions', jsonb_build_object('deleted', sessions_deleted, 'more_remaining', false),
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_wipe_all_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_wipe_all_data() TO service_role;
