/**
 * Gündem scoring. Pure functions; every point is listed in the breakdown the editor sees.
 *
 *   official org account authored       +40
 *   key person authored                 +25
 *   key people replied (not the author) +12 each, max 36
 *   distinct non-author participants    +2 each, max 20   (in the window)
 *   replies by others                   +1 each, max 10   (the author's own posts are not counted: no self-bumping)
 *   likes                               +1 per 3, max 15
 *   category                            0…10 (see CATEGORY_RULES)
 *   new topic in the window             +8
 *
 * Tiers: lead ≥ 60, brief ≥ 30, otherwise watch.
 */
import { CATEGORY_RULES, TIERS } from "./sources";
import type { ForumPost } from "./parse";
import type { KeyPerson, ScorePart, Tier } from "./types";

export function tierFor(score: number): Tier {
  return score >= TIERS.lead ? "lead" : score >= TIERS.brief ? "brief" : "watch";
}

export function categoryRule(category: string | null): { points: number; section: string } {
  if (!category) return { points: 0, section: "community" };
  // "Parent / Child": the most specific rule that matches either part wins (highest points)
  let best: { points: number; section: string } | null = null;
  for (const r of CATEGORY_RULES) if (r.re.test(category) && (!best || r.points > best.points)) best = { points: r.points, section: r.section };
  return best ?? { points: 0, section: "community" };
}

export type PeopleIndex = Map<string, KeyPerson>;

export function indexPeople(people: KeyPerson[]): PeopleIndex {
  const m: PeopleIndex = new Map();
  for (const p of people) if (p.active !== false) m.set(p.username.toLowerCase(), p);
  return m;
}

export const findPerson = (idx: PeopleIndex, username: string | null | undefined) =>
  username ? idx.get(username.toLowerCase()) ?? null : null;

const inWindow = (iso: string | null | undefined, start: Date, end: Date) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
};

export interface TopicScoreInput {
  author: string | null;
  created_at: string;
  like_count: number;
  category: string | null;
  posts: ForumPost[];
  start: Date;
  end: Date;
}

export interface TopicScore {
  score: number;
  tier: Tier;
  breakdown: ScorePart[];
  section: string;
  author_is_key: boolean;
  author_is_official: boolean;
  single_source: boolean;
  key_repliers: string[];
  metrics: {
    likes: number;
    replies_in_window: number;
    self_bumps: number;
    participants: number;
    key_repliers: string[];
    new_topic: boolean;
  };
}

export function scoreTopic(t: TopicScoreInput, people: PeopleIndex): TopicScore {
  const parts: ScorePart[] = [];
  const add = (key: string, points: number, detail?: string) => parts.push({ key, points, ...(detail ? { detail } : {}) });
  const author = (t.author ?? "").toLowerCase();
  const person = findPerson(people, t.author);
  const official = person?.kind === "org";
  const newTopic = inWindow(t.created_at, t.start, t.end);

  if (official) add("official", 40, t.author ?? undefined);
  else if (person) add("key_author", 25, [t.author, person.affiliation].filter(Boolean).join(" · "));

  const windowPosts = t.posts.filter((p) => p.post_number > 1 && inWindow(p.created_at, t.start, t.end));
  const others = windowPosts.filter((p) => p.username.toLowerCase() !== author);
  const selfBumps = windowPosts.length - others.length;

  const keyRepliers = [...new Set(others.map((p) => p.username).filter((u) => findPerson(people, u)))];
  if (keyRepliers.length) add("key_replies", Math.min(36, 12 * keyRepliers.length), keyRepliers.join(", "));

  const participants = new Set(others.map((p) => p.username.toLowerCase()));
  if (participants.size) add("participants", Math.min(20, 2 * participants.size), String(participants.size));
  if (others.length) add("replies", Math.min(10, others.length), String(others.length));
  if (selfBumps > 0) add("self_bumps", 0, String(selfBumps));

  const likes = Math.max(0, t.like_count);
  const likePts = Math.min(15, Math.floor(likes / 3));
  if (likePts) add("likes", likePts, String(likes));

  const cat = categoryRule(t.category);
  if (cat.points) add("category", cat.points, t.category ?? undefined);
  if (newTopic) add("new_topic", 8);

  const score = parts.reduce((n, p) => n + p.points, 0);
  return {
    score,
    tier: tierFor(score),
    breakdown: parts,
    section: cat.section,
    author_is_key: !!person,
    author_is_official: official,
    // A claim is only multi-source when an official account or a named key person stands behind it
    single_source: !person,
    key_repliers: keyRepliers,
    metrics: {
      likes,
      replies_in_window: others.length,
      self_bumps: selfBumps,
      participants: participants.size,
      key_repliers: keyRepliers,
      new_topic: newTopic,
    },
  };
}

/** A key person's own reply (a statement: always attributed, never stated as fact) */
export function scoreKeyPost(post: ForumPost, person: KeyPerson, category: string | null): { score: number; tier: Tier; breakdown: ScorePart[] } {
  const parts: ScorePart[] = [];
  if (person.kind === "org") parts.push({ key: "official", points: 40, detail: post.username });
  else parts.push({ key: "key_author", points: 25, detail: [post.username, person.affiliation].filter(Boolean).join(" · ") });
  const likePts = Math.min(15, Math.floor(post.like_count / 2));
  if (likePts) parts.push({ key: "likes", points: likePts, detail: String(post.like_count) });
  const cat = categoryRule(category);
  if (cat.points) parts.push({ key: "category", points: cat.points, detail: category ?? undefined });
  const score = parts.reduce((n, p) => n + p.points, 0);
  return { score, tier: tierFor(score), breakdown: parts };
}

export function scoreRelease(r: { tag: string; prerelease: boolean }, major: boolean): { score: number; tier: Tier; breakdown: ScorePart[] } {
  const parts: ScorePart[] = [{ key: "release", points: r.prerelease ? 20 : 45, detail: r.tag }];
  if (major && !r.prerelease) parts.push({ key: "major_release", points: 20 });
  if (r.prerelease) parts.push({ key: "prerelease", points: 0 });
  const score = parts.reduce((n, p) => n + p.points, 0);
  return { score, tier: tierFor(score), breakdown: parts };
}

export function scoreZipMerge(title: string): { score: number; tier: Tier; breakdown: ScorePart[] } {
  const parts: ScorePart[] = [{ key: "zip_merged", points: 30 }];
  // New ZIP drafts or status changes matter more than typo fixes
  if (/\b(draft|new zip|proposed|final|active|status)\b/i.test(title)) parts.push({ key: "zip_status", points: 10 });
  const score = parts.reduce((n, p) => n + p.points, 0);
  return { score, tier: tierFor(score), breakdown: parts };
}
