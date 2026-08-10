import { formatMoney } from "@/stores/cart";

type ReportRow = { id: string; name: string; report_type: string; frequency: string; recipients: string[] };

/**
 * Runs every scheduled report whose next_run_at has passed (the normal cron
 * path), or a single report immediately regardless of schedule (the "send
 * test now" path from the admin UI — pass its id as p_report_id).
 */
export async function runDueReports(p_report_id?: string): Promise<{ ran: string[]; errors: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("analytics_scheduled_reports")
    .select("id, name, report_type, frequency, recipients")
    .eq("enabled", true);

  query = p_report_id ? query.eq("id", p_report_id) : query.lte("next_run_at", new Date().toISOString());

  const { data: reports, error } = await query;
  if (error) throw error;

  const ran: string[] = [];
  const errors: string[] = [];

  for (const report of (reports ?? []) as ReportRow[]) {
    try {
      await runOneReport(report);
      ran.push(report.id);
    } catch (err) {
      console.error(`[analytics-reports] failed to run report ${report.id}`, err);
      errors.push(report.id);
    }
  }

  return { ran, errors };
}

async function runOneReport(report: ReportRow): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { start, end, prevStart, prevEnd } = periodFor(report.frequency);

  const sections = await gatherSections(report.report_type, start, end, prevStart, prevEnd);
  const html = renderReportEmail(report.name, report.frequency, start, end, sections);

  if (report.recipients.length > 0) {
    const { sendEmail } = await import("@/lib/email.server");
    await Promise.all(
      report.recipients.map((to) =>
        sendEmail({ to, subject: `${report.name} — ${formatDateRange(start, end)}`, html }),
      ),
    );
  }

  const nextRunAt = nextRunFor(report.frequency);
  await supabaseAdmin
    .from("analytics_scheduled_reports")
    .update({ last_run_at: new Date().toISOString(), next_run_at: nextRunAt.toISOString() })
    .eq("id", report.id);
}

function periodFor(frequency: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date();
  const start = new Date(end);
  if (frequency === "weekly") start.setDate(start.getDate() - 7);
  else if (frequency === "monthly") start.setMonth(start.getMonth() - 1);
  else start.setDate(start.getDate() - 1);

  const spanMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - spanMs);
  return { start, end, prevStart, prevEnd };
}

function nextRunFor(frequency: string): Date {
  const next = new Date();
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 1);
  return next;
}

type Section = { title: string; rows: [string, string][] };

async function gatherSections(
  reportType: string,
  start: Date,
  end: Date,
  prevStart: Date,
  prevEnd: Date,
): Promise<Section[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const iso = (d: Date) => d.toISOString();
  const sections: Section[] = [];

  const wantsOverview = reportType === "overview" || reportType === "complete";
  const wantsUsers = reportType === "users" || reportType === "complete";
  const wantsGeo = reportType === "geographic" || reportType === "complete";
  const wantsTraffic = reportType === "traffic" || reportType === "complete";
  const wantsBusiness = reportType === "business" || reportType === "complete";
  const wantsErrors = reportType === "errors" || reportType === "complete";

  if (wantsOverview) {
    const { data } = await supabaseAdmin.rpc("analytics_overview_stats", {
      p_start: iso(start), p_end: iso(end), p_prev_start: iso(prevStart), p_prev_end: iso(prevEnd),
    });
    const c = (data as { current?: Record<string, number> })?.current;
    if (c) {
      sections.push({
        title: "Executive overview",
        rows: [
          ["New users", String(c.new_users ?? 0)],
          ["Sessions", String(c.total_sessions ?? 0)],
          ["Revenue", formatMoney(c.revenue_cents ?? 0)],
          ["Transactions", String(c.transactions ?? 0)],
          ["Conversion rate", c.conversion_rate != null ? `${c.conversion_rate}%` : "—"],
          ["Error rate", c.error_rate != null ? `${c.error_rate}%` : "—"],
          ["Critical events", String(c.critical_events ?? 0)],
        ],
      });
    }
  }

  if (wantsUsers) {
    const { data } = await supabaseAdmin.rpc("analytics_user_stats", {
      p_start: iso(start), p_end: iso(end), p_prev_start: iso(prevStart), p_prev_end: iso(prevEnd),
    });
    const u = data as Record<string, number> | null;
    if (u) {
      sections.push({
        title: "User analytics",
        rows: [
          ["Total registered", String(u.total_registered ?? 0)],
          ["New registrations", String(u.new_registrations ?? 0)],
          ["DAU / WAU / MAU", `${u.dau ?? 0} / ${u.wau ?? 0} / ${u.mau ?? 0}`],
          ["Dormant users", String(u.dormant_users ?? 0)],
          ["Churn rate", `${u.churn_rate_pct ?? 0}%`],
          ["Sessions per user", String(u.sessions_per_user ?? 0)],
        ],
      });
    }
  }

  if (wantsGeo) {
    const { data } = await supabaseAdmin.rpc("analytics_geo_stats", { p_start: iso(start), p_end: iso(end) });
    const g = data as { by_state?: { state: string; revenue_cents: number }[] } | null;
    if (g?.by_state) {
      sections.push({
        title: "Top states by revenue",
        rows: g.by_state.slice(0, 5).map((s) => [s.state, formatMoney(s.revenue_cents)]),
      });
    }
  }

  if (wantsTraffic) {
    const { data } = await supabaseAdmin.rpc("analytics_traffic_stats", {
      p_start: iso(start), p_end: iso(end), p_prev_start: iso(prevStart), p_prev_end: iso(prevEnd),
      p_device: null, p_browser: null, p_source: null, p_country: null,
    });
    const t = data as Record<string, number> | null;
    if (t) {
      sections.push({
        title: "Traffic",
        rows: [
          ["Unique visitors", String(t.unique_visitors ?? 0)],
          ["Sessions", String(t.sessions ?? 0)],
          ["Page views", String(t.page_views ?? 0)],
          ["Bounce rate", `${t.bounce_rate_pct ?? 0}%`],
          ["Avg. session duration", `${Math.round((t.avg_session_duration_seconds ?? 0) / 60)} min`],
        ],
      });
    }
  }

  if (wantsBusiness) {
    const { data } = await supabaseAdmin.rpc("analytics_business_stats", {
      p_start: iso(start), p_end: iso(end), p_prev_start: iso(prevStart), p_prev_end: iso(prevEnd),
    });
    const b = data as Record<string, number> | null;
    if (b) {
      sections.push({
        title: "Business",
        rows: [
          ["Gross revenue", formatMoney(b.gross_revenue_cents ?? 0)],
          ["Net revenue", formatMoney(b.net_revenue_cents ?? 0)],
          ["Successful transactions", String(b.transactions_successful ?? 0)],
          ["Failed transactions", String(b.transactions_failed ?? 0)],
          ["Refunds", `${b.refund_count ?? 0} · ${formatMoney(b.refunds_cents ?? 0)}`],
          ["Avg. order value", formatMoney(b.avg_order_value_cents ?? 0)],
        ],
      });
    }
  }

  if (wantsErrors) {
    const { data } = await supabaseAdmin.rpc("analytics_error_stats", { p_start: iso(start), p_end: iso(end) });
    const e = data as Record<string, number> | null;
    if (e) {
      sections.push({
        title: "Errors",
        rows: [
          ["Total errors", String(e.total_errors ?? 0)],
          ["Critical errors", String(e.critical_errors ?? 0)],
          ["Error rate", e.error_rate_pct != null ? `${e.error_rate_pct}%` : "—"],
          ["HTTP 500s", String(e.http_500 ?? 0)],
          ["HTTP 404s", String(e.http_404 ?? 0)],
        ],
      });
    }
  }

  return sections;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function renderReportEmail(name: string, frequency: string, start: Date, end: Date, sections: Section[]): string {
  const sectionsHtml = sections
    .map(
      (s) => `
      <tr><td style="padding:20px 24px 8px;font-family:sans-serif;font-size:13px;font-weight:700;color:#585047;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(s.title)}</td></tr>
      ${s.rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:6px 24px;font-family:sans-serif;font-size:14px;color:#4a4740;border-bottom:1px solid #eee;">${escapeHtml(label)}</td>
          <td style="padding:6px 24px;font-family:sans-serif;font-size:14px;font-weight:600;color:#1a1610;text-align:right;border-bottom:1px solid #eee;">${escapeHtml(value)}</td>
        </tr>`,
        )
        .join("")}
    `,
    )
    .join("");

  return `
  <div style="background:#F7F5EE;padding:32px 12px;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e0d5;">
      <tr><td style="padding:24px 24px 4px;font-family:sans-serif;">
        <div style="font-size:12px;color:#c2703c;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Sanjay Electricals · Analytics</div>
        <div style="font-size:20px;font-weight:700;color:#1a1610;margin-top:4px;">${escapeHtml(name)}</div>
        <div style="font-size:13px;color:#84796a;margin-top:2px;">${frequency} report · ${formatDateRange(start, end)}</div>
      </td></tr>
      ${sectionsHtml}
      <tr><td style="padding:20px 24px;font-family:sans-serif;font-size:12px;color:#a89e8e;">
        Generated automatically from the Analytics section of your admin console.
      </td></tr>
    </table>
  </div>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
