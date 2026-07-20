import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, PackageSearch, Store, Truck } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/stores/cart";
import { payForOrder } from "@/lib/razorpay";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function paymentBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-600 hover:bg-green-600">Paid</Badge>;
    case "failed":
      return <Badge variant="destructive">Payment failed</Badge>;
    case "refunded":
      return <Badge variant="secondary">Refunded</Badge>;
    default:
      return <Badge variant="outline">Payment pending</Badge>;
  }
}

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function retryPay(order: { id: string; customer_name: string | null; customer_email: string }) {
    setPayingId(order.id);
    const result = await payForOrder({
      id: order.id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
    });
    setPayingId(null);
    if (result.status === "paid") {
      toast.success("Payment received — thank you!");
      qc.invalidateQueries({ queryKey: ["my-orders", user?.id] });
    } else if (result.status === "error") {
      toast.error(result.message);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track deliveries, review items, and manage returns.</p>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border bg-secondary/30" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground">
            <PackageSearch className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-3">No orders yet.</p>
            <Link to="/" className="mt-1 inline-block text-sm font-medium text-primary underline underline-offset-4">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {data?.map((o) => (
              <div
                key={o.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">Order #{o.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {paymentBadge(o.payment_status)}
                      <Badge className={ORDER_STATUS_BADGE_CLASS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {o.fulfillment_type === "pickup" ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                    {o.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"}
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    {o.order_items?.slice(0, 3).map((it) => (
                      <div key={it.id} className="flex justify-between text-muted-foreground">
                        <span className="truncate pr-4">{it.product_name} × {it.quantity}</span>
                        <span className="flex-shrink-0 text-foreground">{formatMoney(it.unit_price_cents * it.quantity)}</span>
                      </div>
                    ))}
                    {(o.order_items?.length ?? 0) > 3 && (
                      <p className="text-xs text-muted-foreground">+{o.order_items!.length - 3} more item(s)</p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-medium">
                    <span>Total</span>
                    <span>{formatMoney(o.total_cents)}</span>
                  </div>

                  {o.payment_status === "pending" || o.payment_status === "failed" ? (
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      variant="outline"
                      disabled={payingId === o.id}
                      onClick={() => retryPay({ id: o.id, customer_name: o.customer_name, customer_email: o.customer_email })}
                    >
                      {payingId === o.id ? "Opening payment…" : o.payment_status === "failed" ? "Try payment again" : "Pay now"}
                    </Button>
                  ) : null}
                </div>

                <Link
                  to="/orders/$id"
                  params={{ id: o.id }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/85 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
                >
                  <PackageSearch className="h-4 w-4" />
                  View Details &amp; Track Order
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <StoreFooter />
    </div>
  );
}
