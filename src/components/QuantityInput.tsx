import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuantityInputProps = {
  value: number;
  max: number;
  min?: number;
  onChange: (qty: number) => void;
  className?: string;
};

// Stepper buttons plus a free-typing quantity field. Typing is kept as its
// own local string so the field can be empty or mid-edit (e.g. "1" while
// backspacing to type "15") without instantly snapping back to a clamped
// number on every keystroke. The value only gets parsed and clamped to
// [min, max] — respecting stock/unlimited caps the caller passes in — once
// the user commits it, by blurring the field or pressing Enter.
export function QuantityInput({ value, max, min = 1, onChange, className }: QuantityInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = parseInt(raw, 10);
    const clamped = Number.isNaN(parsed) ? value : Math.min(Math.max(parsed, min), max);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-lg"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || /^\d+$/.test(v)) setDraft(v);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="h-9 w-14 rounded-lg px-1 text-center text-sm font-semibold tabular-nums"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-lg"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
