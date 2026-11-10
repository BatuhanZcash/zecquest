"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, BookOpen, ChevronDown, Info, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { findTerm, pick } from "@/lib/learn";
import type { LessonBlock } from "@/lib/content/types";
import { Figure } from "./figures";

/** Glossary card shown where a lesson has a `term` block. Expands in place for the longer explanation. */
export function TermCard({ slug, lang }: { slug: string; lang: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const term = findTerm(slug);
  if (!term) return null;
  const body = term.body.map((b) => pick(b, lang)).filter(Boolean);
  return (
    <aside className="not-prose my-7 rounded-xl border border-line bg-card" aria-label={`${t("learn_glossary")}: ${term.term}`}>
      <div className="flex gap-3 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-accent" aria-hidden>
          <BookOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`/glossary/${term.slug}`} className="font-display text-[16px] font-bold hover:underline">
              {term.term}
            </Link>
            <span className="text-[12px] text-soft">{t("learn_glossary")}</span>
          </div>
          <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{pick(term.short, lang)}</p>
          {open && (
            <div className="mt-2 space-y-2 text-[14.5px] leading-relaxed text-ink" id={`term-${slug}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
            {body.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={`term-${slug}`}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                {t(open ? "learn_term_less" : "learn_term_more")}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
            )}
            <Link href={`/glossary/${term.slug}`} className="text-muted hover:text-ink">
              {t("learn_term_open")}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

const CALLOUT = {
  info: { icon: Info, cls: "border-line bg-input/50", ic: "text-muted", key: "learn_callout_info" },
  tip: { icon: Lightbulb, cls: "border-zec/40 bg-tint/60", ic: "text-accent", key: "learn_callout_tip" },
  warn: { icon: AlertTriangle, cls: "border-[#E8742A]/40 bg-[#E8742A]/[0.07]", ic: "text-[#C2571A] dark:text-[#F0955A]", key: "learn_callout_warn" },
} as const;

/** Renders all lesson block types. Headings get stable ids (s-<index>) for the outline. */
export function LessonBlocks({ blocks, lang }: { blocks: LessonBlock[]; lang: string }) {
  const { t } = useI18n();
  let fig = 0;
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return (
              <p key={i} className="my-5 text-[17px] leading-[1.75] text-ink/90 sm:text-[18px]">
                {pick(b.text, lang)}
              </p>
            );
          case "h":
            return (
              <h2 key={i} id={`s-${i}`} className="mb-3 mt-12 scroll-mt-24 font-display text-[23px] font-bold leading-tight tracking-[-0.015em] sm:text-[26px]">
                {pick(b.text, lang)}
              </h2>
            );
          case "list":
            return (
              <ul key={i} className="my-5 space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="relative pl-6 text-[17px] leading-[1.7] text-ink/90 sm:text-[18px]">
                    <span className="absolute left-1 top-[0.72em] h-1.5 w-1.5 rounded-[2px] bg-zec" aria-hidden />
                    {pick(it, lang)}
                  </li>
                ))}
              </ul>
            );
          case "callout": {
            const C = CALLOUT[b.tone] ?? CALLOUT.info;
            return (
              <div key={i} role="note" className={`my-7 flex gap-3 rounded-xl border px-4 py-3.5 ${C.cls}`}>
                <C.icon className={`mt-[3px] h-[18px] w-[18px] shrink-0 ${C.ic}`} aria-hidden />
                <p className="text-[15.5px] leading-relaxed">
                  <span className="sr-only">{t(C.key)}: </span>
                  {pick(b.text, lang)}
                </p>
              </div>
            );
          }
          case "term":
            return <TermCard key={i} slug={b.slug} lang={lang} />;
          case "figure":
            fig += 1;
            return <Figure key={i} figKey={b.key} caption={pick(b.caption, lang)} label={t("learn_fig_label", { n: fig })} describeLabel={t("learn_fig_describe")} />;
          default:
            return null;
        }
      })}
    </>
  );
}
