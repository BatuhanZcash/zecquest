import type { EditableQuiz, LocalText } from "./types";

/** Başlıktan URL dostu slug üretir */
export function slugify(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function text(v: unknown): LocalText {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return { tr: String(o.tr ?? ""), en: String(o.en ?? "") };
  }
  return "";
}

function first(t: LocalText) {
  return typeof t === "string" ? t : t.tr || t.en || "";
}

/**
 * samples/ klasöründeki biçimi (ve eski sürümün JSON'larını) stüdyo modeline çevirir.
 * Tek quiz nesnesi ya da quiz dizisi kabul eder.
 */
export function parseQuizJson(raw: string): EditableQuiz[] {
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : [data];
  return list.map((q: any, i: number) => {
    const title = text(q.title);
    const slug = slugify(String(q.slug ?? q.id ?? first(title) ?? `quiz-${i + 1}`)) || `quiz-${Date.now()}-${i}`;
    if (!Array.isArray(q.questions) || q.questions.length === 0) throw new Error(`questions_required (${slug})`);
    return {
      slug,
      title,
      description: q.description ? text(q.description) : null,
      icon: typeof q.icon === "string" ? q.icon : "shield",
      tags: Array.isArray(q.tags) ? q.tags.map(String).slice(0, 6) : [],
      default_time: Number(q.default_time ?? q.defaultTime ?? 20) || 20,
      questions: q.questions.map((x: any) => ({
        text: text(x.text),
        options: (x.options ?? []).map(text),
        correct: Number(x.correct ?? 0),
        time_limit: x.time_limit ?? x.time ?? null,
        explanation: x.explanation ? text(x.explanation) : null,
      })),
    };
  });
}
