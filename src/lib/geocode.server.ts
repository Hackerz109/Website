/**
 * All the address-lookup logic used to live in src/lib/delivery.ts and ran
 * as plain `fetch()` calls straight from the shopper's browser to
 * nominatim.openstreetmap.org / api.postalpincode.in. That's the reason
 * address lookup could appear to "just stop working, no matter what's
 * typed": Nominatim's usage policy requires a valid, application-identifying
 * User-Agent — "stock User-Agents as set by http libraries will not do" —
 * and a browser's `fetch()` can't set a custom User-Agent at all (it's a
 * forbidden header), so every request went out looking like anonymous,
 * unidentified traffic. Nominatim is also explicit that it "does not
 * support autocomplete" and blocks IPs that look like they're hammering it
 * with near-duplicate queries. On top of that, requests came from each
 * shopper's own IP — on Indian mobile carriers, huge numbers of unrelated
 * phones share the same carrier-grade-NAT IP, so if *any* app misusing
 * Nominatim from that IP got it blocked, every shopper behind that IP
 * inherited the block, permanently, for every address they ever typed.
 *
 * Moving the calls here (server-side, proxied through /api/geocode) fixes
 * all three at once: we can set a real identifying User-Agent, requests now
 * come from our own stable server IP instead of thousands of shopper IPs,
 * and we cache + coalesce so repeat/near-duplicate lookups don't re-hit
 * Nominatim at all. The client-facing function names/shapes in delivery.ts
 * are unchanged, so cart.tsx / profile.tsx needed no changes.
 */

// Nominatim explicitly requires this ("Provide a valid HTTP Referer or
// User-Agent identifying the application"). Set GEOCODE_CONTACT_EMAIL in
// your deployment's env vars to your own support address — Nominatim's
// admins use it to reach out before blocking, instead of just blocking.
const CONTACT = process.env.GEOCODE_CONTACT_EMAIL || "support@example.com";
const USER_AGENT = `StoreDeliveryCheckout/1.0 (+${CONTACT})`;

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
// shopper re-typing/adjusting the same address from re-hitting Nominatim
// for every debounce tick.
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

async function nominatimFetch(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    });
  } catch {
    return null;
  }
}

/** Reverse geocode via OpenStreetMap Nominatim. See reverseGeocode() in
 * delivery.ts for the original field-selection reasoning — unchanged here. */
export async function reverseGeocodeServer(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet<ReverseGeocodeResult | null>(key);
  if (cached !== undefined) return cached;

  const res = await nominatimFetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=en`,
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
  } catch {
    return null;
  }
}

const STATE_ALIASES: Record<string, string> = {
  Orissa: "Odisha",
  Pondicherry: "Puducherry",
  Uttaranchal: "Uttarakhand",
};

/** India Post's pincode -> post-office lookup. See lookupPincode() in
 * delivery.ts for why this is kept separate from the Nominatim path. */
export async function lookupPincodeServer(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) return null;

  const key = `pin:${clean}`;
  const cached = cacheGet<PincodeLookupResult | null>(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (entry?.Status !== "Success" || !Array.isArray(entry.PostOffice) || entry.PostOffice.length === 0) {
      cacheSet(key, null);
      return null;
    }
    const po = entry.PostOffice[0];
    const state: string = po?.State ?? "";
    const result: PincodeLookupResult = { city: po?.District ?? "", state: STATE_ALIASES[state] ?? state };
    cacheSet(key, result);
    return result;
  } catch {
    return null;
  }
}

interface StructuredGeocodeFields {
  street?: string;
  city?: string;
  state?: string;
  postalcode?: string;
}

async function nominatimSearchStructured(
  fields: StructuredGeocodeFields,
  near?: LatLng,
): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const hasAnyField = Object.values(fields).some((v) => v && v.trim().length > 0);
  if (!hasAnyField) return null;

  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "0",
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
  const cached = cacheGet<{ lat: number; lng: number; display_name: string } | null>(key);
  if (cached !== undefined) return cached;

  const res = await nominatimFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!res || !res.ok) return null;

  try {
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) {
      cacheSet(key, null);
      return null;
    }
    const result = { lat: parseFloat(first.lat), lng: parseFloat(first.lon), display_name: first.display_name ?? "" };
    cacheSet(key, result);
    return result;
  } catch {
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
 * original client-side version in delivery.ts; see that file's history for
 * the full reasoning on each tier. */
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
        ...hit,
        display_name: hit.display_name || [line1, city, state, pincode].filter(Boolean).join(", "),
        exact: i === 0,
      };
    }
  }
  return null;
}
