import { createFileRoute } from "@tanstack/react-router";
import { isAdminRequest } from "@/lib/adminAuth.server";

// Full, unconditional wipe of analytics_events / error_logs /
// analytics_performance_metrics / search_logs / analytics_sessions — see
// analytics_wipe_all_data() for the TRUNCATE + FK reasoning. Deliberately
// admin-only (isAdminRequest, not isCronOrAdminRequest like
// api.analytics-cleanup.ts) — this must never be reachable by the
// CRON_SECRET path, only by a signed-in admin clicking the "Wipe all data
// now" button and confirming the dialog.
export const Route = createFileRoute("/api/analytics-wipe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAdminRequest(request))) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("analytics_wipe_all_data");
          if (error) throw error;

          console.log("[analytics-wipe] full wipe summary", JSON.stringify(data));

          return new Response(JSON.stringify({ ok: true, summary: data }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          console.error("[analytics-wipe] handler error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
