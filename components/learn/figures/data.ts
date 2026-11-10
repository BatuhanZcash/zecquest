/**
 * Data behind the data-driven Learn figures.
 *
 * Source of truth: research/FACTS.md (CONTENT agent, checked 2026-11-10). Every entry below maps to a
 * bullet there; section numbers are noted inline. If FACTS.md changes, update this file: the figures
 * render whatever is in these arrays and hard-code no facts themselves.
 * Deliberately left out (FACTS.md "do not state"): exact third-halving height, migration percentages,
 * Sprout balance at NU7, upgrade ordinal numbers.
 */

/** "YYYY-MM" */
export type YM = `${number}-${number}`;

export interface PoolSegment {
  from: YM;
  /** null = still running today */
  to: YM | null;
  /** open: can receive and spend · spend-only: value can only leave · closed: funds can no longer move */
  state: "open" | "spend-only" | "closed";
}
export interface PoolLane {
  key: "transparent" | "sprout" | "sapling" | "orchard" | "ironwood";
  name: string;
  segments: PoolSegment[];
}
export interface PoolEvent {
  at: YM;
  /** Upgrade name shown on the axis (plain string, or localized when it is a word) */
  label: string | { en: string; tr: string };
}

/** Value pools over time (FACTS.md §2). */
export const VALUE_POOLS: PoolLane[] = [
  { key: "transparent", name: "Transparent", segments: [{ from: "2016-10", to: null, state: "open" }] },
  {
    key: "sprout",
    name: "Sprout",
    segments: [
      { from: "2016-10", to: "2020-11", state: "open" },
      // Canopy, ZIP 211: no new value can enter Sprout; funds can still leave
      { from: "2020-11", to: "2026-11", state: "spend-only" },
      // NU7, ZIP 2003: Sprout funds become unspendable (not burned)
      { from: "2026-11", to: null, state: "closed" },
    ],
  },
  { key: "sapling", name: "Sapling", segments: [{ from: "2018-10", to: null, state: "open" }] },
  {
    key: "orchard",
    name: "Orchard",
    segments: [
      { from: "2022-05", to: "2026-07", state: "open" },
      // NU6.3, ZIP 258: Orchard sealed; value may still leave (into Ironwood)
      { from: "2026-07", to: null, state: "spend-only" },
    ],
  },
  // NU6.3: new shielded pool with the corrected Orchard circuit
  { key: "ironwood", name: "Ironwood", segments: [{ from: "2026-07", to: null, state: "open" }] },
];

/** Upgrade markers on the value-pool axis (FACTS.md §4). */
export const POOL_EVENTS: PoolEvent[] = [
  { at: "2016-10", label: { en: "Launch", tr: "Başlangıç" } },
  { at: "2018-10", label: "Sapling" },
  { at: "2020-11", label: "Canopy" },
  { at: "2022-05", label: "NU5" },
  { at: "2026-07", label: "NU6.3" },
  { at: "2026-11", label: "NU7" },
];

export interface Upgrade {
  name: string;
  at: YM;
  /** Mainnet activation height, null if FACTS.md doesn't give one */
  height: number | null;
  /** Short highlights, English + Turkish (other languages fall back to English) */
  notes: { en: string; tr: string }[];
  /** Primary source for this entry */
  source?: string;
}

/** Network upgrades (FACTS.md §1 and §4). */
export const UPGRADES: Upgrade[] = [
  {
    name: "Overwinter",
    at: "2018-06",
    height: 347500,
    notes: [],
    source: "https://zcash.readthedocs.io/en/master/rtd_pages/nu_dev_guide.html",
  },
  {
    name: "Sapling",
    at: "2018-10",
    height: 419200,
    notes: [{ en: "The Sapling shielded pool and Sapling addresses", tr: "Sapling korumalı havuzu ve Sapling adresleri" }],
    source: "https://zips.z.cash/zip-0205",
  },
  {
    name: "Blossom",
    at: "2019-12",
    height: 653600,
    notes: [{ en: "Target block time cut from 150 to 75 seconds", tr: "Hedef blok süresi 150'den 75 saniyeye indi" }],
    source: "https://zips.z.cash/zip-0208",
  },
  {
    name: "Heartwood",
    at: "2020-07",
    height: null,
    notes: [
      { en: "Mining rewards can be paid to shielded addresses", tr: "Madencilik ödülleri korumalı adreslere ödenebilir" },
      { en: "FlyClient support", tr: "FlyClient desteği" },
    ],
    source: "https://zips.z.cash/zip-0213",
  },
  {
    name: "Canopy",
    at: "2020-11",
    height: 1046400,
    notes: [
      { en: "First halving and a new dev fund", tr: "İlk yarılanma ve yeni geliştirme fonu" },
      { en: "No new value can enter Sprout", tr: "Sprout'a yeni değer girilemez" },
    ],
    source: "https://zips.z.cash/zip-0251",
  },
  {
    name: "NU5",
    at: "2022-05",
    height: 1687104,
    notes: [
      { en: "Orchard pool with Halo 2 proofs, no trusted setup", tr: "Halo 2 ispatlı Orchard havuzu, güvenilir kurulum yok" },
      { en: "Unified addresses", tr: "Birleşik adresler" },
    ],
    source: "https://zips.z.cash/zip-0252",
  },
  {
    name: "NU6",
    at: "2024-11",
    height: 2726400,
    notes: [
      { en: "Second halving", tr: "İkinci yarılanma" },
      { en: "Dev fund extended: 8% ZCG and 12% to a lockbox", tr: "Geliştirme fonu uzatıldı: %8 ZCG ve %12 kilit kutusuna" },
    ],
    source: "https://z.cash/upgrade/nu6/",
  },
  {
    name: "NU6.1",
    at: "2025-11",
    height: 3146400,
    notes: [
      { en: "Community and coinholder funding model (ZIP 1016)", tr: "Topluluk ve coin sahibi fonlama modeli (ZIP 1016)" },
      { en: "Lockbox disbursement (ZIP 271)", tr: "Kilit kutusu ödemesi (ZIP 271)" },
    ],
    source: "https://zips.z.cash/zip-0255",
  },
  {
    name: "NU6.2",
    at: "2026-06",
    height: 3364600,
    notes: [{ en: "Fix for a soundness bug in the Orchard circuit", tr: "Orchard devresindeki bir sağlamlık hatasının düzeltmesi" }],
    source: "https://zips.z.cash/zip-0257",
  },
  {
    name: "NU6.3 Ironwood",
    at: "2026-07",
    height: 3428143,
    notes: [
      { en: "New Ironwood shielded pool", tr: "Yeni Ironwood korumalı havuzu" },
      { en: "Orchard closed to new deposits; funds can still move out", tr: "Orchard yeni girişlere kapandı; fonlar hâlâ dışarı taşınabilir" },
    ],
    source: "https://zips.z.cash/zip-0258",
  },
  {
    name: "NU7",
    at: "2026-11",
    height: 3543405,
    notes: [
      { en: "Target block time cut from 75 to 25 seconds; halving calendar unchanged", tr: "Hedef blok süresi 75'ten 25 saniyeye indi; yarılanma takvimi değişmedi" },
      { en: "60% of fees removed from circulation (NSM)", tr: "Ücretlerin %60'ı dolaşımdan çıkarılır (NSM)" },
      { en: "Sprout funds become unspendable", tr: "Sprout fonları harcanamaz hale gelir" },
    ],
    source: "https://zips.z.cash/zip-0259",
  },
];

export interface FlowPart {
  /** Dictionary key suffix for the label: learn_fig_ff_<key> */
  key: string;
  /** Percentage of the source; null = not confirmed (rendered without a number) */
  pct: number | null;
  tone: "miner" | "fund" | "reserve";
  /** Optional named sub-recipients, as % of the whole source */
  parts?: { name: string; pct: number | null }[];
}

/** Where each block's value goes today (FACTS.md §5: ZIP 1016 since NU6.1; ZIP 235 since NU7). */
export const FUNDING_FLOW: { subsidy: FlowPart[]; fees: FlowPart[] } = {
  subsidy: [
    { key: "miner", pct: 80, tone: "miner" },
    {
      key: "devfund",
      pct: 20,
      tone: "fund",
      parts: [
        { name: "Zcash Community Grants", pct: 8 },
        { name: "Coinholder-controlled fund", pct: 12 },
      ],
    },
  ],
  fees: [
    { key: "nsm", pct: 60, tone: "reserve" },
    { key: "miner", pct: 40, tone: "miner" },
  ],
};
