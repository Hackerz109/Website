import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";

export const Route = createFileRoute("/api/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set — refusing all requests");
          return new Response("Server not configured", { status: 500 });
        }

        const signature = request.headers.get("x-razorpay-signature");
        if (!isValidSignature(rawBody, signature, webhookSecret)) {
          console.warn("[razorpay-webhook] rejected request with invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: RazorpayWebhookPayload;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        try {
          await handleEvent(payload);
        } catch (err) {
          // Log and 200 anyway — don't let a processing bug cause Razorpay to retry-storm us.
          console.error("[razorpay-webhook] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});

function isValidSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(header);
  if (expectedBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, headerBuf);
}

type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string;
        status: string;
        error_description?: string;
      };
    };
  };
};

async function handleEvent(payload: RazorpayWebhookPayload) {
  const payment = payload.payload?.payment?.entity;
  if (!payment) return; // some events (e.g. refund.*) don't carry a payment entity — ignored for now

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (payload.event === "payment.captured") {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();
    if (!order) {
      console.warn("[razorpay-webhook] payment.captured for unknown order", payment.order_id);
      return;
    }
    if (order.payment_status === "paid") return; // already handled (e.g. by the client-side verify call) — idempotent no-op

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        razorpay_payment_id: payment.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id);
  }

  if (payload.event === "payment.failed") {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();
    if (!order || order.payment_status === "paid") return;

    await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
  }
}
