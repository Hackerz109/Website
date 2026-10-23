import { useState } from "react";
import { Star } from "lucide-react";

const SIZE_CLASSES = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" } as const;

interface StarRatingProps {
  /** 0–5, fractional allowed for display (e.g. a 4.3 average renders ~30% of the 5th star filled). */
  value: number;
  /** Presence makes this an interactive picker instead of a read-only display. */
  onChange?: (value: number) => void;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

// Same visual language as the existing rating filter in SearchFilters.tsx
// (fill-primary/text-primary filled, text-muted-foreground empty) — this
// just generalizes it into a reusable, fractional-aware component.
export function StarRating({ value, onChange, size = "md", className = "" }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const interactive = !!onChange;
  const sizeClass = SIZE_CLASSES[size];
  const displayValue = hoverValue ?? value;

  if (interactive) {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className}`} onMouseLeave={() => setHoverValue(null)}>
        {Array.from({ length: 5 }).map((_, i) => {
          const starIndex = i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange!(starIndex)}
              onMouseEnter={() => setHoverValue(starIndex)}
              aria-label={`Rate ${starIndex} out of 5`}
              aria-pressed={value >= starIndex}
              className="-m-0.5 rounded p-0.5"
            >
              <Star
                className={`${sizeClass} ${displayValue >= starIndex ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fillFraction = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={`relative inline-block ${sizeClass}`} aria-hidden="true">
            <Star className={`absolute inset-0 ${sizeClass} text-muted-foreground`} />
            {fillFraction > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillFraction * 100}%` }}>
                <Star className={`${sizeClass} fill-primary text-primary`} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
