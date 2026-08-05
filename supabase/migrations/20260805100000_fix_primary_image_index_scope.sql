-- The primary-image system lets each variant (and the shared gallery) have
-- its own "is_primary" image, but the original unique index below predates
-- that: it only keyed on product_id, so it assumed every primary-eligible
-- image row belonged to one flat pool per product. Once a product could
-- have a shared-gallery primary AND a primary per variant at the same
-- time, that index rejected every second one as a duplicate
-- ("duplicate key value violates unique constraint
-- one_primary_image_per_product") — that's the error hit when marking a
-- second variant's photo (or a variant photo alongside an existing shared
-- primary) as primary.
DROP INDEX IF EXISTS public.one_primary_image_per_product;

-- Replaced with two indexes matching how "primary" is actually scoped:
-- one shared-gallery primary per product, and independently, one primary
-- per variant's own gallery. (NULLs aren't equal to each other in a unique
-- index, so a plain UNIQUE(product_id, variant_id) WHERE is_primary would
-- NOT actually cap the shared gallery at one row — hence two indexes, each
-- scoped to the case it covers.)
CREATE UNIQUE INDEX one_primary_shared_image_per_product
  ON public.product_images (product_id)
  WHERE is_primary AND variant_id IS NULL;

CREATE UNIQUE INDEX one_primary_image_per_variant
  ON public.product_images (variant_id)
  WHERE is_primary AND variant_id IS NOT NULL;
