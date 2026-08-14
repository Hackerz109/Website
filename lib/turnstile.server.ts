/**
 * We verify Turnstile tokens ourselves rather than relying on Supabase's
 * built-in "Enable Captcha protection" toggle — that toggle requires a
 * token on EVERY auth call unconditionally, with no way to say "only once
 * someone's failed a few times." Verifying it ourselves lets us keep the
 * "captcha only appears after repeated failures" behavior.
 *
 * Requires TURNSTILE_SECRET_KEY as a server-side env var (no VITE_ prefix —
 * it must never reach the browser bundle).
 */
export async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Captcha isn't configured on this deployment — don't block sign-in
    // over a missing optional feature; the rate-limit lockouts still apply.
    return true;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
