-- Order notifications: Telegram + Web Push to the admin app whenever a new
-- order is placed. Fires once per order at creation time — covers every
-- fulfillment/payment path (cash on pickup, online, wallet-covered) since
-- they all insert into `orders` + `order_items` the same way.
--
-- This does NOT fire again when payment_status later changes (e.g. cash
-- collected at pickup, or the Razorpay webhook marking an order paid) — one
-- alert per order, worded with whatever payment state was true at the time.

-- ---------------------------------------------------------------------------
-- 1. Idempotency marker. /api/order-notify claims this atomically
--    (`UPDATE ... WHERE notified_at IS NULL`) before sending anything, so a
--    retried or duplicate call — same order twice — can never double-send.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Web Push subscriptions for the admin PWA. One row per device/browser
--    that has turned on order notifications from the admin app. Only admins
--    can have rows here — this feature has no meaning for a regular
--    customer account, so unlike most tables here it's "own row AND admin"
--    rather than "own row OR admin".
-- ---------------------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- No policy needed for the sending side (/api/order-notify reading every
-- row to push to) — it runs as supabaseAdmin (service role), which bypasses
-- RLS entirely, same as every other admin-only server route in this project.
