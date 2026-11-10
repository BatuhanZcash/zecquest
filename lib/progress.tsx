"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getMyProgress, type XpProgress } from "./api";
import { useAuth } from "./auth";
import type { DictKey } from "./i18n";

/**
 * Seviye unvanları. Sprout → Sapling → Orchard → Ironwood, Zcash'in korumalı havuzlarının açılış sırasıdır
 * (2016, 2018, 2022, 2026 — bkz. CONTENT research/FACTS.md §2); burada büyüme metaforu olarak kullanılır.
 * Seviye eğrisi 0008'de: seviye n için 50·(n-1)² XP.
 */
export const LEVEL_TITLES: { from: number; key: DictKey }[] = [
  { from: 1, key: "home_lvl_seed" },
  { from: 2, key: "home_lvl_sprout" },
  { from: 4, key: "home_lvl_sapling" },
  { from: 6, key: "home_lvl_orchard" },
  { from: 9, key: "home_lvl_ironwood" },
  { from: 12, key: "home_lvl_cypherpunk" },
  { from: 15, key: "home_lvl_zk" },
  { from: 20, key: "home_lvl_guardian" },
];

export function levelTitleKey(level: number): DictKey {
  let k = LEVEL_TITLES[0].key;
  for (const t of LEVEL_TITLES) if (level >= t.from) k = t.key;
  return k;
}

/** Bir sonraki unvan ve gerektiği seviye (yoksa null) */
export function nextTitle(level: number) {
  return LEVEL_TITLES.find((t) => t.from > level) ?? null;
}

export const xpForLevel = (level: number) => 50 * (level - 1) ** 2;

/** Seviye içindeki ilerleme (0–1) */
export function levelFraction(p: Pick<XpProgress, "xp" | "level_floor" | "next_level_at">) {
  const span = p.next_level_at - p.level_floor;
  return span > 0 ? Math.min(1, Math.max(0, (p.xp - p.level_floor) / span)) : 0;
}

interface ProgressCtx {
  progress: XpProgress | null;
  loading: boolean;
  refresh: () => Promise<void>;
}
const Ctx = createContext<ProgressCtx>({ progress: null, loading: false, refresh: async () => {} });

/** Diğer bölümler XP verdikten sonra `window.dispatchEvent(new Event(XP_EVENT))` ile kabuğu tazeleyebilir. */
export const XP_EVENT = "zq:xp";
export const notifyXpChanged = () => typeof window !== "undefined" && window.dispatchEvent(new Event(XP_EVENT));

/** Giriş yapmış kullanıcının XP/seviyesini kabuk boyunca paylaşır. Sayfa değişiminde (en fazla 20 sn'de bir) tazelenir. */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const pathname = usePathname();
  const [progress, setProgress] = useState<XpProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const last = useRef(0);
  const uid = session?.user.id ?? null;
  const eligible = !!uid && !!profile;

  const refresh = useCallback(async () => {
    if (!eligible) return;
    last.current = Date.now();
    setLoading(true);
    try {
      setProgress(await getMyProgress());
    } catch {
      // XP sistemi henüz kurulu değilse kabuk sessizce seviyesiz çalışır
    } finally {
      setLoading(false);
    }
  }, [eligible]);

  useEffect(() => {
    setProgress(null);
    last.current = 0;
  }, [uid]);

  useEffect(() => {
    if (eligible && Date.now() - last.current > 20000) refresh();
  }, [eligible, pathname, refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener(XP_EVENT, h);
    return () => window.removeEventListener(XP_EVENT, h);
  }, [refresh]);

  return <Ctx.Provider value={{ progress: eligible ? progress : null, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useMyProgress = () => useContext(Ctx);
