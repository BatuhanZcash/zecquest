"use client";

import { Flame, WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";

/** Dairesel geri sayım */
export function Countdown({ remainingMs, totalSec, size = 64 }: { remainingMs: number; totalSec: number; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remainingMs / (totalSec * 1000)));
  const secs = Math.ceil(Math.max(0, remainingMs) / 1000);
  const danger = secs <= 5;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="5" className="stroke-line" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className={`transition-[stroke-dashoffset] duration-200 ease-linear ${danger ? "stroke-[#E8742A]" : "stroke-zec"}`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center tabular-nums font-bold ${danger ? "text-[#E8742A]" : ""}`}
        style={{ fontSize: size * 0.34 }}
      >
        {secs}
      </span>
    </div>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-zec transition-all duration-500" style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
    </div>
  );
}

export function StreakBadge({ n }: { n: number }) {
  const { t } = useI18n();
  if (n < 2) return null;
  return (
    <span className="inline-flex animate-pop items-center gap-1 rounded-full bg-[#E8742A]/15 px-2.5 py-0.5 text-xs font-bold text-[#E8742A]">
      <Flame className="h-3.5 w-3.5 fill-current" />
      {t("streak", { n })}
    </span>
  );
}

/** "2g 4sa 10dk" ya da "04:59" biçiminde kalan süre */
export function useCountdownText(targetMs: number | null | undefined, now: number) {
  const { t } = useI18n();
  if (!targetMs) return "";
  let s = Math.max(0, Math.floor((targetMs - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return `${d}${t("days_short")} ${h}${t("hours_short")} ${m}${t("min_short")}`;
  if (h > 0) return `${h}${t("hours_short")} ${m}${t("min_short")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BigCountdown({ targetMs, now }: { targetMs: number; now: number }) {
  const { t } = useI18n();
  let s = Math.max(0, Math.floor((targetMs - now) / 1000));
  const parts: [number, string][] = [];
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d) parts.push([d, t("days_short")]);
  parts.push([h, t("hours_short")], [m, t("min_short")], [s, t("sec_short")]);
  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {parts.map(([v, l], i) => (
        <div key={i} className="flex w-16 flex-col items-center rounded-xl2 bg-input py-2 sm:w-20">
          <span className="tabular-nums text-3xl font-bold tabular-nums text-accent sm:text-4xl">{String(v).padStart(2, "0")}</span>
          <span className="text-xs font-semibold uppercase text-soft">{l}</span>
        </div>
      ))}
    </div>
  );
}

/** Çevrimdışı uyarısı */
export function OfflineBanner() {
  const { t } = useI18n();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-[#E8742A] px-4 py-2 text-center text-sm font-semibold text-white">
      <WifiOff className="h-4 w-4" />
      {t("offline")}
    </div>
  );
}
