import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { trackPageview, trackClientError } from "@/lib/analytics-tracker";
import { installFetchMonitoring, handleResourceErrorEvent, handleOffline, handleOnline } from "@/lib/network-monitor";
import { installPerformanceTracking } from "@/lib/performance-tracker";

/** Renders nothing — mounted once in AppShell alongside the other ambient providers. */
export function AnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    trackPageview(location.pathname, user?.id);
    // Deliberately keyed on pathname only: a pageview fires on navigation,
    // not on user/auth resolving mid-page (that would double-count a view).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      trackClientError(event.message || "Unknown error", event.error?.stack, window.location.pathname, user?.id);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      trackClientError(message, stack, window.location.pathname, user?.id);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Network/resource/performance monitoring — installed once for the whole
  // app lifetime, same as the JS-error listeners above. fetch monitoring
  // and performance capture are one-way installs (each guarded by its own
  // module-level flag, since undoing a wrapped fetch() isn't something you
  // can cleanly do on unmount); the resource-error and connectivity
  // listeners follow the exact add/remove pattern used above.
  useEffect(() => {
    installFetchMonitoring();
    installPerformanceTracking();

    // Capture phase is required here — see the comment in network-monitor.ts.
    window.addEventListener("error", handleResourceErrorEvent, true);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("error", handleResourceErrorEvent, true);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
