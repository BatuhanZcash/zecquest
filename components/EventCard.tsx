"use client";

import Link from "next/link";
import { CalendarPlus, Gift, Users } from "lucide-react";
import { useCountdownText } from "./game";
import { useI18n } from "@/lib/i18n";
import { siteUrl, SITE } from "@/lib/config";
import type { GameState } from "@/lib/types";

/**
 * Yarışma fikstürü satırı: solda tarih karosu, ortada ad ve bilgi, sağda durum ve eylem.
 */
export function EventRow({ ev, now }: { ev: GameState & { player_count?: number }; now: number }) {
  const { t, lt, lang } = useI18n();
  const loc = lang === "tr" ? "tr-TR" : "en-US";
  const isLive = ["question", "reveal", "leaderboard"].includes(ev.status);
  const isEnded = ev.status === "ended";
  const cd = useCountdownText(ev.starts_at, now);
  const soon = ev.status === "lobby" && !!ev.starts_at && ev.starts_at - now < 1000 * 60 * 15;
  const title = lt(ev.title) || lt(ev.quiz?.title);
  const d = ev.starts_at ? new Date(ev.starts_at) : null;

  return (
    <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
      <div
        className={`flex w-[58px] shrink-0 flex-col items-center rounded-[10px] border py-2 ${
          isLive ? "border-zec bg-zec text-[#1A1506]" : "border-line bg-card"
        }`}
      >
        {d ? (
          <>
            <span className="text-[11px] font-medium leading-none opacity-70">{d.toLocaleDateString(loc, { month: "short" })}</span>
            <span className="mt-1 text-[22px] font-bold leading-none tabular-nums">{d.getDate()}</span>
            <span className="mt-1 text-[11px] font-medium leading-none tabular-nums opacity-70">
              {d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        ) : (
          <span className="text-[12px] font-semibold">{t("live")}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#E5484D]/10 px-1.5 py-0.5 text-[12px] font-semibold text-[#D93036]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E5484D]" />
              {t("live_now")}
            </span>
          )}
          <h3 className="truncate text-[15px] font-semibold">{title}</h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span>{t("questions_n", { n: ev.question_count })}</span>
          {ev.player_count !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {ev.player_count}
            </span>
          )}
          {ev.prize && (
            <span className="inline-flex min-w-0 items-center gap-1 text-accent">
              <Gift className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lt(ev.prize)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {!isLive && !isEnded && cd && (
          <span className="hidden text-right sm:block">
            <span className="block text-[12px] text-muted">{t("starts_in")}</span>
            <span className="block text-[15px] font-semibold tabular-nums">{cd}</span>
          </span>
        )}
        {isEnded ? (
          <Link href={`/results/${ev.id}`} className="btn-ghost px-3 py-2 text-[13px]">
            {t("view_results")}
          </Link>
        ) : (
          <>
            {!isLive && ev.starts_at && (
              <button
                onClick={() => downloadIcs(ev, title)}
                className="btn-ghost hidden px-2.5 py-2 sm:inline-flex"
                aria-label={t("add_calendar")}
                title={t("add_calendar")}
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
            )}
            <Link href={`/play/${ev.code}`} className={`${isLive || soon ? "btn-zec" : "btn-ink"} px-3.5 py-2 text-[13px]`}>
              {isLive ? t("join_now") : t("enter_lobby")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/** Takvim dosyası (.ics) — Google/Apple/Outlook takvimine eklenir */
export function downloadIcs(ev: GameState, title: string) {
  if (!ev.starts_at) return;
  const toIcs = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = ev.starts_at;
  const end = start + Math.max(10, ev.question_count) * 60 * 1000;
  const url = `${siteUrl()}/play/${ev.code}`;
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE.name}//EN`,
    "BEGIN:VEVENT",
    `UID:${ev.id}@${SITE.name.toLowerCase()}`,
    `DTSTAMP:${toIcs(Date.now())}`,
    `DTSTART:${toIcs(start)}`,
    `DTEND:${toIcs(end)}`,
    `SUMMARY:${esc(`${SITE.name}: ${title}`)}`,
    `DESCRIPTION:${esc(url)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${SITE.name.toLowerCase()}-${ev.code}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
