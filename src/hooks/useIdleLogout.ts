import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TIMEOUT_MS = 30 * 60_000; // 30 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * Signs the current user out after `timeoutMs` of no mouse/keyboard/touch
 * activity. Only runs while a session actually exists, and is entirely
 * client-side — it's a UX safety net (shared/kiosk devices), not a
 * substitute for short-lived tokens on the server.
 */
export function useIdleLogout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let hasSession = false;
    supabase.auth.getSession().then(({ data }) => {
      hasSession = !!data.session;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hasSession = !!session;
    });

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      if (!hasSession) return;
      timer.current = setTimeout(async () => {
        await supabase.auth.signOut();
        toast.info("You were signed out after a period of inactivity.");
        window.location.assign("/auth");
      }, timeoutMs);
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
      if (timer.current) clearTimeout(timer.current);
      sub.subscription.unsubscribe();
    };
  }, [timeoutMs]);
}
