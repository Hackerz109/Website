import { LeafletMap, type MapCircle } from "@/components/LeafletMap";

export interface GeoMapPoint {
  lat: number;
  lng: number;
  label: string;
  value: number;
}

const COPPER = "#c2703c";

/** Proportional bubble map: circle radius scales with `value` (visitors, revenue, customers...). */
export function GeoMap({
  points,
  formatValue,
  height = 340,
  fallbackCenter = { lat: 22.5, lng: 79 }, // roughly central India
}: {
  points: GeoMapPoint[];
  formatValue?: (v: number) => string;
  height?: number;
  fallbackCenter?: { lat: number; lng: number };
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const circles: MapCircle[] = points.map((p, i) => ({
    id: `${p.label}-${i}`,
    lat: p.lat,
    lng: p.lng,
    radiusKm: 15 + (p.value / max) * 140,
    color: COPPER,
    label: `${p.label}: ${formatValue ? formatValue(p.value) : p.value.toLocaleString()}`,
  }));

  return (
    <LeafletMap
      center={points[0] ? { lat: points[0].lat, lng: points[0].lng } : fallbackCenter}
      zoom={points.length > 0 ? 5 : 4}
      circles={circles}
      fitToContent={points.length > 0}
      height={height}
      className="w-full"
    />
  );
}

// Approximate centroids for common countries — enough to plot a traffic-by-
// country bubble map for typical visitor spread without a geocoding
// dependency. Any country not listed here still shows up in the
// accompanying data table; it just won't get a map bubble.
export const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  India: { lat: 22.35, lng: 78.66 },
  "United States": { lat: 39.8, lng: -98.58 },
  "United Kingdom": { lat: 54.0, lng: -2.0 },
  Canada: { lat: 56.13, lng: -106.35 },
  Australia: { lat: -25.27, lng: 133.78 },
  Germany: { lat: 51.17, lng: 10.45 },
  France: { lat: 46.6, lng: 2.35 },
  Singapore: { lat: 1.35, lng: 103.82 },
  "United Arab Emirates": { lat: 23.42, lng: 53.85 },
  "Saudi Arabia": { lat: 23.89, lng: 45.08 },
  Qatar: { lat: 25.35, lng: 51.18 },
  Nepal: { lat: 28.39, lng: 84.12 },
  "Sri Lanka": { lat: 7.87, lng: 80.77 },
  Bangladesh: { lat: 23.68, lng: 90.36 },
  Pakistan: { lat: 30.38, lng: 69.35 },
  China: { lat: 35.86, lng: 104.2 },
  Japan: { lat: 36.2, lng: 138.25 },
  "South Korea": { lat: 35.91, lng: 127.77 },
  Indonesia: { lat: -0.79, lng: 113.92 },
  Malaysia: { lat: 4.21, lng: 101.98 },
  Thailand: { lat: 15.87, lng: 100.99 },
  Philippines: { lat: 12.88, lng: 121.77 },
  Vietnam: { lat: 14.06, lng: 108.28 },
  "South Africa": { lat: -30.56, lng: 22.94 },
  Nigeria: { lat: 9.08, lng: 8.68 },
  Kenya: { lat: -0.02, lng: 37.91 },
  Brazil: { lat: -14.24, lng: -51.93 },
  Mexico: { lat: 23.63, lng: -102.55 },
  Netherlands: { lat: 52.13, lng: 5.29 },
  Ireland: { lat: 53.14, lng: -7.69 },
  Spain: { lat: 40.46, lng: -3.75 },
  Italy: { lat: 41.87, lng: 12.57 },
  Sweden: { lat: 60.13, lng: 18.64 },
  Switzerland: { lat: 46.82, lng: 8.23 },
  Russia: { lat: 61.52, lng: 105.32 },
  "New Zealand": { lat: -40.9, lng: 174.89 },
  Israel: { lat: 31.05, lng: 34.85 },
  Turkey: { lat: 38.96, lng: 35.24 },
  Egypt: { lat: 26.82, lng: 30.8 },
  Kuwait: { lat: 29.31, lng: 47.48 },
  Oman: { lat: 21.51, lng: 55.92 },
  Bahrain: { lat: 26.07, lng: 50.56 },
};
