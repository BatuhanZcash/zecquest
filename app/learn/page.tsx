import type { Metadata } from "next";
import { LearnHome } from "@/components/learn/LearnHome";

const title = "Learn Zcash";
const description =
  "Short, sourced lessons on Zcash: shielded transactions, value pools, wallets and network upgrades, each ending with a quick quiz.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/learn" },
  openGraph: { title, description, url: "/learn" },
};

export default function Page() {
  return <LearnHome />;
}
