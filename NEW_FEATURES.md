# Delivery, Returns, Refunds & Store Wallet — what was added

This document covers the full feature set added on top of the existing auth/cart/checkout/orders/admin panel. Nothing existing was removed — only additive columns, tables, and routes.

## 1. Setup

```bash
bun install                 # picks up the new `leaflet` dependency
supabase db push             # applies the 6 new migrations (or however Lovable Cloud syncs migrations)
```

No new environment variables are required — delivery/returns/wallet all reuse the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

**First-time admin setup** (Admin → Delivery & Pickup):
1. Add your shop location (drag the pin or use "Use my location").
2. Add at least one delivery zone (e.g. "5 km zone", radius 5) — until a zone exists, every address is outside the delivery area and only Store Pickup is offered.
3. Set delivery charge type (flat or distance tiers), pickup charge, ETAs, and instructions.

## 2. Database (6 new migrations, `supabase/migrations/2026071909*`)

| File | Adds |
|---|---|
| `..._order_status_expansion.sql` | New `order_status` values: `confirmed`, `packed`, `ready_for_pickup`, `out_for_delivery`, `return_requested`, `return_approved`, `return_rejected` (kept in its own migration — Postgres won't let a new enum value be used in the transaction that added it). |
| `..._delivery_zone_system.sql` | `store_locations`, `delivery_zones`, `delivery_rate_tiers`, `delivery_settings` (singleton), a Haversine distance function, and the public RPCs `check_delivery_eligibility`, `calculate_delivery_charge`, `get_delivery_info`. Direct table access is admin-only (RLS); everyone else goes through the RPCs — same trust model as the existing coupon system. |
| `..._orders_delivery_wallet_fields.sql` | New columns on `orders` (`fulfillment_type`, `delivery_zone_id`, `delivery_lat/lng`, `delivery_distance_km`, `wallet_used_cents`, per-status timestamps...), plus `order_status_history` (full timeline) and the trigger that logs every status change and stamps timestamps. |
| `..._returns_refunds_system.sql` | `return_requests`, `return_items`, `return_images`, a private `return-images` storage bucket, and the RPCs `create_return_request` / `admin_review_return`. |
| `..._store_wallet_system.sql` | `wallet_transactions` (append-only ledger — balance is always `SUM(amount_cents)`, never a stored counter), and the RPCs `wallet_redeem_for_order`, `admin_wallet_adjust`, `admin_process_refund`. Also attaches the orders status trigger (needs this table to exist first) and auto-refunds any wallet credit if an order is cancelled. |
| `..._admin_customer_search.sql` | `admin_search_customers` — `profiles` RLS is self-read-only, so the wallet admin page needs this to look customers up by name/email. |

All money-moving writes (wallet debit/credit, return review, refund processing) go through `SECURITY DEFINER` functions with an explicit `has_role(auth.uid(), 'admin')` check where relevant, and wallet mutations take a per-user `pg_advisory_xact_lock` so concurrent requests can't overdraw a balance.

## 3. Checkout changes (`src/routes/cart.tsx`)

- Store Pickup vs Home Delivery choice.
- "Use my current location" (browser Geolocation API) → reverse-geocoded via OpenStreetMap Nominatim to prefill the address, always editable. A small Leaflet map lets the shopper drag the pin or tap to adjust — this doubles as the "manual entry" fallback when location permission is denied, with structured address/city/state/pincode/phone fields alongside it.
- Delivery charge is computed server-side (`calculate_delivery_charge` RPC) and re-checked again immediately before charging, same pattern already used for coupons. If the address is outside every delivery zone, Home Delivery is disabled and the UI switches to Store Pickup with an explanation.
- Wallet balance can be applied as full or partial payment; Razorpay is only invoked for whatever remains due (`api.create-razorpay-order.ts` now charges `total_cents - wallet_used_cents`).
- All existing coupon logic and the Razorpay payment flow are untouched.

## 4. Customer-facing pages

- **`/orders/$id`** (new) — full status timeline/stepper, delivery or pickup details, return request flow (item + quantity + reason + up to 6 photos + preferred refund method), and return history for that order.
- **`/wallet`** (new) — balance + full transaction ledger.
- **`/orders`** — now links into the detail page and shows the fulfillment method + proper status labels.

## 5. Admin pages

- **Delivery & Pickup** (new) — map overview, shop location CRUD (with its own draggable-pin picker), delivery zone CRUD, flat/distance charge settings, free-delivery threshold, pickup charge, ETAs and instructions. Everything is editable with no code changes.
- **Returns & Refunds** (new) — review queue, per-item approve/reject/partial-approve, then "Refund to wallet" (instant) or "Refund to original payment" (calls the new `/api/refund-razorpay-payment` route, which hits the real Razorpay Refunds API and is disabled automatically when the order wasn't paid via Razorpay).
- **Store Wallet** (new) — search a customer, view their balance/ledger, manual credit or debit with a required reason.
- **Orders** — status dropdown now covers the full lifecycle, a Method column shows delivery vs pickup, and there's a one-click "Mark ready for pickup".

## 6. Notable design decisions / known limitations

- **Leaflet, not Google Maps** — no API key needed, so the map works immediately. Uses raw Leaflet (not `react-leaflet`) so it has no dependency on the app's React 19 version.
- **Nominatim reverse geocoding** is client-side and unauthenticated — fine for normal usage, but if checkout traffic is high, proxy it server-side per Nominatim's usage policy.
- **Return window**: any `delivered` order can be returned any time (no hard cutoff) — reject old requests manually via admin notes if you want a policy cutoff; a configurable window would be a small follow-up.
- **`order_status_history`** is the source of truth for the timeline; a few convenience timestamp columns exist on `orders` for quick access but aren't required for display.
- Nothing about the existing schema was renamed or removed — `orders.shipping_cents` is now documented as "the delivery or pickup charge actually applied" rather than adding a duplicate column.
