-- Expands order_status with the full delivery/pickup/returns lifecycle.
-- This migration ONLY adds enum values. Postgres does not allow a newly
-- added enum value to be referenced by another command in the same
-- transaction it was added in, so every other change (columns, tables,
-- functions that use these values) lives in later migration files.
--
-- Existing values kept as-is for backward compatibility with old rows:
--   pending, paid, shipped, delivered, cancelled, refunded
-- New values added below to support the full journey:
--   confirmed, packed, ready_for_pickup, out_for_delivery,
--   return_requested, return_approved, return_rejected
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_requested';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_approved';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_rejected';
