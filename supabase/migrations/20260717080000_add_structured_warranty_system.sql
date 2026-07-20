-- Structured warranty system for products
-- Replaces the free-text "warranty" field with explicit, structured options
-- while keeping the original column in place (for backward compatibility and
-- as a legacy fallback for products created before this migration).

CREATE TYPE public.warranty_type AS ENUM (
  'manufacturer',
  'seller',
  'extended'
);

CREATE TYPE public.warranty_service_method AS ENUM (
  'home_service',
  'authorized_service_center',
  'bring_to_store',
  'carry_in_service',
  'on_site_service'
);

ALTER TABLE public.products
  ADD COLUMN warranty_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN warranty_type public.warranty_type,
  ADD COLUMN warranty_duration TEXT,
  ADD COLUMN warranty_provider TEXT,
  ADD COLUMN warranty_service_method public.warranty_service_method,
  ADD COLUMN warranty_notes TEXT;

COMMENT ON COLUMN public.products.warranty IS 'Legacy free-text warranty note. Superseded by the structured warranty_* columns; kept for backward compatibility with older records.';
COMMENT ON COLUMN public.products.warranty_available IS 'Whether this product is covered by any warranty at all.';
COMMENT ON COLUMN public.products.warranty_type IS 'Who backs the warranty: the manufacturer, the seller, or a paid extended plan.';
COMMENT ON COLUMN public.products.warranty_duration IS 'Human-readable duration, e.g. "1 Year", "6 Months".';
COMMENT ON COLUMN public.products.warranty_provider IS 'Name of the company honoring the warranty, e.g. the brand or the store.';
COMMENT ON COLUMN public.products.warranty_service_method IS 'How the customer receives warranty service.';
COMMENT ON COLUMN public.products.warranty_notes IS 'Any extra conditions, e.g. "Original purchase invoice required."';
