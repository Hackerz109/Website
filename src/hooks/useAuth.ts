import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile, touchLastSeen, type Profile } from "@/lib/profile";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Keyed on the id (not the whole user object) so a token refresh — which
  // hands back a new object with the same id — doesn't re-trigger these.
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    fetchMyProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null));
    // Best-effort "last active" ping — once per session, never blocking.
    touchLastSeen();
  }, [userId]);

  function refreshProfile() {
    if (userId) fetchMyProfile(userId).then(setProfile).catch(() => {});
  }

  return { session, user, isAdmin, profile, refreshProfile, loading };
}