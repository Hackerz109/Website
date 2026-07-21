import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Store,
  Truck,
  CreditCard,
  Ticket,
  Wallet as WalletIcon,
  StickyNote,
  ExternalLink,
  RotateCcw,
  User as UserIcon,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderTimeline } from "@/components/OrderTimeline";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { returnStatusLabel, returnStatusBadgeClass, type ReturnRequestWithDetails } from "@/lib/returns";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const Route = createFileRoute("/admin/orders/$id")({ component: AdminOrderDetailPage });

function AdminOrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-order-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).single();
      if (error) throw error;
      return data as Order & { order_items: OrderItem[] };
    },
  });

  const { data: history } = useQuery({
    queryKey: ["admin-order-history", id],
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

  const { data: returns } = useQuery({
    queryKey: ["admin-order-returns", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*, return_items(*), return_images(*)")
        .eq("order_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReturnRequestWithDetails[];
    },
  });

  async function setStatus(status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order status updated");
    qc.invalidateQueries({ queryKey: ["admin-order-detail", id] });
    qc.invalidateQueries({ queryKey: ["admin-order-history", id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  async function markPayment(payment_status: PaymentStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status, paid_at: payment_status === "paid" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(payment_status === "paid" ? "Marked as paid" : "Payment status updated");
    qc.invalidateQueries({ queryKey: ["admin-order-detail", id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  async function saveNotes() {
    if (notesDraft === null) return;
    setSavingNotes(true);
    const { error } = await supabase.from("orders").update({ admin_notes: notesDraft }).eq("id", id);
    setSavingNotes(false);
    if (error) return toast.error(error.message);
    toast.success("Note saved");
    qc.invalidateQueries({ queryKey: ["admin-order-detail", id] });
  }

  if (isLoading) return <div className="p-12 text-center text-sm text-muted-foreground">Loading order…</div>;
  if (isError || !order) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-medium text-red-600">Couldn't load this order.</p>
        <Link to="/admin/orders" className="mt-3 inline-block text-sm text-primary underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const items = order.order_items ?? [];

  return (
    <div>
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={order.status} onValueChange={(v) => setStatus(v as OrderStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {order.payment_status !== "paid" && (
            <Button size="sm" onClick={() => markPayment("paid")}>
              Mark paid
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div className="space-y-5 md:col-span-2">
          <Section title="Customer" icon={UserIcon}>
            <p className="text-sm font-medium">{order.customer_name ?? "—"}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {order.customer_email}
            </p>
            {addr.phone && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {addr.phone}
              </p>
            )}
            {order.user_id ? (
              <Link
                to="/admin/users/$id"
                params={{ id: order.user_id }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View full customer profile <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Guest checkout — no account</p>
            )}
          </Section>

          <Section
            title={order.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"}
            icon={order.fulfillment_type === "pickup" ? Store : Truck}
          >
            {order.fulfillment_type === "pickup" ? (
              <p className="text-sm text-muted-foreground">
                {order.pickup_instructions_snapshot || "No pickup instructions on file."}
              </p>
            ) : (
              <div className="text-sm text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <div>
                    {addr.line1 && <p className="text-foreground">{addr.line1}</p>}
                    {addr.line2 && <p>{addr.line2}</p>}
                    <p>
                      {[addr.city, addr.state].filter(Boolean).join(", ")}
                      {addr.pincode ? ` – ${addr.pincode}` : ""}
                    </p>
                    {!addr.line1 && addr.address && <p>{addr.address}</p>}
                  </div>
                </div>
                {order.delivery_distance_km != null && (
                  <p className="mt-1.5 text-xs">{order.delivery_distance_km} km from store</p>
                )}
              </div>
            )}
          </Section>

          <Section title="Items">
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                  <div>
                    <p>
                      {it.product_name}
                      {it.variant_name && ` (${it.variant_name})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {it.sku && `SKU ${it.sku} · `}Qty {it.quantity} × {formatMoney(it.unit_price_cents, order.currency)}
                    </p>
                  </div>
                  <p className="font-medium">{formatMoney(it.unit_price_cents * it.quantity, order.currency)}</p>
                </div>
              ))}
            </div>
          </Section>

          {order.notes && (
            <Section title="Customer note" icon={StickyNote}>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </Section>
          )}

          <Section title="Admin notes" icon={StickyNote}>
            <Textarea
              value={notesDraft ?? order.admin_notes ?? ""}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Internal notes about this order — not visible to the customer."
              rows={3}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={notesDraft === null || savingNotes}
              onClick={saveNotes}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" /> {savingNotes ? "Saving…" : "Save note"}
            </Button>
          </Section>

          {returns && returns.length > 0 && (
            <Section title="Related returns" icon={RotateCcw}>
              <div className="space-y-2">
                {returns.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                    <span>
                      Return #{r.id.slice(0, 8)} — {r.reason}
                    </span>
                    <Badge className={returnStatusBadgeClass(r.status)}>{returnStatusLabel(r.status)}</Badge>
                  </div>
                ))}
              </div>
              <Link to="/admin/returns" className="mt-2 inline-block text-xs text-primary hover:underline">
                Manage in Returns & Refunds →
              </Link>
            </Section>
          )}
        </div>

        <div className="space-y-5">
          <Section title="Payment & totals" icon={CreditCard}>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(order.subtotal_cents, order.currency)}</span>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-green-700">
                  <span className="flex items-center gap-1">
                    <Ticket className="h-3 w-3" /> Discount {order.coupon_code && `(${order.coupon_code})`}
                  </span>
                  <span>-{formatMoney(order.discount_cents, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {order.fulfillment_type === "pickup" ? "Pickup charge" : "Delivery fee"}
                </span>
                <span>{formatMoney(order.shipping_cents, order.currency)}</span>
              </div>
              {order.wallet_used_cents > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span className="flex items-center gap-1">
                    <WalletIcon className="h-3 w-3" /> Wallet used
                  </span>
                  <span>-{formatMoney(order.wallet_used_cents, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.total_cents, order.currency)}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Payment status</span>
                <Badge
                  variant={order.payment_status === "paid" ? "default" : "outline"}
                  className={order.payment_status === "paid" ? "bg-green-600 hover:bg-green-600" : ""}
                >
                  {order.payment_status}
                </Badge>
              </div>
              {order.paid_at && <p>Paid {new Date(order.paid_at).toLocaleString()}</p>}
              {order.razorpay_payment_id && <p className="truncate">Razorpay: {order.razorpay_payment_id}</p>}
            </div>
          </Section>

          <Section title="Status timeline">
            <OrderTimeline
              fulfillmentType={order.fulfillment_type}
              currentStatus={order.status}
              history={history ?? []}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof CreditCard; children: ReactNode }) {
  return (
    <div className="rounded-xl border p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4" />} {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
