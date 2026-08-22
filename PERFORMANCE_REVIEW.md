# Performance review — 2026-08-22

First dedicated performance pass — database load, fetching, and request
volume. Grounded in the live Supabase advisors and real `analytics_performance_metrics`
data rather than guessing, then fixed what was safely fixable from the
exported code (no `node_modules`, no registry access, so nothing here was
build-verified — see "Not done" at the bottom for why a few real
opportunities were left alone rather than shipped blind).

## Starting signal: real Web Vitals, 7-day window (n=27, low-traffic site)

| Metric | Avg | p75 |
|---|---|---|
| TTFB | 1225ms | 1883ms |
| LCP | 2315ms | 3339ms |
| CLS | 0.034 | — |

TTFB over a second is the standout — consistent with every request doing
a cross-Pacific round trip (see the region fix below). CLS is already
solidly in "good" territory (<0.1), and `error_logs` has zero rows in 7
days, both of which say the font-loading and image-sizing work from
earlier sessions is holding up — confirmed, not re-flagged as a problem.

## Fixed: database

- **22 missing foreign-key indexes** across 13 tables (`orders.user_id`,
  every `order_items` FK, `wallet_transactions`, `return_requests`,
  `product_reviews`, etc.) — Postgres only auto-indexes the referenced
  side of a FK, never the referencing side. Every "my orders" query,
  order-detail view, and the order-items RLS policy's `EXISTS` subquery
  were sequential-scanning these. Pure addition, can't change any query
  result. Migration: `add_missing_foreign_key_indexes`.
- **62 RLS policies across 34 tables rewritten to the `(select auth.uid())`
  pattern** — Supabase's performance advisor flagged these as re-evaluating
  `auth.uid()`/`has_role()` per row instead of once per query. Same access
  rules, same rows returned, just computed once instead of N times.
  Confirmed every rewritten policy's condition against a fresh read of
  `pg_policies` immediately before writing the migration, so nothing here
  is guessed. Migration: `optimize_rls_initplan_and_harden_new_trigger_functions`.
- **`user_addresses` had two permissive SELECT policies stacked** (one for
  "own address", one for "admin read") — split into one SELECT policy
  covering both conditions plus separate INSERT/UPDATE/DELETE policies,
  so a read only runs one check instead of two. Same access as before.
  Migration: `consolidate_user_addresses_select_policies`.
- Re-ran the performance advisor after all three migrations — the
  `unindexed_foreign_keys` and `auth_rls_initplan` categories are now
  empty. (The new indexes show as "unused" in that same report — expected,
  they're seconds old with no query history yet, not a real signal.)

## Fixed: Vercel ↔ Supabase region mismatch

`vercel.json` had no `regions` field, meaning serverless functions ran in
Vercel's default US region while Supabase is in Singapore (`nnxwzrryoxknjpfystrg`)
— every single DB call paid a cross-Pacific round trip, which lines up
exactly with the 1.2–1.9s TTFB above. Added `"regions": ["sin1"]`. This is
the single highest-leverage fix in this review; everything else shaves
request count or payload size, this shaves latency on every request that's
left.

## Fixed: unnecessary requests

- **React Query had no default `staleTime`** (`new QueryClient()` with no
  options → falls back to the library default of 0). Combined with React
  Query's own `refetchOnWindowFocus: true` default, every tab switch or
  app resume refetched every mounted query, on top of every remount. Set
  a global `staleTime: 60_000` in `src/router.tsx` — anything genuinely
  needing tighter freshness (cart, checkout stock check, admin live views)
  can still set its own shorter value at the call site; this only changes
  the fallback.
- **`defaultPreloadStaleTime: 0`** meant the router's "intent" preloading
  (starts a route's data fetch on touchstart) was pure waste — by the time
  the tap actually landed, that 0ms-stale preload was already discarded
  and re-fetched from scratch. Raised to 10s so an actual tap (which
  follows touchstart by well under a second) reuses what intent already
  fetched instead of doubling the request.

## Fixed: overfetching

`lib/productSearch.ts` already has a well-designed shared column list,
`PRODUCT_SEARCH_SELECT`, built specifically to exclude `search_vector` — a
generated tsvector column (~950 bytes/product average) that nothing in
the UI reads, only the search RPCs use it server-side. Only `search.tsx`
and `SearchBar.tsx` were actually using it, though. `index.tsx` (homepage),
`product.$slug.tsx`, `category.$name.tsx`, and `collections.tsx` all had
their own `select("*, ...")` calls, pulling that column into every
homepage load, every product view, every category browse, and every
collections browse. Verified `PRODUCT_SEARCH_SELECT`'s explicit list
against a live `information_schema.columns` read first — it's a complete
superset of `products` minus `search_vector`, so this was safe to swap
with nothing silently lost. `product.$slug.tsx` specifically keeps its own
join sub-selects (it needs `sort_order` and per-variant `mrp_cents`, which
the shared constant's joins don't include) — only its base-column `"*"`
was replaced.

## Fixed: unbounded catalog fetch (partial — see "Not done")

`collections.tsx` had no `.limit()` at all — every visit fetched *every*
active product (currently 44, but no ceiling) with full joins, then
"Load more" just reveals more of the already-downloaded array client-side.
Added a defensive `.limit(300)` — at today's catalog size this changes
nothing, it only stops a much larger future catalog from silently pulling
everything on every visit. Same addition on `category.$name.tsx`, which
had the identical unbounded pattern with less blast radius (bounded by
category size already). Confirmed the `hasMore = visible < allProducts.length`
check in `collections.tsx` degrades gracefully against a capped fetch —
"Load more" just stops offering more once the cap's hit, same as reaching
the real end of the catalog today.

## Confirmed already correct (not re-flagged)

- Realtime: the one `supabase.channel()` subscription (admin analytics
  live feed) is cleaned up via `removeChannel` in its `useEffect` return —
  no leak.
- Font loading: preconnect hints + async non-blocking stylesheet load +
  `display=swap` + matching fallback font stack in `styles.css` — already
  exactly right, and the CLS number above backs that up.
- Homepage/product-detail loaders already run their independent queries in
  parallel (`Promise.all`) rather than sequentially.

## Not done — flagged instead of guessed

- **Route-level code splitting** (`createLazyFileRoute`) — genuinely not
  used anywhere, so every route's code ships in the initial bundle
  regardless of which page is visited. This is a real opportunity, but
  `routeTree.gen.ts` is hand-patched per new route and has broken the
  build before from far smaller changes, and I have no way to run `vite
  build` here to catch a mistake before it ships. Converting routes to
  lazy loading touches that file's structure directly — worth doing as
  its own focused pass where the result can actually be built and tested,
  not bundled blind into a larger change.
- **True server-side pagination for `/collections`** — the defensive
  `.limit(300)` above is a ceiling, not a fix. The real fix is fetching
  only the next page on each "Load more" click instead of slicing an
  already-fully-fetched array, which means changing the loader *and* the
  click handler *and* how the total/"has more" state is known, together,
  as one tested change — not something to split across a blind edit.
- **Nitro's default build target** — `vite.config.ts`'s
  `@lovable.dev/vite-tanstack-config` wrapper comments its own nitro
  preset as defaulting to `cloudflare`, while this deploys on Vercel. This
  may be exactly why `routeTree.gen.ts` doesn't auto-regenerate on Vercel's
  build step (a known recurring issue) — or Vercel's own build detection
  may already override it; I can't tell which without access to that
  package's source or a real build to observe. Worth checking Vercel's
  build logs for which framework/preset it reports detecting, rather than
  me changing a wrapped config blind.
- **`npm audit` / `bun audit`** — same blocker as `SECURITY_REVIEW.md`: no
  registry access from this environment.
