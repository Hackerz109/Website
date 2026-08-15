import { useState } from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Send, FileDown, Eraser } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  fetchScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  sendReportNow,
  purgeAnalyticsDataNow,
  fetchOverviewStats,
  fetchUserStats,
  fetchGeoStats,
  fetchTrafficStats,
  fetchBusinessStats,
  fetchErrorStats,
  type ScheduledReport,
  type PurgeSummary,
} from "@/lib/admin-analytics";
import { exportCSV, exportJSON, exportExcel, exportPDF } from "@/lib/admin-analytics-export";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";
import { formatMoney } from "@/stores/cart";

export const Route = createFileRoute("/admin/analytics/reports")({ component: ReportsExports });

type ReportType = "overview" | "users" | "geographic" | "traffic" | "business" | "errors" | "complete";

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  overview: "Executive overview",
  users: "User analytics",
  geographic: "Geographic analytics",
  traffic: "Traffic analytics",
  business: "Business analytics",
  errors: "Error analytics",
  complete: "Complete analytics report",
};

type ReportSection = { heading: string; rows: Record<string, unknown>[] };

async function gatherReportSections(type: ReportType, range: ReturnType<typeof searchToResolvedRange>): Promise<ReportSection[]> {
  const { start, end, prevStart, prevEnd } = range;
  const sections: ReportSection[] = [];
  const want = (t: ReportType) => type === t || type === "complete";

  if (want("overview")) {
    const d = await fetchOverviewStats(start, end, prevStart, prevEnd);
    sections.push({
      heading: "Executive overview",
      rows: [
        { metric: "New users", value: d.current.new_users },
        { metric: "Sessions", value: d.current.total_sessions },
        { metric: "Revenue", value: formatMoney(d.current.revenue_cents) },
        { metric: "Transactions", value: d.current.transactions },
        { metric: "Conversion rate", value: d.current.conversion_rate != null ? `${d.current.conversion_rate}%` : "—" },
        { metric: "Error rate", value: d.current.error_rate != null ? `${d.current.error_rate}%` : "—" },
        { metric: "Critical events", value: d.current.critical_events },
      ],
    });
  }
  if (want("users")) {
    const d = await fetchUserStats(start, end, prevStart, prevEnd);
    sections.push({
      heading: "User analytics",
      rows: [
        { metric: "Total registered", value: d.total_registered },
        { metric: "New registrations", value: d.new_registrations },
        { metric: "DAU / WAU / MAU", value: `${d.dau} / ${d.wau} / ${d.mau}` },
        { metric: "Dormant users", value: d.dormant_users },
        { metric: "Churn rate", value: `${d.churn_rate_pct}%` },
      ],
    });
  }
  if (want("geographic")) {
    const d = await fetchGeoStats(start, end);
    sections.push({
      heading: "Top states by revenue",
      rows: d.by_state.slice(0, 10).map((s) => ({ state: s.state, orders: s.orders, revenue: formatMoney(s.revenue_cents) })),
    });
  }
  if (want("traffic")) {
    const d = await fetchTrafficStats(start, end, prevStart, prevEnd);
    sections.push({
      heading: "Traffic",
      rows: [
        { metric: "Unique visitors", value: d.unique_visitors },
        { metric: "Sessions", value: d.sessions },
        { metric: "Page views", value: d.page_views },
        { metric: "Bounce rate", value: `${d.bounce_rate_pct}%` },
      ],
    });
  }
  if (want("business")) {
    const d = await fetchBusinessStats(start, end, prevStart, prevEnd);
    sections.push({
      heading: "Business",
      rows: [
        { metric: "Gross revenue", value: formatMoney(d.gross_revenue_cents) },
        { metric: "Net revenue", value: formatMoney(d.net_revenue_cents) },
        { metric: "Successful transactions", value: d.transactions_successful },
        { metric: "Failed transactions", value: d.transactions_failed },
        { metric: "Refunds", value: `${d.refund_count} · ${formatMoney(d.refunds_cents)}` },
        { metric: "Avg. order value", value: formatMoney(d.avg_order_value_cents) },
      ],
    });
  }
  if (want("errors")) {
    const d = await fetchErrorStats(start, end);
    sections.push({
      heading: "Errors",
      rows: [
        { metric: "Total errors", value: d.total_errors },
        { metric: "Critical errors", value: d.critical_errors },
        { metric: "HTTP 500s", value: d.http_500 },
        { metric: "HTTP 404s", value: d.http_404 },
      ],
    });
  }
  return sections;
}

function emptyReportForm() {
  return { name: "", report_type: "complete" as ReportType, frequency: "weekly" as ScheduledReport["frequency"], recipients: "" };
}

function ReportsExports() {
  const search = useLocation().search as AnalyticsSearch;
  const range = searchToResolvedRange(search);
  const queryClient = useQueryClient();

  const [generateType, setGenerateType] = useState<ReportType>("complete");
  const [generating, setGenerating] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyReportForm());

  const { data: reports, isLoading } = useQuery({ queryKey: ["analytics-scheduled-reports"], queryFn: fetchScheduledReports });

  async function handleGenerate(format: "csv" | "json" | "excel" | "pdf") {
    setGenerating(true);
    try {
      const sections = await gatherReportSections(generateType, range);
      const filename = `${generateType}-report-${new Date().toISOString().slice(0, 10)}`;
      const title = REPORT_TYPE_LABELS[generateType];
      if (format === "pdf") {
        exportPDF(title, sections);
      } else if (format === "json") {
        exportJSON(filename, sections);
      } else {
        const rows = sections.flatMap((s) => s.rows.map((r) => ({ section: s.heading, ...r })));
        if (format === "csv") exportCSV(filename, rows);
        else exportExcel(filename, rows, title);
      }
    } catch {
      toast.error("Couldn't generate that report");
    } finally {
      setGenerating(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createScheduledReport({
        name: form.name,
        report_type: form.report_type,
        frequency: form.frequency,
        recipients: form.recipients.split(",").map((e) => e.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Scheduled report created");
      queryClient.invalidateQueries({ queryKey: ["analytics-scheduled-reports"] });
      setDialogOpen(false);
      setForm(emptyReportForm());
    },
    onError: () => toast.error("Couldn't create the scheduled report"),
  });

  const toggleMutation = useMutation({
    mutationFn: (r: ScheduledReport) => updateScheduledReport(r.id, { enabled: !r.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["analytics-scheduled-reports"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledReport(id),
    onSuccess: () => {
      toast.success("Scheduled report deleted");
      queryClient.invalidateQueries({ queryKey: ["analytics-scheduled-reports"] });
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: (id: string) => sendReportNow(id),
    onSuccess: () => toast.success("Report sent"),
    onError: () => toast.error("Couldn't send that report — check the recipient list"),
  });

  // Not persisted anywhere — this is only the result of the button click
  // below, held in memory for this page view. The daily cron run's summary
  // lives in Vercel's cron logs instead (see api.analytics-cleanup.ts).
  const [purgeSummary, setPurgeSummary] = useState<PurgeSummary | null>(null);
  const purgeMutation = useMutation({
    mutationFn: purgeAnalyticsDataNow,
    onSuccess: ({ summary }) => {
      setPurgeSummary(summary);
      const total =
        summary.analytics_events.deleted +
        summary.error_logs.deleted +
        summary.analytics_performance_metrics.deleted +
        summary.search_logs.deleted +
        summary.analytics_sessions.deleted;
      toast.success(total > 0 ? `Cleanup ran — ${total.toLocaleString()} old rows deleted` : "Cleanup ran — nothing old to delete");
    },
    onError: () => toast.error("Couldn't run cleanup right now"),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Generate a report now</h3>
        <p className="mt-1 text-xs text-muted-foreground">Uses the date range selected above ({range.label.toLowerCase()}).</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={generateType} onValueChange={(v) => setGenerateType(v as ReportType)}>
            <SelectTrigger className="h-9 w-[220px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={generating} onClick={() => handleGenerate("csv")}>CSV</Button>
          <Button variant="outline" size="sm" disabled={generating} onClick={() => handleGenerate("excel")}>Excel</Button>
          <Button variant="outline" size="sm" disabled={generating} onClick={() => handleGenerate("json")}>JSON</Button>
          <Button variant="outline" size="sm" disabled={generating} onClick={() => handleGenerate("pdf")}>
            <FileDown className="mr-1 h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Data retention</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Events, errors &amp; performance metrics older than 60 days, search history older than 30 days,
              and sessions older than 90 days are purged automatically once a day. Use this to run it early.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => purgeMutation.mutate()}
            disabled={purgeMutation.isPending}
          >
            <Eraser className="h-3.5 w-3.5" /> Run cleanup now
          </Button>
        </div>
        {purgeSummary && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Events</p>
              <p className="font-medium">
                {purgeSummary.analytics_events.deleted.toLocaleString()} deleted
                {purgeSummary.analytics_events.more_remaining ? " · more pending" : ""}
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Errors</p>
              <p className="font-medium">
                {purgeSummary.error_logs.deleted.toLocaleString()} deleted
                {purgeSummary.error_logs.more_remaining ? " · more pending" : ""}
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Performance</p>
              <p className="font-medium">
                {purgeSummary.analytics_performance_metrics.deleted.toLocaleString()} deleted
                {purgeSummary.analytics_performance_metrics.more_remaining ? " · more pending" : ""}
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Search history</p>
              <p className="font-medium">
                {purgeSummary.search_logs.deleted.toLocaleString()} deleted
                {purgeSummary.search_logs.more_remaining ? " · more pending" : ""}
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Sessions</p>
              <p className="font-medium">
                {purgeSummary.analytics_sessions.deleted.toLocaleString()} deleted
                {purgeSummary.analytics_sessions.more_remaining ? " · more pending" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-sm font-semibold">Scheduled reports</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Emailed automatically on the schedule below.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New scheduled report</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Weekly performance summary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Report type</Label>
                    <Select value={form.report_type} onValueChange={(v) => setForm((f) => ({ ...f, report_type: v as ReportType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as ScheduledReport["frequency"] }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Recipients (comma-separated emails)</Label>
                  <Input
                    value={form.recipients}
                    onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
                    placeholder="owner@example.com, manager@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="divide-y">
          {(reports ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.frequency}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {REPORT_TYPE_LABELS[r.report_type]} · {r.recipients.length} recipient{r.recipients.length === 1 ? "" : "s"}
                  {r.last_run_at ? ` · last sent ${new Date(r.last_run_at).toLocaleDateString()}` : " · not sent yet"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendNowMutation.mutate(r.id)} title="Send test now">
                  <Send className="h-4 w-4" />
                </Button>
                <Switch checked={r.enabled} onCheckedChange={() => toggleMutation.mutate(r)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && (reports ?? []).length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">No scheduled reports yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
