-- Proper tsvector full-text infrastructure, kept deliberately separate
-- from search_products_ranked's hand-tuned trigram/identity-blob scorer
-- rather than merged into it, so the already-tuned relevance math
-- (weighted_relevance, fix_irrelevant_fuzzy_matches) isn't disturbed.
-- search_vector powers fast prefix lookups for autocomplete and gives
-- English stemming (bulb/bulbs, switch/switches) as a second, independent
-- signal. Only covers products' own columns (name/sku/description/specs)
-- since generated columns can't reference other tables — brand/category
-- text is already covered by search_products_ranked's identity_blob.
CREATE OR REPLACE FUNCTION public.jsonb_specs_to_text(specs jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT COALESCE(
    string_agg(coalesce(elem->>'key', '') || ' ' || coalesce(elem->>'value', ''), ' '),
    ''
  )
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(specs) = 'array' THEN specs ELSE '[]'::jsonb END) elem
$$;

ALTER TABLE public.products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', public.jsonb_specs_to_text(specifications)), 'B')
  ) STORED;

CREATE INDEX idx_products_search_vector ON public.products USING GIN (search_vector);

CREATE INDEX idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_brands_name_trgm ON public.brands USING GIN (name gin_trgm_ops);
CREATE INDEX idx_categories_name_trgm ON public.categories USING GIN (name gin_trgm_ops);
CREATE INDEX idx_product_variants_name_trgm ON public.product_variants USING GIN (name gin_trgm_ops);

-- product_variants.product_id had no index at all despite being the
-- hottest join key on this table (search, cart, orders, admin all join
-- through it).
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
