import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Zap, PackageCheck, ShieldCheck, ToggleLeft, Fan, Cable, Plug } from "lucide-react";
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

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-glow-mesh" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="reveal-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Live inventory, every category
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-6xl">
              Everything electrical,
              <br />
              <span className="text-primary">done right.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Switches, fans, wires, and fittings — one shop, real-time stock, and checkout in
              under a minute.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-xl shadow-soft">
                <a href="#products">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop the catalog
                </a>
              </Button>
            </div>
            {categories.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {categories.slice(0, 6).map((c) => (
                  <a
                    key={c}
                    href="#products"
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {c}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="relative hidden md:block">
            <HeroPanel />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-3">
          {[
            { icon: PackageCheck, title: "Live stock counts", desc: "Know what's in stock before you order" },
            { icon: Zap, title: "Every category", desc: "Wires, switches, fans, fittings & more" },
            { icon: ShieldCheck, title: "Secure checkout", desc: "Encrypted payment on every order" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-soft">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">The collection</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
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
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-soft">
            Couldn't load products right now.
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No products yet</h3>
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5 fill-current" />
            </span>
            <p className="font-display text-sm font-bold">My Shop</p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} My Shop — All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Signature element: a floating panel showing the shop's categories,
 *  linked by circuit-trace lines with an animated current pulse. */
function HeroPanel() {
  const nodes = [
    { icon: ToggleLeft, label: "Switches", x: 60, y: 46 },
    { icon: Fan, label: "Fans", x: 300, y: 30 },
    { icon: Cable, label: "Wires", x: 50, y: 210 },
    { icon: Plug, label: "Fittings", x: 290, y: 220 },
  ];

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md rounded-3xl border border-border bg-card p-2 shadow-soft-lg">
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-secondary/40">
        <svg viewBox="0 0 380 280" className="absolute inset-0 h-full w-full">
          <path d="M 95 60 H 190 V 130 H 190" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <path d="M 285 55 H 190 V 130" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <path d="M 90 220 H 190 V 130" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <path d="M 275 230 H 190 V 130" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <circle cx="190" cy="130" r="4" fill="var(--color-primary)" />

          <path
            d="M 95 60 H 190 V 130" fill="none" stroke="var(--color-primary)" strokeWidth="2"
            pathLength="1" className="trace-pulse" style={{ animationDelay: "0s" }}
          />
          <path
            d="M 90 220 H 190 V 130" fill="none" stroke="var(--color-primary)" strokeWidth="2"
            pathLength="1" className="trace-pulse" style={{ animationDelay: "1.8s" }}
          />
        </svg>

        {nodes.map(({ icon: Icon, label, x, y }) => (
          <div
            key={label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: x, top: y }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-soft">
              <Icon className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-medium text-background">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
