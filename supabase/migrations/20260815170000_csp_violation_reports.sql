-- ============================================================
-- Analytics system — CSP violation reports
-- ============================================================
-- Wires the browser's native CSP reporting (report-uri, set in
-- src/start.ts) into the existing error_logs pipeline instead of a new
-- table: a CSP violation is conceptually just another client-reported
-- error, and error_logs already has everything this needs for free — the
-- admin Errors page (by-type breakdown, trend, top-errors grouping,
-- by-page/device/browser), the 60-day retention purge, and the resolve
-- workflow. See src/routes/api.csp-report.ts for the ingestion endpoint.
--
-- Deliberately NOT wired into analytics_evaluate_alerts()'s 'system_errors'
-- metric: that metric only counts severity IN ('critical','error'), and
-- every row this ingests is written with severity='warning' (see the
-- route) specifically so a flood of reports can't trip a false alert —
-- this is a public, unauthenticated endpoint by nature (the browser fires
-- the report on its own, with no way for it to carry our normal auth/
-- session context), so treat volume as expected, not just possible abuse.
--
-- Same dynamic-constraint-rename approach as the 'resource' addition in
-- 20260811090000_analytics_network_performance.sql, for the same reason:
-- look up whatever the current CHECK is actually named instead of
-- assuming, so this can't leave the old constraint in place alongside a
-- new one (which would make 'csp' permanently unwritable).

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
  CHECK (error_type IN ('frontend', 'resource', 'csp', 'api', 'database', 'job'));

-- No changes needed to analytics_purge_old_data(): it already purges
-- error_logs as a whole on ERROR_RETENTION_DAYS (60 days), independent of
-- error_type — 'csp' rows age out the same way 'frontend'/'resource' rows
-- already do, with no extra loop or cutoff to add.
