import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { StoreHeader } from "@/components/StoreHeader";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/stores/cart";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data } = useQuery({
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

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        {(data ?? []).length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground">
            No orders yet. <Link to="/" className="underline">Start shopping</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {data?.map((o) => (
              <div key={o.id} className="rounded-xl border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                    <p className="font-mono text-xs">#{o.id.slice(0, 8)}</p>
                  </div>
                  <Badge variant="secondary">{o.status}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {o.order_items?.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span>{it.product_name} × {it.quantity}</span>
                      <span>{formatMoney(it.unit_price_cents * it.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
                  <span>Total</span>
                  <span>{formatMoney(o.total_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}