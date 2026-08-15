import { supabase } from "@/integrations/supabase/client";

// ============================================================
// 1. Executive Overview
// ============================================================
export interface OverviewPeriodStats {
  total_users: number;
  new_users: number;
  active_users: number;
  total_sessions: number;
  page_views: number;
  revenue_cents: number;
  transactions: number;
  conversion_rate: number | null;
  error_rate: number | null;
  critical_events: number;
}

export interface OverviewStats {
  current: OverviewPeriodStats;
  previous: OverviewPeriodStats;
  current_online: number;
  revenue_trend: { date: string; revenue_cents: number }[];
  system_health: { status: "healthy" | "degraded" | "critical"; errors_last_hour: number; uptime_pct: number };
  error?: string;
}

export async function fetchOverviewStats(start: Date, end: Date, prevStart: Date, prevEnd: Date): Promise<OverviewStats> {
  const { data, error } = await supabase.rpc("analytics_overview_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_prev_start: prevStart.toISOString(),
    p_prev_end: prevEnd.toISOString(),
  });
  if (error) throw error;
  return data as unknown as OverviewStats;
}

// ============================================================
// 2. User Analytics
// ============================================================
export interface UserStats {
  total_registered: number;
  new_registrations: number;
  new_registrations_prev: number;
  active_users: number;
  dau: number;
  wau: number;
  mau: number;
  dormant_users: number;
  avg_session_duration_seconds: number;
  sessions_per_user: number;
  login_frequency: number;
  churn_rate_pct: number;
  registrations_by_day: { date: string; registrations: number }[];
  new_vs_returning_by_day: { date: string; new: number; returning: number }[];
  retention_by_day: { date: string; active: number; retention_pct: number }[];
  error?: string;
}

export async function fetchUserStats(start: Date, end: Date, prevStart: Date, prevEnd: Date): Promise<UserStats> {
  const { data, error } = await supabase.rpc("analytics_user_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_prev_start: prevStart.toISOString(),
    p_prev_end: prevEnd.toISOString(),
  });
  if (error) throw error;
  return data as unknown as UserStats;
}

// ============================================================
// 3. Geographic Analytics
// ============================================================
export interface GeoStats {
  by_state: { state: string; orders: number; customers: number; revenue_cents: number }[];
  by_city: { city: string; state: string; orders: number; revenue_cents: number }[];
  store_pickup_orders: number;
  customers_by_state: { state: string; customers: number; avg_lat: number | null; avg_lng: number | null }[];
  new_registrations_by_state: { state: string; new_registrations: number }[];
  traffic_by_country: { country: string; sessions: number; visitors: number }[];
  error?: string;
}

export async function fetchGeoStats(start: Date, end: Date): Promise<GeoStats> {
  const { data, error } = await supabase.rpc("analytics_geo_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw error;
  return data as unknown as GeoStats;
}

// ============================================================
// 4. Traffic Analytics
// ============================================================
export interface TrafficFilters {
  device?: string | null;
  browser?: string | null;
  source?: string | null;
  country?: string | null;
}

export interface TrafficPerformanceStats {
  samples: number;
  avg_lcp_ms: number | null;
  avg_cls: number | null;
  avg_fcp_ms: number | null;
  avg_ttfb_ms: number | null;
  avg_load_ms: number | null;
  /** % of measured pageviews with LCP over the "poor" Core Web Vitals threshold (4000ms). */
  poor_lcp_pct: number | null;
  /** % of measured pageviews with CLS over the "poor" Core Web Vitals threshold (0.25). */
  poor_cls_pct: number | null;
}

export interface TrafficStats {
  total_visitors: number;
  unique_visitors: number;
  sessions: number;
  sessions_prev: number;
  page_views: number;
  page_views_prev: number;
  avg_session_duration_seconds: number;
  bounce_rate_pct: number;
  traffic_sources: Record<string, number>;
  top_pages: { path: string; views: number }[];
  entry_pages: { path: string; sessions: number }[];
  exit_pages: { path: string; sessions: number }[];
  daily_trend: { date: string; sessions: number; visitors: number; page_views: number }[];
  performance: TrafficPerformanceStats;
  error?: string;
}

export async function fetchTrafficStats(
  start: Date,
  end: Date,
  prevStart: Date,
  prevEnd: Date,
  filters: TrafficFilters = {},
): Promise<TrafficStats> {
  const { data, error } = await supabase.rpc("analytics_traffic_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_prev_start: prevStart.toISOString(),
    p_prev_end: prevEnd.toISOString(),
    p_device: filters.device || null,
    p_browser: filters.browser || null,
    p_source: filters.source || null,
    p_country: filters.country || null,
  });
  if (error) throw error;
  return data as unknown as TrafficStats;
}

// ============================================================
// 5. Business Analytics
// ============================================================
export interface BusinessStats {
  gross_revenue_cents: number;
  gross_revenue_cents_prev: number;
  discount_given_cents: number;
  refunds_cents: number;
  refunds_cents_prev: number;
  net_revenue_cents: number;
  transactions_total: number;
  transactions_successful: number;
  transactions_failed: number;
  transactions_failed_prev: number;
  refund_count: number;
  avg_order_value_cents: number;
  revenue_per_user_cents: number;
  wallet_liability_cents: number;
  wallet_credits_cents: number;
  wallet_debits_cents: number;
  coupon_redemptions: number;
  payment_method_breakdown: Record<string, number>;
  subscriptions: { active: number; new: number; cancelled: number; upgrades: number; downgrades: number; note: string };
  revenue_by_day: { date: string; revenue_cents: number; transactions: number; refunds_cents: number }[];
  top_products: { product_name: string; units_sold: number; revenue_cents: number }[];
  error?: string;
}

export async function fetchBusinessStats(start: Date, end: Date, prevStart: Date, prevEnd: Date): Promise<BusinessStats> {
  const { data, error } = await supabase.rpc("analytics_business_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_prev_start: prevStart.toISOString(),
    p_prev_end: prevEnd.toISOString(),
  });
  if (error) throw error;
  return data as unknown as BusinessStats;
}

// ============================================================
// 6. Error Analytics
// ============================================================
export interface ErrorStats {
  total_errors: number;
  critical_errors: number;
  error_rate_pct: number | null;
  http_4xx: number;
  http_404: number;
  http_500: number;
  failed_jobs: number;
  by_type: Record<string, number>;
  trend: { date: string; errors: number }[];
  top_errors: {
    error_type: string;
    message: string;
    path: string | null;
    severity: string;
    occurrences: number;
    first_seen: string;
    last_seen: string;
    resolved: boolean;
  }[];
  by_page: { path: string; occurrences: number }[];
  by_device: Record<string, number>;
  by_browser: Record<string, number>;
  error?: string;
}

export async function fetchErrorStats(start: Date, end: Date): Promise<ErrorStats> {
  const { data, error } = await supabase.rpc("analytics_error_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw error;
  return data as unknown as ErrorStats;
}

export async function resolveErrorGroup(errorType: string, message: string, path: string | null): Promise<void> {
  const { error } = await supabase.rpc("analytics_resolve_error_group", {
    p_error_type: errorType,
    p_message: message,
    p_path: path,
  });
  if (error) throw error;
}

// ============================================================
// 7. Real-Time Analytics
// ============================================================
export interface RealtimeSnapshot {
  online_now: number;
  active_sessions_30m: number;
  new_registrations_today: number;
  checkout_activity_15m: number;
  page_activity_5m: number;
  errors_15m: number;
  current_pages: { path: string; viewers: number }[];
  live_transactions: { id: string; customer_name: string | null; total_cents: number; payment_status: string; created_at: string }[];
  live_errors: { id: string; error_type: string; severity: string; message: string; path: string | null; created_at: string }[];
  activity_feed: { kind: string; text: string; at: string }[];
  error?: string;
}

export async function fetchRealtimeSnapshot(): Promise<RealtimeSnapshot> {
  const { data, error } = await supabase.rpc("analytics_realtime_snapshot");
  if (error) throw error;
  return data as unknown as RealtimeSnapshot;
}

// ============================================================
// 8. Analytics Alerts
// ============================================================
export type AlertMetric =
  | "traffic" | "error_rate" | "revenue" | "failed_transactions"
  | "new_registrations" | "api_traffic" | "system_errors" | "refunds" | "slow_pageviews_pct";
export type AlertCondition = "above" | "below" | "spike_pct" | "drop_pct";
export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertRule {
  id: string;
  name: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  time_window_minutes: number;
  severity: AlertSeverity;
  notify_channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  triggered_at: string;
  value: number | null;
  message: string;
  status: "triggered" | "acknowledged" | "resolved";
  resolved_at: string | null;
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  const { data, error } = await supabase.from("analytics_alert_rules").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as AlertRule[];
}

export async function createAlertRule(
  rule: Pick<AlertRule, "name" | "metric" | "condition" | "threshold" | "time_window_minutes" | "severity" | "notify_channels">,
): Promise<void> {
  const { error } = await supabase.from("analytics_alert_rules").insert(rule);
  if (error) throw error;
}

export async function updateAlertRule(id: string, patch: Partial<AlertRule>): Promise<void> {
  const { error } = await supabase
    .from("analytics_alert_rules")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAlertRule(id: string): Promise<void> {
  const { error } = await supabase.from("analytics_alert_rules").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAlertEvents(limit = 50): Promise<AlertEvent[]> {
  const { data, error } = await supabase
    .from("analytics_alert_events")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AlertEvent[];
}

export async function acknowledgeAlertEvent(id: string): Promise<void> {
  const { error } = await supabase.from("analytics_alert_events").update({ status: "acknowledged" }).eq("id", id);
  if (error) throw error;
}

/** Runs rule evaluation immediately (the "Check now" button), authenticated with the caller's own session. */
export async function evaluateAlertsNow(): Promise<{ ok: boolean; triggered_count: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch("/api/analytics-alerts-check", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to check alerts");
  return res.json();
}

// ============================================================
// 9. Data retention
// ============================================================
export interface PurgeTableSummary {
  deleted: number;
  more_remaining: boolean;
}
export interface PurgeSummary {
  analytics_events: PurgeTableSummary;
  error_logs: PurgeTableSummary;
  analytics_performance_metrics: PurgeTableSummary;
  search_logs: PurgeTableSummary;
  analytics_sessions: PurgeTableSummary;
  ran_at: string;
}

/** Runs the retention purge immediately (the "Run cleanup now" button), authenticated with the caller's own session. */
export async function purgeAnalyticsDataNow(): Promise<{ ok: boolean; summary: PurgeSummary }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch("/api/analytics-cleanup", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to run cleanup");
  return res.json();
}

// ============================================================
// 10. Reports & Exports
// ============================================================
export interface ScheduledReport {
  id: string;
  name: string;
  report_type: "overview" | "users" | "geographic" | "traffic" | "business" | "errors" | "complete";
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
}

export async function fetchScheduledReports(): Promise<ScheduledReport[]> {
  const { data, error } = await supabase.from("analytics_scheduled_reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as ScheduledReport[];
}

export async function createScheduledReport(
  report: Pick<ScheduledReport, "name" | "report_type" | "frequency" | "recipients">,
): Promise<void> {
  const { error } = await supabase.from("analytics_scheduled_reports").insert({ ...report, next_run_at: new Date().toISOString() });
  if (error) throw error;
}

export async function updateScheduledReport(id: string, patch: Partial<ScheduledReport>): Promise<void> {
  const { error } = await supabase.from("analytics_scheduled_reports").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledReport(id: string): Promise<void> {
  const { error } = await supabase.from("analytics_scheduled_reports").delete().eq("id", id);
  if (error) throw error;
}

export async function sendReportNow(reportId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch("/api/analytics-reports-run", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ report_id: reportId }),
  });
  if (!res.ok) throw new Error("Failed to send report");
  // A 200 here only means the endpoint ran — it previously didn't mean the
  // report itself sent. Check the actual result so a report that failed
  // partway (or wasn't found) doesn't show a false "Report sent" toast.
  const result = (await res.json()) as { ran: string[]; errors: string[] };
  if (result.errors.includes(reportId)) throw new Error("Report failed while sending — check the recipient list");
  if (!result.ran.includes(reportId)) throw new Error("Report could not be found");
}
