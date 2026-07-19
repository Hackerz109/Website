-- Delivery Zone Management
-- Fully database-driven, like the coupon system: admins configure shop
-- locations, radius-based delivery zones, and charge rules from the admin
-- panel with no code changes. Direct table access is admin-only (mirrors
-- the coupons table pattern) — shoppers only ever go through the RPCs at
-- the bottom of this file, which return just what checkout needs.

CREATE TYPE public.delivery_charge_type AS ENUM ('flat', 'distance');

-- One row per physical store/warehouse a delivery zone can radiate from.
-- Modeled as a table (not a singleton) so multi-store expansion later is
-- just "add another row" — today's admin UI drives one primary location.
CREATE TABLE public.store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Main Store',
  address TEXT,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.store_locations IS 'Shop location(s) set by the admin on the map. Delivery zones radiate from these. Exactly one row is expected to be is_primary=true in the current single-store UI.';

CREATE TRIGGER store_locations_touch BEFORE UPDATE ON public.store_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_locations TO authenticated;
GRANT ALL ON public.store_locations TO service_role;
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage store locations" ON public.store_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Radius-based delivery zones around a store location.
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id UUID NOT NULL REFERENCES public.store_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  radius_km NUMERIC(6,2) NOT NULL CHECK (radius_km > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.delivery_zones IS 'Concentric radius zones (e.g. 5/10/20 km) from a store location. A customer is eligible for home delivery if they fall within ANY active zone.';

CREATE INDEX delivery_zones_store_idx ON public.delivery_zones (store_location_id);
CREATE TRIGGER delivery_zones_touch BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage delivery zones" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Distance-based charge tiers, e.g. 0-5km => 3000 paise, 5-10km => 5000 paise.
-- max_km = NULL means "and beyond" (open-ended top tier).
CREATE TABLE public.delivery_rate_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_km NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (min_km >= 0),
  max_km NUMERIC(6,2) CHECK (max_km IS NULL OR max_km > min_km),
  charge_cents INTEGER NOT NULL DEFAULT 0 CHECK (charge_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_rate_tiers TO authenticated;
GRANT ALL ON public.delivery_rate_tiers TO service_role;
ALTER TABLE public.delivery_rate_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage rate tiers" ON public.delivery_rate_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Singleton settings row (id is always true) — every other delivery/pickup
-- setting that isn't a zone or a rate tier lives here.
CREATE TABLE public.delivery_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  charge_type public.delivery_charge_type NOT NULL DEFAULT 'flat',
  flat_charge_cents INTEGER NOT NULL DEFAULT 0 CHECK (flat_charge_cents >= 0),
  free_delivery_min_cents INTEGER CHECK (free_delivery_min_cents IS NULL OR free_delivery_min_cents >= 0),
  pickup_charge_cents INTEGER NOT NULL DEFAULT 0 CHECK (pickup_charge_cents >= 0),
  delivery_eta_text TEXT NOT NULL DEFAULT '2-4 business days',
  pickup_eta_text TEXT NOT NULL DEFAULT 'Ready within 24 hours',
  delivery_instructions TEXT,
  pickup_instructions TEXT,
  pickup_address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.delivery_settings IS 'Single-row (id=true) store-wide delivery/pickup configuration, editable entirely from the admin panel.';

CREATE TRIGGER delivery_settings_touch BEFORE UPDATE ON public.delivery_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.delivery_settings TO authenticated;
GRANT ALL ON public.delivery_settings TO service_role;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage delivery settings" ON public.delivery_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.delivery_settings (id) VALUES (true);

-- Great-circle distance in kilometers between two lat/lng points.
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 6371 * 2 * asin(
    sqrt(
      pow(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians((lng2 - lng1) / 2)), 2)
    )
  );
$$;
REVOKE ALL ON FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

-- Whether a lat/lng falls inside any active delivery zone, and by how much
-- margin. Picks the nearest active store location's nearest matching zone.
CREATE OR REPLACE FUNCTION public.check_delivery_eligibility(p_lat NUMERIC, p_lng NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_match RECORD;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'message', 'Location not provided.');
  END IF;

  SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    z.radius_km,
    s.id AS store_location_id,
    s.name AS store_name,
    public.haversine_km(p_lat, p_lng, s.lat, s.lng) AS distance_km
  INTO v_match
  FROM public.delivery_zones z
  JOIN public.store_locations s ON s.id = z.store_location_id
  WHERE z.is_active = true AND s.active = true
    AND public.haversine_km(p_lat, p_lng, s.lat, s.lng) <= z.radius_km
  ORDER BY public.haversine_km(p_lat, p_lng, s.lat, s.lng) ASC
  LIMIT 1;

  IF v_match.zone_id IS NULL THEN
    -- Still report the nearest zone's shortfall so the UI can explain why.
    SELECT
      public.haversine_km(p_lat, p_lng, s.lat, s.lng) AS distance_km
    INTO v_match
    FROM public.delivery_zones z
    JOIN public.store_locations s ON s.id = z.store_location_id
    WHERE z.is_active = true AND s.active = true
    ORDER BY public.haversine_km(p_lat, p_lng, s.lat, s.lng) ASC
    LIMIT 1;

    RETURN jsonb_build_object(
      'eligible', false,
      'distance_km', round(coalesce(v_match.distance_km, 0)::numeric, 2),
      'message', 'This address is outside our delivery area. Store pickup is still available.'
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'zone_id', v_match.zone_id,
    'zone_name', v_match.zone_name,
    'store_location_id', v_match.store_location_id,
    'store_name', v_match.store_name,
    'distance_km', round(v_match.distance_km::numeric, 2)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.check_delivery_eligibility(NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_delivery_eligibility(NUMERIC, NUMERIC) TO anon, authenticated;

-- The single source of truth for what a delivery should cost. Combines
-- zone eligibility with the flat/distance charge settings and the free
-- delivery threshold, so the client never computes money itself.
CREATE OR REPLACE FUNCTION public.calculate_delivery_charge(p_lat NUMERIC, p_lng NUMERIC, p_subtotal_cents INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_elig JSONB;
  v_settings public.delivery_settings%ROWTYPE;
  v_charge INTEGER := 0;
  v_free BOOLEAN := false;
  v_tier public.delivery_rate_tiers%ROWTYPE;
  v_distance NUMERIC;
BEGIN
  v_elig := public.check_delivery_eligibility(p_lat, p_lng);
  IF NOT (v_elig->>'eligible')::boolean THEN
    RETURN v_elig || jsonb_build_object('charge_cents', NULL);
  END IF;

  SELECT * INTO v_settings FROM public.delivery_settings WHERE id = true;
  v_distance := (v_elig->>'distance_km')::numeric;

  IF v_settings.charge_type = 'flat' THEN
    v_charge := v_settings.flat_charge_cents;
  ELSE
    SELECT * INTO v_tier FROM public.delivery_rate_tiers
      WHERE min_km <= v_distance AND (max_km IS NULL OR max_km >= v_distance)
      ORDER BY min_km DESC LIMIT 1;
    v_charge := coalesce(v_tier.charge_cents, v_settings.flat_charge_cents);
  END IF;

  IF v_settings.free_delivery_min_cents IS NOT NULL AND p_subtotal_cents >= v_settings.free_delivery_min_cents THEN
    v_charge := 0;
    v_free := true;
  END IF;

  RETURN v_elig || jsonb_build_object(
    'charge_cents', v_charge,
    'free_delivery_applied', v_free,
    'eta_text', v_settings.delivery_eta_text,
    'instructions', v_settings.delivery_instructions
  );
END;
$$;
REVOKE ALL ON FUNCTION public.calculate_delivery_charge(NUMERIC, NUMERIC, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_delivery_charge(NUMERIC, NUMERIC, INTEGER) TO anon, authenticated;

-- Everything checkout needs to render delivery/pickup options, without
-- exposing the admin-only zone/tier tables directly.
CREATE OR REPLACE FUNCTION public.get_delivery_info()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'charge_type', s.charge_type,
    'flat_charge_cents', s.flat_charge_cents,
    'free_delivery_min_cents', s.free_delivery_min_cents,
    'pickup_charge_cents', s.pickup_charge_cents,
    'delivery_eta_text', s.delivery_eta_text,
    'pickup_eta_text', s.pickup_eta_text,
    'delivery_instructions', s.delivery_instructions,
    'pickup_instructions', s.pickup_instructions,
    'pickup_address', s.pickup_address,
    'rate_tiers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('min_km', t.min_km, 'max_km', t.max_km, 'charge_cents', t.charge_cents) ORDER BY t.min_km), '[]'::jsonb)
      FROM public.delivery_rate_tiers t
    ),
    'zones', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name, 'radius_km', z.radius_km, 'lat', l.lat, 'lng', l.lng) ORDER BY z.radius_km), '[]'::jsonb)
      FROM public.delivery_zones z JOIN public.store_locations l ON l.id = z.store_location_id
      WHERE z.is_active = true AND l.active = true
    ),
    'store_locations', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'address', l.address, 'lat', l.lat, 'lng', l.lng, 'is_primary', l.is_primary) ORDER BY l.is_primary DESC), '[]'::jsonb)
      FROM public.store_locations l WHERE l.active = true
    )
  )
  FROM public.delivery_settings s WHERE s.id = true;
$$;
REVOKE ALL ON FUNCTION public.get_delivery_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_delivery_info() TO anon, authenticated;
