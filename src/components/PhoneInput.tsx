import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_CODES, splitPhone, joinPhone } from "@/lib/phone";

interface PhoneInputProps {
  /** Combined value, e.g. "+91 9876543210". */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/** Mandatory mobile-number field: a country-code dropdown plus a box that
 * only ever holds up to 10 digits. Non-digit characters are stripped as the
 * shopper types, so it's not possible to end up with a malformed number. */
export function PhoneInput({ value, onChange, id, className, disabled }: PhoneInputProps) {
  const { countryCode, number } = splitPhone(value);

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Select value={countryCode} onValueChange={(cc) => onChange(joinPhone(cc, number))} disabled={disabled}>
        <SelectTrigger className="w-[92px] flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="10-digit mobile number"
        value={number}
        maxLength={10}
        disabled={disabled}
        onChange={(e) => onChange(joinPhone(countryCode, e.target.value.replace(/\D/g, "").slice(0, 10)))}
      />
    </div>
  );
}
