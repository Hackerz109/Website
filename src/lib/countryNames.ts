// Vercel's x-vercel-ip-country header returns a 2-letter ISO 3166-1 alpha-2
// code (e.g. "IN", "US"), not a display name. GeoMap's COUNTRY_CENTROIDS and
// the Traffic page's free-text country filter both work in full names
// ("India", "United States"), so raw codes need converting at the point
// they're first captured — otherwise every session gets tagged with a code
// that never matches anything downstream.
//
// Keys mirror GeoMap's COUNTRY_CENTROIDS so every mapped country also gets a
// bubble on the map. Codes not in this table pass through unchanged (a raw
// code is still usable in the data table — it just won't get a friendly
// label or a map pin), matching how COUNTRY_CENTROIDS already degrades for
// unlisted countries.
const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  SG: "Singapore",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  NP: "Nepal",
  LK: "Sri Lanka",
  BD: "Bangladesh",
  PK: "Pakistan",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  ID: "Indonesia",
  MY: "Malaysia",
  TH: "Thailand",
  PH: "Philippines",
  VN: "Vietnam",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  BR: "Brazil",
  MX: "Mexico",
  NL: "Netherlands",
  IE: "Ireland",
  ES: "Spain",
  IT: "Italy",
  SE: "Sweden",
  CH: "Switzerland",
  RU: "Russia",
  NZ: "New Zealand",
  IL: "Israel",
  TR: "Turkey",
  EG: "Egypt",
  KW: "Kuwait",
  OM: "Oman",
  BH: "Bahrain",
};

export function countryCodeToName(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}
