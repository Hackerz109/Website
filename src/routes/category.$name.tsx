import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters, applySortAndFilter, type SortOption } from "@/components/ProductFilters";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/category/$name")({
  validateSearch: (search: Record<string, unknown>) => ({
    sort: (typeof search.sort === "string" ? search.sort : "featured") as SortOption,
    brand: typeof search.brand === "string" ? search.brand : null,
  }),
  // Path params are already part of the router's loader cache key; search
  // params aren't unless declared here — this is what makes sort/brand
  // changes actually re-run the loader instead of reusing a stale result.
  loaderDeps: ({ search }) => ({ sort: search.sort, brand: search.brand }),
  loader: async ({ params, deps }) => {
    try {
      // .maybeSingle() returns { data: null, error: null } for a slug that
      // simply doesn't match anything — that's the normal "no such
      // category" case, not a failure, so it falls through to the same
      // empty-category state the page already had rather than an error.
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("slug", params.name)
        .maybeSingle();
      if (categoryError) {
        return { category: null, products: [], productsError: true };
      }
      if (!category) {
        return { category: null, products: [], productsError: false };
      }

      let query = supabase
        .from("products")
        .select(
          "*, product_images(url, is_primary, variant_id), product_variants(price_cents, stock, stock_unlimited), categories(name, slug), brands(name)"
        )
        .eq("active", true)
        .eq("category_id", category.id);
      query = applySortAndFilter(query, deps.sort, null, deps.brand);
      const { data, error } = await query;
      return { category, products: data ?? [], productsError: !!error };
    } catch {
      return { category: null, products: [], productsError: true };
    }
  },
  component: CategoryPage,
  pendingComponent: () => (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-7 w-40 animate-pulse rounded bg-secondary/60" />
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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

function CategoryPage() {
  const { name: slug } = Route.useParams();
  const { sort, brand } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { category, products, productsError } = Route.useLoaderData();
  const categoryName = category?.name ?? slug;

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All products
        </Link>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {categoryName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {productsError
              ? "Couldn't load products"
              : `${products.length} product${products.length !== 1 ? "s" : ""} in this category`}
          </p>
          <ProductFilters
            sort={sort}
            onSortChange={(v) => navigate({ search: (prev) => ({ ...prev, sort: v }) })}
            categoryId={null}
            onCategoryChange={() => {}}
            brandId={brand}
            onBrandChange={(v) => navigate({ search: (prev) => ({ ...prev, brand: v }) })}
            showCategoryFilter={false}
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
              <h3 className="text-lg font-semibold">No products here yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Nothing is currently listed under "{categoryName}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} loading={i < 4 ? "eager" : "lazy"} />
              ))}
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}
