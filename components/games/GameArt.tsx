"use client";

import type { League } from "@/lib/api-games";

const LEAGUE_STYLE: Record<League, { from: string; to: string; ink: string; ring: string }> = {
  bronze: { from: "#E3A473", to: "#9A5B32", ink: "#3B1E0C", ring: "#F2C3A0" },
  silver: { from: "#E6E9EF", to: "#9AA3B2", ink: "#2A2F38", ring: "#FFFFFF" },
  gold: { from: "#FAD877", to: "#D29A12", ink: "#3D2A07", ring: "#FFF1C2" },
  shielded: { from: "#9FE4FF", to: "#3F7FCB", ink: "#0B2140", ring: "#D8F4FF" },
};

/** League emblem: a faceted shield in the league's metal */
export function LeagueEmblem({ league, size = 72, className = "" }: { league: League; size?: number; className?: string }) {
  const s = LEAGUE_STYLE[league];
  const id = `lg-${league}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={s.from} />
          <stop offset="1" stopColor={s.to} />
        </linearGradient>
      </defs>
      <path d="M32 3 L56 13 L54 37 Q50 52 32 61 Q14 52 10 37 L8 13 Z" fill={`url(#${id})`} />
      <path d="M32 3 L56 13 L54 37 Q50 52 32 61 Z" fill="#000" opacity="0.12" />
      <path d="M32 9 L50 16.5 L48.5 36 Q45.5 47.5 32 54.5 Q18.5 47.5 15.5 36 L14 16.5 Z" fill="none" stroke={s.ring} strokeOpacity="0.6" strokeWidth="1.5" />
      {league === "shielded" ? (
        <path d="M24 22 H40 L24 42 H40 M32 18 V22 M32 42 V46" stroke={s.ink} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ) : (
        <g fill="none" stroke={s.ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {Array.from({ length: league === "bronze" ? 1 : league === "silver" ? 2 : 3 }).map((_, i, a) => {
            const y = 32 - (a.length - 1) * 4.5 + i * 9 - 4;
            return <path key={i} d={`M22 ${y} L32 ${y + 8} L42 ${y}`} />;
          })}
        </g>
      )}
    </svg>
  );
}
