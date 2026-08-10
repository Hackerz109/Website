-- ============================================================
-- Analytics system — part 1: tracking tables
-- ============================================================
-- New, previously-untracked telemetry (traffic, sessions, errors) plus
-- config tables for alerts and scheduled reports. Everything else the
-- Analytics section needs (users, orders, revenue, returns, wallet) already
-- exists in the schema and is queried directly by the functions in the next
-- migration.
--
-- Write access is service_role only (no anon/authenticated INSERT policy
-- anywhere below) — rows are only ever created through the
-- analytics_ingest_event / analytics_log_client_error functions, called
-- from server routes using supabaseAdmin, exactly like order-notify's
-- pattern of never trusting client-supplied content directly.

-- ============================================================
-- 1. Sessions — one row per visit (anonymous or signed-in)
-- ============================================================
CREATE TABLE public.analytics_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_path TEXT,
  exit_path TEXT,
  page_view_count INTEGER NOT NULL DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'other')),
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT
);
COMMENT ON TABLE public.analytics_sessions IS 'One row per site visit. Geo/device fields are captured once per session (not per event) since they never change mid-session and this keeps analytics_events narrow.';

CREATE INDEX idx_analytics_sessions_started_at ON public.analytics_sessions (started_at);
CREATE INDEX idx_analytics_sessions_last_seen_at ON public.analytics_sessions (last_seen_at);
CREATE INDEX idx_analytics_sessions_user_id ON public.analytics_sessions (user_id) WHERE user_id IS NOT NULL;

GRANT ALL ON public.analytics_sessions TO service_role;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read sessions" ON public.analytics_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Events — page views + custom events within a session
-- ============================================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  path TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events (session_id);
CREATE INDEX idx_analytics_events_path ON public.analytics_events (path);

GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Error logs — frontend, API, database, and background-job errors
-- ============================================================
-- One row per occurrence (not a maintained running counter) — grouping by
-- (error_type, message, path) at query time gives accurate first-seen/
-- last-seen/frequency for any date range, and "resolve" is a bulk update
-- across a fingerprint rather than a single-row flag.
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL DEFAULT 'frontend' CHECK (error_type IN ('frontend', 'api', 'database', 'job')),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('critical', 'error', 'warning')),
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  status_code INTEGER,
  device_type TEXT,
  browser TEXT,
  session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at);
CREATE INDEX idx_error_logs_resolved ON public.error_logs (resolved) WHERE resolved = false;
CREATE INDEX idx_error_logs_severity ON public.error_logs (severity);
CREATE INDEX idx_error_logs_group ON public.error_logs (error_type, path, message);

GRANT ALL ON public.error_logs TO service_role;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage error logs" ON public.error_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Alert rules + alert history
-- ============================================================
CREATE TABLE public.analytics_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN (
    'traffic', 'error_rate', 'revenue', 'failed_transactions', 'new_registrations',
    'api_traffic', 'system_errors', 'refunds'
  )),
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'spike_pct', 'drop_pct')),
  threshold NUMERIC NOT NULL,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  notify_channels TEXT[] NOT NULL DEFAULT ARRAY['telegram', 'push'],
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.analytics_alert_rules TO service_role;
ALTER TABLE public.analytics_alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage alert rules" ON public.analytics_alert_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.analytics_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.analytics_alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  value NUMERIC,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'acknowledged', 'resolved')),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_analytics_alert_events_rule_status ON public.analytics_alert_events (rule_id, status);
CREATE INDEX idx_analytics_alert_events_triggered_at ON public.analytics_alert_events (triggered_at);

GRANT ALL ON public.analytics_alert_events TO service_role;
ALTER TABLE public.analytics_alert_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage alert events" ON public.analytics_alert_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Scheduled reports
-- ============================================================
CREATE TABLE public.analytics_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'overview', 'users', 'geographic', 'traffic', 'business', 'errors', 'complete'
  )),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.analytics_scheduled_reports TO service_role;
ALTER TABLE public.analytics_scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage scheduled reports" ON public.analytics_scheduled_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. Realtime — only for tables this migration owns outright, so there's
-- no risk of an "already a member" error against a publication some other
-- part of the app may already be managing (e.g. orders).
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_alert_events;
