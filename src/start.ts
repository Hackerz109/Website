import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Headers with no known downside for this app — they don't touch framing
// (X-Frame-Options/CSP frame-ancestors are deliberately left out: this repo
// is Lovable-connected, and Lovable's live editor preview may render the
// app in an iframe from its own origin, which those headers would block.
// Add X-Frame-Options: SAMEORIGIN yourself once you've confirmed it doesn't
// break that preview — see the security summary for details).
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  // Only features this app never uses. geolocation is deliberately left
  // alone — the delivery-address flow relies on it.
  "Permissions-Policy": "camera=(), microphone=(), usb=(), payment=()",
};

function withSecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const result = await next();
    withSecurityHeaders(result.response);
    return result;
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return withSecurityHeaders(
      new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
