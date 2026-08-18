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
  });

  return router;
};
