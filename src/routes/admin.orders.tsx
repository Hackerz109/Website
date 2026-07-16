import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];
const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

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
  const { data } = useQuery({
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
                <p className="font-mono text-xs">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm">{o.customer_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{o.customer_email}</p>
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
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  <p className="font-mono text-xs">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{o.customer_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                </TableCell>
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
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
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
