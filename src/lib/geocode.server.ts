/**
 * Address lookups (reverse geocode / forward geocode / pincode lookup) —
 * server-side only (never call these from the browser directly).
 *
 * Provider: OpenStreetMap Nominatim, used directly — no third-party API key,
 * no signup, no paid tier. The previous version of this file routed through
 * LocationIQ (a paid-key middleman in front of the same OSM data) to dodge
 * Nominatim's IP-based rate limiting on shared/cloud hosts. That dependency
 * has been removed as requested. The trade-off: Nominatim's public instance
 * enforces a strict *1 request/second, no concurrency* policy and asks for a
 * genuinely identifying User-Agent — see throttle() and APP_USER_AGENT below.
 * If lookups start silently failing under real traffic (shared-IP throttling
 * is the classic symptom), that's the tell you've outgrown the free public
 * instance and need either a self-hosted Nominatim or a paid provider again —
 * this file is the only place that would need to change.
 *
 * Pincode -> city/state lookups use India Post's own public pincode API
 * instead, which also needs no key and is authoritative for Indian PIN
 * codes (better hit rate there than asking Nominatim for postal codes).
 *
 * The client-facing function names/shapes are unchanged from before, so
 * nothing calling these (delivery.ts, cart.tsx, profile.tsx, api.geocode.ts)
 * needed to change.
 */

// Nominatim's usage policy requires a real, identifying User-Agent (an app
// name plus a way to reach you — a URL or email). Set NOMINATIM_CONTACT in
// this deployment's env vars to your actual site URL or a support email
// before going to production; the placeholder below is fine for local/dev
// use but OSM may start blocking a generic/placeholder identity over time.
const CONTACT = process.env.NOMINATIM_CONTACT?.trim() || "contact-not-configured.example.com";
const APP_USER_AGENT = `MyShopStorefront/1.0 (${CONTACT})`;

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const POSTALPINCODE_BASE = "https://api.postalpincode.in/pincode";

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
// optimization, not a correctness requirement). Mainly exists to stop a
// shopper re-triggering a lookup for the same address/pincode/point over
// and over, which matters more now that Nominatim is rate-limited to 1
// request/second for everyone sharing this server.
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

// ---- Nominatim rate-limit throttle -------------------------------------
// Nominatim's public instance requires requests to be serialized at no
// more than 1/second — no bursts, no concurrency. This chains every call
// onto a single promise queue and waits out the gap between requests, so
// concurrent shoppers hitting checkout at once still go out one at a time
// instead of hammering the endpoint in parallel (which is what gets a
// shared server IP silently blocked).
const MIN_INTERVAL_MS = 1100;
let lastRequestAt = 0;
let throttleChain: Promise<void> = Promise.resolve();

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = throttleChain.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  // Keep the chain alive even if this call fails, so one bad lookup
  // doesn't wedge every lookup after it.
  throttleChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function nominatimFetch(path: string, params: URLSearchParams): Promise<Response | null> {
  return throttle(async () => {
    const url = `${NOMINATIM_BASE}${path}?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": APP_USER_AGENT,
          "Accept-Language": "en",
        },
      });
      if (!res.ok) {
        console.error(`[geocode] Nominatim returned ${res.status} ${res.statusText} for ${path}`);
      }
      return res;
    } catch (err) {
      console.error(`[geocode] Nominatim fetch threw for ${path}:`, err);
      return null;
    }
  });
}

/** Reverse geocode via Nominatim. Only ever called for a pin the shopper
 * explicitly placed (GPS "use my location", map tap, or drag) — never as a
 * side effect of typing an address. Best-effort: fields always stay
 * editable, so failures here just resolve null rather than throwing. */
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

  // Nominatim's structured query is the plain /search endpoint with
  // street/city/state/postalcode fields instead of a free-text `q=`.
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

/** Looks up city + state for a 6-digit Indian PIN code via India Post's own
 * pincode API (api.postalpincode.in) — authoritative for exactly this
 * lookup, needs no key, and is a separate provider from Nominatim so it
 * doesn't compete for Nominatim's 1-req/sec budget. */
export async function lookupPincodeServer(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) return null;

  const key = `pin:${clean}`;
  const cached = cacheGet<PincodeLookupResult | null>(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${POSTALPINCODE_BASE}/${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    const office = first?.Status === "Success" ? first.PostOffice?.[0] : null;
    if (!office || (!office.District && !office.State)) {
      cacheSet(key, null);
      return null;
    }
    const result: PincodeLookupResult = {
      city: office.District ?? "",
      state: STATE_ALIASES[office.State] ?? office.State ?? "",
    };
    cacheSet(key, result);
    return result;
  } catch (err) {
    console.error(`[geocode] India Post pincode lookup threw:`, err);
    return null;
  }
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
 * original: try the full address, then drop words off the street line,
 * then fall back to postcode/city/state alone, since OSM often just
 * doesn't have house-number-level detail for smaller towns. */
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

/** Forward geocode: resolves a typed address to coordinates purely so we
 * can check delivery-zone eligibility/charges in the background — this is
 * never used to move a visible map pin or overwrite anything the shopper
 * typed. Falls back through progressively looser matches before giving up;
 * null means every fallback tier failed (e.g. an address Nominatim has no
 * record of at all), in which case the caller should invite the shopper to
 * drop a pin on the map themselves instead. */
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
