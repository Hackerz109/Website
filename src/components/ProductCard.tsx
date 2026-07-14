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
      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-secondary/40">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="spec-label text-[10px] text-muted-foreground">No image</span>
          </div>
        )}

        {/* corner brackets — appear on hover, like a viewfinder focus */}
        {[
          "left-1.5 top-1.5 border-l border-t",
          "right-1.5 top-1.5 border-r border-t",
          "left-1.5 bottom-1.5 border-l border-b",
          "right-1.5 bottom-1.5 border-r border-b",
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute h-3 w-3 border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${pos}`}
          />
        ))}

        {product.featured && (
          <div className="spec-label absolute right-2 top-2 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
            Featured
          </div>
        )}
        {outOfStock && (
          <div className="spec-label absolute left-2 top-2 rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
            Sold out
          </div>
        )}
      </div>
      <div className="mt-3">
        {product.category && (
          <p className="spec-label text-[10px] text-muted-foreground">{product.category}</p>
        )}
        <h3 className="mt-0.5 text-sm font-medium text-foreground">{product.name}</h3>
        <p className="mt-1 font-mono text-sm text-foreground">{priceLabel}</p>
      </div>
    </Link>
  );
}
