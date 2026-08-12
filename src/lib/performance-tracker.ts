import { trackPerformance } from "@/lib/analytics-tracker";

// Hand-rolled Core Web Vitals capture via the native PerformanceObserver
// API — deliberately not the web-vitals npm package, to avoid adding a new
// dependency for something the platform already exposes directly. The
// trigger point (send on visibilitychange->hidden, with a pagehide
// fallback) is the same one that library recommends, for the same reason:
// it's the latest point at which every metric below is guaranteed to have
// finished settling, and unlike beforeunload it doesn't block the page
// from entering the back/forward cache.
//
// Scope: this measures the actual browser page load (LCP/CLS/FCP/TTFB),
// once per real navigation — not once per client-side route change. Those
// metrics are defined in terms of the document's real load lifecycle, and
// re-measuring a meaningful LCP/TTFB on every SPA route change isn't a
// solved problem yet (the emerging "soft navigations" spec that would
// enable it isn't broadly supported) — reporting invented numbers for that
// would be worse than not reporting them. Long-task jank, though, isn't
// tied to page load, so it's tracked for the whole session and included in
// the same single beacon.
//
// Every field is nullable in what gets sent — a metric stays null if this
// browser doesn't support that PerformanceObserver entry type (e.g. Safari
// has no 'longtask' support) rather than being reported as a misleading 0.

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

let installed = false;

export function installPerformanceTracking() {
  if (installed || typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  installed = true;

  const entryPath = window.location.pathname;
  let lcpMs: number | null = null;
  let clsValue = 0;
  let clsMeasured = false;
  let longTasksCount = 0;
  let longTasksTotalMs = 0;
  let longTasksSupported = false;
  let sent = false;

  // LCP: entries arrive as bigger paint candidates replace smaller ones —
  // the last one reported before the page is hidden/interacted with is the
  // final value, per the metric's own definition.
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) lcpMs = Math.round(last.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Entry type not supported in this browser — lcp_ms stays null.
  }

  // CLS: sum of every unexpected layout shift's impact score, excluding
  // shifts that follow a recent user input (per spec — those are expected).
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as LayoutShiftEntry;
        if (!shift.hadRecentInput) {
          clsValue += shift.value;
          clsMeasured = true;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // Not supported — cls stays null.
  }

  // Long tasks: main-thread blocks over 50ms — a "feels slow/janky" signal
  // that a single load-time number wouldn't capture on its own.
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasksCount += 1;
        longTasksTotalMs += Math.round(entry.duration);
      }
    });
    longTaskObserver.observe({ type: "longtask", buffered: true });
    longTasksSupported = true;
  } catch {
    // Not supported (e.g. Safari has no Long Tasks API) — stays null below,
    // rather than reporting a misleading "0 long tasks".
  }

  function getNavigationTiming(): { ttfbMs: number | null; loadMs: number | null } {
    try {
      const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (!nav) return { ttfbMs: null, loadMs: null };
      return {
        ttfbMs: Math.round(nav.responseStart),
        // loadEventEnd is 0 until the load event has actually fired (e.g.
        // the tab was hidden mid-load) — report "not measured" rather than a false 0.
        loadMs: nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : null,
      };
    } catch {
      return { ttfbMs: null, loadMs: null };
    }
  }

  function getFcpMs(): number | null {
    try {
      const entry = performance.getEntriesByName("first-contentful-paint")[0];
      return entry ? Math.round(entry.startTime) : null;
    } catch {
      return null;
    }
  }

  function sendVitals() {
    if (sent) return;
    sent = true;
    const { ttfbMs, loadMs } = getNavigationTiming();
    trackPerformance({
      path: entryPath,
      lcp_ms: lcpMs,
      cls: clsMeasured ? Math.round(clsValue * 1000) / 1000 : null,
      fcp_ms: getFcpMs(),
      ttfb_ms: ttfbMs,
      load_ms: loadMs,
      long_tasks_count: longTasksSupported ? longTasksCount : null,
      long_tasks_total_ms: longTasksSupported ? longTasksTotalMs : null,
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendVitals();
  });
  // Fallback in case visibilitychange never fires before the page unloads.
  window.addEventListener("pagehide", sendVitals, { once: true });
}
