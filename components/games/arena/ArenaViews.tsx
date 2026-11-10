"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Bot, Check, ChevronDown, Crown, Flame, Rocket, Share2, Sparkles, Swords, Timer, TrendingUp, X, Zap } from "lucide-react";
import { Avatar } from "@/components/ui";
import { LeagueEmblem } from "@/components/games/GameArt";
import { useI18n, type DictKey } from "@/lib/i18n";
import { textAttrs } from "@/lib/languages";
import { useServerNow } from "@/lib/useGame";
import { leagueOf, nextLeague, LEAGUES, type ArenaState, type League } from "@/lib/api-games";

export const leagueKey = (l: League) => `games_league_${l}` as DictKey;

/* ---------------------------------------------------------------------
   Countdown ring (big, design reference: gold arc on a dark track)
   --------------------------------------------------------------------- */
export function Ring({ remainingMs, totalMs, size = 132 }: { remainingMs: number; totalMs: number; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remainingMs / totalMs));
  const secs = Math.ceil(Math.max(0, remainingMs) / 1000);
  const danger = secs <= 3;
  return (
    <div className="relative" style={{ width: size, height: size }} role="timer" aria-label={`${secs}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-input" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          className={`transition-[stroke-dashoffset] duration-100 ease-linear ${danger ? "stroke-[#E8742A]" : "stroke-zec"}`} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-display font-extrabold tabular-nums ${danger ? "text-[#E8742A]" : ""}`} style={{ fontSize: size * 0.38 }}>
        {secs}
      </span>
    </div>
  );
}

function SideCard({ side, align, bot }: { side: ArenaState["me"] | ArenaState["opp"]; align: "left" | "right"; bot?: boolean }) {
  const { t } = useI18n();
  const name = side.name || "?";
  const lg = leagueOf(side.rating);
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {bot ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1F3B57] text-[#9FE4FF]"><Bot className="h-6 w-6" /></span>
      ) : (
        <Avatar name={name} size={44} country={side.country} />
      )}
      <div className="min-w-0">
        <p className="truncate text-[14.5px] font-bold leading-tight">{name}</p>
        <p className="truncate text-[12px] text-muted">{bot ? t("games_arena_bot_label") : t(leagueKey(lg))}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   Duel (intro, question, reveal)
   --------------------------------------------------------------------- */
export function Duel({ s, onAnswer, picked }: { s: ArenaState; onAnswer: (i: number) => void; picked: number | null }) {
  const { t, lt } = useI18n();
  const now = useServerNow(s.status !== "ended", 100);
  const remaining = s.phase_ends_at ? s.phase_ends_at - now : 0;
  const q = s.question;
  const myChoice = s.my_choice ?? picked;
  const rv = s.reveal;
  const attrs = textAttrs(s.lang);

  return (
    <div className="mx-auto w-full max-w-[560px]" data-testid="arena-duel" data-status={s.status}>
      {/* players + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <SideCard side={s.me} align="left" />
        <div className="text-center font-display text-[30px] font-extrabold tabular-nums leading-none sm:text-[36px]" data-testid="arena-score">
          {s.me.score}
          <span className="mx-1.5 text-soft">:</span>
          {s.opp.score}
        </div>
        <SideCard side={s.opp} align="right" bot={s.opp.bot} />
      </div>
      {/* pips */}
      <div className="mt-4 flex justify-center gap-1.5" aria-label={t("games_arena_q_of", { n: Math.max(1, s.current_q + 1), total: s.q_count })}>
        {Array.from({ length: s.q_count }).map((_, i) => {
          const p = s.pips[i];
          const cls = p ? (p.me ? "bg-emerald-500" : "bg-[#E5484D]") : i === s.current_q ? "bg-zec" : "bg-input";
          return <span key={i} className={`h-1.5 w-10 rounded-full transition-colors sm:w-12 ${cls}`} />;
        })}
      </div>

      {s.status === "intro" && (
        <div className="mt-10 flex flex-col items-center text-center animate-pop">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-tint text-accent"><Swords className="h-8 w-8" /></span>
          <p className="mt-4 font-display text-[26px] font-extrabold">{t("games_arena_get_ready")}</p>
          <p className="mt-1 text-[14px] text-muted">{t("games_arena_find_sub")}</p>
          {s.opp.bot && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1F3B57]/15 px-3 py-1 text-[12.5px] font-semibold text-[#2F6FB5] dark:text-[#9FE4FF]"><Bot className="h-4 w-4" /> {t("games_arena_bot_note")}</p>}
          <div className="mt-6"><Ring remainingMs={remaining} totalMs={3000} size={96} /></div>
        </div>
      )}

      {q && (s.status === "question" || s.status === "reveal") && (
        <div className="mt-6">
          <div className="flex justify-center">
            {s.status === "question" ? (
              <Ring remainingMs={remaining} totalMs={q.time_limit * 1000} />
            ) : (
              <RevealBadge s={s} />
            )}
          </div>
          <p className="mt-4 text-center text-[13px] font-semibold text-muted">
            {t("games_arena_q_of", { n: s.current_q + 1, total: s.q_count })} · {t("games_arena_speed")}
          </p>
          <h2 {...attrs} className="mt-2 text-center font-display text-[22px] font-bold leading-snug tracking-[-0.01em] sm:text-[25px]" data-testid="arena-question">
            {lt(q.text)}
          </h2>
          <div className="mt-6 grid gap-2.5">
            {q.options.map((o, i) => {
              const isPick = myChoice === i;
              let cls = "border-line bg-card hover:border-[rgb(var(--soft))]";
              let tag: React.ReactNode = null;
              if (rv) {
                if (i === rv.correct) { cls = "border-emerald-500 bg-emerald-500/10"; tag = <Check className="h-5 w-5 text-emerald-500" />; }
                else if (isPick) { cls = "border-[#E5484D] bg-[#E5484D]/10"; tag = <X className="h-5 w-5 text-[#E5484D]" />; }
                else cls = "border-line bg-card opacity-60";
              } else if (isPick) {
                cls = "border-zec bg-zec/10";
                tag = <span className="text-[12.5px] font-bold text-accent">{t("games_arena_your_pick")}</span>;
              }
              const oppHere = rv && rv.opp_choice === i;
              return (
                <button key={i} {...attrs} disabled={s.status !== "question" || myChoice !== null}
                  onClick={() => onAnswer(i)} data-testid={`arena-opt-${i}`}
                  className={`relative flex min-h-[58px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[16px] font-semibold transition enabled:active:scale-[0.99] disabled:cursor-default ${cls}`}>
                  <span className="flex-1 leading-snug">{lt(o)}</span>
                  {oppHere && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-input px-2 py-0.5 text-[11.5px] font-semibold text-muted">
                      {s.opp.bot ? <Bot className="h-3.5 w-3.5" /> : null}{s.opp.name}
                    </span>
                  )}
                  {tag}
                </button>
              );
            })}
          </div>
          {/* status bar */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-[13.5px]" aria-live="polite">
            {s.opp.bot ? <Bot className="h-5 w-5 text-muted" /> : <Avatar name={s.opp.name} size={26} />}
            <span className="flex-1 text-muted">
              {s.status === "reveal"
                ? rv?.opp_choice == null ? `${s.opp.name}: ${t("games_arena_no_answer")}` : t("games_arena_opp_pick", { name: s.opp.name, answer: lt(q.options[rv.opp_choice]) })
                : s.opp_answered ? t("games_arena_opp_answered", { name: s.opp.name }) : t("games_arena_opp_thinking", { name: s.opp.name })}
            </span>
            {s.status === "question" && myChoice !== null && <span className="text-[12.5px] font-semibold text-accent">{t("games_arena_locked_in")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function RevealBadge({ s }: { s: ArenaState }) {
  const { t } = useI18n();
  const rv = s.reveal!;
  const timeout = rv.my_choice == null;
  const ok = rv.my_correct;
  return (
    <div className={`flex h-[132px] w-[132px] animate-pop flex-col items-center justify-center rounded-full ${ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-[#E5484D]/10 text-[#E5484D]"}`} data-testid="arena-reveal">
      {ok ? <Check className="h-10 w-10" strokeWidth={3} /> : timeout ? <Timer className="h-10 w-10" /> : <X className="h-10 w-10" strokeWidth={3} />}
      <span className="mt-1 text-[14px] font-bold">{ok ? t("games_arena_correct") : timeout ? t("games_arena_timeout") : t("games_arena_wrong")}</span>
      {ok && <span className="font-display text-[20px] font-extrabold">+{rv.my_points}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Result
   --------------------------------------------------------------------- */
const BADGE_ICON: Record<string, typeof Zap> = { perfect: Crown, lightning: Zap, first_win: Award, on_fire: Flame, giant_slayer: Rocket, promoted: TrendingUp };

export function Result({ s, onAgain, onLobby }: { s: ArenaState; onAgain: () => void; onLobby: () => void }) {
  const { t, lt } = useI18n();
  const r = s.result!;
  const [copied, setCopied] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(null);
  const missed = r.questions.filter((q) => !q.my_correct);
  useEffect(() => setOpenQ(missed[0]?.index ?? null), [s.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = r.outcome === 1 ? t("games_arena_win") : r.outcome === 0 ? t("games_arena_draw") : t("games_arena_loss");
  const nl = nextLeague(r.rating);
  const cur = LEAGUES.filter((x) => x.min <= r.rating).pop()!;
  const pct = nl ? ((r.rating - cur.min) / (nl.min - cur.min)) * 100 : 100;
  const attrs = textAttrs(s.lang);

  const share = async () => {
    const text = `${t("games_arena_share_text", { score: s.me.score, outcome: r.outcome === 1 ? t("games_arena_share_won") : t("games_arena_share_played") })} ${location.origin}/arena`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {}
  };

  return (
    <div className="mx-auto w-full max-w-[520px] text-center" data-testid="arena-result">
      <p className="text-[14px] font-bold text-accent">{t("games_arena_against", { name: s.opp.name })}{s.opp.bot ? ` · ${t("games_arena_bot_label")}` : ""}</p>
      <h1 className="mt-1 font-display text-[48px] font-extrabold leading-none tracking-[-0.03em] sm:text-[60px]">{title}</h1>
      <p className="mt-3 font-display text-[44px] font-extrabold tabular-nums leading-none">
        <span className={r.outcome === 1 ? "text-ink" : "text-muted"}>{s.me.score}</span>
        <span className="mx-3 text-soft">–</span>
        <span className={r.outcome === -1 ? "text-ink" : "text-muted"}>{s.opp.score}</span>
      </p>

      <div className="card mt-6 p-5 text-left">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label">{t("games_arena_rating")}</p>
            <p className={`font-display text-[36px] font-extrabold leading-none tabular-nums ${r.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : r.delta < 0 ? "text-[#E5484D]" : "text-muted"}`} data-testid="arena-delta">
              {r.delta > 0 ? "+" : ""}{r.delta}
            </p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="font-bold">{t(leagueKey(r.league))}</p>
              <p className="text-[12.5px] tabular-nums text-muted">{r.rating}{nl ? ` / ${nl.min}` : ""}</p>
            </div>
            <LeagueEmblem league={r.league} size={44} />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-input">
          <div className="h-full rounded-full bg-zec transition-all duration-700" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat value={r.avg_ms != null ? t("games_arena_sec", { n: (r.avg_ms / 1000).toFixed(1) }) : "–"} label={t("games_arena_avg")} />
        <Stat value={<span className="inline-flex items-center gap-1"><Flame className="h-5 w-5 fill-[#E8742A] text-[#E8742A]" />{r.streak}</span>} label={t("games_arena_streak")} />
        <Stat value={`+${r.xp}`} label={t("games_arena_xp")} />
      </div>

      {r.badges.map((b) => {
        const Icon = BADGE_ICON[b] ?? Sparkles;
        return (
          <div key={b} className="card mt-3 flex items-center gap-4 p-4 text-left animate-rise">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tint text-accent"><Icon className="h-6 w-6" /></span>
            <div>
              <p className="font-bold">{t("games_badge_new", { name: t(`games_badge_${b}` as DictKey) })}</p>
              <p className="text-[13.5px] text-muted">{t(`games_badge_${b}_d` as DictKey, { n: r.streak })}</p>
            </div>
          </div>
        );
      })}

      <div className="card mt-3 p-4 text-left" data-testid="arena-missed">
        {missed.length === 0 ? (
          <p className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-accent" /> {t("games_arena_all_right")}</p>
        ) : (
          <>
            <p className="font-bold">{missed.length === 1 ? t("games_arena_missed") : t("games_arena_missed_n", { n: missed.length })}</p>
            <ul className="mt-2 divide-y divide-line">
              {missed.map((q) => {
                const open = openQ === q.index;
                return (
                  <li key={q.index} className="py-2">
                    <button onClick={() => setOpenQ(open ? null : q.index)} aria-expanded={open} className="flex w-full items-start gap-2 text-left">
                      <span {...attrs} className="flex-1 text-[14.5px] leading-snug text-muted">{lt(q.text)}</span>
                      <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-accent transition ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="mt-2 space-y-1.5 text-[14px]">
                        <p><span className="text-muted">{t("games_arena_correct_answer")}: </span><b {...attrs} className="text-emerald-600 dark:text-emerald-400">{lt(q.options[q.correct])}</b></p>
                        {q.explanation && <p {...attrs} className="leading-relaxed">{lt(q.explanation)}</p>}
                        {q.quiz_slug && <Link href={`/quiz/${q.quiz_slug}`} className="inline-block font-semibold text-accent hover:underline">{t("games_arena_open_quiz")}</Link>}
                      </div>
                    )}
                    {!open && missed[0]?.index === q.index && openQ === null && (
                      <button onClick={() => setOpenQ(q.index)} className="mt-1 text-[13px] font-semibold text-accent">{t("games_arena_show_expl")}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={share} className="btn-ghost py-3 text-[15px]"><Share2 className="h-4 w-4" /> {copied ? t("games_arena_copied") : t("games_arena_share")}</button>
        <button autoFocus onClick={onAgain} className="btn-zec py-3 text-[15px]" data-testid="arena-again">{t("games_arena_again")}</button>
      </div>
      <button onClick={onLobby} className="mt-3 text-[13.5px] font-semibold text-muted hover:text-ink">{t("games_arena_lobby")}</button>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="card px-2 py-3.5 text-center">
      <p className="font-display text-[21px] font-extrabold tabular-nums leading-tight">{value}</p>
      <p className="mt-0.5 text-[12px] text-muted">{label}</p>
    </div>
  );
}
