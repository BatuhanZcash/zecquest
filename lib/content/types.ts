/**
 * Öğren bölümünün içerik şablonu. İçerik dosyaları (lessons.ts, glossary.ts) bu tiplere uyar.
 * Metinler çok dillidir: en zorunlu, tr zorunlu; diğer diller eklenebilir (BCP-47 anahtar).
 * Her olgusal iddia `sources` içinde birincil bir kaynağa dayanmalıdır.
 */
export type Localized = { en: string; tr: string } & Record<string, string>;

export interface Source {
  title: string;
  url: string;
  /** Kaynağın kontrol edildiği tarih (YYYY-MM-DD) */
  checked: string;
}

export type LessonBlock =
  | { type: "p"; text: Localized }
  | { type: "h"; text: Localized }
  | { type: "list"; items: Localized[] }
  | { type: "callout"; tone: "info" | "warn" | "tip"; text: Localized }
  /** Sözlükteki bir terime bağlantı kartı */
  | { type: "term"; slug: string }
  /** Hazır görsel/diyagram anahtarı; Öğren sayfası bu anahtarı bir bileşenle eşler */
  | { type: "figure"; key: string; caption: Localized };

export interface LessonQuestion {
  q: Localized;
  options: Localized[];
  /** options içindeki doğru cevabın indeksi */
  answer: number;
  explain: Localized;
}

export interface Lesson {
  slug: string;
  title: Localized;
  summary: Localized;
  minutes: number;
  blocks: LessonBlock[];
  /** Ders sonu mini quiz (3–5 soru) */
  quiz: LessonQuestion[];
  sources: Source[];
}

export interface Track {
  slug: string;
  title: Localized;
  summary: Localized;
  level: "beginner" | "intermediate" | "advanced";
  lessons: Lesson[];
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  /** Kısa tanım (1–2 cümle) */
  short: Localized;
  /** Uzun açıklama (paragraflar) */
  body: Localized[];
  related: string[];
  sources: Source[];
}
