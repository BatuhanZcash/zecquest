"use client";

import { supabase } from "./supabase";
import { ApiError } from "./api";
import type { Digest, DigestListRow, KeyPersonKind, NetworkStatus, ScorePart, Tier, ItemKind, DigestFact } from "./news/types";

export type { Digest, DigestItem, DigestListRow, NetworkStatus, DigestFact } from "./news/types";

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(error.message || "unknown_error");
  return data as T;
}

/* ---------- Editor shapes ---------- */
export interface CollectedRow {
  id: number;
  digest_date: string;
  external_id: string;
  source: "forum" | "github" | "network";
  url: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  author_is_key: boolean;
  author_is_official: boolean;
  category: string | null;
  kind: ItemKind;
  source_created_at: string | null;
  last_activity_at: string | null;
  metrics: { section?: string; attribution?: string | null; likes?: number; replies_in_window?: number; participants?: number; self_bumps?: number; [k: string]: unknown };
  score: number;
  score_breakdown: ScorePart[];
  tier: Tier;
  single_source: boolean;
  dismissed: boolean;
  used: boolean;
}

export interface EditorItemText {
  title: string;
  summary: string;
  badge?: string;
  facts?: DigestFact[];
}

export interface EditorItem {
  id?: string;
  section: string;
  tier: Tier;
  url: string;
  source_name: string;
  attribution: string;
  kind: ItemKind;
  verified: boolean;
  related_slug: string;
  source_item_id: number | null;
}

export interface AdminDigest {
  date: string;
  status: "draft" | "published";
  base_lang: string;
  published_at: string | null;
  updated_at: string;
  items: (EditorItem & { id: string; position: number })[];
  versions: Record<string, { title: string; intro: string | null; items: Record<string, EditorItemText>; translator_name: string | null }>;
}

export interface SaveDigestInput {
  base_lang: string;
  items: EditorItem[];
  texts: Record<string, { title: string; intro?: string; items: EditorItemText[] }>;
}

export interface KeyPersonRow {
  username: string;
  display_name: string | null;
  affiliation: string | null;
  kind: KeyPersonKind;
  active: boolean;
}

export interface TranslationRow {
  id: number;
  digest_date: string;
  lang: string;
  title: string;
  intro: string | null;
  items: Record<string, EditorItemText>;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  note: string | null;
  submitter: { display_name: string; username: string | null };
}

export interface MyTranslation {
  id: number;
  date: string;
  lang: string;
  title: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  note: string | null;
}

export interface RunRow {
  id: number;
  ran_at: string;
  digest_date: string | null;
  stats: Record<string, number>;
  errors: string[];
}

export const newsApi = {
  /* public */
  digest: (date: string, lang?: string | null) => call<Digest | null>("get_digest", { p_date: date, p_lang: lang || null }),
  latest: (lang?: string | null) => call<Digest | null>("get_latest_digest", { p_lang: lang || null }),
  list: (o: { limit?: number; offset?: number; lang?: string | null } = {}) =>
    call<DigestListRow[]>("list_digests", { p_limit: o.limit ?? 30, p_offset: o.offset ?? 0, p_lang: o.lang || null }),
  network: () => call<NetworkStatus>("get_network_status"),

  /* organizers */
  submitTranslation: (date: string, lang: string, p: { title: string; intro?: string; items: Record<string, EditorItemText> }) =>
    call<{ id: number; status: "pending" | "approved" }>("news_submit_translation", { p_date: date, p_lang: lang, p }),
  myTranslations: () => call<MyTranslation[]>("news_my_translations"),

  /* admin / editor */
  dates: () => call<{ date: string; collected: number; status: "draft" | "published" | null; items: number; languages: string[] }[]>("news_admin_dates"),
  items: (date: string, includeDismissed = false) => call<CollectedRow[]>("news_admin_items", { p_date: date, p_include_dismissed: includeDismissed }),
  dismiss: (id: number, dismissed = true) => call<void>("news_admin_dismiss_item", { p_id: id, p_dismissed: dismissed }),
  adminDigest: (date: string) => call<AdminDigest | null>("news_admin_get_digest", { p_date: date }),
  saveDigest: (date: string, p: SaveDigestInput) => call<AdminDigest>("news_admin_save_digest", { p_date: date, p }),
  setStatus: (date: string, status: "draft" | "published") => call<{ status: string }>("news_admin_set_status", { p_date: date, p_status: status }),
  deleteDigest: (date: string) => call<void>("news_admin_delete_digest", { p_date: date }),
  deleteVersion: (date: string, lang: string) => call<void>("news_admin_delete_version", { p_date: date, p_lang: lang }),
  people: () => call<KeyPersonRow[]>("news_admin_people"),
  savePerson: (p: Partial<KeyPersonRow> & { username: string }) => call<KeyPersonRow>("news_admin_save_person", { p }),
  deletePerson: (username: string) => call<void>("news_admin_delete_person", { p_username: username }),
  setUpgrade: (name: string | null, height: number | null) => call<NetworkStatus>("news_admin_set_upgrade", { p_name: name, p_height: height }),
  runs: (limit = 10) => call<RunRow[]>("news_admin_runs", { p_limit: limit }),
  translations: (status: "pending" | "approved" | "rejected" | null = "pending") => call<TranslationRow[]>("news_admin_translations", { p_status: status }),
  reviewTranslation: (id: number, approve: boolean, note?: string) =>
    call<{ status: string }>("news_admin_review_translation", { p_id: id, p_approve: approve, p_note: note ?? null }),
};
