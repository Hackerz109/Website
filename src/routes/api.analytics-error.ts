import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";
import { parseUserAgent } from "@/lib/userAgent";

// Called from the root error boundary, the window error/rejection listener,
// the resource-load-failure listener (broken img/script/link), and the
// fetch-monitoring wrapper (failed/slow same-origin requests) — see
// __root.tsx / AnalyticsTracker.tsx / network-monitor.ts. Same trust model
// as analytics-track: only the error text/stack/path/type come from the
// client, device/browser are derived server-side from the real UA header.
// error_type and status_code are attacker-reachable (this is a public,
// unauthenticated endpoint) so both are whitelisted/clamped here — on top
// of the DB CHECK constraint on error_type — rather than passed through.
const ALLOWED_ERROR_TYPES = new Set(["frontend", "resource", "api", "database", "job"]);
const MAX_BODY_BYTES = 20_000; // generous for this payload shape; blocks a giant-body abuse attempt cheaply

export const Route = createFileRoute("/api/analytics-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = request.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }

        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("analytics_error", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("analytics_error", identifiers);

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        if (typeof body.message !== "string" || !body.message) {
          return new Response("Bad request", { status: 400 });
        }

        const ua = parseUserAgent(request.headers.get("user-agent"));
        const str = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : null);
        const severity = body.severity === "critical" || body.severity === "warning" ? body.severity : "error";
        const errorType = typeof body.error_type === "string" && ALLOWED_ERROR_TYPES.has(body.error_type) ? body.error_type : "frontend";
        const statusCode =
          typeof body.status_code === "number" && Number.isFinite(body.status_code)
            ? Math.max(0, Math.min(599, Math.round(body.status_code)))
            : null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.rpc("analytics_log_client_error", {
            p_payload: {
              error_type: errorType,
              severity,
              message: body.message.slice(0, 2000),
              stack: str(body.stack, 4000),
              path: str(body.path, 500),
              status_code: statusCode,
              device_type: ua.device_type,
              browser: ua.browser,
              session_id: str(body.session_id, 100),
              user_id: str(body.user_id, 100),
            },
          });
          if (error) throw error;
        } catch (err) {
          console.error("[analytics-error] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
