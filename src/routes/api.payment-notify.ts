import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Called by the client right after wallet_redeem_for_order fully covers an
// order's balance (the only "became paid" path with no server route of its
// own to hook into — Razorpay's two paths call notifyPaymentPaid directly
// from api.razorpay-webhook.ts / api.verify-razorpay-payment.ts instead).
// Same trust model as api.order-notify.ts: the request only says which
// order, notifyPaymentPaid re-derives everything else from the database and
// its own atomic claim caps this at one send per order no matter how many
// times it's called.
export const Route = createFileRoute("/api/payment-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("payment_notify", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("payment_notify", identifiers);

        let body: { order_id?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body.order_id || typeof body.order_id !== "string") {
          return new Response("Bad request", { status: 400 });
        }

        try {
          const { notifyPaymentPaid } = await import("@/lib/paymentNotify.server");
          await notifyPaymentPaid(body.order_id);
        } catch (err) {
          console.error("[payment-notify] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
