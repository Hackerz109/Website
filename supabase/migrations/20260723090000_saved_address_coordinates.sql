-- ============================================================
-- Saved addresses: carry a map pin (lat/lng) alongside the typed address
-- so picking a saved address at checkout can drop the pin straight onto the
-- exact spot instead of re-geocoding the text every time.
-- ============================================================

ALTER TABLE public.user_addresses
  ADD COLUMN lat DOUBLE PRECISION,
  ADD COLUMN lng DOUBLE PRECISION;
