import { useEffect, useState } from "react";
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

type Category = "switches" | "fans" | "wires" | "fittings";

const CATEGORY_TABS = [
  { id: "switches" as const, label: "Switches", icon: ToggleLeft },
  { id: "fans" as const, label: "Fans", icon: Fan },
  { id: "wires" as const, label: "Wires", icon: Cable },
  { id: "fittings" as const, label: "Fittings", icon: Plug },
];

/** Signature element: a small working control panel spanning all four
 *  categories, not just one product. Tap a tab, get a real, live demo for
 *  that category — a switch you actually flip, a fan you actually speed
 *  up, a wire you actually pulse, a fitting whose colour temperature
 *  actually shifts. Auto-tours through all four once on load (skipped
 *  under prefers-reduced-motion) so people see the range before touching
 *  anything, then hands control over the moment they tap a tab. */
function HeroPanel() {
  const [tab, setTab] = useState<Category>("switches");
  const [autoTour, setAutoTour] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAutoTour(false);
      return;
    }
    if (!autoTour) return;
    const order: Category[] = ["switches", "fans", "wires", "fittings"];
    let i = order.indexOf(tab);
    const id = setInterval(() => {
      i = (i + 1) % order.length;
      setTab(order[i]);
      if (i === order.length - 1) clearInterval(id);
    }, 1900);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTour]);

  function selectTab(id: Category) {
    setAutoTour(false);
    setTab(id);
  }

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-sm rounded-3xl bg-gradient-to-br from-brass/50 via-copper/20 to-transparent p-[1px] shadow-soft-lg md:max-w-md">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[inherit] bg-obsidian-deep">
        <div className="flex items-center justify-center gap-1.5 border-b border-porcelain/10 p-2.5">
          {CATEGORY_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={tab === id}
              onClick={() => selectTab(id)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${
                tab === id ? "bg-brass text-obsidian" : "text-brass/45 hover:text-brass"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <div className="relative flex-1 p-4 sm:p-5">
          {tab === "switches" && <SwitchDemo />}
          {tab === "fans" && <FanDemo />}
          {tab === "wires" && <WireDemo />}
          {tab === "fittings" && <FittingDemo />}
        </div>
      </div>
    </div>
  );
}

function SwitchDemo() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), 500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: "radial-gradient(45% 45% at 50% 40%, var(--brass), transparent 70%)",
          opacity: on ? 0.3 : 0.05,
        }}
      />
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        aria-label="Toggle demo switch"
        className="relative z-10 flex h-24 w-20 items-center justify-center rounded-2xl border border-brass/25 bg-obsidian shadow-soft-lg [perspective:400px] sm:h-28 sm:w-24"
      >
        <div
          className="h-[70%] w-[65%] rounded-xl bg-gradient-to-br from-brass-soft via-copper to-copper-bright shadow-soft transition-transform duration-200 ease-out"
          style={{ transform: on ? "rotateX(-16deg) translateY(3%)" : "rotateX(20deg) translateY(-3%)" }}
        >
          <span
            className="mx-auto mt-2.5 block h-1.5 w-1.5 rounded-full bg-brass-soft transition-opacity duration-200"
            style={{ opacity: on ? 1 : 0.25, boxShadow: on ? "0 0 6px 1.5px var(--brass)" : "none" }}
          />
        </div>
      </button>
      <p className="relative z-10 font-mono text-[9px] text-porcelain/40 sm:text-[10px]">
        {on ? "ON — tap to switch off" : "Tap the switch"}
      </p>
    </div>
  );
}

function FanDemo() {
  const [speed, setSpeed] = useState(3);
  const rpm = Math.round(180 + (speed - 1) * 50);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div
        className="fan-spin flex h-16 w-16 items-center justify-center rounded-full border border-brass/25 bg-obsidian text-brass shadow-soft sm:h-20 sm:w-20"
        style={{ animationDuration: `${2.6 / speed}s` }}
      >
        <Fan className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={speed}
        aria-label="Fan speed"
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="dimmer-slider w-2/3"
      />
      <p className="font-mono text-[9px] text-porcelain/40 sm:text-[10px]">Speed {speed}/5 · ~{rpm} RPM</p>
    </div>
  );
}

function WireDemo() {
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setPulseKey((k) => k + 1), 350);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="relative flex w-4/5 items-center justify-between">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-brass/25" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={`${pulseKey}-${i}`}
            className="wire-pulse-dot relative h-2.5 w-2.5 rounded-full bg-brass"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPulseKey((k) => k + 1)}
        className="rounded-full bg-brass px-4 py-1.5 font-mono text-[10px] font-semibold text-obsidian sm:text-[11px]"
      >
        Send current →
      </button>
      <p className="font-mono text-[9px] text-porcelain/40 sm:text-[10px]">2.5mm² copper · tap to test</p>
    </div>
  );
}

function FittingDemo() {
  const [warm, setWarm] = useState(true);
  const glow = warm ? "oklch(0.85 0.09 85)" : "oklch(0.90 0.02 240)";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div
        className="h-14 w-14 rounded-full transition-[background,box-shadow] duration-300 sm:h-16 sm:w-16"
        style={{ background: glow, boxShadow: `0 0 32px 8px ${glow}` }}
      />
      <div className="flex overflow-hidden rounded-full border border-brass/30">
        <button
          type="button"
          onClick={() => setWarm(true)}
          className={`px-3 py-1 font-mono text-[10px] transition-colors ${warm ? "bg-brass text-obsidian" : "text-porcelain/50"}`}
        >
          Warm
        </button>
        <button
          type="button"
          onClick={() => setWarm(false)}
          className={`px-3 py-1 font-mono text-[10px] transition-colors ${!warm ? "bg-brass text-obsidian" : "text-porcelain/50"}`}
        >
          Cool
        </button>
      </div>
      <p className="font-mono text-[9px] text-porcelain/40 sm:text-[10px]">{warm ? "2700K · Warm White" : "6500K · Cool Daylight"}</p>
    </div>
  );
}
