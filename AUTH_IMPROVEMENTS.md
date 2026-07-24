# Auth page improvements

## Rate limiting — how it actually works now
Single generic engine, `src/lib/rateLimit.server.ts`, used by every
attack-facing form via one route, `src/routes/api.rate-limit.ts`.

Every check/record call passes up to three identifiers for the same event:
- **email** — protects one specific account
- **ip** — read server-side from request headers, never trusted from the
  client; catches one source hitting many accounts (credential stuffing) or
  spraying reset emails
- **device** — a random id the browser generates and stores in
  localStorage (`src/lib/deviceId.ts`); weak alone (clearable) but adds a
  layer that a simple script rotating emails/IPs won't also defeat

A request is blocked if **any** of the three is currently locked out for
that scope. Thresholds live in `RATE_LIMIT_CONFIGS` at the top of
`rateLimit.server.ts` — email limits are tightest, IP limits looser (shared
IPs are normal), device limits are a light extra layer:

| scope | identifier | limit | window | lock |
|---|---|---|---|---|
| login | email | 5 | 30 min | 15 min |
| login | ip | 20 | 30 min | 15 min |
| login | device | 10 | 30 min | 15 min |
| password_reset | email | 3 | 60 min | 60 min |
| password_reset | ip | 10 | 60 min | 60 min |
| signup | ip | 6 | 60 min | 60 min |
| signup | device | 3 | 24 h | 24 h |

All state lives in one Postgres table, `public.rate_limits` (migration
`20260723120000_generic_rate_limits.sql`), keyed by `(scope, identifier)`
where identifier is prefixed like `email:foo@bar.com` / `ip:203.0.113.7` /
`device:9f2a...`. Only the service-role client touches it — RLS grants
nothing to anon/authenticated.

**Already covered, no changes needed:** `api.send-phone-otp.ts` (60s resend
cooldown, requires an authenticated session) and `api.verify-phone-otp.ts`
(max wrong-attempts before forcing a fresh code).

**Not covered / worth doing later if you want it:** an IP-level cap on
phone-OTP sends too, in case one attacker spins up several accounts to
burn through your WhatsApp sending budget. Didn't touch it since it's
already gated behind auth + a per-account cooldown, which is the main risk.

## Everything else
- **Forgot / reset password** — `/forgot-password` sends a reset email;
  `/reset-password` handles the emailed link and lets the user set a new
  password. Now rate-limited as above; the UI only ever tells the *account
  owner* they're being throttled (email-based block) — an IP-only block
  stays silent so a spray-across-many-emails attacker doesn't get a signal
  that they've been detected.
- **CAPTCHA after repeated failures** — after login's email identifier gets
  within 2 attempts of locking, a Cloudflare Turnstile widget appears
  (`TurnstileWidget.tsx`). Renders only once `VITE_TURNSTILE_SITE_KEY` is
  set. **Do NOT enable Supabase's own "Enable Captcha protection" toggle**
  (Authentication → Attack Protection) — that toggle demands a token on
  every single auth call unconditionally, which breaks normal first-attempt
  sign-in with a "captcha token not found" error, since our widget only
  appears after repeated failures. Instead, `src/routes/api.verify-captcha.ts`
  verifies the token ourselves against Cloudflare directly, gated by our own
  failure-count logic — so the toggle in Supabase should stay off, and you
  only need `TURNSTILE_SECRET_KEY` (server-side env var, no `VITE_` prefix)
  set wherever you deploy.
- **Password hashing** — handled server-side by Supabase Auth (bcrypt);
  nothing to add.
- **Session management** — handled by `@supabase/supabase-js` (short-lived
  JWT + auto-refreshed refresh token).
- **Remember me** — checkbox on sign-in. Unchecked, `useRememberMeGuard`
  (wired into `__root.tsx`) signs the user out the next fresh browser
  session.
- **Auto logout after inactivity** — `useIdleLogout` (also in `__root.tsx`),
  30 min of no activity. Change the timeout or remove the call if you don't
  want it — you flagged it as optional.
- **Show/hide password** — eye-icon toggle on every password field.

## Setup you still need to do
1. Apply the migration (`20260723120000_generic_rate_limits.sql`) — it also
   drops the old `login_attempts` table from the first pass, so you only
   need this one now, not the earlier one.
2. Regenerate `src/integrations/supabase/types.ts` from Supabase after
   applying it. I hand-added a `rate_limits` type entry so this compiles in
   the meantime — your normal codegen will replace it with the real one.
3. (Optional, for CAPTCHA) Create a Cloudflare Turnstile site, set
   `VITE_TURNSTILE_SITE_KEY` (site key, public) AND `TURNSTILE_SECRET_KEY`
   (secret key, server-side only — no `VITE_` prefix). Leave Supabase's own
   "Enable Captcha protection" toggle OFF — see the captcha note above for
   why.
4. Make sure `/reset-password` is an allowed redirect URL in Supabase
   Dashboard → Authentication → URL Configuration.
5. If you deploy behind your own reverse proxy (not Vercel/Netlify/
   Cloudflare), double-check it sets/strips `x-forwarded-for` correctly —
   `getClientIp()` in `rateLimit.server.ts` trusts that header, and a proxy
   that passes through a client-supplied one makes the IP check spoofable.
