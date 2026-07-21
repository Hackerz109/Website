import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, Truck, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

function fulfillmentBadge(type: Database["public"]["Enums"]["fulfillment_type"]) {
  return type === "pickup" ? (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Store className="h-3 w-3" /> Pickup</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Truck className="h-3 w-3" /> Delivery</span>
  );
}

function paymentBadge(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-600 hover:bg-green-600">Paid</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "refunded":
      return <Badge variant="secondary">Refunded</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

function AdminOrders() {
  const qc = useQueryClient();
  const location = useLocation();

  // This router nests "admin.orders.$id"-style files under "admin.orders.tsx" and
  // renders them through this Outlet. If we're not on the exact /admin/orders list,
  // hand off entirely to the matched child (e.g. the order detail page) instead of
  // also showing the list.
  const isListView = location.pathname === "/admin/orders";

  const { data } = useQuery({
    enabled: isListView,
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!isListView) {
    return <Outlet />;
  }

  async function setStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  async function markPayment(id: string, payment_status: PaymentStatus) {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status,
        paid_at: payment_status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(payment_status === "paid" ? "Marked as paid" : "Payment status updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(data ?? []).map((o) => (
          <div key={o.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  to="/admin/orders/$id"
                  params={{ id: o.id }}
                  className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline"
                >
                  #{o.id.slice(0, 8)} <ArrowUpRight className="h-3 w-3" />
                </Link>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm">{o.customer_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                <div className="mt-1">{fulfillmentBadge(o.fulfillment_type)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {paymentBadge(o.payment_status)}
                <span className="text-sm font-medium">{formatMoney(o.total_cents, o.currency)}</span>
              </div>
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {o.order_items?.map((it) => (
                <div key={it.id}>{it.product_name} × {it.quantity}</div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <Select value={o.status} onValueChange={(v) => setStatus(o.id, v as OrderStatus)}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {o.payment_status !== "paid" && (
                <Button size="sm" className="h-9" onClick={() => markPayment(o.id, "paid")}>
                  Mark paid
                </Button>
              )}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">No orders yet.</div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline"
                  >
                    #{o.id.slice(0, 8)} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{o.customer_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                </TableCell>
                <TableCell>{fulfillmentBadge(o.fulfillment_type)}</TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-xs">
                    {o.order_items?.map((it) => (
                      <div key={it.id}>{it.product_name} × {it.quantity}</div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatMoney(o.total_cents, o.currency)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {paymentBadge(o.payment_status)}
                    {o.payment_status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => markPayment(o.id, "paid")}>
                        Mark paid
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => setStatus(o.id, v as OrderStatus)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {o.fulfillment_type === "pickup" && o.status !== "ready_for_pickup" && o.status !== "delivered" && (
                    <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setStatus(o.id, "ready_for_pickup")}>
                      Mark ready for pickup
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <Badge variant="secondary">Tip</Badge> Payment status updates automatically via Razorpay. Use "Mark paid" for bank transfers, cash, or other payments made outside the site.
        </div>
      </div>
    </div>
  );
}
