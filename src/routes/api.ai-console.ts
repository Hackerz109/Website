import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";
import { parseCommandWithGemini, type ConsoleTurn } from "@/lib/aiConsole.server";

// Admin-only: understands one free-text product-management command and
// returns a structured intent. Does not read or write products/variants —
// see aiConsole.server.ts for the security rationale.
export const Route = createFileRoute("/api/ai-console")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getAuthenticatedUser(request);
        if (!auth) return json({ error: "Unauthorized" }, 401);

        const { data: roleRow } = await auth.supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", auth.userId)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return json({ error: "Admin access required" }, 403);

        const ip = getClientIp(request);
        const identifiers = [
          { type: "user" as const, value: auth.userId },
          { type: "ip" as const, value: ip },
        ];
        const status = await checkRateLimit("ai_console", identifiers);
        if (status.locked) {
          return json({ error: "Too many AI commands in a short time — please wait a few minutes and try again." }, 429);
        }

        let body: { command?: string; history?: ConsoleTurn[] };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }

        const command = body.command?.trim();
        if (!command) return json({ error: "command is required" }, 400);
        if (command.length > 500) return json({ error: "That command is too long." }, 400);

        const history = Array.isArray(body.history)
          ? body.history
              .filter((t): t is ConsoleTurn => (t?.role === "admin" || t?.role === "assistant") && typeof t.text === "string")
              .slice(-6)
          : [];

        await recordAttempt("ai_console", identifiers);

        const result = await parseCommandWithGemini(command, history);
        if (!result.ok) return json({ error: result.error }, 502);

        return json({ intent: result.intent });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function getAuthenticatedUser(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[ai-console] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
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

  return { supabase, userId: data.claims.sub as string };
}
