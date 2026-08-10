// Vercel sets these headers at the edge on every incoming request (using
// its own IP geolocation, no API key or outbound call needed on our side).
// They're absent in local dev and on non-Vercel hosts — every caller here
// treats a missing value as "unknown" rather than failing.
// https://vercel.com/docs/edge-network/headers#x-vercel-ip-country

function safeDecode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getGeoFromRequest(request: Request): {
  country: string | null;
  region: string | null;
  city: string | null;
} {
  const h = request.headers;
  return {
    country: h.get("x-vercel-ip-country") || null,
    region: h.get("x-vercel-ip-country-region") || null,
    city: safeDecode(h.get("x-vercel-ip-city")),
  };
}
