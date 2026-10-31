"use client";

import { supabase } from "./supabase";
import type {
  EditableQuiz,
  EventLists,
  GameState,
  GroupRow,
  HostView,
  LeaderRow,
  MyStatus,
  PrizeClaim,
  Profile,
  PublicProfile,
  QuizCardData,
  QuizDetail,
} from "./types";

/** Sunucunun döndürdüğü hata kodu (ör. "kicked", "game_not_found") */
export class ApiError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(error.message || "unknown_error");
  return data as T;
}

/* ---------- Profil ---------- */
export const api = {
  myProfile: () => call<Profile | null>("get_my_profile"),
  guestStart: (name: string) => call<Profile>("guest_start", { p_name: name }),
  updateProfile: (p: Partial<Pick<Profile, "username" | "display_name" | "country" | "team" | "zcash_address">>) =>
    call<Profile>("update_my_profile", { p }),
  usernameAvailable: (u: string) => call<boolean>("is_username_available", { p_username: u }),
  requestCreator: (note: string) => call<Profile>("request_creator", { p_note: note }),
  publicProfile: (u: string) => call<PublicProfile | null>("get_public_profile", { p_username: u }),

  /* ---------- Quiz ---------- */
  listQuizzes: (o: { search?: string; tag?: string; sort?: string; limit?: number; offset?: number } = {}) =>
    call<QuizCardData[]>("list_quizzes", {
      p_search: o.search || null,
      p_tag: o.tag || null,
      p_sort: o.sort || "featured",
      p_limit: o.limit ?? 48,
      p_offset: o.offset ?? 0,
    }),
  listTags: () => call<string[]>("list_tags"),
  getQuiz: (slug: string) => call<QuizDetail | null>("get_quiz", { p_slug: slug }),

  /* ---------- Stüdyo ---------- */
  myQuizzes: () => call<QuizCardData[]>("list_my_quizzes"),
  quizForEdit: (id: string) => call<EditableQuiz>("get_quiz_for_edit", { p_id: id }),
  saveQuiz: (p: EditableQuiz) => call<{ id: string; slug: string }>("save_quiz", { p }),
  submitQuiz: (id: string) => call<{ status: string }>("submit_quiz", { p_id: id }),
  deleteQuiz: (id: string) => call<void>("delete_quiz", { p_id: id }),

  /* ---------- Canlı oyun ---------- */
  createHostedGame: (quizId: string) => call<{ id: string; code: string }>("create_hosted_game", { p_quiz_id: quizId }),
  findGame: (code: string) => call<GameState | null>("find_game", { p_code: code }),
  joinGame: (code: string) => call<{ game_id: string; is_host: boolean }>("join_game", { p_code: code }),
  gameState: (id: string) => call<GameState | null>("get_game_state", { p_game_id: id }),
  myStatus: (id: string) => call<MyStatus | null>("my_game_status", { p_game_id: id }),
  submitAnswer: (id: string, q: number, choice: number) =>
    call<{ accepted: boolean; reason?: string; all_answered?: boolean }>("submit_answer", {
      p_game_id: id,
      p_q: q,
      p_choice: choice,
    }),
  tick: (id: string) => call<GameState>("tick_game", { p_game_id: id }),
  advance: (id: string) => call<GameState>("advance_game", { p_game_id: id }),
  endNow: (id: string) => call<GameState>("end_game_now", { p_game_id: id }),
  kick: (id: string, userId: string) => call<void>("kick_player", { p_game_id: id, p_user_id: userId }),
  hostView: (id: string) => call<HostView>("host_view", { p_game_id: id }),
  cancelGame: (id: string) => call<void>("cancel_game", { p_id: id }),
  listEvents: () => call<EventLists>("list_events"),
  results: (id: string) => call<(GameState & { player_count: number; me: MyStatus | null }) | null>("get_game_results", { p_game_id: id }),
  serverTime: () => call<number>("server_time"),

  /* ---------- Solo ---------- */
  soloStart: (quizId: string) => call<SoloStart>("solo_start", { p_quiz_id: quizId }),
  soloResume: (sid: string) => call<SoloStart & { answered: boolean; correct: number } | null>("solo_resume", { p_session: sid }),
  soloAnswer: (sid: string, choice: number | null) => call<SoloAnswer>("solo_answer", { p_session: sid, p_choice: choice }),
  soloNext: (sid: string) => call<SoloNext>("solo_next", { p_session: sid }),

  /* ---------- Liderlik ---------- */
  leaderboard: (group: "player", range: string, quiz?: string | null, limit = 50) =>
    call<{ rows: LeaderRow[]; me: { rank: number; score: number; games: number } | null }>("get_leaderboard", {
      p_group: group,
      p_range: range,
      p_quiz: quiz || null,
      p_limit: limit,
    }),
  groupLeaderboard: (group: "country" | "team", range: string, quiz?: string | null, limit = 50) =>
    call<{ rows: GroupRow[] }>("get_leaderboard", { p_group: group, p_range: range, p_quiz: quiz || null, p_limit: limit }),

  /* ---------- Ödüller ---------- */
  myPrizes: () => call<PrizeClaim[]>("my_prizes"),
  submitPrizeAddress: (claim: string, address: string) =>
    call<PrizeClaim[]>("submit_prize_address", { p_claim: claim, p_address: address }),

  /* ---------- Yönetim ---------- */
  admin: {
    stats: () => call<Record<string, number>>("admin_stats"),
    quizzes: (status?: string | null) => call<QuizCardData[]>("admin_list_quizzes", { p_status: status || null }),
    review: (id: string, approve: boolean, note?: string) =>
      call<void>("review_quiz", { p_id: id, p_approve: approve, p_note: note || null }),
    feature: (id: string, featured: boolean) => call<void>("set_quiz_featured", { p_id: id, p_featured: featured }),
    unpublish: (id: string) => call<void>("unpublish_quiz", { p_id: id }),
    users: (search?: string, filter?: string | null) =>
      call<AdminUser[]>("admin_list_users", { p_search: search || null, p_filter: filter || null }),
    setRole: (user: string, role: string) => call<void>("admin_set_role", { p_user: user, p_role: role }),
    rejectCreator: (user: string) => call<void>("admin_reject_creator", { p_user: user }),
    setBanned: (user: string, banned: boolean) => call<void>("admin_set_banned", { p_user: user, p_banned: banned }),
    games: (mode?: string | null) => call<(GameState & { player_count: number; created_at: string })[]>("admin_list_games", { p_mode: mode || null }),
    createEvent: (p: EventInput) => call<{ id: string; code: string }>("create_event", { p }),
    updateEvent: (id: string, p: Partial<EventInput>) => call<GameState>("update_event", { p_id: id, p }),
    prizes: (status?: string | null) => call<PrizeClaim[]>("admin_list_prizes", { p_status: status || null }),
    updatePrize: (id: string, status: string, txid?: string, note?: string) =>
      call<void>("admin_update_prize", { p_id: id, p_status: status, p_txid: txid || null, p_note: note || null }),
  },
};

export interface SoloStart {
  session_id: string;
  total: number;
  score: number;
  streak: number;
  question: { index: number; text: import("./types").LocalText; options: import("./types").LocalText[]; time_limit: number };
  server_now: number;
  started_at: number;
}
export interface SoloAnswer {
  correct: number;
  is_correct: boolean;
  choice: number | null;
  points: number;
  score: number;
  streak: number;
  explanation: import("./types").LocalText | null;
  is_last: boolean;
}
export type SoloNext =
  | { finished: true; score: number; correct: number; total: number; best: number; quiz_rank: number }
  | { finished: false; question: SoloStart["question"]; server_now: number; started_at: number };

export interface EventInput {
  quiz_id: string;
  title: import("./types").LocalText;
  starts_at: string;
  reveal_secs: number;
  board_secs: number;
  prize: import("./types").LocalText | null;
  prize_places: number;
  visibility: "public" | "unlisted";
}

export interface AdminUser {
  id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  team: string | null;
  role: import("./types").Role;
  banned: boolean;
  created_at: string;
  creator_request_at: string | null;
  creator_request_note: string | null;
  email: string | null;
}
