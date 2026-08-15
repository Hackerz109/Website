-- Most products in this catalog price and stock themselves entirely
-- through variants (e.g. wire gauges, switch finishes) and leave the
-- product row's own price_cents/stock/stock_unlimited at placeholder
-- zero/false values — confirmed against live data: 34 of 35 active
-- products carry real pricing only on their variants. The price filter/
-- sort and the in-stock filter were reading price_cents/stock directly
-- off the product row, which for those 34 products meant "₹0" and
-- "out of stock" regardless of what the variants actually said.
--
-- effective_price_cents / effective_in_stock fix this: for a product
-- WITH variants, effective price is the cheapest variant and effective
-- stock is true if ANY variant is in stock; for a product with NO
-- variants, both fall back to the product's own fields exactly as
-- before. Denormalized + trigger-maintained (same pattern as
-- popularity_score) so filtering/sorting stays a plain indexed column
-- comparison rather than a per-request join+aggregate.

ALTER TABLE public.products
  ADD COLUMN effective_price_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN effective_in_stock BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_products_effective_price ON public.products(effective_price_cents);
CREATE INDEX idx_products_effective_in_stock ON public.products(effective_in_stock);

CREATE OR REPLACE FUNCTION public.recalc_effective_price_stock(p_product_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_variant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_variant_count FROM public.product_variants WHERE product_id = p_product_id;

  IF v_variant_count > 0 THEN
    UPDATE public.products p
    SET
      effective_price_cents = COALESCE(
        (SELECT MIN(pv.price_cents) FROM public.product_variants pv WHERE pv.product_id = p.id), 0
      ),
      effective_in_stock = EXISTS (
        SELECT 1 FROM public.product_variants pv
        WHERE pv.product_id = p.id AND (pv.stock_unlimited OR pv.stock > 0)
      )
    WHERE p.id = p_product_id;
  ELSE
    UPDATE public.products p
    SET
      effective_price_cents = p.price_cents,
      effective_in_stock = (p.stock_unlimited OR p.stock > 0)
    WHERE p.id = p_product_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.product_variants_effective_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN PERFORM public.recalc_effective_price_stock(OLD.product_id); END IF;
    RETURN OLD;
  ELSE
    IF NEW.product_id IS NOT NULL THEN PERFORM public.recalc_effective_price_stock(NEW.product_id); END IF;
    IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      PERFORM public.recalc_effective_price_stock(OLD.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER product_variants_effective
AFTER INSERT OR UPDATE OF price_cents, stock, stock_unlimited, product_id OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.product_variants_effective_trigger();

CREATE OR REPLACE FUNCTION public.products_effective_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recalc_effective_price_stock(NEW.id);
  RETURN NEW;
END;
$$;

-- Fires on INSERT too so a brand new product (created before any variant
-- rows exist for it) starts with correct fallback values immediately.
CREATE TRIGGER products_effective
AFTER INSERT OR UPDATE OF price_cents, stock, stock_unlimited ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_effective_trigger();

-- One-time backfill for all existing products.
UPDATE public.products p
SET
  effective_price_cents = COALESCE(va.min_price, p.price_cents),
  effective_in_stock = COALESCE(va.any_in_stock, p.stock_unlimited OR p.stock > 0)
FROM (
  SELECT product_id, MIN(price_cents) AS min_price, BOOL_OR(stock_unlimited OR stock > 0) AS any_in_stock
  FROM public.product_variants
  GROUP BY product_id
) va
WHERE va.product_id = p.id;

UPDATE public.products p
SET
  effective_price_cents = p.price_cents,
  effective_in_stock = (p.stock_unlimited OR p.stock > 0)
WHERE NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id);
