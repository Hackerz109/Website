import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Ruler, PackageCheck, ShieldCheck } from "lucide-react";
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

      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bp-grid opacity-[0.5] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center bp-rise">
            <span className="spec-label inline-flex w-fit items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live inventory
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              Exact gauges.
              <br />
              Real stock.
              <br />
              No guesswork.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Every listing carries its own spec sheet — gauge, stock, and SKU — so what you order
              is exactly what you get.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#products">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Browse the catalog
                </a>
              </Button>
            </div>
          </div>

          <div className="relative hidden items-center justify-center md:flex">
            <HeroDiagram />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-3">
          {[
            { icon: Ruler, title: "Exact specs", desc: "Gauge, stock, and SKU on every listing" },
            { icon: PackageCheck, title: "Live stock counts", desc: "Numbers update in real time — no backorders" },
            { icon: ShieldCheck, title: "Secure checkout", desc: "Encrypted payment on every order" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-border bg-card text-primary">
                <Icon className="h-4 w-4" />
              </span>
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
          <p className="spec-label text-xs text-primary">Catalog</p>
          <div className="dim-line my-3 max-w-xs" />
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
                <div className="aspect-square rounded-md bg-secondary/60" />
                <div className="mt-4 h-4 w-2/3 rounded bg-secondary/60" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-md border border-border bg-secondary/30 p-12 text-center text-sm text-muted-foreground">
            Couldn't load products right now.
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-16 text-center">
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="font-display text-sm font-semibold">My Shop</p>
            <p className="spec-label mt-1 text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} My Shop — All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Signature element: an annotated wire cross-section, drawn in on load. */
function HeroDiagram() {
  return (
    <svg viewBox="0 0 400 400" className="h-full max-h-[420px] w-full max-w-[420px]">
      <line x1="200" y1="14" x2="200" y2="386" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 7" />
      <line x1="14" y1="200" x2="386" y2="200" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 7" />

      {/* insulation boundary */}
      <circle
        cx="200" cy="200" r="150" fill="none"
        stroke="var(--color-muted-foreground)" strokeWidth="1.25" pathLength="1"
        className="bp-draw-in"
        style={{ animationDelay: "0.1s" }}
      />

      {/* ambient current ring */}
      <circle
        cx="200" cy="200" r="112" fill="none"
        stroke="var(--color-primary)" strokeWidth="1" opacity="0.35"
        className="bp-current-line"
      />

      {/* conductor core */}
      <circle
        cx="200" cy="200" r="72" fill="var(--color-primary)"
        className="bp-rise" style={{ animationDelay: "0.85s" }}
      />
      <circle cx="178" cy="178" r="14" fill="var(--color-primary-foreground)" opacity="0.18" />

      {/* radius dimension line + label */}
      <g className="bp-rise" style={{ animationDelay: "1.3s" }}>
        <line x1="200" y1="200" x2="272" y2="200" stroke="var(--color-foreground)" strokeWidth="1" />
        <line x1="272" y1="195" x2="272" y2="205" stroke="var(--color-foreground)" strokeWidth="1" />
        <text x="215" y="192" fontSize="12" fontFamily="var(--font-mono)" fill="var(--color-foreground)">
          1.5mm²
        </text>
      </g>

      <g className="bp-rise" style={{ animationDelay: "1.55s" }}>
        <line x1="200" y1="63" x2="200" y2="50" stroke="var(--color-border)" strokeWidth="1" />
        <text
          x="200" y="42" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1"
          textAnchor="middle" fill="var(--color-muted-foreground)"
        >
          INSULATION
        </text>
      </g>

      <g className="bp-rise" style={{ animationDelay: "1.7s" }}>
        <text
          x="200" y="204" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1"
          textAnchor="middle" fill="var(--color-primary-foreground)"
        >
          CU
        </text>
      </g>
    </svg>
  );
}
