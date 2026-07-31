# Order Notifications (Telegram + admin app push) — what was added

Five events now alert you, each exactly once:

| Event | Fires from | Message |
|---|---|---|
| New order placed | Any checkout (pickup/delivery, online/cash/wallet) | 🛒 Order details, items, destination, payment status |
| Payment received | Razorpay webhook, client-side verify, or wallet fully covering the order — whichever gets there first | 💰 Amount + method |
| Payment failed | Razorpay webhook | ⚠️ Amount, order — a nudge to check in with the customer |
| Return requested | Customer submits a return | ↩️ Items, reason, preferred refund method |

**Deliberately not included** — each a conscious choice, not a gap:
- Order status changes (packed/shipped/etc) and manually marking an order paid — these are things *you* click from the admin app, so alerting you about your own action isn't useful.
- Low stock — this needs a different mechanism (stock only changes inside a database trigger, with no request to hang a notification call off), so it wasn't bundled in here. Ask if you want it added.

## 1. Setup

```bash
bun install                 # picks up the new `web-push` dependency
supabase db push             # applies both new migrations (or however Lovable Cloud syncs migrations)
```

**New environment variables** (add these wherever the site's other secrets
live — Vercel/Lovable Cloud project settings, not in the repo):

| Variable | Where it goes | What it's for |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | server | Your bot's token from BotFather |
| `TELEGRAM_CHAT_ID` | server | The private chat the bot sends alerts to |
| `VAPID_PUBLIC_KEY` | server | Push key pair — public half |
| `VAPID_PRIVATE_KEY` | server | Push key pair — private half, keep secret |
| `VAPID_SUBJECT` | server | A `mailto:` address, required by the push spec |

**A key pair has already been generated for you** so you don't need to run
anything to get one:

```
VAPID_PUBLIC_KEY=BHOiM_FsZcLXcgKFkKoXyovINZ3_uU2GKFze658hqtZaFcyAjKZxMVc2WmKlKKQ6k3swKOmRNavGF4qWIOOuRSo
VAPID_PRIVATE_KEY=y9cW8GjIGbi6KIbLdlQlZkMKYDcjVCRujkuUPt16-5Q
VAPID_SUBJECT=mailto:youremail@example.com
```

Set `VAPID_SUBJECT` to a real email you check — Apple/Google push services
use it to contact you if something's wrong (e.g. a key needs rotating),
never for anything user-facing.

**Getting a Telegram bot token + chat id** (~2 minutes, one-time):
1. In Telegram, open a chat with **@BotFather** → send `/newbot` → give it
   any name/username. It replies with your `TELEGRAM_BOT_TOKEN`.
2. Send your new bot any message (e.g. "hi") — bots can't message you
   first, so this step is required.
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser
   (with your real token in place of `<TOKEN>`) and find `"chat":{"id":...}`
   in the response — that number is your `TELEGRAM_CHAT_ID`.
4. Set both as env vars and redeploy.

**Turning on push in the admin app**: once deployed, open **Admin** and tap
**"Get order alerts"** in the header (bell icon). It'll ask for notification
permission — allow it. That device is now subscribed; repeat on any other
phone/laptop that should also get alerts. Each device subscribes
independently, so this is a one-time step per device, not per admin account.

## 2. Database

- `supabase/migrations/20260730110000_order_notifications.sql` —
  `orders.notified_at` (new-order idempotency) + `push_subscriptions` table.
- `supabase/migrations/20260730120000_payment_and_return_notifications.sql` —
  `orders.payment_paid_notified_at`, `orders.payment_failed_notified_at`,
  `return_requests.notified_at`. Every code path that can result in a paid
  order (there are three — see below) attempts the payment notification
  unconditionally; these columns are what actually guarantee one send per
  order no matter which path gets there first, not caller discipline.

## 3. What fires each event

- **New order** (`src/routes/cart.tsx`) — right after an order + its
  `order_items` are inserted, for every checkout path.
- **Payment received** — three independent, racing paths all call
  `notifyPaymentPaid` (`src/lib/paymentNotify.server.ts`):
  - `src/routes/api.razorpay-webhook.ts` (`payment.captured`)
  - `src/routes/api.verify-razorpay-payment.ts` (the instant client-side
    confirmation right after Razorpay Checkout succeeds)
  - `src/lib/wallet.ts` (`redeemWalletForOrder`, via the new
    `src/routes/api.payment-notify.ts`) when wallet credit covers the full
    remaining balance
- **Payment failed** — `src/routes/api.razorpay-webhook.ts`
  (`payment.failed`), via `notifyPaymentFailed`.
- **Return requested** — `src/lib/returns.ts` (`createReturnRequest`), via
  the new `src/routes/api.return-notify.ts` and
  `src/lib/returnNotify.server.ts`.

All of these are non-blocking / best-effort: if a notification fails to
send, the underlying action (checkout, payment, return) is completely
unaffected — it's a side channel, never part of the critical path.

## 4. `/api/order-notify`, `/api/payment-notify`, `/api/return-notify`

Same trust model on all three: the request only ever says *which* order or
return to notify about. The message itself is always built from what's
actually in the database, never from anything in the request body, so
there's no way to make any of them send arbitrary text. Each is rate-limited
by IP (`order_notify` / `payment_notify` / `return_notify` scopes in
`src/lib/rateLimit.server.ts`) purely to stop someone hammering them with
bogus ids — the per-order/per-return atomic claim already caps real events
at one send each.

## 5. Admin app push (`public/sw.js`, `src/components/PushNotificationSetup.tsx`)

- The service worker handles `push` (shows the OS notification) and
  `notificationclick` (focuses an open admin tab, or opens one, at the
  relevant order/returns page) — it doesn't cache anything or change any
  other request.
- `PushNotificationSetup` is the bell button in the admin header
  (`src/routes/admin.tsx`). It subscribes via the browser's Push API using
  `VAPID_PUBLIC_KEY` (served from `/api/vapid-public-key` — safe to expose,
  that's how VAPID public keys are meant to be used) and registers the
  subscription via `/api/push-subscribe`, which requires an authenticated
  admin session (same auth pattern as `api.ai-console.ts`).
- iOS requires the site to be **added to the Home Screen** (Safari Share →
  Add to Home Screen) before push permission can be granted at all — this is
  an Apple platform restriction, not something the app can work around.

## 6. Not fixed, but found along the way

`src/routes/contact.tsx`'s form doesn't actually send anywhere — it fakes a
success toast after a timeout (there's a comment in the code saying so).
Left untouched since it's outside this feature's scope, but it means contact
messages are currently silently lost. Worth wiring into this same
Telegram/push system, or an inbox table, whenever you're ready.

