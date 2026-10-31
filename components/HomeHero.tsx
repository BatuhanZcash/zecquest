"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Globe2, Radio, Timer, Users, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ANSWER_SECS, SITE } from "@/lib/config";
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
    <section className="relative overflow-hidden rounded-[28px] bg-zec text-[#14161B]">

      <div className="relative grid items-center gap-10 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-14 lg:py-14">
        <div>
          <p className="text-[15px] font-semibold text-[#14161B]/70">{t("hero_kicker")}</p>
          <h1 className="font-display mt-3 text-[38px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[54px] lg:text-[60px]">
            {t("hero_title_a")} {t("hero_title_b")}
          </h1>
          <p className="mt-5 max-w-[500px] text-[16px] leading-relaxed text-[#14161B]/75 sm:text-[17px]">{t("hero_sub")}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            {SITE.competitions ? (
              <Link href={session ? "/events" : "/login?next=%2Fevents"} className="btn bg-[#14161B] px-6 py-3 text-[15px] text-white hover:bg-[#2A2E37]">
                {session ? t("hero_cta_events") : t("hero_cta_signup")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/join" className="btn bg-[#14161B] px-6 py-3 text-[15px] text-white hover:bg-[#2A2E37]">
                <Zap className="h-4 w-4" />
                {t("hero_cta_join")}
              </Link>
            )}
            <Link
              href={SITE.competitions ? "/explore" : "/organizers"}
              className="btn border-2 border-[#14161B] px-6 py-[10px] text-[15px] text-[#14161B] hover:bg-[#14161B]/[0.07]"
            >
              {SITE.competitions ? t("hero_cta_explore") : t("hero_cta_host")}
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px] font-medium text-[#14161B]/80">
            <Feature icon={<Timer className="h-4 w-4" />} text={t("hero_f_time", { n: ANSWER_SECS })} />
            <Feature icon={<Globe2 className="h-4 w-4" />} text={t("hero_f_global")} />
            {SITE.competitions ? (
              <Feature icon={<Gift className="h-4 w-4" />} text={t("hero_f_prize")} />
            ) : (
              <Feature icon={<Users className="h-4 w-4" />} text={t("hero_f_community")} />
            )}
          </ul>
        </div>

        <div className="relative">{next && SITE.competitions ? <NextEventCard ev={next} now={now} /> : <DemoQuestion />}</div>
      </div>
    </section>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#14161B]/10">{icon}</span>
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
const OPT_STYLE = ["bg-zec text-[#14161B]", "bg-[#14161B] text-white", "bg-[#2F6FED] text-white", "bg-[#12A387] text-white"];

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
    <div className="mx-auto w-full max-w-[400px] rounded-3xl bg-white p-5 text-[#14161B] shadow-[0_24px_50px_-24px_rgba(60,40,0,0.55)] sm:p-6">
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
              className={`flex h-12 items-center gap-2 rounded-xl px-3 text-[15px] font-bold transition ${OPT_STYLE[i]} ${
                dim ? "opacity-25" : ""
              } ${revealed && i === DEMO.correct ? "ring-4 ring-[#10B981]/40" : ""}`}
            >
              <span className="font-display text-[13px] opacity-60">{"ABCD"[i]}</span>
              {o}
              {revealed && i === DEMO.correct && <Check className="ml-auto h-4 w-4" />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 h-4 text-center text-[12px] font-medium text-[#6B6A66]">{revealed ? t("demo_reveal") : t("demo_hint")}</p>
    </div>
  );
}
