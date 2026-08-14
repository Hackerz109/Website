import { trackResourceError, trackNetworkError, trackCustomEvent } from "@/lib/analytics-tracker";

// ---------------------------------------------------------------------------
// Resource load failures (broken <img>/<script>/<link>/<source>)
// ---------------------------------------------------------------------------
// A resource-loading failure fires a plain Event targeting the failing
// element itself, and — unlike almost every other DOM event — it does NOT
// bubble. A window.addEventListener("error", fn) registered the normal way
// (bubble phase) will never see it; it only reaches window during the
// CAPTURE phase, on the way down to the element. That's why this has to be
// registered with useCapture: true (see AnalyticsTracker.tsx), and why it's
// a second, separate listener from the one that catches uncaught JS
// exceptions (those dispatch an ErrorEvent directly at window, and are
// already handled there).
const RESOURCE_TAGS = new Set(["img", "script", "link", "source"]);

export function handleResourceErrorEvent(event: Event) {
  if (event instanceof ErrorEvent) return; // an uncaught JS exception, not a resource failure — handled elsewhere
  const target = event.target;
  if (!(target instanceof Element)) return;
  const tag = target.tagName.toLowerCase();
  if (!RESOURCE_TAGS.has(tag)) return;

  const src =
    (target as HTMLImageElement).currentSrc ||
    (target as HTMLImageElement | HTMLScriptElement).src ||
    (target as HTMLLinkElement).href ||
    "";
  trackResourceError({ tag, src, path: window.location.pathname });
}

// ---------------------------------------------------------------------------
// Same-origin fetch() monitoring
// ---------------------------------------------------------------------------
// fetch() only rejects on an actual network-level failure (offline, DNS,
// CORS, aborted) — a 404 or 500 response is still a "successful" fetch as
// far as the Promise is concerned, so those have to be caught by checking
// response.ok, not by try/catch alone.
const SKIP_PATH_PREFIXES = ["/api/analytics-track", "/api/analytics-error", "/api/analytics-vitals"];
const SLOW_REQUEST_MS = 4000;

function extractSameOriginPath(input: RequestInfo | URL): string | null {
  try {
    const raw = input instanceof Request ? input.url : input.toString();
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

function safeTrackNetworkError(requestPath: string, statusCode: number, detail?: string) {
  try {
    trackNetworkError({ requestPath, statusCode, pagePath: window.location.pathname, detail });
  } catch {
    // A bug in tracking must never surface as a broken fetch() to real app code.
  }
}

let fetchWrapped = false;

/**
 * Wraps window.fetch exactly once to observe same-origin calls, without
 * changing its behavior: every call still returns/throws precisely what the
 * real fetch would have. Only method/path/status/duration are ever
 * recorded — never request/response bodies or headers, since those can
 * carry auth tokens or payment data.
 */
export function installFetchMonitoring() {
  if (fetchWrapped || typeof window === "undefined" || !window.fetch) return;
  fetchWrapped = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestPath = extractSameOriginPath(input);
    if (!requestPath || SKIP_PATH_PREFIXES.some((p) => requestPath.startsWith(p))) {
      return originalFetch(input, init);
    }

    const start = performance.now();
    try {
      const response = await originalFetch(input, init);
      const duration = performance.now() - start;
      if (!response.ok) {
        safeTrackNetworkError(requestPath, response.status);
      } else if (duration > SLOW_REQUEST_MS) {
        safeTrackNetworkError(requestPath, response.status, `${Math.round(duration)}ms`);
      }
      return response;
    } catch (err) {
      safeTrackNetworkError(requestPath, 0, err instanceof Error ? err.message : "request failed");
      throw err; // the real caller still needs to see this — never swallow it
    }
  }) as typeof window.fetch;
}

// ---------------------------------------------------------------------------
// Connectivity (offline / back online)
// ---------------------------------------------------------------------------
// Not routed through trackResourceError/trackNetworkError's error_logs
// path — this isn't a bug, it's a state change, so it rides the existing
// pageview pipe as a plain custom event (analytics_events.event_type) via
// the /api/analytics-track endpoint, no schema change needed.
export function handleOffline() {
  trackCustomEvent("connectivity_offline", window.location.pathname);
}

export function handleOnline() {
  trackCustomEvent("connectivity_online", window.location.pathname);
}
