import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/stores/cart";
import { type ActiveFilters, type SearchFacets, countActiveFilters, hasActiveFilters } from "@/lib/productSearch";

const RATING_OPTIONS = [4, 3, 2, 1];

export function SearchFilters({
  filters,
  onChange,
  facets,
  isLoading,
}: {
  filters: ActiveFilters;
  onChange: (next: ActiveFilters) => void;
  facets: SearchFacets | undefined;
  isLoading: boolean;
}) {
  // Local, live-dragged copy of the price range so the slider itself feels
  // instant — the expensive part (refetching facets/results) only fires on
  // release, via onValueCommit, not on every pixel of drag.
  const catalogMin = facets?.price_min ?? 0;
  const catalogMax = facets?.price_max ?? 0;
  const [priceDraft, setPriceDraft] = useState<[number, number]>([
    filters.minPrice ?? catalogMin,
    filters.maxPrice ?? catalogMax,
  ]);

  useEffect(() => {
    setPriceDraft([filters.minPrice ?? catalogMin, filters.maxPrice ?? catalogMax]);
    // Only re-sync when the committed filter values or the catalog bounds
    // change — not on every render, or a drag-in-progress would jump back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.minPrice, filters.maxPrice, catalogMin, catalogMax]);

  const showPriceSlider = facets && catalogMax > catalogMin;
  const showRating = !!facets && facets.rating_counts.length > 0;
  const categories = facets?.categories ?? [];
  const brands = facets?.brands ?? [];

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-sm font-bold text-foreground">Filters</h2>
        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() =>
              onChange({ categoryIds: [], brandIds: [], minPrice: null, maxPrice: null, minRating: null, inStockOnly: false })
            }
          >
            <X className="mr-1 h-3 w-3" /> Clear all ({countActiveFilters(filters)})
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["category", "brand", "price", "rating", "availability"]}>
        {(categories.length > 0 || isLoading) && (
          <AccordionItem value="category">
            <AccordionTrigger className="text-sm font-semibold">Category</AccordionTrigger>
            <AccordionContent>
              {isLoading && categories.length === 0 ? (
                <FacetSkeleton />
              ) : (
                <ul className="space-y-2.5">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Checkbox
                            checked={filters.categoryIds.includes(c.id)}
                            onCheckedChange={() => onChange({ ...filters, categoryIds: toggleId(filters.categoryIds, c.id) })}
                          />
                          <span className="text-foreground">{c.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{c.count}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {(brands.length > 0 || isLoading) && (
          <AccordionItem value="brand">
            <AccordionTrigger className="text-sm font-semibold">Brand</AccordionTrigger>
            <AccordionContent>
              {isLoading && brands.length === 0 ? (
                <FacetSkeleton />
              ) : (
                <ul className="space-y-2.5">
                  {brands.map((b) => (
                    <li key={b.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Checkbox
                            checked={filters.brandIds.includes(b.id)}
                            onCheckedChange={() => onChange({ ...filters, brandIds: toggleId(filters.brandIds, b.id) })}
                          />
                          <span className="text-foreground">{b.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{b.count}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {showPriceSlider && (
          <AccordionItem value="price">
            <AccordionTrigger className="text-sm font-semibold">Price</AccordionTrigger>
            <AccordionContent>
              <div className="px-1 pb-1 pt-2">
                <Slider
                  min={catalogMin}
                  max={catalogMax}
                  step={Math.max(1, Math.round((catalogMax - catalogMin) / 100))}
                  value={priceDraft}
                  onValueChange={(v: number[]) => setPriceDraft([v[0], v[1]])}
                  onValueCommit={(v: number[]) =>
                    onChange({
                      ...filters,
                      minPrice: v[0] <= catalogMin ? null : v[0],
                      maxPrice: v[1] >= catalogMax ? null : v[1],
                    })
                  }
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatMoney(priceDraft[0])}</span>
                  <span>{formatMoney(priceDraft[1])}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {showRating && (
          <AccordionItem value="rating">
            <AccordionTrigger className="text-sm font-semibold">Rating</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {RATING_OPTIONS.map((minRating) => {
                  const entry = facets?.rating_counts.find((r) => r.min_rating === minRating);
                  const count = entry?.count ?? 0;
                  if (count === 0) return null;
                  const active = filters.minRating === minRating;
                  return (
                    <li key={minRating}>
                      <button
                        type="button"
                        onClick={() => onChange({ ...filters, minRating: active ? null : minRating })}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors ${
                          active ? "bg-accent font-semibold text-foreground" : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < minRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                            />
                          ))}
                          <span className="ml-1">& up</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="availability">
          <AccordionTrigger className="text-sm font-semibold">Availability</AccordionTrigger>
          <AccordionContent>
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="text-foreground">In stock only</span>
              <span className="flex items-center gap-2">
                {facets && <span className="text-xs text-muted-foreground">{facets.in_stock_count}</span>}
                <Switch
                  checked={filters.inStockOnly}
                  onCheckedChange={(checked: boolean) => onChange({ ...filters, inStockOnly: checked })}
                />
              </span>
            </label>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function FacetSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
