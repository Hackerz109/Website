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
