import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Admin-only: refunds a return request to the customer's original payment
// method via the Razorpay Refunds API, then records the outcome through
// admin_process_refund (called with the admin's own session so its
// internal has_role(auth.uid(), 'admin') check resolves correctly — a
// service-role call would have no auth.uid() and would be rejected).
export const Route = createFileRoute("/api/refund-razorpay-payment")({
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

        let body: { returnId?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const returnId = body.returnId;
        if (!returnId) return json({ error: "returnId is required" }, 400);

        const { data: ret, error: retErr } = await auth.supabase
          .from("return_requests")
          .select("id, order_id, status, refund_amount_cents")
          .eq("id", returnId)
          .maybeSingle();
        if (retErr || !ret) return json({ error: "Return request not found" }, 404);
        if (ret.status !== "approved" && ret.status !== "partially_approved") {
          return json({ error: "Only approved returns can be refunded" }, 400);
        }
        if (!ret.refund_amount_cents || ret.refund_amount_cents <= 0) {
          return json({ error: "Nothing to refund" }, 400);
        }

        const { data: order, error: orderErr } = await auth.supabase
          .from("orders")
          .select("id, razorpay_payment_id, payment_status")
          .eq("id", ret.order_id)
          .maybeSingle();
        if (orderErr || !order) return json({ error: "Order not found" }, 404);
        if (!order.razorpay_payment_id || order.payment_status !== "paid") {
          return json({ error: "This order wasn't paid via Razorpay — use wallet credit instead" }, 400);
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
          console.error("[refund-razorpay-payment] missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET");
          return json({ error: "Payments are not configured yet" }, 500);
        }

        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: ret.refund_amount_cents,
            speed: "normal",
            notes: { return_request_id: ret.id },
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          console.error("[refund-razorpay-payment] Razorpay API error", rzpRes.status, errText);
          return json({ error: "The payment gateway declined this refund" }, 502);
        }
        const rzpRefund = await rzpRes.json();

        const { data: result, error: rpcErr } = await auth.supabase.rpc("admin_process_refund", {
          p_return_id: ret.id,
          p_method: "original_payment",
          p_external_ref: rzpRefund.id,
        });
        if (rpcErr) {
          console.error("[refund-razorpay-payment] gateway refund succeeded but record-keeping failed", rpcErr);
          return json({ error: "Refund was issued but couldn't be recorded — contact support with refund id " + rzpRefund.id }, 500);
        }

        return json({ ok: true, refundId: rzpRefund.id, result });
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
    console.error("[refund-razorpay-payment] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
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
