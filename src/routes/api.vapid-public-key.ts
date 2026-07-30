import { createFileRoute } from "@tanstack/react-router";

// The VAPID public key is, by design, not secret — it's handed to the
// browser's Push API on every subscribe call. Serving it here (rather than
// baking it into the client bundle) means rotating it later is just an env
// var change, no rebuild required.
export const Route = createFileRoute("/api/vapid-public-key")({
  server: {
    handlers: {
      GET: async () => {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        if (!publicKey) {
          return new Response(JSON.stringify({ error: "Push notifications are not configured" }), {
            status: 501,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ publicKey }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
