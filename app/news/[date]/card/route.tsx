/**
 * Share card for X / OG: 1080×1350 (4:5) PNG per digest + language.
 *   /news/2026-11-05/card            base language
 *   /news/2026-11-05/card?lang=tr    a translation (falls back per item)
 * Fonts: static instances of the site's Bricolage Grotesque + Figtree (latin + latin-ext), generated
 * from @fontsource-variable by scripts/og-fonts.py (satori cannot read WOFF2 / variable fonts).
 */
import { ImageResponse } from "next/og";
import { fetchDigest } from "@/lib/news/server";
import { formatDigestDate, leadOf, newsText, sectionLabel } from "@/lib/news/format";
import type { Digest, DigestItem } from "@/lib/news/types";

export const runtime = "edge";

// latin + latin-ext are separate files; satori falls back along the family list per glyph
const BRICO = "Brico, BricoX, Symbols";
const FIG = "Fig, FigX, Symbols";

const W = 1080;
const H = 1350;
const GOLD = "#F4B728";
const INK = "#1A1506";
const BG = "#14161B";

// Literal URLs so the bundler ships each font file with the edge function
const FONT_FILES = [
  { name: "Brico", weight: 800, url: new URL("../../../../lib/news/og-fonts/brico-800-latin.ttf", import.meta.url) },
  { name: "BricoX", weight: 800, url: new URL("../../../../lib/news/og-fonts/brico-800-latin-ext.ttf", import.meta.url) },
  { name: "Brico", weight: 700, url: new URL("../../../../lib/news/og-fonts/brico-700-latin.ttf", import.meta.url) },
  { name: "BricoX", weight: 700, url: new URL("../../../../lib/news/og-fonts/brico-700-latin-ext.ttf", import.meta.url) },
  { name: "Fig", weight: 500, url: new URL("../../../../lib/news/og-fonts/figtree-500-latin.ttf", import.meta.url) },
  { name: "FigX", weight: 500, url: new URL("../../../../lib/news/og-fonts/figtree-500-latin-ext.ttf", import.meta.url) },
  { name: "Fig", weight: 700, url: new URL("../../../../lib/news/og-fonts/figtree-700-latin.ttf", import.meta.url) },
  { name: "FigX", weight: 700, url: new URL("../../../../lib/news/og-fonts/figtree-700-latin-ext.ttf", import.meta.url) },
  // arrows / ≈ / × that the site fonts don't cover (DejaVu Sans Bold subset, see scripts/og-fonts.py)
  { name: "Symbols", weight: 700, url: new URL("../../../../lib/news/og-fonts/symbols.ttf", import.meta.url) },
] as const;

let fontCache: Promise<{ name: string; weight: 500 | 700 | 800; style: "normal"; data: ArrayBuffer }[]> | null = null;
function loadFonts() {
  fontCache ??= Promise.all(
    FONT_FILES.map(async (f) => ({ name: f.name, weight: f.weight, style: "normal" as const, data: await fetch(f.url).then((r) => r.arrayBuffer()) })),
  ).catch((e) => {
    fontCache = null;
    throw e;
  });
  return fontCache;
}

/** rough line estimate for layout budgeting */
const lines = (text: string, size: number, width: number, em = 0.52) => Math.max(1, Math.ceil((text.length * size * em) / width));
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

function titleSize(t: string) {
  const n = t.length;
  return n <= 11 ? 132 : n <= 16 ? 112 : n <= 24 ? 92 : n <= 40 ? 74 : 62;
}

function Card({ d }: { d: Digest }) {
  const lang = d.lang;
  const lead = leadOf(d);
  const others = d.items.filter((i) => i !== lead && i.tier !== "watch").concat(d.items.filter((i) => i !== lead && i.tier === "watch"));

  // ---- budget: hero + as many items (max 3) as fit ----
  const heroW = W - 80 - 96;
  const tSize = lead ? titleSize(lead.title) : 92;
  const tLines = lead ? Math.min(3, lines(lead.title, tSize, heroW, 0.56)) : 0;
  const sumText = lead ? clip(lead.summary, 220) : "";
  const sLines = lead ? Math.min(3, lines(sumText, 30, 820, 0.5)) : 0;
  const heroH = lead ? 90 + 34 + tLines * tSize * 0.92 + 18 + sLines * 39 + (lead.facts.length ? 30 + 128 : 0) : 0;
  let budget = H - 100 - 44 - heroH - 34 - 80;
  const shown: { item: DigestItem; tl: number; sl: number }[] = [];
  for (const it of others.slice(0, 3)) {
    const tl = Math.min(2, lines(it.title, 38, 760, 0.56));
    const sl = Math.min(2, lines(it.summary, 24, 760, 0.5));
    const h = 48 + tl * 41 + 8 + sl * 33;
    if (h > budget) {
      // try without summary lines beyond one
      const h1 = 48 + tl * 41 + 8 + 33;
      if (h1 > budget) break;
      shown.push({ item: it, tl, sl: 1 });
      budget -= h1;
      continue;
    }
    shown.push({ item: it, tl, sl });
    budget -= h;
  }

  const sources = d.sources.length ? d.sources.join(", ") : "";

  return (
    <div style={{ width: W, height: H, background: BG, color: "#ECEEF2", display: "flex", flexDirection: "column", fontFamily: FIG, position: "relative" }}>
      {/* top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "56px 64px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: BRICO, fontWeight: 700, fontSize: 30, letterSpacing: "-0.01em" }}>
          <svg width="44" height="44" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill={GOLD} />
            <path fill={INK} d="M10.992 4.418h2.014v2.014l3.275-.002v1.826l-5.08 6.889h5.08v2.423h-3.275v2.006h-2.012v-2.006H7.72v-1.826l5.074-6.888H7.719V6.432h3.273V4.418z" />
          </svg>
          <span>{`ZecLearn ${newsText("news_nav", lang)}`}</span>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#9AA1AD", fontWeight: 500 }}>
          {`${formatDigestDate(d.date, lang)} · ${newsText("news_last_24h", lang)}`}
        </div>
      </div>

      {/* hero */}
      {lead && (
        <div style={{ margin: "44px 40px 0", background: GOLD, color: INK, borderRadius: 28, padding: "44px 48px 46px", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 24, opacity: 0.75 }}>{sectionLabel(lead.section, lang)}</div>
            {lead.badge && (
              <div style={{ fontFamily: BRICO, fontWeight: 700, fontSize: 22, border: `2px solid ${INK}`, borderRadius: 999, padding: "6px 16px" }}>{lead.badge}</div>
            )}
          </div>
          <div style={{ fontFamily: BRICO, fontWeight: 800, fontSize: tSize, lineHeight: 0.92, letterSpacing: tSize >= 100 ? "-0.04em" : "-0.03em", margin: "10px 0 18px", display: "block", lineClamp: 3 }}>
            {lead.title}
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.3, fontWeight: 700, maxWidth: 840, display: "block", lineClamp: 3 }}>{sumText}</div>
          {lead.facts.length > 0 && (
            <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
              {lead.facts.slice(0, 3).map((f, i) => (
                <div key={i} style={{ flex: 1, background: INK, color: GOLD, borderRadius: 16, padding: "16px 20px", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontFamily: BRICO, fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{f.value}</div>
                  <div style={{ color: "#E8DDBF", fontSize: 19, marginTop: 8, lineHeight: 1.25, display: "block", lineClamp: 3 }}>{f.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* items */}
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 64px 0" }}>
        {shown.map(({ item, sl }) => (
          <div key={item.id} style={{ display: "flex", gap: 24, padding: "24px 0", borderTop: "1px solid #2A2F38" }}>
            <div style={{ width: 170, flexShrink: 0, fontWeight: 700, fontSize: 20, color: GOLD, paddingTop: 6 }}>{sectionLabel(item.section, lang)}</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontFamily: BRICO, fontWeight: 700, fontSize: 38, lineHeight: 1.08, letterSpacing: "-0.015em", display: "block", lineClamp: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 24, lineHeight: 1.38, color: "#B7BDC8", marginTop: 8, display: "block", lineClamp: sl }}>
                {clip(`${item.kind === "statement" && item.attribution ? `${item.attribution}: ` : ""}${item.summary}`, Math.floor((sl * 760) / (24 * 0.53)))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 21, color: "#7D8592", gap: 24 }}>
        <div style={{ display: "block", lineClamp: 1, maxWidth: 760 }}>{sources ? `${newsText("news_sources", lang)}: ${sources}` : ""}</div>
        <div style={{ color: "#ECEEF2", fontWeight: 700 }}>zeclearn.com</div>
      </div>
    </div>
  );
}

export async function GET(req: Request, { params }: { params: { date: string } }) {
  const lang = new URL(req.url).searchParams.get("lang");
  const d = await fetchDigest(params.date, lang);
  if (!d || d.status !== "published") return new Response("Not found", { status: 404 });
  return new ImageResponse(<Card d={d} />, {
    width: W,
    height: H,
    fonts: await loadFonts(),
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
