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

let lastErrorSignature = "";
let lastErrorAt = 0;

export function trackClientError(message: string, stack: string | undefined, path: string, userId: string | undefined) {
  if (typeof window === "undefined") return;
  // Debounce identical repeats (e.g. a render-loop error firing every
  // frame) — the server-side rate limit is a backstop, this keeps the
  // error list itself from filling with thousands of the same row.
  const signature = `${message}::${path}`;
  const now = Date.now();
  if (signature === lastErrorSignature && now - lastErrorAt < 10_000) return;
  lastErrorSignature = signature;
  lastErrorAt = now;

  send("/api/analytics-error", {
    message,
    stack,
    path,
    session_id: getOrCreateSessionId(),
    user_id: userId,
    severity: "error",
  });
}
