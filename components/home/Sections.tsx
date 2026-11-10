"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BookA, BookOpen, CalendarPlus, Clock, Crown, Gamepad2, Hash, Newspaper, Swords } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { levelTitleKey } from "@/lib/progress";
import { nextLesson } from "@/lib/home-data";
import type { XpProgress } from "@/lib/api";
import type { Track } from "@/lib/content/types";
import type { MeetupCard } from "@/lib/api-community";
import { Avatar, Flag } from "@/components/ui";
import { LevelRing, XpBar } from "@/components/LevelBadge";
import { WorldMap } from "@/components/community/WorldMap";
import { MeetupRow, MeetupRowSkeleton } from "@/components/community/bits";

/** Bölüm başlığı: büyük başlık + sağda "tümü" bağlantısı */
export function HomeHead({ title, sub, href, cta }: { title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] sm:text-[24px]">{title}</h2>
        {sub && <p className="mt-0.5 text-[14.5px] text-muted">{sub}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-accent hover:underline">
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------------------------------------------------------------------
   Kaldığın yerden devam
   --------------------------------------------------------------------- */
export function ContinueStrip({
  progress,
  tracks,
  digestDate,
  loading,
}: {
  progress: XpProgress | null;
  tracks: Track[];
  digestDate: string | null;
  loading: boolean;
}) {
  const { t, lt } = useI18n();
  const { session, ready, profile } = useAuth();

  if (!ready || (session && loading && !progress)) return <div className="h-[118px] animate-pulse rounded-[24px] bg-card ring-1 ring-line" />;

  if (!session || !progress) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-line bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <LevelRing progress={{ xp: 0, level: 1, level_floor: 0, next_level_at: 50 }} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[19px] font-bold">{t("home_progress_title")}</h2>
          <p className="text-[14.5px] text-muted">{t(profile?.is_guest ? "home_progress_guest" : "home_progress_sub")}</p>
        </div>
        <Link href="/login?next=%2F" className="btn-ink">
          {profile?.is_guest ? t("guest_create_account") : t("home_progress_signin")}
        </Link>
      </section>
    );
  }

  const done = progress.done ?? [];
  const nl = nextLesson(tracks, done);
  const readToday = !!digestDate && done.some((d) => d.source === "news_read" && d.ref === digestDate);
  const played = done.some((d) => d.source === "game_level");

  const actions: { href: string; icon: typeof BookOpen; title: string; sub: string }[] = [];
  if (nl)
    actions.push({
      href: `/learn/${nl.track.slug}/${nl.lesson.slug}`,
      icon: BookOpen,
      title: lt(nl.lesson.title),
      sub: nl.done > 0 ? t("home_continue_track", { track: lt(nl.track.title), i: nl.index + 1, n: nl.total }) : t("home_start_track", { track: lt(nl.track.title) }),
    });
  if (digestDate && !readToday)
    actions.push({ href: `/news/${digestDate}`, icon: Newspaper, title: t("home_act_digest"), sub: digestDate === todayIso() ? t("home_act_digest_sub") : digestDate });
  actions.push(
    played
      ? { href: "/games/zeki", icon: Gamepad2, title: t("home_act_zeki_more"), sub: t("home_act_zeki_sub") }
      : { href: "/games/zeki", icon: Gamepad2, title: t("home_act_zeki"), sub: t("home_act_zeki_sub") }
  );
  if (!nl) actions.push({ href: "/glossary", icon: BookA, title: t("home_act_glossary"), sub: t("home_act_glossary_sub") });

  return (
    <section aria-labelledby="h-continue" className="grid gap-5 rounded-[24px] border border-line bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)] lg:items-center">
      <Link href="/me#progress" className="flex items-center gap-4 rounded-2xl">
        <LevelRing progress={progress} size={60} stroke={6} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">{t("home_level_n", { n: progress.level })}</p>
          <h2 id="h-continue" className="font-display text-[20px] font-bold leading-tight">
            {t(levelTitleKey(progress.level))}
          </h2>
          <XpBar progress={progress} className="mt-2" />
        </div>
      </Link>
      <ul className="grid gap-2 sm:grid-cols-3">
        {actions.slice(0, 3).map(({ href, icon: I, title, sub }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full items-start gap-3 rounded-2xl bg-input/60 p-3.5 transition-colors hover:bg-input">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-accent ring-1 ring-line">
                <I className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold group-hover:text-accent">{title}</span>
                <span className="line-clamp-2 block text-[12.5px] leading-snug text-muted">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------------
   Öğren: parkurlar
   --------------------------------------------------------------------- */
const LEVEL_KEY = { beginner: "home_track_beginner", intermediate: "home_track_intermediate", advanced: "home_track_advanced" } as const;

export function LearnBlock({ tracks, loading, done }: { tracks: Track[]; loading: boolean; done: { source: string; ref: string }[] }) {
  const { t, lt } = useI18n();
  const finished = new Set(done.filter((d) => d.source === "lesson").map((d) => d.ref));
  return (
    <section aria-labelledby="h-learn" className="min-w-0">
      <HomeHead title={t("home_learn_title")} sub={t("home_learn_sub")} href="/learn" cta={t("home_all_lessons")} />
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-card ring-1 ring-line" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-line p-6">
          <p className="font-semibold">{t("home_tracks_empty")}</p>
          <p className="mt-1 text-[14px] text-muted">{t("home_tracks_empty_sub")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/glossary" className="btn-ghost py-2 text-[13px]">
              <BookA className="h-4 w-4" />
              {t("home_nav_glossary")}
            </Link>
            <Link href="/about" className="btn-ghost py-2 text-[13px]">
              {t("nav_about")}
            </Link>
          </div>
        </div>
      ) : (
        <ol className="overflow-hidden rounded-[20px] border border-line bg-card">
          {tracks.slice(0, 4).map((tr, i) => {
            const n = tr.lessons.length;
            const d = tr.lessons.filter((l) => finished.has(l.slug)).length;
            const mins = tr.lessons.reduce((a, l) => a + (l.minutes || 0), 0);
            return (
              <li key={tr.slug} className={i ? "border-t border-line" : ""}>
                <Link href={`/learn/${tr.slug}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-input/60 sm:p-5">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tint font-display text-[18px] font-extrabold text-accent">
                    {i + 1}
                    {d > 0 && (
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
                        <rect x="1.5" y="1.5" width="45" height="45" rx="15" fill="none" stroke="#F4B728" strokeWidth="3" pathLength={100} strokeDasharray={`${(d / n) * 100} 100`} />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[17px] font-bold leading-snug group-hover:text-accent">{lt(tr.title)}</span>
                      <span className="rounded-md bg-input px-1.5 py-0.5 text-[11.5px] font-semibold text-muted">{t(LEVEL_KEY[tr.level])}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-[13.5px] text-muted">{lt(tr.summary)}</span>
                  </span>
                  <span className="hidden shrink-0 text-right text-[12.5px] tabular-nums text-soft sm:block">
                    {d > 0 ? t("home_track_progress", { d, n }) : t("home_track_lessons", { n })}
                    {mins > 0 && (
                      <span className="mt-0.5 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {t("home_minutes", { n: mins })}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------
   Oyna: Zeki, Arena, canlı oda kodu
   --------------------------------------------------------------------- */
export function PlayBlock() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const digits = code.replace(/\D/g, "").slice(0, 6);
  return (
    <section aria-labelledby="h-play" className="min-w-0">
      <HomeHead title={t("home_play_title")} sub={t("home_play_sub")} href="/games" cta={t("home_all_games")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/games/zeki" className="group relative overflow-hidden rounded-[20px] bg-[#14161B] p-5 text-white dark:ring-1 dark:ring-white/10">
          <ZekiArt />
          <Gamepad2 className="relative h-6 w-6 text-zec" />
          <p className="relative mt-10 font-display text-[22px] font-extrabold leading-tight">{t("home_nav_zeki")}</p>
          <p className="relative mt-1 max-w-[62%] text-[13.5px] leading-snug text-white/70">{t("home_zeki_sub")}</p>
          <span className="relative mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-zec group-hover:underline">
            {t("home_play_now")}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <Link href="/arena" className="group relative overflow-hidden rounded-[20px] border border-line bg-card p-5">
          <ArenaArt />
          <Swords className="relative h-6 w-6 text-accent" />
          <p className="relative mt-10 font-display text-[22px] font-extrabold leading-tight">{t("home_nav_arena")}</p>
          <p className="relative mt-1 max-w-[80%] text-[13.5px] leading-snug text-muted">{t("home_arena_sub")}</p>
          <span className="relative mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-accent group-hover:underline">
            {t("home_find_opponent")}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.length === 6) router.push(`/play/${digits}`);
        }}
        className="mt-3 flex items-center gap-3 rounded-[20px] border border-line bg-card p-2 pl-4"
      >
        <Hash className="h-5 w-5 shrink-0 text-accent" />
        <label htmlFor="home-code" className="sr-only">
          {t("room_code")}
        </label>
        <input
          id="home-code"
          inputMode="numeric"
          autoComplete="off"
          value={digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("home_code_placeholder")}
          className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold tabular-nums tracking-[0.06em] outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-soft"
        />
        <button disabled={digits.length !== 6} className="btn-zec py-2.5">
          {t("join")}
        </button>
      </form>
    </section>
  );
}

/** Zeki kartı için soyut, özgün piksel arka plan: basamaklar ve bir altın para */
function ZekiArt() {
  const steps = [
    [150, 118, 40],
    [190, 96, 40],
    [230, 74, 60],
  ];
  return (
    <svg aria-hidden viewBox="140 30 160 170" className="absolute bottom-0 right-0 h-[62%] opacity-90" preserveAspectRatio="xMaxYMax meet">
      {steps.map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={200 - y} fill="#232731" />
          <rect x={x} y={y} width={w} height={6} fill="#2F3440" />
        </g>
      ))}
      <circle cx="262" cy="46" r="13" fill="#F4B728" />
      <path d="M257 40h10l-10 12h10" stroke="#14161B" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
      <circle cx="210" cy="70" r="5" fill="#F4B728" opacity=".55" />
      <circle cx="170" cy="92" r="5" fill="#F4B728" opacity=".3" />
    </svg>
  );
}

/** Arena kartı için iki karşılıklı yay — düello */
function ArenaArt() {
  return (
    <svg aria-hidden viewBox="140 70 160 100" className="absolute right-0 top-4 h-[38%] text-zec" preserveAspectRatio="xMaxYMin meet">
      <circle cx="190" cy="120" r="44" fill="none" stroke="currentColor" strokeWidth="10" opacity=".22" />
      <circle cx="252" cy="120" r="44" fill="none" stroke="rgb(var(--ink))" strokeWidth="10" opacity=".08" />
      <path d="M221 88a44 44 0 0 1 0 64" fill="none" stroke="currentColor" strokeWidth="10" opacity=".5" />
    </svg>
  );
}

/* ---------------------------------------------------------------------
   Topluluk: harita + yaklaşan buluşmalar
   --------------------------------------------------------------------- */
export function CommunityBlock({ meetups, loading }: { meetups: MeetupCard[]; loading: boolean }) {
  const { t } = useI18n();
  const byCountry = new Map<string, number>();
  meetups.forEach((m) => m.country && byCountry.set(m.country, (byCountry.get(m.country) ?? 0) + 1));
  const first = meetups[0];
  const points = meetups.filter((m) => !(m.online && !m.city && m.lat == null)).map((m, i) => ({
    key: m.id,
    lat: m.lat,
    lng: m.lng,
    country: m.country,
    label: m.title,
    href: `/community/meetups/${m.id}`,
    pulse: i === 0,
  }));
  return (
    <section aria-labelledby="h-comm">
      <HomeHead title={t("home_community_title")} sub={t("home_community_sub")} href="/community" cta={t("home_all_meetups")} />
      <div className="grid overflow-hidden rounded-[24px] border border-line bg-card lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="relative flex min-w-0 flex-col justify-center border-b border-line p-3 sm:p-5 lg:border-b-0 lg:border-r">
          <WorldMap points={points} label={t("community_map_label")} clusterHref={(c) => (c ? `/community?country=${c}` : "/community")} />
          {first && (
            <p className="mt-2 px-1 text-[12.5px] text-soft">
              {t("home_map_caption", { n: meetups.length, c: byCountry.size })}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col p-1.5 sm:p-2">
          {loading ? (
            [0, 1, 2].map((i) => <MeetupRowSkeleton key={i} />)
          ) : meetups.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-2 p-5">
              <CalendarPlus className="h-6 w-6 text-accent" />
              <p className="font-semibold">{t("community_no_meetups")}</p>
              <p className="text-[14px] text-muted">{t("home_meetups_empty_sub")}</p>
              <Link href="/organizers" className="btn-ghost mt-2 py-2 text-[13px]">
                {t("community_start_cta")}
              </Link>
            </div>
          ) : (
            <ul>
              {meetups.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <MeetupRow m={m} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------
   XP sıralaması (kompakt)
   --------------------------------------------------------------------- */
export function XpBoard({
  rows,
  loading,
}: {
  rows: { id: string; display_name: string; username: string | null; country: string | null; xp: number; level: number }[];
  loading: boolean;
}) {
  const { t, fmt } = useI18n();
  return (
    <section aria-labelledby="h-xp" className="flex flex-col rounded-[24px] border border-line bg-card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="h-xp" className="flex items-center gap-2 font-display text-[19px] font-bold">
          <Crown className="h-5 w-5 text-accent" />
          {t("home_xp_board")}
        </h2>
        <Link href="/leaderboard?tab=xp" className="text-[13.5px] font-semibold text-accent hover:underline">
          {t("view_all")}
        </Link>
      </div>
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-input" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-muted">{t("home_xp_board_empty")}</p>
      ) : (
        <ol className="space-y-1">
          {rows.slice(0, 5).map((r, i) => {
            const inner = (
              <>
                <span className={`w-6 text-center font-display text-[15px] font-extrabold tabular-nums ${i === 0 ? "text-accent" : "text-soft"}`}>{i + 1}</span>
                <Avatar name={r.display_name || r.username || "?"} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
                    {r.display_name}
                    <Flag code={r.country} size={10} />
                  </span>
                  <span className="block text-[12.5px] text-muted">
                    {t("home_level_short", { n: r.level })} · {t(levelTitleKey(r.level))}
                  </span>
                </span>
                <span className="tabular-nums text-[14px] font-bold">{fmt(r.xp)}</span>
              </>
            );
            return (
              <li key={r.id}>
                {r.username ? (
                  <Link href={`/u/${r.username}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-input/70">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl px-2 py-2">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
