# Support Ticket System

Replaces the fake `/contact` form with a real two-way messaging system between
a customer and you. Follows the same patterns as the returns system (RPC
writes, RLS reads) and the order/return notifications (Telegram + admin push,
best-effort, idempotent).

## How it works

1. A signed-in customer sends a message from `/contact`. This calls
   `create_support_ticket`, which opens a `support_tickets` row + first
   `support_messages` row, then fires `/api/support-notify` (fire-and-forget).
2. `notifyNewSupportMessage` claims the message (`notified_at IS NULL`, same
   idempotency pattern as orders/returns) and sends you a Telegram message +
   push notification, same channel you already use for new orders/returns.
   Tapping the push notification opens `/admin/support/<ticket id>`.
3. You reply from `/admin/support`. That calls `add_support_message`, which
   fires the same notify endpoint — this time it emails the customer a
   short "you've got a reply" preview (new `email.server.ts`, via Brevo's
   HTTP API) since customers don't have Telegram/push here. The email is
   just a nudge, not the conversation itself — replying still happens on
   `/support`.
4. The customer sees replies at `/support` (linked from the account menu as
   "My messages") or by clicking through from the email. Both the customer
   and admin thread views poll every 6–8s while open, so replies show up
   without a manual refresh.
5. A customer message on a resolved ticket automatically reopens it. You can
   mark a ticket resolved/reopen it from the thread page.

Login is required to message you, same as checkout/orders/returns — nothing
in this codebase currently supports guest actions, so this didn't introduce
a new pattern.

## New environment variables

Add these in Vercel (Project Settings → Environment Variables):

- `BREVO_API_KEY` — from Brevo → Settings → SMTP & API → API Keys. This is
  **not** the same as your existing `BREVO_SMTP_PASSWORD` — that's for
  Supabase Auth's SMTP integration; this is Brevo's separate HTTP API key,
  used only for the "you got a reply" email to customers.
- `BREVO_FROM_EMAIL` — the sender address for that email (must be a verified
  sender in your Brevo account).
- `BREVO_FROM_NAME` — optional, defaults to "Sanjay Electricals".

If these aren't set, customer email notifications silently no-op (logged as
a warning) — everything else keeps working, same graceful-degrade behavior
as the existing Telegram/push setup when *those* env vars are missing.

## New files

- `supabase/migrations/20260731100000_support_tickets_system.sql` — tables,
  RLS, and 3 RPCs (`create_support_ticket`, `add_support_message`,
  `admin_set_ticket_status`)
- `src/lib/email.server.ts` — Brevo transactional email helper
- `src/lib/supportNotify.server.ts` — notification dispatch
- `src/routes/api.support-notify.ts` — rate-limited notify endpoint
- `src/lib/supportTickets.ts` — client data layer
- `src/routes/support.tsx` + `support.$id.tsx` — customer "My messages"
- `src/routes/admin.support.tsx` + `admin.support.$id.tsx` — admin inbox

## Changed files

- `src/routes/contact.tsx` — real form, gated behind sign-in
- `src/routes/admin.tsx` — added "Support" nav item
- `src/components/StoreHeader.tsx` — added "My messages" to account menu
- `src/lib/rateLimit.server.ts` — added `support_notify` scope
- `src/integrations/supabase/types.ts` — added the 2 new tables, 2 new
  enums, and 3 new RPC signatures
- `src/routeTree.gen.ts` — manually registered the 5 new routes (same
  manual-patch situation as every other route added recently — see the
  comment at the top of that file)

## Not included (possible next steps)

- Live updates use polling, not Supabase Realtime (nothing in this codebase
  uses Realtime yet, so I kept it consistent rather than introducing a new
  pattern). Fine for a support inbox; if it ever feels laggy, Realtime on
  `support_messages` would make it instant.
- No attachments/images in messages.
- No per-customer rate limit on `add_support_message` itself (mirrors
  `create_return_request`, which also has none) — only the notify endpoint
  is rate-limited, since that's the actual cost/spam surface.
