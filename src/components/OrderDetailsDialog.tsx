import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Wallet,
  Store,
  Truck,
  BadgePercent,
} from "lucide-react";
import { formatMoney } from "@/stores/cart";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export type OrderWithItems = OrderRow & { order_items: OrderItemRow[] | null };

function paymentStatusBadge(status: OrderRow["payment_status"]) {
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

function paymentMethodSummary(order: OrderRow) {
  const usedWallet = order.wallet_used_cents > 0;
  const usedRazorpay = !!order.razorpay_payment_id;
  if (usedWallet && usedRazorpay) return "Store Wallet + Razorpay (online)";
  if (usedWallet && order.wallet_used_cents >= order.total_cents) return "Store Wallet";
  if (usedRazorpay) return "Razorpay (online payment)";
  if (order.payment_status === "paid") return "Marked paid by store";
  if (order.payment_status === "failed") return "Payment attempt failed";
  return "Not yet paid";
}

interface OrderDetailsDialogProps {
  order: OrderWithItems;
  trigger?: ReactNode;
}

export function OrderDetailsDialog({ order, trigger }: OrderDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const items = order.order_items ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order #{order.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={ORDER_STATUS_BADGE_CLASS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            {paymentStatusBadge(order.payment_status)}
          </div>

          <div className="space-y-1">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
            <p className="font-mono text-xs text-muted-foreground">Order ID: {order.id}</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="font-medium">Customer</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              {order.customer_name || "—"}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              {order.customer_email}
            </p>
            {addr.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                {addr.phone}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="font-medium">Payment</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
              {paymentMethodSummary(order)}
            </p>
            {order.wallet_used_cents > 0 && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
                {formatMoney(order.wallet_used_cents, order.currency)} paid from wallet
              </p>
            )}
            {order.razorpay_payment_id && (
              <p className="font-mono text-xs text-muted-foreground">Payment ID: {order.razorpay_payment_id}</p>
            )}
            {order.paid_at && (
              <p className="text-xs text-muted-foreground">Paid on {new Date(order.paid_at).toLocaleString()}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="flex items-center gap-2 font-medium">
              {order.fulfillment_type === "pickup" ? (
                <Store className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <Truck className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              {order.fulfillment_type === "pickup" ? "Store Pickup" : "Delivery Address"}
            </p>
            {order.fulfillment_type === "pickup" ? (
              order.pickup_instructions_snapshot && (
                <p className="text-muted-foreground">{order.pickup_instructions_snapshot}</p>
              )
            ) : (
              <>
                {addr.address && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {addr.address}
                  </p>
                )}
                {order.delivery_distance_km != null && (
                  <p className="text-xs text-muted-foreground">{order.delivery_distance_km} km from store</p>
                )}
                {order.delivery_instructions_snapshot && (
                  <p className="text-muted-foreground">{order.delivery_instructions_snapshot}</p>
                )}
              </>
            )}
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="font-medium">Items</p>
            <div className="space-y-1">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between gap-3 text-muted-foreground">
                  <span className="min-w-0">
                    {it.product_name}
                    {it.variant_name && <span> ({it.variant_name})</span>} × {it.quantity}
                  </span>
                  <span className="flex-shrink-0 text-foreground">
                    {formatMoney(it.unit_price_cents * it.quantity, order.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal_cents, order.currency)}</span>
            </div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between text-primary">
                <span className="flex items-center gap-1.5">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                </span>
                <span>-{formatMoney(order.discount_cents, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>{order.fulfillment_type === "pickup" ? "Pickup charge" : "Delivery charge"}</span>
              <span>{formatMoney(order.shipping_cents, order.currency)}</span>
            </div>
            {order.wallet_used_cents > 0 && (
              <div className="flex justify-between text-primary">
                <span>Paid via wallet</span>
                <span>-{formatMoney(order.wallet_used_cents, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(order.total_cents, order.currency)}</span>
            </div>
          </div>

          {order.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="font-medium">Notes</p>
                <p className="text-muted-foreground">{order.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
