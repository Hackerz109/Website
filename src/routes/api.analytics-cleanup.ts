import { createFileRoute } from "@tanstack/react-router";
import { isCronOrAdminRequest } from "@/lib/adminAuth.server";

// Purges analytics_events / error_logs / analytics_performance_metrics
// (60 days), search_logs (30 days), and analytics_sessions (90 days) — see
// analytics_purge_old_data() for the named constants and batching behavior.
// Two ways in, same pattern as api.analytics-alerts-check.ts:
//  - the "Run cleanup now" button on /admin/analytics/reports, authenticated
//    with the signed-in admin's own bearer token
//  - the Vercel Cron job configured in vercel.json, authenticated with
//    CRON_SECRET, once daily off-peak
async function handle(request: Request): Promise<Response> {
  if (!(await isCronOrAdminRequest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("analytics_purge_old_data");
    if (error) throw error;

    // One-line summary is enough for Vercel's cron logs — deliberately not
    // writing this to a new audit table, since that would just be one more
    // thing that grows forever, which is the exact problem this job exists
    // to fix.
    console.log("[analytics-cleanup] purge summary", JSON.stringify(data));

    return new Response(JSON.stringify({ ok: true, summary: data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[analytics-cleanup] handler error", err);
    return new Response("Internal error", { status: 500 });
  }
}

export const Route = createFileRoute("/api/analytics-cleanup")({
  server: {
    handlers: {
      // GET: Vercel Cron always calls with GET, sending CRON_SECRET as a
      // Bearer token automatically once it's set as an env var.
      // POST: the "Run cleanup now" button on /admin/analytics/reports.
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
