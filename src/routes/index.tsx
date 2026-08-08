import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Zap, PackageCheck, ShieldCheck, ToggleLeft, Fan, Cable, Plug, LayoutGrid } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { BrandsStrip } from "@/components/BrandsStrip";
import { CouponShowcase } from "@/components/CouponShowcase";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  // A curated preview, not the full catalog — the whole point is to keep
  // the homepage from growing every time a product's added. Featured items
  // (see the "featured" toggle in the admin product editor) surface first;
  // newest fills the rest. The full, filterable list lives at /collections.
  const PREVIEW_COUNT = 8;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "public", "preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary, variant_id), product_variants(price_cents, stock, stock_unlimited), categories(name, slug)")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PREVIEW_COUNT);
      if (error) throw error;
      return data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "hero-chips"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const products = data ?? [];
  const categories = categoriesData ?? [];

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <section className="relative overflow-hidden bg-obsidian">
        <div className="pointer-events-none absolute inset-0 bg-glow-mesh" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:gap-12 md:py-28">
          <div className="reveal-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-porcelain/15 bg-porcelain/5 px-3 py-1 text-xs font-medium text-porcelain/70 backdrop-blur-sm">
              <span className="spark-dot h-1.5 w-1.5 rounded-full bg-brass" />
              Live stock, every category
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-porcelain md:text-6xl">
              Genuine electrical,
              <br />
              <span className="text-brass-soft">wired for trust.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-porcelain/65 md:text-lg">
              Switches, fans, wiring, and fittings from the brands you already trust —
              honest stock levels, clear warranty terms, and a checkout that takes minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-xl shadow-soft-lg">
                <Link to="/collections">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop the catalog
                </Link>
              </Button>
            </div>
            {categories.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {categories.slice(0, 6).map((c) => (
                  <Link
                    key={c.slug}
                    to="/category/$name"
                    params={{ name: c.slug }}
                    className="rounded-lg border border-porcelain/15 bg-porcelain/5 px-3 py-1.5 text-xs font-medium text-porcelain/75 backdrop-blur-sm transition-colors hover:border-brass/60 hover:bg-porcelain/10 hover:text-brass-soft"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative mt-2 md:mt-0">
            <HeroPanel />
          </div>
        </div>

        <div className="seam-fade-down pointer-events-none absolute inset-x-0 bottom-0 h-36" />
      </section>

      <div className="hairline-copper-dim" />

      <CouponShowcase />

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-3">
          {[
            { icon: PackageCheck, title: "Real-time stock", desc: "See exactly what's available before you order" },
            { icon: Zap, title: "Every category", desc: "Wiring, switches, fans, fittings & more" },
            { icon: ShieldCheck, title: "Secure, worry-free checkout", desc: "Encrypted payment and clear warranty details on every order" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-soft">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-copper">
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

      <BrandsStrip />

      <section id="products" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Featured picks</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">A few of what's in stock right now.</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/collections">
              <LayoutGrid className="mr-2 h-4 w-4" /> View all products
            </Link>
          </Button>
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
            <h3 className="text-lg font-semibold">New arrivals on the way</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              We're setting up the shelves. Check back soon, or sign in as admin to add
              your first product from the dashboard.
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

      <StoreFooter />
    </div>
  );
}

/** Signature element: a floating instrument panel showing the shop's
 *  categories, wired together by a live schematic. Thin brass traces
 *  carry a travelling copper spark between nodes on a loop — current,
 *  literally flowing, standing in for what the shop actually sells. */
function HeroPanel() {
  // SMIL animations (animateMotion / animate) aren't covered by the CSS
  // prefers-reduced-motion rules below, so gate them here explicitly.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const nodes = [
    { icon: ToggleLeft, label: "Switches", x: 60, y: 46 },
    { icon: Fan, label: "Fans", x: 300, y: 30 },
    { icon: Cable, label: "Wires", x: 50, y: 210 },
    { icon: Plug, label: "Fittings", x: 290, y: 220 },
  ];

  // Rounded bends (via quadratic curves) rather than hard right angles —
  // reads like a smooth PCB trace instead of a sharp schematic corner.
  const paths = [
    { d: "M 95 60 H 172 Q 190 60 190 78 V 130", delay: "0s" },
    { d: "M 285 55 H 208 Q 190 55 190 73 V 130", delay: "0.8s" },
    { d: "M 90 220 H 172 Q 190 220 190 202 V 130", delay: "1.6s" },
    { d: "M 275 230 H 208 Q 190 230 190 212 V 130", delay: "2.4s" },
  ];

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-sm rounded-3xl bg-gradient-to-br from-brass/50 via-copper/20 to-transparent p-[1px] shadow-soft-lg md:max-w-md">
      <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-obsidian-deep">
        <svg viewBox="0 0 380 280" className="absolute inset-0 h-full w-full">
          <defs>
            <filter id="spark-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {paths.map((p) => (
            <path key={`base-${p.d}`} d={p.d} fill="none" stroke="var(--color-brass)" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <circle cx="190" cy="130" r="4" fill="var(--color-brass)" filter="url(#spark-glow)" />

          {!reduceMotion && paths.map((p) => (
            <path
              key={`pulse-${p.d}`}
              d={p.d} fill="none" stroke="var(--color-copper-bright)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              pathLength="1" className="current-pulse" style={{ animationDelay: p.delay }}
            />
          ))}

          {!reduceMotion && paths.map((p) => (
            <circle key={`dot-${p.d}`} r="2.6" fill="var(--color-brass-soft)" filter="url(#spark-glow)">
              <animateMotion path={p.d} dur="3.2s" repeatCount="indefinite" begin={p.delay} />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.1;0.65;1"
                dur="3.2s"
                repeatCount="indefinite"
                begin={p.delay}
              />
            </circle>
          ))}
        </svg>

        {/* Positioned as a % of the panel, matching the SVG viewBox (380x280)
            proportionally — so nodes stay locked to the wire endpoints at
            any panel size, from a small phone up to the desktop column. */}
        {nodes.map(({ icon: Icon, label, x, y }) => (
          <div
            key={label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 sm:gap-1.5"
            style={{ left: `${(x / 380) * 100}%`, top: `${(y / 280) * 100}%` }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brass/30 bg-obsidian text-brass shadow-[0_0_16px_-4px_var(--color-brass)] sm:h-11 sm:w-11">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="rounded-full bg-brass px-1.5 py-0.5 font-mono text-[9px] font-semibold text-obsidian sm:px-2 sm:text-[10px]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
