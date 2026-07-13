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
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary/60">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {product.featured && (
          <div className="absolute right-3 top-3 rounded-full bg-foreground/90 px-2 py-1 text-xs font-medium text-background">
            Featured
          </div>
        )}
        {outOfStock && (
          <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-xs font-medium">
            Sold out
          </div>
        )}
      </div>
      <div className="mt-3">
        {product.category && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.category}</p>
        )}
        <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>
      </div>
    </Link>
  );
}
