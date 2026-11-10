"use client";

import Link from "next/link";
import { Globe2, MapPin, Users, Video } from "lucide-react";
import { Flag } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { countryName } from "@/lib/countries";
import { findLanguage } from "@/lib/languages";
import type { CommunityCard, MeetupCard } from "@/lib/api-community";

const locale = (lang: string) => (lang === "tr" ? "tr-TR" : "en-GB");

/** Buluşma saatini kendi saat diliminde biçimlendirir; dil geçersizse tarayıcı saatine düşer */
export function fmtInZone(iso: string, tz: string, lang: string, opts: Intl.DateTimeFormatOptions) {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: tz }).format(d);
  } catch {
    return new Intl.DateTimeFormat(locale(lang), opts).format(d);
  }
}

export function meetupWhen(m: Pick<MeetupCard, "starts_at" | "ends_at" | "timezone">, lang: string) {
  const day = fmtInZone(m.starts_at, m.timezone, lang, { weekday: "short", day: "numeric", month: "short" });
  const start = fmtInZone(m.starts_at, m.timezone, lang, { hour: "2-digit", minute: "2-digit" });
  const end = m.ends_at ? fmtInZone(m.ends_at, m.timezone, lang, { hour: "2-digit", minute: "2-digit" }) : null;
  return { day, time: end ? `${start}–${end}` : start };
}

/** Saat dilimi kısa adı (ör. GMT+3) — kullanıcı farklı bir dilimdeyse gösterilir */
export function zoneLabel(tz: string, iso: string, lang: string) {
  try {
    const parts = new Intl.DateTimeFormat(locale(lang), { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(iso));
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

export function viewerZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Takvim yaprağı: ay + gün, buluşmanın kendi saat diliminde */
export function DateLeaf({ iso, tz, size = "md" }: { iso: string; tz: string; size?: "md" | "lg" }) {
  const { lang } = useI18n();
  const month = fmtInZone(iso, tz, lang, { month: "short" }).replace(".", "");
  const day = fmtInZone(iso, tz, lang, { day: "numeric" });
  const big = size === "lg";
  return (
    <span
      className={`flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-line bg-card text-center ${
        big ? "h-[76px] w-[68px]" : "h-[58px] w-[52px]"
      }`}
      aria-hidden
    >
      <span className={`w-full bg-zec font-semibold text-[#14161B] ${big ? "py-1 text-[12px]" : "py-0.5 text-[11px]"}`}>{month}</span>
      <span className={`flex flex-1 items-center font-display font-extrabold tabular-nums leading-none ${big ? "text-[28px]" : "text-[21px]"}`}>{day}</span>
    </span>
  );
}

export function LangTag({ code }: { code: string }) {
  const l = findLanguage(code);
  return (
    <span lang={l?.code} className="inline-flex items-center rounded-md bg-input px-1.5 py-0.5 text-[12px] font-semibold text-muted">
      {l?.native ?? code}
    </span>
  );
}

/** Buluşma satırı (liste/takvim) */
export function MeetupRow({ m, showCommunity = true }: { m: MeetupCard; showCommunity?: boolean }) {
  const { t, lang } = useI18n();
  const w = meetupWhen(m, lang);
  const place = m.online && !m.city ? t("community_online") : [m.city, m.country ? countryName(m.country, lang) : null].filter(Boolean).join(", ");
  return (
    <Link
      href={`/community/meetups/${m.id}`}
      className="group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-input/70 focus-visible:bg-input/70 sm:px-4"
    >
      <DateLeaf iso={m.starts_at} tz={m.timezone} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-muted">
          {w.day} · {w.time}
        </p>
        <h3 dir="auto" className="truncate font-display text-[16.5px] font-bold leading-snug tracking-[-0.01em] group-hover:text-accent">
          {m.title}
        </h3>
        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex min-w-0 items-center gap-1">
            {m.online && !m.city ? <Video className="h-3.5 w-3.5 shrink-0" /> : m.country ? <Flag code={m.country} size={11} /> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{place}</span>
          </span>
          {showCommunity && <span className="truncate">{m.community.name}</span>}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        {m.language && <LangTag code={m.language} />}
        <span className={`inline-flex items-center gap-1 text-[12.5px] tabular-nums ${m.me_going ? "font-semibold text-accent" : "text-soft"}`}>
          <Users className="h-3.5 w-3.5" />
          {m.me_going ? t("community_you_going_n", { n: m.going_count }) : t("community_going_n", { n: m.going_count })}
        </span>
      </div>
    </Link>
  );
}

export function MeetupRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-3 py-3 sm:px-4">
      <div className="h-[58px] w-[52px] animate-pulse rounded-xl bg-input" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/4 animate-pulse rounded bg-input" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-input" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-input" />
      </div>
    </div>
  );
}

/** Topluluk kartı */
export function CommunityTile({ c }: { c: CommunityCard }) {
  const { t, lt, lang } = useI18n();
  const desc = lt(c.description);
  return (
    <Link
      href={`/community/${c.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-card p-4 transition-colors hover:border-[rgb(var(--soft))]"
    >
      <div className="flex items-center gap-3">
        <CommunityMark c={c} />
        <div className="min-w-0">
          <h3 dir="auto" className="truncate font-display text-[16px] font-bold leading-tight group-hover:text-accent">
            {c.name}
          </h3>
          <p className="truncate text-[13px] text-muted">
            {c.country ? [c.city, countryName(c.country, lang)].filter(Boolean).join(", ") : t("community_global")}
          </p>
        </div>
      </div>
      {desc && (
        <p dir="auto" className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
          {desc}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {c.languages.slice(0, 4).map((l) => (
          <LangTag key={l} code={l} />
        ))}
        <span className="ml-auto text-[12.5px] font-medium tabular-nums text-soft">
          {c.upcoming_count > 0 ? t("community_upcoming_n", { n: c.upcoming_count }) : t("community_no_upcoming_short")}
        </span>
      </div>
    </Link>
  );
}

/** Topluluğun simgesi: bayrak ya da küre, altın zemin üzerinde */
export function CommunityMark({ c, size = 44 }: { c: Pick<CommunityCard, "country" | "name">; size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-tint text-accent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {c.country ? (
        <Flag code={c.country} size={Math.round(size * 0.42)} className="!shadow-none" />
      ) : (
        <Globe2 style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </span>
  );
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-accent">{icon}</span>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-sm text-[14px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
