import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters, applySortAndFilter, type SortOption } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/collections")({
  validateSearch: (search: Record<string, unknown>) => {
    // visible has to survive round-tripping through a URL, so it may
    // arrive as a number (already parsed) or a string (raw query param) —
    // handle either, and fall back to the first page for anything else
    // (missing, malformed, zero/negative).
    const rawVisible = search.visible;
    const parsedVisible =
      typeof rawVisible === "number" ? rawVisible : typeof rawVisible === "string" ? Number(rawVisible) : NaN;
    return {
      sort: (typeof search.sort === "string" ? search.sort : "featured") as SortOption,
      category: typeof search.category === "string" ? search.category : null,
      brand: typeof search.brand === "string" ? search.brand : null,
      // How many products "Load more" has revealed so far. Living in the
      // URL — not a plain useState — is what makes it survive: clicking
      // into a product and then hitting browser back returns to this
      // exact URL, visible count included, instead of remounting the page
      // back at its default 12.
      visible: Number.isFinite(parsedVisible) && parsedVisible > 0 ? Math.floor(parsedVisible) : PAGE_SIZE,
    };
  },
  // The router only keys its loader cache on path params by default — this
  // is what makes it re-run the loader when sort/category/brand change via
  // the filter controls, instead of reusing a stale first load. `visible`
  // is deliberately left out: it never changes which products match, only
  // how many of the already-fetched list are sliced into view, so it
  // should never cause a re-fetch.
  loaderDeps: ({ search }) => ({ sort: search.sort, category: search.category, brand: search.brand }),
  loader: async ({ deps }) => {
    try {
      let query = supabase
        .from("products")
        .select(
          "*, product_images(url, is_primary, variant_id), product_variants(price_cents, stock, stock_unlimited), categories(name, slug), brands(name)"
        )
        .eq("active", true);
      query = applySortAndFilter(query, deps.sort, deps.category, deps.brand);
      const { data, error } = await query;
      return { products: data ?? [], productsError: !!error };
    } catch {
      return { products: [], productsError: true };
    }
  },
  component: CollectionsPage,
  pendingComponent: () => (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-7 w-40 animate-pulse rounded bg-secondary/60" />
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-2xl bg-secondary" />
              <div className="mt-4 h-4 w-2/3 rounded bg-secondary" />
            </div>
          ))}
        </div>
      </div>
      <StoreFooter />
    </div>
  ),
});

function CollectionsPage() {
  const { sort, category, brand, visible } = Route.useSearch();
  const { products: allProducts, productsError } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });

  const products = allProducts.slice(0, visible);
  const hasMore = visible < allProducts.length;

  function updateSearch(patch: Partial<{ sort: SortOption; category: string | null; brand: string | null }>) {
    // Folds the visible-count reset into the same navigation as the filter
    // change, so a new filter always starts back at the first page.
    navigate({ search: (prev) => ({ ...prev, ...patch, visible: PAGE_SIZE }) });
  }

  function loadMore() {
    // visible now lives in the URL (see the fix above this one), which
    // means clicking this is a real navigation, not just a state update —
    // and the router's default for any navigation is to scroll to top,
    // same as a fresh page visit would. resetScroll:false is the
    // documented way to say "this one shouldn't." The explicit scrollTo
    // afterward is a deliberate belt-and-suspenders on top of that: that
    // flag is known to be unreliable in some TanStack Router versions
    // after the first navigation in a session, so this forces the
    // outcome directly rather than only hoping the flag is honored.
    const scrollY = window.scrollY;
    void navigate({
      search: (prev) => ({ ...prev, visible: (prev.visible ?? PAGE_SIZE) + PAGE_SIZE }),
      resetScroll: false,
    }).then(() => {
      window.scrollTo({ top: scrollY, behavior: "instant" });
    });
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
            {productsError ? "Couldn't load products" : `${allProducts.length} product${allProducts.length !== 1 ? "s" : ""}`}
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
          {productsError ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-soft">
              Couldn't load products right now.
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
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} loading={i < 4 ? "eager" : "lazy"} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Button variant="outline" className="rounded-xl" onClick={loadMore}>
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
