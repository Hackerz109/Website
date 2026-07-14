import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Zap, PackageCheck, ShieldCheck } from "lucide-react";
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
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="reveal-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-charge px-3 py-1 text-xs font-bold text-charge-foreground">
              <Zap className="h-3 w-3 fill-current" /> Everything electrical, in one place
            </span>
            <h1 className="mt-6 text-5xl leading-[0.95] text-foreground md:text-7xl">
              Power your
              <br />
              <span className="highlight-mark">whole place.</span>
            </h1>
            <p className="mt-6 max-w-md text-base font-medium text-muted-foreground md:text-lg">
              Switches, fans, wires, fittings — every electrical essential in stock, with live
              counts so you never guess.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full text-base font-bold">
                <a href="#products">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop now
                </a>
              </Button>
            </div>
            {categories.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {categories.slice(0, 6).map((c) => (
                  <a
                    key={c}
                    href="#products"
                    className="rounded-full border-2 border-foreground/10 bg-card px-3 py-1 text-xs font-bold text-foreground hover:border-primary"
                  >
                    {c}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="relative mx-auto hidden aspect-square w-full max-w-md items-center justify-center md:flex">
            <div className="absolute h-[85%] w-[85%] -rotate-6 rounded-[2.5rem] bg-charge shadow-[10px_10px_0_var(--color-foreground)]" />
            <span className="absolute -left-2 top-6 h-10 w-10 rounded-full bg-destructive shadow-[4px_4px_0_var(--color-foreground)]" />
            <span className="absolute -right-4 bottom-16 h-16 w-16 rotate-12 rounded-2xl bg-card shadow-[4px_4px_0_var(--color-foreground)]" />
            <Zap
              className="relative h-40 w-40 rotate-6 fill-primary text-foreground drop-shadow-[6px_6px_0_var(--color-foreground)]"
              strokeWidth={1.5}
              style={{ animation: "float 3.4s ease-in-out infinite" }}
            />
          </div>
        </div>
      </section>

      <section className="border-y-2 border-foreground/10 bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-3">
          {[
            { icon: PackageCheck, bg: "bg-primary text-foreground", title: "Live stock counts", desc: "Know what's in stock before you order" },
            { icon: Zap, bg: "bg-charge text-charge-foreground", title: "Every category", desc: "Wires, switches, fans, fittings & more" },
            { icon: ShieldCheck, bg: "bg-destructive text-destructive-foreground", title: "Secure checkout", desc: "Encrypted payment on every order" },
          ].map(({ icon: Icon, bg, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${bg}`}>
                <Icon className="h-5 w-5 fill-current" />
              </span>
              <div>
                <p className="font-display text-sm">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10">
          <h2 className="text-3xl text-foreground md:text-4xl">The collection</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {products.length > 0
              ? `${products.length} product${products.length !== 1 ? "s" : ""} available`
              : "Fresh arrivals coming soon"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-2xl bg-secondary" />
                <div className="mt-4 h-4 w-2/3 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border-2 border-foreground/10 bg-card p-12 text-center text-sm text-muted-foreground">
            Couldn't load products right now.
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-foreground/15 bg-card p-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg">No products yet</h3>
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

      <footer className="border-t-2 border-foreground/10 bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-foreground">
              <Zap className="h-4 w-4 fill-current" />
            </span>
            <p className="font-display text-sm">My Shop</p>
          </div>
          <p className="text-xs font-medium text-background/60">
            © {new Date().getFullYear()} My Shop — All rights reserved
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(6deg); }
          50% { transform: translateY(-10px) rotate(6deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
