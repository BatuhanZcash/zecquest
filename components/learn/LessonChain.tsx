"use client";

import Link from "next/link";
import { Check, Clock, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { lessonHref, pick } from "@/lib/learn";
import type { Track } from "@/lib/content/types";

/**
 * A track's lessons drawn as a chain of blocks: each finished lesson fills its block and the link below it.
 * The numbering is the real reading order.
 */
export function LessonChain({
  track,
  lang,
  read,
  passed,
}: {
  track: Track;
  lang: string;
  read: (slug: string) => boolean;
  passed: (slug: string) => boolean;
}) {
  const { t } = useI18n();
  const nextIdx = track.lessons.findIndex((l) => !read(l.slug));
  return (
    <ol className="relative">
      {track.lessons.map((l, i) => {
        const done = read(l.slug);
        const quiz = passed(l.slug);
        const isNext = i === nextIdx;
        const last = i === track.lessons.length - 1;
        return (
          <li key={l.slug} className="relative grid grid-cols-[44px_1fr] gap-x-4 pb-3 last:pb-0">
            {/* Chain link to the next block */}
            {!last && (
              <span
                aria-hidden
                className={`absolute left-[21px] top-[46px] bottom-[-2px] w-[2px] ${done ? "bg-zec" : "bg-line"}`}
              />
            )}
            <span
              aria-hidden
              className={`relative z-[1] mt-1 flex h-11 w-11 items-center justify-center rounded-[10px] font-display text-[16px] font-extrabold tabular-nums ${
                done
                  ? "bg-zec text-[#1A1506]"
                  : isNext
                    ? "border-2 border-zec bg-card text-ink"
                    : "border-2 border-line bg-card text-muted"
              }`}
            >
              {done ? <Check className="h-5 w-5" strokeWidth={3} /> : i + 1}
            </span>
            <Link
              href={lessonHref(track.slug, l.slug)}
              className={`group block rounded-xl border px-4 py-3 transition-colors ${
                isNext ? "border-zec/60 bg-card shadow-card" : "border-transparent hover:border-line hover:bg-card"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-display text-[17px] font-bold leading-snug group-hover:underline">{pick(l.title, lang)}</h3>
                {isNext && <span className="chip">{t(nextIdx === 0 ? "learn_start" : "learn_up_next")}</span>}
              </div>
              <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{pick(l.summary, lang)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> {t("learn_min", { n: l.minutes })}
                </span>
                {l.quiz.length > 0 && (
                  <span className={`inline-flex items-center gap-1.5 ${quiz ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""}`}>
                    {quiz ? <Check className="h-3.5 w-3.5" aria-hidden /> : <HelpCircle className="h-3.5 w-3.5" aria-hidden />}
                    {quiz ? t("learn_quiz_passed") : t("learn_quiz_n", { n: l.quiz.length })}
                  </span>
                )}
                {done && <span className="sr-only">{t("learn_read_done")}</span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
