import type { Metadata } from "next";
import { fetchDigest } from "@/lib/news/server";
import { formatDigestDate, leadOf, newsText } from "@/lib/news/format";

type Props = { params: { date: string } };

/** OG / X meta for a digest (base language): title, lead summary and the 1080×1350 share card */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await fetchDigest(params.date, null);
  const l = d?.lang ?? "en";
  const when = formatDigestDate(params.date, l);
  const name = newsText("news_title", l);
  const title = d ? `${d.title} · ${name}, ${when}` : `${name} · ${when}`;
  const lead = d ? leadOf(d) : null;
  const description = lead ? `${lead.title}: ${lead.summary}`.slice(0, 280) : newsText("news_meta_desc", l);
  const image = `/news/${params.date}/card`;
  return {
    title,
    description,
    alternates: { canonical: `/news/${params.date}` },
    openGraph: {
      type: "article",
      title,
      description,
      locale: l,
      publishedTime: d?.published_at ?? undefined,
      images: [{ url: image, width: 1080, height: 1350, alt: d?.title ?? title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function DigestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
