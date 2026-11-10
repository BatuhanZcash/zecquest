/**
 * Pure parsers for the Gündem collector. No network, no Date.now(): easy to test with fixture JSON
 * (lib/news/__fixtures__, scripts/test-news.mjs).
 */
import type { NetworkSnapshot, Pools } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** Discourse "cooked" HTML → plain text (quotes, images, code and onebox previews removed) */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = String(html);
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, " "); // quotes and onebox link previews
  s = s.replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<img[^>]*>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|h[1-6]|div|blockquote)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
  return s.replace(/[ \t\f\v ]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

/** Short excerpt: whole sentences when possible, never mid-word */
export function excerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  return cut.slice(0, space > 0 ? space : max).replace(/[,;:\-–—]+$/, "") + "…";
}

export interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

/** /categories.json (with or without include_subcategories) → id → category */
export function parseCategories(json: J): Map<number, ForumCategory> {
  const out = new Map<number, ForumCategory>();
  const walk = (list: J[], parent: number | null) => {
    for (const c of list ?? []) {
      if (typeof c?.id !== "number") continue;
      out.set(c.id, { id: c.id, name: String(c.name ?? ""), slug: String(c.slug ?? ""), parent_id: c.parent_category_id ?? parent });
      if (Array.isArray(c.subcategory_list)) walk(c.subcategory_list, c.id);
    }
  };
  walk(json?.category_list?.categories ?? [], null);
  return out;
}

/** "Parent / Child" category label */
export function categoryLabel(cats: Map<number, ForumCategory>, id: number | null | undefined): string | null {
  if (id == null) return null;
  const c = cats.get(id);
  if (!c) return null;
  const p = c.parent_id != null ? cats.get(c.parent_id) : undefined;
  return p ? `${p.name} / ${c.name}` : c.name;
}

export interface TopicSummary {
  id: number;
  slug: string;
  title: string;
  created_at: string;
  last_posted_at: string | null;
  bumped_at: string | null;
  posts_count: number;
  reply_count: number;
  like_count: number;
  views: number;
  category_id: number | null;
  op_username: string | null;
  pinned: boolean;
}

/** /latest.json → topic summaries (original poster resolved through the users list) */
export function parseTopicList(json: J): TopicSummary[] {
  const users = new Map<number, string>();
  for (const u of json?.users ?? []) if (typeof u?.id === "number") users.set(u.id, String(u.username));
  return (json?.topic_list?.topics ?? [])
    .filter((t: J) => typeof t?.id === "number" && t.title)
    .map((t: J) => {
      const op = (t.posters ?? []).find((p: J) => /original poster/i.test(p?.description ?? ""));
      return {
        id: t.id,
        slug: String(t.slug ?? "topic"),
        title: String(t.fancy_title ? htmlToText(t.fancy_title) : t.title),
        created_at: t.created_at,
        last_posted_at: t.last_posted_at ?? null,
        bumped_at: t.bumped_at ?? null,
        posts_count: Number(t.posts_count ?? 0),
        reply_count: Number(t.reply_count ?? Math.max(0, Number(t.posts_count ?? 1) - 1)),
        like_count: Number(t.like_count ?? 0),
        views: Number(t.views ?? 0),
        category_id: t.category_id ?? null,
        op_username: op ? users.get(op.user_id) ?? null : null,
        pinned: Boolean(t.pinned || t.pinned_globally),
      } satisfies TopicSummary;
    });
}

/** Has the list paged past the window? (used to stop paging) */
export function listReachedBefore(topics: TopicSummary[], field: "created_at" | "bumped_at", start: Date): boolean {
  const nonPinned = topics.filter((t) => !t.pinned);
  if (nonPinned.length === 0) return true;
  const last = nonPinned[nonPinned.length - 1];
  const v = last[field] ?? last.created_at;
  return new Date(v).getTime() < start.getTime();
}

export interface ForumPost {
  id: number;
  username: string;
  name: string | null;
  post_number: number;
  created_at: string;
  cooked: string;
  like_count: number;
  reply_to_post_number: number | null;
}

export interface TopicDetail {
  id: number;
  slug: string;
  title: string;
  created_at: string;
  category_id: number | null;
  posts_count: number;
  highest_post_number: number;
  like_count: number;
  author: string | null;
  posts: ForumPost[];
  participants: string[];
}

function postLikes(p: J): number {
  if (typeof p?.like_count === "number") return p.like_count;
  const like = (p?.actions_summary ?? []).find((a: J) => a?.id === 2);
  if (typeof like?.count === "number") return like.count;
  // newer Discourse: reactions plugin
  return (p?.reactions ?? []).reduce((n: number, r: J) => n + (Number(r?.count) || 0), 0);
}

/** /t/{id}.json or /t/{id}/{post_number}.json → topic + the posts in that page */
export function parseTopic(json: J): TopicDetail | null {
  if (!json || typeof json.id !== "number") return null;
  const posts: ForumPost[] = (json.post_stream?.posts ?? []).map((p: J) => ({
    id: p.id,
    username: String(p.username ?? ""),
    name: p.name ?? null,
    post_number: Number(p.post_number),
    created_at: p.created_at,
    cooked: String(p.cooked ?? ""),
    like_count: postLikes(p),
    reply_to_post_number: p.reply_to_post_number ?? null,
  }));
  const first = posts.find((p) => p.post_number === 1);
  const author = json.details?.created_by?.username ?? first?.username ?? null;
  return {
    id: json.id,
    slug: String(json.slug ?? "topic"),
    title: String(json.fancy_title ? htmlToText(json.fancy_title) : json.title ?? ""),
    created_at: json.created_at,
    category_id: json.category_id ?? null,
    posts_count: Number(json.posts_count ?? posts.length),
    highest_post_number: Number(json.highest_post_number ?? json.posts_count ?? posts.length),
    like_count: Number(json.like_count ?? posts.reduce((n, p) => n + p.like_count, 0)),
    author,
    posts,
    participants: (json.details?.participants ?? []).map((u: J) => String(u.username)),
  };
}

/** Merge posts from several pages of the same topic (dedupe by post_number) */
export function mergePosts(a: ForumPost[], b: ForumPost[]): ForumPost[] {
  const m = new Map<number, ForumPost>();
  for (const p of [...a, ...b]) m.set(p.post_number, p);
  return [...m.values()].sort((x, y) => x.post_number - y.post_number);
}

export interface UserAction {
  action_type: number; // 4 = new topic, 5 = reply
  topic_id: number;
  post_number: number;
  created_at: string;
  username: string;
  title: string;
  slug: string;
  excerpt: string;
  category_id: number | null;
}

/** /user_actions.json?username=U&filter=4,5 */
export function parseUserActions(json: J): UserAction[] {
  return (json?.user_actions ?? [])
    .filter((a: J) => typeof a?.topic_id === "number")
    .map((a: J) => ({
      action_type: Number(a.action_type),
      topic_id: a.topic_id,
      post_number: Number(a.post_number ?? 1),
      created_at: a.created_at,
      username: String(a.username ?? a.acting_username ?? ""),
      title: String(a.title ?? ""),
      slug: String(a.slug ?? "topic"),
      excerpt: htmlToText(a.excerpt),
      category_id: a.category_id ?? null,
    }));
}

/** /u/{user}.json → display name */
export function parseUserName(json: J): string | null {
  const n = json?.user?.name;
  return typeof n === "string" && n.trim() ? n.trim() : null;
}

export interface Release {
  repo: string;
  tag: string;
  name: string;
  url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  body: string;
  author: string | null;
}

/** GitHub /repos/{repo}/releases */
export function parseReleases(json: J, repo: string): Release[] {
  if (!Array.isArray(json)) return [];
  return json.map((r: J) => ({
    repo,
    tag: String(r.tag_name ?? ""),
    name: String(r.name || r.tag_name || ""),
    url: String(r.html_url ?? `https://github.com/${repo}/releases`),
    published_at: r.published_at ?? null,
    prerelease: Boolean(r.prerelease),
    draft: Boolean(r.draft),
    body: String(r.body ?? ""),
    author: r.author?.login ?? null,
  }));
}

/** First paragraph of a Markdown release body, without headings, links syntax or badges */
export function markdownExcerpt(md: string, max = 280): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s.*$/gm, " ")
    .replace(/[*_`>]/g, "")
    .replace(/^[ \t]*[-+][ \t]+/gm, "")
    .replace(/\r/g, "");
  const para = text.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.length > 20) ?? text.trim();
  return excerpt(para, max);
}

/** Semver-ish "major release" check: v7.0.0, 7.0.0, zebra-v7.0.0 */
export function isMajorRelease(tag: string): boolean {
  const m = tag.match(/(\d+)\.(\d+)\.(\d+)/);
  return !!m && m[2] === "0" && m[3] === "0" && Number(m[1]) > 0;
}

export interface MergedPull {
  number: number;
  title: string;
  url: string;
  merged_at: string;
  user: string | null;
  body: string;
}

/** GitHub /repos/{repo}/pulls?state=closed → merged PRs only */
export function parseMergedPulls(json: J): MergedPull[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((p: J) => p?.merged_at)
    .map((p: J) => ({
      number: Number(p.number),
      title: String(p.title ?? ""),
      url: String(p.html_url ?? ""),
      merged_at: p.merged_at,
      user: p.user?.login ?? null,
      body: String(p.body ?? ""),
    }));
}

const MAX_SUPPLY_ZEC = 21_000_000;
const POOL_KEYS = ["transparent", "sprout", "sapling", "orchard", "ironwood", "lockbox"] as const;

/** Amount → ZEC. Integer amounts larger than the max supply must be zatoshi. */
function toZec(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n > MAX_SUPPLY_ZEC ? n / 1e8 : n;
}

/**
 * Blockchair /zcash/stats. Height is reliable (best_block_height / blocks).
 * Blockchair does not document shielded pool totals; if a future response exposes keys containing
 * sprout/sapling/orchard we pick them up, otherwise pools stay null and ZCASH_RPC_URL is the pool source.
 */
export function parseBlockchair(json: J): NetworkSnapshot | null {
  const d = json?.data;
  if (!d || typeof d !== "object") return null;
  const height = typeof d.best_block_height === "number" ? d.best_block_height : typeof d.blocks === "number" ? d.blocks - 1 : null;
  const pools: Pools = {};
  for (const [k, v] of Object.entries(d)) {
    const pool = POOL_KEYS.find((p) => p !== "transparent" && k.toLowerCase().includes(p));
    if (pool && pools[pool] === undefined) {
      const z = toZec(v);
      if (z !== undefined) pools[pool] = z;
    }
  }
  return { height, pools: Object.keys(pools).length ? pools : null, source: "blockchair" };
}

/** zcashd / Zebra JSON-RPC getblockchaininfo → height + valuePools (chainValue is in ZEC) */
export function parseBlockchainInfo(json: J): NetworkSnapshot | null {
  const r = json?.result ?? json;
  if (!r || typeof r !== "object") return null;
  const height = typeof r.blocks === "number" ? r.blocks : null;
  const pools: Pools = {};
  for (const p of r.valuePools ?? []) {
    if (!p || typeof p.id !== "string" || p.monitored === false) continue;
    const z = typeof p.chainValue === "number" ? p.chainValue : typeof p.chainValueZat === "number" ? p.chainValueZat / 1e8 : undefined;
    if (z !== undefined) pools[p.id] = z;
  }
  return { height, pools: Object.keys(pools).length ? pools : null, source: "rpc" };
}

/** Prefer RPC pools; fall back to the explorer for whatever is missing */
export function mergeSnapshots(rpc: NetworkSnapshot | null, explorer: NetworkSnapshot | null): NetworkSnapshot | null {
  if (!rpc && !explorer) return null;
  const height = rpc?.height ?? explorer?.height ?? null;
  const pools = rpc?.pools ?? explorer?.pools ?? null;
  const source = [rpc?.height != null || rpc?.pools ? "rpc" : null, explorer && (!rpc?.pools || rpc?.height == null) ? explorer.source : null]
    .filter(Boolean)
    .join("+");
  return { height, pools, source: source || "unknown" };
}
