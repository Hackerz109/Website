# SEO fixes + ratings/reviews — 2026-10-23

Full-codebase pass: fixed a handful of small bugs, closed the SEO gaps
(per-page meta, sitemap, structured data), finished the ratings/reviews
feature whose backend already existed, and improved the product-image
lightbox's accessibility. No local build/typecheck was available in this
session (no network, no node_modules) — same constraint as prior rounds.
Verified instead by reading the actual generated Supabase types for every
table/column touched, and by running `tsc` in a mode that at least parses
every changed file for syntax errors (clean) even though it can't resolve
real library types without node_modules installed.

## Small fixes
- **iOS/Android install identity bug**: root `head()` was setting
  `apple-mobile-web-app-title` to `"SE Admin"` and linking the admin-only
  `manifest.webmanifest` (`name: "Sanjay Electricals Admin"`,
  `start_url: "/admin/products"`) site-wide. A customer adding the
  storefront to their home screen got the admin app's identity. Moved
  `mobile-web-app-capable`, `apple-mobile-web-app-*`, the manifest link,
  and a navy `theme-color` onto `/admin`'s own `head()` (admin.tsx) instead
  — first route in the app other than root to use `head()`, so this is a
  new pattern here; worth a visual smoke-test after deploy. Root keeps the
  cream `theme-color` for customer pages.
- Deleted 7 duplicate image files from `public/brands/` — confirmed
  byte-identical (md5sum) to the properly-named files already in use, and
  confirmed unreferenced anywhere in `src/` before removing.
- `coupons.ts` / `CouponShowcase.tsx` now use the shared `formatMoney()`
  instead of manual `₹...toFixed()` strings.
- Lightbox (product image zoom) already had Escape-to-close and a scroll
  lock — it was missing keyboard access to *open* it, `role="dialog"` +
  `aria-modal`, and focus moving in on open / back to the trigger on
  close. Added all three.

## SEO
- `public/robots.txt` added, pointing at a new sitemap.
- `src/routes/api.sitemap.ts`: dynamic XML sitemap (static pages + every
  active product + every category, queried live via `supabaseAdmin` on
  each request). Served at `/api/sitemap`, not `/sitemap.xml` — this
  codebase's file-based router treats dots as path segment separators
  (see `admin.products.tsx` → `/admin/products`), so a file literally
  named `sitemap.xml.ts` would route to `/sitemap/xml`, not `/sitemap.xml`.
  `/api/sitemap` mirrors the proven `api.geocode.ts` pattern instead of
  gambling on an unverified bracket-escape naming convention. A sitemap
  URL doesn't need a `.xml` extension — Google goes by the
  `Content-Type` header, which is set to `application/xml`.
  Registered in `routeTree.gen.ts` across all 10 spots the generator
  needs (mirrored exactly from how `api.geocode` is registered there),
  with a new dated manual-correction comment at the top of that file,
  consistent with the existing ones.
- `product.$slug.tsx`, `category.$name.tsx`, `collections.tsx` each got
  their own `head()`: real title/description, OG + Twitter tags (product
  pages include `og:image` from the primary product photo and
  `product:price:amount`), and a canonical link. Previously every page on
  the site — including these — inherited the homepage's tags, so a shared
  product link on WhatsApp/Facebook showed generic site branding instead
  of the actual product.
- `product.$slug.tsx` also renders Product JSON-LD (`<script
  type="application/ld+json">` in the page body — Google explicitly
  supports structured data in `<body>`, not just `<head>`, so this didn't
  need to go through the route's `head()` API) with price, availability,
  and `aggregateRating` when the product has reviews. This is what can
  make price/stock/rating show up directly in Google search results.

## Ratings & reviews
The `product_reviews` table, its RLS policies, and the
`recalc_product_rating()` trigger already existed (from the Aug 14
search/ratings migration) but had no UI — every product's rating was
null, meaning the "filter by rating" option in search could never
actually match anything. Added the UI on top of the existing schema,
no new migration:
- `src/lib/reviews.ts` — fetch reviews for a product; submit (upsert on
  `product_id, user_id`, since that pair is unique and a resubmission is
  meant to edit, not fail); delete.
- `src/components/StarRating.tsx` — reusable display (fractional fill,
  for averages like 4.3) and interactive 1–5 picker, visually matching
  the existing star rendering in `SearchFilters.tsx`.
- `src/components/ReviewsSection.tsx` — sits on the product page.
  Computes the average/count from the fetched review list itself rather
  than trusting the product row's `rating_avg`/`rating_count` (those are
  server-loader snapshots that would be a submission stale right after
  someone posts their own review). Sign-in gated, matching the
  `contact.tsx` pattern; lets a signed-in shopper post one review per
  product and edit or delete their own.
- `ProductCard.tsx` shows a compact star + average + count badge when a
  product has at least one review.

**Decision made on your behalf, flagged for a look**: reviews are open to
any signed-in user, not gated to verified purchasers — matches the RLS
policy exactly as already written (`own review insert` has no purchase
check), so this didn't need a new policy. Adding a "Verified Purchase"
badge later is possible but needs a small migration (RLS currently only
lets a user read their own orders, so there's no way to check *other*
reviewers' purchase history from the client as-is).

**Also flagged**: reviews don't show the reviewer's name. The `profiles`
table's RLS (`own profile read`, `auth.uid() = id`) only lets a user read
their *own* profile row, so a reviewer's name can't be joined client-side
for anyone else's review. Showing one would need a small, deliberately
narrow server-side exposure (e.g. a view or RPC returning just a first
name/initial) — a real decision about what you're comfortable exposing,
so left alone rather than guessed at.

## Changed files
`src/routes/__root.tsx`, `src/routes/admin.tsx`, `src/routeTree.gen.ts`,
`src/lib/coupons.ts`, `src/components/CouponShowcase.tsx`,
`src/routes/product.$slug.tsx`, `src/routes/category.$name.tsx`,
`src/routes/collections.tsx`, `src/components/ProductCard.tsx`,
`public/brands/*` (7 files removed)

## New files
`public/robots.txt`, `src/routes/api.sitemap.ts`, `src/lib/reviews.ts`,
`src/components/StarRating.tsx`, `src/components/ReviewsSection.tsx`

## Not done this round (queued)
Wishlist/save-for-later, "recently viewed" products, "you may also like"
recommendations, and saved-address autofill in checkout — all need new
tables/migrations, which is a different risk class from everything
above. `collections.tsx`'s product list is still client-fetched in full
(the true server-side pagination noted as a follow-up in
PERFORMANCE_REVIEW.md) — untouched this round.
