/**
 * Generic rate limiter used by every attack-surface-facing form (sign-in,
 * password reset requests, sign-up). Tracks attempts against THREE
 * independent identifiers per request — email, IP, and a client-generated
 * device id — because relying on just one is easy to route around:
 *   - email only  → attacker rotates emails from one IP, never trips it
 *   - IP only     → attacker behind CGNAT/VPN can lock out real users,
 *                    and rotating IPs defeats it entirely
 *   - device only → cleared by clearing site data / incognito
 * Combining them means an attacker has to defeat all three at once to stay
 * under the radar, while a genuine user tripping one (e.g. shared office
 * IP) doesn't usually trip the others.
 *
 * A request is blocked if ANY identifier for that scope is currently locked.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type IdentifierType = "email" | "ip" | "device" | "user";
export type Identifier = { type: IdentifierType; value: string | null | undefined };

export type RateLimitConfig = {
  /** attempts allowed within the window before locking */
  limit: number;
  /** rolling window in ms that attempts are counted within */
  windowMs: number;
  /** how long the lock lasts once tripped */
  lockMs: number;
};

export type ScopeConfig = Partial<Record<IdentifierType, RateLimitConfig>>;

// Tune these per action. Email limits are the tightest (protects one
// account); IP limits are looser (shared IPs are common) but still catch
// credential stuffing / mass account creation; device limits are a light
// extra layer since they're trivial to reset.
export const RATE_LIMIT_CONFIGS: Record<string, ScopeConfig> = {
  login: {
    email: { limit: 5, windowMs: 30 * 60_000, lockMs: 15 * 60_000 },
    ip: { limit: 20, windowMs: 30 * 60_000, lockMs: 15 * 60_000 },
    device: { limit: 10, windowMs: 30 * 60_000, lockMs: 15 * 60_000 },
  },
  password_reset: {
    email: { limit: 3, windowMs: 60 * 60_000, lockMs: 60 * 60_000 },
    ip: { limit: 10, windowMs: 60 * 60_000, lockMs: 60 * 60_000 },
  },
  signup: {
    ip: { limit: 6, windowMs: 60 * 60_000, lockMs: 60 * 60_000 },
    device: { limit: 3, windowMs: 24 * 60 * 60_000, lockMs: 24 * 60 * 60_000 },
  },
  // AI Product Console: every command spends a Gemini API call, so this is
  // about capping cost/abuse, not brute-force protection like the scopes
  // above. Keyed on the admin's own user id (the real identity here, since
  // callers are already authenticated admins) with IP as a loose backstop.
  ai_console: {
    user: { limit: 60, windowMs: 60 * 60_000, lockMs: 5 * 60_000 },
    ip: { limit: 120, windowMs: 60 * 60_000, lockMs: 5 * 60_000 },
  },
  // New-order alerts (Telegram + admin push): the notified_at claim in
  // /api/order-notify already makes a real order fire at most once, so this
  // is only here to stop someone from hammering the endpoint with bogus
  // order ids. Loose and IP-only — genuine checkouts never come close.
  order_notify: {
    ip: { limit: 30, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
  payment_notify: {
    ip: { limit: 30, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
  return_notify: {
    ip: { limit: 30, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
  support_notify: {
    ip: { limit: 30, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
  push_subscribe: {
    ip: { limit: 20, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
  // Analytics telemetry: fires on every route change / error for every
  // visitor, so limits are generous — this is about capping a scripted
  // flood, not slowing down real browsing.
  analytics_track: {
    ip: { limit: 600, windowMs: 10 * 60_000, lockMs: 5 * 60_000 },
  },
  analytics_error: {
    ip: { limit: 100, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
  // One beacon per pageview (sent on visibilitychange, same cadence as
  // analytics_track), so the same generous per-IP allowance applies.
  analytics_vitals: {
    ip: { limit: 600, windowMs: 10 * 60_000, lockMs: 5 * 60_000 },
  },
  // One row per completed search (not per keystroke — the client only
  // calls this once results have settled), same generous per-IP allowance
  // as the other telemetry scopes above.
  search_log: {
    ip: { limit: 600, windowMs: 10 * 60_000, lockMs: 5 * 60_000 },
  },
  // Coupon validation: unlike the scopes above this isn't really about
  // credential stuffing, it's about stopping a scripted caller from
  // guessing coupon codes (including hidden ones — see the migration that
  // revoked direct anon/authenticated access to validate_coupon()). A
  // genuine shopper never tries more than a handful of codes in a
  // session, so this can be tight without affecting real use.
  validate_coupon: {
    user: { limit: 20, windowMs: 15 * 60_000, lockMs: 30 * 60_000 },
    ip: { limit: 30, windowMs: 15 * 60_000, lockMs: 30 * 60_000 },
  },
  // Address autofill (reverse/forward/pincode) — unauthenticated, and each
  // call proxies to a free third-party API (Nominatim / India Post) that
  // has its own strict usage limits. A genuine shopper triggers this a
  // handful of times per checkout; this is here to stop a scripted flood
  // from getting the site's shared outbound IP rate-limited or blocked by
  // those upstreams for everyone.
  geocode: {
    ip: { limit: 40, windowMs: 10 * 60_000, lockMs: 10 * 60_000 },
  },
};

// Show a captcha this many attempts before the (email) identifier actually
// locks, so genuine users get a speed bump before a hard stop.
export const CAPTCHA_BEFORE_LOCK = 2;

export type RateLimitStatus = {
  locked: boolean;
  lockedUntil: string | null;
  /** highest attempt count across all checked identifiers */
  maxAttemptCount: number;
  /** true once the email identifier is within CAPTCHA_BEFORE_LOCK of locking */
  requireCaptcha: boolean;
};

function prefixedIdentifiers(identifiers: Identifier[]): { type: IdentifierType; key: string }[] {
  return identifiers
    .filter((i): i is { type: IdentifierType; value: string } => !!i.value)
    .map((i) => ({ type: i.type, key: `${i.type}:${i.value.trim().toLowerCase()}` }));
}

export function getClientIp(request: Request): string {
  // Works out of the box on Vercel/Netlify/Cloudflare-style deployments,
  // which set (and strip client-supplied copies of) these headers at the
  // edge. If you self-host behind your own reverse proxy, make sure it
  // does the same — otherwise a client could forge x-forwarded-for and
  // this becomes spoofable.
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function checkRateLimit(scope: string, identifiers: Identifier[]): Promise<RateLimitStatus> {
  const config = RATE_LIMIT_CONFIGS[scope];
  const keys = prefixedIdentifiers(identifiers);
  if (!config || keys.length === 0) return { locked: false, lockedUntil: null, maxAttemptCount: 0, requireCaptcha: false };

  const { data: rows } = await supabaseAdmin
    .from("rate_limits")
    .select("identifier, attempt_count, window_started_at, locked_until")
    .eq("scope", scope)
    .in("identifier", keys.map((k) => k.key));

  const now = Date.now();
  let locked = false;
  let lockedUntil: string | null = null;
  let maxAttemptCount = 0;
  let requireCaptcha = false;

  for (const { type, key } of keys) {
    const cfg = config[type];
    if (!cfg) continue;
    const row = rows?.find((r) => r.identifier === key);
    if (!row) continue;

    const windowExpired = now - new Date(row.window_started_at).getTime() > cfg.windowMs;
    const stillLocked = !!row.locked_until && new Date(row.locked_until).getTime() > now;

    if (stillLocked) {
      locked = true;
      if (!lockedUntil || new Date(row.locked_until!) > new Date(lockedUntil)) lockedUntil = row.locked_until;
    }
    if (!windowExpired) {
      maxAttemptCount = Math.max(maxAttemptCount, row.attempt_count);
      if (type === "email" && row.attempt_count >= cfg.limit - CAPTCHA_BEFORE_LOCK) requireCaptcha = true;
    }
  }

  return { locked, lockedUntil, maxAttemptCount, requireCaptcha };
}

/**
 * Records one attempt against every given identifier for this scope, and
 * locks any identifier that crosses its configured limit within its window.
 * Call this on every login failure, every password-reset request, or every
 * signup submission — whatever the scope's "countable event" is.
 */
export async function recordAttempt(scope: string, identifiers: Identifier[]): Promise<RateLimitStatus> {
  const config = RATE_LIMIT_CONFIGS[scope];
  const keys = prefixedIdentifiers(identifiers);
  if (!config || keys.length === 0) return { locked: false, lockedUntil: null, maxAttemptCount: 0, requireCaptcha: false };

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data: rows } = await supabaseAdmin
    .from("rate_limits")
    .select("identifier, attempt_count, window_started_at, locked_until")
    .eq("scope", scope)
    .in(
      "identifier",
      keys.map((k) => k.key),
    );

  const upserts = keys
    .map(({ type, key }) => {
      const cfg = config[type];
      if (!cfg) return null;
      const existing = rows?.find((r) => r.identifier === key);
      const windowExpired = !existing || now - new Date(existing.window_started_at).getTime() > cfg.windowMs;

      const nextCount = windowExpired ? 1 : existing!.attempt_count + 1;
      const windowStartedAt = windowExpired ? nowIso : existing!.window_started_at;
      const lockedUntil = nextCount >= cfg.limit ? new Date(now + cfg.lockMs).toISOString() : null;

      return {
        scope,
        identifier: key,
        attempt_count: nextCount,
        window_started_at: windowStartedAt,
        locked_until: lockedUntil,
        updated_at: nowIso,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (upserts.length > 0) {
    await supabaseAdmin.from("rate_limits").upsert(upserts, { onConflict: "scope,identifier" });
  }

  return checkRateLimit(scope, identifiers);
}

/** Clears rate-limit state for these identifiers within a scope — call on a successful login. */
export async function clearRateLimit(scope: string, identifiers: Identifier[]): Promise<void> {
  const keys = prefixedIdentifiers(identifiers).map((k) => k.key);
  if (keys.length === 0) return;
  await supabaseAdmin.from("rate_limits").delete().eq("scope", scope).in("identifier", keys);
}
