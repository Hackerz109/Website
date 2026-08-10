import { createFileRoute } from "@tanstack/react-router";
import { isCronOrAdminRequest } from "@/lib/adminAuth.server";

// Evaluates every enabled alert rule against current metrics and notifies
// (Telegram + admin push) for anything newly triggered. Two ways in:
//  - the "Check now" button on /admin/analytics/alerts, authenticated with
//    the signed-in admin's own bearer token
//  - the Vercel Cron job configured in vercel.json, authenticated with
//    CRON_SECRET
async function handle(request: Request): Promise<Response> {
  if (!(await isCronOrAdminRequest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("analytics_evaluate_alerts");
    if (error) throw error;

    const triggered = ((data as { newly_triggered?: unknown[] } | null)?.newly_triggered ?? []) as Array<{
      rule_id: string;
      name: string;
      severity: "critical" | "warning" | "info";
      message: string;
      notify_channels: string[];
    }>;

    if (triggered.length > 0) {
      const { sendAlertNotifications } = await import("@/lib/analytics-alerts.server");
      await sendAlertNotifications(triggered);
    }

    return new Response(JSON.stringify({ ok: true, triggered_count: triggered.length }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[analytics-alerts-check] handler error", err);
    return new Response("Internal error", { status: 500 });
  }
}

export const Route = createFileRoute("/api/analytics-alerts-check")({
  server: {
    handlers: {
      // GET: Vercel Cron always calls with GET, sending CRON_SECRET as a
      // Bearer token automatically once it's set as an env var.
      // POST: the "Check now" button on /admin/analytics/alerts.
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
