// Payment-status alerts — distinct from the "new order" alert in
// api.order-notify.ts. A new order fires the moment it's placed, whether or
// not it's paid yet; these fire when money actually clears (or a payment
// attempt fails), which can happen seconds or minutes later, via whichever
// of three independent paths gets there first (Razorpay webhook, the
// client-side verify call, or wallet credit covering the total). Every
// caller attempts the notification unconditionally — the atomic claim
// below is what actually enforces "once per order", not caller discipline.
import { formatMoney } from "@/stores/cart";

export async function notifyPaymentPaid(orderId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // The .eq("payment_status", "paid") guard is load-bearing, not
  // decorative: /api/payment-notify is a public, unauthenticated endpoint
  // that only says *which* order to check. Without this, anyone who knows
  // (or guesses) a real order id could make this claim succeed — and a
  // notification go out — for an order nobody actually paid for. This way
  // the claim can only succeed if the database already reflects "paid",
  // which every legitimate caller (webhook, verify-payment, wallet
  // redemption) has already ensured is true before it calls this.
  const { data: order } = await supabaseAdmin
    .from("orders")
    .update({ payment_paid_notified_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    .is("payment_paid_notified_at", null)
    .select("id, customer_name, total_cents, wallet_used_cents, razorpay_payment_id")
    .maybeSingle();
  if (!order) return; // not actually paid, already notified, or doesn't exist

  const shortId = order.id.slice(0, 8);
  const method = order.razorpay_payment_id ? "Razorpay" : order.wallet_used_cents > 0 ? "Wallet" : "Paid";
  const title = `Payment received — ${formatMoney(order.total_cents)}`;
  const body = `${order.customer_name ?? "A customer"} • Order #${shortId} • ${method}`;

  const { sendTelegramMessage } = await import("@/lib/telegram.server");
  const { sendPushToAdmins } = await import("@/lib/push.server");
  await Promise.all([
    sendTelegramMessage(`💰 <b>${escapeHtml(title)}</b>\nOrder #${shortId} • ${escapeHtml(method)}`),
    sendPushToAdmins({ title, body, url: `/admin/orders/${order.id}` }),
  ]);
}

export async function notifyPaymentFailed(orderId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Same guard as above. This one isn't reachable from a public endpoint
  // today (only api.razorpay-webhook.ts calls it, after verifying the
  // webhook signature) — added anyway so it stays safe if that ever
  // changes, same "enforce it where the data lives" approach the rest of
  // this project already uses for payments/pricing.
  const { data: order } = await supabaseAdmin
    .from("orders")
    .update({ payment_failed_notified_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("payment_status", "failed")
    .is("payment_failed_notified_at", null)
    .select("id, customer_name, total_cents")
    .maybeSingle();
  if (!order) return;

  const shortId = order.id.slice(0, 8);
  const title = `Payment failed — ${formatMoney(order.total_cents)}`;
  const body = `${order.customer_name ?? "A customer"} • Order #${shortId} • may need help completing payment`;

  const { sendTelegramMessage } = await import("@/lib/telegram.server");
  const { sendPushToAdmins } = await import("@/lib/push.server");
  await Promise.all([
    sendTelegramMessage(`⚠️ <b>${escapeHtml(title)}</b>\nOrder #${shortId} — the shopper's payment didn't go through.`),
    sendPushToAdmins({ title, body, url: `/admin/orders/${order.id}` }),
  ]);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
