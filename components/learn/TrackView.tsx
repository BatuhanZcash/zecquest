"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { TRACKS, findTerm, findTrack, lessonHref, pick, trackMinutes } from "@/lib/learn";
import { useLearnProgress } from "@/lib/api-learn";
import { LessonChain } from "./LessonChain";
import { SaveProgress } from "./SaveProgress";
import type { Track } from "@/lib/content/types";

export function LevelTag({ level }: { level: Track["level"] }) {
  const { t } = useI18n();
  const bars = level === "beginner" ? 1 : level === "intermediate" ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span key={b} className={`w-[3px] rounded-[1px] ${b <= bars ? "bg-accent" : "bg-line"}`} style={{ height: 4 + b * 3 }} />
        ))}
      </span>
      {t(`learn_level_${level}` as DictKey)}
    </span>
  );
}

export function TrackView({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const track = findTrack(slug)!;
  const p = useLearnProgress();
  const readCount = track.lessons.filter((l) => p.lessonRead(l.slug)).length;
  const quizCount = track.lessons.filter((l) => p.quizPassed(l.slug)).length;
  const total = track.lessons.length;
  const next = track.lessons.find((l) => !p.lessonRead(l.slug));
  const terms = Array.from(
    new Set(track.lessons.flatMap((l) => l.blocks.flatMap((b) => (b.type === "term" ? [b.slug] : []))))
  )
    .map(findTerm)
    .filter((x): x is NonNullable<typeof x> => !!x);
  const others = TRACKS.filter((x) => x.slug !== track.slug);

  return (
    <div className="mx-auto max-w-[1040px]">
      <nav aria-label={t("learn_breadcrumb")} className="flex items-center gap-1 text-[13px] text-muted">
        <Link href="/learn" className="hover:text-ink">
          {t("learn_title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-soft" aria-hidden />
      </nav>

      <div className="mt-3 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <LevelTag level={track.level} />
          <h1 className="mt-2 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[46px]">{pick(track.title, lang)}</h1>
          <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-muted sm:text-[18px]">{pick(track.summary, lang)}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {next ? (
              <Link href={lessonHref(track.slug, next.slug)} className="btn-zec">
                {readCount ? t("learn_continue") : t("learn_start_track")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <span className="chip py-1">{t("learn_track_done")}</span>
            )}
            <span className="text-[14px] tabular-nums text-muted">
              {t(total === 1 ? "learn_n_lessons_one" : "learn_n_lessons", { n: total })}, {t("learn_about_min", { n: trackMinutes(track) })}
            </span>
          </div>

          <div className="mt-9">
            <LessonChain track={track} lang={lang} read={p.lessonRead} passed={p.quizPassed} />
          </div>
        </div>

        <aside className="space-y-5 lg:pt-8">
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-[13px] font-semibold text-muted">{t("learn_your_progress")}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-[34px] font-extrabold leading-none tabular-nums">{readCount}</span>
              <span className="text-[15px] text-muted">/ {total}</span>
              <span className="ml-1 text-[14px] text-muted">{t("learn_lessons_read")}</span>
            </div>
            <div className="mt-3 flex gap-1" aria-hidden>
              {track.lessons.map((l) => (
                <span key={l.slug} className={`h-2 flex-1 rounded-[3px] ${p.lessonRead(l.slug) ? "bg-zec" : "bg-line"}`} />
              ))}
            </div>
            <p className="mt-3 text-[13.5px] text-muted">{t("learn_quizzes_passed", { n: quizCount, total })}</p>
          </div>
          {p.ready && !p.signedIn && <SaveProgress pending={p.pending} compact />}
          {terms.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                <BookOpen className="h-4 w-4" aria-hidden /> {t("learn_terms_in_track")}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {terms.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/glossary/${g.slug}`} className="inline-block rounded-full border border-line bg-card px-3 py-1 text-[13px] font-medium hover:border-[rgb(var(--soft))]">
                      {g.term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-muted">{t("learn_other_tracks")}</p>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-card">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/learn/${o.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-input/40">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{pick(o.title, lang)}</span>
                        <span className="block text-[12.5px] text-muted">{t(o.lessons.length === 1 ? "learn_n_lessons_one" : "learn_n_lessons", { n: o.lessons.length })}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-soft" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
