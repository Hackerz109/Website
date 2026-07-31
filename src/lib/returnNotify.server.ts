// Fires when a customer submits a return request — the store owner needs
// to review/approve it, so unlike the admin-initiated events this list
// deliberately skips (packed/shipped/mark-paid/etc), this one is genuinely
// someone else's action.
import { formatMoney } from "@/stores/cart";

export async function notifyReturnRequested(returnId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: ret } = await supabaseAdmin
    .from("return_requests")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", returnId)
    .is("notified_at", null)
    .select("id, order_id, reason, preferred_refund_method")
    .maybeSingle();
  if (!ret) return;

  const { data: items } = await supabaseAdmin
    .from("return_items")
    .select("quantity, unit_price_cents, order_items(product_name, variant_name)")
    .eq("return_request_id", ret.id);
  const lines = (items ?? []).map((i) => {
    const oi = i.order_items as { product_name?: string; variant_name?: string | null } | null;
    return `${i.quantity}× ${oi?.product_name ?? "item"}${oi?.variant_name ? ` (${oi.variant_name})` : ""}`;
  });
  const totalCents = (items ?? []).reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0);

  const orderShortId = ret.order_id.slice(0, 8);
  const refundVia = ret.preferred_refund_method === "wallet_credit" ? "wallet credit" : "original payment method";
  const title = `Return requested — ${formatMoney(totalCents)}`;
  const body = `Order #${orderShortId} • ${lines.length} item${lines.length === 1 ? "" : "s"} • wants ${refundVia}`;

  const telegramText =
    `↩️ <b>${escapeHtml(title)}</b>\n` +
    `Order #${orderShortId}\n\n` +
    `${escapeHtml(lines.join("\n"))}\n\n` +
    `📝 ${escapeHtml(ret.reason)}\n` +
    `💳 Prefers refund via ${refundVia}`;

  const { sendTelegramMessage } = await import("@/lib/telegram.server");
  const { sendPushToAdmins } = await import("@/lib/push.server");
  await Promise.all([
    sendTelegramMessage(telegramText),
    sendPushToAdmins({ title, body, url: `/admin/returns` }),
  ]);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
