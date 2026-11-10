/**
 * Server-side (node or edge) read of public Gündem RPCs with the publishable key.
 * Used for OG metadata and the share card; never uses the service role.
 */
import type { Digest } from "./types";

export async function rpcPublic<T>(fn: string, args: Record<string, unknown>, revalidate = 300): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const isDigestDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

export const fetchDigest = (date: string, lang?: string | null) =>
  isDigestDate(date) ? rpcPublic<Digest | null>("get_digest", { p_date: date, p_lang: lang || null }) : Promise.resolve(null);
