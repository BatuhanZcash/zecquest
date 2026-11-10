/**
 * Gündem formatting helpers shared by pages, the share card (edge) and tests. No React, no browser APIs.
 */
import { newsDict } from "../i18n-extra/news";
import type { Digest, DigestItem } from "./types";

type DictKey = keyof typeof newsDict;

/** UI string in a digest language: tr → Turkish, anything else → English */
export function newsText(key: DictKey, lang: string, vars?: Record<string, string | number>): string {
  let s: string = newsDict[key][lang === "tr" || lang.startsWith("tr-") ? "tr" : "en"];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function sectionLabel(section: string, lang: string): string {
  const key = `news_sec_${section}` as DictKey;
  return key in newsDict ? newsText(key, lang) : section.charAt(0).toUpperCase() + section.slice(1);
}

/** "5 November 2026" / "5 Kasım 2026" for a YYYY-MM-DD digest date (UTC, no timezone drift) */
export function formatDigestDate(date: string, lang: string, opts: { weekday?: boolean; short?: boolean } = {}): string {
  const d = new Date(`${date}T12:00:00Z`);
  try {
    return new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: opts.short ? "short" : "long",
      year: "numeric",
      weekday: opts.weekday ? "long" : undefined,
      timeZone: "UTC",
    }).format(d);
  } catch {
    return date;
  }
}

export function formatNumber(n: number, lang: string, digits = 0): string {
  try {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}

/** Compact ZEC amount: 4,512,345.6 → "4.51M" */
export function formatZec(n: number, lang: string): string {
  try {
    return new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

export function signed(n: number, lang: string, digits = 2): string {
  const s = formatNumber(Math.abs(n), lang, digits);
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

/**
 * Related learning link for a free-text slug the editor fills:
 *   "track/lesson" → /learn/track/lesson   ·   "term" → /glossary/term
 */
export function relatedHref(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const s = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(s)) return null;
  if (s.startsWith("learn/") || s.startsWith("glossary/")) return `/${s}`;
  return s.includes("/") ? `/learn/${s}` : `/glossary/${s}`;
}

/** The lead item (tier = lead, else the first one) */
export function leadOf(d: Pick<Digest, "items">): DigestItem | null {
  return d.items.find((i) => i.tier === "lead") ?? d.items[0] ?? null;
}

/** Characters X counts: every URL is 23, everything else per code point */
export function xLength(text: string): number {
  return [...text.replace(/https?:\/\/\S+/g, "x".repeat(23))].length;
}

/**
 * X post text from the lead item, ≤ 280 (X counting). Statements keep their attribution.
 *   {Digest name} · {date}
 *
 *   {lead title}: {summary…}
 *
 *   {url}
 */
export function buildPostText(d: Pick<Digest, "date" | "lang" | "items">, digestUrl: string): string {
  const lead = leadOf(d);
  const head = `${newsText("news_title", d.lang)} · ${formatDigestDate(d.date, d.lang)}`;
  if (!lead) return `${head}\n\n${digestUrl}`;
  const who = lead.kind === "statement" && lead.attribution ? ` (${newsText("news_statement_by", d.lang, { who: lead.attribution })})` : "";
  const build = (summary: string) => `${head}\n\n${lead.title}${who}${summary ? `: ${summary}` : ""}\n\n${digestUrl}`;
  let summary = lead.summary.replace(/\s+/g, " ").trim();
  if (xLength(build(summary)) <= 280) return build(summary);
  // cut the summary at a word boundary until it fits
  const words = summary.split(" ");
  while (words.length && xLength(build(words.join(" ") + "…")) > 280) words.pop();
  summary = words.length ? words.join(" ").replace(/[,;:.\-–—]+$/, "") + "…" : "";
  const out = build(summary);
  return xLength(out) <= 280 ? out : `${lead.title.slice(0, 200)}\n\n${digestUrl}`;
}
