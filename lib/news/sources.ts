/**
 * Gündem primary sources. Everything the collector reads is listed here.
 * Key people are NOT here: they live in the database (news_key_people) so admins can edit them.
 */

export const FORUM_BASE = "https://forum.zcashcommunity.com";
export const GITHUB_API = "https://api.github.com";
export const BLOCKCHAIR_STATS = "https://api.blockchair.com/zcash/stats";

export interface RepoSource {
  repo: string;
  /** display name in the digest */
  label: string;
  section: "nodes" | "protocol" | "wallets" | "security";
  /** owner of the repo, shown as the source */
  org: string;
}

/**
 * GitHub repositories whose releases are collected. (zcashd is end-of-life since block 3,417,100, so it is not tracked.)
 * zodl-inc/zodl-ios and zodl-inc/zodl-android are the ZODL (formerly Zashi) wallets; GitHub redirects
 * the old Electric-Coin-Company/zashi-* names. A 404 for any repo is logged in the run and skipped.
 */
export const RELEASE_REPOS: RepoSource[] = [
  { repo: "ZcashFoundation/zebra", label: "Zebra", section: "nodes", org: "Zcash Foundation" },
  { repo: "zcash/zallet", label: "Zallet", section: "wallets", org: "zcash" },
  { repo: "zcash/librustzcash", label: "librustzcash", section: "protocol", org: "zcash" },
  { repo: "zingolabs/zingolib", label: "Zingolib", section: "wallets", org: "Zingo Labs" },
  { repo: "ZcashFoundation/frost", label: "FROST", section: "protocol", org: "Zcash Foundation" },
  { repo: "zodl-inc/zodl-ios", label: "ZODL iOS", section: "wallets", org: "ZODL" },
  { repo: "zodl-inc/zodl-android", label: "ZODL Android", section: "wallets", org: "ZODL" },
];

/** Merged pull requests in this repo are collected as ZIP changes */
export const ZIPS_REPO = "zcash/zips";

/**
 * Forum category → score points + suggested digest section.
 * Matched by regex against the category name (and its parent) so renamed categories still match.
 */
export const CATEGORY_RULES: { re: RegExp; points: number; section: string }[] = [
  { re: /governance|coinholder|poll/i, points: 10, section: "governance" },
  { re: /grant/i, points: 10, section: "grants" },
  { re: /\bzips?\b|improvement proposal/i, points: 10, section: "zips" },
  { re: /zebra|zcashd|node/i, points: 8, section: "nodes" },
  { re: /zcash foundation|zfnd/i, points: 8, section: "foundation" },
  { re: /wallet/i, points: 6, section: "wallets" },
  { re: /security|vulnerab/i, points: 8, section: "security" },
  { re: /develop|engineering|protocol|research/i, points: 6, section: "protocol" },
  { re: /ecosystem|announcement/i, points: 4, section: "ecosystem" },
  { re: /community|general|events?|meetup/i, points: 2, section: "community" },
];

/** Tier thresholds (score ≥ lead → lead, ≥ brief → brief, else watch) */
export const TIERS = { lead: 60, brief: 30 } as const;

/** Collector limits (Discourse anonymous rate limits are modest) */
export const LIMITS = {
  listPages: 4,
  topicDetails: 30,
  concurrency: 4,
  userLookups: 8,
} as const;
