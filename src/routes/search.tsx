import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, ShoppingBag } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { ProductFilters, applySortAndFilter, type SortOption } from "@/components/ProductFilters";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";

function sanitize(q: string) {
  return q.replace(/[%,()]/g, " ").trim();
}

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
  const term = sanitize(q);

  const { data, isLoading } = useQuery({
    queryKey: ["search-results", term, sort, category, brand],
    queryFn: async () => {
      const like = `%${term}%`;

      // category/brand are now separate tables, not text columns on products —
      // resolve any name matches to ids first so they still count as hits.
      const [{ data: matchedCategories }, { data: matchedBrands }, { data: matchedVariants }] = await Promise.all([
        supabase.from("categories").select("id").ilike("name", like),
        supabase.from("brands").select("id").ilike("name", like),
        supabase.from("product_variants").select("id, product_id, name, price_cents").or(`name.ilike.${like},sku.ilike.${like}`),
      ]);
      const categoryIds = (matchedCategories ?? []).map((c) => c.id);
      const brandIds = (matchedBrands ?? []).map((b) => b.id);
      const variantProductIds = [...new Set((matchedVariants ?? []).map((v) => v.product_id))];

      const orParts = [`name.ilike.${like}`, `description.ilike.${like}`];
      if (categoryIds.length > 0) orParts.push(`category_id.in.(${categoryIds.join(",")})`);
      if (brandIds.length > 0) orParts.push(`brand_id.in.(${brandIds.join(",")})`);
      if (variantProductIds.length > 0) orParts.push(`id.in.(${variantProductIds.join(",")})`);

      let query = supabase
        .from("products")
        .select("*, product_images(url, is_primary), product_variants(price_cents, stock), categories(name, slug), brands(name)")
        .eq("active", true)
        .or(orParts.join(","));
      query = applySortAndFilter(query, sort, category, brand);
      const { data, error } = await query;
      if (error) throw error;

      // Group matched variants by their product, same reasoning as the
      // quick-search dropdown: only the ones whose own name/SKU hit the
      // term, so each product can show exactly which option matched.
      const variantsByProduct: Record<string, { id: string; name: string; price_cents: number }[]> = {};
      for (const v of matchedVariants ?? []) {
        (variantsByProduct[v.product_id] ??= []).push({ id: v.id, name: v.name, price_cents: v.price_cents });
      }
      return { products: data ?? [], variantsByProduct };
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
