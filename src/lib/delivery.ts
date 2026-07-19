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

/** Resolves with the browser's current position, or null if permission was
 * denied / unavailable / unsupported. Never rejects — callers should treat
 * null as "fall back to manual address entry", not as an error. */
export function getBrowserLocation(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** Best-effort reverse geocode via OpenStreetMap Nominatim (free, no API
 * key). Purely a convenience to prefill the address field — the field
 * always stays editable, so failures here are silent. For high-volume
 * production traffic, proxy this through your own server with a proper
 * User-Agent and caching per Nominatim's usage policy. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
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
