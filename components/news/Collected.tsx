"use client";

import { useState } from "react";
import { ChevronDown, EyeOff, MessageSquareQuote, Plus, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import type { CollectedRow } from "@/lib/api-news";

export const TIER_STYLE: Record<string, string> = {
  lead: "bg-zec text-[#1A1506]",
  brief: "bg-ink text-card",
  watch: "bg-input text-muted",
};

const SOURCE_LABEL: Record<string, string> = { forum: "Forum", github: "GitHub", network: "Network" };

function when(iso: string | null, lang: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso)) + " UTC";
}

/** One collected item: tier, score + breakdown, unverified flag, add / dismiss */
export function CollectedCard({
  row,
  added,
  onAdd,
  onDismiss,
}: {
  row: CollectedRow;
  added: boolean;
  onAdd: () => void;
  onDismiss: (dismissed: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <article className={`rounded-2xl border bg-card p-4 ${row.single_source ? "border-[#E8742A]/40" : "border-line"} ${row.dismissed ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold">
        <span className={`rounded-md px-1.5 py-0.5 ${TIER_STYLE[row.tier]}`}>{t(`news_tier_${row.tier}` as DictKey)}</span>
        <span className="rounded-md bg-input px-1.5 py-0.5 text-muted">{SOURCE_LABEL[row.source] ?? row.source}</span>
        {row.author_is_official ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {t("news_official")}
          </span>
        ) : row.author_is_key ? (
          <span className="rounded-md bg-tint px-1.5 py-0.5 text-accent">{t("news_key_person")}</span>
        ) : null}
        {row.kind === "statement" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-input px-1.5 py-0.5 text-muted">
            <MessageSquareQuote className="h-3 w-3" aria-hidden="true" />
            {t("news_statement")}
          </span>
        )}
        {row.single_source && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#E8742A]/12 px-1.5 py-0.5 text-[#C25A12] dark:text-[#F0965A]" title={t("news_unverified_hint")}>
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            {t("news_unverified")}
          </span>
        )}
        <span className="ml-auto font-display text-[15px] font-extrabold tabular-nums text-ink" title={t("news_score")}>
          {row.score}
        </span>
      </div>
      <a href={row.url} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold leading-snug hover:underline" dir="auto">
        {row.title}
      </a>
      <div className="mt-1 text-[12px] text-soft">
        {[row.metrics.attribution || row.author, row.category, when(row.last_activity_at ?? row.source_created_at, lang)].filter(Boolean).join(" · ")}
      </div>
      {row.excerpt && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted" dir="auto">
          {row.excerpt}
        </p>
      )}
      {row.single_source && <p className="mt-2 text-[12px] leading-snug text-[#C25A12] dark:text-[#F0965A]">{t("news_unverified_hint")}</p>}

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        {t("news_score_breakdown")}
      </button>
      {open && (
        <table className="mt-2 w-full text-[12.5px]">
          <tbody>
            {row.score_breakdown.map((p, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-1 pr-2 text-muted">
                  {t(`news_sp_${p.key}` as DictKey)}
                  {p.detail && <span className="text-soft"> · {p.detail}</span>}
                </td>
                <td className="py-1 text-right font-semibold tabular-nums">{p.points > 0 ? `+${p.points}` : p.points}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-bold">
              <td className="py-1">{t("news_score")}</td>
              <td className="py-1 text-right tabular-nums">{row.score}</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={onAdd} disabled={added} className="btn-ink px-3 py-1.5 text-[12.5px]">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {added ? t("news_added") : t("news_add_to_digest")}
        </button>
        <button onClick={() => onDismiss(!row.dismissed)} className="btn-ghost px-3 py-1.5 text-[12.5px]">
          {row.dismissed ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
          {row.dismissed ? t("news_restore") : t("news_dismiss")}
        </button>
      </div>
    </article>
  );
}
