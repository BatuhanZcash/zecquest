"use client";

import { supabase } from "./supabase";
import { ApiError } from "./api";
import type { LocalText } from "./types";

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(error.message || "unknown_error");
  return data as T;
}

/* ---------- Zeki ---------- */
export interface LevelProgress {
  level: number;
  best_score: number;
  best_time_ms: number | null;
  coins: number;
  /** bitmask: 1 finished, 2 all coins, 4 no hits */
  stars: number;
  runs: number;
}
export interface SubmitResult extends LevelProgress {
  new_best: boolean;
  new_best_time: boolean;
  rank: number | null;
  xp_awarded: number;
}
export interface BoardRow {
  rank: number;
  username: string;
  display_name: string | null;
  country: string | null;
  score: number;
  time_ms: number;
  coins: number;
}
export type Period = "week" | "all";

/* ---------- Arena ---------- */
export type League = "bronze" | "silver" | "gold" | "shielded";
export const LEAGUES: { id: League; min: number }[] = [
  { id: "bronze", min: 0 },
  { id: "silver", min: 1100 },
  { id: "gold", min: 1300 },
  { id: "shielded", min: 1500 },
];
export function leagueOf(rating: number): League {
  let l: League = "bronze";
  for (const x of LEAGUES) if (rating >= x.min) l = x.id;
  return l;
}
export function nextLeague(rating: number): { id: League; min: number } | null {
  return LEAGUES.find((x) => x.min > rating) ?? null;
}

export interface MyArena {
  rating: number;
  league: League;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  best_streak: number;
  weekly_points: number;
  weekly_rank: number | null;
  rank: number | null;
  active_match: string | null;
  is_guest: boolean;
}
export type FindResult =
  | { status: "matched"; match_id: string; bot: boolean }
  | { status: "waiting"; waited_ms: number; bot_after_ms: number; lang: string };

export interface ArenaSide {
  name: string;
  username: string | null;
  country: string | null;
  rating: number;
  score: number;
  n_correct: number;
}
export interface ArenaQuestion {
  index: number;
  text: LocalText;
  options: LocalText[];
  time_limit: number;
}
export interface ArenaResultQuestion {
  index: number;
  text: LocalText;
  options: LocalText[];
  correct: number;
  explanation: LocalText | null;
  quiz_slug: string | null;
  my_choice: number | null;
  my_correct: boolean;
}
export interface ArenaState {
  id: string;
  status: "intro" | "question" | "reveal" | "ended";
  lang: string;
  current_q: number;
  q_count: number;
  phase_started_at: number;
  phase_ends_at: number | null;
  server_now: number;
  version: number;
  me: ArenaSide & { slot: 1 | 2 };
  opp: ArenaSide & { bot: boolean };
  pips: { me: boolean | null; opp: boolean | null }[];
  question: ArenaQuestion | null;
  answered: boolean;
  my_choice: number | null;
  opp_answered: boolean;
  reveal: {
    q_index: number;
    correct: number;
    explanation: LocalText | null;
    my_choice: number | null;
    my_correct: boolean;
    my_points: number;
    my_ms: number | null;
    opp_choice: number | null;
    opp_correct: boolean;
    opp_points: number;
  } | null;
  result: {
    outcome: 1 | 0 | -1;
    delta: number;
    rating: number;
    league: League;
    badges: string[];
    xp: number;
    streak: number;
    best_streak: number;
    avg_ms: number | null;
    questions: ArenaResultQuestion[];
  } | null;
  winner: number | null;
}
export interface ArenaBoardRow {
  rank: number;
  username: string;
  display_name: string | null;
  country: string | null;
  value: number;
  wins: number;
  matches: number;
  league: League;
}

export const gamesApi = {
  submitScore: (p: { level: number; score: number; timeMs: number; coins: number; noHit: boolean }) =>
    call<SubmitResult>("submit_game_score", {
      p_game: "zeki",
      p_level: p.level,
      p_score: p.score,
      p_time_ms: p.timeMs,
      p_coins: p.coins,
      p_no_hit: p.noHit,
    }),
  myProgress: () => call<LevelProgress[]>("my_game_progress", { p_game: "zeki" }),
  leaderboard: (level: number, period: Period, limit = 10) =>
    call<{ rows: BoardRow[]; me: { rank: number; score: number; time_ms: number } | null }>("game_leaderboard", {
      p_game: "zeki",
      p_level: level,
      p_period: period,
      p_limit: limit,
    }),

  arenaFind: (lang: string) => call<FindResult>("arena_find", { p_lang: lang }),
  arenaCancel: () => call<void>("arena_cancel"),
  arenaState: (id: string) => call<ArenaState>("arena_state", { p_match: id }),
  arenaAnswer: (id: string, q: number, choice: number) =>
    call<{ accepted: boolean; reason?: string }>("arena_answer", { p_match: id, p_q: q, p_choice: choice }),
  myArena: () => call<MyArena>("my_arena"),
  arenaOnline: () => call<number>("arena_online"),
  arenaLeaderboard: (period: Period, limit = 10) =>
    call<{ rows: ArenaBoardRow[]; me: { rank: number; value: number } | null }>("arena_leaderboard", {
      p_period: period,
      p_limit: limit,
    }),
};

/* ---------- Local progress (works offline and for signed-out players) ---------- */
const LS_KEY = "zq-zeki-progress";
export function loadLocalProgress(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<number, LevelProgress>) : {};
  } catch {
    return {};
  }
}
export function saveLocalRun(level: number, r: { score: number; timeMs: number; coins: number; stars: number }) {
  const all = loadLocalProgress();
  const cur = all[level];
  all[level] = {
    level,
    best_score: Math.max(cur?.best_score ?? 0, r.score),
    best_time_ms: cur?.best_time_ms ? Math.min(cur.best_time_ms, r.timeMs) : r.timeMs,
    coins: Math.max(cur?.coins ?? 0, r.coins),
    stars: (cur?.stars ?? 0) | r.stars,
    runs: (cur?.runs ?? 0) + 1,
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota: ignore */
  }
  return { prev: cur, next: all[level] };
}
/** Merge server + local (best of both) */
export function mergeProgress(a: Record<number, LevelProgress>, b: LevelProgress[]): Record<number, LevelProgress> {
  const out: Record<number, LevelProgress> = { ...a };
  for (const r of b) {
    const c = out[r.level];
    out[r.level] = c
      ? {
          level: r.level,
          best_score: Math.max(c.best_score, r.best_score),
          best_time_ms: c.best_time_ms && r.best_time_ms ? Math.min(c.best_time_ms, r.best_time_ms) : c.best_time_ms ?? r.best_time_ms,
          coins: Math.max(c.coins, r.coins),
          stars: c.stars | r.stars,
          runs: Math.max(c.runs, r.runs),
        }
      : r;
  }
  return out;
}
export const starCount = (bits: number) => (bits & 1 ? 1 : 0) + (bits & 2 ? 1 : 0) + (bits & 4 ? 1 : 0);
export const fmtTime = (ms: number | null | undefined) => {
  if (ms == null) return "–";
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}` : `${s.toFixed(1)}s`;
};
