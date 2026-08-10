import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { trackPageview, trackClientError } from "@/lib/analytics-tracker";

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

  return null;
}
