import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit.server";
import { parseUserAgent } from "@/lib/userAgent";

// Browser-native CSP violation reports — fired automatically by the
// browser when report-uri (see src/start.ts) is set, for both the
// Report-Only policy now and the enforced one once it's flipped. Unlike
// analytics-track/-error, this is NOT called from our own client JS: the
// browser constructs and sends the request itself, so there's no
// session_id, user_id, or any of our normal client trust context — and no
// way to add one, since the whole point of report-uri is that it fires
// without page JS running. Treat every field below as attacker-reachable,
// same trust model as api.analytics-error.ts, just with no cooperating
// client on the other end.
//
// Handles both report shapes browsers actually send:
//  - legacy `report-uri` (Content-Type: application/csp-report): a single
//    object wrapped in {"csp-report": {...}} — what every major browser
//    sends today with just report-uri configured (this policy).
//  - Reporting API (Content-Type: application/reports+json): an ARRAY of
//    {type, url, body} objects. Not currently triggered (no report-to /
//    Reporting-Endpoints header is set), but handled here too so nothing
//    400s if that's ever added later alongside report-uri.
//
// Every violation lands in the existing error_logs table (error_type=
// 'csp') rather than a new one — see the migration for why. Severity is
// hardcoded to 'warning', never derived from the report, so a flood of
// fabricated reports can't trip the 'critical'/'error'-only system_errors
// alert.

const MAX_BODY_BYTES = 8_000; // real CSP reports are a few hundred bytes; generous headroom without inviting a large-body abuse attempt
const MAX_FIELD = 500;

function safeOrigin(uri: unknown): string | null {
  if (typeof uri !== "string" || !uri) return null;
  if (uri === "about:blank" || uri === "inline" || uri === "eval") return uri;
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}`;
  } catch {
    return uri.slice(0, MAX_FIELD);
  }
}

function safePathname(uri: unknown): string | null {
  if (typeof uri !== "string" || !uri) return null;
  try {
    return new URL(uri).pathname.slice(0, MAX_FIELD);
  } catch {
    return uri.slice(0, MAX_FIELD);
  }
}

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v ? v.slice(0, max) : null;
}

function int(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.min(999_999, Math.round(n))) : null;
}

type NormalizedReport = {
  documentUri: string | null;
  violatedDirective: string | null;
  effectiveDirective: string | null;
  blockedUri: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  statusCode: number | null;
  sample: string | null;
};

function normalizeLegacy(raw: Record<string, unknown>): NormalizedReport {
  return {
    documentUri: str(raw["document-uri"], MAX_FIELD),
    violatedDirective: str(raw["violated-directive"], 200),
    effectiveDirective: str(raw["effective-directive"], 100),
    blockedUri: str(raw["blocked-uri"], MAX_FIELD),
    sourceFile: str(raw["source-file"], MAX_FIELD),
    lineNumber: int(raw["line-number"]),
    columnNumber: int(raw["column-number"]),
    statusCode: int(raw["status-code"]),
    sample: str(raw["script-sample"], 200),
  };
}

function normalizeReportingApi(raw: Record<string, unknown>): NormalizedReport {
  const body = (raw.body ?? {}) as Record<string, unknown>;
  return {
    documentUri: str(raw.url, MAX_FIELD) ?? str(body.documentURL, MAX_FIELD),
    violatedDirective: str(body.effectiveDirective, 200),
    effectiveDirective: str(body.effectiveDirective, 100),
    blockedUri: str(body.blockedURL, MAX_FIELD),
    sourceFile: str(body.sourceFile, MAX_FIELD),
    lineNumber: int(body.lineNumber),
    columnNumber: int(body.columnNumber),
    statusCode: int(body.statusCode),
    sample: str(body.sample, 200),
  };
}

async function ingest(report: NormalizedReport, ua: ReturnType<typeof parseUserAgent>): Promise<void> {
  const directive = report.effectiveDirective || report.violatedDirective || "unknown-directive";
  const blocked = safeOrigin(report.blockedUri) ?? "unknown-source";
  // Grouped on directive + blocked origin (not full blocked-uri, which can
  // carry a path/query that varies per page) so repeat violations of the
  // same resource collapse into one row in the admin "top errors" table
  // instead of fragmenting into dozens of near-identical ones.
  const message = `CSP violation: ${directive} blocked ${blocked}`.slice(0, 2000);

  // Full-fidelity detail (including the untouched blocked-uri) goes in
  // `stack`, the existing free-text debug field — nothing here is ever
  // rendered as HTML in the admin UI (plain JSX text), so this is safe to
  // keep verbatim rather than re-sanitizing on top of the length caps
  // already applied above.
  const detail = JSON.stringify({
    blocked_uri: report.blockedUri,
    source_file: report.sourceFile,
    line: report.lineNumber,
    column: report.columnNumber,
    sample: report.sample,
  }).slice(0, 4000);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("analytics_log_client_error", {
    p_payload: {
      error_type: "csp",
      severity: "warning", // never derived from the report — see file header
      message,
      stack: detail,
      path: safePathname(report.documentUri),
      status_code: report.statusCode,
      device_type: ua.device_type,
      browser: ua.browser,
    },
  });
  if (error) throw error;
}

export const Route = createFileRoute("/api/csp-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = request.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
          return new Response(null, { status: 413 });
        }

        const ip = getClientIp(request);
        const identifiers = [{ type: "ip" as const, value: ip }];
        const status = await checkRateLimit("csp_report", identifiers);
        if (status.locked) return new Response(null, { status: 429 });
        await recordAttempt("csp_report", identifiers);

        let body: unknown;
        try {
          const raw = await request.text();
          if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
          body = raw ? JSON.parse(raw) : null;
        } catch {
          return new Response(null, { status: 400 });
        }

        const ua = parseUserAgent(request.headers.get("user-agent"));

        try {
          if (Array.isArray(body)) {
            // Reporting API shape: array of {type, ...} — only act on
            // csp-violation entries; cap iteration so a huge fabricated
            // array can't turn one request into hundreds of DB writes.
            for (const entry of body.slice(0, 20)) {
              if (entry && typeof entry === "object" && (entry as Record<string, unknown>).type === "csp-violation") {
                await ingest(normalizeReportingApi(entry as Record<string, unknown>), ua);
              }
            }
          } else if (body && typeof body === "object" && "csp-report" in (body as Record<string, unknown>)) {
            const raw = (body as Record<string, unknown>)["csp-report"];
            if (raw && typeof raw === "object") {
              await ingest(normalizeLegacy(raw as Record<string, unknown>), ua);
            }
          }
          // Anything else is silently ignored (still 204) rather than
          // 400'd — this is a fire-and-forget browser beacon that nothing
          // reads the response of; a 400 here just shows up as a
          // confusing network-tab entry with zero actionable info.
        } catch (err) {
          console.error("[csp-report] failed to record violation", err);
        }

        return new Response(null, { status: 204 });
      },
    },
  },
});
