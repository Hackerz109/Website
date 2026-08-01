import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";

// Called by the client right after create_support_ticket / add_support_message
// succeeds. Same trust model as api.return-notify.ts — the request only
// says which message, notifyNewSupportMessage re-derives everything else
// from the database.
export const Route = createFileRoute("/api/support-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("support_notify", identifiers);
        if (status.locked) return new Response("Too many requests", { status: 429 });
        await recordAttempt("support_notify", identifiers);

        let body: { message_id?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body.message_id || typeof body.message_id !== "string") {
          return new Response("Bad request", { status: 400 });
        }

        try {
          const { notifyNewSupportMessage } = await import("@/lib/supportNotify.server");
          await notifyNewSupportMessage(body.message_id);
        } catch (err) {
          console.error("[support-notify] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
