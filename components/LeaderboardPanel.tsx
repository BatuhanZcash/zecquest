"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, Flag as FlagIcon, Users, UsersRound } from "lucide-react";
import { Avatar, Flag, SectionHead } from "./ui";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { countryName } from "@/lib/countries";
import type { GroupRow, LeaderRow } from "@/lib/types";

export type Group = "player" | "country" | "team";
export type Range = "all" | "month" | "week" | "today";

export interface Row {
  key: string;
  name: string;
  sub?: string;
  href?: string;
  country?: string | null;
  score: number;
  extra?: string;
  kind: Group;
}

export function useLeaderboard(group: Group, range: Range, quiz?: string | null, limit = 50) {
  const { lang, t } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<{ rank: number; score: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    (async () => {
      try {
        if (group === "player") {
          const r = await api.leaderboard("player", range, quiz, limit);
          if (!alive) return;
          setMe(r.me);
          setRows(
            r.rows.map((p: LeaderRow) => ({
              key: p.username,
              name: p.display_name || p.username,
              sub: p.team || `@${p.username}`,
              href: `/u/${p.username}`,
              country: p.country,
              score: p.score,
              extra: `${p.games} ${t("games")}`,
              kind: "player",
            }))
          );
        } else {
          const r = await api.groupLeaderboard(group, range, quiz, limit);
          if (!alive) return;
          setMe(null);
          setRows(
            r.rows.map((g: GroupRow) => ({
              key: g.key,
              name: group === "country" ? countryName(g.key, lang) : g.key,
              country: group === "country" ? g.key : null,
              score: g.score,
              extra: t("players_n", { n: g.players }),
              kind: group,
            }))
          );
        }
      } catch {
        if (alive) {
          setRows([]);
          setError(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [group, range, quiz, limit, lang, t]);

  return { rows, me, error };
}

export function RangeSelect({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const { t } = useI18n();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Range)}
      className="cursor-pointer rounded-full border-0 bg-tint py-1 pl-3 pr-8 text-xs font-semibold text-zec-600 outline-none focus:ring-2 focus:ring-zec/40 dark:text-accent"
    >
      <option value="all">{t("all_time")}</option>
      <option value="month">{t("this_month")}</option>
      <option value="week">{t("this_week")}</option>
      <option value="today">{t("today")}</option>
    </select>
  );
}

export function GroupTabs({ value, onChange }: { value: Group; onChange: (g: Group) => void }) {
  const { t } = useI18n();
  const tabs: [Group, string, typeof Users][] = [
    ["player", t("players"), Users],
    ["country", t("countries"), FlagIcon],
    ["team", t("teams"), UsersRound],
  ];
  return (
    <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-input p-1 text-sm font-semibold">
      {tabs.map(([k, label, Icon]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition ${
            value === k ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Ana sayfadaki kompakt liderlik kartı */
export function LeaderboardPanel({ limit = 6 }: { limit?: number }) {
  const { t } = useI18n();
  const [range, setRange] = useState<Range>("all");
  const [group, setGroup] = useState<Group>("player");
  const { rows } = useLeaderboard(group, range, null, limit);

  return (
    <section className="card flex flex-col p-4 sm:p-5">
      <SectionHead icon={<Crown className="h-5 w-5" />} title={t("general_leaderboard")} right={<RangeSelect value={range} onChange={setRange} />} />
      <GroupTabs value={group} onChange={setGroup} />
      {!rows ? (
        <div className="h-48 animate-pulse rounded-xl bg-input" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t("no_scores")}</p>
      ) : (
        <>
          <Podium top={rows.slice(0, 3)} />
          {rows.length > 3 && (
            <ol className="space-y-1.5 border-t border-line pt-3">
              {rows.slice(3, limit).map((r, i) => (
                <RowItem key={r.key} rank={i + 4} r={r} />
              ))}
            </ol>
          )}
        </>
      )}
      <Link href="/leaderboard" className="btn-ghost mt-4 w-full py-2.5 text-sm text-accent">
        {t("view_full_leaderboard")}
      </Link>
    </section>
  );
}

function RowIcon({ r, size, flagOnAvatar = true }: { r: Row; size: number; flagOnAvatar?: boolean }) {
  if (r.kind === "player") return <Avatar name={r.name} size={size} country={flagOnAvatar ? r.country : null} />;
  if (r.kind === "country")
    return (
      <span className="flex items-center justify-center overflow-hidden rounded-full bg-input ring-1 ring-line" style={{ width: size, height: size }}>
        <Flag code={r.country} size={Math.round(size * 0.75)} className="!rounded-none !shadow-none scale-[1.45]" />
      </span>
    );
  return (
    <span className="flex items-center justify-center rounded-full bg-tint text-accent" style={{ width: size, height: size }}>
      <UsersRound style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}

const PODIUM_STYLE: Record<number, { h: string; block: string; num: string; ring: string }> = {
  1: { h: "h-[68px]", block: "bg-gradient-to-b from-zec to-[#E7A50F]", num: "text-[#1A1506]", ring: "ring-[3px] ring-zec" },
  2: { h: "h-[48px]", block: "bg-gradient-to-b from-[#E4E4E7] to-[#C9CACF] dark:from-[#4A4A50] dark:to-[#38383D]", num: "text-[#3F3F46] dark:text-[#E4E4E7]", ring: "ring-2 ring-[#D4D4D8] dark:ring-[#55555b]" },
  3: { h: "h-[36px]", block: "bg-gradient-to-b from-[#EBC9A6] to-[#D6A579] dark:from-[#6B4B33] dark:to-[#563B27]", num: "text-[#6B4320] dark:text-[#F3D3B5]", ring: "ring-2 ring-[#E2B78F] dark:ring-[#7A5539]" },
};

export function Podium({ top }: { top: Row[] }) {
  const { fmt } = useI18n();
  const order = [top[1], top[0], top[2]];
  const ranks = [2, 1, 3];
  return (
    <div className="grid grid-cols-3 items-end gap-2 pt-6">
      {order.map((p, i) => {
        const rank = ranks[i];
        const st = PODIUM_STYLE[rank];
        if (!p) return <div key={i} />;
        return (
          <Wrap key={p.key} href={p.href} className="group flex min-w-0 flex-col items-center text-center">
            <div className="relative">
              {rank === 1 && <Crown className="absolute -top-6 left-1/2 h-5 w-5 -translate-x-1/2 fill-zec text-zec" />}
              <div className={`rounded-full ring-offset-2 ring-offset-card ${st.ring}`}>
                <RowIcon r={p} size={rank === 1 ? 56 : 44} flagOnAvatar={false} />
              </div>
            </div>
            <p className="mt-2.5 flex w-full min-w-0 items-center justify-center gap-1 px-0.5 text-[13px] font-semibold leading-tight">
              {p.kind === "player" && <Flag code={p.country} size={10} />}
              <span className="truncate group-hover:text-accent">{p.name}</span>
            </p>
            <p className="mt-0.5 tabular-nums text-[13px] font-bold text-accent">{fmt(p.score)}</p>
            <div className={`mt-2 flex w-full items-start justify-center rounded-t-[10px] pt-1.5 ${st.h} ${st.block}`}>
              <span className={`text-[18px] font-extrabold leading-none ${st.num}`}>{rank}</span>
            </div>
          </Wrap>
        );
      })}
    </div>
  );
}

export function RowItem({ rank, r, highlight }: { rank: number; r: Row; highlight?: boolean }) {
  const { fmt } = useI18n();
  return (
    <li>
      <Wrap
        href={r.href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${highlight ? "bg-tint ring-1 ring-zec/40" : "bg-input/60 hover:bg-input"}`}
      >
        <span className="w-7 text-center tabular-nums text-sm font-bold text-soft">{rank}</span>
        <RowIcon r={r} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{r.name}</p>
          {r.sub && <p className="truncate text-xs text-soft">{r.sub}</p>}
        </div>
        {r.extra && <span className="hidden text-xs text-soft sm:inline">{r.extra}</span>}
        <span className="tabular-nums text-sm font-bold">{fmt(r.score)}</span>
      </Wrap>
    </li>
  );
}

function Wrap({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
