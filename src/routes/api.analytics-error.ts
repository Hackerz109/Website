import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";
import { parseUserAgent } from "@/lib/userAgent";

// Called from the root error boundary and a window-level error/rejection
// listener (see __root.tsx / AnalyticsTracker.tsx). Same trust model as
// analytics-track: only the error text/stack/path come from the client,
// device/browser are derived server-side from the real UA header.
export const Route = createFileRoute("/api/analytics-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.rpc("analytics_log_client_error", {
            p_payload: {
              error_type: "frontend",
              severity,
              message: body.message.slice(0, 2000),
              stack: str(body.stack, 4000),
              path: str(body.path, 500),
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
