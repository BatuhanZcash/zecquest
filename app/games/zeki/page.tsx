"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock, Gamepad2, Keyboard, Lock, LogIn, Play, Smartphone, Star, Trophy } from "lucide-react";
import { ZekiGame } from "@/components/games/zeki/ZekiGame";
import { LEVELS } from "@/components/games/zeki/levels";
import { LevelPreview, ZekiMascot } from "@/components/games/GameArt";
import { Avatar } from "@/components/ui";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  fmtTime, gamesApi, loadLocalProgress, mergeProgress, starCount,
  type BoardRow, type LevelProgress, type Period,
} from "@/lib/api-games";

export default function ZekiPage() {
  const { t } = useI18n();
  const { ready, session } = useAuth();
  const [progress, setProgress] = useState<Record<number, LevelProgress>>({});
  const [playing, setPlaying] = useState<number | null>(null);
  const [boardLevel, setBoardLevel] = useState(1);
  const [boardKey, setBoardKey] = useState(0);

  const loadProgress = useCallback(async () => {
    const local = loadLocalProgress();
    setProgress(local);
    if (!session) return;
    try {
      setProgress(mergeProgress(local, await gamesApi.myProgress()));
    } catch {
      /* offline: local only */
    }
  }, [session]);

  useEffect(() => {
    if (ready) loadProgress();
  }, [ready, loadProgress]);

  // deep link: /games/zeki?play=2
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("play"));
    if (n >= 1 && n <= LEVELS.length) setPlaying(n);
  }, []);

  const unlocked = (n: number) => n === 1 || !!(progress[n - 1] && progress[n - 1].stars & 1);
  const totalStars = Object.values(progress).reduce((a, p) => a + starCount(p.stars), 0);
  const nextUp = LEVELS.find((l) => !(progress[l.id]?.stars & 1))?.id ?? 1;

  const exitGame = () => {
    setPlaying(null);
    loadProgress();
    setBoardKey((k) => k + 1);
    if (window.location.search) window.history.replaceState(null, "", "/games/zeki");
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/games" className="btn-ghost mb-5 px-3 py-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" /> {t("games_nav")}
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#0F1115] text-[#ECEEF2] ring-1 ring-black/10 dark:ring-white/5">
        <div className="absolute inset-0 opacity-60">
          <LevelPreview level={1} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F1115] via-[#0F1115]/85 to-[#0F1115]/20" />
        <div className="relative grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-[560px]">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#F4B728]">{t("games_zeki_tag")}</p>
            <h1 className="mt-2 font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-[56px]">{t("games_zeki_title")}</h1>
            <p className="mt-4 text-[15.5px] leading-relaxed text-[#C9CED8]">{t("games_zeki_desc")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => setPlaying(nextUp)} className="btn-zec px-6 py-3 text-[16px]" data-testid="zeki-play-next">
                <Play className="h-5 w-5 fill-current" />
                {totalStars === 0 ? t("games_zeki_play") : t("games_zeki_continue", { n: nextUp })}
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
                <Star className="h-4 w-4 fill-[#F4B728] text-[#F4B728]" /> {t("games_stars_n", { n: totalStars, total: LEVELS.length * 3 })}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-[#A1A7B3]">
              <span className="inline-flex items-center gap-1.5"><Keyboard className="h-4 w-4" /> ← → · Space</span>
              <span className="inline-flex items-center gap-1.5"><Gamepad2 className="h-4 w-4" /> Gamepad</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone className="h-4 w-4" /> Touch</span>
            </div>
          </div>
          <ZekiMascot size={168} shielded className="hidden drop-shadow-[0_20px_40px_rgba(244,183,40,0.25)] md:block" />
        </div>
      </section>

      {/* Levels */}
      <h2 className="section-title mb-4 mt-10">{t("games_levels")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {LEVELS.map((l) => (
          <LevelCard key={l.id} n={l.id} p={progress[l.id]} locked={!unlocked(l.id)} onPlay={() => setPlaying(l.id)} />
        ))}
      </div>
      {ready && !session && (
        <p className="mt-4 flex items-center gap-2 text-[13.5px] text-muted">
          <LogIn className="h-4 w-4" /> {t("games_signin_to_save")}{" "}
          <Link href={`/login?next=${encodeURIComponent("/games/zeki")}`} className="font-semibold text-accent hover:underline">{t("games_sign_in")}</Link>
        </p>
      )}

      {/* Leaderboard */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-tint text-accent"><Trophy className="h-5 w-5" /></span>
          <h2 className="section-title">{t("games_board_title")}</h2>
          <div className="ml-auto flex gap-1 rounded-full bg-input p-1" role="tablist">
            {LEVELS.map((l) => (
              <button key={l.id} role="tab" aria-selected={boardLevel === l.id} onClick={() => setBoardLevel(l.id)}
                className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${boardLevel === l.id ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
                {t("games_level_n", { n: l.id })}
              </button>
            ))}
          </div>
        </div>
        <Leaderboard key={`${boardLevel}-${boardKey}`} level={boardLevel} />
      </section>

      {playing && (
        <ZekiGame key={playing} level={playing} onExit={exitGame} onNext={(n) => { setPlaying(n); loadProgress(); }} />
      )}
    </div>
  );
}

function LevelCard({ n, p, locked, onPlay }: { n: number; p?: LevelProgress; locked: boolean; onPlay: () => void }) {
  const { t } = useI18n();
  const stars = [
    { bit: 1, label: t("games_star_finish") },
    { bit: 2, label: t("games_star_coins") },
    { bit: 4, label: t("games_star_nohit") },
  ];
  return (
    <article className={`group flex flex-col overflow-hidden rounded-[22px] bg-card ring-1 ring-line transition ${locked ? "" : "hover:-translate-y-0.5 hover:shadow-card hover:ring-[rgb(var(--soft))]"}`} data-testid={`level-card-${n}`}>
      <div className="relative aspect-[16/9] bg-[#0F1115]">
        <LevelPreview level={n} />
        <span className="absolute left-3 top-3 rounded-full bg-[#0F1115]/80 px-2.5 py-1 text-[12px] font-bold text-[#F4B728] backdrop-blur">
          {t("games_level_n", { n })}
        </span>
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0F1115]/70 text-center text-[13px] font-semibold text-white backdrop-blur-[2px]">
            <Lock className="h-6 w-6" />
            {t("games_locked", { n: n - 1 })}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[20px] font-bold tracking-[-0.01em]">{t(`games_l${n}_name` as DictKey)}</h3>
        <p className="mt-1 text-[13.5px] leading-snug text-muted">{t(`games_l${n}_lesson` as DictKey)}</p>
        <div className="mt-3 flex items-center gap-3">
          {stars.map((s) => {
            const on = !!p && (p.stars & s.bit) === s.bit;
            return (
              <span key={s.bit} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted" title={s.label}>
                <Star className={`h-4 w-4 ${on ? "fill-zec text-zec" : "text-line"}`} />
                <span className="sr-only sm:not-sr-only">{s.label}</span>
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[13px]">
          {p ? (
            <>
              <span><span className="text-muted">{t("games_best")} </span><b className="tabular-nums">{p.best_score.toLocaleString()}</b></span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted" /><b className="tabular-nums">{fmtTime(p.best_time_ms)}</b></span>
            </>
          ) : (
            <span className="text-soft">{t("games_not_played")}</span>
          )}
        </div>
        <button disabled={locked} onClick={onPlay} className="btn-zec mt-4 w-full" data-testid={`play-level-${n}`}>
          <Play className="h-4 w-4 fill-current" /> {p ? t("games_zeki_replay") : t("games_zeki_play")}
        </button>
      </div>
    </article>
  );
}

function Leaderboard({ level }: { level: number }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<{ rows: BoardRow[]; me: { rank: number; score: number; time_ms: number } | null } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    gamesApi.leaderboard(level, period, 10).then((d) => alive && setData(d)).catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [level, period]);
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-1 border-b border-line px-4 pt-3">
        {(["week", "all"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p}
            className={`-mb-px border-b-2 px-3 pb-2.5 text-[13.5px] font-semibold transition ${period === p ? "border-zec text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {p === "week" ? t("games_period_week") : t("games_period_all")}
          </button>
        ))}
      </div>
      {error ? (
        <p className="p-6 text-center text-sm text-muted">{t("games_board_error")}</p>
      ) : !data ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-input" />)}</div>
      ) : data.rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">{t("games_board_empty")}</p>
      ) : (
        <ol className="divide-y divide-line">
          {data.rows.map((r) => (
            <li key={r.username} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`w-6 text-center font-display text-[15px] font-bold tabular-nums ${r.rank <= 3 ? "text-accent" : "text-muted"}`}>{r.rank}</span>
              <Avatar name={r.display_name || r.username} size={32} country={r.country} />
              <Link href={`/u/${r.username}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{r.display_name || r.username}</Link>
              <span className="hidden text-[12.5px] tabular-nums text-muted sm:inline">{fmtTime(r.time_ms)}</span>
              <b className="w-16 text-right tabular-nums">{r.score.toLocaleString()}</b>
            </li>
          ))}
          {data.me && !data.rows.some((r) => r.rank === data.me!.rank) && (
            <li className="flex items-center gap-3 bg-tint px-4 py-2.5">
              <span className="w-6 text-center font-display font-bold tabular-nums text-accent">{data.me.rank}</span>
              <span className="flex-1 font-semibold">{t("games_arena_you")}</span>
              <b className="tabular-nums">{data.me.score.toLocaleString()}</b>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
