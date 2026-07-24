import { supabase } from "@/integrations/supabase/client";

export type LatLng = { lat: number; lng: number };

export interface DeliveryRateTier {
  min_km: number;
  max_km: number | null;
  charge_cents: number;
}

export interface DeliveryZonePreview {
  id: string;
  name: string;
  radius_km: number;
  lat: number;
  lng: number;
}

export interface StoreLocationPreview {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  is_primary: boolean;
}

export interface DeliveryInfo {
  charge_type: "flat" | "distance";
  flat_charge_cents: number;
  free_delivery_min_cents: number | null;
  pickup_charge_cents: number;
  delivery_eta_text: string;
  pickup_eta_text: string;
  delivery_instructions: string | null;
  pickup_instructions: string | null;
  pickup_address: string | null;
  rate_tiers: DeliveryRateTier[];
  zones: DeliveryZonePreview[];
  store_locations: StoreLocationPreview[];
}

export interface EligibilityResult {
  eligible: boolean;
  message?: string;
  distance_km?: number;
  zone_id?: string;
  zone_name?: string;
  store_location_id?: string;
  store_name?: string;
}

export interface DeliveryChargeResult extends EligibilityResult {
  charge_cents: number | null;
  free_delivery_applied?: boolean;
  eta_text?: string;
  instructions?: string | null;
}

export type LatLngAccuracy = LatLng & { accuracy: number };

/** Resolves with the browser's current position, or null if permission was
 * denied / unavailable / unsupported. Never rejects — callers should treat
 * null as "fall back to manual address entry", not as an error.
 *
 * A single getCurrentPosition() call is often coarse — on laptops/desktops
 * it's frequently Wi-Fi/IP based and can be off by hundreds of meters to
 * kilometers, and even on phones the first GPS fix is usually rougher than
 * the ones that follow a second or two later. So instead of taking the
 * first reading, this watches for up to ~8s and keeps the most accurate
 * fix seen, returning early once accuracy is already good (<=30m). The
 * returned `accuracy` (meters) lets callers show the uncertainty to the
 * user (e.g. a radius circle) rather than silently trusting a bad fix. */
export function getBrowserLocation(): Promise<LatLngAccuracy | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    const MAX_WAIT_MS = 8000;
    const GOOD_ENOUGH_ACCURACY_M = 30;
    let best: LatLngAccuracy | null = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        // no-op — watch may not have been established yet
      }
      resolve(best);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading: LatLngAccuracy = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (!best || reading.accuracy < best.accuracy) best = reading;
        if (reading.accuracy <= GOOD_ENOUGH_ACCURACY_M) finish();
      },
      () => finish(),
      // maximumAge: 0 forces a fresh fix instead of a possibly stale cached
      // one — a stale fix is a common source of "my location is wrong".
      { enableHighAccuracy: true, timeout: MAX_WAIT_MS, maximumAge: 0 },
    );

    setTimeout(finish, MAX_WAIT_MS);
  });
}

export interface ReverseGeocodeResult {
  /** House/flat + street when OSM has them; falls back to whatever fine-grained
   * locality tag is available so the field is rarely left completely empty.
   * Still meant to be edited by the shopper, not treated as final. */
  line1: string;
  city: string;
  state: string;
  pincode: string;
  /** Single-line rendering of the whole address, for callers that just want one string. */
  display_name: string;
}

/** Best-effort reverse geocode via OpenStreetMap Nominatim (free, no API
 * key). Purely a convenience to prefill the address fields — they always
 * stay editable, so failures here are silent. For high-volume production
 * traffic, proxy this through your own server with a proper User-Agent and
 * caching per Nominatim's usage policy.
 *
 * Returns the address as structured components (house/road/locality/city/
 * state/postcode) rather than one blob, so the caller can fill address line
 * 1, city, state and pincode as separate fields instead of cramming
 * everything into a single line. Checks a broad set of OSM locality tags
 * (neighbourhood/suburb/quarter/residential/hamlet/city_block) since which
 * one is populated varies a lot by how thoroughly the area has been mapped —
 * small towns are far more likely to have only one of these than all of
 * them. `accept-language=en` keeps the result in English regardless of the
 * area's default locale/script. */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=en`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address;
    if (!a) return null;

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

    return {
      line1,
      city: cityLike ?? "",
      state: a.state ?? "",
      pincode: a.postcode ?? "",
      display_name: data?.display_name ?? [line1, cityLike, a.state, a.postcode].filter(Boolean).join(", "),
    };
  } catch {
    return null;
  }
}

export interface PincodeLookupResult {
  city: string;
  state: string;
}

/** Looks up city + state for a 6-digit Indian PIN code via India Post's own
 * pincode API (free, no key, official post-office data) — kept separate
 * from forwardGeocode/Nominatim because it's a much more reliable source
 * for "what city/state is this pincode in" specifically: it's a direct
 * postcode → post-office lookup rather than a fuzzy address search, so it
 * doesn't depend on OSM having that area mapped at all. Used to autofill
 * the City/State fields the moment a shopper finishes typing their pincode,
 * before they've necessarily typed anything else. Returns null on any
 * network hiccup or an unrecognized pincode — callers should treat that as
 * "couldn't autofill", not an error, since the fields stay editable either
 * way. */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (entry?.Status !== "Success" || !Array.isArray(entry.PostOffice) || entry.PostOffice.length === 0) return null;
    const po = entry.PostOffice[0];
    const state: string = po?.State ?? "";
    // A couple of state names India Post's data still uses that differ from
    // the current official names in our dropdown list (indianStates.ts) —
    // normalize so the autofilled value actually matches an option instead
    // of silently failing to select anything in the <Combobox>.
    const STATE_ALIASES: Record<string, string> = {
      Orissa: "Odisha",
      Pondicherry: "Puducherry",
      Uttaranchal: "Uttarakhand",
    };
    return {
      city: po?.District ?? "",
      state: STATE_ALIASES[state] ?? state,
    };
  } catch {
    return null;
  }
}

export interface StructuredGeocodeFields {
  street?: string;
  city?: string;
  state?: string;
  postalcode?: string;
}

/** Nominatim's *structured* search — street/city/state/postalcode are sent
 * as separate fields instead of concatenated into one free-text string.
 * This matters specifically for postalcode: in a blended string like
 * "Meerut, Uttar Pradesh, 250001", Nominatim's free-text matching can latch
 * onto the well-known city name and return its centroid, effectively
 * ignoring the pincode digits — which is exactly why filling in City/State
 * from a pincode lookup was making the pin *less* precise, not more.
 * Structured fields don't have that problem: postalcode is matched against
 * its own indexed field, so it still pins the specific postal area even
 * with city/state also present. */
async function nominatimSearchStructured(
  fields: StructuredGeocodeFields,
  near?: LatLng,
): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const hasAnyField = Object.values(fields).some((v) => v && v.trim().length > 0);
  if (!hasAnyField) return null;
  try {
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
      const box = 0.5; // degrees, ~55km — generous since it's a soft bias, not a hard filter
      params.set("viewbox", `${near.lng - box},${near.lat + box},${near.lng + box},${near.lat - box}`);
      params.set("bounded", "0");
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), display_name: first.display_name ?? "" };
  } catch {
    return null;
  }
}

/** Keeps only the last `n` words of `s` (splitting on commas or whitespace).
 * Used to peel the house-number/street prefix off a typed address while
 * keeping whatever locality/town name comes after it. */
function lastWords(s: string, n: number): string {
  const tokens = s
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.slice(Math.max(0, tokens.length - n)).join(" ");
}

/** Builds a ladder of progressively looser search attempts, most specific
 * first. OpenStreetMap's coverage of house numbers and small streets/colonies
 * in India is patchy outside big-city cores, so a long, specific address
 * (house number + street + colony) can fail to match even though the
 * underlying town is perfectly well mapped. Each step below drops a bit more
 * of the specific part so we still land the pin somewhere useful instead of
 * failing outright.
 *
 * Each attempt is a set of *structured* fields (see nominatimSearchStructured)
 * rather than one blended string — critical for postalcode specifically: a
 * dedicated `{ postalcode, state }` attempt still matches the exact postal
 * area, whereas folding the same postcode into a "city, state, pincode" text
 * blob lets free-text matching latch onto the city name and return its
 * centroid instead. */
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

  // 1) Exactly what was typed — best case, keeps full precision. Street
  // carries the house-number/locality text; city/state/postalcode are their
  // own fields so postalcode still gets matched precisely even here.
  add({ street: line1, city, state, postalcode: pincode });

  // 2-4) Keep only the last few words of address line 1 (usually the
  // locality/area name, e.g. "...Katra Chowk, Katra") and drop the
  // house-number/street portion in front of it.
  add({ street: lastWords(line1, 3), city, state, postalcode: pincode });
  add({ street: lastWords(line1, 2), city, state, postalcode: pincode });
  add({ street: lastWords(line1, 1), city, state, postalcode: pincode });

  // 5) Pincode + state, no street/city at all. This is the one that matters
  // most for a shopper who's led with just their pincode: it can't get
  // diluted by a city name the way a blended-text search could, so it lands
  // on the actual postal area rather than the city centroid.
  add({ postalcode: pincode, state });

  // 6-7) Whatever's in the dedicated city/state/pincode fields, ignoring
  // address line 1 entirely — covers a line 1 that's purely a plot/house
  // reference with no place name in it at all.
  add({ city, state, postalcode: pincode });
  add({ city, state });

  // 8) Postal code alone — postcode-area boundaries are often mapped even
  // in towns where individual streets are not.
  add({ postalcode: pincode });

  // 9) Last resort: just the state, so the map centers somewhere sensible
  // and the shopper can drop a precise pin rather than hitting a dead end.
  // (`state` now always comes from a fixed dropdown of real state names —
  // see indianStates.ts — so it can no longer mismatch on a typo like
  // "uttarpradesh" the way a free-text field could.)
  add({ state });

  return attempts;
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
  /** False when we had to fall back to a looser query than exactly what was
   * typed — usually because OpenStreetMap has no record of that specific
   * house/street. Still a useful starting point, but callers should treat
   * the pin as approximate and prompt the shopper to fine-tune it. */
  exact: boolean;
}

/** Best-effort forward geocode via OpenStreetMap Nominatim (free, no API
 * key) — resolves a manually typed address to coordinates so delivery
 * eligibility/charges can be computed without the shopper touching the map.
 * Returns null only once every fallback tier in buildFallbackQueries has
 * been tried and failed; callers should treat that as "couldn't pin this
 * address at all" rather than an error. Same production caveat as
 * reverseGeocode: proxy + cache server-side for high volume, per Nominatim's
 * usage policy.
 *
 * `countrycodes=in` mirrors the India assumption normalizePhone() already
 * makes elsewhere in this file. When `near` (typically the shop location) is
 * provided, results are soft-biased toward a ~55km box around it via
 * `viewbox`+`bounded=0` — without this, a short/common address (e.g. just a
 * street name) can resolve to a same-named street in a completely different
 * city, which is the main way this lookup ends up "accurate geocode, wrong
 * place". `bounded=0` only nudges ranking, it never excludes a genuinely
 * distant match. */
export async function forwardGeocode(query: ForwardGeocodeQuery, near?: LatLng): Promise<ForwardGeocodeResult | null> {
  const line1 = (query.line1 ?? "").trim();
  let city = (query.city ?? "").trim();
  let state = (query.state ?? "").trim();
  const pincode = (query.pincode ?? "").trim();

  // OpenStreetMap's postcode coverage for India is sparse, so a Nominatim
  // search with only `postalcode` set (e.g. a shopper who's typed nothing
  // but their 6-digit pincode) is unreliable and can land the pin nowhere
  // near the real place. Whenever we have a complete pincode but are still
  // missing city/state, resolve those first via India Post's own
  // pincode→post-office data (authoritative, not fuzzy matching) so every
  // geocode attempt below has a real city/state anchor instead of relying
  // on postcode matching alone.
  if (/^\d{6}$/.test(pincode) && (!city || !state)) {
    const postal = await lookupPincode(pincode);
    if (postal) {
      if (!city && postal.city) city = postal.city;
      if (!state && postal.state) state = postal.state;
    }
  }

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

export async function getDeliveryInfo(): Promise<DeliveryInfo | null> {
  const { data, error } = await supabase.rpc("get_delivery_info");
  if (error || !data) return null;
  return data as unknown as DeliveryInfo;
}

export async function checkDeliveryEligibility(lat: number, lng: number): Promise<EligibilityResult> {
  const { data, error } = await supabase.rpc("check_delivery_eligibility", { p_lat: lat, p_lng: lng });
  if (error || !data) return { eligible: false, message: "Couldn't check delivery availability right now." };
  return data as unknown as EligibilityResult;
}

export async function calculateDeliveryCharge(
  lat: number,
  lng: number,
  subtotalCents: number,
): Promise<DeliveryChargeResult> {
  const { data, error } = await supabase.rpc("calculate_delivery_charge", {
    p_lat: lat,
    p_lng: lng,
    p_subtotal_cents: subtotalCents,
  });
  if (error || !data) {
    return { eligible: false, charge_cents: null, message: "Couldn't calculate delivery charges right now." };
  }
  return data as unknown as DeliveryChargeResult;
}