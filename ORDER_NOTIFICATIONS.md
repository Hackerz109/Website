# Order Notifications (Telegram + admin app push) — what was added

Fires once per order — Store Pickup, Home Delivery, Cash on Pickup, or paid
online, doesn't matter — at the moment the order is placed. It does not fire
again later when payment status changes (e.g. cash collected at pickup, or
the Razorpay webhook marking an order paid).

## 1. Setup

```bash
bun install                 # picks up the new `web-push` dependency
supabase db push             # applies the new migration (or however Lovable Cloud syncs migrations)
```

**New environment variables** (add these wherever the site's other secrets
live — Vercel/Lovable Cloud project settings, not in the repo):

| Variable | Where it goes | What it's for |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | server | Your bot's token from BotFather |
| `TELEGRAM_CHAT_ID` | server | The private chat the bot sends order alerts to |
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

## 2. Database (`supabase/migrations/20260730110000_order_notifications.sql`)

- `orders.notified_at` — nullable timestamp. `/api/order-notify` claims it
  atomically (`UPDATE ... WHERE notified_at IS NULL`) before sending
  anything, so a retried or duplicate call for the same order can never
  double-send.
- `push_subscriptions` — one row per device that's enabled push from the
  admin app (`user_id`, `endpoint`, `p256dh`, `auth`). RLS: an admin can only
  read/write their own rows; regular customer accounts can't have rows here
  at all. The sending side reads every row using the service-role client,
  same trust model as every other admin-only server route in this project.

## 3. What fires it (`src/routes/cart.tsx`)

Right after an order and its `order_items` are successfully inserted —
covers every checkout path since they all go through that same insert — the
client fires a non-blocking `POST /api/order-notify` with just the order id.
If it fails for any reason, the order itself is unaffected; this is a
side-channel alert, not part of checkout.

## 4. `/api/order-notify` (`src/routes/api.order-notify.ts`)

- Claims `notified_at` atomically, then looks up the order + its items
  itself — the message is always built from what's actually in the
  database, **never** from anything in the request body, so there's no way
  to make this endpoint send arbitrary text. The request body only says
  *which* order to notify about.
- Sends both channels in parallel: `sendTelegramMessage` (`src/lib/telegram.server.ts`)
  and `sendPushToAdmins` (`src/lib/push.server.ts`).
- Rate-limited by IP (`order_notify` scope in `src/lib/rateLimit.server.ts`)
  purely to stop someone from hammering it with bogus order ids — the
  `notified_at` claim already caps real orders at one send each.

## 5. Admin app push (`public/sw.js`, `src/components/PushNotificationSetup.tsx`)

- The service worker now handles `push` (shows the OS notification) and
  `notificationclick` (focuses an open admin tab, or opens one, at the
  relevant order) — it doesn't cache anything or change any other request.
- `PushNotificationSetup` is the bell button in the admin header
  (`src/routes/admin.tsx`). It subscribes via the browser's Push API using
  `VAPID_PUBLIC_KEY` (served from `/api/vapid-public-key` — safe to expose,
  that's how VAPID public keys are meant to be used) and registers the
  subscription via `/api/push-subscribe`, which requires an authenticated
  admin session (same auth pattern as `api.ai-console.ts`).
- iOS requires the site to be **added to the Home Screen** (Safari Share →
  Add to Home Screen) before push permission can be granted at all — this is
  an Apple platform restriction, not something the app can work around.

## 6. Message content

Both channels get the same information: order id, customer name/email,
line items with quantities and prices, destination (pickup vs. delivery
address), and payment status (paid / cash on pickup / awaiting payment). The
push notification body is a shorter one-line summary; tapping it opens the
order in the admin panel.
