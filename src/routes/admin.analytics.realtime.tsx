import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Users, ShoppingCart, Eye, AlertOctagon, UserPlus } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { ChartCard, SimpleBarList } from "@/components/analytics/Charts";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/stores/cart";
import { fetchRealtimeSnapshot } from "@/lib/admin-analytics";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/analytics/realtime")({ component: RealtimeAnalytics });

const FEED_ICON: Record<string, string> = {
  order: "🛒",
  registration: "👤",
  error: "⚠️",
  return: "↩️",
};

function RealtimeAnalytics() {
  const queryClient = useQueryClient();
  const queryKey = ["analytics-realtime"];

  const { data } = useQuery({
    queryKey,
    queryFn: fetchRealtimeSnapshot,
    refetchInterval: 10_000,
  });

  // Best-effort instant refresh on new orders/errors, on top of the 10s
  // poll above. If a table isn't in the realtime publication this simply
  // never fires — the poll still covers it either way.
  useEffect(() => {
    const channel = supabase
      .channel("analytics-realtime-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "error_logs" }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Live — refreshes automatically
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Online now" value={(data?.online_now ?? 0).toString()} />
        <StatCard icon={Radio} label="Active sessions (30m)" value={(data?.active_sessions_30m ?? 0).toString()} />
        <StatCard icon={UserPlus} label="Registrations today" value={(data?.new_registrations_today ?? 0).toString()} />
        <StatCard icon={ShoppingCart} label="Checkout activity (15m)" value={(data?.checkout_activity_15m ?? 0).toString()} />
        <StatCard icon={Eye} label="Page views (5m)" value={(data?.page_activity_5m ?? 0).toString()} />
        <StatCard icon={AlertOctagon} label="Errors (15m)" value={(data?.errors_15m ?? 0).toString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Current page activity" description="Page views in the last 5 minutes">
          <SimpleBarList items={(data?.current_pages ?? []).map((p) => ({ label: p.path, value: p.viewers }))} />
        </ChartCard>

        <ChartCard title="Activity feed">
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {(data?.activity_feed ?? []).map((item, i) => (
              <div key={i} className="flex items-start gap-2 border-b pb-2 text-xs last:border-0">
                <span>{FEED_ICON[item.kind] ?? "•"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.text}</p>
                  <p className="text-muted-foreground">{new Date(item.at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {(!data || data.activity_feed.length === 0) && <p className="text-xs text-muted-foreground">No recent activity.</p>}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Live transactions">
        <div className="space-y-2">
          {(data?.live_transactions ?? []).slice(0, 8).map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b pb-2 text-xs last:border-0">
              <span className="truncate">{t.customer_name ?? "Customer"}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.payment_status}</Badge>
                <span className="font-mono tabular-nums">{formatMoney(t.total_cents)}</span>
              </div>
            </div>
          ))}
          {(!data || data.live_transactions.length === 0) && <p className="text-xs text-muted-foreground">No orders yet.</p>}
        </div>
      </ChartCard>
    </div>
  );
}
