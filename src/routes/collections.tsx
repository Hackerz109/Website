import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters, applySortAndFilter, type SortOption } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/collections")({
  component: CollectionsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    sort: (typeof search.sort === "string" ? search.sort : "featured") as SortOption,
    category: typeof search.category === "string" ? search.category : null,
    brand: typeof search.brand === "string" ? search.brand : null,
  }),
});

function CollectionsPage() {
  const { sort, category, brand } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Resets whenever a filter changes — each filter combination starts its
  // own page count rather than trying to carry pages across a new query.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["collections-products", sort, category, brand],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_images(url, is_primary, variant_id), product_variants(price_cents, stock, stock_unlimited), categories(name, slug), brands(name)")
        .eq("active", true);
      query = applySortAndFilter(query, sort, category, brand);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const allProducts = data ?? [];
  const products = allProducts.slice(0, visibleCount);
  const hasMore = visibleCount < allProducts.length;

  function updateSearch(patch: Partial<{ sort: SortOption; category: string | null; brand: string | null }>) {
    setVisibleCount(PAGE_SIZE);
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Collections</h1>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${allProducts.length} product${allProducts.length !== 1 ? "s" : ""}`}
          </p>
          <ProductFilters
            sort={sort}
            onSortChange={(v) => updateSearch({ sort: v })}
            categoryId={category}
            onCategoryChange={(v) => updateSearch({ category: v })}
            brandId={brand}
            onBrandChange={(v) => updateSearch({ brand: v })}
          />
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-2xl bg-secondary" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
              <PackageSearch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No products match those filters</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try a different category, brand, or sort order.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}
