import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatMoney } from "@/stores/cart";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
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
  const add = useCart((s) => s.add);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(id, url, is_primary, sort_order), product_variants(id, name, price_cents, stock, sku, sort_order)")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const images = [...(product?.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const variants = [...(product?.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;

  const gallery = images.length > 0
    ? images.map((i) => i.url)
    : product?.image_url
      ? [product.image_url]
      : [];
  const mainImage = activeImage ?? gallery[0] ?? null;

  // Reset local selection state whenever a different product loads
  useEffect(() => {
    setActiveImage(null);
    setVariantId(null);
  }, [product?.id]);

  const price = hasVariants ? selectedVariant?.price_cents ?? 0 : product?.price_cents ?? 0;
  const stock = hasVariants ? selectedVariant?.stock ?? 0 : product?.stock ?? 0;
  const canAdd = hasVariants ? !!selectedVariant && stock > 0 : stock > 0;

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>

        {isLoading ? (
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-2xl bg-secondary/60" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-secondary/60" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-secondary/60" />
            </div>
          </div>
        ) : !product ? (
          <div className="mt-12 text-center text-muted-foreground">Product not found.</div>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <div className="aspect-square overflow-hidden rounded-2xl bg-secondary/60">
                {mainImage ? (
                  <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              {gallery.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {gallery.map((url) => (
                    <button
                      key={url}
                      onClick={() => setActiveImage(url)}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                        (mainImage === url) ? "border-foreground" : "border-transparent"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              {(product.brand || product.category) && (
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {[product.brand, product.category].filter(Boolean).join(" · ")}
                </p>
              )}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
              <p className="mt-2 text-xl">{formatMoney(price, product.currency)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stock > 0 ? `${stock} in stock` : "Sold out"}
              </p>

              {hasVariants && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium">Choose an option</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVariantId(v.id)}
                        disabled={v.stock <= 0}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selectedVariant?.id === v.id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        {v.name}
                        {v.stock <= 0 ? " (sold out)" : ""}
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

              <Button
                className="mt-8 w-full"
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
                      variantId: hasVariants ? selectedVariant?.id ?? null : null,
                      variantName: hasVariants ? selectedVariant?.name ?? null : null,
                      sku: hasVariants ? selectedVariant?.sku ?? null : null,
                    },
                    1,
                  );
                  toast.success("Added to cart");
                }}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {canAdd ? "Add to cart" : "Sold out"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
