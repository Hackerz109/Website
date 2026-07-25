import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, clearRateLimit, getClientIp, recordAttempt, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit.server";
import type { Database } from "@/integrations/supabase/types";

const SCOPES = Object.keys(RATE_LIMIT_CONFIGS);

// "success" clears the failed-attempt counters for an email/ip/device, so it
// must only ever be honored for a caller who just actually authenticated —
// otherwise anyone could POST outcome:"success" for any victim's email to
// wipe their lockout state and brute-force it indefinitely. This mirrors the
// getAuthenticatedUser() pattern used by the other /api/* routes.
async function verifyRecentLogin(request: Request, claimedEmail: string | undefined): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) return false;

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return false;

  // If the token carries an email claim, it must match the identifier being
  // cleared — a valid session for user A shouldn't clear user B's lockout.
  const rawEmail = (data.claims as Record<string, unknown>).email;
  const tokenEmail = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
  if (tokenEmail && claimedEmail && tokenEmail !== claimedEmail.trim().toLowerCase()) return false;

  return true;
}

// Shared by /auth (login + signup) and /forgot-password. See
// src/lib/rateLimit.server.ts for the actual thresholds and the
// email+ip+device reasoning.
export const Route = createFileRoute("/api/rate-limit")({
  server: {
    handlers: {
      // ?scope=login&email=foo@bar.com&device=...  -> current status, doesn't record anything
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const scope = url.searchParams.get("scope");
        if (!scope || !SCOPES.includes(scope)) return json({ error: "Unknown scope" }, 400);

        const status = await checkRateLimit(scope, [
          { type: "email", value: url.searchParams.get("email") },
          { type: "ip", value: getClientIp(request) },
          { type: "device", value: url.searchParams.get("device") },
        ]);
        return json(status);
      },

      // { scope, email?, device?, outcome: "attempt" | "success" }
      // "attempt" records one countable event (a failed login, a reset
      // request, a signup submission) against email+ip+device.
      // "success" clears email+ip+device state for that scope (login only).
      POST: async ({ request }) => {
        let body: { scope?: string; email?: string; device?: string; outcome?: "attempt" | "success" };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }

        const { scope, email, device, outcome } = body;
        if (!scope || !SCOPES.includes(scope) || !outcome) return json({ error: "Bad request" }, 400);

        const identifiers = [
          { type: "email" as const, value: email },
          { type: "ip" as const, value: getClientIp(request) },
          { type: "device" as const, value: device },
        ];

        if (outcome === "success") {
          // Only a request carrying proof of the login it's reporting can
          // clear state. If that proof is missing/invalid, just return the
          // current (unchanged) status instead of erroring — the sign-in
          // itself already happened either way.
          if (await verifyRecentLogin(request, email)) {
            await clearRateLimit(scope, identifiers);
          } else {
            console.warn("[rate-limit] ignored unverified 'success' outcome", { scope });
          }
          return json(await checkRateLimit(scope, identifiers));
        }

        return json(await recordAttempt(scope, identifiers));
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
