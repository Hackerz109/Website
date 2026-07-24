import { createFileRoute } from "@tanstack/react-router";
import { verifyTurnstileToken } from "@/lib/turnstile.server";
import { getClientIp } from "@/lib/rateLimit.server";

export const Route = createFileRoute("/api/verify-captcha")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string };
        try {
          body = await request.json();
        } catch {
          return json({ success: false }, 400);
        }
        if (!body.token) return json({ success: false }, 400);

        const success = await verifyTurnstileToken(body.token, getClientIp(request));
        return json({ success });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
