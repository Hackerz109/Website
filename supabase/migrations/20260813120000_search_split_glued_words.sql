-- Improves search_products_ranked (see 20260805110000_fuzzy_product_search.sql)
-- to handle the most common real-world typo it currently misses: two words
-- typed with no space between them, optionally with a further typo inside
-- one of the halves (e.g. "anchorpenta", or a garbled "anchornpemta" for
-- "Anchor Penta").
--
-- Today, a query word is scored against the product blob as ONE unit via
-- word_similarity(). For a merged word like "anchorpenta" that's genuinely
-- two catalog words glued together, treating it as one unit dilutes the
-- trigram overlap enough that it can sit right at (or below) the 0.3 bar,
-- especially once a second typo is layered on top.
--
-- Fix: for any query word long enough to plausibly BE two words (>= 7
-- chars) that doesn't already score well as a whole (< 0.45), also try
-- every split point, score each half independently against the blob, and
-- use the best split's average as an alternate candidate score. A word
-- that already matches well skips this entirely, so normal single-word
-- queries do no extra work.
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
        SELECT GREATEST(b.base_score, s.split_score)
        FROM unnest((SELECT words FROM tokens)) AS w
        CROSS JOIN LATERAL (
          SELECT GREATEST(
            CASE WHEN doc.blob LIKE '%' || w || '%' THEN 1.0::real ELSE 0::real END,
            word_similarity(w, doc.blob)
          ) AS base_score
        ) b
        CROSS JOIN LATERAL (
          -- Only tried for long, not-already-confident words — see header.
          SELECT COALESCE(MAX(
            (
              GREATEST(
                CASE WHEN doc.blob LIKE '%' || left(w, i) || '%' THEN 1.0::real ELSE 0::real END,
                word_similarity(left(w, i), doc.blob)
              ) +
              GREATEST(
                CASE WHEN doc.blob LIKE '%' || right(w, length(w) - i) || '%' THEN 1.0::real ELSE 0::real END,
                word_similarity(right(w, length(w) - i), doc.blob)
              )
            ) / 2.0
          ), 0::real) AS split_score
          FROM generate_series(3, length(w) - 3) AS i
          WHERE b.base_score < 0.45 AND length(w) >= 7
        ) s
      ) AS word_scores
    FROM doc
  )
  SELECT
    scored.id,
    (SELECT avg(s) FROM unnest(scored.word_scores) AS s)::real AS rank
  FROM scored
  WHERE (SELECT array_length(words, 1) FROM tokens) > 0
    -- every word still has to clear the bar somewhere (AND across words)
    AND NOT EXISTS (SELECT 1 FROM unnest(scored.word_scores) AS s WHERE s < 0.3)
  ORDER BY rank DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.search_products_ranked(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products_ranked(TEXT) TO anon, authenticated;
