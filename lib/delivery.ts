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
  /** False when we had to fall back to a looser query than exactly what was
   * typed — usually because OpenStreetMap has no record of that specific
   * house/street. Still a useful starting point, but callers should treat
   * the pin as approximate and prompt the shopper to fine-tune it. */
  exact: boolean;
}

// ---------------------------------------------------------------------
// Address lookup (reverse geocode / forward geocode / PIN code lookup)
// ---------------------------------------------------------------------
// These used to call nominatim.openstreetmap.org and api.postalpincode.in
// directly from the browser. That's why address lookup could look totally
// dead no matter what was typed: Nominatim requires a real, application-
// identifying User-Agent ("stock User-Agents as set by http libraries will
// not do"), which a browser's fetch() is not allowed to set — every
// request went out unidentified. Nominatim also explicitly blocks
// autocomplete-style traffic and IPs that look like they're hammering it,
// and on Indian mobile networks huge numbers of unrelated shoppers can
// share one carrier-NAT IP, so one blocked IP silently broke address
// lookup for everyone behind it, indefinitely.
//
// All three lookups now go through our own /api/geocode route (see
// src/lib/geocode.server.ts), which proxies to the same free services but
// with a proper identifying User-Agent, from our own stable server IP, with
// caching. Same function names/shapes as before, so nothing calling these
// needed to change.

async function postGeocode<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Best-effort reverse geocode — prefills the address fields from a lat/lng.
 * They always stay editable, so failures here are silent (resolve null). */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  return postGeocode<ReverseGeocodeResult>({ action: "reverse", lat, lng });
}

/** Looks up city + state for a 6-digit Indian PIN code via India Post's own
 * pincode API — used to autofill City/State the moment a shopper finishes
 * typing their pincode, before they've necessarily typed anything else.
 * Returns null on any failure or unrecognized pincode; fields stay editable
 * either way. */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
  if (!/^\d{6}$/.test(pincode.trim())) return null;
  return postGeocode<PincodeLookupResult>({ action: "pincode", pincode });
}

/** Best-effort forward geocode — resolves a manually typed address to
 * coordinates so delivery eligibility/charges can be computed without the
 * shopper touching the map. Falls back through progressively looser
 * matches server-side (see buildFallbackQueries in geocode.server.ts)
 * before giving up; null means every fallback tier failed. */
export async function forwardGeocode(query: ForwardGeocodeQuery, near?: LatLng): Promise<ForwardGeocodeResult | null> {
  return postGeocode<ForwardGeocodeResult>({ action: "forward", ...query, near });
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