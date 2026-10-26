"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Globe2, Radio, Timer, Zap } from "lucide-react";
import { ZcashMark } from "./Logo";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ANSWER_SECS } from "@/lib/config";
import type { GameState } from "@/lib/types";

type Ev = GameState & { player_count?: number };

/**
 * Ana sayfa giriş bölümü: koyu zemin üzerinde Zcash altını, büyük başlık,
 * sağda sıradaki yarışmanın geri sayımı ya da canlı bir örnek soru.
 */
export function HomeHero({ next, now }: { next: Ev | null; now: number }) {
  const { t } = useI18n();
  const { session } = useAuth();

  return (
    <section className="relative overflow-hidden rounded-[20px] bg-[#14120D] text-white ring-1 ring-black/5 dark:ring-zec/20">
      {/* Arka plan: altın parıltılar ve ince ızgara */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-zec/25 blur-[90px]" />
        <div className="absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-zec/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(244,183,40,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(244,183,40,.9) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 70% 40%, black 10%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 70% 40%, black 10%, transparent 70%)",
          }}
        />
        <div className="absolute -right-16 top-1/2 hidden -translate-y-1/2 opacity-[0.06] xl:block">
          <ZcashMark size={420} />
        </div>
      </div>

      <div className="relative grid items-center gap-8 px-6 py-8 sm:px-10 sm:py-11 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-zec/30 bg-zec/10 px-3 py-1 text-[12.5px] font-semibold text-zec">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zec opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zec" />
            </span>
            {t("hero_kicker")}
          </span>
          <h1 className="mt-4 whitespace-pre-line text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
            {t("hero_title_a")} <span className="text-zec">{t("hero_title_b")}</span>
          </h1>
          <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-white/65 sm:text-[16px]">{t("hero_sub")}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={session ? "/events" : "/login?next=%2Fevents"} className="btn-zec px-5 py-3 text-[15px]">
              {session ? t("hero_cta_events") : t("hero_cta_signup")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/15 bg-white/[0.06] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-white/[0.12]"
            >
              {t("hero_cta_explore")}
            </Link>
          </div>

          <ul className="mt-7 grid max-w-[540px] grid-cols-1 gap-2.5 text-[13.5px] text-white/80 sm:grid-cols-3">
            <Feature icon={<Timer className="h-4 w-4" />} text={t("hero_f_time", { n: ANSWER_SECS })} />
            <Feature icon={<Globe2 className="h-4 w-4" />} text={t("hero_f_global")} />
            <Feature icon={<Gift className="h-4 w-4" />} text={t("hero_f_prize")} />
          </ul>
        </div>

        <div className="relative">{next ? <NextEventCard ev={next} now={now} /> : <DemoQuestion />}</div>
      </div>
    </section>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zec/15 text-zec">{icon}</span>
      <span className="leading-tight">{text}</span>
    </li>
  );
}

/* ---------- Sıradaki yarışma: geri sayım ---------- */
function NextEventCard({ ev, now }: { ev: Ev; now: number }) {
  const { t, lt } = useI18n();
  const isLive = ["question", "reveal", "leaderboard"].includes(ev.status);
  const title = lt(ev.title) || lt(ev.quiz?.title);
  const ms = Math.max(0, (ev.starts_at ?? now) - now);
  const parts = [
    [Math.floor(ms / 86400000), t("cd_days")],
    [Math.floor(ms / 3600000) % 24, t("cd_hours")],
    [Math.floor(ms / 60000) % 60, t("cd_minutes")],
    [Math.floor(ms / 1000) % 60, t("cd_seconds")],
  ] as const;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E5484D]/15 px-2 py-1 text-[12px] font-bold uppercase tracking-wide text-[#FF6B70]">
            <Radio className="h-3.5 w-3.5" />
            {t("live_now")}
          </span>
        ) : (
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/50">{t("next_competition")}</span>
        )}
        {typeof ev.player_count === "number" && ev.player_count > 0 && (
          <span className="text-[12.5px] text-white/50">{t("players_n", { n: ev.player_count })}</span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-[20px] font-bold leading-snug">{title}</h3>
      {ev.prize && lt(ev.prize) && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-zec">
          <Gift className="h-4 w-4" />
          {lt(ev.prize)}
        </p>
      )}

      {!isLive && ev.starts_at && (
        <div className="mt-5 grid grid-cols-4 gap-2">
          {parts.map(([v, l]) => (
            <div key={l} className="rounded-xl bg-black/30 py-3 text-center ring-1 ring-white/10">
              <div className="tabular-nums text-[26px] font-extrabold leading-none text-white">{String(v).padStart(2, "0")}</div>
              <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">{l}</div>
            </div>
          ))}
        </div>
      )}

      <Link href={`/play/${ev.code}`} className="btn-zec mt-5 w-full py-3 text-[15px]">
        <Zap className="h-4 w-4" />
        {isLive ? t("join_now") : t("hero_join_lobby")}
      </Link>
    </div>
  );
}

/* ---------- Örnek soru: 10 saniyelik sayaçla döngü ---------- */
const DEMO = {
  q: { tr: "Zcash'in toplam arzı ne kadardır?", en: "What is Zcash's maximum supply?" },
  opts: ["21M ZEC", "42M ZEC", "100M ZEC", "∞"],
  correct: 0,
};
const OPT_STYLE = [
  "bg-[#F4B728] text-[#1A1506]",
  "bg-[#3B82F6] text-white",
  "bg-[#10B981] text-white",
  "bg-[#E8742A] text-white",
];

function DemoQuestion() {
  const { t, lang } = useI18n();
  const [ms, setMs] = useState(0);
  const total = ANSWER_SECS * 1000;
  const cycle = total + 3500;

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setMs((Date.now() - start) % cycle), 100);
    return () => window.clearInterval(id);
  }, [cycle]);

  const revealed = ms >= total;
  const left = Math.max(0, Math.ceil((total - ms) / 1000));
  const pct = revealed ? 0 : 100 - (ms / total) * 100;

  return (
    <div className="mx-auto w-full max-w-[400px] rotate-[1.5deg] rounded-2xl bg-white p-4 text-[#161513] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/5 transition-transform hover:rotate-0 sm:p-5">
      <div className="flex items-center justify-between text-[12px] font-semibold text-[#6B6A66]">
        <span>{t("demo_label")}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-extrabold tabular-nums ${
            revealed ? "bg-[#10B981] text-white" : left <= 3 ? "bg-[#E5484D] text-white" : "bg-[#FEF6DE] text-[#966600]"
          }`}
        >
          {revealed ? <Check className="h-4 w-4" /> : left}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F1F0EC]">
        <div className="h-full rounded-full bg-[#F4B728] transition-[width] duration-100 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-4 text-[17px] font-bold leading-snug">{DEMO.q[lang]}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {DEMO.opts.map((o, i) => {
          const dim = revealed && i !== DEMO.correct;
          return (
            <div
              key={o}
              className={`flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-bold transition ${OPT_STYLE[i]} ${
                dim ? "opacity-25" : ""
              } ${revealed && i === DEMO.correct ? "ring-4 ring-[#10B981]/40" : ""}`}
            >
              {revealed && i === DEMO.correct && <Check className="h-4 w-4" />}
              {o}
            </div>
          );
        })}
      </div>
      <p className="mt-3 h-4 text-center text-[12px] font-medium text-[#6B6A66]">{revealed ? t("demo_reveal") : t("demo_hint")}</p>
    </div>
  );
}
