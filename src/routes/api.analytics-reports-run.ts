import { createFileRoute } from "@tanstack/react-router";
import { isCronRequest, isAdminRequest } from "@/lib/adminAuth.server";

// Cron call (CRON_SECRET): runs every report whose next_run_at has passed.
// Admin call (own bearer token): runs exactly one report immediately,
// regardless of schedule — the "send test now" action on the Reports page.
async function handle(request: Request): Promise<Response> {
  const cron = isCronRequest(request);

  let body: { report_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // A cron GET call sends no body at all — fine, it just runs everything due.
  }

  if (!cron) {
    const admin = await isAdminRequest(request);
    if (!admin) return new Response("Unauthorized", { status: 401 });
    if (!body.report_id) return new Response("Bad request: report_id is required for a manual run", { status: 400 });
  }

  try {
    const { runDueReports } = await import("@/lib/analytics-reports.server");
    const result = await runDueReports(cron ? undefined : body.report_id);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[analytics-reports-run] handler error", err);
    return new Response("Internal error", { status: 500 });
  }
}

export const Route = createFileRoute("/api/analytics-reports-run")({
  server: {
    handlers: {
      // GET: the daily Vercel Cron trigger — runs every report that's due.
      // POST: "Send test now" on an individual report in the admin UI.
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
