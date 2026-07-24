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

export type IdentifierType = "email" | "ip" | "device";
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
