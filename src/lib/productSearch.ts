import { supabase } from "@/integrations/supabase/client";

/** Shared select so every page that lists products returns identically-shaped
 * rows. Explicit column list (rather than "*") on purpose: products now has
 * a generated `search_vector` tsvector column for full-text search, and
 * pulling that into every product payload site-wide would be pure waste —
 * nothing in the UI reads it, it's only used inside the search RPCs. */
export const PRODUCT_SEARCH_SELECT =
  "id, name, slug, description, price_cents, currency, image_url, stock, active, created_at, updated_at, featured, category_id, brand_id, mrp_cents, specifications, warranty, sku, warranty_available, warranty_type, warranty_duration, warranty_provider, warranty_service_method, warranty_notes, show_stock_count, stock_unlimited, rating_avg, rating_count, popularity_score, effective_price_cents, effective_in_stock, product_images(url, is_primary, variant_id), product_variants(id, name, sku, price_cents, stock, stock_unlimited), categories(name, slug), brands(name)";

export function sanitizeSearchQuery(q: string) {
  // Strip characters that would break a PostgREST filter string if this
  // term is ever combined into an .eq()/.in() elsewhere.
  return q.replace(/[%,()]/g, " ").trim();
}

/**
 * Runs the fuzzy, word-order-independent, synonym-aware product search RPC
 * and returns matching product ids with their relevance score (0-1, best
 * first). A word can match by plain substring, typo-tolerant trigram
 * similarity, a known synonym (see search_synonyms — e.g. "cable" also
 * matches "wire"), or — for long words that don't already match well — by
 * trying every way of splitting it in two and scoring the halves
 * separately, which is what lets a glued/typo'd brand name like
 * "anchornpemta" still find "Anchor Penta". Every word in the query has to
 * match *somewhere* on the product (name, description, SKU, category,
 * brand, variant names/SKUs, spec key/values) — so "Havells wire 1mm"
 * finds a product literally named "1mm Havells Wire". Capped at 200
 * results, ordered best-first.
 */
export async function rankedProducts(term: string): Promise<{ id: string; rank: number }[]> {
  const clean = sanitizeSearchQuery(term);
  if (clean.length < 2) return [];
  const { data, error } = await supabase.rpc("search_products_ranked", { p_query: clean });
  if (error) throw error;
  return data ?? [];
}

/** Convenience wrapper for callers that only need the ordered ids. */
export async function rankedProductIds(term: string): Promise<string[]> {
  return (await rankedProducts(term)).map((r) => r.id);
}

/**
 * Re-sorts fetched rows to match a previously-computed id ranking —
 * needed because `.in("id", ids)` does not preserve the order of `ids`.
 * Rows whose id isn't in the list (shouldn't happen) sort to the front
 * rather than being dropped, so nothing silently disappears.
 */
export function sortByRank<T extends { id: string }>(rows: T[], rankedIds: string[]): T[] {
  const rankIndex = new Map(rankedIds.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0));
}

/**
 * Which of a product's own variants are worth showing as a "↳ variant"
 * sub-result — any variant whose own name/SKU contains at least one word
 * from the search (e.g. searching "Havells wire 1mm" highlights the
 * "1mm" variant specifically, out of several gauge options).
 */
export function matchingVariants<V extends { name: string; sku: string | null }>(
  term: string,
  variants: V[],
): V[] {
  const words = sanitizeSearchQuery(term).toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  return variants.filter((v) => {
    const text = `${v.name} ${v.sku ?? ""}`.toLowerCase();
    return words.some((w) => text.includes(w));
  });
}

// ---------------------------------------------------------------------------
// Filters, sorting
// ---------------------------------------------------------------------------

export type SearchSortOption = "relevance" | "price_asc" | "price_desc" | "popularity" | "newest";

export const SEARCH_SORT_LABELS: Record<SearchSortOption, string> = {
  relevance: "Best match",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  popularity: "Popularity",
  newest: "Newest",
};

export type ActiveFilters = {
  categoryIds: string[];
  brandIds: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  inStockOnly: boolean;
};

export const EMPTY_FILTERS: ActiveFilters = {
  categoryIds: [],
  brandIds: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  inStockOnly: false,
};

export function hasActiveFilters(f: ActiveFilters): boolean {
  return (
    f.categoryIds.length > 0 ||
    f.brandIds.length > 0 ||
    f.minPrice != null ||
    f.maxPrice != null ||
    f.minRating != null ||
    f.inStockOnly
  );
}

export function countActiveFilters(f: ActiveFilters): number {
  let n = f.categoryIds.length + f.brandIds.length;
  if (f.minPrice != null || f.maxPrice != null) n += 1;
  if (f.minRating != null) n += 1;
  if (f.inStockOnly) n += 1;
  return n;
}

// ---------------------------------------------------------------------------
// Faceted counts
// ---------------------------------------------------------------------------

export type SearchFacets = {
  total_count: number;
  categories: { id: string; name: string; slug: string; count: number }[];
  brands: { id: string; name: string; count: number }[];
  price_min: number | null;
  price_max: number | null;
  rating_counts: { min_rating: number; count: number }[];
  in_stock_count: number;
  out_of_stock_count: number;
};

const EMPTY_FACETS: SearchFacets = {
  total_count: 0,
  categories: [],
  brands: [],
  price_min: null,
  price_max: null,
  rating_counts: [],
  in_stock_count: 0,
  out_of_stock_count: 0,
};

/** Facet counts for the sidebar — each dimension's counts are computed
 * against every *other* active filter but not its own, so picking one
 * brand doesn't hide the counts for the others (standard faceted-search
 * behavior). Works with no query at all (pure browse-by-filter). */
export async function fetchFacets(term: string, filters: ActiveFilters): Promise<SearchFacets> {
  const clean = sanitizeSearchQuery(term);
  const { data, error } = await supabase.rpc("search_facets", {
    p_query: clean.length > 0 ? clean : null,
    p_category_ids: filters.categoryIds.length > 0 ? filters.categoryIds : null,
    p_brand_ids: filters.brandIds.length > 0 ? filters.brandIds : null,
    p_min_price: filters.minPrice,
    p_max_price: filters.maxPrice,
    p_min_rating: filters.minRating,
    p_in_stock_only: filters.inStockOnly ? true : null,
  });
  if (error) throw error;
  return (data as SearchFacets | null) ?? EMPTY_FACETS;
}

// ---------------------------------------------------------------------------
// Autocomplete / suggestions / did-you-mean / trending
// ---------------------------------------------------------------------------

export type AutocompleteSuggestion = {
  label: string;
  kind: "product" | "brand" | "category";
  product_id: string | null;
  product_slug: string | null;
  brand_id: string | null;
  category_id: string | null;
  category_slug: string | null;
};

export async function fetchAutocomplete(term: string, limit = 8): Promise<AutocompleteSuggestion[]> {
  const clean = sanitizeSearchQuery(term);
  if (clean.length < 2) return [];
  const { data, error } = await supabase.rpc("search_autocomplete", { p_query: clean, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as AutocompleteSuggestion[];
}

/** Null unless a meaningfully-different, more-likely-correct spelling was found. */
export async function fetchDidYouMean(term: string): Promise<string | null> {
  const clean = sanitizeSearchQuery(term);
  if (clean.length < 2) return null;
  const { data, error } = await supabase.rpc("search_did_you_mean", { p_query: clean });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function fetchTrendingSearches(limit = 8): Promise<{ query: string; search_count: number }[]> {
  const { data, error } = await supabase.rpc("get_trending_searches", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as { query: string; search_count: number }[];
}

/** Same category/brand affinity as before ("More from this brand"),
 * generalized to also power the zero-results fallback shelf — with no
 * category/brand given it falls back to featured/popular/newest across
 * the whole catalog, so it's always safe to call. */
export async function fetchRelatedProducts(opts: {
  categoryId?: string | null;
  brandId?: string | null;
  excludeIds?: string[];
  limit?: number;
}) {
  const { data: ids, error } = await supabase.rpc("get_related_products", {
    p_category_id: opts.categoryId ?? null,
    p_brand_id: opts.brandId ?? null,
    p_exclude_ids: opts.excludeIds ?? [],
    p_limit: opts.limit ?? 8,
  });
  if (error) throw error;
  const idList = ((ids ?? []) as { id: string }[]).map((r) => r.id);
  if (idList.length === 0) return [];
  const { data: rows, error: rowsError } = await supabase
    .from("products")
    .select(PRODUCT_SEARCH_SELECT)
    .in("id", idList);
  if (rowsError) throw rowsError;
  return sortByRank(rows ?? [], idList);
}
