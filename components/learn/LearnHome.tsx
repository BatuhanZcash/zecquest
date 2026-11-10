"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, Search, Swords } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { GLOSSARY, LEVEL_ORDER, TRACKS, allLessons, lessonHref, pick, trackMinutes } from "@/lib/learn";
import { useLearnProgress } from "@/lib/api-learn";
import { LevelTag } from "./TrackView";
import { SaveProgress } from "./SaveProgress";

/** The newcomer path: the first lessons of the first beginner track (or the first track). */
function startPath() {
  const track = TRACKS.find((t) => t.level === "beginner") ?? TRACKS[0];
  return track ? { track, lessons: track.lessons.slice(0, 4) } : null;
}

export function LearnHome() {
  const { t, lang, fmt } = useI18n();
  const router = useRouter();
  const p = useLearnProgress();
  const [q, setQ] = useState("");
  const all = allLessons();
  const readTotal = all.filter((r) => p.lessonRead(r.lesson.slug)).length;
  const path = startPath();
  const pathNext = path?.lessons.find((l) => !p.lessonRead(l.slug));
  const resume = all.find((r) => !p.lessonRead(r.lesson.slug));
  const cta = readTotal ? resume : path && path.lessons[0] ? { track: path.track, lesson: path.lessons[0] } : undefined;
  const tracks = [...TRACKS].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  const sampleTerms = GLOSSARY.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1040px]">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h1 className="font-display text-[36px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[52px]">{t("learn_title_long")}</h1>
          <p className="mt-3 max-w-[56ch] text-[17px] leading-relaxed text-muted sm:text-[18px]">{t("learn_intro")}</p>
        </div>
        {readTotal > 0 && (
          <div className="flex items-center gap-5 rounded-2xl border border-line bg-card px-5 py-4">
            <div>
              <div className="font-display text-[26px] font-extrabold leading-none tabular-nums">
                {readTotal}
                <span className="text-[15px] font-semibold text-muted"> / {all.length}</span>
              </div>
              <div className="mt-1 text-[12.5px] text-muted">{t("learn_lessons_read")}</div>
            </div>
            {p.xp && (
              <div className="border-l border-line pl-5">
                <div className="font-display text-[26px] font-extrabold leading-none tabular-nums">{fmt(p.xp.xp)}</div>
                <div className="mt-1 text-[12.5px] text-muted">{t("learn_xp_level", { n: p.xp.level })}</div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Start here: the newcomer path */}
      {path && (
        <section className="mt-8 overflow-hidden rounded-[22px] border border-transparent bg-[#16181D] bg-[radial-gradient(90%_140%_at_100%_0%,rgba(244,183,40,.16),transparent_55%)] p-5 text-[#ECEEF2] dark:border-white/10 sm:p-8" aria-labelledby="start-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="start-h" className="font-display text-[24px] font-extrabold tracking-[-0.02em] sm:text-[28px]">
                {readTotal ? t("learn_keep_going") : t("learn_start_here")}
              </h2>
              <p className="mt-1 max-w-[52ch] text-[15px] text-[#A1A7B3]">{t("learn_start_here_sub")}</p>
            </div>
            {cta && (
              <Link href={lessonHref(cta.track.slug, cta.lesson.slug)} className="btn-zec">
                {readTotal ? t("learn_continue") : t("learn_start_lesson_1")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
          <ol className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {path.lessons.map((l, i) => {
              const done = p.lessonRead(l.slug);
              const isNext = l.slug === pathNext?.slug;
              return (
                <li key={l.slug} className="relative lg:pr-4">
                  {i < path.lessons.length - 1 && (
                    <span aria-hidden className={`absolute left-[52px] right-0 top-[21px] hidden h-[2px] lg:block ${done ? "bg-zec" : "bg-white/15"}`} />
                  )}
                  <Link href={lessonHref(path.track.slug, l.slug)} className="group flex gap-3 lg:block">
                    <span
                      className={`relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] font-display text-[16px] font-extrabold tabular-nums ${
                        done ? "bg-zec text-[#1A1506]" : isNext ? "border-2 border-zec bg-[#16181D] text-white" : "border-2 border-white/20 bg-[#16181D] text-white/70"
                      }`}
                    >
                      {done ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : i + 1}
                    </span>
                    <span className="block min-w-0 lg:mt-3 lg:pr-2">
                      <span className="block font-semibold leading-snug group-hover:underline">{pick(l.title, lang)}</span>
                      <span className="mt-0.5 block text-[13px] tabular-nums text-[#A1A7B3]">{t("learn_min", { n: l.minutes })}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {p.ready && !p.signedIn && p.pending > 0 && (
        <div className="mt-6">
          <SaveProgress pending={p.pending} compact />
        </div>
      )}

      {/* Tracks */}
      <section className="mt-12" aria-labelledby="tracks-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="tracks-h" className="section-title">
            {t("learn_tracks")}
          </h2>
          <span className="text-[13px] tabular-nums text-muted">{t(TRACKS.length === 1 ? "learn_n_tracks_one" : "learn_n_tracks", { n: TRACKS.length })}</span>
        </div>
        {tracks.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line p-8 text-center text-muted">{t("learn_no_tracks")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {tracks.map((tr) => {
              const read = tr.lessons.filter((l) => p.lessonRead(l.slug)).length;
              return (
                <li key={tr.slug}>
                  <Link href={`/learn/${tr.slug}`} className="group grid gap-3 p-5 transition-colors hover:bg-input/30 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center sm:gap-8 sm:p-6">
                    <div className="min-w-0">
                      <LevelTag level={tr.level} />
                      <h3 className="mt-1.5 font-display text-[20px] font-bold leading-tight tracking-[-0.015em] group-hover:underline">{pick(tr.title, lang)}</h3>
                      <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{pick(tr.summary, lang)}</p>
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between text-[13px] tabular-nums text-muted">
                        <span>{t(tr.lessons.length === 1 ? "learn_n_lessons_one" : "learn_n_lessons", { n: tr.lessons.length })}</span>
                        <span>{t("learn_about_min", { n: trackMinutes(tr) })}</span>
                      </div>
                      <div className="mt-2 flex gap-[3px]" aria-label={t("learn_track_progress", { n: read, total: tr.lessons.length })} role="img">
                        {tr.lessons.map((l) => (
                          <span key={l.slug} className={`h-2 flex-1 rounded-[2px] ${p.lessonRead(l.slug) ? "bg-zec" : "bg-line"}`} />
                        ))}
                      </div>
                      <div className="mt-1.5 text-[12.5px] tabular-nums text-soft">
                        {read === tr.lessons.length && read > 0 ? t("learn_track_done") : t("learn_track_progress", { n: read, total: tr.lessons.length })}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Glossary + quizzes */}
      <section className="mt-12 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-[19px] font-bold">
            <BookOpen className="h-5 w-5 text-accent" aria-hidden /> {t("learn_glossary")}
          </h2>
          <p className="mt-1 text-[14.5px] text-muted">{t("learn_glossary_sub", { n: GLOSSARY.length })}</p>
          <form
            role="search"
            className="relative mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(q.trim() ? `/glossary?q=${encodeURIComponent(q.trim())}` : "/glossary");
            }}
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("learn_glossary_search")}
              aria-label={t("learn_glossary_search")}
              className="input pl-10"
            />
          </form>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {sampleTerms.map((g) => (
              <li key={g.slug}>
                <Link href={`/glossary/${g.slug}`} className="inline-block rounded-full bg-input px-3 py-1 text-[13px] font-medium text-muted hover:text-ink">
                  {g.term}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <Link href="/explore" className="group flex flex-col rounded-2xl border border-line bg-card p-5 hover:border-[rgb(var(--soft))] sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-[19px] font-bold">
            <Swords className="h-5 w-5 text-accent" aria-hidden /> {t("learn_quizzes")}
          </h2>
          <p className="mt-1 text-[14.5px] text-muted">{t("learn_quizzes_sub")}</p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-accent group-hover:underline">
            {t("learn_quizzes_cta")} <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </section>
    </div>
  );
}
