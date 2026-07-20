-- Returns & Refunds
-- Customers request returns (item + quantity + reason + optional photos)
-- from their order history; admins review and approve/reject/partially
-- approve; approved returns get refunded to the original payment method
-- (where supported) or as Store Wallet credit. All writes go through the
-- RPCs at the bottom — direct table access is read-only for customers and
-- admin-only for everything else, same trust model as the coupon system.

CREATE TYPE public.return_status AS ENUM ('requested', 'approved', 'partially_approved', 'rejected', 'refunded');
CREATE TYPE public.refund_method_type AS ENUM ('original_payment', 'wallet_credit');

CREATE TABLE public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.return_status NOT NULL DEFAULT 'requested',
  reason TEXT NOT NULL,
  preferred_refund_method public.refund_method_type NOT NULL DEFAULT 'wallet_credit',
  refund_method public.refund_method_type,
  refund_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (refund_amount_cents >= 0),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX return_requests_order_idx ON public.return_requests (order_id);
CREATE INDEX return_requests_user_idx ON public.return_requests (user_id);
CREATE TRIGGER return_requests_touch BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Read-only for everyone at the table level; every write happens through
-- create_return_request / admin_review_return / admin_process_refund.
GRANT SELECT ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own return requests" ON public.return_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  approved_quantity INTEGER CHECK (approved_quantity IS NULL OR approved_quantity >= 0),
  unit_price_cents INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX return_items_request_idx ON public.return_items (return_request_id);

GRANT SELECT ON public.return_items TO authenticated;
GRANT ALL ON public.return_items TO service_role;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own return items" ON public.return_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.return_requests r WHERE r.id = return_request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.return_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.return_images TO authenticated;
GRANT ALL ON public.return_images TO service_role;
ALTER TABLE public.return_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own return images" ON public.return_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.return_requests r WHERE r.id = return_request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Storage bucket for return photo evidence. Private bucket — access is via
-- the RLS policies below, not a public URL, so photos of someone's living
-- room don't end up world-readable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('return-images', 'return-images', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention enforced by policy: {user_id}/{return_request_id}/{file}
CREATE POLICY "own return images upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'return-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own return images read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'return-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "own return images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'return-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Customer-facing: create a return request for one or more items on a
-- delivered order. p_id lets the client pre-generate the id so return
-- photos can be uploaded to storage.objects under this id before the row
-- exists; if omitted, one is generated here.
-- p_items shape: [{ "order_item_id": uuid, "quantity": int, "reason": text|null }]
CREATE OR REPLACE FUNCTION public.create_return_request(
  p_order_id UUID,
  p_items JSONB,
  p_reason TEXT,
  p_preferred_refund_method public.refund_method_type,
  p_image_urls TEXT[] DEFAULT '{}',
  p_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := coalesce(p_id, gen_random_uuid());
  v_order public.orders%ROWTYPE;
  item JSONB;
  v_order_item public.order_items%ROWTYPE;
  v_already_returned INTEGER;
  v_qty INTEGER;
  v_url TEXT;
  v_item_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please sign in.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found.');
  END IF;
  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'This order does not belong to you.');
  END IF;
  IF v_order.status NOT IN ('delivered', 'return_rejected') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Returns can only be requested for delivered orders.');
  END IF;
  IF trim(coalesce(p_reason, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please provide a reason for the return.');
  END IF;

  INSERT INTO public.return_requests (id, order_id, user_id, reason, preferred_refund_method)
  VALUES (v_id, p_order_id, auth.uid(), p_reason, p_preferred_refund_method);

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  LOOP
    SELECT * INTO v_order_item FROM public.order_items
      WHERE id = (item->>'order_item_id')::UUID AND order_id = p_order_id;
    IF v_order_item.id IS NULL THEN
      RAISE EXCEPTION 'Order item not found on this order';
    END IF;

    v_qty := coalesce((item->>'quantity')::INTEGER, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Return quantity must be greater than zero';
    END IF;

    SELECT coalesce(sum(ri.quantity), 0) INTO v_already_returned
      FROM public.return_items ri
      JOIN public.return_requests rr ON rr.id = ri.return_request_id
      WHERE ri.order_item_id = v_order_item.id AND rr.status <> 'rejected';

    IF v_already_returned + v_qty > v_order_item.quantity THEN
      RAISE EXCEPTION 'Return quantity exceeds what was ordered for %', v_order_item.product_name;
    END IF;

    INSERT INTO public.return_items (return_request_id, order_item_id, quantity, unit_price_cents, reason)
    VALUES (v_id, v_order_item.id, v_qty, v_order_item.unit_price_cents, item->>'reason');
    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Select at least one item to return';
  END IF;

  FOREACH v_url IN ARRAY coalesce(p_image_urls, '{}')
  LOOP
    INSERT INTO public.return_images (return_request_id, url) VALUES (v_id, v_url);
  END LOOP;

  UPDATE public.orders SET status = 'return_requested' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'return_id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.create_return_request(UUID, JSONB, TEXT, public.refund_method_type, TEXT[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_return_request(UUID, JSONB, TEXT, public.refund_method_type, TEXT[], UUID) TO authenticated;

-- Admin-facing: approve (fully or partially, via per-item approved
-- quantities), or reject, a return request.
-- p_item_decisions shape: [{ "return_item_id": uuid, "approved_quantity": int }]
CREATE OR REPLACE FUNCTION public.admin_review_return(
  p_return_id UUID,
  p_decision public.return_status, -- 'approved' | 'partially_approved' | 'rejected'
  p_admin_notes TEXT DEFAULT NULL,
  p_item_decisions JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return public.return_requests%ROWTYPE;
  decision JSONB;
  v_total_cents INTEGER := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required.');
  END IF;
  IF p_decision NOT IN ('approved', 'partially_approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid decision.');
  END IF;

  SELECT * INTO v_return FROM public.return_requests WHERE id = p_return_id;
  IF v_return.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Return request not found.');
  END IF;
  IF v_return.status <> 'requested' THEN
    RETURN jsonb_build_object('success', false, 'message', 'This return has already been reviewed.');
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.return_requests
      SET status = 'rejected', admin_notes = p_admin_notes, reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = p_return_id;
    UPDATE public.orders SET status = 'return_rejected' WHERE id = v_return.order_id;
    RETURN jsonb_build_object('success', true);
  END IF;

  FOR decision IN SELECT * FROM jsonb_array_elements(coalesce(p_item_decisions, '[]'::jsonb))
  LOOP
    UPDATE public.return_items
      SET approved_quantity = (decision->>'approved_quantity')::INTEGER
      WHERE id = (decision->>'return_item_id')::UUID AND return_request_id = p_return_id;
  END LOOP;

  -- Anything left unset defaults to the full requested quantity (covers the
  -- simple "approve everything" path without requiring per-item payloads).
  UPDATE public.return_items
    SET approved_quantity = quantity
    WHERE return_request_id = p_return_id AND approved_quantity IS NULL AND p_decision = 'approved';
  UPDATE public.return_items
    SET approved_quantity = coalesce(approved_quantity, 0)
    WHERE return_request_id = p_return_id AND approved_quantity IS NULL;

  SELECT coalesce(sum(approved_quantity * unit_price_cents), 0) INTO v_total_cents
    FROM public.return_items WHERE return_request_id = p_return_id;

  UPDATE public.return_requests
    SET status = p_decision, admin_notes = p_admin_notes, reviewed_by = auth.uid(),
        reviewed_at = now(), refund_amount_cents = v_total_cents
    WHERE id = p_return_id;

  UPDATE public.orders SET status = 'return_approved' WHERE id = v_return.order_id;

  RETURN jsonb_build_object('success', true, 'refund_amount_cents', v_total_cents);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_return(UUID, public.return_status, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_return(UUID, public.return_status, TEXT, JSONB) TO authenticated;
