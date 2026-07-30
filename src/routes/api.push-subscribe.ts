import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Lets a signed-in admin register (POST) or remove (DELETE) this device's
// Web Push subscription, so /api/order-notify knows where to send new-order
// alerts. Auth pattern copied from api.ai-console.ts.
export const Route = createFileRoute("/api/push-subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getAuthenticatedAdmin(request);
        if (!auth) return json({ error: "Admin access required" }, 403);

        let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const endpoint = body.endpoint;
        const p256dh = body.keys?.p256dh;
        const authKey = body.keys?.auth;
        if (!endpoint || !p256dh || !authKey) {
          return json({ error: "endpoint and keys.p256dh/keys.auth are required" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("push_subscriptions")
          .upsert({ user_id: auth.userId, endpoint, p256dh, auth: authKey }, { onConflict: "endpoint" });
        if (error) return json({ error: error.message }, 500);

        return json({ ok: true });
      },

      DELETE: async ({ request }) => {
        const auth = await getAuthenticatedAdmin(request);
        if (!auth) return json({ error: "Admin access required" }, 403);

        let body: { endpoint?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        if (!body.endpoint) return json({ error: "endpoint is required" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Scoped to this admin's own rows — RLS would enforce this anyway,
        // but supabaseAdmin bypasses RLS, so the .eq("user_id", ...) here is
        // the only thing actually stopping one admin from deleting
        // another's subscription by endpoint alone.
        const { error } = await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", body.endpoint)
          .eq("user_id", auth.userId);
        if (error) return json({ error: error.message }, 500);

        return json({ ok: true });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function getAuthenticatedAdmin(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[push-subscribe] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  const userId = data.claims.sub as string;

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleRow) return null;

  return { userId };
}
