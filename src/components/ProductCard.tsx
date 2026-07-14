import { Link } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_images?: { url: string; is_primary: boolean }[];
  product_variants?: { price_cents: number; stock: number }[];
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

  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-foreground/10 bg-card transition-colors group-hover:border-primary">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-xs font-bold text-muted-foreground">No image</span>
          </div>
        )}

        {product.featured && (
          <div className="absolute right-2.5 top-2.5 rounded-full bg-charge px-2.5 py-1 text-[10px] font-extrabold uppercase text-charge-foreground shadow-[2px_2px_0_var(--color-foreground)]">
            Featured
          </div>
        )}
        {outOfStock && (
          <div className="absolute left-2.5 top-2.5 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-extrabold uppercase text-background">
            Sold out
          </div>
        )}
      </div>
      <div className="mt-3">
        {product.category && (
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-charge">{product.category}</p>
        )}
        <h3 className="mt-0.5 text-sm font-bold text-foreground">{product.name}</h3>
        <p className="mt-1 text-base font-extrabold text-foreground">{priceLabel}</p>
      </div>
    </Link>
  );
}
