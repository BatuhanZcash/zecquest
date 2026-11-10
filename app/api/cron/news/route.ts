/**
 * Gündem daily collector. Vercel Cron calls this at 00:00 UTC (vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. It collects the last 24h from the Zcash forum, GitHub and the
 * network, scores the items and writes them with the service role (news_ingest). Nothing is published:
 * an admin composes and publishes the digest at /admin/news.
 *
 * Env: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 * Optional: ZCASH_RPC_URL (zcashd/Zebra JSON-RPC for value pools), GITHUB_TOKEN (higher rate limit),
 *           NEWS_FORUM_BASE / NEWS_GITHUB_API / NEWS_BLOCKCHAIR_URL (tests only)
 * Query: ?dry=1 → return the payload without writing; ?date=YYYY-MM-DD → collect the 24h of that UTC day.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { collect } from "@/lib/news/collect";
import type { KeyPerson } from "@/lib/news/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA = "ZecLearn-Gundem/1.0 (+https://zeclearn.com)";

async function fetchJson(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
  const u = new URL(url);
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": UA, ...(init?.headers ?? {}) };
  // fetch() refuses URLs with credentials (e.g. ZCASH_RPC_URL=https://user:pass@host): move them to a header
  if (u.username || u.password) {
    headers.Authorization = "Basic " + Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString("base64");
    u.username = "";
    u.password = "";
  }
  const res = await fetch(u, { method: init?.method ?? "GET", headers, body: init?.body, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !key) return NextResponse.json({ error: "cron_not_configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams;
  const date = q.get("date");
  let now = new Date();
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    now = new Date(`${date}T00:00:00Z`);
    now.setUTCDate(now.getUTCDate() + 1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const cfg = await sb.rpc("news_collector_config");
  if (cfg.error) return NextResponse.json({ error: "config_failed", detail: cfg.error.message }, { status: 500 });
  const people = ((cfg.data as { people?: KeyPerson[] } | null)?.people ?? []) as KeyPerson[];

  const payload = await collect(
    {
      fetchJson,
      now,
      forumBase: process.env.NEWS_FORUM_BASE,
      githubApi: process.env.NEWS_GITHUB_API,
      blockchairUrl: process.env.NEWS_BLOCKCHAIR_URL,
      githubToken: process.env.GITHUB_TOKEN,
      rpcUrl: process.env.ZCASH_RPC_URL,
    },
    { people },
  );
  if (q.get("dry") === "1") return NextResponse.json(payload);

  const res = await sb.rpc("news_ingest", { p: payload });
  if (res.error) return NextResponse.json({ error: "ingest_failed", detail: res.error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    digest_date: payload.digest_date,
    items: payload.items.length,
    snapshot: payload.snapshot ? { height: payload.snapshot.height, source: payload.snapshot.source } : null,
    errors: payload.errors,
  });
}
