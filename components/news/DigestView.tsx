"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Languages, Quote, TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { findLanguage, textAttrs } from "@/lib/languages";
import type { Digest, DigestItem } from "@/lib/api-news";
import { formatDigestDate, leadOf, relatedHref, sectionLabel } from "@/lib/news/format";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Source line under every item: source link, statement attribution, single-source flag, related lesson */
export function ItemMeta({ item, onGold = false, fallback = false }: { item: DigestItem; onGold?: boolean; fallback?: boolean }) {
  const { t } = useI18n();
  const href = relatedHref(item.related_slug);
  const chip = onGold ? "bg-[#1A1506]/10 text-[#1A1506]" : "bg-input text-muted";
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] ${onGold ? "text-[#1A1506]/80" : "text-muted"}`}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline ${onGold ? "text-[#1A1506]" : "text-accent"}`}
      >
        {t("news_source")}: {item.source_name || hostOf(item.url)}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">({t("news_open_source")})</span>
      </a>
      {item.kind === "statement" && item.attribution && (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ${chip}`} title={t("news_statement_hint")}>
          <Quote className="h-3 w-3" aria-hidden="true" />
          {t("news_statement_by", { who: item.attribution })}
        </span>
      )}
      {!item.verified && (
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ${onGold ? chip : "bg-[#E8742A]/10 text-[#C25A12] dark:text-[#F0965A]"}`}
          title={t("news_single_source_hint")}
        >
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          {t("news_single_source")}
        </span>
      )}
      {fallback && !item.translated && <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${chip}`}>{t("news_not_translated")}</span>}
      {href && (
        <Link href={href} className={`inline-flex items-center gap-1 font-semibold hover:underline ${onGold ? "text-[#1A1506]" : "text-ink"}`}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {t("news_learn_more")}
        </Link>
      )}
    </div>
  );
}

/** Gold hero for the lead item (mirrors the share card) */
export function LeadBlock({ item, lang, fallback = false }: { item: DigestItem; lang: string; fallback?: boolean }) {
  const { t } = useI18n();
  const long = item.title.length > 34;
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-zec px-5 pb-6 pt-5 text-[#1A1506] sm:px-8 sm:pb-8 sm:pt-7" {...textAttrs(lang)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="text-[13px] font-bold uppercase tracking-[0.08em] opacity-70">{sectionLabel(item.section, lang)}</span>
        {item.badge && (
          <span className="rounded-full border-2 border-[#1A1506] px-3 py-0.5 font-display text-[13px] font-bold tabular-nums">{item.badge}</span>
        )}
      </div>
      <h2
        className={`mt-2 font-display font-extrabold leading-[0.95] tracking-[-0.035em] ${
          long ? "text-[34px] sm:text-[44px]" : "text-[44px] sm:text-[72px]"
        }`}
      >
        {item.title}
      </h2>
      <p className="mt-4 max-w-[62ch] text-[16px] font-semibold leading-snug sm:text-[18px]">{item.summary}</p>
      {item.facts.length > 0 && (
        <dl className="mt-5 grid gap-2.5 sm:grid-cols-3" aria-label={t("news_facts")}>
          {item.facts.map((f, i) => (
            <div key={i} className="rounded-2xl bg-[#1A1506] px-4 py-3.5 text-zec">
              <dt className="sr-only">{f.label}</dt>
              <dd className="font-display text-[26px] font-bold leading-none tracking-[-0.02em]">{f.value}</dd>
              <dd className="mt-1.5 text-[13px] leading-snug text-[#E8DDBF]">{f.label}</dd>
            </div>
          ))}
        </dl>
      )}
      <ItemMeta item={item} onGold fallback={fallback} />
    </article>
  );
}

export function ItemRow({ item, lang, fallback = false }: { item: DigestItem; lang: string; fallback?: boolean }) {
  return (
    <article className="grid gap-1.5 border-t border-line py-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6" {...textAttrs(lang)}>
      <div className="pt-1 text-[13px] font-bold text-accent">{sectionLabel(item.section, lang)}</div>
      <div className="min-w-0">
        <h3 className="font-display text-[21px] font-bold leading-[1.15] tracking-[-0.015em] sm:text-[24px]">{item.title}</h3>
        <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{item.summary}</p>
        <ItemMeta item={item} fallback={fallback} />
      </div>
    </article>
  );
}

/** Language switcher: links to ?lang=… (keeps the page shareable) */
export function LanguageLinks({ digest, hrefFor }: { digest: Digest; hrefFor: (lang: string) => string }) {
  const { t } = useI18n();
  if (digest.languages.length < 2) return null;
  return (
    <nav aria-label={t("news_language")} className="flex flex-wrap items-center gap-1.5">
      <Languages className="mr-0.5 h-4 w-4 text-soft" aria-hidden="true" />
      {digest.languages.map((l) => {
        const active = l.lang === digest.lang;
        const info = findLanguage(l.lang);
        return (
          <Link
            key={l.lang}
            href={hrefFor(l.lang)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            lang={l.lang}
            title={l.translator ? t("news_translated_by", { name: l.translator }) : undefined}
            className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold transition ${
              active ? "bg-ink text-card" : "bg-card text-muted ring-1 ring-line hover:text-ink"
            }`}
          >
            {info?.native ?? l.lang}
          </Link>
        );
      })}
    </nav>
  );
}

/** A whole digest: header, lead, briefs, radar */
export function DigestView({
  digest,
  hrefForLang,
  headingLevel = 1,
  actions,
}: {
  digest: Digest;
  hrefForLang: (lang: string) => string;
  headingLevel?: 1 | 2;
  actions?: React.ReactNode;
}) {
  const { t } = useI18n();
  const lang = digest.lang;
  const lead = leadOf(digest);
  const rest = digest.items.filter((i) => i !== lead);
  const briefs = rest.filter((i) => i.tier !== "watch");
  const watch = rest.filter((i) => i.tier === "watch");
  const H = headingLevel === 1 ? "h1" : "h2";
  const fb = digest.lang !== digest.base_lang;

  return (
    <div>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
          <time dateTime={digest.date} className="font-semibold text-ink">
            {formatDigestDate(digest.date, lang, { weekday: true })}
          </time>
          <span aria-hidden="true">·</span>
          <span>{t("news_last_24h")}</span>
          {digest.status === "draft" && <span className="chip">{t("news_draft_preview")}</span>}
        </div>
        <H className="mt-2 font-display text-[32px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[44px]" {...textAttrs(lang)}>
          {digest.title}
        </H>
        {digest.intro && (
          <p className="mt-3 max-w-[65ch] text-[16px] leading-relaxed text-muted" {...textAttrs(lang)}>
            {digest.intro}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <LanguageLinks digest={digest} hrefFor={hrefForLang} />
          {digest.translator && (
            <span className="text-[12.5px] text-soft">
              {t("news_translated_by", { name: digest.translator.name })}
              {digest.translator.username && (
                <>
                  {" · "}
                  <Link href={`/u/${digest.translator.username}`} className="hover:text-ink hover:underline">
                    @{digest.translator.username}
                  </Link>
                </>
              )}
            </span>
          )}
          {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
        </div>
      </header>

      {lead && <LeadBlock item={lead} lang={lang} fallback={fb} />}

      {briefs.length > 0 && (
        <div className="mt-6">
          {briefs.map((i) => (
            <ItemRow key={i.id} item={i} lang={lang} fallback={fb} />
          ))}
        </div>
      )}

      {watch.length > 0 && (
        <section className="mt-4 rounded-2xl border border-line bg-card p-5">
          <h3 className="font-display text-[16px] font-bold">{t("news_on_radar")}</h3>
          <ul className="mt-2 divide-y divide-line">
            {watch.map((i) => (
              <li key={i.id} className="py-3" {...textAttrs(lang)}>
                <div className="text-[12px] font-bold text-accent">{sectionLabel(i.section, lang)}</div>
                <div className="mt-0.5 font-semibold leading-snug">{i.title}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{i.summary}</p>
                <ItemMeta item={i} fallback={fb} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {digest.sources.length > 0 && (
        <p className="mt-6 border-t border-line pt-4 text-[13px] text-soft">
          {t("news_sources")}: {digest.sources.join(", ")}
        </p>
      )}
    </div>
  );
}

export function DigestSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-4 w-48 animate-pulse rounded bg-input" />
      <div className="mt-3 h-10 w-3/4 animate-pulse rounded-lg bg-input" />
      <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-input" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-5 space-y-2 border-t border-line pt-5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-input" />
          <div className="h-4 w-full animate-pulse rounded bg-input" />
        </div>
      ))}
    </div>
  );
}
