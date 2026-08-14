-- All three functions read live products/brands/categories filtered to
-- active=true (and, for brands/categories, "has at least one active
-- product") — nothing here is baked to today's catalog, so newly added
-- products/brands/categories are picked up automatically with no code
-- changes, and a brand/category with zero active products stops being
-- suggested on its own.

CREATE OR REPLACE FUNCTION public.search_autocomplete(p_query text, p_limit integer DEFAULT 8)
RETURNS TABLE(
  label text, kind text, product_id uuid, product_slug text,
  brand_id uuid, category_id uuid, category_slug text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '2000'
AS $function$
  WITH q AS (
    SELECT lower(trim(coalesce(left(p_query, 100), ''))) AS term
  ),
  candidates AS (
    SELECT
      p.name AS label, 'product'::text AS kind, p.id AS product_id, p.slug AS product_slug,
      NULL::uuid AS brand_id, NULL::uuid AS category_id, NULL::text AS category_slug,
      CASE WHEN lower(p.name) LIKE q.term || '%' THEN 0
           WHEN lower(p.name) LIKE '%' || q.term || '%' THEN 1 ELSE 2 END AS match_rank,
      similarity(lower(p.name), q.term) AS sim,
      length(p.name) AS len
    FROM public.products p CROSS JOIN q
    WHERE length(q.term) >= 2 AND p.active = true
      AND (lower(p.name) LIKE '%' || q.term || '%' OR similarity(lower(p.name), q.term) > 0.25)

    UNION ALL

    SELECT
      b.name, 'brand', NULL, NULL, b.id, NULL, NULL,
      CASE WHEN lower(b.name) LIKE q.term || '%' THEN 0
           WHEN lower(b.name) LIKE '%' || q.term || '%' THEN 1 ELSE 2 END,
      similarity(lower(b.name), q.term), length(b.name)
    FROM public.brands b CROSS JOIN q
    WHERE length(q.term) >= 2
      AND EXISTS (SELECT 1 FROM public.products p WHERE p.brand_id = b.id AND p.active = true)
      AND (lower(b.name) LIKE '%' || q.term || '%' OR similarity(lower(b.name), q.term) > 0.3)

    UNION ALL

    SELECT
      c.name, 'category', NULL, NULL, NULL, c.id, c.slug,
      CASE WHEN lower(c.name) LIKE q.term || '%' THEN 0
           WHEN lower(c.name) LIKE '%' || q.term || '%' THEN 1 ELSE 2 END,
      similarity(lower(c.name), q.term), length(c.name)
    FROM public.categories c CROSS JOIN q
    WHERE length(q.term) >= 2
      AND EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id AND p.active = true)
      AND (lower(c.name) LIKE '%' || q.term || '%' OR similarity(lower(c.name), q.term) > 0.3)
  )
  SELECT label, kind, product_id, product_slug, brand_id, category_id, category_slug
  FROM candidates
  ORDER BY match_rank ASC, sim DESC, len ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$function$;

GRANT EXECUTE ON FUNCTION public.search_autocomplete(text, integer) TO anon, authenticated;

-- Uses word_similarity (best-matching extent of the typed word within the
-- dictionary word) rather than plain similarity — tested against real
-- typos ("swich"->switches, "reglator"->regulators, "havlls"->havells,
-- "coler"->coolers): those score ~0.5-0.67 with word_similarity but only
-- ~0.2-0.25 with plain similarity, since English plurals dilute the
-- trigram overlap symmetrically. 0.45 cutoff catches all of the above
-- with margin while leaving genuinely-different words uncorrected.
CREATE OR REPLACE FUNCTION public.search_did_you_mean(p_query text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '2000'
AS $function$
DECLARE
  v_words text[];
  v_word text;
  v_best text;
  v_best_sim real;
  v_corrected text[] := ARRAY[]::text[];
  v_changed boolean := false;
BEGIN
  v_words := regexp_split_to_array(lower(trim(coalesce(left(p_query, 150), ''))), '\s+');
  IF v_words IS NULL OR v_words = ARRAY['']::text[] THEN
    RETURN NULL;
  END IF;

  FOREACH v_word IN ARRAY v_words LOOP
    IF length(v_word) < 3 THEN
      v_corrected := array_append(v_corrected, v_word);
      CONTINUE;
    END IF;

    SELECT dict_word, dict_sim INTO v_best, v_best_sim
    FROM (
      SELECT lower(dw) AS dict_word, word_similarity(v_word, lower(dw)) AS dict_sim
      FROM (
        SELECT unnest(regexp_split_to_array(p.name, '\s+')) AS dw FROM public.products p WHERE p.active = true
        UNION ALL
        SELECT b.name AS dw FROM public.brands b
        WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.brand_id = b.id AND p.active = true)
        UNION ALL
        SELECT unnest(regexp_split_to_array(c.name, '\s+')) AS dw FROM public.categories c
        WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id AND p.active = true)
      ) raw_words
      WHERE length(dw) >= 3
    ) dict
    ORDER BY dict_sim DESC
    LIMIT 1;

    IF v_best IS NOT NULL AND v_best_sim > 0.45 AND v_best <> v_word THEN
      v_corrected := array_append(v_corrected, v_best);
      v_changed := true;
    ELSE
      v_corrected := array_append(v_corrected, v_word);
    END IF;
  END LOOP;

  IF v_changed THEN
    RETURN array_to_string(v_corrected, ' ');
  ELSE
    RETURN NULL;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_did_you_mean(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_related_products(
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_limit integer DEFAULT 8
)
RETURNS TABLE(id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id
  FROM public.products p
  WHERE p.active = true
    AND NOT (p.id = ANY(p_exclude_ids))
    AND (
      (p_category_id IS NOT NULL AND p.category_id = p_category_id)
      OR (p_brand_id IS NOT NULL AND p.brand_id = p_brand_id)
      OR (p_category_id IS NULL AND p_brand_id IS NULL)
    )
  ORDER BY
    (p_category_id IS NOT NULL AND p.category_id = p_category_id) DESC,
    (p_brand_id IS NOT NULL AND p.brand_id = p_brand_id) DESC,
    p.featured DESC,
    p.popularity_score DESC,
    p.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$function$;

GRANT EXECUTE ON FUNCTION public.get_related_products(uuid, uuid, uuid[], integer) TO anon, authenticated;
