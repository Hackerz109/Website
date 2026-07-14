import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, ShoppingBag } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { supabase } from "@/integrations/supabase/client";

function sanitize(q: string) {
  return q.replace(/[%,()]/g, " ").trim();
}

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = sanitize(q);

  const { data, isLoading } = useQuery({
    queryKey: ["search-results", term],
    queryFn: async () => {
      const like = `%${term}%`;
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary), product_variants(price_cents, stock)")
        .eq("active", true)
        .or(`name.ilike.${like},category.ilike.${like},brand.ilike.${like},description.ilike.${like}`)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: term.length > 0,
  });

  const products = data ?? [];

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
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
