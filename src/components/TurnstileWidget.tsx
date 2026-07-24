import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Renders a Cloudflare Turnstile challenge and reports a verification token
 * via onVerify. Pass that token as `captchaToken` to supabase.auth methods —
 * Supabase Auth only checks it once "Enable Captcha protection" is turned on
 * for this project (Supabase dashboard → Authentication → Attack Protection),
 * with the matching Turnstile secret key entered there.
 *
 * No-ops (renders nothing) if VITE_TURNSTILE_SITE_KEY isn't set, so the rest
 * of the rate-limiting/lockout logic keeps working even before captcha is
 * configured.
 */
export function TurnstileWidget({ onVerify, onExpire }: { onVerify: (token: string) => void; onExpire?: () => void }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const containerId = useId();
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;

    let cancelled = false;

    function render() {
      const container = document.getElementById(containerId);
      if (!container || !window.turnstile || cancelled) return;
      widgetId.current = window.turnstile.render(container, {
        sitekey: siteKey!,
        callback: onVerify,
        "expired-callback": onExpire,
        "error-callback": onExpire,
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (!existing) {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = render;
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", render);
      }
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId]);

  if (!siteKey) return null;

  return <div id={containerId} className="mt-1" />;
}
