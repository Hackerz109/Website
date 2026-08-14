// Sends a message to the store owner's private Telegram chat via the Bot
// API. Server-only — never import this from a route file's client-visible
// code path or a component; only from inside a `server.handlers` function,
// same convention as client.server.ts.
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[telegram] send failed", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    // Never let a Telegram outage break checkout or delay the response —
    // this is a best-effort side channel, not part of the order flow.
    console.error("[telegram] send error", err);
  }
}
