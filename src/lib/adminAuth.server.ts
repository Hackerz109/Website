// Verifies a request carries either the shared cron secret (for scheduled/
// automated calls) or a real admin's own session token (for a "run now"
// button in the admin UI). Used by the analytics cron-style routes, which —
// unlike every other route in this app — need to accept calls that aren't
// triggered by a browser at all.

export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return false;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return false;

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    return !!roleRow;
  } catch (err) {
    console.error("[adminAuth] verification error", err);
    return false;
  }
}

/** True if the request is either a valid cron call or a verified admin. */
export async function isCronOrAdminRequest(request: Request): Promise<boolean> {
  if (isCronRequest(request)) return true;
  return isAdminRequest(request);
}
