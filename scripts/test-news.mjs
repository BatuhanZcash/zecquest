// Gündem collector tests: parsing + scoring + the whole collect() pipeline against fixture JSON.
// Run: node scripts/test-news.mjs   (Node ≥ 22.18: TypeScript type stripping is built in)
import { register } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

// lib/news uses extensionless relative imports (bundler style); resolve them to .ts for Node
register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (/^\\.\\.?\\//.test(spec) && !/\\.[cm]?[jt]sx?$|\\.json$/.test(spec)) {
    try { return await next(spec + ".ts", ctx); } catch {}
  }
  return next(spec, ctx);
}`),
  import.meta.url,
);

const root = new URL("../lib/news/", import.meta.url);
const P = await import(new URL("parse.ts", root).href);
const S = await import(new URL("score.ts", root).href);
const C = await import(new URL("collect.ts", root).href);
const fx = (name) => JSON.parse(readFileSync(new URL(`__fixtures__/${name}`, root), "utf8"));

let pass = 0;
let fail = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
    console.log("  ✓ " + name);
  } catch (e) {
    fail++;
    console.log("  ✗ " + name + "\n      " + (e?.message ?? e).split("\n").join("\n      "));
  }
};

console.log("\n▶ parse");
t("htmlToText strips quotes/images/tags and decodes entities", () => {
  assert.equal(P.htmlToText('<p>A &amp; B</p><aside class="quote">q</aside><img src=x><p>C&#39;s &#x2014; D</p>'), "A & B\nC's — D");
});
t("excerpt cuts on a sentence or word boundary", () => {
  assert.equal(P.excerpt("One two three. Four five six seven eight nine.", 20), "One two three.");
  assert.ok(P.excerpt("word ".repeat(100), 40).endsWith("…"));
});
t("categories incl. subcategories → 'Parent / Child'", () => {
  const cats = P.parseCategories(fx("forum-categories.json"));
  assert.equal(P.categoryLabel(cats, 7), "Grants / Zcash Community Grants");
  assert.equal(P.categoryLabel(cats, 10), "Zebra");
});
t("topic list resolves original poster and decodes fancy titles", () => {
  const list = P.parseTopicList(fx("forum-latest-created-0.json"));
  const z = list.find((x) => x.id === 1001);
  assert.equal(z.op_username, "ZcashFoundation");
  assert.equal(z.title, "Zebra 7.0.0 release & NU7 support");
});
t("pinned topics do not stop paging; old last topic does", () => {
  const list = P.parseTopicList(fx("forum-latest-0.json"));
  assert.equal(P.listReachedBefore(list, "bumped_at", new Date("2026-11-05T00:00:00Z")), true);
});
t("topic + likes from actions_summary", () => {
  const tp = P.parseTopic(fx("forum-t-1001.json"));
  assert.equal(tp.author, "ZcashFoundation");
  assert.equal(tp.posts[0].like_count, 20);
});
t("user actions decode excerpt entities", () => {
  assert.match(P.parseUserActions(fx("forum-user_actions-zerodartz.json"))[0].excerpt, /I'd like/);
});
t("GitHub releases + major version detection", () => {
  const r = P.parseReleases(fx("github-releases-zebra.json"), "ZcashFoundation/zebra");
  assert.equal(r.length, 2);
  assert.equal(P.isMajorRelease("v7.0.0"), true);
  assert.equal(P.isMajorRelease("v7.0.1"), false);
  assert.equal(P.markdownExcerpt(r[0].body), "This release adds support for NU7 on Mainnet. Node operators must upgrade before activation.");
});
t("merged PRs only", () => assert.equal(P.parseMergedPulls(fx("github-zips-pulls.json")).length, 1));
t("RPC valuePools → ZEC per pool", () => {
  const s = P.parseBlockchainInfo(fx("rpc-getblockchaininfo.json"));
  assert.equal(s.height, 3543599);
  assert.deepEqual(s.pools, { transparent: 100.5, sprout: 10, sapling: 200.25, orchard: 30, ironwood: 300, lockbox: 5 });
});
t("Blockchair: height; no pool keys → pools null (never guessed)", () => {
  const s = P.parseBlockchair(fx("blockchair-stats.json"));
  assert.equal(s.height, 3543599);
  assert.equal(s.pools, null);
  const z = P.parseBlockchair({ data: { best_block_height: 5, shielded_sapling_value: 2_000_000_000_000_000 } });
  assert.equal(z.pools.sapling, 20_000_000); // zatoshi → ZEC
});
t("snapshot merge prefers RPC pools", () => {
  const m = P.mergeSnapshots(P.parseBlockchainInfo(fx("rpc-getblockchaininfo.json")), P.parseBlockchair(fx("blockchair-stats.json")));
  assert.equal(m.source, "rpc");
  assert.equal(m.pools.ironwood, 300);
});

console.log("\n▶ score");
const people = S.indexPeople([
  { username: "ZcashFoundation", kind: "org", affiliation: "Zcash Foundation" },
  { username: "str4d", kind: "protocol", affiliation: null },
  { username: "zerodartz", kind: "zcg", affiliation: "ZCG" },
]);
const start = new Date("2026-11-05T00:00:00Z");
const end = new Date("2026-11-06T00:00:00Z");
t("official account → high score, not single-source", () => {
  const tp = P.parseTopic(fx("forum-t-1001.json"));
  const s = S.scoreTopic({ ...tp, category: "Zebra", start, end }, people);
  assert.equal(s.author_is_official, true);
  assert.equal(s.single_source, false);
  assert.equal(s.tier, "lead");
  assert.deepEqual(s.breakdown.map((p) => p.key), ["official", "participants", "replies", "likes", "category", "new_topic"]);
});
t("unknown author → watch + single-source (unverified)", () => {
  const tp = P.parseTopic(fx("forum-t-1002.json"));
  const s = S.scoreTopic({ ...tp, category: "General", start, end }, people);
  assert.equal(s.tier, "watch");
  assert.equal(s.single_source, true);
});
t("key people replies raise the score; author's own posts don't count", () => {
  const tp = P.parseTopic(fx("forum-t-1003.json"));
  tp.posts = P.mergePosts(tp.posts, P.parseTopic(fx("forum-t-1003-44.json")).posts);
  const s = S.scoreTopic({ ...tp, category: "Grants / Zcash Community Grants", start, end }, people);
  assert.deepEqual(s.key_repliers.sort(), ["str4d", "zerodartz"]);
  assert.equal(s.metrics.self_bumps, 1);
  assert.equal(s.metrics.replies_in_window, 3);
  assert.equal(s.breakdown.find((p) => p.key === "key_replies").points, 24);
});
t("self-bump only → zero replies", () => {
  const tp = P.parseTopic(fx("forum-t-1004.json"));
  const s = S.scoreTopic({ ...tp, category: "Ecosystem", start, end }, people);
  assert.equal(s.metrics.replies_in_window, 0);
  assert.equal(s.metrics.self_bumps, 2);
});
t("category rules pick the most specific match", () => {
  assert.equal(S.categoryRule("Grants / Zcash Community Grants").section, "grants");
  assert.equal(S.categoryRule("Zebra").section, "nodes");
  assert.equal(S.categoryRule(null).points, 0);
});
t("tiers", () => {
  assert.equal(S.tierFor(60), "lead");
  assert.equal(S.tierFor(30), "brief");
  assert.equal(S.tierFor(29), "watch");
});

console.log("\n▶ collect (whole pipeline on fixtures)");
const FORUM = "https://forum.test";
const GH = "https://gh.test";
const routes = (url) => {
  const u = new URL(url);
  const p = u.pathname;
  if (u.host === "forum.test") {
    if (p === "/categories.json") return fx("forum-categories.json");
    if (p === "/latest.json") {
      const page = u.searchParams.get("page");
      if (page !== "0") return { users: [], topic_list: { topics: [] } };
      return fx(u.searchParams.get("order") === "created" ? "forum-latest-created-0.json" : "forum-latest-0.json");
    }
    if (p === "/user_actions.json") {
      try {
        return fx(`forum-user_actions-${u.searchParams.get("username")}.json`);
      } catch {
        return { user_actions: [] };
      }
    }
    let m = p.match(/^\/t\/(\d+)\.json$/);
    if (m) return fx(`forum-t-${m[1]}.json`);
    m = p.match(/^\/t\/(\d+)\/(\d+)\.json$/);
    if (m) return fx(`forum-t-${m[1]}-44.json`);
    m = p.match(/^\/u\/(.+)\.json$/);
    if (m) {
      try {
        return fx(`forum-u-${decodeURIComponent(m[1])}.json`);
      } catch {
        throw new Error("404");
      }
    }
  }
  if (u.host === "gh.test") {
    if (p === "/repos/ZcashFoundation/zebra/releases") return fx("github-releases-zebra.json");
    if (p === "/repos/zcash/zips/pulls") return fx("github-zips-pulls.json");
    if (p.startsWith("/repos/zodl-inc/")) throw new Error("HTTP 404");
    return [];
  }
  if (u.host === "rpc.test") return fx("rpc-getblockchaininfo.json");
  if (u.host === "chair.test") return fx("blockchair-stats.json");
  throw new Error("unexpected " + url);
};
const calls = [];
const payload = await C.collect(
  {
    now: new Date("2026-11-06T00:00:00Z"),
    forumBase: FORUM,
    githubApi: GH,
    blockchairUrl: "https://chair.test/zcash/stats",
    rpcUrl: "https://rpc.test/",
    fetchJson: async (url, init) => {
      calls.push({ url, init });
      return routes(url);
    },
  },
  {
    people: [
      { username: "ZcashFoundation", kind: "org", affiliation: "Zcash Foundation", display_name: "Zcash Foundation" },
      { username: "str4d", kind: "protocol", affiliation: null, display_name: "str4d" },
      { username: "zerodartz", kind: "zcg", affiliation: "ZCG", display_name: "zerodartz" },
      { username: "daira", kind: "protocol", affiliation: null, display_name: "daira" },
    ],
  },
);
const byId = Object.fromEntries(payload.items.map((i) => [i.external_id, i]));
t("digest date = UTC day the window starts in", () => {
  assert.equal(payload.digest_date, "2026-11-05");
  assert.equal(payload.window.start, "2026-11-05T00:00:00.000Z");
});
t("new official topic is a verified lead with excerpt from first post", () => {
  const z = byId["forum:topic:1001"];
  assert.equal(z.tier, "lead");
  assert.equal(z.single_source, false);
  assert.equal(z.url, "https://forum.test/t/zebra-7-0-0-release/1001");
  assert.match(z.excerpt, /^Zebra 7\.0\.0 is out\. It supports NU7/);
  assert.doesNotMatch(z.excerpt, /quoted text/);
});
t("unknown author's topic is flagged single-source", () => assert.equal(byId["forum:topic:1002"].single_source, true));
t("old topic re-surfaced by key-person replies (tail page fetched)", () => {
  const g = byId["forum:topic:1003"];
  assert.ok(g, "topic 1003 collected");
  assert.ok(calls.some((c) => c.url === "https://forum.test/t/1003/44.json"));
  assert.ok(g.score_breakdown.some((p) => p.key === "key_replies"));
});
t("key-person replies become attributed statements", () => {
  const s = byId["forum:post:1003:41"];
  assert.equal(s.kind, "statement");
  assert.equal(s.metrics.attribution, "Jack Grigg (str4d)");
  assert.equal(s.url, "https://forum.test/t/grants-round-proposal-discussion/1003/41");
  const z = byId["forum:post:1003:43"];
  assert.equal(z.metrics.attribution, "zerodartz, ZCG");
});
t("self-bumped old topic is not collected", () => assert.equal(byId["forum:topic:1004"], undefined));
t("release in window collected, pre-release outside window not", () => {
  const r = byId["github:release:ZcashFoundation/zebra:v7.0.0"];
  assert.equal(r.title, "Zebra 7.0.0");
  assert.equal(r.tier, "lead");
  assert.equal(byId["github:release:ZcashFoundation/zebra:v7.0.0-rc.1"], undefined);
});
t("merged ZIP PR collected", () => assert.equal(byId["github:zips:pr:1101"].metrics.section, "zips"));
t("network snapshot from RPC (POST getblockchaininfo)", () => {
  assert.equal(payload.snapshot.height, 3543599);
  assert.equal(payload.snapshot.pools.sapling, 200.25);
  const rpc = calls.find((c) => c.url === "https://rpc.test/");
  assert.equal(JSON.parse(rpc.init.body).method, "getblockchaininfo");
});
t("a failing source is logged, not fatal", () => assert.ok(payload.errors.some((e) => e.includes("zodl-inc"))));
t("items sorted by score", () => {
  const s = payload.items.map((i) => i.score);
  assert.deepEqual(s, [...s].sort((a, b) => b - a));
});
t("releaseTitle", () => {
  assert.equal(C.releaseTitle("Zebra", "v7.0.1", "v7.0.1"), "Zebra 7.0.1");
  assert.equal(C.releaseTitle("FROST", "", "frost-core-v3.0.0"), "frost-core-v3.0.0");
});

console.log("\n▶ format");
const F = await import(new URL("format.ts", root).href);
const D = {
  date: "2026-11-05",
  lang: "en",
  items: [
    { tier: "brief", title: "Other", summary: "x", kind: "fact" },
    { tier: "lead", title: "NU7 activates at block 3,543,405", summary: "word ".repeat(120).trim(), kind: "fact", attribution: null },
  ],
};
t("X post text ≤ 280 (URL counts 23) and uses the lead", () => {
  const s = F.buildPostText(D, "https://zeclearn.com/news/2026-11-05?lang=en&very=long-query-string-that-is-not-counted");
  assert.ok(F.xLength(s) <= 280, String(F.xLength(s)));
  assert.match(s, /^Zcash News · November 5, 2026\n\nNU7 activates at block 3,543,405: word/);
  assert.ok(s.endsWith("https://zeclearn.com/news/2026-11-05?lang=en&very=long-query-string-that-is-not-counted"));
});
t("statements keep their attribution in the post", () => {
  const s = F.buildPostText({ ...D, lang: "tr", items: [{ tier: "lead", title: "Görüş", summary: "Kısa.", kind: "statement", attribution: "zerodartz (ZCG)" }] }, "https://z.l/x");
  assert.match(s, /^Gündem · 5 Kasım 2026\n\nGörüş \(zerodartz \(ZCG\) açıklaması\): Kısa\./);
});
t("relatedHref: glossary term vs lesson path", () => {
  assert.equal(F.relatedHref("shielded-pool"), "/glossary/shielded-pool");
  assert.equal(F.relatedHref("basics/what-is-zcash"), "/learn/basics/what-is-zcash");
  assert.equal(F.relatedHref("javascript:alert(1)"), null);
});
t("section labels in digest language", () => {
  assert.equal(F.sectionLabel("upgrade", "tr"), "Ağ yükseltmesi");
  assert.equal(F.sectionLabel("upgrade", "es"), "Network upgrade");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (process.env.NEWS_PAYLOAD_OUT) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.NEWS_PAYLOAD_OUT, JSON.stringify(payload, null, 1));
}
process.exit(fail ? 1 : 0);
