import type { Metadata } from "next";
import { GLOSSARY } from "@/lib/learn";
import { GlossaryIndex } from "@/components/learn/GlossaryIndex";

const title = "Zcash glossary";
const description = `Plain-language definitions of ${GLOSSARY.length} Zcash terms, from shielded addresses and nullifiers to viewing keys, with primary sources.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/glossary" },
  openGraph: { title, description, url: "/glossary" },
};

export default function Page() {
  return <GlossaryIndex />;
}
