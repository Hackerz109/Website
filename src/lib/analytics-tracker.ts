import { getDeviceId } from "@/lib/deviceId";

const SESSION_KEY = "analytics_session_v1";
const SESSION_TIMEOUT_MS = 30 * 60_000; // 30 min of inactivity starts a new session

function readSession(): { id: string; lastActivity: number } | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(id: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastActivity: Date.now() }));
  } catch {
    // Private browsing / full storage quota — tracking just no-ops rather
    // than breaking the page over it.
  }
}

function getOrCreateSessionId(): string {
  const existing = readSession();
  if (existing && Date.now() - existing.lastActivity < SESSION_TIMEOUT_MS) {
    writeSession(existing.id);
    return existing.id;
  }
  const id = crypto.randomUUID();
  writeSession(id);
  return id;
}

function getUtmParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

function send(path: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(path, new Blob([payload], { type: "application/json" }));
  } else {
    fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  }
}

export function trackPageview(path: string, userId: string | undefined) {
  if (typeof window === "undefined") return;
  send("/api/analytics-track", {
    session_id: getOrCreateSessionId(),
    path,
    referrer: document.referrer || undefined,
    device_id: getDeviceId(),
    user_id: userId,
    event_type: "page_view",
    ...getUtmParams(),
  });
}

// Debounces identical repeats (e.g. a render-loop error firing every frame,
// or the same broken image re-checked on every re-render) — the
// server-side rate limit is a backstop, this keeps the error list itself
// from filling with thousands of the same row. Keyed per-signature (rather
// than one shared "last error" slot) since JS errors, resource failures,
// and network failures can now all interleave on the same page and
// shouldn't suppress each other. Bounded size so a page that legitimately
// throws many distinct errors can't grow this forever.
const recentErrorSignatures = new Map<string, number>();
const MAX_TRACKED_SIGNATURES = 50;
const ERROR_DEBOUNCE_MS = 10_000;

function shouldSendError(signature: string): boolean {
  const now = Date.now();
  const lastAt = recentErrorSignatures.get(signature);
  if (lastAt !== undefined && now - lastAt < ERROR_DEBOUNCE_MS) return false;
  recentErrorSignatures.set(signature, now);
  if (recentErrorSignatures.size > MAX_TRACKED_SIGNATURES) {
    const oldestKey = recentErrorSignatures.keys().next().value;
    if (oldestKey !== undefined) recentErrorSignatures.delete(oldestKey);
  }
  return true;
}

type ErrorType = "frontend" | "resource" | "api" | "database" | "job";
type Severity = "critical" | "error" | "warning";

function sendError(input: {
  message: string;
  stack?: string;
  path: string;
  userId?: string;
  severity?: Severity;
  errorType?: ErrorType;
  statusCode?: number;
}) {
  if (typeof window === "undefined") return;
  const errorType = input.errorType ?? "frontend";
  const signature = `${errorType}::${input.message}::${input.path}`;
  if (!shouldSendError(signature)) return;

  send("/api/analytics-error", {
    message: input.message,
    stack: input.stack,
    path: input.path,
    session_id: getOrCreateSessionId(),
    user_id: input.userId,
    severity: input.severity ?? "error",
    error_type: errorType,
    status_code: input.statusCode,
  });
}

export function trackClientError(message: string, stack: string | undefined, path: string, userId: string | undefined) {
  sendError({ message, stack, path, userId, severity: "error", errorType: "frontend" });
}

/** A same-origin <img>/<script>/<link>/<source> failed to load. */
export function trackResourceError(input: { tag: string; src: string; path: string }) {
  sendError({
    message: `Failed to load ${input.tag}: ${input.src || "(no src)"}`,
    path: input.path,
    severity: "warning",
    errorType: "resource",
  });
}

/** A same-origin fetch() came back non-2xx, failed outright (network drop, CORS, offline), or was slow. */
export function trackNetworkError(input: { requestPath: string; statusCode: number; pagePath: string; detail?: string }) {
  const isFailure = input.statusCode === 0 || input.statusCode >= 400;
  const statusText = input.statusCode > 0 ? ` (HTTP ${input.statusCode})` : "";
  sendError({
    message: `Request to ${input.requestPath} ${isFailure ? "failed" : "was slow"}${statusText}${input.detail ? `: ${input.detail}` : ""}`,
    path: input.pagePath,
    severity: input.statusCode === 0 || input.statusCode >= 500 ? "error" : "warning",
    errorType: "api",
    statusCode: input.statusCode > 0 ? input.statusCode : undefined,
  });
}

/** Once per pageview, sent when LCP/CLS have settled — see performance-tracker.ts. */
export function trackPerformance(input: {
  path: string;
  lcp_ms?: number | null;
  cls?: number | null;
  fcp_ms?: number | null;
  ttfb_ms?: number | null;
  load_ms?: number | null;
  long_tasks_count?: number | null;
  long_tasks_total_ms?: number | null;
}) {
  if (typeof window === "undefined") return;
  send("/api/analytics-vitals", {
    session_id: getOrCreateSessionId(),
    ...input,
  });
}

/** Lightweight custom analytics_events row — e.g. connectivity changes. Rides the existing pageview pipe, no new endpoint needed. */
export function trackCustomEvent(eventType: string, path: string) {
  if (typeof window === "undefined") return;
  send("/api/analytics-track", {
    session_id: getOrCreateSessionId(),
    path,
    event_type: eventType,
  });
}
