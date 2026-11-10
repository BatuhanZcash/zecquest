/**
 * Gündem (news) shared types: collector ↔ database ↔ UI.
 * No runtime code here so the file can be imported from server routes, client pages and node tests.
 */

export type Tier = "lead" | "brief" | "watch";
export type ItemKind = "fact" | "statement";
export type KeyPersonKind = "org" | "protocol" | "zcg" | "ecosystem";

/** Digest sections. Labels live in lib/i18n-extra/news.ts (news_sec_<code>). */
export const SECTIONS = [
  "upgrade",
  "network",
  "protocol",
  "zips",
  "nodes",
  "wallets",
  "governance",
  "grants",
  "foundation",
  "ecosystem",
  "community",
  "security",
] as const;
export type Section = (typeof SECTIONS)[number];

export interface KeyPerson {
  username: string;
  kind: KeyPersonKind;
  affiliation: string | null;
  display_name?: string | null;
  active?: boolean;
}

export interface ScorePart {
  /** machine key, e.g. "official", "key_author", "key_replies" */
  key: string;
  points: number;
  /** human detail, e.g. "zooko, str4d" or "12 likes" */
  detail?: string;
}

/** One collected item as written by the cron (news_ingest) */
export interface CollectedItem {
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
  metrics: Record<string, unknown>;
  score: number;
  score_breakdown: ScorePart[];
  tier: Tier;
  /** true → only one, non-official source: the editor sees "unverified" */
  single_source: boolean;
}

export interface Pools {
  transparent?: number;
  sprout?: number;
  sapling?: number;
  orchard?: number;
  /** NU6.3 (block 3,428,143): the newest shielded pool */
  ironwood?: number;
  lockbox?: number;
  [k: string]: number | undefined;
}

export interface NetworkSnapshot {
  height: number | null;
  pools: Pools | null;
  source: string;
}

export interface IngestPayload {
  digest_date: string;
  window: { start: string; end: string };
  items: CollectedItem[];
  snapshot: NetworkSnapshot | null;
  stats: Record<string, number>;
  errors: string[];
}

/* ---------- Public RPC shapes ---------- */

export interface DigestFact {
  value: string;
  label: string;
}

export interface DigestItem {
  id: string;
  position: number;
  section: string;
  tier: Tier;
  title: string;
  summary: string;
  badge: string | null;
  facts: DigestFact[];
  /** false → this item fell back to the base language */
  translated: boolean;
  url: string;
  source_name: string | null;
  attribution: string | null;
  kind: ItemKind;
  verified: boolean;
  related_slug: string | null;
}

export interface Digest {
  date: string;
  status: "draft" | "published";
  base_lang: string;
  requested_lang: string;
  lang: string;
  title: string;
  intro: string | null;
  published_at: string | null;
  updated_at: string;
  translator: { name: string; username: string | null } | null;
  languages: { lang: string; translator: string | null }[];
  sources: string[];
  items: DigestItem[];
}

export interface DigestListRow {
  date: string;
  title: string;
  lang: string;
  item_count: number;
  lead: { section: string; title: string } | null;
  languages: string[];
}

export interface NetworkStatus {
  height: number | null;
  pools: Pools | null;
  pools_delta_24h: Pools | null;
  shielded: number | null;
  shielded_delta_24h: number | null;
  height_24h_ago: number | null;
  next_upgrade: { name: string; height: number; blocks_left: number | null } | null;
  last_upgrade: { name: string; height: number } | null;
  updated_at: string | null;
  source: string | null;
}
