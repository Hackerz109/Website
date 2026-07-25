/**
 * Address lookups (reverse geocode / forward geocode / pincode lookup) go
 * through raw OpenStreetMap Nominatim — no API key required.
 *
 * Known tradeoff: this project previously ran on Nominatim and moved to
 * LocationIQ because free/unauthenticated Nominatim (nominatim.openstreetmap.org)
 * is meant for light, occasional use and is known to silently rate-limit or
 * block traffic from shared/cloud hosting IP ranges — which is what
 * address lookups kept failing on before. Moving back removes LocationIQ's
 * daily cap, but reintroduces that risk. Two things below exist specifically
 * to reduce it, per Nominatim's usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/):
 *   1. A real `User-Agent` identifying this app (edit the constant below —
 *      Nominatim can and does block generic/missing ones).
 *   2. A hard global cap of ~1 request/second to Nominatim, enforced here.
 * That cap is enforced per warm server instance, not truly globally — on a
 * multi-instance/serverless deployment with concurrent traffic, actual
 * request volume can still exceed 1/sec. Forward lookups (`forwardGeocodeServer`)
 * are the biggest risk: on a full miss they retry through up to 9 looser
 * queries in the fallback ladder below, each queued behind the same 1/sec
 * limiter — so a single "worst case" address search can take ~9 seconds and
 * eat most of a second's worth of the app's entire request budget by itself.
 * If checkout traffic is more than light/occasional, consider self-hosting
 * Nominatim or keeping LocationIQ (or another key-based provider) as a
 * fallback when a Nominatim call fails or times out.
 *
 * The client-facing function names/shapes are unchanged, so cart.tsx /
 * profile.tsx / delivery.ts need no changes.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
// REQUIRED by Nominatim's usage policy: identify the app and give a real
// contact (site URL or email) so they can reach out before blocking instead
// of just blocking. Replace before deploying.
const NOMINATIM_USER_AGENT = "myshop/1.0 (+https://sanjayelectricals.shop; support@sanjayelectricals.shop)";

// ---- Nominatim usage-policy rate limit (max 1 request/second) --------
// A simple promise chain so concurrent calls queue up instead of firing at
// once; each call waits until at least MIN_INTERVAL_MS after the previous
// one actually went out.
const MIN_INTERVAL_MS = 1100; // a little over 1s for headroom
let lastRequestAt = 0;
let requestChain: Promise<void> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const turn = requestChain.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  requestChain = turn;
  return turn.then(fn);
}

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
// Nominatim request volume against the 1 req/sec throttle above). Mainly
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

async function nominatimFetch(path: string, params: URLSearchParams): Promise<Response | null> {
  const url = `${NOMINATIM_BASE}${path}?${params.toString()}`;
  try {
    const res = await throttled(() => fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } }));
    if (!res.ok) {
      console.error(`[geocode] Nominatim returned ${res.status} ${res.statusText} for ${path}`);
    }
    return res;
  } catch (err) {
    console.error(`[geocode] Nominatim fetch threw for ${path}:`, err);
    return null;
  }
}

/** Reverse geocode via Nominatim. */
export async function reverseGeocodeServer(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet<ReverseGeocodeResult | null>(key);
  if (cached !== undefined) return cached;

  const res = await nominatimFetch(
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
    console.error(`[geocode] failed to parse Nominatim reverse response:`, err);
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

async function nominatimSearchStructured(
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

  // Nominatim doesn't have a separate "structured" path like LocationIQ —
  // passing street/city/state/postalcode instead of `q` is what switches
  // it into structured mode on the same /search endpoint.
  const res = await nominatimFetch("/search", params);
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
    console.error(`[geocode] failed to parse Nominatim search response:`, err);
    return null;
  }
}

/** Looks up city + state for a 6-digit Indian PIN code, via the same
 * Nominatim structured search used for full-address lookups (postalcode
 * field only) — one provider for all address lookups instead of depending
 * on a second, independent free service. */
export async function lookupPincodeServer(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) return null;

  const key = `pin:${clean}`;
  const cached = cacheGet<PincodeLookupResult | null>(key);
  if (cached !== undefined) return cached;

  const hit = await nominatimSearchStructured({ postalcode: clean });
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
    const hit = await nominatimSearchStructured(attempts[i], near);
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
