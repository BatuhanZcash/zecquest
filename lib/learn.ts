/**
 * Learn section helpers: pure functions over the static content (no React, safe on the server).
 * Text resolves by language with a fallback to English.
 */
import { TRACKS } from "./content/lessons";
import { GLOSSARY } from "./content/glossary";
import type { GlossaryTerm, Lesson, LessonBlock, Localized, Track } from "./content/types";

export { TRACKS, GLOSSARY };

/** Resolve localized text: requested language → English → Turkish → first available. */
export function pick(text: Localized | null | undefined, lang: string): string {
  if (!text) return "";
  return text[lang] || text.en || text.tr || Object.values(text)[0] || "";
}

export const LEVEL_ORDER: Track["level"][] = ["beginner", "intermediate", "advanced"];

export function findTrack(slug: string): Track | undefined {
  return TRACKS.find((t) => t.slug === slug);
}

export function findLesson(trackSlug: string, lessonSlug: string): { track: Track; lesson: Lesson; index: number } | undefined {
  const track = findTrack(trackSlug);
  if (!track) return undefined;
  const index = track.lessons.findIndex((l) => l.slug === lessonSlug);
  return index < 0 ? undefined : { track, lesson: track.lessons[index], index };
}

export interface LessonRef {
  track: Track;
  lesson: Lesson;
}

/** All lessons in reading order (tracks in file order). */
export function allLessons(): LessonRef[] {
  return TRACKS.flatMap((track) => track.lessons.map((lesson) => ({ track, lesson })));
}

/** Previous / next lesson across track boundaries. */
export function neighbours(trackSlug: string, lessonSlug: string): { prev?: LessonRef; next?: LessonRef } {
  const all = allLessons();
  const i = all.findIndex((r) => r.track.slug === trackSlug && r.lesson.slug === lessonSlug);
  return { prev: i > 0 ? all[i - 1] : undefined, next: i >= 0 && i < all.length - 1 ? all[i + 1] : undefined };
}

export function trackMinutes(track: Track): number {
  return track.lessons.reduce((s, l) => s + (l.minutes || 0), 0);
}

export const lessonHref = (trackSlug: string, lessonSlug: string) => `/learn/${trackSlug}/${lessonSlug}`;

/**
 * Languages a lesson is offered in besides the UI languages. A language counts as
 * available when the lesson title has that key (content convention); missing blocks fall back to English.
 */
export function lessonLanguages(lesson: Lesson): string[] {
  return Object.keys(lesson.title).filter((k) => !!lesson.title[k]);
}

/** Section headings, used for the outline and anchors. */
export function lessonOutline(lesson: Lesson, lang: string): { id: string; text: string }[] {
  return lesson.blocks
    .map((b, i) => (b.type === "h" ? { id: `s-${i}`, text: pick(b.text, lang) } : null))
    .filter((x): x is { id: string; text: string } => !!x);
}

/* ---------------- Glossary ---------------- */

const BY_SLUG = new Map(GLOSSARY.map((g) => [g.slug, g]));
export function findTerm(slug: string): GlossaryTerm | undefined {
  return BY_SLUG.get(slug);
}

/** Lowercase, strip accents and fold Turkish dotted/dotless i so search is forgiving. */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase("en")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ֐-ۿ぀-鿿]+/g, " ")
    .trim();
}

/** Glossary search: term name ranks first, then the short definition in the UI language and English. */
export function searchGlossary(query: string, lang: string): GlossaryTerm[] {
  const q = fold(query);
  if (!q) return sortedGlossary();
  const scored: [number, GlossaryTerm][] = [];
  for (const g of GLOSSARY) {
    const name = fold(g.term);
    const def = fold(`${pick(g.short, lang)} ${g.short.en}`);
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.split(" ").some((w) => w.startsWith(q))) score = 60;
    else if (name.includes(q)) score = 50;
    else if (fold(g.slug.replace(/-/g, " ")).includes(q)) score = 40;
    else if (q.split(" ").every((w) => def.includes(w))) score = 20;
    if (score) scored.push([score, g]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].term.localeCompare(b[1].term)).map((x) => x[1]);
}

export function sortedGlossary(): GlossaryTerm[] {
  return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
}

/** First character used for A–Z grouping (digits and symbols go under "#"). */
export function initialOf(term: string): string {
  const c = fold(term).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

function blockMentions(b: LessonBlock, slug: string, needle: string): boolean {
  if (b.type === "term") return b.slug === slug;
  if (!needle) return false;
  const texts = b.type === "list" ? b.items.map((i) => i.en) : b.type === "figure" ? [b.caption.en] : [b.text.en];
  return texts.some((t) => new RegExp(`(^|[^a-z0-9])${needle}`, "i").test(t));
}

/** Lessons that embed a term card for this term or mention it by name (English text). */
export function lessonsUsingTerm(term: GlossaryTerm): LessonRef[] {
  const needle = term.term.length >= 4 ? term.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  return allLessons().filter(({ lesson }) => lesson.blocks.some((b) => blockMentions(b, term.slug, needle)));
}

/** Pass mark for a lesson quiz: 3 of 4, i.e. 75% rounded up. */
export function passMark(total: number): number {
  return Math.max(1, Math.ceil(total * 0.75));
}
