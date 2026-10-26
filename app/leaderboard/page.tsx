"use client";

import { useState } from "react";
import { GroupTabs, Podium, RangeSelect, RowItem, useLeaderboard, type Group, type Range } from "@/components/LeaderboardPanel";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function LeaderboardPage() {
  const { t, fmt } = useI18n();
  const { profile } = useAuth();
  const [range, setRange] = useState<Range>("all");
  const [group, setGroup] = useState<Group>("player");
  const { rows, me } = useLeaderboard(group, range, null, 100);

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("leaderboard_title")}</h1>
          <p className="text-sm text-muted">{t("leaderboard_sub")}</p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

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
    </div>
  );
}
