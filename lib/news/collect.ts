/**
 * Gündem collector: last 24h from primary sources → IngestPayload (written by the cron with news_ingest).
 * Network access is injected (deps.fetchJson) so the whole pipeline runs against fixtures in tests.
 */
import {
  categoryLabel,
  excerpt,
  htmlToText,
  isMajorRelease,
  listReachedBefore,
  markdownExcerpt,
  mergePosts,
  mergeSnapshots,
  parseBlockchainInfo,
  parseBlockchair,
  parseCategories,
  parseMergedPulls,
  parseReleases,
  parseTopic,
  parseTopicList,
  parseUserActions,
  parseUserName,
  type ForumCategory,
  type TopicDetail,
  type TopicSummary,
  type UserAction,
} from "./parse";
import { categoryRule, findPerson, indexPeople, scoreKeyPost, scoreRelease, scoreTopic, scoreZipMerge } from "./score";
import { BLOCKCHAIR_STATS, FORUM_BASE, GITHUB_API, LIMITS, RELEASE_REPOS, ZIPS_REPO } from "./sources";
import type { CollectedItem, IngestPayload, KeyPerson, NetworkSnapshot } from "./types";

export interface CollectDeps {
  /** GET (or POST when init.body is set) returning parsed JSON; throws on non-2xx */
  fetchJson: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<unknown>;
  now: Date;
  forumBase?: string;
  githubApi?: string;
  blockchairUrl?: string;
  githubToken?: string;
  /** zcashd / Zebra JSON-RPC endpoint (getblockchaininfo) */
  rpcUrl?: string;
}

export interface CollectConfig {
  people: KeyPerson[];
}

const DAY = 24 * 3600 * 1000;
const iso = (d: Date) => d.toISOString();

/** The 24h window ending at `now`; the digest date is the UTC day the window starts in (cron at 00:00 UTC → yesterday). */
export function windowFor(now: Date): { start: Date; end: Date; digestDate: string } {
  const end = new Date(now.getTime());
  const start = new Date(end.getTime() - DAY);
  return { start, end, digestDate: start.toISOString().slice(0, 10) };
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/** "Zebra 7.0.0" from label "Zebra", name "Zebra 7.0.0" / "v7.0.0" / "" and tag "v7.0.0" */
export function releaseTitle(label: string, name: string, tag: string): string {
  const n = (name || tag).trim();
  if (n.toLowerCase().includes(label.toLowerCase())) return n;
  const version = n.replace(/^v(?=\d)/, "");
  return /\d/.test(n) ? `${label} ${version}` : `${label} ${n} (${tag})`;
}

const within = (v: string | null | undefined, start: Date, end: Date) => {
  if (!v) return false;
  const t = new Date(v).getTime();
  return t >= start.getTime() && t <= end.getTime();
};

export async function collect(deps: CollectDeps, config: CollectConfig): Promise<IngestPayload> {
  const forum = (deps.forumBase || FORUM_BASE).replace(/\/$/, "");
  const gh = (deps.githubApi || GITHUB_API).replace(/\/$/, "");
  const { start, end, digestDate } = windowFor(deps.now);
  const people = indexPeople(config.people);
  const errors: string[] = [];
  const stats: Record<string, number> = { requests: 0 };

  const get = async (url: string, init?: Parameters<CollectDeps["fetchJson"]>[1]): Promise<unknown | null> => {
    stats.requests++;
    try {
      return await deps.fetchJson(url, init);
    } catch (e) {
      errors.push(`${url.replace(/[?&](access_token|key)=[^&]+/g, "")}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300));
      return null;
    }
  };

  /* ---------------- Forum ---------------- */
  const cats: Map<number, ForumCategory> = parseCategories(await get(`${forum}/categories.json?include_subcategories=true`));
  const summaries = new Map<number, TopicSummary>();

  for (const order of ["created", "bumped"] as const) {
    for (let page = 0; page < LIMITS.listPages; page++) {
      const url = order === "created" ? `${forum}/latest.json?order=created&page=${page}` : `${forum}/latest.json?page=${page}`;
      const json = await get(url);
      if (!json) break;
      const topics = parseTopicList(json);
      for (const t of topics) {
        const relevant = order === "created" ? within(t.created_at, start, end) : within(t.last_posted_at ?? t.bumped_at, start, end);
        if (relevant && !summaries.has(t.id)) summaries.set(t.id, t);
      }
      if (listReachedBefore(topics, order === "created" ? "created_at" : "bumped_at", start)) break;
    }
  }
  stats.forum_topics_listed = summaries.size;

  // Key people's posts in the window (new topics + replies)
  const keyActions: UserAction[] = [];
  await pool(
    config.people.filter((p) => p.active !== false),
    LIMITS.concurrency,
    async (p) => {
      const json = await get(`${forum}/user_actions.json?username=${encodeURIComponent(p.username)}&filter=4,5`);
      for (const a of parseUserActions(json)) if (within(a.created_at, start, end)) keyActions.push({ ...a, username: a.username || p.username });
    },
  );
  stats.key_posts = keyActions.length;

  // Topics to inspect: key people's topics always; the rest ranked by a cheap list-level estimate
  const keyTopicIds = new Set(keyActions.map((a) => a.topic_id));
  const ranked = [...summaries.values()]
    .filter((t) => !keyTopicIds.has(t.id))
    .sort((a, b) => b.like_count + b.reply_count * 2 - (a.like_count + a.reply_count * 2));
  const detailIds = [...keyTopicIds, ...ranked.map((t) => t.id)].slice(0, Math.max(LIMITS.topicDetails, keyTopicIds.size));

  const details = new Map<number, TopicDetail>();
  await pool(detailIds, LIMITS.concurrency, async (id) => {
    const t = parseTopic(await get(`${forum}/t/${id}.json`));
    if (!t) return;
    // Long topics: the first page only has the first ~20 posts; fetch around the newest post too
    if (t.highest_post_number > (t.posts[t.posts.length - 1]?.post_number ?? 0)) {
      const tail = parseTopic(await get(`${forum}/t/${id}/${t.highest_post_number}.json`));
      if (tail) t.posts = mergePosts(t.posts, tail.posts);
    }
    details.set(id, t);
  });
  // Key people's replies that are still not loaded (very long topics)
  await pool(
    keyActions.filter((a) => a.post_number > 1 && !details.get(a.topic_id)?.posts.some((p) => p.post_number === a.post_number)),
    LIMITS.concurrency,
    async (a) => {
      const page = parseTopic(await get(`${forum}/t/${a.topic_id}/${a.post_number}.json`));
      const t = details.get(a.topic_id);
      if (page && t) t.posts = mergePosts(t.posts, page.posts);
      else if (page && !t) details.set(a.topic_id, page);
    },
  );
  stats.forum_topics_fetched = details.size;

  // Real names for key-person attribution ("Name (username)") when the admin list has none
  const names = new Map<string, string>();
  const needNames = [...new Set(keyActions.map((a) => a.username))]
    .filter((u) => {
      const p = findPerson(people, u);
      return p && (!p.display_name || p.display_name.toLowerCase() === p.username.toLowerCase());
    })
    .slice(0, LIMITS.userLookups);
  await pool(needNames, LIMITS.concurrency, async (u) => {
    const n = parseUserName(await get(`${forum}/u/${encodeURIComponent(u)}.json`));
    if (n) names.set(u.toLowerCase(), n);
  });
  const attributionFor = (username: string) => {
    const p = findPerson(people, username);
    const name = (p?.display_name && p.display_name.toLowerCase() !== username.toLowerCase() ? p.display_name : null) ?? names.get(username.toLowerCase());
    const who = name && name.toLowerCase() !== username.toLowerCase() ? `${name} (${username})` : username;
    return p?.affiliation && p.kind !== "org" ? `${who}, ${p.affiliation}` : who;
  };

  const items: CollectedItem[] = [];
  for (const t of details.values()) {
    const summary = summaries.get(t.id);
    const category = categoryLabel(cats, t.category_id ?? summary?.category_id);
    const first = t.posts.find((p) => p.post_number === 1);
    const author = t.author ?? summary?.op_username ?? first?.username ?? null;
    const s = scoreTopic({ author, created_at: t.created_at, like_count: t.like_count, category, posts: t.posts, start, end }, people);
    const isNew = within(t.created_at, start, end);
    const activity = t.posts.filter((p) => within(p.created_at, start, end)).map((p) => p.created_at).sort().pop() ?? summary?.last_posted_at ?? null;
    // Topic item: skip old topics whose only activity in the window is the author's own bumps
    if (isNew || s.metrics.replies_in_window > 0) {
      items.push({
        external_id: `forum:topic:${t.id}`,
        source: "forum",
        url: `${forum}/t/${t.slug}/${t.id}`,
        title: t.title,
        excerpt: first ? excerpt(htmlToText(first.cooked), 400) : null,
        author,
        author_is_key: s.author_is_key,
        author_is_official: s.author_is_official,
        category,
        kind: s.author_is_key && !s.author_is_official ? "statement" : "fact",
        source_created_at: t.created_at,
        last_activity_at: activity,
        metrics: { ...s.metrics, section: s.section, attribution: author ? attributionFor(author) : null, new_topic: isNew },
        score: s.score,
        score_breakdown: s.breakdown,
        tier: s.tier,
        single_source: s.single_source,
      });
    }
    // Key-person replies in the window → statement items (attributed)
    for (const p of t.posts) {
      const person = findPerson(people, p.username);
      if (!person || p.post_number === 1 || !within(p.created_at, start, end)) continue;
      const k = scoreKeyPost(p, person, category);
      items.push({
        external_id: `forum:post:${t.id}:${p.post_number}`,
        source: "forum",
        url: `${forum}/t/${t.slug}/${t.id}/${p.post_number}`,
        title: t.title,
        excerpt: excerpt(htmlToText(p.cooked), 400),
        author: p.username,
        author_is_key: true,
        author_is_official: person.kind === "org",
        category,
        kind: person.kind === "org" ? "fact" : "statement",
        source_created_at: p.created_at,
        last_activity_at: p.created_at,
        metrics: { likes: p.like_count, section: categoryRule(category).section, attribution: attributionFor(p.username), topic_id: t.id, post_number: p.post_number },
        score: k.score,
        score_breakdown: k.breakdown,
        tier: k.tier,
        single_source: false,
      });
    }
  }

  /* ---------------- GitHub ---------------- */
  const ghHeaders: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "zeclearn-news", "X-GitHub-Api-Version": "2022-11-28" };
  if (deps.githubToken) ghHeaders.Authorization = `Bearer ${deps.githubToken}`;
  await pool(RELEASE_REPOS, LIMITS.concurrency, async (src) => {
    for (const r of parseReleases(await get(`${gh}/repos/${src.repo}/releases?per_page=10`, { headers: ghHeaders }), src.repo)) {
      if (r.draft || !within(r.published_at, start, end)) continue;
      const s = scoreRelease(r, isMajorRelease(r.tag));
      items.push({
        external_id: `github:release:${src.repo}:${r.tag}`,
        source: "github",
        url: r.url,
        title: releaseTitle(src.label, r.name, r.tag),
        excerpt: markdownExcerpt(r.body, 400) || null,
        author: src.org,
        author_is_key: true,
        author_is_official: true,
        category: `GitHub · ${src.repo}`,
        kind: "fact",
        source_created_at: r.published_at,
        last_activity_at: r.published_at,
        metrics: { section: src.section, attribution: src.org, tag: r.tag, prerelease: r.prerelease },
        score: s.score,
        score_breakdown: s.breakdown,
        tier: s.tier,
        single_source: false,
      });
    }
  });
  for (const pr of parseMergedPulls(await get(`${gh}/repos/${ZIPS_REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=50`, { headers: ghHeaders }))) {
    if (!within(pr.merged_at, start, end)) continue;
    const s = scoreZipMerge(pr.title);
    items.push({
      external_id: `github:zips:pr:${pr.number}`,
      source: "github",
      url: pr.url || `https://github.com/${ZIPS_REPO}/pull/${pr.number}`,
      title: pr.title,
      excerpt: markdownExcerpt(pr.body, 400) || null,
      author: pr.user,
      author_is_key: !!findPerson(people, pr.user),
      author_is_official: true,
      category: `GitHub · ${ZIPS_REPO}`,
      kind: "fact",
      source_created_at: pr.merged_at,
      last_activity_at: pr.merged_at,
      metrics: { section: "zips", attribution: "zcash/zips", pr: pr.number },
      score: s.score,
      score_breakdown: s.breakdown,
      tier: s.tier,
      single_source: false,
    });
  }

  /* ---------------- Network ---------------- */
  let rpc: NetworkSnapshot | null = null;
  if (deps.rpcUrl) {
    rpc = parseBlockchainInfo(
      await get(deps.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "zeclearn", method: "getblockchaininfo", params: [] }),
      }),
    );
  }
  const explorer = rpc?.pools && rpc.height != null ? null : parseBlockchair(await get(deps.blockchairUrl || BLOCKCHAIR_STATS));
  const snapshot = mergeSnapshots(rpc, explorer);

  items.sort((a, b) => b.score - a.score);
  stats.items = items.length;
  return {
    digest_date: digestDate,
    window: { start: iso(start), end: iso(end) },
    items,
    snapshot,
    stats,
    errors,
  };
}
