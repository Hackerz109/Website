import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Called by the client right after create_return_request succeeds. Same
// trust model as api.order-notify.ts — the request only says which return
// request, notifyReturnRequested re-derives the message from the database.
export const Route = createFileRoute("/api/return-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("return_notify", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("return_notify", identifiers);

        let body: { return_id?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body.return_id || typeof body.return_id !== "string") {
          return new Response("Bad request", { status: 400 });
        }

        try {
          const { notifyReturnRequested } = await import("@/lib/returnNotify.server");
          await notifyReturnRequested(body.return_id);
        } catch (err) {
          console.error("[return-notify] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
