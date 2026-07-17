import { Link } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_images?: { url: string; is_primary: boolean }[];
  product_variants?: { price_cents: number; stock: number }[];
  categories?: { name: string } | null;
  brands?: { name: string } | null;
};

export function ProductCard({ product }: { product: Product }) {
  const images = product.product_images ?? [];
  const variants = product.product_variants ?? [];
  const primaryImage = images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? product.image_url;

  const outOfStock = variants.length > 0
    ? variants.every((v) => v.stock <= 0)
    : product.stock <= 0;

  let priceLabel: string;
  if (variants.length > 0) {
    const prices = variants.map((v) => v.price_cents);
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

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block rounded-2xl transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow duration-300 group-hover:shadow-soft-lg">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-xs font-medium text-muted-foreground">No image</span>
          </div>
        )}

        {product.featured && (
          <div className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-soft">
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
          <p className="text-[11px] font-medium text-primary">{product.categories.name}</p>
        )}
        <h3 className="mt-0.5 truncate text-sm font-medium text-foreground">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1.5">
          <p className="text-base font-bold text-foreground">{priceLabel}</p>
          {hasDiscount && (
            <>
              <p className="text-xs text-muted-foreground line-through">{formatMoney(product.mrp_cents!, product.currency)}</p>
              <p className="text-xs font-semibold text-green-600">{discountPct}% off</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
