// Sends transactional email via Brevo's HTTP API. Reuses the same Brevo
// account that already provides this project's custom SMTP (BREVO_SMTP_*
// env vars, used by Supabase Auth for signup/reset emails) — just needs
// its own API key, since Brevo's SMTP credentials and API key are
// separate auth mechanisms on their side. Server-only — never import this
// from a route file's client-visible code path or a component; only from
// inside a `server.handlers` function, same convention as telegram.server.ts.
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "Sanjay Electricals";
  if (!apiKey || !fromEmail) {
    console.warn("[email] BREVO_API_KEY / BREVO_FROM_EMAIL not set — skipping");
    return;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    // Never let an email-provider outage break the reply flow — this is a
    // best-effort side channel, not part of the messaging path itself.
    console.error("[email] send error", err);
  }
}
