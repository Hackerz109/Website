import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Store, Truck } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Badge } from "@/components/ui/badge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";

export const Route = createFileRoute("/orders/$id/track")({ component: OrderTrackPage });

function OrderTrackPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: order, isLoading: orderLoading, isError: orderErrored, error: orderError } = useQuery({
    enabled: !!user,
    queryKey: ["order-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    retry: 1,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    enabled: !!user,
    queryKey: ["order-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (orderErrored) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="mx-auto max-w-lg p-12 text-center">
          <p className="text-sm font-medium text-red-600">Couldn't load tracking for this order.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(orderError as { message?: string })?.message ?? "Please check the link and try again."}
          </p>
          <Link to="/orders" className="mt-4 inline-block text-sm text-primary underline">Back to orders</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="p-12 text-center text-sm text-muted-foreground">
          {orderLoading ? "Loading tracking…" : "Order not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to="/orders/$id"
          params={{ id: order.id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to order details
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Track Order #{order.id.slice(0, 8)}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {order.fulfillment_type === "pickup" ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
              {order.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"}
            </p>
          </div>
          <Badge className={ORDER_STATUS_BADGE_CLASS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>

        <div className="mt-6 rounded-xl border p-5">
          {historyLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-secondary/60" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-secondary/60" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-secondary/60" />
            </div>
          ) : (
            <OrderTimeline
              fulfillmentType={order.fulfillment_type}
              currentStatus={order.status}
              history={(history ?? []).map((h) => ({ id: h.id, status: h.status, note: h.note, created_at: h.created_at }))}
            />
          )}
        </div>

        {order.fulfillment_type === "pickup"
          ? order.status === "ready_for_pickup" && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                Your order is ready for pickup at the store!
              </div>
            )
          : order.status === "out_for_delivery" && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
                Your order is out for delivery — it should arrive soon.
              </div>
            )}
      </div>
      <StoreFooter />
    </div>
  );
}
