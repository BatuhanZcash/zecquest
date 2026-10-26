/** Metin: düz string ya da { tr, en } */
export type LocalText = string | { tr?: string; en?: string };

export type Role = "player" | "creator" | "admin";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  team: string | null;
  role: Role;
  banned: boolean;
  creator_request_at: string | null;
  zcash_address: string | null;
  created_at: string;
}

export interface AuthorRef {
  username: string | null;
  display_name: string | null;
}

export type QuizStatus = "draft" | "pending" | "published" | "rejected";

export interface QuizCardData {
  id: string;
  slug: string;
  title: LocalText;
  description: LocalText | null;
  icon: string;
  cover_url?: string | null;
  tags: string[];
  featured: boolean;
  status: QuizStatus;
  question_count: number;
  default_time: number;
  plays: number;
  author: AuthorRef | null;
  updated_at: string;
  review_note?: string | null;
  submitted_at?: string | null;
}

export interface QuizDetail extends QuizCardData {
  avg_time: number;
  can_host: boolean;
  top: { user_id: string; score: number; username: string; display_name: string; country: string | null }[];
}

export interface EditableQuestion {
  text: LocalText;
  options: LocalText[];
  correct: number;
  time_limit: number | null;
  explanation: LocalText | null;
}

export interface EditableQuiz {
  id?: string;
  slug: string;
  title: LocalText;
  description: LocalText | null;
  icon: string;
  cover_url?: string | null;
  tags: string[];
  default_time: number;
  status?: QuizStatus;
  review_note?: string | null;
  questions: EditableQuestion[];
}

/* ---------- Canlı oyun ---------- */
export type GameMode = "hosted" | "scheduled";
export type GameStatus = "lobby" | "question" | "reveal" | "leaderboard" | "ended" | "cancelled";

export interface BoardRow {
  user_id: string;
  name: string;
  country: string | null;
  team: string | null;
  score: number;
  correct: number;
  rank: number;
}

export interface GameState {
  id: string;
  code: string;
  mode: GameMode;
  status: GameStatus;
  visibility: "public" | "unlisted";
  title: LocalText | null;
  quiz: { id: string; slug: string; title: LocalText; icon: string } | null;
  host: AuthorRef | null;
  question_count: number;
  current_q: number;
  phase_started_at: number | null;
  phase_ends_at: number | null;
  starts_at: number | null;
  ended_at: number | null;
  reveal_secs: number;
  board_secs: number;
  question: { index: number; text: LocalText; options: LocalText[]; time_limit: number } | null;
  reveal: {
    q_index: number;
    correct: number;
    counts: number[];
    answered: number;
    explanation: LocalText | null;
  } | null;
  leaderboard: BoardRow[];
  prize: LocalText | null;
  prize_places: number;
  version: number;
  /* get_game_state ile gelen ek alanlar */
  server_now?: number;
  player_count?: number;
  answer_count?: number;
}

export interface HostView extends GameState {
  players: { user_id: string; name: string; country: string | null; team: string | null; score: number }[];
}

export interface MyStatus {
  joined: boolean;
  is_host?: boolean;
  kicked?: boolean;
  name?: string;
  score?: number;
  correct?: number;
  streak?: number;
  rank?: number;
  players?: number;
  answered_q?: number | null;
  choice?: number | null;
  result?: { q_index: number; is_correct: boolean; points: number; missed?: boolean } | null;
  prize?: { id: string; place: number; status: PrizeStatus } | null;
}

export interface EventLists {
  live: (GameState & { player_count: number })[];
  upcoming: (GameState & { player_count: number })[];
  recent: GameState[];
  server_now: number;
}

/* ---------- Liderlik ---------- */
export interface LeaderRow {
  username: string;
  display_name: string;
  country: string | null;
  team: string | null;
  score: number;
  games: number;
}
export interface GroupRow {
  key: string;
  score: number;
  players: number;
}

export interface PublicProfile {
  username: string;
  display_name: string;
  country: string | null;
  team: string | null;
  role: Role;
  created_at: string;
  total_score: number;
  games: number;
  rank: number | null;
  wins: number;
  recent: {
    source: "live" | "solo";
    score: number;
    correct: number;
    total: number;
    created_at: string;
    quiz_title: LocalText | null;
    quiz_slug: string | null;
  }[];
}

/* ---------- Ödüller ---------- */
export type PrizeStatus = "awaiting_address" | "pending" | "paid" | "void";
export interface PrizeClaim {
  id: string;
  place: number;
  status: PrizeStatus;
  address: string | null;
  txid: string | null;
  created_at: string;
  paid_at: string | null;
  admin_note?: string | null;
  user?: { username: string; display_name: string; country: string | null };
  game: { id: string; title: LocalText | null; prize: LocalText | null; ended_at: number | string | null };
}
