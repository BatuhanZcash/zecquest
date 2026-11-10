"use client";

/**
 * Ana sayfanın diğer bölümlerden aldığı veriler için küçük adaptörler.
 * Her adaptör, kaynak henüz yoksa (RPC tanımsız, içerik dosyası yok) null/boş döner; sayfa boş durumu gösterir.
 * Sözleşmeler (NEWS ile uzlaşılacak):
 *   get_latest_digest()  → { date: 'YYYY-MM-DD', title: LocalText, items: [{ title, summary, section, url }] } | null
 *   get_network_status() → { height: int, pools: { <pool>: number(ZEC) | {zec|value|balance: number} },
 *                            next_upgrade: { name, height } | null, updated_at: timestamptz } | null
 */
import { supabase } from "./supabase";
import type { LocalText } from "./types";
import type { Track } from "./content/types";

export interface DigestItem {
  title: LocalText;
  summary: LocalText | null;
  section: LocalText | null;
  url: string | null;
}
export interface Digest {
  date: string;
  title: LocalText;
  items: DigestItem[];
}
export interface NetworkStatus {
  height: number | null;
  pools: { key: string; zec: number }[];
  nextUpgrade: { name: string; height: number } | null;
  updatedAt: string | null;
}

async function tryRpc<T>(fn: string): Promise<T | null> {
  try {
    const { data, error } = await supabase.rpc(fn);
    if (error) return null;
    return (data ?? null) as T | null;
  } catch {
    return null;
  }
}

const isText = (v: unknown): v is LocalText =>
  (typeof v === "string" && v.trim().length > 0) || (!!v && typeof v === "object" && !Array.isArray(v));

export async function getLatestDigest(): Promise<Digest | null> {
  const raw = await tryRpc<Record<string, unknown>>("get_latest_digest");
  if (!raw || typeof raw !== "object" || !isText(raw.title)) return null;
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    date: typeof raw.date === "string" ? raw.date : "",
    title: raw.title as LocalText,
    items: items
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && isText((i as Record<string, unknown>).title))
      .map((i) => ({
        title: i.title as LocalText,
        summary: isText(i.summary) ? (i.summary as LocalText) : null,
        section: isText(i.section) ? (i.section as LocalText) : null,
        url: typeof i.url === "string" && /^(https:\/\/|\/)/.test(i.url) ? i.url : null,
      })),
  };
}

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

export async function getNetworkStatus(): Promise<NetworkStatus | null> {
  const raw = await tryRpc<Record<string, unknown>>("get_network_status");
  if (!raw || typeof raw !== "object") return null;
  const pools: { key: string; zec: number }[] = [];
  if (raw.pools && typeof raw.pools === "object") {
    for (const [key, v] of Object.entries(raw.pools as Record<string, unknown>)) {
      const n = num(v) ?? (v && typeof v === "object" ? num((v as Record<string, unknown>).zec ?? (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).balance) : null);
      if (n !== null && n >= 0) pools.push({ key, zec: n });
    }
  }
  const nu = raw.next_upgrade as Record<string, unknown> | null | undefined;
  const nuHeight = nu ? num(nu.height) : null;
  const status: NetworkStatus = {
    height: num(raw.height),
    pools,
    nextUpgrade: nu && typeof nu.name === "string" && nuHeight !== null ? { name: nu.name, height: nuHeight } : null,
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
  if (status.height === null && pools.length === 0) return null;
  return status;
}

/**
 * Öğren parkurları (CONTENT'in lib/content/lessons.ts dosyası). Dosya henüz yoksa boş liste.
 * require.context, dosya yokken derlemeyi bozmaz ve içeriği ayrı bir parça olarak tembel yükler.
 */
export async function loadTracks(): Promise<Track[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — webpack'e özgü
    const ctx = require.context("./content", false, /^\.\/lessons\.ts$/, "lazy");
    const keys: string[] = ctx.keys();
    if (!keys.length) return [];
    const mod = await ctx(keys[0]);
    return Array.isArray(mod?.TRACKS) ? (mod.TRACKS as Track[]) : [];
  } catch {
    return [];
  }
}

/** Kullanıcının kaldığı yer: tamamladığı son dersin parkurunda sıradaki ders */
export function nextLesson(tracks: Track[], done: { source: string; ref: string }[]) {
  const finished = new Set(done.filter((d) => d.source === "lesson").map((d) => d.ref));
  const lastDone = [...done].reverse().find((d) => d.source === "lesson");
  const ordered = lastDone
    ? [...tracks].sort((a, b) => Number(b.lessons.some((l) => l.slug === lastDone.ref)) - Number(a.lessons.some((l) => l.slug === lastDone.ref)))
    : tracks;
  for (const tr of ordered) {
    const i = tr.lessons.findIndex((l) => !finished.has(l.slug));
    if (i >= 0 && (lastDone ? true : i === 0)) {
      const done = tr.lessons.filter((l) => finished.has(l.slug)).length;
      return { track: tr, lesson: tr.lessons[i], index: i, done, total: tr.lessons.length };
    }
  }
  return null;
}
