"use client";

import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/config";

type Section = { h: { tr: string; en: string }; p: { tr: string; en: string } };

export function LegalPage({ title, sections }: { title: { tr: string; en: string }; sections: Section[] }) {
  const { lt } = useI18n();
  return (
    <article className="card mx-auto max-w-3xl space-y-5 p-6 sm:p-10">
      <h1 className="text-3xl font-bold">{lt(title)}</h1>
      <p className="text-xs text-soft">{SITE.name}</p>
      {sections.map((s, i) => (
        <section key={i}>
          <h2 className="mb-1.5 font-semibold">{lt(s.h)}</h2>
          <p className="whitespace-pre-line leading-relaxed text-muted">{lt(s.p)}</p>
        </section>
      ))}
    </article>
  );
}
