"use client";

import Link from "next/link";
import { useId } from "react";
import { COUNTRY_ANCHORS, LAND_PATH, MAP_H, MAP_W, project } from "@/lib/community/world";

export interface MapPoint {
  key: string;
  label: string;
  /** Kesin konum (buluşma) */
  lat?: number | null;
  lng?: number | null;
  /** Kesin konum yoksa ülke çapası */
  country?: string | null;
  count?: number;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  /** Vurgulu nokta (ör. sıradaki buluşma) yavaşça nabız atar */
  pulse?: boolean;
}

export function pointXY(p: Pick<MapPoint, "lat" | "lng" | "country">): [number, number] | null {
  if (typeof p.lat === "number" && typeof p.lng === "number") return project(p.lat, p.lng);
  if (p.country && COUNTRY_ANCHORS[p.country]) return COUNTRY_ANCHORS[p.country];
  return null;
}

/**
 * Harici harita sunucusu kullanmayan, CSP dostu dünya haritası.
 * Kara: Natural Earth kıyı çizgileri (Equal Earth projeksiyonu) üzerine nokta deseni.
 * Noktalar HTML düğmeleri olarak üstte durur; klavye ve ekran okuyucu ile erişilebilir.
 */
export function WorldMap({
  points,
  className = "",
  label,
  clusterHref,
  fit = false,
}: {
  points: MapPoint[];
  className?: string;
  label: string;
  /** Üst üste binen noktalar birleşince gidilecek adres (verilmezse ilk noktanınki) */
  clusterHref?: (country: string | null | undefined) => string;
  /** Noktaların çevresine yakınlaş (tek buluşma / tek topluluk sayfaları için) */
  fit?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  // Birbirine çok yakın noktaları tek noktada topla (ör. aynı şehirde iki buluşma)
  const clusters: { p: MapPoint; xy: [number, number] }[] = [];
  for (const p of points) {
    const xy = pointXY(p);
    if (!xy) continue;
    const near = clusters.find((c) => Math.hypot(c.xy[0] - xy[0], c.xy[1] - xy[1]) < 14);
    if (near) {
      const n = (near.p.count ?? 1) + (p.count ?? 1);
      near.p = {
        ...near.p,
        key: near.p.key + "+" + p.key,
        count: n,
        label: `${near.p.label} · ${p.label}`,
        pulse: near.p.pulse || p.pulse,
        active: near.p.active || p.active,
        href: near.p.href && clusterHref ? clusterHref(near.p.country) : near.p.href,
      };
    } else clusters.push({ p: { ...p }, xy });
  }
  // Büyük olanlar altta kalsın, küçükler tıklanabilir olsun
  const placed = clusters.sort((a, b) => (b.p.count ?? 1) - (a.p.count ?? 1));

  // Görünüm kutusu: varsayılan tüm dünya; fit ise noktaların çevresi (en fazla 4×)
  let vb = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  if (fit && placed.length) {
    const xs = placed.map((c) => c.xy[0]), ys = placed.map((c) => c.xy[1]);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    const zoom = Math.max(1, Math.min(4, MAP_W / (bw + 240), MAP_H / (bh + 140)));
    const w = MAP_W / zoom, h = MAP_H / zoom;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    vb = { x: Math.min(MAP_W - w, Math.max(0, cx - w / 2)), y: Math.min(MAP_H - h, Math.max(0, cy - h / 2)), w, h };
  }
  // Yakınlaşınca noktalar biraz büyür ama dünya ölçeğindeki dokuyu korur
  const k = Math.sqrt(vb.w / MAP_W);

  return (
    <figure className={`relative w-full select-none ${className}`} aria-label={label}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block h-auto w-full" role="img" aria-label={label}>
        <defs>
          <pattern id={`dots-${id}`} width={6.5 * k} height={6.5 * k} patternUnits="userSpaceOnUse">
            <circle cx={3.25 * k} cy={3.25 * k} r={1.45 * k} className="fill-[rgb(var(--soft))] opacity-55 dark:opacity-45" />
          </pattern>
        </defs>
        <path d={LAND_PATH} className="fill-[rgb(var(--ink))] opacity-[0.035] dark:opacity-[0.06]" />
        <path d={LAND_PATH} fill={`url(#dots-${id})`} />
      </svg>
      <ul className="absolute inset-0">
        {placed.map(({ p, xy: [x, y] }) => {
          const n = p.count ?? 1;
          const size = Math.min(32, 14 + Math.sqrt(n) * 5);
          const hit = Math.max(28, size); // dokunma alanı en az 28px
          const lx = (x - vb.x) / vb.w, ty = (y - vb.y) / vb.h;
          if (lx < 0 || lx > 1 || ty < 0 || ty > 1) return null;
          // Kenardaki noktalar kırpılmasın
          const style = { left: `${Math.min(98.5, Math.max(1.5, lx * 100))}%`, top: `${Math.min(97, Math.max(3, ty * 100))}%`, width: hit, height: hit };
          const inner = (
            <>
              {p.pulse && (
                <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: size, height: size }}>
                  <span className="absolute inset-0 animate-ping rounded-full bg-zec/50 [animation-duration:2.4s]" />
                </span>
              )}
              <span
                aria-hidden
                style={{ width: size, height: size }}
                className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-[10.5px] font-extrabold text-[#14161B] shadow-[0_0_0_2px_rgb(var(--bg-card)),0_2px_6px_rgb(0_0_0/0.25)] transition-transform group-hover:scale-110 ${
                  p.active ? "bg-ink text-card" : "bg-zec"
                }`}
              >
                {n > 1 ? n : ""}
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[12px] font-semibold text-card shadow-card group-hover:block group-focus-visible:block"
              >
                {p.label}
              </span>
            </>
          );
          const cls = "group absolute -translate-x-1/2 -translate-y-1/2 rounded-full";
          return (
            <li key={p.key}>
              {p.href ? (
                <Link href={p.href} className={cls} style={style} aria-label={p.label}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={p.onClick} className={cls} style={style} aria-label={p.label} aria-pressed={p.active}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
