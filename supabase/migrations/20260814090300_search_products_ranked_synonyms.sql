-- Extends search_products_ranked (previously tuned in
-- search_fix_irrelevant_fuzzy_matches / search_weighted_relevance) with
-- synonym-aware matching. Every existing thing about this function is
-- unchanged: the identity/content blob split, the 3:1 identity weighting,
-- the whole-word-boundary treatment for <=3 char tokens, the glued-word
-- split fallback, the >=0.3-per-word threshold, the 200-row cap, the 3s
-- statement timeout. The only change is that each query word is now
-- scored as the MAX across itself and its known synonyms (word_slots),
-- instead of just itself — so a doc matches a word "slot" if either the
-- literal word or one of its synonyms is present. Words with no synonyms
-- behave identically to before (the variant set is just the word itself).
CREATE OR REPLACE FUNCTION public.search_products_ranked(p_query text)
RETURNS TABLE(id uuid, rank real)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '3000'
AS $function$
  WITH tokens AS (
    SELECT ARRAY(
      SELECT DISTINCT lower(t)
      FROM unnest(regexp_split_to_array(trim(coalesce(left(p_query, 150), '')), '\s+')) AS t
      WHERE length(t) > 0
      LIMIT 12
    ) AS words
  ),
  word_slots AS (
    SELECT
      orig_w AS word,
      (SELECT ARRAY(
        SELECT DISTINCT v FROM (
          SELECT orig_w AS v
          UNION ALL
          SELECT lower(s.synonym) FROM public.search_synonyms s WHERE lower(s.term) = orig_w
        ) x LIMIT 5
      )) AS variants
    FROM unnest((SELECT words FROM tokens)) AS orig_w
  ),
  doc AS (
    SELECT
      p.id,
      lower(
        coalesce(p.name, '') || ' ' ||
        coalesce(p.sku, '') || ' ' ||
        coalesce((SELECT c.name FROM public.categories c WHERE c.id = p.category_id), '') || ' ' ||
        coalesce((SELECT b.name FROM public.brands b WHERE b.id = p.brand_id), '') || ' ' ||
        coalesce((SELECT string_agg(pv.name, ' ') FROM public.product_variants pv WHERE pv.product_id = p.id), '') || ' ' ||
        coalesce((SELECT string_agg(pv.sku, ' ') FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.sku IS NOT NULL), '')
      ) AS identity_blob,
      lower(
        coalesce(p.description, '') || ' ' ||
        coalesce((
          SELECT string_agg(coalesce(elem->>'key', '') || ' ' || coalesce(elem->>'value', ''), ' ')
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(p.specifications) = 'array' THEN p.specifications ELSE '[]'::jsonb END
          ) elem
        ), '')
      ) AS content_blob
    FROM public.products p
    WHERE p.active = true
  ),
  scored AS (
    SELECT
      doc.id,
      array_agg(slot.raw) AS raw_word_scores,
      avg(slot.weighted)::real AS rank
    FROM doc
    CROSS JOIN LATERAL (
      SELECT
        ws.word,
        MAX(variant.identity_score) AS identity_score,
        MAX(variant.content_score) AS content_score
      FROM word_slots ws
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN length(v) <= 3 AND v ~ '^[a-z0-9]+$' THEN
              CASE WHEN doc.identity_blob ~ ('\m' || v || '\M') THEN 1.0::real ELSE 0::real END
            WHEN length(v) <= 4 THEN
              CASE WHEN doc.identity_blob LIKE '%' || v || '%' THEN 1.0::real ELSE 0::real END
            ELSE
              GREATEST(
                CASE WHEN doc.identity_blob LIKE '%' || v || '%' THEN 1.0::real ELSE 0::real END,
                word_similarity(v, doc.identity_blob)
              )
          END AS identity_score,
          CASE
            WHEN length(v) <= 3 AND v ~ '^[a-z0-9]+$' THEN
              CASE WHEN doc.content_blob ~ ('\m' || v || '\M') THEN 1.0::real ELSE 0::real END
            ELSE
              CASE WHEN doc.content_blob LIKE '%' || v || '%' THEN 1.0::real ELSE 0::real END
          END AS content_score
        FROM unnest(ws.variants) AS v
      ) variant
      GROUP BY ws.word
    ) base
    CROSS JOIN LATERAL (
      SELECT COALESCE(MAX(
        (
          GREATEST(
            CASE WHEN doc.identity_blob LIKE '%' || left(base.word, i) || '%' THEN 1.0::real ELSE 0::real END,
            word_similarity(left(base.word, i), doc.identity_blob)
          ) +
          GREATEST(
            CASE WHEN doc.identity_blob LIKE '%' || right(base.word, length(base.word) - i) || '%' THEN 1.0::real ELSE 0::real END,
            word_similarity(right(base.word, length(base.word) - i), doc.identity_blob)
          )
        ) / 2.0
      ), 0::real) AS identity_split_score
      FROM generate_series(3, length(base.word) - 3) AS i
      WHERE base.identity_score < 0.45 AND length(base.word) BETWEEN 7 AND 30
    ) split
    CROSS JOIN LATERAL (
      SELECT
        GREATEST(base.identity_score, split.identity_split_score, base.content_score) AS raw,
        (3.0 * GREATEST(base.identity_score, split.identity_split_score) + 1.0 * base.content_score) / 4.0 AS weighted
    ) slot
    GROUP BY doc.id
  )
  SELECT
    scored.id,
    scored.rank
  FROM scored
  WHERE (SELECT array_length(words, 1) FROM tokens) > 0
    AND NOT EXISTS (SELECT 1 FROM unnest(scored.raw_word_scores) AS s WHERE s < 0.3)
  ORDER BY rank DESC, id
  LIMIT 200;
$function$;

GRANT EXECUTE ON FUNCTION public.search_products_ranked(text) TO anon, authenticated;
