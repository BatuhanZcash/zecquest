import type { Metadata } from "next";
import { newsText } from "@/lib/news/format";

export const metadata: Metadata = {
  title: newsText("news_title", "en"),
  description: newsText("news_meta_desc", "en"),
  openGraph: { title: newsText("news_title", "en"), description: newsText("news_meta_desc", "en") },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
