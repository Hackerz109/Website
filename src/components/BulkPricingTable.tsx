import { Layers } from "lucide-react";
import { formatMoney } from "@/stores/cart";
import {
  applyTier,
  tierRangeLabel,
  describeTierDiscount,
  type BulkPricingTier,
} from "@/lib/bulkPricing";

/**
 * "Buy more, save more" tier table for the product page. Purely
 * informational — the row matching the shopper's current quantity is
 * highlighted, but the actual price they pay is always confirmed at
 * checkout by the server (see resolve_bulk_unit_price_cents in the
 * migration). Renders nothing if the product has no active tiers.
 */
export function BulkPricingTable({
  tiers,
  basePriceCents,
  currency = "INR",
  currentQty,
}: {
  tiers: BulkPricingTier[];
  basePriceCents: number;
  currency?: string;
  currentQty?: number;
}) {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Layers className="h-4 w-4 text-primary" /> Buy more & save
      </p>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-border bg-background">
        {sorted.map((t, i) => {
          const unitPrice = applyTier(basePriceCents, t);
          const active = currentQty !== undefined && currentQty >= t.min_qty
            && (sorted[i + 1] ? currentQty < sorted[i + 1].min_qty : true);
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-3 px-3.5 py-2 text-sm ${
                i % 2 === 1 ? "bg-secondary/40" : ""
              } ${active ? "ring-1 ring-inset ring-primary/40" : ""}`}
            >
              <span className={active ? "font-semibold text-foreground" : "text-muted-foreground"}>
                Buy {tierRangeLabel(t, sorted)} units
              </span>
              <span className="flex items-center gap-1.5">
                <span className={active ? "font-semibold text-primary" : "font-medium"}>
                  {formatMoney(unitPrice, currency)}/unit
                </span>
                <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">
                  {describeTierDiscount(t, currency)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Discount applies automatically at checkout — no code needed.</p>
    </div>
  );
}
