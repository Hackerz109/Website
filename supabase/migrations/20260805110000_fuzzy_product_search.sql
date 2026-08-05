-- Fuzzy, word-order-independent product search for the storefront search
-- bar. Two problems with the old ILIKE-on-the-whole-string approach:
--   1. "Havells wire 1mm" is a single substring, so it never matches a
--      product literally named "1mm Havells Wire" (words in a different
--      order) even though every word is present.
--   2. A single typo ("havlls") breaks a plain ILIKE substring match
--      entirely.
-- This function splits the query into words, and requires every word to
-- match *somewhere* in the product's combined text (name, description,
-- SKU, category, brand, variant names/SKUs, spec key/values) — so word
-- order stops mattering. Each word can match either by plain substring or
-- by trigram similarity (pg_trgm), which is what gives typo tolerance.
-- Results are ranked by average match strength, best first.
--
-- Blob-per-row is a straight scan (no index) — perfectly fine for a
-- catalog of dozens to a few thousand products. If the catalog grows much
-- larger than that, this would want a precomputed/indexed search column
-- instead.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.search_products_ranked(p_query TEXT)
RETURNS TABLE (id UUID, rank REAL)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH tokens AS (
    SELECT ARRAY(
      SELECT DISTINCT lower(t)
      FROM unnest(regexp_split_to_array(trim(coalesce(p_query, '')), '\s+')) AS t
      WHERE length(t) > 0
    ) AS words
  ),
  doc AS (
    SELECT
      p.id,
      lower(
        coalesce(p.name, '') || ' ' ||
        coalesce(p.description, '') || ' ' ||
        coalesce(p.sku, '') || ' ' ||
        coalesce((SELECT c.name FROM public.categories c WHERE c.id = p.category_id), '') || ' ' ||
        coalesce((SELECT b.name FROM public.brands b WHERE b.id = p.brand_id), '') || ' ' ||
        coalesce((SELECT string_agg(pv.name, ' ') FROM public.product_variants pv WHERE pv.product_id = p.id), '') || ' ' ||
        coalesce((SELECT string_agg(pv.sku, ' ') FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.sku IS NOT NULL), '') || ' ' ||
        coalesce((
          SELECT string_agg(coalesce(elem->>'key', '') || ' ' || coalesce(elem->>'value', ''), ' ')
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(p.specifications) = 'array' THEN p.specifications ELSE '[]'::jsonb END
          ) elem
        ), '')
      ) AS blob
    FROM public.products p
    WHERE p.active = true
  ),
  scored AS (
    SELECT
      doc.id,
      ARRAY(
        SELECT GREATEST(
          CASE WHEN doc.blob LIKE '%' || w || '%' THEN 1.0::real ELSE 0::real END,
          word_similarity(w, doc.blob)
        )
        FROM unnest((SELECT words FROM tokens)) AS w
      ) AS word_scores
    FROM doc
  )
  SELECT
    scored.id,
    (SELECT avg(s) FROM unnest(scored.word_scores) AS s)::real AS rank
  FROM scored
  WHERE (SELECT array_length(words, 1) FROM tokens) > 0
    -- every word has to clear the bar somewhere (AND across words) — this
    -- is what stops "wire" alone from matching every third product
    AND NOT EXISTS (SELECT 1 FROM unnest(scored.word_scores) AS s WHERE s < 0.3)
  ORDER BY rank DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.search_products_ranked(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products_ranked(TEXT) TO anon, authenticated;
