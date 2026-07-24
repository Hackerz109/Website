-- Generic rate-limit / lockout store, shared by login, password-reset
-- requests, and signup. One row per (scope, identifier).
--
-- `identifier` is prefixed with its type so the same table can track an
-- email, an IP, and a device fingerprint independently for the same
-- action, e.g.:
--   scope='login', identifier='email:foo@bar.com'
--   scope='login', identifier='ip:203.0.113.7'
--   scope='login', identifier='device:9f2a...'
--
-- Only ever touched via the service-role client from
-- src/lib/rateLimit.server.ts — never exposed to the browser, so RLS
-- intentionally grants nothing to anon/authenticated roles.
DROP TABLE IF EXISTS public.login_attempts;

CREATE TABLE public.rate_limits (
  scope TEXT NOT NULL,
  identifier TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, identifier)
);

CREATE INDEX rate_limits_locked_until_idx ON public.rate_limits (locked_until);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated — this table is only ever read or
-- written by the service-role client on the server.
