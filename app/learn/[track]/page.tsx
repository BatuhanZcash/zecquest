import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRACKS, findTrack } from "@/lib/learn";
import { TrackView } from "@/components/learn/TrackView";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.slug }));
}

export function generateMetadata({ params }: { params: { track: string } }): Metadata {
  const track = findTrack(params.track);
  if (!track) return {};
  const title = `${track.title.en}: Zcash lessons`;
  const description = track.summary.en;
  return {
    title,
    description,
    alternates: { canonical: `/learn/${track.slug}` },
    openGraph: { title, description, url: `/learn/${track.slug}` },
  };
}

export default function Page({ params }: { params: { track: string } }) {
  if (!findTrack(params.track)) notFound();
  return <TrackView slug={params.track} />;
}
