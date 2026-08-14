import { supabase } from "@/integrations/supabase/client";

/** Phone verification sends its OTP over WhatsApp using the business's
 * WhatsApp Business number (see whatsapp.server.ts), which needs to be
 * verified with Meta before OTPs can actually be delivered. Until that's
 * done, every send/verify call here just fails for the customer. Flip this
 * back to `true` once the WhatsApp Business number is verified — everything
 * else (the dialog, the DB columns, the API routes) is left in place. */
export const PHONE_VERIFICATION_ENABLED = false;

export interface OtpResult {
  ok: boolean;
  message?: string;
}

async function authedFetch(path: string, body: unknown): Promise<OtpResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, message: "Please sign in again." };

  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: json?.error ?? "Something went wrong." };
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error — please try again." };
  }
}

export function sendPhoneOtp(phone: string): Promise<OtpResult> {
  return authedFetch("/api/send-phone-otp", { phone });
}

export function verifyPhoneOtp(code: string): Promise<OtpResult> {
  return authedFetch("/api/verify-phone-otp", { code });
}