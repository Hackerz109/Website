import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";
import { parseUserAgent } from "@/lib/userAgent";
import { getGeoFromRequest } from "@/lib/geoHeaders.server";

// Called on every route change by <AnalyticsTracker /> (mounted in
// __root.tsx). Trusts nothing about geo/device from the client — those are
// always derived server-side from the request itself (Vercel's edge geo
// headers, the real User-Agent header) — the client only supplies the
// session id, the path it's on, and optional attribution params.
export const Route = createFileRoute("/api/analytics-track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("analytics_track", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("analytics_track", identifiers);

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

        const ua = parseUserAgent(request.headers.get("user-agent"));
        const geo = getGeoFromRequest(request);
        const str = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : null);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.rpc("analytics_ingest_event", {
            p_session_id: sessionId,
            p_payload: {
              path: str(body.path, 500),
              referrer: str(body.referrer, 500),
              event_type: str(body.event_type, 50) ?? "page_view",
              utm_source: str(body.utm_source, 200),
              utm_medium: str(body.utm_medium, 200),
              utm_campaign: str(body.utm_campaign, 200),
              device_id: str(body.device_id, 100),
              user_id: str(body.user_id, 100),
              device_type: ua.device_type,
              browser: ua.browser,
              os: ua.os,
              country: geo.country,
              region: geo.region,
              city: geo.city,
            },
          });
          if (error) throw error;
        } catch (err) {
          // Never let a tracking hiccup look like a broken page to the visitor.
          console.error("[analytics-track] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
