"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Gamepad2, Newspaper, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Digest, NetworkStatus } from "@/lib/home-data";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Ana sayfanın kalbi: altın zeminde günün gündemi (ZecLearn Gündem kartının dili),
 * yanında mürekkep renginde ağ durumu. Veri yoksa marka girişi ve dürüst boş durum.
 */
export function HomeHero({ digest, network, loading }: { digest: Digest | null; network: NetworkStatus | null; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-[28px] bg-zec text-[#14161B]">
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-10 lg:p-10">
        <div className="min-w-0 lg:py-2">{loading ? <DigestSkeleton /> : digest ? <DigestBlock d={digest} /> : <Intro />}</div>
        <NetworkCard status={network} loading={loading} />
      </div>
    </section>
  );
}

function DigestBlock({ d }: { d: Digest }) {
  const { t, lt, lang } = useI18n();
  const isToday = d.date === todayIso();
  const date = d.date
    ? new Date(d.date + "T12:00:00").toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { weekday: "long", day: "numeric", month: "long" })
    : "";
  return (
    <div>
      <p className="flex flex-wrap items-center gap-x-2 text-[14px] font-semibold text-[#14161B]/70">
        <Newspaper className="h-4 w-4" />
        {isToday ? t("home_today_in_zcash") : t("home_latest_digest")}
        {date && <span className="font-medium text-[#14161B]/55">{date}</span>}
      </p>
      <h1 dir="auto" className="mt-3 font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[48px] lg:text-[56px]">
        {lt(d.title)}
      </h1>
      {d.items.length > 0 && (
        <ul className="mt-6 divide-y divide-[#14161B]/15 border-y border-[#14161B]/15">
          {d.items.slice(0, 3).map((it, i) => {
            const body = (
              <>
                <span className="text-[13px] font-semibold text-[#14161B]/60 sm:w-[120px] sm:shrink-0 sm:pt-[3px]">{lt(it.section)}</span>
                <span className="min-w-0">
                  <span dir="auto" className="block font-display text-[17px] font-bold leading-snug tracking-[-0.01em] group-hover:underline">
                    {lt(it.title)}
                  </span>
                  {it.summary && (
                    <span dir="auto" className="mt-0.5 line-clamp-2 block text-[14.5px] leading-relaxed text-[#14161B]/75">
                      {lt(it.summary)}
                    </span>
                  )}
                </span>
              </>
            );
            const cls = "group flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-4";
            return (
              <li key={i}>
                {it.url ? (
                  it.url.startsWith("/") ? (
                    <Link href={it.url} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className={cls}>
                      {body}
                    </a>
                  )
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={d.date ? `/news/${d.date}` : "/news"} className="btn bg-[#14161B] px-5 py-3 text-[15px] text-white hover:bg-[#2A2E37]">
          {t("home_read_digest")}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/news" className="btn border-2 border-[#14161B] px-5 py-[10px] text-[15px] hover:bg-[#14161B]/[0.07]">
          {t("home_all_news")}
        </Link>
      </div>
    </div>
  );
}

/** Gündem henüz yoksa: sitenin ne olduğunu söyleyen giriş */
function Intro() {
  const { t } = useI18n();
  const doors = [
    { href: "/news", icon: Newspaper, label: t("home_nav_news"), sub: t("home_door_news") },
    { href: "/learn", icon: BookOpen, label: t("home_nav_learn"), sub: t("home_door_learn") },
    { href: "/games", icon: Gamepad2, label: t("home_nav_play"), sub: t("home_door_play") },
    { href: "/community", icon: Users, label: t("home_nav_community"), sub: t("home_door_community") },
  ];
  return (
    <div>
      <p className="text-[14px] font-semibold text-[#14161B]/70">{t("home_intro_kicker")}</p>
      <h1 className="mt-3 font-display text-[38px] font-extrabold leading-[1.0] tracking-[-0.035em] sm:text-[54px] lg:text-[62px]">{t("home_intro_title")}</h1>
      <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-[#14161B]/75 sm:text-[17px]">{t("home_intro_sub")}</p>
      <ul className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#14161B]/15 sm:grid-cols-4">
        {doors.map(({ href, icon: I, label, sub }) => (
          <li key={href} className="bg-zec">
            <Link href={href} className="group flex h-full flex-col gap-1 p-4 transition-colors hover:bg-[#14161B]/[0.06]">
              <I className="h-5 w-5" />
              <span className="mt-2 font-display text-[17px] font-bold">{label}</span>
              <span className="text-[13px] leading-snug text-[#14161B]/70">{sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DigestSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-4 w-40 rounded bg-[#14161B]/10" />
      <div className="h-12 w-4/5 rounded-lg bg-[#14161B]/10" />
      <div className="h-12 w-3/5 rounded-lg bg-[#14161B]/10" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-[#14161B]/[0.07]" />
        ))}
      </div>
    </div>
  );
}

/* ---------- Ağ durumu ---------- */
// Bilinen havuzların sabit renkleri (en yeni korumalı havuz en parlak); bilinmeyenler gri tonlarından
const POOL_COLOR: Record<string, string> = {
  ironwood: "#F4B728",
  orchard: "#F7D27A",
  sapling: "#C9A24A",
  transparent: "#8A90A0",
  sprout: "#4A505E",
};
const EXTRA_COLORS = ["#B7BBC6", "#6E7482", "#3E4350"];
const poolColor = (k: string, i: number) => POOL_COLOR[k.toLowerCase()] ?? EXTRA_COLORS[i % EXTRA_COLORS.length];
/** Durum notu: FACTS.md §2 — Sprout NU7'den beri harcanamaz, Orchard NU6.3'ten beri yeni girişe kapalı */
const POOL_NOTE: Record<string, "home_pool_sprout" | "home_pool_orchard"> = { sprout: "home_pool_sprout", orchard: "home_pool_orchard" };

function NetworkCard({ status, loading }: { status: NetworkStatus | null; loading: boolean }) {
  const { t, fmt, lang } = useI18n();
  const s = status;
  const total = s?.pools.reduce((a, p) => a + p.zec, 0) ?? 0;
  const pools = [...(s?.pools ?? [])].sort((a, b) => b.zec - a.zec);
  const up = s?.nextUpgrade;
  const left = up && s?.height != null ? up.height - s.height : null;
  const ago = s?.updatedAt ? relTime(s.updatedAt, lang) : null;

  return (
    <aside aria-labelledby="net-h" className="flex flex-col rounded-[22px] bg-[#14161B] p-5 text-white sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="net-h" className="flex items-center gap-2 text-[14px] font-semibold text-white/70">
          <span className={`h-2 w-2 rounded-full ${s ? "bg-emerald-400 shadow-[0_0_0_4px_rgb(52_211_153/0.15)]" : "bg-white/30"}`} />
          {t("home_network")}
        </h2>
        {ago && <span className="text-[12.5px] text-white/45">{t("home_updated", { ago })}</span>}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3" aria-hidden>
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-10 w-48 rounded bg-white/10" />
          <div className="mt-6 h-3 rounded bg-white/10" />
        </div>
      ) : !s ? (
        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="font-display text-[19px] font-bold leading-snug">{t("home_network_empty")}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/60">{t("home_network_empty_sub")}</p>
          <Link href="/learn" className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-zec hover:underline">
            {t("home_network_learn")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {s.height != null && (
            <div className="mt-5">
              <p className="text-[13px] text-white/55">{t("home_block_height")}</p>
              <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.02em] text-zec tabular-nums sm:text-[46px]">{fmt(s.height)}</p>
            </div>
          )}

          {up && (
            <div className="mt-5 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <p className="text-[13px] text-white/55">{left != null && left <= 0 ? t("home_upgrade_active") : t("home_next_upgrade")}</p>
              <p className="mt-0.5 font-display text-[19px] font-bold">{up.name}</p>
              <p className="mt-0.5 text-[13.5px] tabular-nums text-white/70">
                {left != null && left > 0
                  ? t("home_upgrade_at", { h: fmt(up.height), n: fmt(left) })
                  : t("home_upgrade_since", { h: fmt(up.height) })}
              </p>
            </div>
          )}

          {pools.length > 0 && total > 0 && (
            <div className="mt-5">
              <p className="text-[13px] text-white/55">{t("home_pools")}</p>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                {pools.map((p, i) => (
                  <span key={p.key} style={{ width: `${(p.zec / total) * 100}%`, background: poolColor(p.key, i) }} className="h-full first:rounded-l-full last:rounded-r-full" />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {pools.map((p, i) => {
                  const note = POOL_NOTE[p.key.toLowerCase()];
                  return (
                    <li key={p.key} className="flex items-baseline gap-2">
                      <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-sm" style={{ background: poolColor(p.key, i) }} />
                      <span className="capitalize text-white/80">{p.key.toLowerCase() === "transparent" ? t("home_pool_transparent") : p.key}</span>
                      {note && <span className="truncate text-[12px] text-white/45">{t(note)}</span>}
                      <span className="ml-auto shrink-0 tabular-nums font-semibold">{compactZec(p.zec, lang)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Link href="/news" className="mt-auto inline-flex items-center gap-1 pt-5 text-[13.5px] font-semibold text-zec hover:underline">
            {t("home_network_more")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </aside>
  );
}

function compactZec(n: number, lang: string) {
  return `${new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)} ZEC`;
}

export function relTime(iso: string, lang: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "tr" ? "tr" : "en", { numeric: "auto" });
  if (!Number.isFinite(s)) return null;
  if (Math.abs(s) < 60) return rtf.format(-s, "second");
  if (Math.abs(s) < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}
