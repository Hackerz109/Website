import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Frown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { SearchFilters } from "@/components/SearchFilters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PRODUCT_SEARCH_SELECT,
  rankedProducts,
  sortByRank,
  matchingVariants,
  pickVariantImage,
  fetchFacets,
  fetchDidYouMean,
  fetchRelatedProducts,
  hasActiveFilters,
  countActiveFilters,
  SEARCH_SORT_LABELS,
  type ActiveFilters,
  type SearchSortOption,
} from "@/lib/productSearch";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 24;
const SORT_VALUES: SearchSortOption[] = ["relevance", "price_asc", "price_desc", "popularity", "newest"];

function parseUUIDList(value: unknown): string[] {
  const parts: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value.length > 0
      ? value.split(",")
      : [];
  return parts.map((v) => String(v).trim()).filter((v) => UUID_RE.test(v));
}

function parseNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : undefined;
}

type SearchPageParams = {
  q: string;
  category: string[];
  brand: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: true;
  sort?: SearchSortOption;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchPageParams => {
    const sortRaw = typeof search.sort === "string" ? search.sort : undefined;
    return {
      q: typeof search.q === "string" ? search.q : "",
      category: parseUUIDList(search.category),
      brand: parseUUIDList(search.brand),
      minPrice: parseNumber(search.minPrice),
      maxPrice: parseNumber(search.maxPrice),
      minRating: parseNumber(search.minRating),
      inStock: search.inStock === true || search.inStock === "true" ? true : undefined,
      sort: (SORT_VALUES as string[]).includes(sortRaw ?? "") ? (sortRaw as SearchSortOption) : undefined,
    };
  },
  component: SearchPage,
});

function filtersToSearchPatch(filters: ActiveFilters) {
  return {
    category: filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
    brand: filters.brandIds.length > 0 ? filters.brandIds : undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minRating: filters.minRating ?? undefined,
    inStock: filters.inStockOnly ? (true as const) : undefined,
  };
}

function applyFilters(query: any, filters: ActiveFilters) {
  let q = query;
  if (filters.categoryIds.length > 0) q = q.in("category_id", filters.categoryIds);
  if (filters.brandIds.length > 0) q = q.in("brand_id", filters.brandIds);
  // effective_price_cents/effective_in_stock (not price_cents/stock
  // directly) — most products here price and stock themselves entirely
  // through variants, leaving the product row's own price_cents/stock at
  // placeholder 0/false, so filtering on those directly excluded almost
  // everything. See the search_effective_price_and_stock migration.
  if (filters.minPrice != null) q = q.gte("effective_price_cents", filters.minPrice);
  if (filters.maxPrice != null) q = q.lte("effective_price_cents", filters.maxPrice);
  if (filters.minRating != null) q = q.gte("rating_avg", filters.minRating);
  if (filters.inStockOnly) q = q.eq("effective_in_stock", true);
  return q;
}

function applySort(query: any, sort: SearchSortOption) {
  switch (sort) {
    case "price_asc":
      return query.order("effective_price_cents", { ascending: true });
    case "price_desc":
      return query.order("effective_price_cents", { ascending: false });
    case "popularity":
      return query.order("popularity_score", { ascending: false });
    default:
      return query.order("created_at", { ascending: false });
  }
}

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const filters: ActiveFilters = useMemo(
    () => ({
      categoryIds: search.category,
      brandIds: search.brand,
      minPrice: search.minPrice ?? null,
      maxPrice: search.maxPrice ?? null,
      minRating: search.minRating ?? null,
      inStockOnly: !!search.inStock,
    }),
    [search.category, search.brand, search.minPrice, search.maxPrice, search.minRating, search.inStock],
  );

  const term = search.q.trim();
  const sort: SearchSortOption = search.sort ?? (term ? "relevance" : "newest");
  // Relevance ranking is capped at 200 results and computed as one scan, so
  // it's fetched once and paged through client-side (visibleCount) rather
  // than re-queried per page — the other sort orders are plain columns and
  // get real server-side range() pagination, which scales indefinitely as
  // the catalog grows.
  const isRelevanceSort = sort === "relevance" && term.length > 1;

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function updateFilters(next: ActiveFilters) {
    navigate({ search: (prev: any) => ({ ...prev, ...filtersToSearchPatch(next) }), replace: true });
  }

  function updateSort(next: SearchSortOption) {
    navigate({ search: (prev: any) => ({ ...prev, sort: next }), replace: true });
  }

  function clearAll() {
    navigate({ search: (prev: any) => ({ q: prev.q }), replace: true });
  }

  const { data: facets, isLoading: facetsLoading } = useQuery({
    queryKey: ["search-facets", term, filters],
    queryFn: () => fetchFacets(term, filters),
  });

  const relevanceQuery = useQuery({
    queryKey: ["search-relevance", term, filters],
    queryFn: async () => {
      const ranked = await rankedProducts(term);
      const rankedIds = ranked.map((r) => r.id);
      if (rankedIds.length === 0) return { products: [] as any[] };
      let q = supabase.from("products").select(PRODUCT_SEARCH_SELECT).eq("active", true).in("id", rankedIds);
      q = applyFilters(q, filters);
      const { data, error } = await q;
      if (error) throw error;
      return { products: sortByRank(data ?? [], rankedIds) };
    },
    enabled: isRelevanceSort,
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    // Reset how much of the relevance-ranked list is revealed whenever the
    // query/filters/sort change, so a new search doesn't start scrolled in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, JSON.stringify(filters), sort]);

  const columnQuery = useInfiniteQuery({
    queryKey: ["search-paged", term, filters, sort],
    queryFn: async ({ pageParam }) => {
      let rankedIds: string[] | null = null;
      if (term.length > 1) {
        rankedIds = (await rankedProducts(term)).map((r) => r.id);
        if (rankedIds.length === 0) return { products: [] as any[], hasMore: false, totalCount: 0 };
      }
      let q = supabase.from("products").select(PRODUCT_SEARCH_SELECT, { count: "exact" }).eq("active", true);
      if (rankedIds) q = q.in("id", rankedIds);
      q = applyFilters(q, filters);
      q = applySort(q, sort);
      const from = (pageParam as number) * PAGE_SIZE;
      q = q.range(from, from + PAGE_SIZE - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      const rows = data ?? [];
      return { products: rows, hasMore: (count ?? 0) > from + rows.length, totalCount: count ?? 0 };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, pages: any[]) => (lastPage.hasMore ? pages.length : undefined),
    enabled: !isRelevanceSort,
  });

  const products: any[] = isRelevanceSort
    ? (relevanceQuery.data?.products ?? []).slice(0, visibleCount)
    : (columnQuery.data?.pages.flatMap((p: any) => p.products) ?? []);

  const totalCount = isRelevanceSort
    ? (relevanceQuery.data?.products.length ?? 0)
    : (columnQuery.data?.pages[0]?.totalCount ?? 0);

  const hasMore = isRelevanceSort
    ? visibleCount < (relevanceQuery.data?.products.length ?? 0)
    : !!columnQuery.hasNextPage;

  const isInitialLoading = isRelevanceSort ? relevanceQuery.isLoading : columnQuery.isLoading;
  const isLoadingMore = isRelevanceSort ? false : columnQuery.isFetchingNextPage;

  // Which of each result's own variants matched the search term (e.g.
  // searching "white" against a product with White/Black options) — shown
  // on its card as clickable "sub-product" chips. Same matching rule the
  // search-bar dropdown preview already uses, so a term that highlights a
  // variant there highlights the same variant here.
  const matchedVariantsByProductId = useMemo(() => {
    const map: Record<string, { id: string; name: string; price_cents: number; image: string | null }[]> = {};
    if (term.length < 2) return map;
    for (const p of products) {
      const matched = matchingVariants(term, p.product_variants ?? []);
      if (matched.length > 0) {
        map[p.id] = matched.map((v: any) => ({
          id: v.id,
          name: v.name,
          price_cents: v.price_cents,
          image: pickVariantImage(p.product_images, v.id, null),
        }));
      }
    }
    return map;
  }, [term, products]);

  function loadMore() {
    if (isRelevanceSort) setVisibleCount((c) => c + PAGE_SIZE);
    else columnQuery.fetchNextPage();
  }

  // Read via refs inside the observer callback (rather than depending on
  // hasMore/loadMore directly) so calling loadMore() — which changes both —
  // never has to tear down and recreate the observer on the same element.
  // Recreating it there was a real bug: the sentinel is often still within
  // the 600px trigger margin right after a page loads, so the fresh
  // observer's initial check could fire again immediately, cascading into
  // loading several pages at once instead of one at a time.
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);
  const sentinelCallbackRef = useCallback((node: HTMLDivElement | null) => {
    sentinelObserverRef.current?.disconnect();
    sentinelObserverRef.current = null;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreRef.current) loadMoreRef.current();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    sentinelObserverRef.current = observer;
  }, []);

  const showZero = !isInitialLoading && products.length === 0;

  const { data: didYouMean } = useQuery({
    queryKey: ["search-dym", term],
    queryFn: () => fetchDidYouMean(term),
    enabled: showZero && term.length > 1,
  });

  const { data: fallbackProducts } = useQuery({
    queryKey: ["search-fallback", filters.categoryIds[0] ?? null, filters.brandIds[0] ?? null],
    queryFn: () =>
      fetchRelatedProducts({ categoryId: filters.categoryIds[0] ?? null, brandId: filters.brandIds[0] ?? null, limit: 8 }),
    enabled: showZero,
  });

  const topProduct = products[0];
  const { data: relatedProducts } = useQuery({
    queryKey: ["search-related", topProduct?.brand_id ?? null, topProduct?.id ?? null],
    queryFn: () =>
      fetchRelatedProducts({
        brandId: topProduct?.brand_id ?? null,
        categoryId: !topProduct?.brand_id ? (topProduct?.category_id ?? null) : null,
        excludeIds: products.map((p) => p.id),
        limit: 8,
      }),
    enabled: !showZero && !isInitialLoading && products.length > 0,
  });

  const heading = term ? `Results for "${term}"` : "All products";
  const visibleSortOptions = SORT_VALUES.filter((s) => s !== "relevance" || term.length > 1);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{heading}</h1>
            {!isInitialLoading && (
              <p className="text-sm text-muted-foreground">
                {totalCount} {totalCount === 1 ? "product" : "products"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                  Filters
                  {hasActiveFilters(filters) && (
                    <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                      {countActiveFilters(filters)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <SearchFilters filters={filters} onChange={updateFilters} facets={facets} isLoading={facetsLoading} />
              </SheetContent>
            </Sheet>

            <Select value={sort} onValueChange={(v: string) => updateSort(v as SearchSortOption)}>
              <SelectTrigger className="w-[168px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleSortOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEARCH_SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-24">
              <SearchFilters filters={filters} onChange={updateFilters} facets={facets} isLoading={facetsLoading} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {isInitialLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
                ))}
              </div>
            ) : showZero ? (
              <div className="py-10 text-center">
                <Frown className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">No products found</p>
                {term && <p className="mt-1 text-sm text-muted-foreground">Nothing matched "{term}".</p>}
                {didYouMean && (
                  <Button
                    variant="link"
                    onClick={() => navigate({ search: (prev: any) => ({ ...prev, q: didYouMean }) })}
                    className="mt-1"
                  >
                    Did you mean "{didYouMean}"?
                  </Button>
                )}
                {hasActiveFilters(filters) && (
                  <Button variant="outline" size="sm" onClick={clearAll} className="mt-3">
                    Clear filters
                  </Button>
                )}
                {(fallbackProducts ?? []).length > 0 && (
                  <div className="mt-10 text-left">
                    <h2 className="mb-4 text-lg font-bold text-foreground">You might like these</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {(fallbackProducts ?? []).map((p: any) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} matchedVariants={matchedVariantsByProductId[p.id]} />
                  ))}
                </div>

                {hasMore && (
                  <div ref={sentinelCallbackRef} className="flex justify-center py-8">
                    <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                      {isLoadingMore ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                )}

                {(relatedProducts ?? []).length > 0 && (
                  <div className="mt-14 border-t border-border pt-8">
                    <h2 className="mb-4 text-lg font-bold text-foreground">You might also like</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {(relatedProducts ?? []).map((p: any) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}
