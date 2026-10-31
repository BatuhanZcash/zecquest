"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase, isConfigured } from "./supabase";
import { api } from "./api";
import type { Profile, Role } from "./types";

interface AuthCtx {
  /** null: henüz bilinmiyor (yükleniyor) */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  ready: false,
  session: null,
  profile: null,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await api.myProfile();
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setReady(true);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) await refreshProfile();
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Supabase'in kendi kilidi içinde başka çağrı yapmamak için bir tur ertele
        setTimeout(() => refreshProfile(), 0);
      }
      if (event === "SIGNED_OUT") setProfile(null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  return <Ctx.Provider value={{ ready, session, profile, refreshProfile, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function hasRole(profile: Profile | null, role: Role) {
  if (!profile) return false;
  if (role === "player") return true;
  if (role === "creator") return profile.role === "creator" || profile.role === "admin";
  return profile.role === "admin";
}

/**
 * Giriş ve tamamlanmış profil gerektiren sayfalar için.
 * Giriş yoksa /login'e, profil eksikse /onboarding'e yönlendirir (dönüş adresiyle).
 */
export function useRequireAuth(role: Role = "player") {
  const { ready, session, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const guest = !!profile?.is_guest;
  const ok = ready && !!session && !guest && !!profile?.username && hasRole(profile, role) && !profile.banned;
  const forbidden = ready && !!session && !!profile?.username && !hasRole(profile, role);

  useEffect(() => {
    if (!ready) return;
    const next = encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname);
    if (!session || (profile && profile.is_guest)) router.replace(`/login?next=${next}`);
    else if (profile && !profile.username) router.replace(`/onboarding?next=${next}`);
  }, [ready, session, profile, router, pathname]);

  return { ok, forbidden, loading: !ready || (!!session && !profile), profile };
}
