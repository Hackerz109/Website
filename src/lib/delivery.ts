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

/** Best-effort reverse geocode via OpenStreetMap Nominatim (free, no API
 * key). Purely a convenience to prefill the address field — the field
 * always stays editable, so failures here are silent. For high-volume
 * production traffic, proxy this through your own server with a proper
 * User-Agent and caching per Nominatim's usage policy.
 *
 * Builds the address from structured components (house/road/locality/city/
 * state/postcode) rather than returning Nominatim's raw `display_name`,
 * which tends to be a long, oddly-ordered string that often buries or omits
 * the locality. Falls back to `display_name` if components are missing.
 * `accept-language=en` keeps the result in English regardless of the area's
 * default locale/script. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=en`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address;
    if (a) {
      const houseAndRoad = [a.house_number, a.road].filter(Boolean).join(" ");
      const locality = a.suburb || a.neighbourhood || a.residential;
      const cityLike = a.village || a.town || a.city_district || a.city;
      const parts = [houseAndRoad, locality, cityLike, a.state, a.postcode].filter(
        (p) => typeof p === "string" && p.trim().length > 0,
      );
      if (parts.length > 0) return parts.join(", ");
    }
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

export interface ForwardGeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

/** Best-effort forward geocode via OpenStreetMap Nominatim (free, no API
 * key) — resolves a manually typed address to coordinates so delivery
 * eligibility/charges can be computed without the shopper touching the
 * map. Returns null on no match or network failure; callers should treat
 * that as "couldn't pin this address" rather than an error. Same
 * production caveat as reverseGeocode: proxy + cache server-side for high
 * volume, per Nominatim's usage policy.
 *
 * `countrycodes=in` mirrors the India assumption normalizePhone() already
 * makes elsewhere in this file. When `near` (typically the shop location)
 * is provided, results are soft-biased toward a ~55km box around it via
 * `viewbox`+`bounded=0` — without this, a short/common address (e.g. just
 * a street name) can resolve to a same-named street in a completely
 * different city, which is the main way this lookup ends up "accurate
 * geocode, wrong place". `bounded=0` only nudges ranking, it never excludes
 * a genuinely distant match. */
export async function forwardGeocode(query: string, near?: LatLng): Promise<ForwardGeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      addressdetails: "0",
      "accept-language": "en",
      countrycodes: "in",
      q,
    });
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
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), display_name: first.display_name ?? q };
  } catch {
    return null;
  }
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