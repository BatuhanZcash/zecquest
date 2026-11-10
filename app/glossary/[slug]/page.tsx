import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GLOSSARY, findTerm } from "@/lib/learn";
import { GlossaryTermView } from "@/components/learn/GlossaryTermView";

export const dynamicParams = false;

export function generateStaticParams() {
  return GLOSSARY.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = findTerm(params.slug);
  if (!g) return {};
  const title = `${g.term}: what it means in Zcash`;
  const description = g.short.en;
  return {
    title,
    description,
    alternates: { canonical: `/glossary/${g.slug}` },
    openGraph: { type: "article", title, description, url: `/glossary/${g.slug}` },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const g = findTerm(params.slug);
  if (!g) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: g.term,
    description: g.short.en,
    url: `/glossary/${g.slug}`,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: "Zcash glossary", url: "/glossary" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <GlossaryTermView slug={params.slug} />
    </>
  );
}
