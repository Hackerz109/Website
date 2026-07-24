import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const REMEMBER_ME_KEY = "auth_remember_me";
const TAB_MARKER_KEY = "auth_tab_open";

/**
 * Supabase's client always persists sessions to localStorage (so they survive
 * a refresh). To honor an unchecked "Remember me", we layer a check on top:
 * sessionStorage is cleared whenever the browser is fully closed and
 * reopened, so if our marker is missing but a session is still sitting in
 * localStorage and the user previously said "don't remember me", we treat
 * that as a new browser session and sign them out.
 */
export function useRememberMeGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isFreshBrowserSession = !window.sessionStorage.getItem(TAB_MARKER_KEY);
    const rememberMe = window.localStorage.getItem(REMEMBER_ME_KEY);

    if (isFreshBrowserSession && rememberMe === "false") {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) supabase.auth.signOut();
      });
    }

    window.sessionStorage.setItem(TAB_MARKER_KEY, "1");
  }, []);
}
