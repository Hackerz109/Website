import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { ChartCard, SimpleBarList } from "@/components/analytics/Charts";
import { GeoMap, COUNTRY_CENTROIDS, type GeoMapPoint } from "@/components/analytics/GeoMap";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { StatCard } from "@/components/analytics/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/stores/cart";
import { fetchGeoStats } from "@/lib/admin-analytics";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";

export const Route = createFileRoute("/admin/analytics/geographic")({ component: GeographicAnalytics });

function GeographicAnalytics() {
  const search = useLocation().search as AnalyticsSearch;
  const { start, end } = searchToResolvedRange(search);

  const { data, isLoading } = useQuery({
    // See admin.analytics.index.tsx for why this is keyed on the raw search
    // params rather than the resolved (and constantly-recomputed) start/end.
    queryKey: ["analytics-geo", search.preset ?? "30d", search.from ?? null, search.to ?? null],
    queryFn: () => fetchGeoStats(start, end),
  });

  const customerMapPoints: GeoMapPoint[] = (data?.customers_by_state ?? [])
    .filter((s) => s.avg_lat != null && s.avg_lng != null)
    .map((s) => ({ lat: s.avg_lat as number, lng: s.avg_lng as number, label: s.state, value: s.customers }));

  const countryMapPoints: GeoMapPoint[] = (data?.traffic_by_country ?? [])
    .filter((c) => COUNTRY_CENTROIDS[c.country])
    .map((c) => ({ ...COUNTRY_CENTROIDS[c.country], label: c.country, value: c.sessions }));

  const cityBarItems = (data?.by_city ?? []).slice(0, 12).map((c) => ({
    label: `${c.city}, ${c.state}`,
    value: c.revenue_cents,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatCard icon={Store} label="Store-pickup orders" value={(data?.store_pickup_orders ?? 0).toLocaleString()} sub="Not tied to a delivery address" loading={isLoading} />
        {data && <ExportMenu filename="geographic-analytics" rows={data.by_state} rawData={data} pdfTitle="Geographic Analytics" />}
      </div>

      <ChartCard title="Customers by state" description="Plotted from saved delivery addresses">
        {customerMapPoints.length > 0 ? (
          <GeoMap points={customerMapPoints} />
        ) : (
          <p className="text-xs text-muted-foreground">No saved addresses with state data yet.</p>
        )}
      </ChartCard>

      <ChartCard title="Revenue by state" description="Delivery orders, current range">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.by_state ?? []).map((s) => (
                <TableRow key={s.state}>
                  <TableCell className="font-medium">{s.state}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{s.orders}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{s.customers}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatMoney(s.revenue_cents)}</TableCell>
                </TableRow>
              ))}
              {(!data || data.by_state.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                    No delivered orders with state data in this range yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ChartCard>

      <ChartCard title="Top cities by revenue">
        <SimpleBarList items={cityBarItems} formatValue={(v) => formatMoney(v)} />
      </ChartCard>

      <ChartCard title="Traffic by country" description="Visitor sessions, from IP-based location — includes browsers, not just customers">
        {countryMapPoints.length > 0 && <div className="mb-4"><GeoMap points={countryMapPoints} fallbackCenter={{ lat: 20, lng: 30 }} /></div>}
        <SimpleBarList
          items={(data?.traffic_by_country ?? []).map((c) => ({ label: c.country, value: c.sessions }))}
          colorClass="bg-[var(--chart-2)]"
        />
      </ChartCard>
    </div>
  );
}
