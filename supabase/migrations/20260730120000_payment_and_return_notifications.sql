-- Extends order notifications to the other events worth an alert: a
-- payment actually clearing (as distinct from the order just being
-- placed), a payment failing, and a customer requesting a return.
--
-- Deliberately NOT covered here (each is a deliberate choice, not an
-- oversight):
--   * Order status changes (packed/shipped/out for delivery/etc) and
--     admin's manual "Mark paid" — these are actions the store owner
--     themselves takes from the admin app, so notifying about them would
--     just be notifying you about your own click.
--   * Low stock — a threshold-crossing condition rather than a single
--     event, and needs a different mechanism (a database trigger calling
--     out via pg_net, since stock only ever changes inside a Postgres
--     trigger with no client request to hang a notification call off of).
--     Happy to build it if you want it — flagging it as a deliberate
--     omission here rather than a gap.

-- One order can become "paid" via three independent paths (the Razorpay
-- webhook, the client-side verify-payment call, or wallet credit covering
-- the full total) that can race each other. Each path attempts the
-- notification unconditionally; this column is what actually guarantees
-- only one send per order, no matter which path gets there first.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_paid_notified_at TIMESTAMPTZ;

-- Same idea for a failed payment attempt — at most one "payment failed"
-- alert per order, even if the shopper's card is declined on more than
-- one retry.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_failed_notified_at TIMESTAMPTZ;

-- A return request is only ever created once per row (create_return_request
-- makes a new row every call), so this isn't guarding against the same
-- request being claimed twice by different code paths the way the orders
-- columns above are — it's just the same "claim before you send" shape,
-- for a retried client call.
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
