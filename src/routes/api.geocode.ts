import { createFileRoute } from "@tanstack/react-router";
import { forwardGeocodeServer, lookupPincodeServer, reverseGeocodeServer } from "@/lib/geocode.server";

type GeocodeRequestBody =
  | { action: "reverse"; lat: number; lng: number }
  | { action: "pincode"; pincode: string }
  | { action: "forward"; line1?: string; city?: string; state?: string; pincode?: string; near?: { lat: number; lng: number } };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// All three actions are best-effort lookups the client already treats as
// "couldn't autofill" on any falsy result — so this always resolves with
// 200 + { result: ... | null } rather than surfacing 4xx/5xx for lookup
// misses. Only a malformed request body itself is rejected.
export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: GeocodeRequestBody;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }

        if (body.action === "reverse") {
          if (!isFiniteNumber(body.lat) || !isFiniteNumber(body.lng)) return json({ error: "Bad request" }, 400);
          return json({ result: await reverseGeocodeServer(body.lat, body.lng) });
        }

        if (body.action === "pincode") {
          if (typeof body.pincode !== "string") return json({ error: "Bad request" }, 400);
          return json({ result: await lookupPincodeServer(body.pincode) });
        }

        if (body.action === "forward") {
          const near =
            body.near && isFiniteNumber(body.near.lat) && isFiniteNumber(body.near.lng)
              ? { lat: body.near.lat, lng: body.near.lng }
              : undefined;
          return json({
            result: await forwardGeocodeServer(
              { line1: body.line1, city: body.city, state: body.state, pincode: body.pincode },
              near,
            ),
          });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
