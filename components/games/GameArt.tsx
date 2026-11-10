"use client";

import { useEffect, useRef } from "react";
import { Sim } from "./zeki/sim";
import { LEVELS } from "./zeki/levels";
import { Renderer } from "./zeki/render";
import type { League } from "@/lib/api-games";

/** Zeki, the gold robot (SVG version of the in-game sprite) */
export function ZekiMascot({ size = 96, shielded = false, className = "" }: { size?: number; shielded?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      {shielded && (
        <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="rgba(127,211,255,0.14)" stroke="#7FD3FF" strokeWidth="2" />
      )}
      <rect x="31" y="9" width="2.4" height="9" fill="#F4B728" />
      <circle cx="32.2" cy="8.5" r="4" fill="#F4B728" />
      <circle cx="32.2" cy="8.5" r="1.8" fill={shielded ? "#7FD3FF" : "#FFE08A"} />
      <rect x="18" y="17" width="28" height="27" rx="10" fill="#F4B728" />
      <rect x="21" y="19.5" width="12" height="3" rx="1.5" fill="#fff" opacity="0.35" />
      <rect x="25" y="23" width="18" height="11" rx="5" fill="#14161B" />
      <rect x="30" y="26" width="3.4" height="5" rx="1" fill="#7FD3FF" />
      <rect x="36.5" y="26" width="3.4" height="5" rx="1" fill="#7FD3FF" />
      <rect x="15" y="29" width="4.5" height="8" rx="2" fill="#C1860B" />
      <rect x="25" y="39.5" width="14" height="2.2" rx="1" fill="#C1860B" />
      <rect x="21" y="44" width="7" height="7" rx="2" fill="#C1860B" />
      <rect x="36" y="44" width="7" height="7" rx="2" fill="#C1860B" />
    </svg>
  );
}

/** A real frame of the level, drawn by the game renderer */
export function LevelPreview({ level, className = "" }: { level: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const r = c.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext("2d", { alpha: false });
      if (!ctx) return;
      const sim = new Sim(LEVELS[level - 1]);
      // show a lively moment: a few frames in so drones and trackers have moved
      for (let i = 0; i < 40; i++) sim.step({ left: false, right: i > 10, jump: i > 20 && i < 34 });
      sim.events = [];
      const rd = new Renderer(ctx, sim, { gate: "", fake: "" }, true);
      rd.resize(r.width, r.height, dpr, 0);
      rd.draw(1, 16);
      rd.draw(1, 16);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [level]);
  return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}

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
