import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";

export const Route = createFileRoute("/admin/")({ component: Overview });

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [products, orders, lowStock] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_cents, status"),
        supabase.from("products").select("id, name, stock").lte("stock", 3).eq("active", true),
      ]);
      const revenue = (orders.data ?? [])
        .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
        .reduce((s, o) => s + o.total_cents, 0);
      return {
        productCount: products.count ?? 0,
        orderCount: orders.data?.length ?? 0,
        revenue,
        lowStock: lowStock.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Products", value: data?.productCount ?? "—", icon: Package },
    { label: "Orders", value: data?.orderCount ?? "—", icon: ShoppingCart },
    { label: "Revenue", value: data ? formatMoney(data.revenue) : "—", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      {data && data.lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Low stock
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-muted-foreground">{p.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}