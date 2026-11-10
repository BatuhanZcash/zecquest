"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { findTerm, lessonHref, lessonsUsingTerm, pick, sortedGlossary } from "@/lib/learn";
import { markDone, useLearnProgress } from "@/lib/api-learn";
import { Sources } from "./LessonView";

export function GlossaryTermView({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const term = findTerm(slug)!;
  const p = useLearnProgress();
  const related = term.related.map(findTerm).filter((x): x is NonNullable<typeof x> => !!x);
  const lessons = lessonsUsingTerm(term);
  const az = sortedGlossary();
  const i = az.findIndex((g) => g.slug === slug);
  const prev = i > 0 ? az[i - 1] : undefined;
  const next = i < az.length - 1 ? az[i + 1] : undefined;

  const usedIn = (
          <div>
      <h2 className="text-[13px] font-semibold text-muted">{t("learn_used_in")}</h2>
      {lessons.length ? (
        <ul className="mt-2 space-y-2">
          {lessons.map(({ track, lesson }) => (
            <li key={lesson.slug}>
              <Link href={lessonHref(track.slug, lesson.slug)} className="group block rounded-xl border border-line bg-card p-3.5 hover:border-[rgb(var(--soft))]">
                <span className="block text-[12px] text-muted">{pick(track.title, lang)}</span>
                <span className="mt-0.5 block font-semibold leading-snug group-hover:underline">{pick(lesson.title, lang)}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] tabular-nums text-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> {t("learn_min", { n: lesson.minutes })}
                  {p.lessonRead(lesson.slug) && <span className="ml-2 font-semibold text-emerald-700 dark:text-emerald-400">{t("learn_read_done")}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] text-muted">{t("learn_used_in_none")}</p>
      )}
    </div>
  );

  // One glossary XP per term; the store skips terms already credited, so revisits cost nothing
  useEffect(() => {
    if (!p.ready || p.termSeen(slug)) return;
    const id = setTimeout(() => markDone("glossary", slug), 1500);
    return () => clearTimeout(id);
  }, [p.ready, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-[1040px]">
      <nav aria-label={t("learn_breadcrumb")} className="flex items-center gap-1 text-[13px] text-muted">
        <Link href="/learn" className="hover:text-ink">
          {t("learn_title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-soft" aria-hidden />
        <Link href="/glossary" className="hover:text-ink">
          {t("learn_glossary")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-soft" aria-hidden />
      </nav>

      <div className="mt-3 grid gap-10 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] xl:gap-16">
        <article className="min-w-0">
          <h1 className="font-display text-[38px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[54px]">{term.term}</h1>
          <p className="mt-4 border-l-[3px] border-zec pl-4 text-[19px] leading-relaxed sm:text-[21px]">{pick(term.short, lang)}</p>
          <div className="mt-6 space-y-5">
            {term.body.map((b, k) => (
              <p key={k} className="text-[17px] leading-[1.75] text-ink/90 sm:text-[18px]">
                {pick(b, lang)}
              </p>
            ))}
          </div>

          <div className="mt-10 lg:hidden">{usedIn}</div>

          {related.length > 0 && (
            <section className="mt-10" aria-labelledby="related-h">
              <h2 id="related-h" className="font-display text-[17px] font-bold">
                {t("learn_related")}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/glossary/${r.slug}`} className="group block h-full rounded-xl border border-line bg-card p-3.5 hover:border-[rgb(var(--soft))]">
                      <span className="font-semibold group-hover:underline">{r.term}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-muted">{pick(r.short, lang)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10 border-t border-line pt-8">
            <Sources sources={term.sources} lang={lang} />
          </div>

          <nav aria-label={t("learn_az")} className="mt-10 flex justify-between gap-3 text-[14px]">
            {prev ? (
              <Link href={`/glossary/${prev.slug}`} className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden /> {prev.term}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/glossary/${next.slug}`} className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-ink">
                {next.term} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </nav>
        </article>

        <aside className="space-y-5 lg:pt-3">
          <div className="hidden lg:block">{usedIn}</div>
          <Link href="/glossary" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t("learn_all_terms")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
