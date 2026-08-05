import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, ShoppingBag } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { ProductFilters, type SortOption } from "@/components/ProductFilters";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import { PRODUCT_SEARCH_SELECT, matchingVariants, rankedProductIds, sortByRank } from "@/lib/productSearch";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    sort: (typeof search.sort === "string" ? search.sort : "featured") as SortOption,
    category: typeof search.category === "string" ? search.category : null,
    brand: typeof search.brand === "string" ? search.brand : null,
  }),
});

function SearchPage() {
  const { q, sort, category, brand } = Route.useSearch();
  const navigate = Route.useNavigate();
  const term = q.trim();

  const { data, isLoading } = useQuery({
    queryKey: ["search-results", term, sort, category, brand],
    queryFn: async () => {
      // Fuzzy + word-order-independent ranking first (see
      // src/lib/productSearch.ts) — this is what lets "Havells wire 1mm"
      // find a product literally named "1mm Havells Wire", and lets a
      // misspelling like "havlls" still find "Havells".
      const rankedIds = await rankedProductIds(term);
      if (rankedIds.length === 0) return { products: [], variantsByProduct: {} };

      let query = supabase
        .from("products")
        .select(PRODUCT_SEARCH_SELECT)
        .eq("active", true)
        .in("id", rankedIds);
      if (category) query = query.eq("category_id", category);
      if (brand) query = query.eq("brand_id", brand);

      switch (sort) {
        case "price_asc":
          query = query.order("price_cents", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price_cents", { ascending: false });
          break;
        case "name_asc":
          query = query.order("name", { ascending: true });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "featured":
        default:
          // Left unordered here on purpose — for a search, "best match"
          // is more useful than the Featured flag, so this case is
          // re-sorted by relevance below instead of by DB column.
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      const products = sort === "featured" ? sortByRank(data ?? [], rankedIds) : (data ?? []);

      // Which variant (if any) is the one that actually matched, so a
      // product with several options ("1mm", "1.5mm", "2.5mm"...) can
      // show exactly the one the search term pointed at.
      const variantsByProduct: Record<string, { id: string; name: string; price_cents: number }[]> = {};
      for (const p of products) {
        const matched = matchingVariants(term, p.product_variants ?? []);
        if (matched.length > 0) {
          variantsByProduct[p.id] = matched.map((v) => ({ id: v.id, name: v.name, price_cents: v.price_cents }));
        }
      }

      return { products, variantsByProduct };
    },
    enabled: term.length > 0,
  });

  const products = data?.products ?? [];
  const variantsByProduct = data?.variantsByProduct ?? {};

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {term ? `Results for "${term}"` : "Search"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {term
            ? isLoading
              ? "Searching…"
              : `${products.length} product${products.length !== 1 ? "s" : ""} found`
            : "Search for a product, category, or brand"}
        </p>

        <div className="mt-6 max-w-lg">
          <SearchBar />
        </div>

        {term && (
          <div className="mt-6">
            <ProductFilters
              sort={sort}
              onSortChange={(v) => navigate({ search: (prev) => ({ ...prev, sort: v }) })}
              categoryId={category}
              onCategoryChange={(v) => navigate({ search: (prev) => ({ ...prev, category: v }) })}
              brandId={brand}
              onBrandChange={(v) => navigate({ search: (prev) => ({ ...prev, brand: v }) })}
            />
          </div>
        )}

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
          ) : !term ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Start typing above to find what you need.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
              <SearchX className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try a different word, or check the spelling of what you're looking for.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const matched = variantsByProduct[p.id] ?? [];
                return (
                  <div key={p.id}>
                    <ProductCard product={p} />
                    {matched.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {matched.map((v) => (
                          <Link
                            key={v.id}
                            to="/product/$slug"
                            params={{ slug: p.slug }}
                            search={{ variant: v.id }}
                            className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
                          >
                            <span className="truncate text-muted-foreground">↳ {v.name}</span>
                            <span className="flex-shrink-0 font-semibold text-foreground">
                              {formatMoney(v.price_cents, p.currency)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}
