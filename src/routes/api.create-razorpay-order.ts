import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/create-razorpay-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getAuthenticatedUser(request);
        if (!auth) return json({ error: "Unauthorized" }, 401);

        let body: { orderId?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const orderId = body.orderId;
        if (!orderId) return json({ error: "orderId is required" }, 400);

        // Read the order through the user's own RLS-scoped client — this
        // naturally fails unless it's genuinely their order.
        const { data: order, error: fetchErr } = await auth.supabase
          .from("orders")
          .select("id, user_id, total_cents, wallet_used_cents, currency, payment_status")
          .eq("id", orderId)
          .maybeSingle();

        if (fetchErr || !order) return json({ error: "Order not found" }, 404);
        if (order.user_id !== auth.userId) return json({ error: "Forbidden" }, 403);
        if (order.payment_status === "paid") return json({ error: "Order is already paid" }, 400);

        // Wallet credit (if any was applied at checkout) reduces what's
        // actually charged via Razorpay — never double-charge the wallet
        // portion.
        const amountDue = order.total_cents - (order.wallet_used_cents ?? 0);
        if (amountDue <= 0) return json({ error: "Order is already fully paid" }, 400);

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
          console.error("[create-razorpay-order] missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET");
          return json({ error: "Payments are not configured yet" }, 500);
        }

        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountDue, // Razorpay expects the amount in paise — same unit we already store in.
            currency: order.currency || "INR",
            receipt: order.id,
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          console.error("[create-razorpay-order] Razorpay API error", rzpRes.status, errText);
          return json({ error: "Could not start payment" }, 502);
        }
        const rzpOrder = await rzpRes.json();

        // Dynamic import, per client.server.ts's convention, so the
        // service-role client never enters the client bundle.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({ razorpay_order_id: rzpOrder.id })
          .eq("id", order.id);
        if (updateErr) {
          console.error("[create-razorpay-order] failed to save razorpay_order_id", updateErr);
          return json({ error: "Could not start payment" }, 500);
        }

        return json({
          razorpayOrderId: rzpOrder.id,
          amount: amountDue,
          currency: order.currency || "INR",
          keyId,
        });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getAuthenticatedUser(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[create-razorpay-order] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
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
