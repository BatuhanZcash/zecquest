import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRACKS, findLesson } from "@/lib/learn";
import { LessonView } from "@/components/learn/LessonView";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.flatMap((t) => t.lessons.map((l) => ({ track: t.slug, lesson: l.slug })));
}

export function generateMetadata({ params }: { params: { track: string; lesson: string } }): Metadata {
  const f = findLesson(params.track, params.lesson);
  if (!f) return {};
  const url = `/learn/${f.track.slug}/${f.lesson.slug}`;
  const title = f.lesson.title.en;
  const description = f.lesson.summary.en;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description, url },
  };
}

export default function Page({ params }: { params: { track: string; lesson: string } }) {
  const f = findLesson(params.track, params.lesson);
  if (!f) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: f.lesson.title.en,
    description: f.lesson.summary.en,
    timeRequired: `PT${f.lesson.minutes}M`,
    educationalLevel: f.track.level,
    inLanguage: Object.keys(f.lesson.title),
    isPartOf: { "@type": "Course", name: f.track.title.en },
    citation: f.lesson.sources.map((s) => s.url),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LessonView trackSlug={params.track} lessonSlug={params.lesson} />
    </>
  );
}
