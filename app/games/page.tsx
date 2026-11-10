"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, Play, Radio, Sparkles, Star, Swords } from "lucide-react";
import { LeagueEmblem, LevelPreview, ZekiMascot } from "@/components/games/GameArt";
import { leagueKey } from "@/components/games/arena/ArenaViews";
import { LEVELS } from "@/components/games/zeki/levels";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { gamesApi, leagueOf, loadLocalProgress, mergeProgress, starCount, type LevelProgress, type MyArena } from "@/lib/api-games";

export default function GamesHub() {
  const { t } = useI18n();
  const { ready, session, profile } = useAuth();
  const [progress, setProgress] = useState<Record<number, LevelProgress>>({});
  const [arena, setArena] = useState<MyArena | null>(null);
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const local = loadLocalProgress();
    setProgress(local);
    if (session) gamesApi.myProgress().then((p) => setProgress(mergeProgress(local, p))).catch(() => {});
    if (session && profile && (profile.username || profile.is_guest)) gamesApi.myArena().then(setArena).catch(() => {});
    gamesApi.arenaOnline().then(setOnline).catch(() => {});
  }, [ready, session, profile]);

  const stars = Object.values(progress).reduce((a, p) => a + starCount(p.stars), 0);
  const done = Object.values(progress).filter((p) => p.stars & 1).length;
  const nextUp = LEVELS.find((l) => !(progress[l.id]?.stars & 1))?.id ?? 1;
  const league = leagueOf(arena?.rating ?? 1000);

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-8 max-w-[640px]">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-accent">{t("games_hub_kicker")}</p>
        <h1 className="mt-2 font-display text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[48px]">{t("games_hub_title")}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">{t("games_hub_sub")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Zeki */}
        <Link href="/games/zeki" className="group relative overflow-hidden rounded-[28px] bg-[#0F1115] text-[#ECEEF2] ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-card lg:col-span-2 dark:ring-white/5" data-testid="hub-zeki">
          <div className="absolute inset-0 opacity-70 transition duration-500 group-hover:scale-[1.03]">
            <LevelPreview level={2} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-[#0F1115]/70 to-transparent sm:bg-gradient-to-r sm:from-[#0F1115] sm:via-[#0F1115]/80 sm:to-transparent" />
          <div className="relative flex min-h-[340px] flex-col justify-end p-6 sm:min-h-[380px] sm:justify-center sm:p-9">
            <ZekiMascot size={84} shielded className="mb-3 drop-shadow-[0_12px_30px_rgba(244,183,40,0.35)]" />
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#F4B728]">{t("games_zeki_tag")}</p>
            <h2 className="mt-1.5 font-display text-[34px] font-extrabold leading-none tracking-[-0.025em] sm:text-[42px]">{t("games_zeki_title")}</h2>
            <p className="mt-3 max-w-[420px] text-[14.5px] leading-relaxed text-[#C9CED8]">{t("games_zeki_desc")}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="btn-zec px-5 py-2.5">
                <Play className="h-4 w-4 fill-current" /> {done === 0 ? t("games_zeki_play") : done >= LEVELS.length ? t("games_zeki_replay") : t("games_zeki_continue", { n: nextUp })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold backdrop-blur">
                <Star className="h-4 w-4 fill-[#F4B728] text-[#F4B728]" /> {t("games_stars_n", { n: stars, total: LEVELS.length * 3 })}
              </span>
              <span className="text-[13px] font-semibold text-[#A1A7B3]">{t("games_levels_done", { n: done, total: LEVELS.length })}</span>
            </div>
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {LEVELS.map((l) => (
                <span key={l.id} className={`h-1.5 w-12 rounded-full ${progress[l.id]?.stars & 1 ? "bg-[#F4B728]" : "bg-white/15"}`} />
              ))}
            </div>
          </div>
        </Link>

        {/* Arena */}
        <Link href="/arena" className="group relative flex flex-col overflow-hidden rounded-[28px] bg-zec p-6 text-[#14161B] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(244,183,40,0.8)] sm:p-7" data-testid="hub-arena">
          <div className="pointer-events-none absolute -right-10 -top-10 opacity-90 transition duration-500 group-hover:rotate-6">
            <LeagueEmblem league={league} size={190} />
          </div>
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#14161B] text-zec"><Swords className="h-6 w-6" /></span>
          <p className="relative mt-auto pt-16 text-[12px] font-bold uppercase tracking-[0.16em] opacity-70">{t("games_arena_tag")}</p>
          <h2 className="relative mt-1 font-display text-[38px] font-extrabold leading-none tracking-[-0.025em]">{t("games_arena_title")}</h2>
          <p className="relative mt-3 text-[14px] leading-relaxed opacity-80">{t("games_arena_desc")}</p>
          <div className="relative mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#14161B]/90 px-4 py-3 text-[#ECEEF2]">
            <div className="min-w-0">
              <p className="text-[11.5px] text-[#A1A7B3]">{t("games_your_league")}</p>
              <p className="truncate font-bold">{t(leagueKey(league))} · <span className="tabular-nums">{t("games_rating_n", { n: arena?.rating ?? 1000 })}</span></p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[#F4B728] transition group-hover:translate-x-0.5" />
          </div>
          {online !== null && online > 0 && (
            <p className="relative mt-3 text-[12.5px] font-semibold opacity-75">{t("games_arena_online", { n: online })}</p>
          )}
        </Link>

        {/* Live rooms */}
        <LiveRooms />

        <div className="flex flex-col justify-center gap-3 rounded-[28px] border border-dashed border-line p-6 lg:col-span-2">
          <p className="flex items-center gap-2 font-display text-[18px] font-bold"><Sparkles className="h-5 w-5 text-accent" /> {t("games_xp_note")}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <div key={l.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
                <p className="text-[12px] font-semibold text-muted">{t("games_level_n", { n: l.id })}</p>
                <p className="font-bold">{t(`games_l${l.id}_lesson` as "games_l1_lesson")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveRooms() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const digits = code.replace(/\D/g, "").slice(0, 6);
  return (
    <section className="flex flex-col rounded-[28px] border border-line bg-card p-6 sm:p-7" data-testid="hub-live">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tint text-accent"><Radio className="h-6 w-6" /></span>
      <h2 className="mt-4 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em]">{t("games_live_title")}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{t("games_live_desc")}</p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.length === 6) router.push(`/play/${digits}`);
        }}
      >
        <label htmlFor="hub-code" className="sr-only">{t("games_code_placeholder")}</label>
        <input id="hub-code" inputMode="numeric" autoComplete="off" value={digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits}
          onChange={(e) => setCode(e.target.value)} placeholder={t("games_code_placeholder")}
          className="input min-w-0 flex-1 text-center font-display text-[20px] font-bold tracking-[0.15em] placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal" />
        <button disabled={digits.length !== 6} className="btn-ink shrink-0 px-5">{t("games_live_join")}</button>
      </form>
      <Link href="/explore" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:underline">
        <Compass className="h-4 w-4" /> {t("games_live_browse")}
      </Link>
    </section>
  );
}
