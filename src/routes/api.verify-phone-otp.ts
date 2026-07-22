import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { Database } from "@/integrations/supabase/types";

const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/verify-phone-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getAuthenticatedUser(request);
        if (!auth) return json({ error: "Unauthorized" }, 401);

        let body: { code?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const code = (body.code ?? "").trim();
        if (!/^\d{6}$/.test(code)) return json({ error: "Enter the 6-digit code." }, 400);

        const pepper = process.env.PHONE_OTP_SECRET;
        if (!pepper) {
          console.error("[verify-phone-otp] missing PHONE_OTP_SECRET");
          return json({ error: "Phone verification isn't configured yet." }, 500);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: profile, error: fetchErr } = await supabaseAdmin
          .from("profiles")
          .select("phone_otp_hash, phone_otp_expires_at, phone_otp_attempts")
          .eq("id", auth.userId)
          .maybeSingle();
        if (fetchErr || !profile) return json({ error: "Couldn't verify right now." }, 500);

        if (!profile.phone_otp_hash || !profile.phone_otp_expires_at) {
          return json({ error: "No code is pending — request a new one." }, 400);
        }
        if (new Date(profile.phone_otp_expires_at).getTime() < Date.now()) {
          return json({ error: "That code expired — request a new one." }, 400);
        }
        if (profile.phone_otp_attempts >= MAX_ATTEMPTS) {
          return json({ error: "Too many incorrect attempts — request a new code." }, 429);
        }

        const expected = hashOtp(code, pepper, auth.userId);
        const expectedBuf = Buffer.from(expected);
        const gotBuf = Buffer.from(profile.phone_otp_hash);
        const matches = expectedBuf.length === gotBuf.length && crypto.timingSafeEqual(expectedBuf, gotBuf);

        if (!matches) {
          await supabaseAdmin
            .from("profiles")
            .update({ phone_otp_attempts: profile.phone_otp_attempts + 1 })
            .eq("id", auth.userId);
          const remaining = MAX_ATTEMPTS - (profile.phone_otp_attempts + 1);
          return json({ error: remaining > 0 ? `Incorrect code — ${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "Too many incorrect attempts — request a new code." }, 400);
        }

        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({
            phone_verified: true,
            phone_otp_hash: null,
            phone_otp_expires_at: null,
            phone_otp_attempts: 0,
          })
          .eq("id", auth.userId);
        if (updateErr) return json({ error: "Couldn't confirm verification right now." }, 500);

        return json({ ok: true });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function hashOtp(code: string, pepper: string, userId: string): string {
  return crypto.createHmac("sha256", pepper).update(`${userId}:${code}`).digest("hex");
}

async function getAuthenticatedUser(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[verify-phone-otp] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
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