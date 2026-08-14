import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Fired once per completed search (not per keystroke — see trackSearch in
// analytics-tracker.ts) to power get_trending_searches. Mirrors
// api.analytics-track.ts: writes go through the service-role client from
// here, never directly from the browser with the anon key — search_logs
// has no anon/authenticated grants at all, same as analytics_events.
export const Route = createFileRoute("/api/search-log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("search_log", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("search_log", identifiers);

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
        if (query.length < 2) return new Response("OK", { status: 200 });

        const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null;
        const resultCount =
          typeof body.result_count === "number" && Number.isFinite(body.result_count)
            ? Math.max(0, Math.min(10_000, Math.trunc(body.result_count)))
            : 0;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("search_logs").insert({
            query,
            normalized_query: query.toLowerCase(),
            result_count: resultCount,
            session_id: sessionId,
          });
          if (error) throw error;
        } catch (err) {
          // Never let a tracking hiccup look like a broken page to the visitor.
          console.error("[search-log] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
