import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Truck, ShieldCheck, Sparkles } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary), product_variants(price_cents, stock)")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const products = data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <section className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Now open
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
              Everything from our shop, in one beautiful place.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Browse the collection, check availability in real time, and check out securely.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#products">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop the collection
                </a>
              </Button>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-secondary via-secondary/40 to-background" />
            <div className="relative flex h-full items-center justify-center">
              <div className="grid grid-cols-2 gap-4 p-6">
                {[0, 1, 2, 3].map((i) => {
                  const p = products[i];
                  return (
                    <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-background shadow-sm">
                      {p?.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-secondary/60" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-secondary/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Secure checkout", desc: "Your data stays yours" },
            { icon: Truck, title: "Fast delivery", desc: "Ships worldwide" },
            { icon: Sparkles, title: "Curated with care", desc: "Only what we love" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 text-foreground" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">The collection</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length > 0
              ? `${products.length} product${products.length !== 1 ? "s" : ""} available`
              : "Fresh arrivals coming soon"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-2xl bg-secondary/60" />
                <div className="mt-4 h-4 w-2/3 rounded bg-secondary/60" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-border bg-secondary/30 p-12 text-center text-sm text-muted-foreground">
            Couldn't load products right now.
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-medium">No products yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Sign in as admin and add your first product from the dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold">My Shop</p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} My Shop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}