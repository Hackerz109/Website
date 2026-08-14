-- Denormalized popularity score so "sort by popularity" can be a plain
-- .order() on the products table, the same way price/newest sorting
-- already work — no separate RPC needed for that sort option. Defined as
-- total units ordered (excluding cancelled/refunded orders), recomputed
-- from source on every relevant write rather than incremented/decremented
-- in place, so it can never drift out of sync.

ALTER TABLE public.products ADD COLUMN popularity_score INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_products_popularity_score ON public.products(popularity_score DESC);

CREATE OR REPLACE FUNCTION public.recalc_product_popularity(p_product_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.products p
  SET popularity_score = COALESCE((
    SELECT SUM(oi.quantity)::integer
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id AND o.status NOT IN ('cancelled', 'refunded')
  ), 0)
  WHERE p.id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION public.order_items_popularity_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN PERFORM public.recalc_product_popularity(OLD.product_id); END IF;
    RETURN OLD;
  ELSE
    IF NEW.product_id IS NOT NULL THEN PERFORM public.recalc_product_popularity(NEW.product_id); END IF;
    IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      PERFORM public.recalc_product_popularity(OLD.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER order_items_popularity
AFTER INSERT OR UPDATE OF product_id, quantity OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_items_popularity_trigger();

CREATE OR REPLACE FUNCTION public.orders_status_popularity_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND (NEW.status IN ('cancelled', 'refunded') OR OLD.status IN ('cancelled', 'refunded')) THEN
    PERFORM public.recalc_product_popularity(oi.product_id)
    FROM public.order_items oi WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_status_popularity
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_status_popularity_trigger();

-- One-time backfill so existing order history counts immediately instead
-- of only affecting popularity from this point forward.
UPDATE public.products p SET popularity_score = COALESCE((
  SELECT SUM(oi.quantity)::integer FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id = p.id AND o.status NOT IN ('cancelled', 'refunded')
), 0);
