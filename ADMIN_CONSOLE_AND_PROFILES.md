# Admin Console Expansion + Customer Profiles — what was added

This document covers the feature set added on top of everything in `NEW_FEATURES.md`. Nothing existing was removed or renamed — only additive columns, tables, routes, and one small repurposing note (see §6).

## 1. Setup

```bash
bun install                  # no new dependencies — everything used was already installed
supabase db push              # applies the 1 new migration (or however Lovable Cloud syncs migrations)
```

No new environment variables are required.

**Nothing to configure by hand** — Customer IDs backfill automatically for existing accounts the moment the migration runs, and the `avatars` storage bucket is created by the migration itself.

## 2. Database (`supabase/migrations/20260720100000_admin_console_profiles.sql`)

| Adds | Detail |
|---|---|
| `profiles.customer_code` | Auto-assigned, sequential, human-friendly account ID (`CUS-000001`, `CUS-000002`, …). Backfilled for every existing account in signup order. A trigger silently reverts any non-admin attempt to change it — it only works as a lookup handle if customers can't quietly change it. |
| `profiles.phone`, `.avatar_url`, `.last_seen_at` | Self-service profile fields. `last_seen_at` is updated by `touch_last_seen()`, called once per session from `useAuth`. |
| `user_addresses` | Saved addresses (label, name, phone, line1/2, city, state, pincode, one default). Owner has full CRUD; admins get read-only access for the customer detail page. |
| `avatars` storage bucket | Public, same pattern as the existing `product-images` bucket. Path convention `{user_id}/{file}`, enforced by policy. |
| `admin_list_customers`, `admin_get_customer` | Paginated/searchable directory and single-customer lookup for the new Users pages — `profiles` RLS is self-read-only, so (same reasoning as the existing `admin_search_customers`) these are `SECURITY DEFINER`, gated on `has_role(auth.uid(), 'admin')`. |
| `admin_set_admin_role` | Grants/revokes the `admin` role. Refuses to let an admin remove their own access, and refuses to demote the last remaining admin. |
| `admin_dashboard_stats` | One JSON round-trip for the whole Overview page: customer/order counts, 30-day revenue + daily series, wallet liability, pending returns, low stock, top products. |
| `orders.admin_notes` | Internal-only note field on orders, separate from the customer's own checkout `notes` — reviewing an order can never overwrite what the customer wrote. Covered by the existing "admin update orders" policy, no new grants needed. |

## 3. Customer-facing pages

- **`/profile`** (new) — linked from the account menu. Shows the customer's Customer ID (with copy button), avatar, name, phone, "member since," and quick links to Orders/Wallet. Three tabs: **Details** (name/phone, avatar upload), **Addresses** (add/edit/delete, set default), **Security** (change password).
- **Account menu** (header) — now shows an avatar, the account name, and the Customer ID under the email, plus a "My profile" link.

## 4. Admin pages

- **Users** (new) — searchable, paginated customer directory: avatar, name, email, Customer ID, order count, lifetime spend, wallet balance, admin badge.
  - **Customer detail** (new, `/admin/users/$id`) — full picture for one customer: contact info, Customer ID, joined/last-seen dates, order history (links into order detail), full wallet ledger, saved addresses, return requests, and a grant/revoke-admin control.
- **Orders** — order numbers now link to a new **order detail page** (`/admin/orders/$id`): customer info (with a link to their full profile), delivery/pickup details, line items, the customer's own checkout note kept separate from a new admin-only notes field, full payment/coupon/wallet breakdown, the same status timeline customers see, and any related return requests.
- **Overview** — rebuilt: 30-day revenue (with an area chart) and all-time total, order counts, total customers with 30-day growth, wallet liability, average order value, an orders-by-status breakdown, top products by units sold, and low stock — each tied to `admin_dashboard_stats()` in one call.
- **Store Wallet** — customer lookup now links to their full profile page.

## 5. Files touched

New: the migration above; `src/lib/{profile,admin-customers,admin-dashboard}.ts`; `src/routes/{profile,admin.users,admin.users.$id,admin.orders.$id}.tsx`.
Edited: `src/integrations/supabase/types.ts` (new columns/table/functions), `src/hooks/useAuth.ts` (loads the user's own profile), `src/components/StoreHeader.tsx`, `src/lib/utils.ts` (shared `initials()` helper), `src/routes/admin.tsx` (nav), `src/routes/admin.index.tsx` (rebuilt), `src/routes/admin.orders.tsx` (order numbers now link out), `src/routes/admin.wallet.tsx` (profile link), `src/routeTree.gen.ts` (registers the 4 new routes — see the note already at the top of that file: this project's build step doesn't regenerate it automatically, so new routes are added by hand the same way the existing ones were).

## 6. Notable design decisions / known limitations

- **Why a separate `admin_notes` on orders**: `orders.notes` is the customer's own checkout instructions (e.g. "leave at the gate"). An admin-notes feature that reused it would silently overwrite that on save — worth flagging since it's the one place this update touches a pre-existing column's *meaning* rather than just adding to it (the column itself is untouched).
- **Saved addresses aren't wired into checkout yet** — `/profile` manages them independently. Prefilling checkout from a saved address would be a natural, small follow-up.
- **Customer ID format** is fixed at `CUS-` + 6 digits. If you'd rather have a different prefix or width, it's one `DEFAULT` expression in the migration.
- **`admin_dashboard_stats()`** computes revenue only from `payment_status = 'paid'` orders, over a fixed trailing 30-day window — there's no date-range picker yet.
