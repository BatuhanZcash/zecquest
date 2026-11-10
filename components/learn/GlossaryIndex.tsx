"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { initialOf, pick, searchGlossary, sortedGlossary } from "@/lib/learn";
import { useLearnProgress } from "@/lib/api-learn";

export function GlossaryIndex() {
  const { t, lang } = useI18n();
  const p = useLearnProgress();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ?q= from the Learn page search box; keep the URL in sync without navigation
  useEffect(() => {
    const init = new URLSearchParams(window.location.search).get("q");
    if (init) setQ(init);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q.trim()) url.searchParams.set("q", q.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [q]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = q.trim().length > 0;
  const results = useMemo(() => (searching ? searchGlossary(q, lang) : sortedGlossary()), [q, lang, searching]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof results>();
    for (const g of results) {
      const k = initialOf(g.term);
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return [...m.entries()];
  }, [results]);
  const letters = useMemo(() => new Set(sortedGlossary().map((g) => initialOf(g.term))), []);
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").concat(letters.has("#") ? ["#"] : []);

  const Row = ({ g }: { g: (typeof results)[number] }) => (
    <li>
      <Link href={`/glossary/${g.slug}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-1 py-3.5 sm:grid-cols-[200px_minmax(0,1fr)_auto] sm:gap-6">
        <span className="font-display text-[16.5px] font-bold leading-snug group-hover:underline">{g.term}</span>
        <span className="col-span-2 row-start-2 text-[14.5px] leading-relaxed text-muted sm:col-span-1 sm:row-start-1 sm:col-start-2">{pick(g.short, lang)}</span>
        <span className="col-start-2 row-start-1 flex items-center gap-2 pt-1 sm:col-start-3">
          {p.termSeen(g.slug) && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label={t("learn_term_seen")} />}
          <ChevronRight className="h-4 w-4 text-soft" aria-hidden />
        </span>
      </Link>
    </li>
  );

  return (
    <div className="mx-auto max-w-[920px]">
      <nav aria-label={t("learn_breadcrumb")} className="flex items-center gap-1 text-[13px] text-muted">
        <Link href="/learn" className="hover:text-ink">
          {t("learn_title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-soft" aria-hidden />
      </nav>
      <h1 className="mt-3 font-display text-[36px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[52px]">{t("learn_glossary_title")}</h1>
      <p className="mt-3 max-w-[58ch] text-[17px] leading-relaxed text-muted">{t("learn_glossary_intro")}</p>

      <div className="sticky top-16 z-10 -mx-4 mt-6 border-b border-line bg-app/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div role="search" className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-soft" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("learn_glossary_search")}
            aria-label={t("learn_glossary_search")}
            className="input h-12 rounded-2xl pl-11 pr-11 text-[16px]"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label={t("learn_clear")}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-input hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 text-[12px] text-soft sm:block">/</kbd>
          )}
        </div>
        {!searching && (
          <nav aria-label={t("learn_az")} className="no-scrollbar mt-2.5 flex gap-0.5 overflow-x-auto">
            {AZ.map((L) =>
              letters.has(L) ? (
                <a key={L} href={`#letter-${L}`} className="flex h-7 min-w-[26px] items-center justify-center rounded-md text-[13px] font-semibold text-ink hover:bg-input">
                  {L}
                </a>
              ) : (
                <span key={L} className="flex h-7 min-w-[26px] items-center justify-center text-[13px] text-soft/60" aria-hidden>
                  {L}
                </span>
              )
            )}
          </nav>
        )}
      </div>

      <p className="mt-4 text-[13px] text-muted" aria-live="polite">
        {searching ? t(results.length === 1 ? "learn_results_one" : "learn_results", { n: results.length }) : t(results.length === 1 ? "learn_n_terms_one" : "learn_n_terms", { n: results.length })}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-semibold">{t("learn_no_results", { q: q.trim() })}</p>
          <p className="mt-1 text-[14px] text-muted">{t("learn_no_results_hint")}</p>
        </div>
      ) : searching ? (
        <ul className="mt-2 divide-y divide-line">
          {results.map((g) => (
            <Row key={g.slug} g={g} />
          ))}
        </ul>
      ) : (
        groups.map(([L, items]) => (
          <section key={L} id={`letter-${L}`} className="mt-6 scroll-mt-40" aria-labelledby={`h-${L}`}>
            <h2 id={`h-${L}`} className="font-display text-[28px] font-extrabold leading-none text-accent">
              {L}
            </h2>
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {items.map((g) => (
                <Row key={g.slug} g={g} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
