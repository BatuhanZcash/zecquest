"use client";

import { useEffect, useState } from "react";
import type { YM } from "./data";

/** Pool colours: mid-tone hues that read on both the light and the dark theme. */
export const POOL_COLOR: Record<string, string> = {
  transparent: "#9AA1AE",
  sprout: "#86A85E",
  sapling: "#2E9C8F",
  orchard: "#F4B728",
  ironwood: "#7C6FE0",
};

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

/** Months since Jan 2000 for "YYYY-MM" */
export function ymToMonths(ym: YM | string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function formatYM(ym: YM | string, lang: string): string {
  const [y, m] = ym.split("-").map(Number);
  try {
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  } catch {
    return ym;
  }
}

/** Mono-ish fake hash for diagrams (deterministic, never a real value). */
export function fakeHash(seed: string, len = 10): string {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  let out = "";
  while (out.length < len) {
    // xorshift32
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    out += (h >>> 28).toString(16);
  }
  return out;
}

/** A small "redacted" bar used where data is encrypted on chain */
export function Redacted({ w = 96, label }: { w?: number; label: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className="inline-block h-[14px] rounded-[3px] align-middle"
      style={{
        width: w,
        background:
          "repeating-linear-gradient(135deg, rgb(244 183 40 / .55) 0 6px, rgb(244 183 40 / .25) 6px 12px)",
      }}
    />
  );
}
