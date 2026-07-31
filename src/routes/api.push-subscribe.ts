import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Lets a signed-in admin register (POST) or remove (DELETE) this device's
// Web Push subscription, so /api/order-notify knows where to send new-order
// alerts. Auth pattern copied from api.ai-console.ts.
export const Route = createFileRoute("/api/push-subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const status = await checkRateLimit("push_subscribe", [{ type: "ip" as const, value: ip }]);
        if (status.locked) return json({ error: "Too many requests" }, 429);
        await recordAttempt("push_subscribe", [{ type: "ip" as const, value: ip }]);

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
        // Every new order later makes our server fetch() this exact URL
        // (via web-push in push.server.ts) — without this check, a
        // malicious/compromised admin session could register an internal
        // or attacker-controlled URL and have order details relayed to it
        // on every sale. Real push endpoints are always https on a public
        // host, so this costs nothing for legitimate use.
        if (!isSafePushEndpoint(endpoint)) {
          return json({ error: "Invalid push endpoint" }, 400);
        }
        if (p256dh.length > 200 || authKey.length > 100) {
          return json({ error: "Invalid subscription keys" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("push_subscriptions")
          .upsert({ user_id: auth.userId, endpoint, p256dh, auth: authKey }, { onConflict: "endpoint" });
        if (error) return json({ error: error.message }, 500);

        return json({ ok: true });
      },

      DELETE: async ({ request }) => {
        const ip = getClientIp(request);
        const status = await checkRateLimit("push_subscribe", [{ type: "ip" as const, value: ip }]);
        if (status.locked) return json({ error: "Too many requests" }, 429);
        await recordAttempt("push_subscribe", [{ type: "ip" as const, value: ip }]);

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

function isSafePushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;

  // Reject IP-literal hosts in loopback/private/link-local ranges (covers
  // the AWS/GCP/Azure metadata address too). Real push services are always
  // addressed by a public DNS name, never a raw IP, so this never affects
  // legitimate subscriptions.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return false;
    }
  }
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;

  return true;
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
