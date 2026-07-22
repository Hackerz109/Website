import { supabase } from "@/integrations/supabase/client";

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