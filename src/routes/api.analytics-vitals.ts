import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Called once per pageview by the performance tracker (see
// performance-tracker.ts), on visibilitychange->hidden once LCP/CLS have
// settled. Every numeric field is optional (a given browser may not
// support every PerformanceObserver entry type) and is clamped to a sane
// range here before it ever reaches the DB — analytics_ingest_performance()
// clamps again independently, so a malformed/hostile value can only ever
// distort this one row, never fail the insert or reach an unbounded range.
const MAX_BODY_BYTES = 5_000; // this payload is a handful of numbers + a path — should never be large
const MAX_MS = 300_000; // 5 minutes — generous upper bound for any timing metric
const MAX_CLS = 50; // real-world CLS is usually well under 10; this is a generous ceiling, not a target

function num(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(max, Math.round(v)));
}

export const Route = createFileRoute("/api/analytics-vitals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = request.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }

        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("analytics_vitals", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("analytics_vitals", identifiers);

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const sessionId = body.session_id;
        if (!sessionId || typeof sessionId !== "string") {
          return new Response("Bad request", { status: 400 });
        }

        const str = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : null);
        const cls = typeof body.cls === "number" && Number.isFinite(body.cls) ? Math.max(0, Math.min(MAX_CLS, body.cls)) : null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.rpc("analytics_ingest_performance", {
            p_session_id: sessionId,
            p_payload: {
              path: str(body.path, 500),
              lcp_ms: num(body.lcp_ms, MAX_MS),
              cls,
              fcp_ms: num(body.fcp_ms, MAX_MS),
              ttfb_ms: num(body.ttfb_ms, MAX_MS),
              load_ms: num(body.load_ms, MAX_MS),
              long_tasks_count: num(body.long_tasks_count, 100_000),
              long_tasks_total_ms: num(body.long_tasks_total_ms, MAX_MS),
            },
          });
          if (error) throw error;
        } catch (err) {
          // Same rule as every other beacon in this system: a tracking
          // hiccup must never look like a broken page to the visitor.
          console.error("[analytics-vitals] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
