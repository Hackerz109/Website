import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Public — guests are allowed to check a coupon code, same as before —
// but funneled through here so it can be rate-limited. validate_coupon()
// itself no longer grants EXECUTE to anon/authenticated (see the migration
// that revoked it): its own distinct messages ("doesn't apply to any items
// in your cart" vs "isn't valid" vs "isn't active yet") let a scripted
// caller distinguish a real code from a wrong guess without ever reading
// the coupons table, which defeated visibility='hidden' entirely once
// nothing but the public anon key stood between it and the internet.
export const Route = createFileRoute("/api/validate-coupon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getOptionalUserId(request);

        const ip = getClientIp(request);
        const identifiers = userId
          ? [{ type: "user" as const, value: userId }, { type: "ip" as const, value: ip }]
          : [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("validate_coupon", identifiers);
        if (status.locked) {
          return json({ valid: false, message: "Too many attempts — please wait a bit and try again." }, 429);
        }

        let body: { code?: string; items?: unknown };
        try {
          body = await request.json();
        } catch {
          return json({ valid: false, message: "Bad request" }, 400);
        }

        const code = typeof body.code === "string" ? body.code.trim().slice(0, 64) : "";
        if (!code) return json({ valid: false, message: "Enter a coupon code." }, 400);

        // Shape matches what validate_coupon() expects — capped so a huge
        // or bogus array can't be used to run up work inside the RPC.
        const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];

        await recordAttempt("validate_coupon", identifiers);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("validate_coupon", {
          p_code: code,
          p_user_id: userId,
          p_items: items,
        });
        if (error) {
          console.error("[validate-coupon] rpc failed", error);
          return json({ valid: false, message: "Couldn't check that coupon right now — please try again." }, 502);
        }

        return json(data);
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Guests are fine here — every check inside validate_coupon() already
// treats p_user_id as optional — this only extracts a userId when a real
// session IS present. Same getClaims() pattern as api.ai-console.ts /
// api.refund-razorpay-payment.ts, just non-fatal on failure instead of
// rejecting the request outright.
async function getOptionalUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[validate-coupon] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
    return null;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}
