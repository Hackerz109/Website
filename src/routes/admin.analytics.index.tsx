import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserCheck,
  Layers,
  Eye,
  IndianRupee,
  ShoppingCart,
  Percent,
  AlertTriangle,
  ShieldAlert,
  Wifi,
  HeartPulse,
} from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartCard, TrendAreaChart } from "@/components/analytics/Charts";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/stores/cart";
import { fetchOverviewStats } from "@/lib/admin-analytics";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";

export const Route = createFileRoute("/admin/analytics/")({ component: ExecutiveOverview });

const HEALTH_META: Record<string, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "bg-success/15 text-success border-success/30" },
  degraded: { label: "Degraded", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function ExecutiveOverview() {
  const search = useLocation().search as AnalyticsSearch;
  const range = searchToResolvedRange(search);
  const { start, end, prevStart, prevEnd, label } = range;
  const compare = (search.compare ?? "on") === "on";

  const { data, isLoading } = useQuery({
    // Keyed on the *search params*, not the resolved start/end timestamps.
    // For preset ranges (today/7d/30d/90d), resolveDateRange() computes
    // `end` from `new Date()` on every render, so a timestamp-based key
    // changed by a few milliseconds on every re-render — React Query saw
    // that as a brand new query every time, so it never finished loading.
    // Custom ranges use a fixed picked date, which is why those "worked".
    queryKey: ["analytics-overview", search.preset ?? "30d", search.from ?? null, search.to ?? null],
    queryFn: () => fetchOverviewStats(start, end, prevStart, prevEnd),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  const c = data?.current;
  const p = data?.previous;

  function trendFor(curr: number | undefined, prev: number | undefined, invert = false) {
    if (!compare || curr == null || prev == null) return undefined;
    return { current: curr, previous: prev, invert };
  }

  const health = data?.system_health;
  const healthMeta = HEALTH_META[health?.status ?? "healthy"];

  const exportRows = c
    ? [
        { metric: "Total users", value: c.total_users },
        { metric: "New users", value: c.new_users },
        { metric: "Active users", value: c.active_users },
        { metric: "Total sessions", value: c.total_sessions },
        { metric: "Page views", value: c.page_views },
        { metric: "Revenue", value: formatMoney(c.revenue_cents) },
        { metric: "Transactions", value: c.transactions },
        { metric: "Conversion rate", value: c.conversion_rate != null ? `${c.conversion_rate}%` : "—" },
        { metric: "Error rate", value: c.error_rate != null ? `${c.error_rate}%` : "—" },
        { metric: "Critical events", value: c.critical_events },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {health && (
            <Badge variant="outline" className={healthMeta.className}>
              <HeartPulse className="mr-1 h-3 w-3" /> {healthMeta.label}
            </Badge>
          )}
          {data && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wifi className="h-3.5 w-3.5 text-success" /> {data.current_online} online now
            </span>
          )}
        </div>
        {data && <ExportMenu filename="executive-overview" rows={exportRows} rawData={data} pdfTitle="Executive Overview" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Total users" value={(c?.total_users ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard
          icon={UserPlus}
          label="New users"
          value={(c?.new_users ?? 0).toLocaleString()}
          trend={trendFor(c?.new_users, p?.new_users)}
          loading={isLoading}
        />
        <StatCard
          icon={UserCheck}
          label="Active users"
          value={(c?.active_users ?? 0).toLocaleString()}
          trend={trendFor(c?.active_users, p?.active_users)}
          loading={isLoading}
        />
        <StatCard
          icon={Layers}
          label="Sessions"
          value={(c?.total_sessions ?? 0).toLocaleString()}
          trend={trendFor(c?.total_sessions, p?.total_sessions)}
          loading={isLoading}
        />
        <StatCard
          icon={Eye}
          label="Page views"
          value={(c?.page_views ?? 0).toLocaleString()}
          trend={trendFor(c?.page_views, p?.page_views)}
          loading={isLoading}
        />
        <StatCard
          icon={IndianRupee}
          label="Revenue"
          value={formatMoney(c?.revenue_cents ?? 0)}
          trend={trendFor(c?.revenue_cents, p?.revenue_cents)}
          loading={isLoading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Transactions"
          value={(c?.transactions ?? 0).toLocaleString()}
          trend={trendFor(c?.transactions, p?.transactions)}
          loading={isLoading}
        />
        <StatCard
          icon={Percent}
          label="Conversion rate"
          value={c?.conversion_rate != null ? `${c.conversion_rate}%` : "—"}
          trend={trendFor(c?.conversion_rate ?? undefined, p?.conversion_rate ?? undefined)}
          loading={isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Error rate"
          value={c?.error_rate != null ? `${c.error_rate}%` : "—"}
          trend={trendFor(c?.error_rate ?? undefined, p?.error_rate ?? undefined, true)}
          loading={isLoading}
        />
        <StatCard
          icon={ShieldAlert}
          label="Critical events"
          value={(c?.critical_events ?? 0).toLocaleString()}
          trend={trendFor(c?.critical_events, p?.critical_events, true)}
          loading={isLoading}
        />
      </div>

      <ChartCard title="Revenue trend" description={label}>
        <TrendAreaChart
          data={data?.revenue_trend ?? []}
          series={[{ key: "revenue_cents", label: "Revenue" }]}
          formatValue={(v) => formatMoney(v)}
        />
      </ChartCard>

      {health && (
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">System health</h3>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1 font-mono text-lg font-semibold capitalize">{health.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Uptime (logged)</div>
              <div className="mt-1 font-mono text-lg font-semibold">{health.uptime_pct}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Errors, last hour</div>
              <div className="mt-1 font-mono text-lg font-semibold">{health.errors_last_hour}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Uptime is derived from logged critical errors (no incident in a given hour counts as up), not external
            uptime monitoring.
          </p>
        </div>
      )}
    </div>
  );
}
