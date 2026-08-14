// Fires whenever a new support message is added — alerts whichever side
// didn't just send it. A customer message alerts you via the same
// Telegram + admin-push channel as orders/returns (tap it to open the
// ticket directly in /admin/support). An admin reply sends the customer a
// short "you've got a reply" email with a preview — not the conversation
// itself, just a nudge to come back to /support and continue there.
export async function notifyNewSupportMessage(messageId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Atomic claim — same idempotency pattern as notifyReturnRequested. A
  // retried or duplicate call for the same message can never double-send.
  const { data: message } = await supabaseAdmin
    .from("support_messages")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("notified_at", null)
    .select("id, ticket_id, sender_role, body")
    .maybeSingle();
  if (!message) return;

  const { data: ticket } = await supabaseAdmin
    .from("support_tickets")
    .select("id, subject, customer_name, customer_email")
    .eq("id", message.ticket_id)
    .maybeSingle();
  if (!ticket) return;

  const preview = message.body.length > 300 ? `${message.body.slice(0, 300)}…` : message.body;

  if (message.sender_role === "customer") {
    const from = ticket.customer_name || ticket.customer_email || "A customer";
    const title = `New message from ${from}`;

    const telegramText =
      `💬 <b>${escapeHtml(title)}</b>\n` +
      `${escapeHtml(ticket.subject)}\n\n` +
      `${escapeHtml(preview)}`;

    const { sendTelegramMessage } = await import("@/lib/telegram.server");
    const { sendPushToAdmins } = await import("@/lib/push.server");
    await Promise.all([
      sendTelegramMessage(telegramText),
      sendPushToAdmins({ title, body: preview, url: `/admin/support/${ticket.id}` }),
    ]);
  } else {
    if (!ticket.customer_email) return;

    const { sendEmail } = await import("@/lib/email.server");
    await sendEmail({
      to: ticket.customer_email,
      subject: `Re: ${ticket.subject}`,
      html:
        `<p>Hi ${escapeHtml(ticket.customer_name || "there")},</p>` +
        `<p>You've got a new reply on your conversation "<strong>${escapeHtml(ticket.subject)}</strong>":</p>` +
        `<blockquote style="border-left:3px solid #ddd;margin:12px 0;padding:4px 12px;color:#333;">${escapeHtml(message.body).replace(/\n/g, "<br/>")}</blockquote>` +
        `<p>Reply any time from your account under "My conversations".</p>`,
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
