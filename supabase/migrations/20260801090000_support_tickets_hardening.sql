-- Hardening pass on the support ticket system after a security review.
--
-- The gap: create_support_ticket / add_support_message are called straight
-- from the browser via supabase.rpc(), which never touches a Vercel API
-- route — so src/lib/rateLimit.server.ts (Node-side, only reachable from
-- inside a server.handlers function) can't see or protect these calls at
-- all. Without this, any signed-in account could script unlimited tickets
--/messages, each one firing a Telegram + push notification.
--
-- Fix: enforce rate limits inside the RPCs themselves, in the database,
-- using the same public.rate_limits table your Node limiter already
-- writes to (see 20260723120000_generic_rate_limits.sql) — just with new
-- scopes and a 'user:<uuid>' identifier instead of email/ip/device, since
-- the caller is already authenticated here. SECURITY DEFINER means this
-- runs with the function owner's privileges, so it can read/write that
-- table despite its RLS granting nothing to anon/authenticated directly.
--
-- Also adds a length cap on message bodies — nothing enforced that before,
-- so an oversized paste could bloat storage and (before it's truncated for
-- the notification preview) the DB row itself.

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  p_scope TEXT,
  p_identifier TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER,
  p_lock_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_next_count INTEGER;
  v_window_started TIMESTAMPTZ;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Row lock for the duration of this transaction — makes concurrent
  -- calls for the same (scope, identifier) serialize instead of racing
  -- past the limit check together.
  SELECT * INTO v_row FROM public.rate_limits
  WHERE scope = p_scope AND identifier = p_identifier
  FOR UPDATE;

  IF v_row.identifier IS NOT NULL AND v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN
    RETURN false;
  END IF;

  IF v_row.identifier IS NULL OR v_row.window_started_at < v_now - make_interval(secs => p_window_seconds) THEN
    v_next_count := 1;
    v_window_started := v_now;
  ELSE
    v_next_count := v_row.attempt_count + 1;
    v_window_started := v_row.window_started_at;
  END IF;

  v_locked_until := CASE WHEN v_next_count >= p_limit THEN v_now + make_interval(secs => p_lock_seconds) ELSE NULL END;

  INSERT INTO public.rate_limits (scope, identifier, attempt_count, window_started_at, locked_until, updated_at)
  VALUES (p_scope, p_identifier, v_next_count, v_window_started, v_locked_until, v_now)
  ON CONFLICT (scope, identifier) DO UPDATE
  SET attempt_count = excluded.attempt_count,
      window_started_at = excluded.window_started_at,
      locked_until = excluded.locked_until,
      updated_at = excluded.updated_at;

  RETURN v_next_count <= p_limit;
END;
$$;

-- Same signature as before (p_subject, p_message, p_id) — CREATE OR
-- REPLACE only swaps the body safely as long as the parameter list is
-- unchanged.
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
  IF length(p_message) > 4000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Message is too long — please keep it under 4000 characters.');
  END IF;
  -- 5 new conversations/hour/user, then locked out for 30 min.
  IF NOT public.enforce_rate_limit('support_ticket_create', 'user:' || auth.uid()::text, 5, 3600, 1800) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Too many new conversations — please wait a bit and try again.');
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.support_tickets (id, user_id, subject, status, customer_name, customer_email, last_message_at, last_message_from)
  VALUES (v_ticket_id, auth.uid(), coalesce(nullif(left(btrim(p_subject), 200), ''), 'General question'), 'open', v_name, v_email, now(), 'customer');

  INSERT INTO public.support_messages (id, ticket_id, sender_id, sender_role, body)
  VALUES (v_message_id, v_ticket_id, auth.uid(), 'customer', btrim(p_message));

  RETURN jsonb_build_object('success', true, 'ticket_id', v_ticket_id, 'message_id', v_message_id);
END;
$$;

-- Same signature as before (p_ticket_id, p_body).
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
  IF length(p_body) > 4000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Message is too long — please keep it under 4000 characters.');
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Conversation not found.');
  END IF;
  IF v_ticket.user_id != auth.uid() AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not your conversation.');
  END IF;

  v_role := CASE WHEN v_is_admin AND v_ticket.user_id != auth.uid() THEN 'admin' ELSE 'customer' END;

  -- Admins get a much looser cap — a small, trusted set of accounts that
  -- legitimately sends more messages. Customers are capped tighter, since
  -- this is the actual spam/harassment surface.
  IF v_role = 'admin' THEN
    IF NOT public.enforce_rate_limit('support_message_admin', 'user:' || auth.uid()::text, 120, 600, 300) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Sending too fast — please wait a moment.');
    END IF;
  ELSE
    -- 20 messages/10 min/user, then locked out for 10 min.
    IF NOT public.enforce_rate_limit('support_message_customer', 'user:' || auth.uid()::text, 20, 600, 600) THEN
      RETURN jsonb_build_object('success', false, 'message', 'You''re sending messages too fast — please wait a bit and try again.');
    END IF;
  END IF;

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
