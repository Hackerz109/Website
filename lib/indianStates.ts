/** Canonical list of Indian states & union territories, used to back a
 * dropdown for the delivery-address "State" field instead of a free-text
 * input. Free text let shoppers type things like "uttarpradesh" (no space)
 * or misspellings, which OpenStreetMap/Nominatim can't match against its
 * indexed place names — the geocoder then falls back to a much looser
 * search and can land the pin in a totally different part of the country.
 * Constraining input to this list removes that failure mode entirely. */
export const INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
