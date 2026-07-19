import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Some browser extensions (shopping/coupon assistants, ad blockers, etc.) replace
// `history.pushState` / `replaceState` with a wrapper that isn't bound to the real
// `window.history` object. Calling it then throws `TypeError: Illegal invocation`,
// which breaks every client-side route change here — the URL updates but the page
// never renders. Re-binding the native implementation before the router is created
// makes navigation immune to that class of extension bug.
if (typeof window !== "undefined" && typeof History !== "undefined") {
  if (window.history.pushState !== History.prototype.pushState) {
    window.history.pushState = History.prototype.pushState.bind(window.history);
  }
  if (window.history.replaceState !== History.prototype.replaceState) {
    window.history.replaceState = History.prototype.replaceState.bind(window.history);
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
