import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { Database } from "@/integrations/supabase/types";
import { logServerError } from "@/lib/errorLog.server";

export const Route = createFileRoute("/api/verify-razorpay-payment")({
  server: {
    handlers: {
      // Called right after Razorpay Checkout succeeds in the browser, for an
      // instant "paid" confirmation. The webhook (api.razorpay-webhook.ts)
      // is the authoritative backstop in case this call never happens
      // (tab closed, network drop, etc).
      POST: async ({ request }) => {
        const auth = await getAuthenticatedUser(request);
        if (!auth) return json({ error: "Unauthorized" }, 401);

        let body: {
          orderId?: string;
          razorpayOrderId?: string;
          razorpayPaymentId?: string;
          razorpaySignature?: string;
        };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
        if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
          return json({ error: "Missing fields" }, 400);
        }

        const { data: order, error: fetchErr } = await auth.supabase
          .from("orders")
          .select("id, user_id, razorpay_order_id, payment_status")
          .eq("id", orderId)
          .maybeSingle();
        if (fetchErr || !order) return json({ error: "Order not found" }, 404);
        if (order.user_id !== auth.userId) return json({ error: "Forbidden" }, 403);
        if (order.razorpay_order_id !== razorpayOrderId) return json({ error: "Order mismatch" }, 400);

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
          console.error("[verify-razorpay-payment] missing RAZORPAY_KEY_SECRET");
          await logServerError({
            errorType: "api",
            severity: "critical",
            message: "Payment verification called but RAZORPAY_KEY_SECRET is not configured — every verification is failing",
            path: "/api/verify-razorpay-payment",
          });
          return json({ error: "Payments are not configured yet" }, 500);
        }

        // Razorpay's documented checkout signature formula.
        const expected = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest("hex");
        const expectedBuf = Buffer.from(expected);
        const gotBuf = Buffer.from(razorpaySignature);
        const validSignature = expectedBuf.length === gotBuf.length && crypto.timingSafeEqual(expectedBuf, gotBuf);
        if (!validSignature) {
          console.warn("[verify-razorpay-payment] signature mismatch for order", orderId);
          // Never log the signature values themselves — just that a
          // mismatch happened and for which order, which is enough to spot
          // either a Razorpay-side issue or a tampered request.
          await logServerError({
            errorType: "api",
            severity: "warning",
            message: `Payment signature mismatch for order ${orderId}`,
            path: "/api/verify-razorpay-payment",
            statusCode: 400,
          });
          return json({ error: "Invalid signature" }, 400);
        }

        if (order.payment_status !== "paid") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: updateErr } = await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "paid",
              razorpay_payment_id: razorpayPaymentId,
              paid_at: new Date().toISOString(),
            })
            .eq("id", order.id);
          if (updateErr) {
            console.error("[verify-razorpay-payment] failed to mark order paid", updateErr);
            // The gateway confirmed the charge but our own DB update
            // failed — money moved and the order doesn't reflect it yet.
            // The webhook is a backstop for this, but it's worth paging on.
            await logServerError({
              errorType: "database",
              severity: "critical",
              message: `Verified payment but failed to mark order ${order.id} as paid`,
              error: updateErr,
              path: "/api/verify-razorpay-payment",
            });
            return json({ error: "Could not confirm payment" }, 500);
          }
        }

        // Safe to call even if the webhook already won this race — the
        // atomic claim inside notifyPaymentPaid caps this at one send per
        // order no matter which path (or how many) calls it.
        try {
          const { notifyPaymentPaid } = await import("@/lib/paymentNotify.server");
          await notifyPaymentPaid(order.id);
        } catch (err) {
          console.error("[verify-razorpay-payment] notify error", err);
          await logServerError({
            errorType: "job",
            severity: "warning",
            message: `Payment-confirmation notification failed for order ${order.id}`,
            error: err,
            path: "/api/verify-razorpay-payment",
          });
        }

        return json({ ok: true });
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
    console.error("[verify-razorpay-payment] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
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
