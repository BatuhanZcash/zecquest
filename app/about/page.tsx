"use client";

import Link from "next/link";
import { ArrowRight, Coins, Eye, KeyRound, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CARDS = [
  {
    icon: ShieldCheck,
    title: { tr: "Gizlilik varsayılan olabilir", en: "Privacy that can be the default" },
    body: {
      tr: "Shielded işlemlerde gönderen, alıcı ve tutar şifrelenir; ağ yine de işlemin geçerli olduğunu doğrular.",
      en: "In shielded transactions the sender, receiver and amount are encrypted, yet the network still verifies the transaction is valid.",
    },
  },
  {
    icon: KeyRound,
    title: { tr: "Sıfır bilgi ispatları", en: "Zero-knowledge proofs" },
    body: {
      tr: "zk-SNARK'lar, bir şeyin doğru olduğunu içeriğini açığa çıkarmadan kanıtlamayı sağlar. Zcash bu teknolojiyi büyük ölçekte kullanan ilk projelerden biridir.",
      en: "zk-SNARKs let you prove something is true without revealing it. Zcash was one of the first projects to use them at scale.",
    },
  },
  {
    icon: Eye,
    title: { tr: "Seçici şeffaflık", en: "Selective disclosure" },
    body: {
      tr: "Görüntüleme anahtarlarıyla işlem geçmişini istediğin kişiyle — örneğin bir denetçiyle — paylaşabilirsin.",
      en: "With viewing keys you can share your transaction history with whomever you choose — an auditor, for example.",
    },
  },
  {
    icon: Coins,
    title: { tr: "Sabit arz", en: "Fixed supply" },
    body: {
      tr: "Toplam arz 21 milyon ZEC ile sınırlıdır ve blok ödülü yaklaşık dört yılda bir yarıya iner.",
      en: "Supply is capped at 21 million ZEC and the block reward halves roughly every four years.",
    },
  },
];

export default function AboutPage() {
  const { t, lt, lang } = useI18n();
  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="page-title">{t("nav_about")}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {lang === "tr"
          ? "Zcash, 2016'dan beri çalışan, gizliliği kriptografiyle sağlayan bir dijital para. Turnuva öncesi hızlı bir tekrar:"
          : "Zcash is a digital currency, live since 2016, that delivers privacy through cryptography. A quick refresher before the tournament:"}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ icon: Icon, title, body }) => (
          <div key={lt(title)} className="card p-5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="font-semibold">{lt(title)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{lt(body)}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/explore" className="btn-zec">
          {t("hero_cta_explore")} <ArrowRight className="h-4 w-4" />
        </Link>
        <a href="https://z.cash" target="_blank" rel="noreferrer" className="btn-ghost">
          z.cash
        </a>
      </div>
    </div>
  );
}
