"use client";

/**
 * Zcash network status from daily snapshots (get_network_status).
 *   <NetworkStatus variant="compact" />  one-line strip for the home page / headers
 *   <NetworkStatus variant="full" />     card with pools, 24h changes and the next upgrade
 * Pass `data` to render without fetching.
 */
import { Activity, ArrowUpRight, Blocks, Shield } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import { newsApi, type NetworkStatus as NetworkStatusData } from "@/lib/api-news";
import { formatNumber, formatZec, signed } from "@/lib/news/format";

/** Pool order, colors and status notes (facts: ZIP 258 sealed Orchard at NU6.3; ZIP 2003 made Sprout unspendable at NU7) */
const POOLS = [
  { key: "ironwood", color: "#F4B728", label: "news_net_pool_ironwood", note: "news_net_pool_ironwood_note" },
  { key: "orchard", color: "#B07A06", label: "news_net_pool_orchard", note: "news_net_pool_orchard_note" },
  { key: "sapling", color: "#12A387", label: "news_net_pool_sapling", note: null },
  { key: "sprout", color: "#8A8F99", label: "news_net_pool_sprout", note: "news_net_pool_sprout_note" },
  { key: "transparent", color: "rgb(var(--soft))", label: "news_net_pool_transparent", note: null },
  { key: "lockbox", color: "#2F6FED", label: "news_net_pool_lockbox", note: null },
] as const;

function useAgo() {
  const { lang } = useI18n();
  return (iso: string) => {
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), "minute");
    if (s < 86400 * 2) return rtf.format(-Math.round(s / 3600), "hour");
    return rtf.format(-Math.round(s / 86400), "day");
  };
}

export function NetworkStatus({
  variant = "full",
  data,
  className = "",
  href,
}: {
  variant?: "compact" | "full";
  data?: NetworkStatusData | null;
  className?: string;
  /** compact only: make the strip a link (e.g. "/news") */
  href?: string;
}) {
  const q = useAsync(() => (data !== undefined ? Promise.resolve(data) : newsApi.network()), [data]);
  const s = q.data;
  if (variant === "compact") return <Compact s={s} loading={q.loading && !s} className={className} href={href} />;
  return <Full s={s} loading={q.loading && !s} error={!!q.error && !s} className={className} />;
}

function Compact({ s, loading, className, href }: { s: NetworkStatusData | null; loading: boolean; className: string; href?: string }) {
  const { t, lang } = useI18n();
  const body = (
    <>
      <span className="flex items-center gap-2 font-semibold text-ink">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {t("news_net_title")}
      </span>
      {loading ? (
        <span className="h-3.5 w-40 animate-pulse rounded bg-input" />
      ) : !s || s.height == null ? (
        <span className="text-muted">{t("news_net_no_data")}</span>
      ) : (
        <>
          <span className="tabular-nums text-muted">
            {t("news_net_block", { n: formatNumber(s.height, lang) })}
          </span>
          {s.shielded != null && (
            <span className="tabular-nums text-muted">
              <span className="text-soft">·</span> {t("news_net_shielded")} {formatZec(s.shielded, lang)} ZEC
              {s.shielded_delta_24h != null && (
                <span className={s.shielded_delta_24h >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[#E8742A]"}>
                  {" "}
                  {signed(s.shielded_delta_24h, lang, 0)}
                </span>
              )}
            </span>
          )}
          {s.next_upgrade && (
            <span className="tabular-nums text-muted">
              <span className="text-soft">·</span> {s.next_upgrade.name}{" "}
              {s.next_upgrade.blocks_left != null
                ? t("news_net_blocks_left", { n: formatNumber(s.next_upgrade.blocks_left, lang) })
                : t("news_net_at_block", { n: formatNumber(s.next_upgrade.height, lang) })}
            </span>
          )}
        </>
      )}
      {href && <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-soft" aria-hidden="true" />}
    </>
  );
  const cls = `flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-card px-4 py-2.5 text-[13.5px] ${className}`;
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-[rgb(var(--soft))]`}>
      {body}
    </Link>
  ) : (
    <div className={cls} role="status">
      {body}
    </div>
  );
}

function Full({ s, loading, error, className }: { s: NetworkStatusData | null; loading: boolean; error: boolean; className: string }) {
  const { t, lang } = useI18n();
  const ago = useAgo();
  const pools = s?.pools
    ? POOLS.filter((p) => typeof s.pools?.[p.key] === "number").map((p) => ({ ...p, value: s.pools![p.key] as number, delta: s.pools_delta_24h?.[p.key] ?? null }))
    : [];
  const total = pools.reduce((n, p) => n + p.value, 0);

  return (
    <section className={`card overflow-hidden ${className}`} aria-labelledby="net-title">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 id="net-title" className="font-display text-[16px] font-bold tracking-[-0.01em]">
          {t("news_net_title")}
        </h2>
        {s?.updated_at && <span className="ml-auto text-[12px] text-soft">{t("news_net_updated", { t: ago(s.updated_at) })}</span>}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-input" />
          <div className="h-3 w-full animate-pulse rounded bg-input" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-input" />
        </div>
      ) : error || !s || (s.height == null && !s.next_upgrade) ? (
        <p className="px-5 py-6 text-[14px] text-muted">{t("news_net_no_data")}</p>
      ) : (
        <div className="space-y-5 p-5">
          <div>
            <div className="label flex items-center gap-1.5">
              <Blocks className="h-3.5 w-3.5" aria-hidden="true" />
              {t("news_net_height")}
            </div>
            {s.height != null ? (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{formatNumber(s.height, lang)}</span>
                {s.height_24h_ago != null && (
                  <span className="text-[13px] tabular-nums text-muted">
                    +{formatNumber(s.height - s.height_24h_ago, lang)} {t("news_net_24h")}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[14px] text-muted">{t("news_net_no_data")}</p>
            )}
          </div>

          {s.height != null && (
            <div>
              <div className="label mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                {t("news_net_pools")}
              </div>
              {pools.length === 0 ? (
                <p className="text-[13.5px] text-muted">{t("news_net_no_pools")}</p>
              ) : (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-input" role="img" aria-label={pools.map((p) => `${t(p.label)} ${formatZec(p.value, lang)} ZEC`).join(", ")}>
                    {pools.map((p) => (
                      <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full [&:not(:first-child)]:border-l-2 [&:not(:first-child)]:border-card" />
                    ))}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {pools.map((p) => (
                      <div key={p.key} className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-[12.5px] text-muted">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                          {t(p.label)}
                        </dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums">
                          {formatZec(p.value, lang)} <span className="text-[12px] font-medium text-soft">ZEC</span>
                          {p.delta != null && p.delta !== 0 && (
                            <span className={`ml-1.5 text-[12px] font-medium ${p.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[#E8742A]"}`}>
                              {signed(p.delta, lang, Math.abs(p.delta) < 10 ? 2 : 0)}
                            </span>
                          )}
                        </dd>
                        {p.note && <dd className="text-[11.5px] leading-tight text-soft">{t(p.note)}</dd>}
                      </div>
                    ))}
                  </dl>
                  {s.shielded != null && (
                    <p className="mt-3 rounded-xl bg-input px-3 py-2 text-[13px] text-muted">
                      <span className="font-semibold text-ink">{t("news_net_shielded")}</span>{" "}
                      <span className="tabular-nums">{formatNumber(s.shielded, lang)} ZEC</span>
                      {s.shielded_delta_24h != null && (
                        <span className="tabular-nums">
                          {" · "}
                          <span className={s.shielded_delta_24h >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[#E8742A]"}>
                            {signed(s.shielded_delta_24h, lang, 2)} ZEC
                          </span>{" "}
                          {t("news_net_24h")}
                        </span>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {s.next_upgrade ? (
            <div className="rounded-xl bg-tint px-4 py-3">
              <div className="text-[12.5px] font-medium text-accent">{t("news_net_next")}</div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-[20px] font-extrabold tracking-[-0.02em]">{s.next_upgrade.name}</span>
                <span className="text-[13px] tabular-nums text-muted">{t("news_net_at_block", { n: formatNumber(s.next_upgrade.height, lang) })}</span>
              </div>
              {s.next_upgrade.blocks_left != null && (
                <div className="mt-1 text-[13px] font-semibold tabular-nums text-ink">{t("news_net_blocks_left", { n: formatNumber(s.next_upgrade.blocks_left, lang) })}</div>
              )}
            </div>
          ) : s.last_upgrade ? (
            <p className="text-[13px] text-muted">{t("news_net_active_since", { name: s.last_upgrade.name, n: formatNumber(s.last_upgrade.height, lang) })}</p>
          ) : null}

          <p className="text-[12px] leading-relaxed text-soft">
            {t("news_net_snapshot_note")}
            {s.source && <> {t("news_net_source", { s: s.source })}</>}
          </p>
        </div>
      )}
    </section>
  );
}
