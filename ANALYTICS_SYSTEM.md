# Analytics section — what was added

A full `/admin/analytics` area with 9 tabs (Executive Overview, Users, Geographic, Traffic,
Business, Errors, Real-Time, Alerts, Reports & Exports). Nothing existing was touched except
`admin.tsx` (one new nav item) and `__root.tsx` (mounts the pageview/error tracker, and hooks
the root error boundary into it).

## 1. Setup

```bash
npm install                  # still no new packages — Web Vitals capture uses the native
                              # PerformanceObserver API rather than the web-vitals package
supabase db push              # applies all 4 migrations (20260809120000, 20260809120100,
                               # 20260810090000, 20260811090000)
```

Optional env var: `CRON_SECRET` — if set, Vercel Cron (see `vercel.json`) can trigger alert
checks and scheduled reports automatically. Without it, both still work via the manual "Check
now" / "Send test now" buttons in the UI; they just won't run unattended.

## 2. What's real data vs. new instrumentation

Registrations, revenue, transactions, refunds, wallet, coupons, and state/city breakdowns for
customers are all queried directly from your existing `profiles` / `orders` / `order_items` /
`return_requests` / `wallet_transactions` / `user_addresses` tables — no placeholder numbers.

Traffic, sessions, page views, bounce rate, device/browser/source breakdowns, error tracking,
and the real-time feed needed tracking that didn't exist yet. Two new tables
(`analytics_sessions`, `analytics_events`) are now populated by an invisible `<AnalyticsTracker />`
mounted in the app shell — every page view calls `/api/analytics-track`, which derives
device/browser/OS from the real User-Agent header and country/region/city from **Vercel's own
edge geo headers** (no geocoding API/key, consistent with removing LocationIQ). Historical data
for these obviously starts at zero the day this ships — there's no way to backfill traffic that
was never recorded.

Client-side errors (window `error`/`unhandledrejection`, plus the root TanStack Router error
boundary) log to a new `error_logs` table via `/api/analytics-error`. Since then, three more
things feed the same table and pipeline:

- **Broken resources** (`error_type: 'resource'`) — a second, capture-phase `window` error
  listener catches failed `<img>`/`<script>`/`<link>`/`<source>` loads, which the original
  listener structurally could not see (resource-load failures don't bubble, so a normal
  bubble-phase listener on `window` never receives them — see `network-monitor.ts`).
- **Failed/slow API calls** (`error_type: 'api'`) — `window.fetch` is wrapped once (still returns/
  throws exactly what the real `fetch` would) to catch non-2xx same-origin responses, outright
  network failures, and responses slower than 4s. Only method/path/status/duration are ever
  recorded, never request/response bodies or headers.
- **Server-side failures on the payment/webhook routes** — the `logServerError`-style helper this
  doc used to describe as future work now exists (`src/lib/errorLog.server.ts`) and is wired into
  the highest-risk failure points in `api.create-razorpay-order.ts`,
  `api.verify-razorpay-payment.ts`, `api.refund-razorpay-payment.ts`,
  `api.razorpay-webhook.ts`, and `api.whatsapp-webhook.ts` — missing config, gateway errors,
  invalid webhook signatures, and (most importantly) the "gateway succeeded but our DB update
  failed" cases, where money has already moved and the inconsistency would otherwise be silent
  until someone noticed manually. It's additive: every existing `console.error`/`console.warn`
  call site is left in place, so Vercel's own function logs are still a fallback if the DB or this
  table is what's broken. Not every route in the app got this treatment — just the ones where a
  silent failure means money or a webhook event gets lost.

Separately, **page performance** (`analytics_performance_metrics`, a new table) is captured via
the native `PerformanceObserver` API — LCP, CLS, FCP, TTFB, and a long-task counter — no new npm
dependency. One beacon per real page load (not per SPA route change — see the comment in
`performance-tracker.ts` for why), sent via `/api/analytics-vitals` on `visibilitychange`→hidden.
**Connectivity** (going offline / coming back online) rides the existing pageview pipe as a custom
`analytics_events.event_type`, no schema change needed for that part.

Two things are intentionally shown as honest zeros rather than invented: **suspended/deleted
users** (this schema has no ban or soft-delete flag on `profiles` yet) and **subscriptions**
(this store only sells one-time purchases). Both are labeled in the UI rather than faked.

## 3. Database (`supabase/migrations/20260809120000_*.sql`, `20260809120100_*.sql`,
`20260810090000_*.sql`, `20260811090000_*.sql`)

| Table | Purpose |
|---|---|
| `analytics_sessions` | One row per visit — device/browser/OS/geo/UTM captured once per session. |
| `analytics_events` | Page views + custom events (including connectivity changes), linked to a session. |
| `error_logs` | One row per error occurrence — `error_type` is `frontend` / `resource` / `api` / `database` / `job`; grouped by type+message+page at query time (not a maintained counter), so first-seen/last-seen/frequency are always accurate for any date range. |
| `analytics_performance_metrics` | One row per real page load — LCP/CLS/FCP/TTFB/load time + long-task counters. Any field can be null ("not measured" — e.g. unsupported in that browser), never a false 0. |
| `analytics_alert_rules` / `analytics_alert_events` | Alert configuration and history. |
| `analytics_scheduled_reports` | Scheduled-report configuration. |

All six are admin-only to read (RLS via the existing `has_role()`); writes to the tracking
tables only ever happen through `service_role`, via three ingestion functions
(`analytics_ingest_event`, `analytics_log_client_error`, `analytics_ingest_performance`) that are
never GRANTed to `authenticated`/`anon` — the public API routes are the only door in, and they're
rate-limited the same way the rest of the app's public endpoints are. Every client-supplied field
across all three (error type, status code, every performance number) is whitelisted/clamped in the
calling TS route *and* independently clamped again in the SQL function itself, so a malformed or
hostile payload can only ever distort a single row, never fail in an unbounded way.

Seven reporting functions (`analytics_overview_stats`, `analytics_user_stats`,
`analytics_geo_stats`, `analytics_traffic_stats`, `analytics_business_stats`,
`analytics_error_stats`, `analytics_realtime_snapshot`) follow `admin_dashboard_stats`'s existing
convention exactly — `SECURITY DEFINER`, has_role-gated, one `jsonb_build_object`, and (like it)
filter paid orders by `created_at` so the numbers here agree with the existing `/admin` Overview
page for the same nominal period. They're also reachable by `service_role` (not just
`authenticated`) since the scheduled-report generator calls them with no user JWT at all.
`analytics_traffic_stats` now also returns a `performance` block (avg LCP/CLS/FCP/TTFB, and the
% of pageviews with "poor" LCP/CLS by the standard Core Web Vitals thresholds), filtered by the
same device/browser/source/country params as the rest of that tab.

`analytics_evaluate_alerts()` checks every enabled rule against current vs. prior windows and
notifies through the **same two channels order-notify already uses** — Telegram + admin push —
rather than adding a third notification system. It now supports an eighth metric,
`slow_pageviews_pct` (the same "poor LCP" percentage above), so a spike in slow pageviews can
notify the admin the same way an error-rate spike already does.

`analytics_purge_old_data()` now also ages out `analytics_performance_metrics` on its own 60-day
cutoff, same batched-delete shape as the other three tables.

## 4. Routes added

- `/admin/analytics` (+ 9 child routes) — the UI, all under the existing admin auth gate. The
  Traffic tab now also has a "Page performance" card row (LCP/CLS/TTFB/slow-pageview %).
- `/api/analytics-track`, `/api/analytics-error`, `/api/analytics-vitals` — public, rate-limited
  ingestion. `/api/analytics-error` now also accepts (whitelisted) `error_type` and (clamped)
  `status_code` instead of always hardcoding `frontend`.
- `/api/analytics-alerts-check`, `/api/analytics-reports-run` — GET (Vercel Cron, via
  `CRON_SECRET`) or POST (admin's own session) — evaluate alerts / run due reports.

## 5. Exports

No PDF/Excel library exists in this project and none could be installed mid-task (no network in
the build sandbox), so exports lean on formats the browser and Excel already open natively:
CSV/JSON need nothing, "Excel" is an HTML table saved with a `.xls` extension (Excel opens this
directly), and PDF is the browser's own print-to-PDF against a print-styled page. All are real,
working exports — just zero-dependency ones.

## 6. Known simplifications

- Traffic filtering supports device/browser/source/country; a per-page filter was left out of the
  SQL (the existing "top pages" breakdown covers page-level detail).
- "Custom metric selection" for reports wasn't built as its own picker — the 7 report types
  (including "Complete") cover the same ground with far less UI surface.
- Vercel Cron frequency (`vercel.json`) may need adjusting depending on your plan — Hobby plans
  historically cap how often crons can run. The manual buttons always work regardless of plan.
- Server-side error logging was added to the 5 payment/webhook routes specifically
  (`create-razorpay-order`, `verify-razorpay-payment`, `refund-razorpay-payment`,
  `razorpay-webhook`, `whatsapp-webhook`) — the highest-stakes ones, where a silent failure means
  money or a customer notification gets lost — not swept across every route in the app. Every
  other route's existing `console.error` calls are unchanged; adding the same `logServerError()`
  call to any of them later is a one-line addition, same pattern as the routes above.
- Page-performance capture measures real page loads, not individual client-side (SPA) route
  changes — see the comment in `performance-tracker.ts` for why that's a deliberate choice rather
  than a gap.

## 7. Security notes

Everything added here follows the same trust model the original system already used — worth
restating since it now includes more attacker-reachable surface (public endpoints, a wrapped
`fetch`, more error_types flowing into a table an admin reads):

- **Every public ingestion endpoint is rate-limited** per IP (`rateLimit.server.ts`), and now also
  rejects oversized request bodies before parsing them.
- **Every client-supplied value is whitelisted or clamped**, not passed through — `error_type` and
  `status_code` against an explicit allow-list/range in the TS route, every performance number
  clamped to a sane range in both the TS route and the SQL function independently.
- **No request/response bodies or headers are ever logged** by the fetch monitor — only
  method/path/status/duration — since bodies can carry auth tokens or payment details. Query
  strings are dropped too (only the pathname is kept), for the same reason `__root.tsx` already
  redacts auth-secret query params from Vercel Analytics.
- **No secrets are logged** in any of the new `logServerError()` call sites — signature mismatches
  and gateway errors log the fact and a truncated response body, never the signature, secret, or
  API key involved.
- **RLS is admin-only on every new/changed table**, same as before — there is still no
  `authenticated`/`anon` INSERT policy anywhere in this system; the only way in is through the
  three SECURITY DEFINER ingestion functions, which are only ever GRANTed to `service_role`.
- **Attacker-controlled text (error messages, URLs, stack traces) is always rendered as plain
  React text** in the admin UI, never `dangerouslySetInnerHTML` — so even a deliberately malicious
  message logged through the public error endpoint can't execute anything in the admin's browser.
