import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, BadgePercent, Mail, MapPin, PackageSearch, Phone, Receipt, Store, StickyNote, Truck, ImagePlus, X } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/stores/cart";
import { payForOrder } from "@/lib/razorpay";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";
import {
  createReturnRequest,
  fetchMyReturns,
  uploadReturnImages,
  returnStatusLabel,
  returnStatusBadgeClass,
  type RefundMethod,
} from "@/lib/returns";

export const Route = createFileRoute("/orders/$id")({ component: OrderDetailPage });

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  // "/orders/$id/track" nests under this route the same way this route nests under
  // "orders.tsx" — so anywhere deeper than this exact page, hand off to the child via Outlet.
  const isDetailView = location.pathname === `/orders/${id}`;

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

  const { data: returns } = useQuery({
    enabled: !!user && isDetailView,
    queryKey: ["order-returns", id, user?.id],
    queryFn: async () => {
      const all = await fetchMyReturns(user!.id);
      return all.filter((r) => r.order_id === id);
    },
  });

  async function retryPay() {
    if (!order) return;
    setPaying(true);
    const result = await payForOrder({ id: order.id, customer_name: order.customer_name, customer_email: order.customer_email });
    setPaying(false);
    if (result.status === "paid") {
      toast.success("Payment received — thank you!");
      qc.invalidateQueries({ queryKey: ["order-detail", id] });
    } else if (result.status === "error") {
      toast.error(result.message);
    }
  }

  if (!isDetailView) {
    return <Outlet />;
  }

  if (orderErrored) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="mx-auto max-w-lg p-12 text-center">
          <p className="text-sm font-medium text-red-600">Couldn't load this order.</p>
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
          {orderLoading ? "Loading order…" : "Order not found."}
        </div>
      </div>
    );
  }

  const alreadyReturnedQty: Record<string, number> = {};
  for (const r of returns ?? []) {
    if (r.status === "rejected") continue;
    for (const item of r.return_items) {
      alreadyReturnedQty[item.order_item_id] = (alreadyReturnedQty[item.order_item_id] ?? 0) + item.quantity;
    }
  }
  const orderItems = order.order_items ?? [];
  const canRequestReturn =
    (order.status === "delivered" || order.status === "return_rejected") &&
    orderItems.some((it) => (alreadyReturnedQty[it.id] ?? 0) < it.quantity);

  const addr = (order.shipping_address ?? {}) as Record<string, string>;

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <Badge className={ORDER_STATUS_BADGE_CLASS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>

        <Link
          to="/orders/$id/track"
          params={{ id: order.id }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/85 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
        >
          <PackageSearch className="h-4 w-4" />
          Track This Order
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Ordered by</p>
            <p className="mt-0.5 truncate text-sm font-medium">{order.customer_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mobile number</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              {addr.phone ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              {order.customer_email}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            {order.fulfillment_type === "pickup" ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            {order.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"}
          </h2>
          {order.fulfillment_type === "pickup" ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {order.pickup_instructions_snapshot && <p>{order.pickup_instructions_snapshot}</p>}
              {order.status === "ready_for_pickup" && (
                <p className="font-medium text-green-700">Your order is ready for pickup!</p>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex items-start gap-1.5 text-muted-foreground">
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
                <p className="text-muted-foreground">{order.delivery_distance_km} km from store</p>
              )}
              {order.delivery_instructions_snapshot && (
                <p className="text-muted-foreground">{order.delivery_instructions_snapshot}</p>
              )}
            </div>
          )}
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl border p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <StickyNote className="h-4 w-4" />
              Note you left at checkout
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border p-5">
          <h2 className="font-semibold">Items</h2>
          <div className="mt-3 space-y-2 text-sm">
            {orderItems.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>
                  {it.product_name}
                  {it.variant_name && <span className="text-muted-foreground"> ({it.variant_name})</span>} × {it.quantity}
                  {(alreadyReturnedQty[it.id] ?? 0) > 0 && (
                    <span className="ml-1.5 text-xs text-amber-600">
                      ({alreadyReturnedQty[it.id]} returned)
                    </span>
                  )}
                </span>
                <span>{formatMoney(it.unit_price_cents * it.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Full price breakdown, exactly as calculated at checkout */}
          <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(order.subtotal_cents)}</span>
            </div>

            {order.discount_cents > 0 && (
              <div className="flex justify-between text-primary">
                <span className="flex items-center gap-1.5">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Coupon discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                </span>
                <span>-{formatMoney(order.discount_cents)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {order.fulfillment_type === "pickup" ? "Pickup charge" : "Delivery charge"}
              </span>
              <span>{formatMoney(order.shipping_cents)}</span>
            </div>

            {order.wallet_used_cents > 0 && (
              <div className="flex justify-between text-primary">
                <span>Paid via wallet</span>
                <span>-{formatMoney(order.wallet_used_cents)}</span>
              </div>
            )}

            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>Total paid</span>
              <span>{formatMoney(order.total_cents)}</span>
            </div>
          </div>

          {order.payment_status === "paid" && (order.paid_at || order.razorpay_payment_id) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
              {order.paid_at && (
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Paid on {new Date(order.paid_at).toLocaleString()}
                </span>
              )}
              {order.razorpay_payment_id && (
                <span>Ref: {order.razorpay_payment_id.slice(-8)}</span>
              )}
            </div>
          )}

          {(order.payment_status === "pending" || order.payment_status === "failed") && order.total_cents > order.wallet_used_cents && (
            <Button className="mt-4 w-full" size="sm" disabled={paying} onClick={retryPay}>
              {paying ? "Opening payment…" : order.payment_status === "failed" ? "Try payment again" : "Pay now"}
            </Button>
          )}
        </div>

        {canRequestReturn && (
          <div className="mt-6 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Need to return something?</h2>
              <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Request return</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <ReturnRequestForm
                    order={{ ...order, order_items: orderItems }}
                    alreadyReturnedQty={alreadyReturnedQty}
                    userId={user!.id}
                    onDone={() => {
                      setReturnOpen(false);
                      qc.invalidateQueries({ queryKey: ["order-returns", id, user?.id] });
                      qc.invalidateQueries({ queryKey: ["order-detail", id] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {(returns ?? []).length > 0 && (
          <div className="mt-6 rounded-xl border p-5">
            <h2 className="font-semibold">Return history</h2>
            <div className="mt-3 space-y-3">
              {returns!.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Return #{r.id.slice(0, 8)}</span>
                    <Badge className={returnStatusBadgeClass(r.status)}>{returnStatusLabel(r.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(r.created_at).toLocaleDateString()}</p>
                  {r.admin_notes && <p className="mt-1 text-xs">Note from store: {r.admin_notes}</p>}
                  {r.status === "refunded" && (
                    <p className="mt-1 text-xs font-medium text-green-700">
                      Refunded {formatMoney(r.refund_amount_cents)} {r.refund_method === "wallet_credit" ? "to your wallet" : "to your original payment method"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <StoreFooter />
    </div>
  );
}

function ReturnRequestForm({
  order,
  alreadyReturnedQty,
  userId,
  onDone,
}: {
  order: { id: string; payment_status: string; razorpay_payment_id: string | null; order_items: { id: string; product_name: string; variant_name: string | null; quantity: number }[] };
  alreadyReturnedQty: Record<string, number>;
  userId: string;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("wallet_credit");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const originalPaymentAvailable = order.payment_status === "paid" && !!order.razorpay_payment_id;

  function toggleItem(itemId: string, maxQty: number, checked: boolean) {
    setSelected((s) => {
      const next = { ...s };
      if (checked) next[itemId] = Math.min(1, maxQty);
      else delete next[itemId];
      return next;
    });
  }

  async function submit() {
    const items = Object.entries(selected).map(([order_item_id, quantity]) => ({ order_item_id, quantity }));
    if (items.length === 0) return toast.error("Select at least one item to return");
    if (!reason.trim()) return toast.error("Please tell us the reason for the return");

    setSubmitting(true);
    const returnId = crypto.randomUUID();
    let imagePaths: string[] = [];
    try {
      if (files.length > 0) imagePaths = await uploadReturnImages(userId, returnId, files);
    } catch {
      setSubmitting(false);
      return toast.error("Couldn't upload one or more images — please try again");
    }

    const result = await createReturnRequest({
      orderId: order.id,
      items,
      reason,
      preferredRefundMethod: refundMethod,
      imagePaths,
      id: returnId,
    });
    setSubmitting(false);
    if (!result.success) return toast.error(result.message ?? "Couldn't submit return request");
    toast.success("Return request submitted");
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Request a return</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Items to return</Label>
          {order.order_items.map((it) => {
            const already = alreadyReturnedQty[it.id] ?? 0;
            const max = it.quantity - already;
            if (max <= 0) return null;
            const checked = it.id in selected;
            return (
              <div key={it.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <Checkbox checked={checked} onCheckedChange={(v) => toggleItem(it.id, max, !!v)} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate">{it.product_name}{it.variant_name && ` (${it.variant_name})`}</p>
                  <p className="text-xs text-muted-foreground">Ordered: {it.quantity}{already > 0 && ` · already returned: ${already}`}</p>
                </div>
                {checked && (
                  <Input
                    type="number"
                    min={1}
                    max={max}
                    value={selected[it.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [it.id]: Math.max(1, Math.min(max, Number(e.target.value) || 1)) }))}
                    className="h-8 w-16"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div>
          <Label htmlFor="return-reason">Reason for return</Label>
          <Textarea id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="What went wrong?" />
        </div>

        <div>
          <Label>Photos (optional)</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles((fs) => fs.filter((_, idx) => idx !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-secondary/40">
              <ImagePlus className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles((fs) => [...fs, ...Array.from(e.target.files ?? [])].slice(0, 6))}
              />
            </label>
          </div>
        </div>

        <div>
          <Label>Preferred refund method</Label>
          <RadioGroup value={refundMethod} onValueChange={(v) => setRefundMethod(v as RefundMethod)} className="mt-1">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="wallet_credit" id="rm-wallet" />
              <Label htmlFor="rm-wallet" className="font-normal">Store Wallet credit</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="original_payment" id="rm-original" disabled={!originalPaymentAvailable} />
              <Label htmlFor="rm-original" className={`font-normal ${!originalPaymentAvailable ? "text-muted-foreground" : ""}`}>
                Original payment method{!originalPaymentAvailable && " (unavailable for this order)"}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit return request"}
        </Button>
      </DialogFooter>
    </>
  );
}
