import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_images?: { url: string; is_primary: boolean; variant_id?: string | null }[];
  product_variants?: { id?: string; name?: string; price_cents: number; stock: number; stock_unlimited?: boolean }[];
  categories?: { name: string } | null;
  brands?: { name: string } | null;
};

type MatchedVariant = { id: string; name: string; price_cents: number; image: string | null };

export function ProductCard({
  product,
  matchedVariants = [],
  loading = "lazy",
}: {
  product: Product;
  /** Variants whose own name/SKU matched the current search term (see
   * matchingVariants() in productSearch.ts) — rendered as small clickable
   * "sub-product" chips under the name, so a search like "white" visibly
   * shows *which* option matched instead of just the parent product. Only
   * the search results page has a term to match against, so every other
   * caller (home, category, collections) simply omits this prop. */
  matchedVariants?: MatchedVariant[];
  /** Defaults to lazy — right for any grid that sits below other content
   * (like the homepage's "Featured picks"). Pass "eager" for cards you
   * know render above the fold (e.g. the first row on a collection/category
   * page), so that image isn't needlessly deferred and delaying it doesn't
   * risk becoming the page's own LCP bottleneck. */
  loading?: "lazy" | "eager";
}) {
  // Generic/product-level photo: prefer the shared/universal gallery
  // (variant_id null) — the same photo every variant shows on its own page
  // too. Only when a product has NO shared images at all (increasingly
  // common now that images can be uploaded straight to a variant) do we
  // fall back to some variant's photo rather than showing nothing — any
  // variant's primary/first image beats a blank "No image" card. Used as
  // the card's default hero image, and as the fallback for any matched
  // variant chip below that has no dedicated photo of its own.
  const allImages = product.product_images ?? [];
  const sharedImages = allImages.filter((i) => !i.variant_id);
  const variantImages = allImages.filter((i) => i.variant_id);
  const variants = product.product_variants ?? [];
  const genericImage = sharedImages.find((i) => i.is_primary)?.url
    ?? sharedImages[0]?.url
    ?? variantImages.find((i) => i.is_primary)?.url
    ?? variantImages[0]?.url
    ?? product.image_url;

  // When the search matched a specific variant, show *that* variant's own
  // photo as the card's hero image instead of the product's generic one —
  // searching "white" should actually show white, not whatever the first
  // uploaded photo happens to be. Falls back to the generic image above
  // when the matched variant has no dedicated photo of its own.
  const primaryImage = matchedVariants[0]?.image ?? genericImage;

  const outOfStock = variants.length > 0
    ? variants.every((v) => !v.stock_unlimited && v.stock <= 0)
    : !product.stock_unlimited && product.stock <= 0;

  // Price shown next to the name: scoped to whichever variants are actually
  // relevant. A matched search term narrows this to just the variant(s)
  // that matched (so "white" on a 5-variant product prices only the white
  // ones, not the full White+Black+... range) — otherwise it falls back to
  // the product's full variant range, then the bare product price.
  const pricedVariants: { price_cents: number }[] = matchedVariants.length > 0 ? matchedVariants : variants;
  let priceLabel: string;
  if (pricedVariants.length > 0) {
    const prices = pricedVariants.map((v) => v.price_cents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    priceLabel = min === max
      ? formatMoney(min, product.currency)
      : `From ${formatMoney(min, product.currency)}`;
  } else {
    priceLabel = formatMoney(product.price_cents, product.currency);
  }

  // MRP comparison only applies cleanly to simple (non-variant) products —
  // a single "was/now" line doesn't make sense once prices vary by option.
  const hasDiscount = variants.length === 0 && !!product.mrp_cents && product.mrp_cents > product.price_cents;
  const discountPct = hasDiscount
    ? Math.round(((product.mrp_cents! - product.price_cents) / product.mrp_cents!) * 100)
    : 0;

  // The image/name link jumps straight to the best-matched variant (if the
  // search matched any) instead of the product's default, since that's the
  // specific option the person was actually looking for. Chips render
  // outside this <Link> (never nested inside it — nested <a> tags are
  // invalid HTML) so each option is independently clickable too.
  const primaryVariantId = matchedVariants[0]?.id;
  const shownChips = matchedVariants.slice(0, 3);
  const extraMatchCount = matchedVariants.length - shownChips.length;

  return (
    <div className="cv-auto">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        search={primaryVariantId ? { variant: primaryVariantId } : {}}
        className="group block rounded-2xl transition-transform duration-300 ease-out hover:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 ease-out group-hover:shadow-soft-lg group-hover:ring-1 group-hover:ring-copper/30">
          {primaryImage ? (
            // object-contain, not object-cover: matches the product detail
            // page's own choice (see product.$slug.tsx) to never crop into
            // the product. A forced square + cover was cutting off parts of
            // any photo that wasn't already square — this letterboxes
            // instead, on the same card background, so the whole product is
            // always visible here too.
            <img
              src={primaryImage}
              alt={product.name}
              loading={loading}
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="text-xs font-medium text-muted-foreground">No image</span>
            </div>
          )}

          {product.featured && (
            <div className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-soft">
              Featured
            </div>
          )}
          {outOfStock && (
            <div className="absolute left-2.5 top-2.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-soft">
              Sold out
            </div>
          )}
        </div>
        <div className="mt-3">
          {product.categories?.name && (
            <p className="text-[11px] font-medium uppercase tracking-wide text-copper">{product.categories.name}</p>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-base font-semibold leading-snug text-foreground">{product.name}</h3>
          {product.warranty_available && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-copper/80">
              <ShieldCheck className="h-3 w-3" /> Warranty included
            </p>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <p className="font-mono text-base font-semibold text-foreground">{priceLabel}</p>
            {hasDiscount && (
              <>
                <p className="font-mono text-xs text-muted-foreground line-through">{formatMoney(product.mrp_cents!, product.currency)}</p>
                <p className="text-xs font-semibold text-success">{discountPct}% off</p>
              </>
            )}
          </div>
        </div>
      </Link>

      {shownChips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {shownChips.map((v) => {
            const chipImage = v.image ?? genericImage;
            return (
              <Link
                key={v.id}
                to="/product/$slug"
                params={{ slug: product.slug }}
                search={{ variant: v.id }}
                title={v.name}
                className="flex max-w-[52%] items-center gap-1.5 rounded-full border border-border bg-accent/70 py-1 pl-1 pr-2.5 text-[11px] font-medium text-accent-foreground transition-colors hover:border-copper/50 hover:bg-accent sm:max-w-[136px]"
              >
                <span className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full border border-border/60 bg-secondary">
                  {chipImage && (
                    <img src={chipImage} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 truncate">{v.name}</span>
              </Link>
            );
          })}
          {extraMatchCount > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">+{extraMatchCount} more</span>
          )}
        </div>
      )}
    </div>
  );
}
