-- Standard faceted-search pattern: each facet's count is computed against
-- every filter EXCEPT its own dimension (pass_category/pass_brand/...),
-- so selecting one brand doesn't hide the count for the others — the
-- sidebar can show "how many results if I also picked this option" while
-- several are already selected. `matched` is forced MATERIALIZED since
-- it's the one CTE that calls the (relatively) expensive
-- search_products_ranked, and it's joined against six times below — this
-- guarantees Postgres runs the ranking scan once per call regardless of
-- inlining heuristics, which matters more as the catalog grows.
CREATE OR REPLACE FUNCTION public.search_facets(
  p_query text DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_brand_ids uuid[] DEFAULT NULL,
  p_min_price integer DEFAULT NULL,
  p_max_price integer DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_in_stock_only boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '3000'
AS $function$
  WITH matched AS MATERIALIZED (
    SELECT p.id FROM public.products p
    WHERE p.active = true
      AND (p_query IS NULL OR trim(p_query) = '' OR p.id IN (SELECT sr.id FROM public.search_products_ranked(p_query) sr))
  ),
  flagged AS MATERIALIZED (
    SELECT
      b.*,
      (p_category_ids IS NULL OR array_length(p_category_ids,1) IS NULL OR b.category_id = ANY(p_category_ids)) AS pass_category,
      (p_brand_ids IS NULL OR array_length(p_brand_ids,1) IS NULL OR b.brand_id = ANY(p_brand_ids)) AS pass_brand,
      (p_min_price IS NULL OR b.price_cents >= p_min_price) AND (p_max_price IS NULL OR b.price_cents <= p_max_price) AS pass_price,
      (p_min_rating IS NULL OR COALESCE(b.rating_avg,0) >= p_min_rating) AS pass_rating,
      (p_in_stock_only IS NOT TRUE OR b.stock_unlimited OR b.stock > 0) AS pass_stock
    FROM public.products b
    JOIN matched m ON m.id = b.id
  ),
  cat_counts AS (
    SELECT c.id, c.name, c.slug, COUNT(f.id) AS cnt
    FROM public.categories c
    JOIN flagged f ON f.category_id = c.id
    WHERE f.pass_brand AND f.pass_price AND f.pass_rating AND f.pass_stock
    GROUP BY c.id, c.name, c.slug
    HAVING COUNT(f.id) > 0
  ),
  brand_counts AS (
    SELECT br.id, br.name, COUNT(f.id) AS cnt
    FROM public.brands br
    JOIN flagged f ON f.brand_id = br.id
    WHERE f.pass_category AND f.pass_price AND f.pass_rating AND f.pass_stock
    GROUP BY br.id, br.name
    HAVING COUNT(f.id) > 0
  ),
  price_bounds AS (
    SELECT MIN(price_cents) AS min_price, MAX(price_cents) AS max_price
    FROM flagged WHERE pass_category AND pass_brand AND pass_rating AND pass_stock
  ),
  rating_counts AS (
    SELECT r.min_rating, COUNT(f.id) AS cnt
    FROM (VALUES (4),(3),(2),(1)) AS r(min_rating)
    JOIN flagged f ON COALESCE(f.rating_avg,0) >= r.min_rating
    WHERE f.pass_category AND f.pass_brand AND f.pass_price AND f.pass_stock
    GROUP BY r.min_rating
  ),
  stock_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE f.stock_unlimited OR f.stock > 0) AS in_stock,
      COUNT(*) FILTER (WHERE NOT (f.stock_unlimited OR f.stock > 0)) AS out_of_stock
    FROM flagged f
    WHERE f.pass_category AND f.pass_brand AND f.pass_price AND f.pass_rating
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM flagged f
    WHERE f.pass_category AND f.pass_brand AND f.pass_price AND f.pass_rating AND f.pass_stock
  )
  SELECT jsonb_build_object(
    'total_count', (SELECT cnt FROM total),
    'categories', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'count', cnt) ORDER BY cnt DESC, name) FROM cat_counts), '[]'::jsonb),
    'brands', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'count', cnt) ORDER BY cnt DESC, name) FROM brand_counts), '[]'::jsonb),
    'price_min', (SELECT min_price FROM price_bounds),
    'price_max', (SELECT max_price FROM price_bounds),
    'rating_counts', COALESCE((SELECT jsonb_agg(jsonb_build_object('min_rating', min_rating, 'count', cnt) ORDER BY min_rating DESC) FROM rating_counts), '[]'::jsonb),
    'in_stock_count', COALESCE((SELECT in_stock FROM stock_counts), 0),
    'out_of_stock_count', COALESCE((SELECT out_of_stock FROM stock_counts), 0)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.search_facets(text, uuid[], uuid[], integer, integer, numeric, boolean) TO anon, authenticated;
