import { Link } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock <= 0;
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary/60">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {outOfStock && (
          <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-xs font-medium">
            Sold out
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMoney(product.price_cents, product.currency)}
        </p>
      </div>
    </Link>
  );
}