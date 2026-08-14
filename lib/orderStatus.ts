import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type FulfillmentType = Database["public"]["Enums"]["fulfillment_type"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  ready_for_pickup: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  return_rejected: "Return Rejected",
  refunded: "Refunded",
  paid: "Paid",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending: "bg-secondary text-secondary-foreground hover:bg-secondary",
  confirmed: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  packed: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  ready_for_pickup: "bg-violet-100 text-violet-700 hover:bg-violet-100",
  out_for_delivery: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  shipped: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  delivered: "bg-green-100 text-green-700 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
  return_requested: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  return_approved: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  return_rejected: "bg-red-100 text-red-700 hover:bg-red-100",
  refunded: "bg-secondary text-secondary-foreground hover:bg-secondary",
  paid: "bg-green-100 text-green-700 hover:bg-green-100",
};

/** Admin-selectable forward progression for a given fulfillment type — used
 * to populate the status dropdown in the right order, per method. */
export function nextStatusOptions(fulfillmentType: FulfillmentType): OrderStatus[] {
  const common: OrderStatus[] = ["pending", "confirmed", "packed"];
  const tail: OrderStatus[] =
    fulfillmentType === "pickup"
      ? ["ready_for_pickup", "delivered"]
      : ["out_for_delivery", "delivered"];
  return [...common, ...tail, "cancelled"];
}

/** The full set of statuses admins may set directly (includes the
 * return/refund states, which are normally system-driven but an admin may
 * need to correct manually). */
export const ALL_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "return_rejected",
  "refunded",
];

/** Ordered "happy path" steps for the customer-facing progress stepper.
 * Statuses outside this list (cancelled, return_*, refunded) are shown as
 * their own distinct banner instead of a step position. */
export function happyPathSteps(fulfillmentType: FulfillmentType): OrderStatus[] {
  return fulfillmentType === "pickup"
    ? ["pending", "confirmed", "packed", "ready_for_pickup", "delivered"]
    : ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];
}

export const SIDE_TRACK_STATUSES: OrderStatus[] = [
  "cancelled",
  "return_requested",
  "return_approved",
  "return_rejected",
  "refunded",
];
