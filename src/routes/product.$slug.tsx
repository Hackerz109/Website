import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ArrowLeft, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { WarrantyCard } from "@/components/WarrantyCard";
import { AvailableOffers } from "@/components/AvailableOffers";
import { BulkPricingTable } from "@/components/BulkPricingTable";
import { QuantityInput } from "@/components/QuantityInput";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatMoney } from "@/stores/cart";
import { fetchBulkTiers, tiersForLine, bestTierFor, tierUnitPriceCents, nextTierHint, describeTierDiscount } from "@/lib/bulkPricing";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  validateSearch: (search: Record<string, unknown>) => ({
    variant: typeof search.variant === "string" ? search.variant : undefined,
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button
          className="mt-4"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Try again
        </Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8 text-center">Product not found</div>,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { variant: variantParam } = Route.useSearch();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [frameRatio, setFrameRatio] = useState(1);
  const frameRatioLockedRef = useRef(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(id, url, is_primary, sort_order, variant_id), product_variants(id, name, price_cents, mrp_cents, stock, stock_unlimited, sku, sort_order), categories(name, slug), brands(name)")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Bulk ("buy more, save more") tiers for this product. Fetched
  // separately from the main product query since it's public catalog data
  // (see the RLS policy in the migration) and rarely changes, so it's fine
  // to cache independently.
  const { data: bulkTiersByProduct } = useQuery({
    queryKey: ["bulk-tiers", product?.id],
    queryFn: () => fetchBulkTiers(product ? [product.id] : []),
    enabled: !!product?.id,
  });

  const variants = [...(product?.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;

  // Tiers are scoped to whichever pricing entity is actually selling this
  // line — the chosen variant's own ladder, or the product-level one when
  // there are no variants. Mirrors the scoping resolve_bulk_unit_price_cents()
  // applies server-side (see the migration), so a variant never shows
  // another variant's — or the bare product's — tiers.
  const bulkTiers = product
    ? tiersForLine(bulkTiersByProduct?.[product.id] ?? [], hasVariants ? selectedVariant?.id ?? null : null)
    : [];

  // Every variant shows its own photos first, followed by the product's
  // shared gallery (variant_id null) appended after — shared images are
  // "universal": add one once and it shows for every variant, always,
  // not just when a variant happens to have none of its own. A variant
  // with no photos of its own just shows the shared gallery on its own.
  const allImages = product?.product_images ?? [];
  const sortImages = (arr: typeof allImages) =>
    [...arr].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  const variantImages = hasVariants && selectedVariant
    ? sortImages(allImages.filter((i) => i.variant_id === selectedVariant.id))
    : [];
  const sharedImages = sortImages(allImages.filter((i) => i.variant_id === null));
  const images = [...variantImages, ...sharedImages];

  const gallery = images.length > 0
    ? images.map((i) => i.url)
    : product?.image_url
      ? [product.image_url]
      : [];
  const mainImage = activeImage ?? gallery[0] ?? null;

  // Reset zoom whenever a different image is shown
  useEffect(() => {
    setZoomed(false);
  }, [mainImage]);

  // Size the frame once per product, from whichever photo loads first — not on
  // every thumbnail tap. Re-measuring per image is what caused the page to
  // grow/shrink and jump around when switching between a product's photos.
  useEffect(() => {
    frameRatioLockedRef.current = false;
    setFrameRatio(1);
  }, [product?.id]);

  // A variant switch can bring in a differently-shaped set of photos (its
  // own images, not the shared gallery) — unlock so the frame re-measures.
  // Unlike the product-load reset above, don't snap back to square first;
  // the frame just holds its current shape until the new image loads.
  useEffect(() => {
    frameRatioLockedRef.current = false;
  }, [selectedVariant?.id]);

  // Let the frame roughly match the product's own photo shape, so it isn't
  // always a plain square — but clamp it so a very tall or very wide photo
  // doesn't stretch the page layout into something awkward. The image
  // itself is shown with object-contain (see below), so unlike the old
  // object-cover approach, going outside this clamp just means a bit more
  // visible letterboxing on the sides — never a crop into the product.
  function handleMainImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    if (frameRatioLockedRef.current) return;
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    frameRatioLockedRef.current = true;
    setFrameRatio(Math.min(2.2, Math.max(0.45, w / h)));
  }

  // Close the lightbox on Escape, and lock background scroll while it's open
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen]);

  // Reset local selection state whenever a different product loads. Prefer a
  // ?variant= deep link (e.g. from a search result for a specific variant)
  // when it names a real variant of this product; otherwise fall back to the
  // default (first variant). Also re-checked if just the param changes while
  // staying on the same product, e.g. clicking between two variant search
  // results for that product without a full page reload.
  useEffect(() => {
    setActiveImage(null);
    setVariantId(variantParam && variants.some((v) => v.id === variantParam) ? variantParam : null);
    setQtyState(1);
  }, [product?.id, variantParam]);

  const price = hasVariants ? selectedVariant?.price_cents ?? 0 : product?.price_cents ?? 0;
  const stock = hasVariants ? selectedVariant?.stock ?? 0 : product?.stock ?? 0;
  // "Unlimited" always wins over the raw stock number — it's how a
  // product/variant that should never show as sold out (see the admin
  // product form) stays purchasable regardless of what `stock` happens
  // to hold.
  const unlimited = hasVariants ? selectedVariant?.stock_unlimited ?? false : product?.stock_unlimited ?? false;
  const canAdd = hasVariants ? !!selectedVariant && (unlimited || stock > 0) : unlimited || stock > 0;

  const activeMrpCents = hasVariants ? selectedVariant?.mrp_cents ?? null : product?.mrp_cents ?? null;
  const hasDiscount = !!activeMrpCents && activeMrpCents > price;
  const discountPct = hasDiscount
    ? Math.round(((activeMrpCents! - price) / activeMrpCents!) * 100)
    : 0;
  const specs = Array.isArray(product?.specifications)
    ? (product!.specifications as { key: string; value: string }[]).filter((s) => s.key || s.value)
    : [];

  // An unlimited item has no real ceiling, but the qty stepper still needs
  // some cap so the UI (and a stray tap-and-hold) can't run away to an
  // absurd number.
  const UNLIMITED_QTY_CAP = 99;
  const maxQty = unlimited ? UNLIMITED_QTY_CAP : Math.max(stock, 1);

  const [qty, setQtyState] = useState(1);
  // Keep quantity within [1, maxQty] whenever the selected variant (or its stock/unlimited flag) changes
  useEffect(() => {
    setQtyState((q) => Math.min(Math.max(q, 1), maxQty));
  }, [stock, unlimited]);
  // Bulk tiers apply against whichever price is actually in force for this
  // line (the selected variant's price, or the product's own) — same rule
  // the server enforces in resolve_bulk_unit_price_cents().
  const activeTier = bestTierFor(bulkTiers, qty);
  const effectiveUnitPrice = tierUnitPriceCents(price, bulkTiers, qty);
  const nextTier = nextTierHint(bulkTiers, qty);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Go back to wherever the shopper actually came from — the
            // collection/category/search page with its filters, sort and
            // scroll position all intact (scrollRestoration in router.tsx
            // handles restoring the scroll on this pop). Previously this
            // was a hardcoded Link to "/", which always dropped the
            // shopper back at the homepage no matter where they'd been
            // browsing. Only fall back to home when there's genuinely no
            // in-app history to go back to, e.g. the product page was
            // opened directly from a shared link in a new tab.
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.history.back();
            } else {
              router.navigate({ to: "/" });
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {isLoading ? (
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-md bg-secondary/60" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-secondary/60" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-secondary/60" />
            </div>
          </div>
        ) : !product ? (
          <div className="mt-12 text-center text-muted-foreground">Product not found.</div>
        ) : (
          <>
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div className="min-w-0">
              {mainImage ? (
                <div
                  className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-soft"
                  style={{ aspectRatio: frameRatio }}
                >
                  <img
                    src={mainImage}
                    alt={product.name}
                    onClick={() => setLightboxOpen(true)}
                    onLoad={handleMainImageLoad}
                    className="h-full w-full cursor-zoom-in object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-square w-full rounded-2xl border border-border bg-secondary/40 shadow-soft" />
              )}
              {gallery.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {gallery.map((url) => (
                    <button
                      key={url}
                      onClick={() => setActiveImage(url)}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 ${
                        (mainImage === url) ? "border-primary" : "border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0">

              {(product.brands?.name || product.categories?.name) && (
                <p className="text-xs font-semibold text-primary">
                  {product.brands?.name}
                  {product.brands?.name && product.categories?.name ? " · " : ""}
                  {product.categories?.name && (
                    <Link
                      to="/category/$name"
                      params={{ name: product.categories.slug }}
                      className="hover:underline"
                    >
                      {product.categories.name}
                    </Link>
                  )}
                </p>
              )}
              <h1 className="mt-1 break-words text-3xl font-extrabold tracking-tight">{product.name}</h1>
              <div className="mt-3 flex items-center gap-2">
                <p className="text-2xl font-bold">{formatMoney(effectiveUnitPrice, product.currency)}</p>
                {hasDiscount && (
                  <>
                    <p className="text-sm text-muted-foreground line-through">{formatMoney(activeMrpCents!, product.currency)}</p>
                    <p className="text-sm font-semibold text-green-600">{discountPct}% off</p>
                  </>
                )}
              </div>
              {activeTier && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Bulk price applied
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(price, product.currency)}/unit normally — {describeTierDiscount(activeTier, product.currency)} for {qty}+ units
                  </span>
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {unlimited
                  ? "In stock"
                  : stock > 0
                    ? product.show_stock_count
                      ? `${stock} in stock`
                      : "In stock"
                    : "Sold out"}
                {hasVariants && selectedVariant?.sku ? ` · SKU ${selectedVariant.sku}` : ""}
                {!hasVariants && product.sku ? ` · SKU ${product.sku}` : ""}
              </p>

              <div className="my-6 h-px bg-border" />

              {hasVariants && (
                <div className="mb-6">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Choose an option</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setVariantId(v.id);
                          setActiveImage(null);
                        }}
                        disabled={!v.stock_unlimited && v.stock <= 0}
                        className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selectedVariant?.id === v.id
                            ? "border-primary bg-primary text-primary-foreground shadow-soft"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {v.name}
                        {!v.stock_unlimited && v.stock <= 0 ? " (sold out)" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.description && (
                <p className="mt-6 whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}

              {specs.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold">Specifications</p>
                  <div className="overflow-hidden rounded-xl border border-border">
                    {specs.map((s, i) => (
                      <div
                        key={i}
                        className={`flex justify-between gap-4 px-4 py-2 text-sm ${i % 2 === 1 ? "bg-secondary/40" : ""}`}
                      >
                        <span className="text-muted-foreground">{s.key}</span>
                        <span className="text-right font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <WarrantyCard product={product} />
              <AvailableOffers productId={product.id} categoryId={product.category_id} brandId={product.brand_id} />
              <BulkPricingTable tiers={bulkTiers} basePriceCents={price} currency={product.currency} currentQty={qty} />

              {canAdd && (
                <div className="mt-6 flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground">Qty</p>
                  <QuantityInput value={qty} min={1} max={maxQty} onChange={setQtyState} />
                  {!unlimited && product.show_stock_count && (
                    <span className="text-xs text-muted-foreground">{stock} available</span>
                  )}
                </div>
              )}

              {canAdd && nextTier && nextTier.unitsNeeded <= maxQty - qty && (
                <p className="mt-2 text-xs font-medium text-primary">
                  Add {nextTier.unitsNeeded} more to unlock {describeTierDiscount(nextTier.tier, product.currency)} ({nextTier.tier.min_qty}+ units)
                </p>
              )}

              {canAdd && qty > 1 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Total for {qty}: <span className="font-semibold text-foreground">{formatMoney(effectiveUnitPrice * qty, product.currency)}</span>
                </p>
              )}

              <Button
                className="mt-4 w-full rounded-xl text-base font-semibold shadow-soft"
                size="lg"
                disabled={!canAdd}
                onClick={() => {
                  add(
                    {
                      id: product.id,
                      name: hasVariants && selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
                      slug: product.slug,
                      price_cents: price,
                      image_url: mainImage,
                      stock,
                      unlimited,
                      variantId: hasVariants ? selectedVariant?.id ?? null : null,
                      variantName: hasVariants ? selectedVariant?.name ?? null : null,
                      sku: hasVariants ? selectedVariant?.sku ?? null : null,
                      category_id: product.category_id ?? null,
                      brand_id: product.brand_id ?? null,
                    },
                    qty,
                  );
                  toast.success(qty > 1 ? `Added ${qty} to cart` : "Added to cart");
                  setQtyState(1);
                }}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {canAdd ? "Add to cart" : "Sold out"}
              </Button>
            </div>
          </div>

          {lightboxOpen && mainImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
              <div
                className="max-h-full max-w-full overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={mainImage}
                  alt={product.name}
                  onClick={() => setZoomed((z) => !z)}
                  className={
                    zoomed
                      ? "max-w-none cursor-zoom-out"
                      : "max-h-[92vh] max-w-[92vw] cursor-zoom-in object-contain"
                  }
                />
              </div>
            </div>
          )}
          </>
        )}
      </div>
      <StoreFooter />
    </div>
  );
}
