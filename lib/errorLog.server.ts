/**
 * Server-side counterpart to trackClientError (analytics-tracker.ts) —
 * writes into the same error_logs table via the same
 * analytics_log_client_error RPC, just called directly with the
 * service_role client instead of going through the public
 * /api/analytics-error endpoint (there's no client request to relay here,
 * and this runs with full server trust already).
 *
 * This is the `logServerError`-style helper ANALYTICS_SYSTEM.md flagged as
 * the intended way to wire up payment/webhook routes later, without
 * retrofitting them blind. It's now wired into the highest-risk routes —
 * the ones where a silent failure means money moved but the DB doesn't
 * reflect it, or a webhook processing bug goes unnoticed (see
 * api.razorpay-webhook.ts, api.verify-razorpay-payment.ts,
 * api.refund-razorpay-payment.ts, api.create-razorpay-order.ts,
 * api.whatsapp-webhook.ts) — not every console.error in the codebase.
 *
 * Never throws — a logging failure must never interrupt the caller's real
 * job (processing a payment, responding to a webhook). Every existing
 * console.error/warn call site this is added alongside is left in place;
 * this is an additional sink, not a replacement, so Vercel's own function
 * logs remain a fallback if this table or the DB call itself is ever what's
 * broken.
 */

export type ServerErrorType = "api" | "database" | "job";
export type ServerErrorSeverity = "critical" | "error" | "warning";

export interface LogServerErrorInput {
  /** Which bucket this shows up under in the admin Errors "by type" breakdown. */
  errorType: ServerErrorType;
  /** Defaults to "error". Use "critical" for anything where money/data can be left inconsistent. */
  severity?: ServerErrorSeverity;
  /** Human-readable description — this is what shows in the admin errors table, so keep it specific. */
  message: string;
  /** The caught error/response text, if any — appended to `message`. Never pass raw secrets/payment details here. */
  error?: unknown;
  /** Which route/handler this happened in, e.g. "/api/razorpay-webhook". */
  path?: string;
  /** HTTP or gateway status code, if this came from an upstream API call. */
  statusCode?: number;
}

export async function logServerError(input: LogServerErrorInput): Promise<void> {
  try {
    const parts = [input.message];
    if (input.error instanceof Error) {
      parts.push(input.error.message);
    } else if (input.error !== undefined && input.error !== null) {
      parts.push(String(input.error));
    }
    const message = parts.join(": ").slice(0, 2000);
    const stack = input.error instanceof Error && input.error.stack ? input.error.stack.slice(0, 4000) : null;
    const statusCode =
      typeof input.statusCode === "number" && Number.isFinite(input.statusCode)
        ? Math.max(0, Math.min(599, Math.round(input.statusCode)))
        : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("analytics_log_client_error", {
      p_payload: {
        error_type: input.errorType,
        severity: input.severity ?? "error",
        message,
        stack,
        path: input.path ? input.path.slice(0, 500) : null,
        status_code: statusCode,
      },
    });
    if (error) throw error;
  } catch (err) {
    console.error("[errorLog.server] failed to record server error", err);
  }
}
