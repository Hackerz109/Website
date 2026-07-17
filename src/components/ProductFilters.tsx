import { useQuery } from "@tanstack/react-query";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export type SortOption = "featured" | "newest" | "price_asc" | "price_desc" | "name_asc";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  name_asc: "Name: A–Z",
};

const ANY = "__any__";

export function ProductFilters({
  sort,
  onSortChange,
  categoryId,
  onCategoryChange,
  brandId,
  onBrandChange,
  showCategoryFilter = true,
}: {
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  categoryId: string | null;
  onCategoryChange: (v: string | null) => void;
  brandId: string | null;
  onBrandChange: (v: string | null) => void;
  showCategoryFilter?: boolean;
}) {
  const { data: categories } = useQuery({
    queryKey: ["taxonomy-options", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: showCategoryFilter,
  });

  const { data: brands } = useQuery({
    queryKey: ["taxonomy-options", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const hasActiveFilters = categoryId !== null || brandId !== null || sort !== "featured";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />

      {showCategoryFilter && (
        <Select value={categoryId ?? ANY} onValueChange={(v) => onCategoryChange(v === ANY ? null : v)}>
          <SelectTrigger className="h-9 w-auto min-w-[9rem]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All categories</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={brandId ?? ANY} onValueChange={(v) => onBrandChange(v === ANY ? null : v)}>
        <SelectTrigger className="h-9 w-auto min-w-[9rem]">
          <SelectValue placeholder="Brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All brands</SelectItem>
          {(brands ?? []).map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="h-9 w-auto min-w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <SelectItem key={key} value={key}>{SORT_LABELS[key]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => {
            onSortChange("featured");
            onCategoryChange(null);
            onBrandChange(null);
          }}
        >
          <X className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

/** Shared query-building helper so every listing page sorts/filters the same way. */
export function applySortAndFilter<
  T extends { order: (col: string, opts: { ascending: boolean }) => T; eq: (col: string, val: unknown) => T },
>(query: T, sort: SortOption, categoryId: string | null, brandId: string | null): T {
  let q = query;
  if (categoryId) q = q.eq("category_id", categoryId);
  if (brandId) q = q.eq("brand_id", brandId);

  switch (sort) {
    case "price_asc":
      return q.order("price_cents", { ascending: true });
    case "price_desc":
      return q.order("price_cents", { ascending: false });
    case "name_asc":
      return q.order("name", { ascending: true });
    case "newest":
      return q.order("created_at", { ascending: false });
    case "featured":
    default:
      return q.order("featured", { ascending: false }).order("created_at", { ascending: false });
  }
}
