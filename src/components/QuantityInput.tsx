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
  // Guard against a non-finite value/max ever reaching this component (e.g.
  // a caller passing along corrupted state) — without this, a single NaN
  // here poisons every Math.min/Math.max below into NaN forever, which
  // looks exactly like the buttons having silently stopped working.
  const safeValue = Number.isFinite(value) ? value : min;
  const safeMax = Number.isFinite(max) ? max : min;

  const [draft, setDraft] = useState(String(safeValue));

  useEffect(() => {
    setDraft(String(safeValue));
  }, [safeValue]);

  function commit(raw: string) {
    const parsed = parseInt(raw, 10);
    const clamped = Number.isNaN(parsed) ? safeValue : Math.min(Math.max(parsed, min), safeMax);
    setDraft(String(clamped));
    if (clamped !== safeValue) onChange(clamped);
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-lg"
        disabled={safeValue <= min}
        onClick={() => onChange(Math.max(min, safeValue - 1))}
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
        disabled={safeValue >= safeMax}
        onClick={() => onChange(Math.min(safeMax, safeValue + 1))}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
