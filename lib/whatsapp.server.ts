// Server-only. Never import this from a route file's top level — only
// via dynamic import() inside a server handler, same convention as
// client.server.ts, so the access token never enters the client bundle.

/** Sends a free-form WhatsApp text message. Only deliverable within 24h of
 * the customer last messaging the business number (Meta's "session"
 * window) — outside that window Meta silently drops it. For the OTP flow
 * use sendWhatsAppOtpTemplate instead, which works regardless of session
 * state as long as an Authentication template is approved. */
export async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    console.error("[whatsapp] missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return false;
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!res.ok) {
    console.error("[whatsapp] send failed", res.status, await res.text());
    return false;
  }
  return true;
}

/** Sends a one-time-passcode via a WhatsApp "Authentication" template
 * message. This requires:
 *   1. A template approved in Meta Business Manager under the
 *      "Authentication" category, with a single {{1}} body variable and
 *      (recommended) a copy-code quick-reply button.
 *   2. WHATSAPP_OTP_TEMPLATE_NAME set to that template's name (defaults
 *      to "otp_verification" if unset — change this to match whatever
 *      you actually named/approved).
 * Authentication templates work for any customer regardless of whether
 * they've messaged the business number before, unlike sendWhatsAppMessage.
 * Falls back to a plain-text message (best-effort, session-window only)
 * if no template name is configured, so OTP delivery still works during
 * local testing against a number that has an open session. */
export async function sendWhatsAppOtp(to: string, code: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    console.error("[whatsapp-otp] missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return false;
  }
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
  if (!templateName) {
    console.warn("[whatsapp-otp] WHATSAPP_OTP_TEMPLATE_NAME not set — falling back to a plain-text message, which only delivers within an open 24h session");
    return sendWhatsAppMessage(to, `Your verification code is ${code}. It expires in 10 minutes. Don't share this code with anyone.`);
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    console.error("[whatsapp-otp] template send failed", res.status, await res.text());
    return false;
  }
  return true;
}