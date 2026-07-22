import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { Database } from "@/integrations/supabase/types";

const RESEND_COOLDOWN_MS = 60_000;
const OTP_TTL_MS = 10 * 60_000;

export const Route = createFileRoute("/api/send-phone-otp")({
  server: {
    handlers: {
      // Called from the phone-verification dialog (checkout gate + profile
      // page). Generates a 6-digit code, stores only its hash, and sends
      // it over WhatsApp using the number already wired up for the admin
      // product-manager bot (see api.whatsapp-webhook.ts).
      POST: async ({ request }) => {
        const auth = await getAuthenticatedUser(request);
        if (!auth) return json({ error: "Unauthorized" }, 401);

        let body: { phone?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }

        const phone = normalizePhone(body.phone ?? "");
        if (!phone || phone.length < 8) {
          return json({ error: "Enter a valid phone number, with country code if you're outside India." }, 400);
        }

        const pepper = process.env.PHONE_OTP_SECRET;
        if (!pepper) {
          console.error("[send-phone-otp] missing PHONE_OTP_SECRET");
          return json({ error: "Phone verification isn't configured yet." }, 500);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: profile, error: profileErr } = await supabaseAdmin
          .from("profiles")
          .select("phone_otp_last_sent_at")
          .eq("id", auth.userId)
          .maybeSingle();
        if (profileErr) return json({ error: "Couldn't start verification right now." }, 500);

        if (profile?.phone_otp_last_sent_at) {
          const elapsed = Date.now() - new Date(profile.phone_otp_last_sent_at).getTime();
          if (elapsed < RESEND_COOLDOWN_MS) {
            const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
            return json({ error: `Please wait ${waitSec}s before requesting another code.` }, 429);
          }
        }

        const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
        const hash = hashOtp(code, pepper, auth.userId);

        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({
            phone,
            phone_otp_hash: hash,
            phone_otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
            phone_otp_attempts: 0,
            phone_otp_last_sent_at: new Date().toISOString(),
          })
          .eq("id", auth.userId);
        if (updateErr) return json({ error: "Couldn't start verification right now." }, 500);

        const { sendWhatsAppOtp } = await import("@/lib/whatsapp.server");
        const sent = await sendWhatsAppOtp(phone, code);
        if (!sent) return json({ error: "Couldn't send the code — check the number and try again." }, 502);

        return json({ ok: true });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return "";
  // Bare 10-digit numbers are assumed domestic (India) — same assumption
  // the checkout phone field already makes elsewhere in this codebase.
  if (!hasPlus && digits.length === 10) return `+91${digits}`;
  return hasPlus ? `+${digits}` : `+${digits}`;
}

function hashOtp(code: string, pepper: string, userId: string): string {
  return crypto.createHmac("sha256", pepper).update(`${userId}:${code}`).digest("hex");
}

async function getAuthenticatedUser(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[send-phone-otp] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  return { supabase, userId: data.claims.sub as string };
}