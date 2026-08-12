import { useState } from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Eye, Layers, Clock, ArrowDownUp, X, Gauge, Activity, Timer, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartCard, TrendAreaChart, SimpleBarList, DonutBreakdown } from "@/components/analytics/Charts";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTrafficStats, type TrafficFilters } from "@/lib/admin-analytics";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";

export const Route = createFileRoute("/admin/analytics/traffic")({ component: TrafficAnalytics });

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${Math.round(seconds % 60)}s`;
}

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

// Standard Core Web Vitals thresholds (not project-specific).
function lcpRating(ms: number | null | undefined): string | undefined {
  if (ms === null || ms === undefined) return undefined;
  return ms <= 2500 ? "Good" : ms <= 4000 ? "Needs improvement" : "Poor";
}
function clsRating(cls: number | null | undefined): string | undefined {
  if (cls === null || cls === undefined) return undefined;
  return cls <= 0.1 ? "Good" : cls <= 0.25 ? "Needs improvement" : "Poor";
}

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  search: "Search",
  social: "Social",
  campaign: "Campaign",
  referral: "Referral",
};

function TrafficAnalytics() {
  const search = useLocation().search as AnalyticsSearch;
  const { start, end, prevStart, prevEnd } = searchToResolvedRange(search);
  const [filters, setFilters] = useState<TrafficFilters>({});

  const { data, isLoading } = useQuery({
    // See admin.analytics.index.tsx for why this is keyed on the raw search
    // params rather than the resolved (and constantly-recomputed) start/end.
    queryKey: ["analytics-traffic", search.preset ?? "30d", search.from ?? null, search.to ?? null, filters],
    queryFn: () => fetchTrafficStats(start, end, prevStart, prevEnd, filters),
    refetchInterval: 60_000,
  });

  const hasFilters = Object.values(filters).some(Boolean);
  const sourcesData = Object.entries(data?.traffic_sources ?? {}).map(([name, value]) => ({
    name: SOURCE_LABELS[name] ?? name,
    value,
  }));

  const exportRows = data
    ? [
        { metric: "Total visitors", value: data.total_visitors },
        { metric: "Unique visitors", value: data.unique_visitors },
        { metric: "Sessions", value: data.sessions },
        { metric: "Page views", value: data.page_views },
        { metric: "Bounce rate", value: `${data.bounce_rate_pct}%` },
        { metric: "Avg. session duration", value: formatDuration(data.avg_session_duration_seconds) },
        { metric: "Avg. LCP (page load)", value: formatMs(data.performance?.avg_lcp_ms) },
        { metric: "Avg. CLS (layout shift)", value: data.performance?.avg_cls ?? "—" },
        { metric: "Avg. TTFB", value: formatMs(data.performance?.avg_ttfb_ms) },
        { metric: "Slow pageviews (poor LCP)", value: data.performance?.poor_lcp_pct != null ? `${data.performance.poor_lcp_pct}%` : "—" },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.device ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, device: v === "all" ? null : v }))}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Device" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All devices</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.browser ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, browser: v === "all" ? null : v }))}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Browser" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All browsers</SelectItem>
            <SelectItem value="Chrome">Chrome</SelectItem>
            <SelectItem value="Safari">Safari</SelectItem>
            <SelectItem value="Firefox">Firefox</SelectItem>
            <SelectItem value="Edge">Edge</SelectItem>
            <SelectItem value="Samsung Internet">Samsung Internet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.source ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, source: v === "all" ? null : v }))}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Country"
          value={filters.country ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value || null }))}
          className="h-8 w-[130px] text-xs"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setFilters({})}>
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
        <div className="ml-auto">
          {data && <ExportMenu filename="traffic-analytics" rows={exportRows} rawData={data} pdfTitle="Traffic Analytics" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Unique visitors" value={(data?.unique_visitors ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard icon={Layers} label="Sessions" value={(data?.sessions ?? 0).toLocaleString()} trend={data ? { current: data.sessions, previous: data.sessions_prev } : undefined} loading={isLoading} />
        <StatCard icon={Eye} label="Page views" value={(data?.page_views ?? 0).toLocaleString()} trend={data ? { current: data.page_views, previous: data.page_views_prev } : undefined} loading={isLoading} />
        <StatCard icon={ArrowDownUp} label="Bounce rate" value={`${data?.bounce_rate_pct ?? 0}%`} loading={isLoading} />
        <StatCard icon={Clock} label="Avg. session" value={formatDuration(data?.avg_session_duration_seconds ?? 0)} loading={isLoading} />
      </div>

      <ChartCard title="Traffic trend" description="Sessions, visitors, and page views by day">
        <TrendAreaChart
          data={data?.daily_trend ?? []}
          series={[
            { key: "sessions", label: "Sessions", colorIndex: 0 },
            { key: "visitors", label: "Visitors", colorIndex: 2 },
          ]}
        />
      </ChartCard>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Page performance</h3>
          {!isLoading && data?.performance && data.performance.samples === 0 && (
            <span className="text-xs text-muted-foreground">No performance data in this range yet</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Gauge}
            label="Avg. load (LCP)"
            value={formatMs(data?.performance?.avg_lcp_ms)}
            sub={lcpRating(data?.performance?.avg_lcp_ms)}
            loading={isLoading}
          />
          <StatCard
            icon={Activity}
            label="Avg. layout shift"
            value={data?.performance?.avg_cls?.toString() ?? "—"}
            sub={clsRating(data?.performance?.avg_cls)}
            loading={isLoading}
          />
          <StatCard icon={Timer} label="Avg. server response" value={formatMs(data?.performance?.avg_ttfb_ms)} loading={isLoading} />
          <StatCard
            icon={AlertTriangle}
            label="Slow pageviews"
            value={data?.performance?.poor_lcp_pct != null ? `${data.performance.poor_lcp_pct}%` : "—"}
            sub="Poor LCP (>4s)"
            loading={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Traffic sources">
          <DonutBreakdown data={sourcesData} />
        </ChartCard>
        <ChartCard title="Most visited pages">
          <SimpleBarList items={(data?.top_pages ?? []).map((p) => ({ label: p.path, value: p.views }))} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top entry pages" description="Where sessions start">
          <SimpleBarList items={(data?.entry_pages ?? []).map((p) => ({ label: p.path, value: p.sessions }))} colorClass="bg-[var(--chart-2)]" />
        </ChartCard>
        <ChartCard title="Top exit pages" description="Where sessions end (or currently sit)">
          <SimpleBarList items={(data?.exit_pages ?? []).map((p) => ({ label: p.path, value: p.sessions }))} colorClass="bg-[var(--chart-4)]" />
        </ChartCard>
      </div>
    </div>
  );
}
