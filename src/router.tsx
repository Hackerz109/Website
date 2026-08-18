import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // "intent" starts a route's loader on touchstart/mouseenter — i.e. the
    // moment a finger touches a link, not when the tap finishes — so by
    // the time the tap actually registers, the product/collection data is
    // often already in flight or done. Without this, every in-app
    // navigation to a loader-backed route (product, collections, category)
    // waits on a fresh network round trip with nothing preloaded.
    defaultPreload: "intent",
    // The router's own default is a 1000ms grace period before it shows
    // any pending state at all — meaning on a slow connection, tapping a
    // product could sit frozen for up to a full second with zero visual
    // feedback before anything happens. Lower ms here means a loading
    // state (see each route's pendingComponent) appears almost
    // immediately instead, so a tap always feels acknowledged.
    defaultPendingMs: 150,
    defaultPendingMinMs: 250,
    // Every route change up to now has been an instant, hard DOM swap —
    // old page gone, new page (or skeleton) in, no in-between. That's
    // exactly what the pendingMs change above introduces more of: a swap
    // to the skeleton, then another swap to real content, both abrupt.
    // This turns every one of those into a soft native cross-fade instead
    // via the browser's View Transitions API. Automatically respects
    // prefers-reduced-motion (the browser skips the animation, not just
    // shortens it) and no-ops on browsers that don't support it yet —
    // navigation still works exactly as before there, just without the
    // fade.
    defaultViewTransition: true,
  });

  return router;
};
