"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GroupTabs, Podium, RangeSelect, RowItem, useLeaderboard, type Group, type Range, type Row } from "@/components/LeaderboardPanel";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { xpLeaderboard } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { levelTitleKey, useMyProgress } from "@/lib/progress";
import { LevelRing } from "@/components/LevelBadge";

export default function LeaderboardPage() {
  return (
    <Suspense>
      <Leaderboard />
    </Suspense>
  );
}

function Leaderboard() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "xp" ? "xp" : "quiz";

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-5">
        <h1 className="page-title">{t("leaderboard_title")}</h1>
        <p className="text-sm text-muted">{tab === "xp" ? t("home_lb_xp_sub") : t("leaderboard_sub")}</p>
      </div>
      <div role="tablist" aria-label={t("leaderboard_title")} className="mb-4 inline-flex rounded-full bg-input p-1 text-[14px] font-semibold">
        {(["quiz", "xp"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => router.replace(k === "xp" ? "/leaderboard?tab=xp" : "/leaderboard", { scroll: false })}
            className={`rounded-full px-4 py-1.5 transition ${tab === k ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {k === "xp" ? t("home_lb_tab_xp") : t("home_lb_tab_quiz")}
          </button>
        ))}
      </div>
      {tab === "xp" ? <XpTab /> : <QuizTab />}
    </div>
  );
}

function QuizTab() {
  const { t, fmt } = useI18n();
  const { profile } = useAuth();
  const [range, setRange] = useState<Range>("all");
  const [group, setGroup] = useState<Group>("player");
  const { rows, me } = useLeaderboard(group, range, null, 100);

  return (
    <>
      {group === "player" && me && (
        <div className="card mb-4 flex items-center gap-4 p-4">
          <span className="label">{t("your_rank")}</span>
          <span className="tabular-nums text-2xl font-bold text-accent">#{fmt(me.rank)}</span>
          <span className="ml-auto tabular-nums font-bold">
            {fmt(me.score)} {t("points")}
          </span>
        </div>
      )}

      <div className="card p-4 sm:p-6">
        <div className="mb-3 flex justify-end">
          <RangeSelect value={range} onChange={setRange} />
        </div>
        <GroupTabs value={group} onChange={setGroup} />
        {!rows ? (
          <div className="h-64 animate-pulse rounded-xl bg-input" />
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-muted">{t("no_scores")}</p>
        ) : (
          <>
            <Podium top={rows.slice(0, 3)} />
            {rows.length > 3 && (
              <ol className="mt-5 space-y-1.5 border-t border-dashed border-line pt-4">
                {rows.slice(3).map((r, i) => (
                  <RowItem key={r.key} rank={i + 4} r={r} highlight={group === "player" && r.key === profile?.username} />
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </>
  );
}

function XpTab() {
  const { t, fmt } = useI18n();
  const { profile } = useAuth();
  const { progress } = useMyProgress();
  const q = useAsync(() => xpLeaderboard(100), []);
  const rows: Row[] = (q.data ?? []).map((r) => ({
    key: r.username ?? r.id,
    name: r.display_name || r.username || "?",
    sub: `${t("home_level_short", { n: r.level })} · ${t(levelTitleKey(r.level))}`,
    href: r.username ? `/u/${r.username}` : undefined,
    country: r.country,
    score: r.xp,
    kind: "player",
  }));

  return (
    <>
      {progress && (
        <Link href="/me#progress" className="card mb-4 flex items-center gap-4 p-4 transition-colors hover:border-[rgb(var(--soft))]">
          <LevelRing progress={progress} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">{t("home_your_level")}</p>
            <p className="font-display text-[17px] font-bold">{t(levelTitleKey(progress.level))}</p>
          </div>
          <span className="tabular-nums font-bold">{fmt(progress.xp)} XP</span>
        </Link>
      )}
      <div className="card p-4 sm:p-6">
        {q.loading && !q.data ? (
          <div className="h-64 animate-pulse rounded-xl bg-input" />
        ) : q.error ? (
          <p className="py-16 text-center text-muted">{t("err_generic")}</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-muted">{t("home_xp_board_empty")}</p>
        ) : (
          <>
            <Podium top={rows.slice(0, 3)} />
            {rows.length > 3 && (
              <ol className="mt-5 space-y-1.5 border-t border-dashed border-line pt-4">
                {rows.slice(3).map((r, i) => (
                  <RowItem key={r.key} rank={i + 4} r={r} highlight={r.key === profile?.username} />
                ))}
              </ol>
            )}
          </>
        )}
        <p className="mt-5 text-[12.5px] leading-relaxed text-soft">{t("home_lb_xp_note")}</p>
      </div>
    </>
  );
}
