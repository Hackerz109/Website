import { supabase } from "@/integrations/supabase/client";

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, product_id, user_id, rating, body, created_at, updated_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// One review per (product, user) is enforced by a DB unique constraint, so
// re-submitting is an edit, not a duplicate — upsert on that pair instead
// of a plain insert, which would otherwise fail on a second submission.
export async function submitReview(args: {
  productId: string;
  userId: string;
  rating: number;
  body: string;
}): Promise<void> {
  const { error } = await supabase.from("product_reviews").upsert(
    {
      product_id: args.productId,
      user_id: args.userId,
      rating: args.rating,
      body: args.body.trim() || null,
    },
    { onConflict: "product_id,user_id" },
  );
  if (error) throw error;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
