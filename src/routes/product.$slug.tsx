import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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
            <div className="aspect-square overflow-hidden rounded-2xl bg-secondary/60">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
              <p className="mt-2 text-xl">
                {formatMoney(product.price_cents, product.currency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
              </p>
              {product.description && (
                <p className="mt-6 whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}
              <Button
                className="mt-8 w-full"
                size="lg"
                disabled={product.stock <= 0}
                onClick={() => {
                  add(
                    {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      price_cents: product.price_cents,
                      image_url: product.image_url,
                      stock: product.stock,
                    },
                    1,
                  );
                  toast.success("Added to cart");
                }}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {product.stock > 0 ? "Add to cart" : "Sold out"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}