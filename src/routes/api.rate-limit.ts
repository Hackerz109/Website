import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, clearRateLimit, getClientIp, recordAttempt, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit.server";

const SCOPES = Object.keys(RATE_LIMIT_CONFIGS);

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
          await clearRateLimit(scope, identifiers);
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
