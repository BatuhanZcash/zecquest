"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock, ExternalLink, Languages, ListTree } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { findLanguage, textAttrs } from "@/lib/languages";
import { findLesson, lessonHref, lessonLanguages, lessonOutline, neighbours, passMark, pick } from "@/lib/learn";
import { markDone, useLearnProgress } from "@/lib/api-learn";
import { LessonBlocks } from "./LessonBlocks";
import { LessonQuiz } from "./LessonQuiz";
import { SaveProgress, XpToast } from "./SaveProgress";

function formatChecked(d: string, lang: string) {
  const dt = new Date(`${d}T12:00:00Z`);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function Sources({ sources, lang }: { sources: { title: string; url: string; checked: string }[]; lang: string }) {
  const { t } = useI18n();
  if (!sources.length) return null;
  return (
    <section aria-labelledby="sources-h">
      <h2 id="sources-h" className="font-display text-[17px] font-bold">
        {t("learn_sources")}
      </h2>
      <ol className="mt-3 space-y-2.5">
        {sources.map((s, i) => {
          let host = "";
          try {
            host = new URL(s.url).hostname.replace(/^www\./, "");
          } catch {}
          return (
            <li key={s.url + i} className="grid grid-cols-[22px_1fr] text-[14px]">
              <span className="tabular-nums text-soft">{i + 1}.</span>
              <div className="min-w-0">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-line underline-offset-[3px] hover:decoration-zec">
                  {s.title}
                  {"\u00a0"}
                  <ExternalLink className="inline h-3 w-3 text-soft" aria-hidden />
                </a>
                <div className="text-[12.5px] text-muted">
                  {host}
                  {s.checked && <> · {t("learn_checked_on", { date: formatChecked(s.checked, lang) })}</>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function LessonView({ trackSlug, lessonSlug }: { trackSlug: string; lessonSlug: string }) {
  const { t, lang } = useI18n();
  const found = findLesson(trackSlug, lessonSlug)!;
  const { track, lesson, index } = found;
  const { prev, next } = neighbours(trackSlug, lessonSlug);
  const progress = useLearnProgress();
  const [override, setOverride] = useState<string | null>(null);
  const cl = override ?? lang; // content language
  const extraLangs = lessonLanguages(lesson).filter((l) => l !== "en" && l !== "tr");
  const outline = lessonOutline(lesson, cl);
  const read = progress.lessonRead(lesson.slug);
  const passed = progress.quizPassed(lesson.slug);

  const articleRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => setOverride(null), [lessonSlug]);

  // Reading progress + current section
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setPct(Math.min(1, Math.max(0, (-r.top + 80) / Math.max(total, 1))));
      let cur: string | null = null;
      for (const o of outline) {
        const h = document.getElementById(o.id);
        if (h && h.getBoundingClientRect().top < 140) cur = o.id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [outline.map((o) => o.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const award = useCallback(
    async (source: "lesson" | "lesson_quiz", label: string) => {
      const r = await markDone(source, lesson.slug);
      if (r.local) setToast(t("learn_toast_local", { what: label }));
      else if (r.awarded > 0) setToast(t("learn_toast_xp", { n: r.awarded, what: label }));
    },
    [lesson.slug, t]
  );

  // Finishing the reading: the end of the article has reached the screen (also when jumping past it, e.g. to the quiz)
  useEffect(() => {
    if (!progress.ready || read) return;
    let done = false;
    const check = () => {
      const el = endRef.current;
      if (done || !el) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        done = true;
        award("lesson", t("learn_toast_lesson"));
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [progress.ready, read, award, t]);

  const attrs = override ? textAttrs(override) : { lang: cl, dir: "auto" as const };
  const trackTitle = pick(track.title, lang);

  return (
    <>
      {/* Reading progress (mobile + desktop), under the sticky header */}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-20 h-[3px] bg-transparent" aria-hidden>
        <div className="h-full origin-left bg-zec transition-transform duration-150" style={{ transform: `scaleX(${pct})` }} />
      </div>

      <div className="mx-auto grid max-w-[1040px] gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-16">
        {/* Desktop outline */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Link href={`/learn/${track.slug}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {trackTitle}
            </Link>
            <p className="mt-4 text-[12.5px] tabular-nums text-soft">
              {t("learn_lesson_of", { n: index + 1, total: track.lessons.length })}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
              <div className="h-full rounded-full bg-zec" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
            {outline.length > 0 && (
              <nav aria-label={t("learn_on_this_page")} className="mt-6">
                <p className="text-[12.5px] font-semibold text-muted">{t("learn_on_this_page")}</p>
                <ul className="mt-2 space-y-0.5 border-l border-line">
                  {outline.map((o) => (
                    <li key={o.id}>
                      <a
                        href={`#${o.id}`}
                        aria-current={active === o.id ? "location" : undefined}
                        className={`-ml-px block border-l-2 py-1 pl-3 text-[13.5px] leading-snug transition-colors ${
                          active === o.id ? "border-zec font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                        }`}
                      >
                        {o.text}
                      </a>
                    </li>
                  ))}
                  {lesson.quiz.length > 0 && (
                    <li>
                      <a href="#lesson-quiz" className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-[13.5px] text-muted hover:text-ink">
                        {t("learn_quiz_title")}
                      </a>
                    </li>
                  )}
                </ul>
              </nav>
            )}
          </div>
        </aside>

        <article className="min-w-0 max-w-[680px]">
          {/* Breadcrumb */}
          <nav aria-label={t("learn_breadcrumb")} className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
            <Link href="/learn" className="hover:text-ink">
              {t("learn_title")}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-soft" aria-hidden />
            <Link href={`/learn/${track.slug}`} className="hover:text-ink">
              {trackTitle}
            </Link>
          </nav>

          <header className="mt-4">
            <h1 {...attrs} className="font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
              {pick(lesson.title, cl)}
            </h1>
            <p {...attrs} className="mt-4 text-[18px] leading-relaxed text-muted sm:text-[20px]">
              {pick(lesson.summary, cl)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-[13.5px] text-muted">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="h-4 w-4" aria-hidden /> {t("learn_min_read", { n: lesson.minutes })}
              </span>
              <span className="tabular-nums lg:hidden">{t("learn_lesson_of", { n: index + 1, total: track.lessons.length })}</span>
              {read && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4" aria-hidden /> {t("learn_read_done")}
                </span>
              )}
              {passed && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4" aria-hidden /> {t("learn_quiz_passed")}
                </span>
              )}
            </div>
            {(extraLangs.length > 0 || override) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                <Languages className="h-4 w-4 text-soft" aria-hidden />
                <span className="text-muted">{t("learn_also_in")}</span>
                {override && (
                  <button onClick={() => setOverride(null)} className="rounded-full border border-line px-2.5 py-0.5 font-medium hover:border-[rgb(var(--soft))]">
                    {findLanguage(lang)?.native}
                  </button>
                )}
                {extraLangs
                  .filter((l) => l !== override)
                  .map((l) => (
                    <button key={l} onClick={() => setOverride(l)} className="rounded-full border border-line px-2.5 py-0.5 font-medium hover:border-[rgb(var(--soft))]">
                      {findLanguage(l)?.native}
                    </button>
                  ))}
                {override && <span className="text-soft">{t("learn_partial_note")}</span>}
              </div>
            )}
          </header>

          {/* Mobile outline */}
          {outline.length > 1 && (
            <details className="group mt-5 rounded-xl border border-line bg-card lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold">
                <ListTree className="h-4 w-4 text-muted" aria-hidden /> {t("learn_on_this_page")}
                <ChevronRight className="ml-auto h-4 w-4 text-soft transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <ul className="border-t border-line px-4 py-2">
                {outline.map((o) => (
                  <li key={o.id}>
                    <a href={`#${o.id}`} className="block py-1.5 text-[14px] text-muted hover:text-ink">
                      {o.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div ref={articleRef} {...attrs} className="mt-6">
            <LessonBlocks blocks={lesson.blocks} lang={cl} />
            <div ref={endRef} aria-hidden className="h-px" />
          </div>

          {progress.ready && !progress.signedIn && (
            <div className="mt-10">
              <SaveProgress pending={progress.pending} />
            </div>
          )}

          {lesson.quiz.length > 0 && (
            <section id="lesson-quiz" className="mt-12 scroll-mt-24" aria-labelledby="lesson-quiz-h">
              <h2 id="lesson-quiz-h" className="font-display text-[23px] font-bold tracking-[-0.015em] sm:text-[26px]">
                {t("learn_quiz_title")}
              </h2>
              <p className="mb-4 mt-1 text-[15px] text-muted">{t("learn_quiz_sub", { n: lesson.quiz.length, need: passMark(lesson.quiz.length) })}</p>
              <LessonQuiz
                key={lesson.slug}
                questions={lesson.quiz}
                lang={cl}
                passed={passed}
                onPass={() => award("lesson_quiz", t("learn_toast_quiz"))}
              />
            </section>
          )}

          <div className="mt-12 border-t border-line pt-8">
            <Sources sources={lesson.sources} lang={lang} />
          </div>

          {/* Prev / next */}
          <nav aria-label={t("learn_lesson_nav")} className="mt-10 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={lessonHref(prev.track.slug, prev.lesson.slug)} className="group rounded-xl border border-line bg-card p-4 hover:border-[rgb(var(--soft))]">
                <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("learn_prev")}
                </span>
                <span className="mt-1 block font-semibold leading-snug group-hover:underline">{pick(prev.lesson.title, lang)}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next ? (
              <Link
                href={lessonHref(next.track.slug, next.lesson.slug)}
                className="group rounded-xl border border-line bg-card p-4 text-right hover:border-[rgb(var(--soft))]"
              >
                <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                  {next.track.slug !== track.slug ? t("learn_next_track", { track: pick(next.track.title, lang) }) : t("learn_next")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="mt-1 block font-semibold leading-snug group-hover:underline">{pick(next.lesson.title, lang)}</span>
              </Link>
            ) : (
              <Link href="/learn" className="group rounded-xl border border-line bg-card p-4 text-right hover:border-[rgb(var(--soft))]">
                <span className="text-[12.5px] text-muted">{t("learn_all_done")}</span>
                <span className="mt-1 block font-semibold group-hover:underline">{t("learn_back_to_tracks")}</span>
              </Link>
            )}
          </nav>
        </article>
      </div>
      <XpToast text={toast} onDone={clearToast} />
    </>
  );
}
