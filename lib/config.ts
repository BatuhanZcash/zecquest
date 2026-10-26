/**
 * Site genel ayarları — isim, slogan ve sosyal linkleri buradan değiştirin.
 */
export const SITE = {
  /** Uygulama adı — henüz kesinleşmedi; değiştirmek için burayı ve public/manifest.webmanifest'i güncelleyin */
  name: "ZecQuest",
  /** Resmi Zcash logosu dosyaları (README → "Marka") */
  brand: {
    zcashMark: "/brand/zcash-mark.svg",
    zcashMarkWhite: "/brand/zcash-mark-white.svg",
  },
  tagline: { tr: "Global Zcash bilgi yarışması", en: "The global Zcash knowledge competition" },
  /** Yayındaki adres (katılım linki, QR ve paylaşım için). Boşsa tarayıcının adresi kullanılır. */
  publicUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  x: "https://x.com/zcash",
  /** Zcash blok gezgini — ödeme işlem linkleri için ({txid} yer tutucu) */
  explorerTx: "https://mainnet.zcashexplorer.app/transactions/{txid}",
  /** Kenar çubuğundaki duyuru kartı */
  promo: {
    title: { tr: "Zcash'i keşfet", en: "Explore Zcash" },
    body: {
      tr: "Gizliliği koruyan dijital para hakkında daha fazlası.",
      en: "Learn more about the privacy-protecting digital money.",
    },
    cta: { tr: "z.cash", en: "z.cash" },
    href: "https://z.cash",
  },
};

/**
 * 10 saniye kuralı: her soru için cevap süresi.
 * Asıl kural sunucuda uygulanır (supabase/migrations/0001_schema.sql → _answer_secs);
 * bu sayı yalnızca arayüz metinleri içindir, ikisini birlikte değiştirin.
 */
export const ANSWER_SECS = 10;

export function siteUrl(): string {
  if (SITE.publicUrl) return SITE.publicUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
