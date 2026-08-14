import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2, TrendingUp, Clock, Tag, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import { useSearchHistory } from "@/stores/searchHistory";
import { trackSearch } from "@/lib/analytics-tracker";
import {
  PRODUCT_SEARCH_SELECT,
  matchingVariants,
  rankedProductIds,
  sortByRank,
  fetchAutocomplete,
  fetchDidYouMean,
  fetchTrendingSearches,
  type AutocompleteSuggestion,
} from "@/lib/productSearch";

type ProductResult = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
  product_images?: { url: string; is_primary: boolean; variant_id: string | null }[];
  product_variants?: { id: string; name: string; sku: string | null; price_cents: number }[];
  categories?: { name: string } | null;
};

type MatchedVariant = { id: string; name: string; price_cents: number };

// A single flat, keyboard-navigable list backs whatever the dropdown is
// currently showing (recent/trending when empty, suggestions+products+
// view-all when typing) — arrow keys and mouse hover both just move the
// same activeIndex, so they never fall out of sync with each other.
type NavItem =
  | { kind: "recent"; term: string }
  | { kind: "trending"; term: string }
  | { kind: "suggestion"; s: AutocompleteSuggestion }
  | { kind: "product"; product: ProductResult; variant: MatchedVariant | null }
  | { kind: "view-all" };

export function SearchBar({
  className = "",
  autoFocus = false,
  onNavigate,
}: {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const loggedFor = useRef<string | null>(null);

  const recent = useSearchHistory((s) => s.recent);
  const addSearch = useSearchHistory((s) => s.addSearch);
  const removeSearch = useSearchHistory((s) => s.removeSearch);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["search-preview", debounced],
    queryFn: async () => {
      const [rankedIds, suggestions] = await Promise.all([
        rankedProductIds(debounced),
        fetchAutocomplete(debounced, 6),
      ]);
      const topIds = rankedIds.slice(0, 6);
      let products: ProductResult[] = [];
      if (topIds.length > 0) {
        const { data, error } = await supabase
          .from("products")
          .select(PRODUCT_SEARCH_SELECT)
          .eq("active", true)
          .in("id", topIds);
        if (error) throw error;
        products = sortByRank(data ?? [], topIds);
      }

      const variantsByProduct: Record<string, MatchedVariant[]> = {};
      for (const p of products) {
        const matched = matchingVariants(debounced, p.product_variants ?? []);
        if (matched.length > 0) {
          variantsByProduct[p.id] = matched.map((v) => ({ id: v.id, name: v.name, price_cents: v.price_cents }));
        }
      }

      // Quick taxonomy jumps (brand/category) — product suggestions from
      // this RPC are dropped since the ranked search above is the more
      // capable, typo-tolerant source of truth for actual products.
      const quickLinks = suggestions.filter((s) => s.kind !== "product");

      return { products, variantsByProduct, quickLinks, totalRanked: rankedIds.length };
    },
    enabled: debounced.length > 1,
  });

  // "Did you mean" only once results have actually come back empty — no
  // point spending the extra round trip while a real search is still
  // matching fine.
  const showZero = debounced.length > 1 && !isFetching && (results?.products.length ?? 0) === 0;
  const { data: didYouMean } = useQuery({
    queryKey: ["search-did-you-mean", debounced],
    queryFn: () => fetchDidYouMean(debounced),
    enabled: showZero,
  });

  const { data: trending } = useQuery({
    queryKey: ["search-trending"],
    queryFn: () => fetchTrendingSearches(6),
    staleTime: 5 * 60_000,
    enabled: open && debounced.length <= 1,
  });

  // Log each *settled* search once (not per keystroke) — waits for the
  // debounce + fetch to finish, and won't re-log the same term twice in a
  // row (e.g. a stray blur/focus cycle).
  useEffect(() => {
    if (!results || isFetching || debounced.length <= 1) return;
    if (loggedFor.current === debounced) return;
    loggedFor.current = debounced;
    trackSearch(debounced, results.products.length);
  }, [results, isFetching, debounced]);

  function goToProduct(slug: string, variantId?: string) {
    navigate({ to: "/product/$slug", params: { slug }, search: variantId ? { variant: variantId } : {} });
    closeAndReset();
  }

  function goToResults(term?: string) {
    const q = (term ?? query).trim();
    if (!q) return;
    addSearch(q);
    navigate({ to: "/search", search: { q } });
    closeAndReset();
  }

  function goToTaxonomy(s: AutocompleteSuggestion) {
    if (s.kind === "brand" && s.brand_id) {
      navigate({ to: "/search", search: { q: "", brand: s.brand_id } });
    } else if (s.kind === "category" && s.category_id) {
      navigate({ to: "/search", search: { q: "", category: s.category_id } });
    }
    closeAndReset();
  }

  function closeAndReset() {
    setOpen(false);
    setQuery("");
    setDebounced("");
    setActiveIndex(-1);
    onNavigate?.();
  }

  const isEmptyMode = debounced.length <= 1;

  const navItems = useMemo<NavItem[]>(() => {
    if (isEmptyMode) {
      const items: NavItem[] = recent.map((term) => ({ kind: "recent", term }));
      for (const t of trending ?? []) {
        if (!recent.some((r) => r.toLowerCase() === t.query.toLowerCase())) {
          items.push({ kind: "trending", term: t.query });
        }
      }
      return items;
    }
    if (!results) return [];
    const items: NavItem[] = results.quickLinks.map((s) => ({ kind: "suggestion", s }));
    for (const p of results.products) {
      const matched = results.variantsByProduct[p.id] ?? [];
      if (matched.length > 0) {
        for (const v of matched) items.push({ kind: "product", product: p, variant: v });
      } else {
        items.push({ kind: "product", product: p, variant: null });
      }
    }
    if (results.products.length > 0) items.push({ kind: "view-all" });
    return items;
  }, [isEmptyMode, recent, trending, results]);

  function selectItem(item: NavItem) {
    switch (item.kind) {
      case "recent":
      case "trending":
        goToResults(item.term);
        return;
      case "suggestion":
        goToTaxonomy(item.s);
        return;
      case "product":
        goToProduct(item.product.slug, item.variant?.id);
        return;
      case "view-all":
        goToResults();
        return;
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && navItems[activeIndex]) {
        e.preventDefault();
        selectItem(navItems[activeIndex]);
      }
      // else: let the form's onSubmit handle a plain Enter with nothing highlighted
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // Keep the highlighted row in range whenever the list itself changes
  // (new results landed, or switched between empty/typing mode).
  useEffect(() => {
    setActiveIndex(-1);
  }, [isEmptyMode, results, trending]);

  const showDropdown = open && (isEmptyMode ? navItems.length > 0 : debounced.length > 1);
  let renderIndex = -1;

  return (
    <div className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, categories…"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery("");
                setDebounced("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-soft-lg">
          {isEmptyMode ? (
            <div className="py-2">
              {recent.length > 0 && (
                <div className="mb-1">
                  <div className="flex items-center justify-between px-4 pb-1 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => useSearchHistory.getState().clear()}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <ul>
                    {recent.map((term) => {
                      renderIndex++;
                      const idx = renderIndex;
                      return (
                        <li key={`recent-${term}`}>
                          <div
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex items-center justify-between gap-2 px-4 py-2 text-sm ${
                              activeIndex === idx ? "bg-accent" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => goToResults(term)}
                              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                            >
                              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate text-foreground">{term}</span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${term} from recent searches`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => removeSearch(term)}
                              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {(trending ?? []).filter((t) => !recent.some((r) => r.toLowerCase() === t.query.toLowerCase())).length >
                0 && (
                <div>
                  <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Trending
                  </p>
                  <ul>
                    {(trending ?? [])
                      .filter((t) => !recent.some((r) => r.toLowerCase() === t.query.toLowerCase()))
                      .map((t) => {
                        renderIndex++;
                        const idx = renderIndex;
                        return (
                          <li key={`trending-${t.query}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => goToResults(t.query)}
                              className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm ${
                                activeIndex === idx ? "bg-accent" : ""
                              }`}
                            >
                              <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate text-foreground">{t.query}</span>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
              {recent.length === 0 && (trending ?? []).length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Start typing to find what you need.
                </p>
              )}
            </div>
          ) : isFetching ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : !results || results.products.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No results for "{debounced}"</p>
              {didYouMean && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToResults(didYouMean)}
                  className="mt-2 text-sm font-semibold text-primary hover:underline"
                >
                  Did you mean "{didYouMean}"?
                </button>
              )}
            </div>
          ) : (
            <>
              {results.quickLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
                  {results.quickLinks.map((s) => {
                    renderIndex++;
                    const idx = renderIndex;
                    return (
                      <button
                        key={`${s.kind}-${s.label}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => goToTaxonomy(s)}
                        className={`flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors ${
                          activeIndex === idx ? "border-primary bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.kind === "brand" ? <Award className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                        {s.label}
                        <span className="text-muted-foreground/70">{s.kind === "brand" ? "brand" : "category"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <ul>
                {results.products.map((p) => {
                  const sharedImages = p.product_images?.filter((i) => !i.variant_id) ?? [];
                  const variantImages = p.product_images?.filter((i) => i.variant_id) ?? [];
                  const img =
                    sharedImages.find((i) => i.is_primary)?.url ??
                    sharedImages[0]?.url ??
                    variantImages.find((i) => i.is_primary)?.url ??
                    variantImages[0]?.url ??
                    p.image_url;
                  const matched = results.variantsByProduct[p.id] ?? [];
                  const variantPrices = (p.product_variants ?? []).map((v) => v.price_cents);
                  const priceLabel =
                    variantPrices.length > 0
                      ? Math.min(...variantPrices) === Math.max(...variantPrices)
                        ? formatMoney(Math.min(...variantPrices), p.currency)
                        : `From ${formatMoney(Math.min(...variantPrices), p.currency)}`
                      : formatMoney(p.price_cents, p.currency);

                  renderIndex++;
                  const productRowIndex = matched.length === 0 ? renderIndex : -1;

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => productRowIndex >= 0 && setActiveIndex(productRowIndex)}
                        onClick={() => goToProduct(p.slug)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                          activeIndex === productRowIndex ? "bg-accent" : "hover:bg-accent"
                        }`}
                      >
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          {p.categories?.name && (
                            <p className="truncate text-xs text-muted-foreground">{p.categories.name}</p>
                          )}
                        </div>
                        <p className="flex-shrink-0 text-sm font-semibold">{priceLabel}</p>
                      </button>
                      {matched.length > 0 && (
                        <div className="mb-1 ml-[52px] mr-4 space-y-0.5">
                          {matched.map((v) => {
                            renderIndex++;
                            const idx = renderIndex;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => goToProduct(p.slug, v.id)}
                                className={`flex w-full items-center justify-between rounded-md py-1 text-left text-muted-foreground hover:text-foreground ${
                                  activeIndex === idx ? "text-foreground" : ""
                                }`}
                              >
                                <span className="truncate text-xs">↳ {v.name}</span>
                                <span className="flex-shrink-0 text-xs font-semibold text-foreground">
                                  {formatMoney(v.price_cents, p.currency)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(navItems.length - 1)}
                onClick={() => goToResults()}
                className={`w-full border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-primary ${
                  activeIndex === navItems.length - 1 ? "bg-accent" : "hover:bg-accent"
                }`}
              >
                View all results for "{query.trim()}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
