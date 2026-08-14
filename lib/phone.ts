/** Country codes offered in the phone input, India first since that's who
 * this store ships to. Kept short on purpose — this is a picker, not an
 * exhaustive ISO list. */
export const COUNTRY_CODES = [
  { code: "+91", name: "India" },
  { code: "+1", name: "US/Canada" },
  { code: "+44", name: "UK" },
  { code: "+61", name: "Australia" },
  { code: "+971", name: "UAE" },
  { code: "+65", name: "Singapore" },
  { code: "+966", name: "Saudi Arabia" },
  { code: "+974", name: "Qatar" },
  { code: "+968", name: "Oman" },
  { code: "+973", name: "Bahrain" },
  { code: "+965", name: "Kuwait" },
] as const;

export const DEFAULT_COUNTRY_CODE = "+91";

/** A stored phone value is always "<countryCode> <10 digits>", e.g. "+91 9876543210". */
export function splitPhone(value: string | null | undefined): { countryCode: string; number: string } {
  const v = (value ?? "").trim();
  if (!v) return { countryCode: DEFAULT_COUNTRY_CODE, number: "" };
  const match = v.match(/^(\+\d{1,4})\s*(\d*)$/);
  if (match) return { countryCode: match[1], number: match[2] };
  // Legacy/unstructured values (old data saved before this field existed) —
  // just surface whatever digits are there under the default country code.
  return { countryCode: DEFAULT_COUNTRY_CODE, number: v.replace(/\D/g, "").slice(-10) };
}

export function joinPhone(countryCode: string, number: string): string {
  return number ? `${countryCode} ${number}` : "";
}

/** A valid mobile number: a recognized country code plus exactly 10 digits. */
export function isValidPhone(value: string | null | undefined): boolean {
  const { number } = splitPhone(value);
  return /^\d{10}$/.test(number);
}
