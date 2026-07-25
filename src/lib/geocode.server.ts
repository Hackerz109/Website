/**
 * Address lookups (reverse geocode / forward geocode / pincode lookup) go
 * through LocationIQ instead of raw OpenStreetMap Nominatim.
 *
 * Why the switch: free, unauthenticated Nominatim (nominatim.openstreetmap.org)
 * is meant for light, occasional use and is well known to silently rate-limit
 * or block traffic from shared/cloud hosting IP ranges — exactly what a
 * server-rendered app's outbound requests look like to it, regardless of
 * User-Agent. That's almost certainly why address lookup kept failing even
 * after moving the calls server-side.
 *
 * LocationIQ is built on the same OpenStreetMap data (so results/coverage
 * are effectively the same for India) and returns the same response shape
 * as Nominatim, but is meant for exactly this kind of production use: it
 * has a real free tier (5,000 requests/day, no credit card) tied to an API
 * key instead of an IP, so it doesn't have the shared-IP blocking problem.
 *
 * Setup required: sign up at https://locationiq.com (free), grab the
 * "Access Token" from the dashboard, and set it as LOCATIONIQ_API_KEY in
 * this deployment's environment variables. Without it, every lookup below
 * fails fast with a clear log line instead of a confusing silent no-op.
 *
 * The client-facing function names/shapes are unchanged, so cart.tsx /
 * profile.tsx / delivery.ts needed no changes.
 */

const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY;
const LOCATIONIQ_BASE = "https://us1.locationiq.com/v1";

export type LatLng = { lat: number; lng: number };

export interface ReverseGeocodeResult {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  display_name: string;
}

export interface PincodeLookupResult {
  city: string;
  state: string;
}

export interface ForwardGeocodeQuery {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ForwardGeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
  exact: boolean;
}

// ---- tiny best-effort cache -------------------------------------------
// Module-scope, so it survives for the life of one warm server
// instance/isolate (resets on cold start — that's fine, it's a politeness
// optimization, not a correctness requirement, and also cuts down on
// LocationIQ request volume against the daily free-tier cap). Mainly
// exists to stop a shopper re-typing/adjusting the same address from
// re-hitting the API for every debounce tick.
const CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { expires: number; value: unknown }>();

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
}

async function locationIqFetch(path: string, params: URLSearchParams): Promise<Response | null> {
  if (!LOCATIONIQ_KEY) {
    console.error("[geocode] LOCATIONIQ_API_KEY is not set — refusing all lookups. Sign up free at https://locationiq.com and set it in this deployment's env vars.");
    return null;
  }
  params.set("key", LOCATIONIQ_KEY);
  const url = `${LOCATIONIQ_BASE}${path}?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Don't log the URL here — it contains the API key.
      console.error(`[geocode] LocationIQ returned ${res.status} ${res.statusText} for ${path}`);
    }
    return res;
  } catch (err) {
    console.error(`[geocode] LocationIQ fetch threw for ${path}:`, err);
    return null;
  }
}

/** Reverse geocode via LocationIQ (Nominatim-compatible response shape). */
export async function reverseGeocodeServer(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet<ReverseGeocodeResult | null>(key);
  if (cached !== undefined) return cached;

  const res = await locationIqFetch(
    "/reverse",
    new URLSearchParams({ format: "json", lat: String(lat), lon: String(lng), addressdetails: "1", zoom: "18", "accept-language": "en" }),
  );
  if (!res || !res.ok) return null;

  try {
    const data = await res.json();
    const a = data?.address;
    if (!a) {
      cacheSet(key, null);
      return null;
    }

    const houseAndRoad = [a.house_number, a.road || a.pedestrian || a.footway || a.cycleway]
      .filter(Boolean)
      .join(" ");
    const locality: string | undefined =
      a.neighbourhood || a.suburb || a.quarter || a.residential || a.city_block || a.hamlet;
    const cityLike: string | undefined =
      a.town || a.village || a.municipality || a.city_district || a.city || a.county;

    const line1 = [houseAndRoad, locality && locality !== cityLike ? locality : null]
      .filter((p): p is string => !!p && p.trim().length > 0)
      .join(", ");

    const result: ReverseGeocodeResult = {
      line1,
      city: cityLike ?? "",
      state: a.state ?? "",
      pincode: a.postcode ?? "",
      display_name: data?.display_name ?? [line1, cityLike, a.state, a.postcode].filter(Boolean).join(", "),
    };
    cacheSet(key, result);
    return result;
  } catch (err) {
    console.error(`[geocode] failed to parse LocationIQ reverse response:`, err);
    return null;
  }
}

const STATE_ALIASES: Record<string, string> = {
  Orissa: "Odisha",
  Pondicherry: "Puducherry",
  Uttaranchal: "Uttarakhand",
};

interface StructuredGeocodeFields {
  street?: string;
  city?: string;
  state?: string;
  postalcode?: string;
}

async function locationIqSearchStructured(
  fields: StructuredGeocodeFields,
  near?: LatLng,
): Promise<{ lat: number; lng: number; display_name: string; city: string; state: string } | null> {
  const hasAnyField = Object.values(fields).some((v) => v && v.trim().length > 0);
  if (!hasAnyField) return null;

  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "1",
    "accept-language": "en",
    countrycodes: "in",
    country: "India",
  });
  if (fields.street?.trim()) params.set("street", fields.street.trim());
  if (fields.city?.trim()) params.set("city", fields.city.trim());
  if (fields.state?.trim()) params.set("state", fields.state.trim());
  if (fields.postalcode?.trim()) params.set("postalcode", fields.postalcode.trim());
  if (near) {
    const box = 0.5;
    params.set("viewbox", `${near.lng - box},${near.lat + box},${near.lng + box},${near.lat - box}`);
    params.set("bounded", "0");
  }

  const key = `fwd:${params.toString()}`;
  const cached = cacheGet<{ lat: number; lng: number; display_name: string; city: string; state: string } | null>(key);
  if (cached !== undefined) return cached;

  const res = await locationIqFetch("/search/structured", params);
  if (!res || !res.ok) return null;

  try {
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) {
      cacheSet(key, null);
      return null;
    }
    const a = first.address ?? {};
    const result = {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      display_name: first.display_name ?? "",
      city: a.city || a.town || a.village || a.county || "",
      state: a.state || "",
    };
    cacheSet(key, result);
    return result;
  } catch (err) {
    console.error(`[geocode] failed to parse LocationIQ search response:`, err);
    return null;
  }
}

/** Looks up city + state for a 6-digit Indian PIN code, via the same
 * LocationIQ structured search used for full-address lookups (postalcode
 * field only) — one provider for all address lookups instead of depending
 * on a second, independent free service. */
export async function lookupPincodeServer(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) return null;

  const key = `pin:${clean}`;
  const cached = cacheGet<PincodeLookupResult | null>(key);
  if (cached !== undefined) return cached;

  const hit = await locationIqSearchStructured({ postalcode: clean });
  if (!hit || (!hit.city && !hit.state)) {
    cacheSet(key, null);
    return null;
  }
  const result: PincodeLookupResult = { city: hit.city, state: STATE_ALIASES[hit.state] ?? hit.state };
  cacheSet(key, result);
  return result;
}

function lastWords(s: string, n: number): string {
  const tokens = s
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.slice(Math.max(0, tokens.length - n)).join(" ");
}

/** Ladder of progressively looser search attempts — unchanged from the
 * original Nominatim version; see delivery.ts's history for the full
 * reasoning on each tier. */
function buildFallbackQueries(line1: string, city: string, state: string, pincode: string): StructuredGeocodeFields[] {
  const attempts: StructuredGeocodeFields[] = [];
  const add = (fields: StructuredGeocodeFields) => {
    const cleaned: StructuredGeocodeFields = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v && v.trim().length > 0) cleaned[k as keyof StructuredGeocodeFields] = v.trim();
    }
    if (Object.keys(cleaned).length === 0) return;
    const key = JSON.stringify(cleaned);
    if (!attempts.some((a) => JSON.stringify(a) === key)) attempts.push(cleaned);
  };

  add({ street: line1, city, state, postalcode: pincode });
  add({ street: lastWords(line1, 3), city, state, postalcode: pincode });
  add({ street: lastWords(line1, 2), city, state, postalcode: pincode });
  add({ street: lastWords(line1, 1), city, state, postalcode: pincode });
  add({ postalcode: pincode, state });
  add({ city, state, postalcode: pincode });
  add({ city, state });
  add({ postalcode: pincode });
  add({ state });

  return attempts;
}

export async function forwardGeocodeServer(query: ForwardGeocodeQuery, near?: LatLng): Promise<ForwardGeocodeResult | null> {
  const line1 = (query.line1 ?? "").trim();
  const city = (query.city ?? "").trim();
  const state = (query.state ?? "").trim();
  const pincode = (query.pincode ?? "").trim();
  const attempts = buildFallbackQueries(line1, city, state, pincode);

  for (let i = 0; i < attempts.length; i++) {
    const hit = await locationIqSearchStructured(attempts[i], near);
    if (hit) {
      return {
        lat: hit.lat,
        lng: hit.lng,
        display_name: hit.display_name || [line1, city, state, pincode].filter(Boolean).join(", "),
        exact: i === 0,
      };
    }
  }
  return null;
}
