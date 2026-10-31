"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { registerServiceWorker } from "@/lib/pwa";
import { useAuth } from "@/lib/auth";

const OPEN_WITHOUT_PROFILE = [/^\/onboarding/, /^\/login/, /^\/auth\//, /^\/terms/, /^\/privacy/];

/** Service worker kaydı + profil tamamlanmamışsa onboarding'e yönlendirme */
export function ClientInit() {
  const { ready, session, profile } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!ready || !session || !profile) return;
    // Misafirler kullanıcı adı seçmez; sadece anlık odalarda oynar
    if (profile.is_guest) return;
    if (!profile.username && !OPEN_WITHOUT_PROFILE.some((r) => r.test(pathname))) {
      router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, session, profile, pathname, router]);

  return null;
}
