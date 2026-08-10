# Analytics section — what was added

A full `/admin/analytics` area with 9 tabs (Executive Overview, Users, Geographic, Traffic,
Business, Errors, Real-Time, Alerts, Reports & Exports). Nothing existing was touched except
`admin.tsx` (one new nav item) and `__root.tsx` (mounts the pageview/error tracker, and hooks
the root error boundary into it).

## 1. Setup

```bash
npm install                  # no new packages were added — everything already in package.json
supabase db push              # applies the 2 new migrations (20260809120000, 20260809120100)
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
boundary) log to a new `error_logs` table via `/api/analytics-error`. Existing payment/webhook
routes were **not** modified to add server-side error logging — that was judged too risky to
retrofit blind across tested checkout code; `logServerError`-style logging is easy to add to any
route later via `supabaseAdmin.rpc("analytics_log_client_error", ...)`.

Two things are intentionally shown as honest zeros rather than invented: **suspended/deleted
users** (this schema has no ban or soft-delete flag on `profiles` yet) and **subscriptions**
(this store only sells one-time purchases). Both are labeled in the UI rather than faked.

## 3. Database (`supabase/migrations/20260809120000_*.sql`, `20260809120100_*.sql`)

| Table | Purpose |
|---|---|
| `analytics_sessions` | One row per visit — device/browser/OS/geo/UTM captured once per session. |
| `analytics_events` | Page views + custom events, linked to a session. |
| `error_logs` | One row per error occurrence; grouped by type+message+page at query time (not a maintained counter), so first-seen/last-seen/frequency are always accurate for any date range. |
| `analytics_alert_rules` / `analytics_alert_events` | Alert configuration and history. |
| `analytics_scheduled_reports` | Scheduled-report configuration. |

All five are admin-only to read (RLS via the existing `has_role()`); writes to the tracking
tables only ever happen through `service_role`, via two ingestion functions
(`analytics_ingest_event`, `analytics_log_client_error`) that are never GRANTed to
`authenticated`/`anon` — the public API routes are the only door in, and they're rate-limited
the same way the rest of the app's public endpoints are.

Seven reporting functions (`analytics_overview_stats`, `analytics_user_stats`,
`analytics_geo_stats`, `analytics_traffic_stats`, `analytics_business_stats`,
`analytics_error_stats`, `analytics_realtime_snapshot`) follow `admin_dashboard_stats`'s existing
convention exactly — `SECURITY DEFINER`, has_role-gated, one `jsonb_build_object`, and (like it)
filter paid orders by `created_at` so the numbers here agree with the existing `/admin` Overview
page for the same nominal period. They're also reachable by `service_role` (not just
`authenticated`) since the scheduled-report generator calls them with no user JWT at all.

`analytics_evaluate_alerts()` checks every enabled rule against current vs. prior windows and
notifies through the **same two channels order-notify already uses** — Telegram + admin push —
rather than adding a third notification system.

## 4. Routes added

- `/admin/analytics` (+ 9 child routes) — the UI, all under the existing admin auth gate.
- `/api/analytics-track`, `/api/analytics-error` — public, rate-limited ingestion.
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
