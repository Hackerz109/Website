import { createFileRoute } from "@tanstack/react-router";
import { formatMoney } from "@/stores/cart";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Called by the client immediately after an order (+ its order_items) is
// successfully inserted — from every checkout path (delivery/pickup,
// online/cash-on-pickup/wallet-covered), since they all go through the same
// insert in cart.tsx. Fires the store owner's Telegram alert + admin-app
// push notification.
//
// Deliberately trusts nothing from the request body except which order to
// notify about — the message itself is always built from what's actually in
// the database, never from client-supplied text, so there's no way to make
// this endpoint send arbitrary content. Combined with the notified_at claim
// below (at most one send per real order, ever) the worst a bad actor who
// discovers a real order id can do is trigger the alert a moment early —
// nothing they say is ever included in it.
export const Route = createFileRoute("/api/order-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("order_notify", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("order_notify", identifiers);

        let body: { order_id?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const orderId = body.order_id;
        if (!orderId || typeof orderId !== "string") {
          return new Response("Bad request", { status: 400 });
        }

        try {
          await notifyNewOrder(orderId);
        } catch (err) {
          // This must never make checkout look like it failed — log and
          // 200 regardless, same policy as the payment webhooks.
          console.error("[order-notify] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function notifyNewOrder(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Atomic claim: only the first call for a given order gets a row back.
  // Anything else (already notified, or no such order) is a silent no-op.
  const { data: order } = await supabaseAdmin
    .from("orders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("notified_at", null)
    .select(
      "id, customer_name, customer_email, total_cents, fulfillment_type, payment_method, payment_status, shipping_address, notes",
    )
    .maybeSingle();
  if (!order) return;

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_name, variant_name, quantity, unit_price_cents")
    .eq("order_id", orderId);
  const lineItems = items ?? [];

  const shortId = order.id.slice(0, 8);
  const itemLines = lineItems
    .map(
      (i) =>
        `• ${i.quantity}× ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ""} — ${formatMoney(i.unit_price_cents * i.quantity)}`,
    )
    .join("\n");

  const addr = order.shipping_address as { address?: string; pickup?: boolean } | null;
  const destination = order.fulfillment_type === "pickup" ? "Store pickup" : addr?.address || "Delivery";

  const paymentLine =
    order.payment_method === "cash_on_pickup"
      ? "Cash on pickup — unpaid"
      : order.payment_status === "paid"
        ? "Paid online"
        : "Awaiting payment";

  const title = `New order — ${formatMoney(order.total_cents)}`;

  const telegramText =
    `🛒 <b>${escapeHtml(title)}</b>\n` +
    `Order #${shortId}\n` +
    `${escapeHtml(order.customer_name ?? "Customer")} (${escapeHtml(order.customer_email)})\n\n` +
    `${escapeHtml(itemLines)}\n\n` +
    `📍 ${escapeHtml(destination)}\n` +
    `💳 ${paymentLine}` +
    (order.notes ? `\n📝 ${escapeHtml(order.notes)}` : "");

  const pushBody = `${order.customer_name ?? "A customer"} • ${lineItems.length} item${lineItems.length === 1 ? "" : "s"} • ${destination}`;

  const { sendTelegramMessage } = await import("@/lib/telegram.server");
  const { sendPushToAdmins } = await import("@/lib/push.server");

  await Promise.all([
    sendTelegramMessage(telegramText),
    sendPushToAdmins({ title, body: pushBody, url: `/admin/orders/${order.id}` }),
  ]);
}

// Telegram's HTML parse mode only needs these five escaped — anything else
// (the customer's name, notes, product names) is untrusted text.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
