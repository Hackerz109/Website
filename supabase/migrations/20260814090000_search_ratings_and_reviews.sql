-- Lightweight rating data model so the storefront's rating filter/sort has
-- something real to read. There's no review-writing UI shipped alongside
-- this migration (out of scope of the search-bar rework it's part of) —
-- rating_avg/rating_count start out NULL/0 for every product and populate
-- once reviews exist, whether from a future review UI or an admin backfill.
-- Kept denormalized on products (maintained by trigger) so every search/
-- listing query can filter and display them with zero extra joins, the
-- same reasoning as the existing stock_unlimited/show_stock_count columns.

ALTER TABLE public.products
  ADD COLUMN rating_avg NUMERIC(2,1),
  ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);

GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Mirrors the product_images/product_variants split: anon only sees
-- reviews of currently-active products, authenticated (which here just
-- means "signed in", not "admin") sees everything including their own
-- review of a since-deactivated product.
CREATE POLICY "public read reviews of active products" ON public.product_reviews
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_reviews.product_id AND p.active = true));

CREATE POLICY "auth read all reviews" ON public.product_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "own review insert" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own review update" ON public.product_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own review delete" ON public.product_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER product_reviews_touch BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.recalc_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  target_id UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products p
  SET rating_avg = agg.avg_rating, rating_count = agg.cnt
  FROM (
    SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS cnt
    FROM public.product_reviews WHERE product_id = target_id
  ) agg
  WHERE p.id = target_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER product_reviews_recalc
AFTER INSERT OR UPDATE OF rating OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.recalc_product_rating();
