"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy, Download, Link2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { awardXp } from "@/lib/api";
import { SITE } from "@/lib/config";
import { useAsync } from "@/lib/useAsync";
import { newsApi, type Digest } from "@/lib/api-news";
import { buildPostText, xLength } from "@/lib/news/format";
import { textAttrs } from "@/lib/languages";

export const siteOrigin = () => SITE.publicUrl || (typeof window !== "undefined" ? window.location.origin : "https://zeclearn.com");

export const digestPath = (date: string, lang?: string | null) => `/news/${date}${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`;
export const cardPath = (date: string, lang?: string | null) => `/news/${date}/card${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`;

/** Award "news_read" XP once per digest date for signed-in readers. Returns the amount just awarded (0 if already). */
export function useNewsReadXp(date: string | null | undefined, published: boolean) {
  const { session } = useAuth();
  const [awarded, setAwarded] = useState(0);
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!date || !published || !session || done.current === date) return;
    done.current = date;
    awardXp("news_read", date)
      .then((r) => setAwarded(r.awarded ?? 0))
      .catch(() => {});
  }, [date, published, session]);
  return awarded;
}

export function XpToast({ amount }: { amount: number }) {
  const { t } = useI18n();
  if (!amount) return null;
  return (
    <div role="status" className="inline-flex animate-pop items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-[12.5px] font-semibold text-accent">
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {t("news_xp_awarded", { n: amount })}
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };
  return { copied, copy };
}

/** Download card + copy post text + copy link */
export function ShareActions({ digest, showPost = true }: { digest: Digest; showPost?: boolean }) {
  const { t } = useI18n();
  const { copied, copy } = useCopy();
  const url = siteOrigin() + digestPath(digest.date, digest.lang !== digest.base_lang ? digest.lang : null);
  return (
    <>
      <a href={cardPath(digest.date, digest.lang)} download={`zeclearn-news-${digest.date}-${digest.lang}.png`} className="btn-ghost px-3.5 py-2 text-[13px]">
        <Download className="h-4 w-4" aria-hidden="true" />
        {t("news_download_card")}
      </a>
      {showPost && (
        <button onClick={() => copy("post", buildPostText(digest, url))} className="btn-ghost px-3.5 py-2 text-[13px]">
          {copied === "post" ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied === "post" ? t("news_copied") : t("news_copy_post")}
        </button>
      )}
      <button onClick={() => copy("link", url)} className="btn-ghost px-3.5 py-2 text-[13px]" aria-label={t("news_copy_link")}>
        {copied === "link" ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        <span className="hidden sm:inline">{copied === "link" ? t("news_copied") : t("news_copy_link")}</span>
      </button>
    </>
  );
}

/** Editor panel: card preview + post text with live X character count */
export function SharePanel({ digest }: { digest: Digest }) {
  const { t } = useI18n();
  const { copied, copy } = useCopy();
  const url = siteOrigin() + digestPath(digest.date, digest.lang !== digest.base_lang ? digest.lang : null);
  const [text, setText] = useState(() => buildPostText(digest, url));
  useEffect(() => setText(buildPostText(digest, url)), [digest, url]);
  const n = xLength(text);
  return (
    <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${cardPath(digest.date, digest.lang)}${digest.lang ? "&" : "?"}v=${encodeURIComponent(digest.updated_at)}`}
        alt={t("news_card_preview")}
        width={1080}
        height={1350}
        className="aspect-[4/5] w-full rounded-xl border border-line bg-input object-cover"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="input min-h-[150px] resize-y text-[14px] leading-relaxed" {...textAttrs(digest.lang)} />
        <div className={`text-[12px] tabular-nums ${n > 280 ? "font-semibold text-[#E8742A]" : "text-soft"}`}>{t("news_post_chars", { n })}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => copy("post", text)} className="btn-ink px-4 py-2 text-[13px]">
            {copied === "post" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied === "post" ? t("news_copied") : t("news_copy_post")}
          </button>
          <a href={cardPath(digest.date, digest.lang)} download={`zeclearn-news-${digest.date}-${digest.lang}.png`} className="btn-ghost px-4 py-2 text-[13px]">
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("news_download_card")}
          </a>
        </div>
      </div>
    </div>
  );
}

/** Archive of published digests */
export function ArchiveList({ lang, exclude, limit = 14 }: { lang: string; exclude?: string; limit?: number }) {
  const { t } = useI18n();
  const q = useAsync(() => newsApi.list({ limit: limit + 1, lang }), [lang, limit]);
  const rows = (q.data ?? []).filter((r) => r.date !== exclude).slice(0, limit);
  return (
    <section className="card overflow-hidden" aria-labelledby="archive-title">
      <h2 id="archive-title" className="border-b border-line px-5 py-3.5 font-display text-[16px] font-bold tracking-[-0.01em]">
        {t("news_archive")}
      </h2>
      {q.loading && !q.data ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-input" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-5 text-[14px] text-muted">{t("news_archive_empty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.date}>
              <Link href={digestPath(r.date, r.lang !== "en" ? r.lang : null)} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-input/60">
                <time dateTime={r.date} className="w-[52px] shrink-0 text-center">
                  <span className="block font-display text-[20px] font-extrabold leading-none tabular-nums">{r.date.slice(8, 10)}</span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-soft">
                    {new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" }).format(new Date(`${r.date}T12:00:00Z`))}
                  </span>
                </time>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14px] font-semibold leading-snug" {...textAttrs(r.lang)}>
                    {r.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-soft">{t("news_items_n", { n: r.item_count })}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-soft transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TranslationStatus({ status }: { status: "pending" | "approved" | "rejected" }) {
  const { t } = useI18n();
  const cls =
    status === "approved"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : status === "rejected"
        ? "bg-[#E8742A]/15 text-[#E8742A]"
        : "bg-zec/15 text-accent";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{t(`news_status_${status}`)}</span>;
}
