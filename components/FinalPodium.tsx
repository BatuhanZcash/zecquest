"use client";

import { Crown } from "lucide-react";
import { Avatar } from "./ui";
import { useI18n } from "@/lib/i18n";
import type { BoardRow } from "@/lib/types";

export function FinalPodium({ rows }: { rows: BoardRow[] }) {
  const { t, fmt } = useI18n();
  const order = [rows[1], rows[0], rows[2]];
  const heights = ["h-36", "h-52", "h-28"];
  const ranks = [2, 1, 3];
  return (
    <div className="flex flex-1 flex-col items-center">
      <h1 className="mb-10 text-4xl font-bold sm:text-5xl">{t("podium")}</h1>
      <div className="grid w-full max-w-3xl grid-cols-3 items-end gap-3 sm:gap-6">
        {order.map((p, i) =>
          p ? (
            <div key={p.user_id} className="flex animate-rise flex-col items-center" style={{ animationDelay: `${(2 - i) * 250}ms` }}>
              {ranks[i] === 1 && <Crown className="mb-2 h-10 w-10 fill-zec text-accent" />}
              <div className={ranks[i] === 1 ? "rounded-full ring-4 ring-zec ring-offset-4 ring-offset-app" : ""}>
                <Avatar name={p.name} size={ranks[i] === 1 ? 88 : 68} country={p.country} />
              </div>
              <p className="mt-3 w-full truncate text-center text-lg font-bold sm:text-2xl">{p.name}</p>
              {p.team && <p className="w-full truncate text-center text-sm text-muted">{p.team}</p>}
              <p className="tabular-nums text-xl font-bold text-accent">{fmt(p.score)}</p>
              <div className={`mt-3 flex w-full items-start justify-center rounded-t-2xl pt-3 tabular-nums text-4xl font-bold ${heights[i]} ${ranks[i] === 1 ? "bg-zec text-[#1A1506]" : "bg-elevated text-ink ring-1 ring-line"}`}>
                {ranks[i]}
              </div>
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>
      {rows.length > 3 && (
        <ol className="mt-8 w-full max-w-3xl space-y-2">
          {rows.slice(3, 10).map((p) => (
            <li key={p.user_id} className="card flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 tabular-nums font-bold text-soft">{p.rank}</span>
              <Avatar name={p.name} size={30} country={p.country} />
              <span className="flex-1 truncate font-semibold">{p.name}</span>
              <span className="tabular-nums font-bold">{fmt(p.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
