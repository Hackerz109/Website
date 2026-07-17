import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";

function sanitize(q: string) {
  // Strip characters that would break a PostgREST .or() filter string
  return q.replace(/[%,()]/g, " ").trim();
}

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
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(sanitize(query)), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["search-preview", debounced],
    queryFn: async () => {
      const term = `%${debounced}%`;

      const [{ data: matchedCategories }, { data: matchedBrands }] = await Promise.all([
        supabase.from("categories").select("id").ilike("name", term),
        supabase.from("brands").select("id").ilike("name", term),
      ]);
      const categoryIds = (matchedCategories ?? []).map((c) => c.id);
      const brandIds = (matchedBrands ?? []).map((b) => b.id);

      const orParts = [`name.ilike.${term}`, `description.ilike.${term}`];
      if (categoryIds.length > 0) orParts.push(`category_id.in.(${categoryIds.join(",")})`);
      if (brandIds.length > 0) orParts.push(`brand_id.in.(${brandIds.join(",")})`);

      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price_cents, currency, image_url, product_images(url, is_primary), product_variants(price_cents, stock), categories(name)")
        .eq("active", true)
        .or(orParts.join(","))
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: debounced.length > 1,
  });

  function goToResults() {
    const q = query.trim();
    if (!q) return;
    navigate({ to: "/search", search: { q } });
    setOpen(false);
    onNavigate?.();
  }

  const showDropdown = open && debounced.length > 1;

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
            placeholder="Search products, categories…"
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
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-soft-lg">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : !results || results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results for "{debounced}"
            </div>
          ) : (
            <>
              <ul>
                {results.map((p) => {
                  const img = p.product_images?.find((i) => i.is_primary)?.url
                    ?? p.product_images?.[0]?.url
                    ?? p.image_url;
                  const variantPrices = (p.product_variants ?? []).map((v) => v.price_cents);
                  const priceLabel = variantPrices.length > 0
                    ? (Math.min(...variantPrices) === Math.max(...variantPrices)
                      ? formatMoney(Math.min(...variantPrices), p.currency)
                      : `From ${formatMoney(Math.min(...variantPrices), p.currency)}`)
                    : formatMoney(p.price_cents, p.currency);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          navigate({ to: "/product/$slug", params: { slug: p.slug } });
                          setOpen(false);
                          setQuery("");
                          onNavigate?.();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent"
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
                        <p className="flex-shrink-0 text-sm font-semibold">
                          {priceLabel}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={goToResults}
                className="w-full border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-accent"
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
