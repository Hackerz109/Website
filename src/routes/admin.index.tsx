import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Users, ShoppingCart, IndianRupee, Wallet as WalletIcon, AlertTriangle, RotateCcw, TrendingUp, Package } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import { fetchDashboardStats } from "@/lib/admin-dashboard";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS, type OrderStatus } from "@/lib/orderStatus";

export const Route = createFileRoute("/admin/")({ component: Overview });

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
};

function Overview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: productCount } = useQuery({
    queryKey: ["admin-product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const chartData = (data?.revenue_by_day ?? []).map((d) => ({
    date: d.date,
    label: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    revenue: d.revenue_cents / 100,
  }));
  const hasRevenue = chartData.some((d) => d.revenue > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Store performance at a glance, updated in real time.</p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-700">
          Couldn't load dashboard stats. Refresh to try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Revenue (30 days)"
          value={data ? formatMoney(data.revenue_30d_cents) : "—"}
          sub={data ? `${formatMoney(data.revenue_total_cents)} all-time` : undefined}
          loading={isLoading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Orders (30 days)"
          value={data ? String(data.orders_last_30d) : "—"}
          sub={data ? `${data.total_orders} all-time` : undefined}
          loading={isLoading}
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={data ? String(data.total_customers) : "—"}
          sub={data ? `+${data.new_customers_30d} in 30 days` : undefined}
          loading={isLoading}
        />
        <StatCard
          icon={WalletIcon}
          label="Wallet liability"
          value={data ? formatMoney(data.wallet_liability_cents) : "—"}
          sub="Outstanding store-credit balance"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4" /> Revenue, last 30 days
            </div>
            <span className="text-xs text-muted-foreground">
              Avg order {data ? formatMoney(data.avg_order_value_cents) : "—"}
            </span>
          </div>
          {isLoading ? (
            <div className="mt-4 h-56 animate-pulse rounded-lg bg-secondary/50" />
          ) : !hasRevenue ? (
            <div className="mt-4 flex h-56 items-center justify-center text-sm text-muted-foreground">
              No paid orders in the last 30 days yet.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="mt-4 h-56 w-full">
              <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={Math.ceil(chartData.length / 6)}
                  fontSize={11}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value) * 100)} />} />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  stroke="var(--color-revenue)"
                  fill="var(--color-revenue)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div className="space-y-4">
          <Link
            to="/admin/returns"
            className="flex items-center justify-between rounded-xl border p-5 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <RotateCcw className="h-4 w-4" /> Pending returns
            </div>
            <span className={`text-2xl font-semibold ${data && data.pending_returns > 0 ? "text-amber-600" : ""}`}>
              {data ? data.pending_returns : "—"}
            </span>
          </Link>

          <div className="rounded-xl border p-5">
            <p className="text-sm font-medium">Orders by status</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data && Object.keys(data.orders_by_status).length > 0 ? (
                (Object.entries(data.orders_by_status) as [OrderStatus, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <Badge key={status} className={ORDER_STATUS_BADGE_CLASS[status]}>
                      {ORDER_STATUS_LABELS[status]} · {count}
                    </Badge>
                  ))
              ) : (
                <span className="text-sm text-muted-foreground">No orders yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-5">
          <p className="text-sm font-semibold">Top products (by units sold)</p>
          <div className="mt-3 space-y-2.5">
            {data && data.top_products.length > 0 ? (
              data.top_products.map((p, i) => (
                <div key={p.product_name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    {p.product_name}
                  </span>
                  <span className="flex-shrink-0 text-muted-foreground">
                    {p.units_sold} sold · {formatMoney(p.revenue_cents)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No paid orders yet.</p>
            )}
          </div>
        </div>

        <Link to="/admin/products" className="block rounded-xl border p-5 transition-colors hover:bg-secondary/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Low stock
            </div>
            {productCount != null && <span className="text-xs text-muted-foreground">{productCount} products total</span>}
          </div>
          <div className="mt-3 space-y-1.5">
            {data && data.low_stock.length > 0 ? (
              data.low_stock.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.stock} left</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Everything's well stocked.</p>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-secondary/60" />
      ) : (
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      )}
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}