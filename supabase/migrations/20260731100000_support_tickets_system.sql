-- Support tickets: two-way messaging between a customer and the store
-- owner, started from the /contact page. Same trust model as the returns
-- system — every table is read-only at the table level; all writes go
-- through the RPCs below. Notifications reuse the existing Telegram/push
-- side channel for the admin (see order_notifications migration) and add a
-- new best-effort email side channel for the customer, since customers
-- don't have Telegram/push wired up here.
--
-- customer_name/customer_email are deliberately denormalized onto
-- support_tickets (copied from profiles at creation time) rather than
-- joined at read time — profiles' RLS policy is self-read-only (see
-- 20260711073951_..._969fa686...sql: "own profile read" has no admin
-- clause), so the admin support list/detail pages couldn't otherwise show
-- who they're talking to without yet another admin-only RPC.

CREATE TYPE public.support_ticket_status AS ENUM ('open', 'resolved');
CREATE TYPE public.support_sender_role AS ENUM ('customer', 'admin');

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  customer_name TEXT,
  customer_email TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_from public.support_sender_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX support_tickets_user_idx ON public.support_tickets (user_id);
CREATE INDEX support_tickets_last_message_idx ON public.support_tickets (last_message_at DESC);
CREATE TRIGGER support_tickets_touch BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Read-only for everyone at the table level; every write happens through
-- create_support_ticket / add_support_message / admin_set_ticket_status.
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own support tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role public.support_sender_role NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Idempotency marker: /api/support-notify claims this atomically
  -- (UPDATE ... WHERE notified_at IS NULL) before sending anything, same
  -- pattern as orders.notified_at / return_requests.notified_at.
  notified_at TIMESTAMPTZ
);
CREATE INDEX support_messages_ticket_idx ON public.support_messages (ticket_id, created_at);

GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own support messages" ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- Customer-facing: opens a new conversation with its first message. Copies
-- the caller's own profile (readable — it's their own row) into the ticket
-- so the admin side has a name/email without needing to read someone
-- else's profiles row.
CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_subject TEXT,
  p_message TEXT,
  p_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID := coalesce(p_id, gen_random_uuid());
  v_message_id UUID := gen_random_uuid();
  v_name TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please sign in.');
  END IF;
  IF btrim(coalesce(p_message, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Message can''t be empty.');
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.support_tickets (id, user_id, subject, status, customer_name, customer_email, last_message_at, last_message_from)
  VALUES (v_ticket_id, auth.uid(), coalesce(nullif(btrim(p_subject), ''), 'General question'), 'open', v_name, v_email, now(), 'customer');

  INSERT INTO public.support_messages (id, ticket_id, sender_id, sender_role, body)
  VALUES (v_message_id, v_ticket_id, auth.uid(), 'customer', btrim(p_message));

  RETURN jsonb_build_object('success', true, 'ticket_id', v_ticket_id, 'message_id', v_message_id);
END;
$$;

-- Customer or admin: adds a reply to an existing conversation. Sender role
-- is derived from who's actually calling (never trusted from the caller).
-- A customer message reopens a resolved ticket; an admin reply never
-- changes status on its own — use admin_set_ticket_status for that.
CREATE OR REPLACE FUNCTION public.add_support_message(
  p_ticket_id UUID,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_is_admin BOOLEAN := public.has_role(auth.uid(), 'admin');
  v_role public.support_sender_role;
  v_message_id UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please sign in.');
  END IF;
  IF btrim(coalesce(p_body, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Message can''t be empty.');
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Conversation not found.');
  END IF;
  IF v_ticket.user_id != auth.uid() AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not your conversation.');
  END IF;

  -- An admin messaging a ticket that happens to be their own account's
  -- reads as a customer message — there's no "admin replying to himself"
  -- case in practice, so this just avoids a weird self-reply state.
  v_role := CASE WHEN v_is_admin AND v_ticket.user_id != auth.uid() THEN 'admin' ELSE 'customer' END;

  INSERT INTO public.support_messages (id, ticket_id, sender_id, sender_role, body)
  VALUES (v_message_id, p_ticket_id, auth.uid(), v_role, btrim(p_body));

  UPDATE public.support_tickets
  SET last_message_at = now(),
      last_message_from = v_role,
      status = CASE WHEN v_role = 'customer' THEN 'open' ELSE status END
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id, 'ticket_id', p_ticket_id);
END;
$$;

-- Admin-only: mark resolved / reopen.
CREATE OR REPLACE FUNCTION public.admin_set_ticket_status(
  p_ticket_id UUID,
  p_status public.support_ticket_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required.');
  END IF;

  UPDATE public.support_tickets SET status = p_status WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Conversation not found.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
