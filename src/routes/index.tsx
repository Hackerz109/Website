import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Zap, PackageCheck, ShieldCheck, ToggleLeft, Fan, Cable, Plug } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard } from "@/components/ProductCard";
import { BrandsStrip } from "@/components/BrandsStrip";
import { CouponShowcase } from "@/components/CouponShowcase";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary), product_variants(price_cents, stock), categories(name, slug)")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const products = data ?? [];
  // products.category doesn't exist on the table — category is a joined
  // relation (category_id -> categories.{name,slug}) — so we dedupe on
  // slug (what the /category/$name route actually filters by) while
  // keeping the display name alongside it.
  const categories = Array.from(
    new Map(
      products
        .map((p) => p.categories)
        .filter((c): c is { name: string; slug: string } => !!c)
        .map((c) => [c.slug, c]),
    ).values(),
  );

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
                <a href="#products">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop the catalog
                </a>
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
        <div className="mb-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">The collection</h2>
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

/** Signature element: a large, continuous loop of current flowing through
 *  all four categories at once — not boxed into a small bordered widget,
 *  just floating directly in the hero. A soft comet of light travels the
 *  loop forever; each category's icon and label brighten as the current
 *  passes near it. No taps, no toy interactions — a big, atmospheric
 *  piece rather than a diagram. */
function HeroPanel() {
  const nodes = [
    { icon: ToggleLeft, label: "Switches", left: 22.7, top: 25.1, delay: "0s" },
    { icon: Fan, label: "Fans", left: 77.3, top: 25.1, delay: "1.5s" },
    { icon: Plug, label: "Fittings", left: 77.3, top: 74.9, delay: "3s" },
    { icon: Cable, label: "Wires", left: 22.7, top: 74.9, delay: "4.5s" },
  ];

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md md:max-w-lg">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: "radial-gradient(55% 55% at 50% 50%, var(--brass), transparent 70%)", filter: "blur(60px)" }}
      />

      <svg viewBox="0 0 440 340" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="loop-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="220" cy="170" rx="170" ry="120" fill="none" stroke="var(--color-brass)" strokeOpacity="0.14" strokeWidth="1.5" />
        <ellipse
          cx="220" cy="170" rx="170" ry="120" pathLength="1" fill="none" stroke="var(--color-copper-bright)"
          strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.22 1"
          className="loop-flow" filter="url(#loop-glow)"
        />
        <ellipse
          cx="220" cy="170" rx="170" ry="120" pathLength="1" fill="none" stroke="var(--color-brass-soft)"
          strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0.05 1"
          className="loop-flow" filter="url(#loop-glow)"
        />
      </svg>

      {nodes.map(({ icon: Icon, label, left, top, delay }) => (
        <div
          key={label}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          <Icon className="category-label h-5 w-5 text-brass sm:h-6 sm:w-6" style={{ animationDelay: delay }} />
          <span
            className="category-label font-mono text-[10px] font-medium tracking-[0.18em] text-porcelain/70 sm:text-[11px]"
            style={{ animationDelay: delay }}
          >
            {label.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
