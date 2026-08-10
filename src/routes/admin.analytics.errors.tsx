import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, ShieldAlert, Percent, FileWarning, ServerCrash, Ban, Check } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartCard, TrendAreaChart, SimpleBarList, DonutBreakdown } from "@/components/analytics/Charts";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchErrorStats, resolveErrorGroup } from "@/lib/admin-analytics";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics/errors")({ component: ErrorAnalytics });

const SEVERITY_CLASS: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  error: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  warning: "bg-secondary text-muted-foreground",
};

function ErrorAnalytics() {
  const search = useLocation().search as AnalyticsSearch;
  const { start, end } = searchToResolvedRange(search);
  const queryClient = useQueryClient();

  // See admin.analytics.index.tsx for why this is keyed on the raw search
  // params rather than the resolved (and constantly-recomputed) start/end.
  const queryKey = ["analytics-errors", search.preset ?? "30d", search.from ?? null, search.to ?? null];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchErrorStats(start, end),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  const resolveMutation = useMutation({
    mutationFn: (vars: { errorType: string; message: string; path: string | null }) =>
      resolveErrorGroup(vars.errorType, vars.message, vars.path),
    onSuccess: () => {
      toast.success("Marked as resolved");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Couldn't update that error"),
  });

  const byTypeData = Object.entries(data?.by_type ?? {}).map(([name, value]) => ({ name, value }));

  const exportRows = data
    ? [
        { metric: "Total errors", value: data.total_errors },
        { metric: "Critical errors", value: data.critical_errors },
        { metric: "Error rate", value: data.error_rate_pct != null ? `${data.error_rate_pct}%` : "—" },
        { metric: "HTTP 4xx", value: data.http_4xx },
        { metric: "HTTP 404", value: data.http_404 },
        { metric: "HTTP 500", value: data.http_500 },
        { metric: "Failed jobs", value: data.failed_jobs },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {data && <ExportMenu filename="error-analytics" rows={exportRows} rawData={data} pdfTitle="Error Analytics" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={AlertOctagon} label="Total errors" value={(data?.total_errors ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard icon={ShieldAlert} label="Critical" value={(data?.critical_errors ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard icon={Percent} label="Error rate" value={data?.error_rate_pct != null ? `${data.error_rate_pct}%` : "—"} loading={isLoading} />
        <StatCard icon={FileWarning} label="404s" value={(data?.http_404 ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard icon={ServerCrash} label="500s" value={(data?.http_500 ?? 0).toLocaleString()} loading={isLoading} />
        <StatCard icon={Ban} label="Failed jobs" value={(data?.failed_jobs ?? 0).toLocaleString()} loading={isLoading} />
      </div>

      <ChartCard title="Error trend" description="Occurrences by day">
        <TrendAreaChart data={data?.trend ?? []} series={[{ key: "errors", label: "Errors", colorIndex: 3 }]} />
      </ChartCard>

      <ChartCard title="Errors, grouped" description="Same type + message + page counted together">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.top_errors ?? []).map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[240px] truncate text-xs" title={e.message}>{e.message}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">{e.path ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_CLASS[e.severity] ?? ""}>{e.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{e.occurrences}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.last_seen).toLocaleString()}</TableCell>
                  <TableCell>
                    {e.resolved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="h-3 w-3" /> Resolved</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate({ errorType: e.error_type, message: e.message, path: e.path })}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.top_errors.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                    No errors logged in this range. 🎉
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="By type">
          <DonutBreakdown data={byTypeData} />
        </ChartCard>
        <ChartCard title="By page">
          <SimpleBarList items={(data?.by_page ?? []).map((p) => ({ label: p.path, value: p.occurrences }))} colorClass="bg-[var(--chart-4)]" />
        </ChartCard>
        <ChartCard title="By device / browser">
          <div className="space-y-4">
            <SimpleBarList items={Object.entries(data?.by_device ?? {}).map(([label, value]) => ({ label, value }))} />
            <SimpleBarList items={Object.entries(data?.by_browser ?? {}).map(([label, value]) => ({ label, value }))} colorClass="bg-[var(--chart-2)]" />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
