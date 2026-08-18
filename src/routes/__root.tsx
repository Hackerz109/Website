import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { trackClientError } from "../lib/analytics-tracker";
import { Toaster } from "../components/ui/sonner";
import { AnalyticsTracker } from "../components/AnalyticsTracker";
import { useIdleLogout } from "../hooks/useIdleLogout";
import { useRememberMeGuard } from "../hooks/useRememberMeGuard";

// Password-reset / magic-link / OTP flows put a one-time auth secret in the
// URL (e.g. reset-password?code=... from Supabase's PKCE recovery flow).
// Vercel Analytics tracks the full page URL including query params, so
// strip any known auth-secret param before an event is ever sent — on
// every route, since new call sites could add one later.
const SENSITIVE_QUERY_PARAMS = ["code", "token", "token_hash", "access_token", "refresh_token", "otp"];

function redactSensitiveParams(event: BeforeSendEvent) {
  const url = new URL(event.url);
  let redacted = false;
  for (const param of SENSITIVE_QUERY_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      redacted = true;
    }
  }
  return redacted ? { ...event, url: url.toString() } : event;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    trackClientError(error.message || "Unknown error", error.stack, window.location.pathname, undefined);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sanjay Electricals — Shop that builds trust" },
      {
        name: "description",
        content:
          "Shop switches, wiring, fans, and fittings with clear warranty details, secure checkout, and a support team that's genuinely happy to help.",
      },
      { name: "author", content: "Sanjay Electricals" },
      { property: "og:title", content: "Sanjay Electricals — Shop that builds trust" },
      {
        property: "og:description",
        content: "Clear warranty details, secure checkout, and support you can count on.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://sanjayelectricals.shop/logo-full.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#F7F5EE" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "SE Admin" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // NOTE: the Google Fonts stylesheet itself is intentionally NOT linked
      // here as a plain `rel="stylesheet"` — that would be render-blocking
      // (the browser can't paint any text until it's fetched). It's loaded
      // asynchronously instead — see the inline snippet in RootShell below —
      // so first paint isn't gated on a third-party CSS round trip. Fallback
      // fonts (see --font-sans/--font-display in styles.css) render
      // immediately; Sora/Manrope/JetBrains Mono swap in once ready.
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";

// Loads the Google Fonts stylesheet without blocking first paint. A plain
// `<link rel="stylesheet">` to a third-party origin makes the browser wait
// for that fetch before rendering any text — this is the standard
// "loadCSS" workaround: request it as non-render-blocking (media="print"),
// then flip it to media="all" once it's actually loaded. Runs as a plain
// inline script (not a React onLoad handler) so it fires immediately as
// the HTML streams in, before hydration — CSP here already allows
// 'unsafe-inline' for script-src, so this doesn't need a nonce.
const ASYNC_FONT_LOADER = `
(function () {
  var l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = ${JSON.stringify(GOOGLE_FONTS_HREF)};
  l.media = "print";
  l.onload = function () { l.media = "all"; };
  document.head.appendChild(l);
})();
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: ASYNC_FONT_LOADER }} />
        <noscript>
          <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        </noscript>
      </head>
      <body className="overflow-x-hidden">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

function AppShell() {
  useRememberMeGuard();
  useIdleLogout(); // auto sign-out after 30 min of inactivity

  // iOS Safari only, doesn't apply :active press states on tap at all
  // unless the page has at least one touchstart listener registered
  // somewhere — a decades-old WebKit quirk. Without this, the new
  // active:ring-copper/active:scale press feedback on Button (see
  // button.tsx) would work everywhere EXCEPT iPhones, which is exactly the
  // "did my tap register?" feeling this exists to fix. One empty, passive,
  // app-wide listener turns :active on globally for the rest of the site.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const enableActiveState = () => {};
    document.addEventListener("touchstart", enableActiveState, { passive: true });
    return () => document.removeEventListener("touchstart", enableActiveState);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have — if registration fails (e.g. in
        // dev), the site should keep working exactly as before.
      });
    }
  }, []);

  // Tabs left open across a new deploy still hold the OLD build's chunk
  // filenames (Vite hashes them per-build). Navigating to a route lazily
  // loaded since that old build then 404s with "Failed to fetch dynamically
  // imported module" — Vite surfaces this as a `vite:preloadError` event.
  // Auto-reload once to pick up the current build instead of showing the
  // error page; sessionStorage guards against looping if a reload genuinely
  // doesn't fix it (e.g. an actually-broken deploy).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePreloadError = (event: Event) => {
      event.preventDefault();
      const key = "chunk-reload-attempted";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", handlePreloadError);
    return () => window.removeEventListener("vite:preloadError", handlePreloadError);
  }, []);

  return (
    <>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
      <Analytics beforeSend={redactSensitiveParams} />
      <AnalyticsTracker />
    </>
  );
}
