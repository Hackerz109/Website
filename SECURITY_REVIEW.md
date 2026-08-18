# Security review — 2026-08-18

Follow-up to the one open item from 2026-08-16, below — now resolved.

## Resolved: RLS confirmed on `brands`, `categories`, `product_images`, `product_variants`

Queried directly against the live database (not inferred from migrations
— these four tables predate migration tracking, see the 2026-08-16 entry
below for why that mattered):

- **RLS is enabled** (`rowsecurity = true`) on all four tables.
- **Every INSERT/UPDATE/DELETE policy** on all four requires
  `has_role(auth.uid(), 'admin'::app_role)` in `qual`/`with_check` — a
  regular signed-in customer cannot write to any of them, confirmed from
  the policy definitions themselves, not just their names.
- **Reads are correctly scoped**: `product_images`/`product_variants`
  only expose rows belonging to `active = true` products to
  anonymous/public callers; `brands`/`categories` are fully public (fine
  — just taxonomy, no reason to restrict).

This closes the one item the 2026-08-16 review couldn't verify from
exported code alone. `admin.products.tsx` / `admin.taxonomy.tsx` writing
directly from the browser to these four tables is safe as-is — the RLS
policies are the real enforcement, and they're correct.

### Worth knowing, not a fix-it item

`product_images`/`product_variants` also grant any *authenticated* user
(`auth read all images` / `auth read all variants`, both `qual: true`)
read access to every row regardless of the parent product's `active`
status — not just admins. Anonymous visitors are correctly restricted to
active products only; this is specifically signed-in customers being able
to see images/variants for inactive/unlaunched products too. Could be
intentional (e.g. so someone can still see what they ordered after a
product's discontinued) — flagging so it's a deliberate choice rather
than an unnoticed one, not urging a change either way.

## Still outstanding

- **`npm audit` / `bun audit`** — still nobody's run this. Same ask as
  the last two reviews; worth wiring into CI once it's done manually.

---

# Security review — 2026-08-16

Follow-up pass, ~3.5 weeks after the review below. Re-verified both fixes
from 2026-07-24 are still intact, then went through everything added
since (30 new migrations — bulk pricing, cash on pickup, support tickets,
analytics, search, CSP). No new critical or medium issues found. One
thing I can't verify from the exported code and need you to check
directly — see below.

## Needs your input — can't verify from the exported code (RESOLVED 2026-08-18 — see top of file)

`brands`, `categories`, `product_images`, and `product_variants` exist in
your live database (confirmed via the generated `types.ts`) but have no
`CREATE TABLE` anywhere in this migrations folder — unlike every other
table in the app, which is fully tracked. They almost certainly predate
migration tracking (created directly in the Supabase/Lovable dashboard
before 2026-07-11, the earliest migration here).

This isn't just a paperwork gap. `admin.products.tsx` and
`admin.taxonomy.tsx` write to all four of these directly from the
signed-in admin's own browser session — `.insert()` / `.update()` /
`.delete()` calls straight to the client, plus
`supabase.storage.from("product-images").upload(...)` for images — none
of it routed through a server API. There's no code-level admin check on
these calls at all; whatever stops a regular signed-in customer from
doing the same thing has to be a Postgres RLS policy, and I have no way
to see whether one exists.

Run this in the Supabase SQL editor to check:

```sql
-- Is RLS even on?
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('brands','categories','product_images','product_variants');

-- What can write, and who?
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('brands','categories','product_images','product_variants')
ORDER BY tablename, cmd;

-- Same question for the product-images storage bucket
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

If INSERT/UPDATE/DELETE on any of these comes back available to
`authenticated` without a `has_role(auth.uid(), 'admin')` check (or the
storage bucket has no admin-only write policy), share the output and
I'll write the migration to lock it down. I didn't want to guess here —
writing a policy blind risks either overwriting one that's already
correct, or, worse, quietly making something more permissive than what's
already there.

## Verified from 2026-07-24

- **Order pricing integrity** — `recompute_order_total()` is still wired
  in and was correctly extended on 2026-08-08 to cover the new
  bulk-quantity pricing feature (still re-derives everything from
  `products` / `product_variants` / `bulk_pricing_tiers` / `coupons` /
  `delivery_settings`, never the client). A shopper still can't influence
  what they're charged, no matter which new pricing feature touches the
  order.
- **Login rate-limit reset** — still requires a valid, just-issued
  session whose email matches the one being cleared.

## New since then, checked fresh

- **Analytics system** — every table RLS'd, admin-only reads, ingestion
  reachable only via `service_role` from server routes, not from the
  browser.
- **Support tickets** — got its own hardening pass the day after launch:
  rate limits enforced *inside* the RPCs themselves (the Node-side
  limiter can't see direct `supabase.rpc()` calls from the browser),
  plus a message-length cap.
- **CSP** — now live as `Content-Security-Policy-Report-Only`, exactly
  the cautious rollout the last review suggested, feeding violations
  into the admin Errors page through a rate-limited, size-capped
  `/api/csp-report` endpoint. `X-Frame-Options: DENY` is on now too.
- **Cash on Pickup** — stays `payment_status = 'pending'` (no stock
  deducted) until staff manually mark it paid — can't be used to get
  free or unpaid stock.
- **Webhooks** — Razorpay and WhatsApp signature checks both
  spot-checked again: HMAC + `timingSafeEqual`, unchanged.
- **`user_roles`** — re-checked the *entire* migration history, not just
  current state: no INSERT/UPDATE policy for regular users has ever
  existed. Self-escalation to admin still isn't possible.
- Every table that *is* tracked in migrations (27 of them) has RLS
  enabled — confirmed by diffing the full table list against every
  `ENABLE ROW LEVEL SECURITY` statement, not spot-checks.
- Fresh sweep of the whole `src/` tree for hardcoded secrets and
  `dangerouslySetInnerHTML` / `eval` — clean. The one
  `dangerouslySetInnerHTML` (chart theming) still only ever receives
  developer-defined color config, never user input.
- The 3 files changed earlier in this session (`ProductCard.tsx`,
  `search.tsx`, `SearchBar.tsx`) — plain-text JSX and typed router links
  only, nothing touching auth, payments, or raw HTML.

## Still outstanding (unchanged from last time)

- `npm audit` / `bun audit` — still can't run this myself (no registry
  access in my environment). Worth running yourself, and wiring into CI.

---

# Security review — 2026-07-24

Full read-through of the app (payments, auth, admin, RLS policies, secrets,
webhooks, headers). One critical issue fixed, one medium issue fixed, a few
recommendations left for you to action. Everything else checked out well —
see "What was already solid" at the bottom.

## Fixed

### 1. Critical — order totals were trusted from the browser

**The gap:** `orders` and `order_items` are inserted directly from
`src/routes/cart.tsx` using the signed-in user's own Supabase session.
Row-level security only checked that the row belonged to the caller — it
never checked that `total_cents` or `unit_price_cents` matched a real
product's price. Since the payment step (`/api/create-razorpay-order`) and
Store Wallet (`wallet_redeem_for_order`) both trust `orders.total_cents`,
anyone with a normal account could bypass the browser entirely, call the
Supabase API directly, and place — and pay for — an order at any price
they chose. Refunds and returns trace back to the same `order_items`
prices, so this one gap undermined those too.

**The fix:** `supabase/migrations/20260724120000_secure_order_pricing_integrity.sql`
adds `recompute_order_total()`, which re-derives subtotal, coupon discount,
shipping, and total from the actual `products` / `product_variants` /
`coupons` / `delivery_settings` tables, ignoring whatever the client sent.
It's wired to a trigger that fires automatically the moment `order_items`
are inserted — before any payment method is ever reachable — so it applies
no matter how the row was created, not just through the checkout UI. It
never touches an order that's already marked paid. A `coupon_redemptions`
trigger was added too, so the admin analytics (usage/discount/revenue) stay
accurate rather than reflecting whatever the client originally reported.

**You need to:** run this migration against your actual database (Lovable
Cloud / Supabase SQL editor, or `supabase db push`). It hasn't been applied
anywhere by me — I don't have your database credentials. Test a checkout
end-to-end in a staging project first. I'd also spot-check recent paid
orders for anything where `total_cents` looks too low for what's in
`order_items` — if this was ever actively exploited, this fix stops it
going forward but doesn't retroactively fix past orders.

### 2. Medium — login rate-limit could be reset by anyone

**The gap:** `/api/rate-limit` clears an email/IP/device's failed-login
counter whenever it receives `{ outcome: "success" }` — with nothing
verifying a login actually succeeded. Anyone could POST that directly for
any victim's email to keep wiping their own lockout state and brute-force
a password indefinitely.

**The fix:** `src/routes/api.rate-limit.ts` now requires a valid,
just-issued Supabase session token before honoring `"success"`, and checks
the token's email matches the one being cleared. `src/routes/auth.tsx`
passes that token through after a real sign-in. No API shape changes for
anything else.

## Recommended, not applied

- **Content-Security-Policy** — I didn't add one. This app pulls in Razorpay
  checkout, Cloudflare Turnstile, Leaflet/OpenStreetMap tiles, and Google
  Fonts, and TanStack Start's SSR hydration typically needs an inline
  script — a CSP guessed without being able to test it live risks silently
  breaking checkout, which is worse than having none. If you want this,
  start with `Content-Security-Policy-Report-Only` (logs violations to the
  browser console without blocking anything) using the domain list above as
  a starting point, watch the console on every page for a few days, then
  switch to enforcing.
- **X-Frame-Options** — left out for the same reason noted in `src/start.ts`:
  this repo is Lovable-connected, and Lovable's live preview may render the
  app in an iframe from its own origin, which this header would block. Add
  `X-Frame-Options: SAMEORIGIN` in `src/start.ts` next to the other headers
  once you've confirmed the editor preview still works.
- **`npm audit` / `bun audit`** — I couldn't run this (no registry access in
  my environment). Dependencies looked current (React 19, Vite 8, recent
  Supabase JS) but worth running yourself, and periodically in CI.
- **No `.gitignore` was in the export I received**, and no `.env` file was
  either — so I can't confirm what your real repo ignores. Double check
  `.env`, `.env.local`, and `node_modules` are actually gitignored, and that
  no secret was ever committed historically (a since-deleted `.env` commit
  is still recoverable from git history unless purged).

## Environment variables this app expects on the server (never in browser code)

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`PHONE_OTP_SECRET`, `TURNSTILE_SECRET_KEY`, `WHATSAPP_VERIFY_TOKEN`,
`WHATSAPP_APP_SECRET`, `WHATSAPP_ADMIN_NUMBER`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_OTP_TEMPLATE_NAME`. None of these were
found hardcoded anywhere in the codebase — all correctly read from
`process.env` in server-only files.

## What was already solid

Worth knowing what's *right*, not just what was wrong:

- Razorpay order creation, payment verification, refunds, and the webhook
  all do proper server-side signature checks (HMAC, timing-safe compare)
  and never trust a client-supplied amount directly.
- The service-role Supabase key is correctly isolated to `.server.ts`
  files/dynamic imports and never reaches the browser bundle.
- `user_roles` can't be self-escalated — no INSERT policy exists for
  regular users, and `admin_set_admin_role` is itself admin-gated.
- Phone OTP is hashed (HMAC + server pepper) rather than stored in the
  clear, rate-limited, and compared with a timing-safe check.
- The WhatsApp product-manager bot verifies Meta's webhook signature *and*
  checks the sender's number against an admin allowlist before executing
  any command.
- Wallet debits/credits use per-user advisory locks so concurrent requests
  can't overdraw a balance.
- No SQL injection surface (no dynamic SQL string-building) and no
  meaningful XSS surface (only `dangerouslySetInnerHTML` use is a
  standard shadcn/ui chart-theming call with no user input involved).
- The Supabase URL/publishable key being visible in the browser (dev tools
  → Network/Sources) is expected and fine — that's how Supabase apps work;
  the real protection is the row-level security policies, which is what
  this review focused on.
