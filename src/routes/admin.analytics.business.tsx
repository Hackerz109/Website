import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Receipt, CheckCircle2, XCircle, RotateCcw, ShoppingBag, Wallet, Repeat } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartCard, TrendAreaChart, SimpleBarList, DonutBreakdown } from "@/components/analytics/Charts";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { formatMoney } from "@/stores/cart";
import { fetchBusinessStats } from "@/lib/admin-analytics";
import { searchToResolvedRange, type AnalyticsSearch } from "@/lib/analytics-dateRange";

export const Route = createFileRoute("/admin/analytics/business")({ component: BusinessAnalytics });

function BusinessAnalytics() {
  const search = useLocation().search as AnalyticsSearch;
  const { start, end, prevStart, prevEnd } = searchToResolvedRange(search);
  const compare = (search.compare ?? "on") === "on";

  const { data, isLoading } = useQuery({
    // See admin.analytics.index.tsx for why this is keyed on the raw search
    // params rather than the resolved (and constantly-recomputed) start/end.
    queryKey: ["analytics-business", search.preset ?? "30d", search.from ?? null, search.to ?? null],
    queryFn: () => fetchBusinessStats(start, end, prevStart, prevEnd),
    refetchInterval: 60_000,
  });

  const trend = (curr: number | undefined, prev: number | undefined, invert = false) =>
    compare && curr != null && prev != null ? { current: curr, previous: prev, invert } : undefined;

  const paymentMethodData = Object.entries(data?.payment_method_breakdown ?? {}).map(([name, value]) => ({
    name: name === "cash_on_pickup" ? "Cash on pickup" : "Online",
    value,
  }));

  const exportRows = data
    ? [
        { metric: "Gross revenue", value: formatMoney(data.gross_revenue_cents) },
        { metric: "Net revenue", value: formatMoney(data.net_revenue_cents) },
        { metric: "Discounts given", value: formatMoney(data.discount_given_cents) },
        { metric: "Successful transactions", value: data.transactions_successful },
        { metric: "Failed transactions", value: data.transactions_failed },
        { metric: "Refunds", value: `${data.refund_count} · ${formatMoney(data.refunds_cents)}` },
        { metric: "Average order value", value: formatMoney(data.avg_order_value_cents) },
        { metric: "Revenue per user", value: formatMoney(data.revenue_per_user_cents) },
        { metric: "Coupon redemptions", value: data.coupon_redemptions },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {data && <ExportMenu filename="business-analytics" rows={exportRows} rawData={data} pdfTitle="Business Analytics" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Gross revenue"
          value={formatMoney(data?.gross_revenue_cents ?? 0)}
          trend={trend(data?.gross_revenue_cents, data?.gross_revenue_cents_prev)}
          loading={isLoading}
        />
        <StatCard icon={IndianRupee} label="Net revenue" value={formatMoney(data?.net_revenue_cents ?? 0)} sub="After refunds" loading={isLoading} />
        <StatCard
          icon={CheckCircle2}
          label="Successful transactions"
          value={(data?.transactions_successful ?? 0).toLocaleString()}
          loading={isLoading}
        />
        <StatCard
          icon={XCircle}
          label="Failed transactions"
          value={(data?.transactions_failed ?? 0).toLocaleString()}
          trend={trend(data?.transactions_failed, data?.transactions_failed_prev, true)}
          loading={isLoading}
        />
        <StatCard
          icon={RotateCcw}
          label="Refunds"
          value={formatMoney(data?.refunds_cents ?? 0)}
          sub={`${data?.refund_count ?? 0} refund${data?.refund_count === 1 ? "" : "s"}`}
          trend={trend(data?.refunds_cents, data?.refunds_cents_prev, true)}
          loading={isLoading}
        />
        <StatCard icon={Receipt} label="Avg. order value" value={formatMoney(data?.avg_order_value_cents ?? 0)} loading={isLoading} />
        <StatCard icon={ShoppingBag} label="Revenue per user" value={formatMoney(data?.revenue_per_user_cents ?? 0)} loading={isLoading} />
        <StatCard icon={Repeat} label="Coupon redemptions" value={(data?.coupon_redemptions ?? 0).toLocaleString()} loading={isLoading} />
      </div>

      <ChartCard title="Revenue trend" description="Revenue and refunds by day">
        <TrendAreaChart
          data={data?.revenue_by_day ?? []}
          series={[
            { key: "revenue_cents", label: "Revenue", colorIndex: 0 },
            { key: "refunds_cents", label: "Refunds", colorIndex: 3 },
          ]}
          formatValue={(v) => formatMoney(v)}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Payment methods">
          <DonutBreakdown data={paymentMethodData} />
        </ChartCard>
        <ChartCard title="Top products by revenue">
          <SimpleBarList
            items={(data?.top_products ?? []).map((p) => ({ label: p.product_name, value: p.revenue_cents }))}
            formatValue={(v) => formatMoney(v)}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" /> Store wallet</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Liability</div>
              <div className="mt-1 font-mono text-sm font-semibold">{formatMoney(data?.wallet_liability_cents ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Credits issued</div>
              <div className="mt-1 font-mono text-sm font-semibold">{formatMoney(data?.wallet_credits_cents ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Debited</div>
              <div className="mt-1 font-mono text-sm font-semibold">{formatMoney(data?.wallet_debits_cents ?? 0)}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Subscriptions</h3>
          <p className="mt-2 text-xs text-muted-foreground">{data?.subscriptions.note}</p>
        </div>
      </div>
    </div>
  );
}
