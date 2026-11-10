"use client";

import { useState } from "react";
import { Check, RotateCcw, Shuffle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const MAX = 10;

/**
 * Zero-knowledge intuition: the colour-blind friend and two balls.
 * Each round a bluffer survives with probability 1/2, so trust grows as (1/2)^n shrinks.
 */
export default function ZkpIntuition() {
  const { t, lang } = useI18n();
  const [bluff, setBluff] = useState(false);
  const [rounds, setRounds] = useState<{ swapped: boolean; ok: boolean }[]>([]);
  const [swapCount, setSwapCount] = useState(0);
  const n = rounds.length;
  const caught = rounds.some((r) => !r.ok);

  const run = () => {
    if (n >= MAX || caught) return;
    const swapped = Math.random() < 0.5;
    const answer = bluff ? Math.random() < 0.5 : swapped;
    setRounds((r) => [...r, { swapped, ok: answer === swapped }]);
    if (swapped) setSwapCount((c) => c + 1);
  };
  const reset = (b = bluff) => {
    setBluff(b);
    setRounds([]);
    setSwapCount(0);
  };
  const chance = Math.pow(0.5, n);
  const pct = (v: number) =>
    (v * 100).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: v < 0.01 ? 2 : 1 }) + "%";
  const flipped = swapCount % 2 === 1;
  const last = rounds[n - 1];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Stage */}
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex gap-1 rounded-lg bg-input p-1" role="radiogroup" aria-label={t("learn_fig_zk_who")}>
            {[false, true].map((b) => (
              <button
                key={String(b)}
                role="radio"
                aria-checked={bluff === b}
                onClick={() => reset(b)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  bluff === b ? "bg-card text-ink shadow-press" : "text-muted hover:text-ink"
                }`}
              >
                {t(b ? "learn_fig_zk_bluffer" : "learn_fig_zk_honest")}
              </button>
            ))}
          </div>
          <div className="relative mx-auto mt-5 h-16 w-40" aria-hidden>
            {["#D9534F", "#3FA65B"].map((c, i) => {
              const pos = flipped ? 1 - i : i;
              return (
                <span
                  key={c}
                  className="absolute top-1 h-14 w-14 rounded-full shadow-card transition-[left] duration-500 ease-in-out"
                  style={{
                    left: pos === 0 ? 4 : 100,
                    background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.75), rgba(255,255,255,0) 32%), radial-gradient(circle at 60% 70%, rgba(0,0,0,0), rgba(0,0,0,.18) 75%), ${c}`,
                  }}
                />
              );
            })}
          </div>
          <p className="mt-3 text-center text-[12.5px] text-muted">{t("learn_fig_zk_stage")}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={run} disabled={n >= MAX || caught} className="btn-ink px-4 py-2 text-[13px]">
              <Shuffle className="h-4 w-4" aria-hidden /> {t("learn_fig_zk_run")}
            </button>
            <button onClick={() => reset()} disabled={!n} className="btn-ghost px-3 py-2 text-[13px]" aria-label={t("learn_fig_zk_reset")}>
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="mt-3 min-h-[2.6em] text-center text-[13px] font-medium" aria-live="polite">
            {last
              ? `${t(last.swapped ? "learn_fig_zk_swapped" : "learn_fig_zk_kept")} ${t(last.ok ? "learn_fig_zk_right" : "learn_fig_zk_wrong")}`
              : t("learn_fig_zk_start")}
          </p>
        </div>

        {/* Evidence */}
        <div className="flex flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-muted">{t("learn_fig_zk_rounds", { n })}</span>
            <span className="text-[12px] text-soft">{t("learn_fig_zk_max", { n: MAX })}</span>
          </div>
          <ol className="mt-2 grid grid-cols-10 gap-1">
            {Array.from({ length: MAX }, (_, i) => {
              const r = rounds[i];
              return (
                <li
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-md border text-[11px] ${
                    !r ? "border-dashed border-line text-soft" : r.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-[#E8742A] bg-[#E8742A]/15 text-[#C2571A] dark:text-[#F0955A]"
                  }`}
                  aria-label={r ? t(r.ok ? "learn_fig_zk_right" : "learn_fig_zk_wrong") : undefined}
                >
                  {r ? r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" /> : i + 1}
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-xl bg-input/60 p-3.5">
            <div className="text-[12.5px] text-muted">{t("learn_fig_zk_chance")}</div>
            <div className="mt-1 font-display text-[28px] font-extrabold leading-none tabular-nums">
              {caught ? "0%" : pct(chance)}
            </div>
            <div className="mt-3 flex h-12 items-end gap-1" aria-hidden>
              {Array.from({ length: MAX + 1 }, (_, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-t-[3px] ${i === n && !caught ? "bg-zec" : i < n ? "bg-ink/25" : "bg-line"}`}
                  style={{ height: `${Math.max(Math.pow(0.5, i) * 100, 3)}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-muted">
              {caught ? t("learn_fig_zk_caught") : t("learn_fig_zk_halves")}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[13.5px] leading-relaxed text-muted">
        <span className="font-semibold text-ink">{t("learn_fig_zk_zcash_t")}</span> {t("learn_fig_zk_zcash")}
      </p>
    </div>
  );
}
