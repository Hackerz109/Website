import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Moon, TimerReset, Repeat, LogIn, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartCard, TrendAreaChart } from "@/components/analytics/Charts";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { fetchUserStats } from "@/lib/admin-analytics";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";

export const Route = createFileRoute("/admin/analytics/users")({ component: UserAnalytics });

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function UserAnalytics() {
  const search = useLocation().search as AnalyticsSearch;
  const { start, end, prevStart, prevEnd } = searchToResolvedRange(search);
  const compare = (search.compare ?? "on") === "on";

  const { data, isLoading } = useQuery({
    // See admin.analytics.index.tsx for why this is keyed on the raw search
    // params rather than the resolved (and constantly-recomputed) start/end.
    queryKey: ["analytics-users", search.preset ?? "30d", search.from ?? null, search.to ?? null],
    queryFn: () => fetchUserStats(start, end, prevStart, prevEnd),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  const trendNewReg = compare && data ? { current: data.new_registrations, previous: data.new_registrations_prev } : undefined;

  const exportRows = data
    ? [
        { metric: "Total registered", value: data.total_registered },
        { metric: "New registrations", value: data.new_registrations },
        { metric: "Active users", value: data.active_users },
        { metric: "DAU", value: data.dau },
        { metric: "WAU", value: data.wau },
        { metric: "MAU", value: data.mau },
        { metric: "Dormant users", value: data.dormant_users },
        { metric: "Churn rate", value: `${data.churn_rate_pct}%` },
        { metric: "Avg. session duration", value: formatDuration(data.avg_session_duration_seconds) },
        { metric: "Sessions per user", value: data.sessions_per_user },
        { metric: "Login frequency", value: data.login_frequency },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {data && <ExportMenu filename="user-analytics" rows={exportRows} rawData={data} pdfTitle="User Analytics" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total registered" value={(data?.total_registered ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard
          icon={UserPlus}
          label="New registrations"
          value={(data?.new_registrations ?? 0).toLocaleString()}
          trend={trendNewReg}
          loading={isLoading}
        />
        <StatCard
          icon={Users}
          label="DAU / WAU / MAU"
          value={`${data?.dau ?? 0} / ${data?.wau ?? 0} / ${data?.mau ?? 0}`}
          loading={isLoading}
        />
        <StatCard icon={Moon} label="Dormant users" value={(data?.dormant_users ?? 0).toLocaleString()} sub="Registered, inactive 30+ days" loading={isLoading} />
        <StatCard icon={TrendingDown} label="Churn rate" value={`${data?.churn_rate_pct ?? 0}%`} sub="Prior customers, no repeat purchase" loading={isLoading} />
        <StatCard icon={TimerReset} label="Avg. session duration" value={formatDuration(data?.avg_session_duration_seconds ?? 0)} loading={isLoading} />
        <StatCard icon={Repeat} label="Sessions per user" value={(data?.sessions_per_user ?? 0).toString()} loading={isLoading} />
        <StatCard icon={LogIn} label="Login frequency" value={(data?.login_frequency ?? 0).toString()} sub="Sessions per signed-in user" loading={isLoading} />
      </div>

      <ChartCard title="User growth" description="New registrations by day">
        <TrendAreaChart
          data={data?.registrations_by_day ?? []}
          series={[{ key: "registrations", label: "Registrations" }]}
        />
      </ChartCard>

      <ChartCard title="New vs. returning visitors" description="By day, based on tracked sessions">
        <TrendAreaChart
          data={data?.new_vs_returning_by_day ?? []}
          series={[
            { key: "new", label: "New", colorIndex: 0 },
            { key: "returning", label: "Returning", colorIndex: 2 },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Day-over-day retention"
        description="Share of each day's visitors who were also active the day before"
      >
        <TrendAreaChart
          data={data?.retention_by_day ?? []}
          series={[{ key: "retention_pct", label: "Retention", colorIndex: 0 }]}
          formatValue={(v) => `${v}%`}
        />
      </ChartCard>
    </div>
  );
}
