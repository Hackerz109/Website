-- ============================================================
-- Per-variant MRP (optional "was" price for a discount strike-through)
-- and per-variant images (so a variant can carry its own photos
-- instead of only ever showing the product's shared gallery).
-- ============================================================

-- 1. Optional MRP per variant. Same "was >= now" invariant already used
--    for the product-level price/mrp pair, enforced here at the database
--    level too — not just in the admin form — so a bad value can never
--    be written no matter how the row gets inserted or updated.
--    Nullable = optional, exactly as requested; every existing row gets
--    NULL here automatically, which trivially satisfies the check below,
--    so no backfill or NOT VALID step is needed.
ALTER TABLE public.product_variants
  ADD COLUMN mrp_cents INTEGER CHECK (mrp_cents IS NULL OR mrp_cents >= price_cents);

-- 2. Optional variant_id on product_images. NULL keeps meaning exactly
--    what it means today — "shared/fallback image for the whole
--    product" — so every image row that exists today keeps working
--    unchanged. A row with variant_id set belongs to just that one
--    variant's own gallery. ON DELETE CASCADE means deleting a variant
--    takes its own image rows with it automatically; the app still
--    deletes the underlying storage files itself first, since Postgres
--    cascades can't reach into Supabase Storage.
ALTER TABLE public.product_images
  ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

CREATE INDEX product_images_variant_idx ON public.product_images (variant_id);

-- 3. Guard against variant_id pointing at a variant that belongs to a
--    *different* product than the image's own product_id. Only admins
--    can write these rows at all (existing product_images policies),
--    so this isn't a hole anyone else could exploit — it's cheap
--    insurance against a future bug sending the two ids out of sync,
--    made impossible outright rather than trusted to every code path.
CREATE OR REPLACE FUNCTION public.check_product_image_variant_matches_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.product_variants
    WHERE id = NEW.variant_id AND product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'product_images.variant_id must belong to the same product_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_images_check_variant
  BEFORE INSERT OR UPDATE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.check_product_image_variant_matches_product();

-- No RLS changes needed: product_variants and product_images already have
-- row-level policies (admin-only writes, public read of active products'
-- rows). RLS is row-level, not column-level, so both new columns are
-- automatically covered by those same existing policies — a new policy
-- would only be needed for a new table, not a new column.
