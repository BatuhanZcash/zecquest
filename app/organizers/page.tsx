"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ORGANIZER_STEPS, useOrganizerCta } from "@/components/OrganizerSteps";
import { ANSWER_SECS } from "@/lib/config";

type T = { tr: string; en: string };

/** Her adımın ekran görüntüsü (public/guide/) */
const SHOTS: { src: string; alt: T; phone?: boolean }[] = [
  { src: "/guide/apply.png", alt: { tr: "Profil sayfasında organizatör başvurusu", en: "Organizer application on the profile page" } },
  { src: "/guide/studio.png", alt: { tr: "Stüdyo'da quiz düzenleme", en: "Editing a quiz in Studio" } },
  { src: "/guide/host.png", alt: { tr: "Projeksiyon ekranı: oda kodu ve QR", en: "Big screen: room code and QR" } },
  { src: "/guide/phone.png", alt: { tr: "Telefonda soru ekranı", en: "Question screen on a phone" }, phone: true },
];

const TIPS: T[] = [
  {
    tr: "Oda ekranını projeksiyona ya da büyük bir ekrana yansıt. Katılımcılar QR'ı uzaktan da okutabilir.",
    en: "Put the room screen on a projector or a big TV. People can scan the QR from across the room.",
  },
  {
    tr: "Katılımcıların hesap açması gerekmez; takma adla misafir olarak girerler. İsteyen oyundan sonra hesap açıp puanını kaydeder.",
    en: "Participants don't need an account; they join as guests with a nickname. Anyone can create an account afterwards to keep their score.",
  },
  {
    tr: `Her soruya ${ANSWER_SECS} saniye var. Kısa ve net sorular yaz; 2–4 seçenek yeterli.`,
    en: `Each question has ${ANSWER_SECS} seconds. Keep questions short and clear; 2–4 options are enough.`,
  },
  {
    tr: "Doğru cevaptan sonra kısa bir açıklama ekle. Ekranda görünür ve sohbeti başlatmak için iyi bir fırsattır.",
    en: "Add a short explanation to each answer. It shows on screen and is a good moment to start a conversation.",
  },
  {
    tr: "Başlamadan önce kendi telefonunla deneme odası aç. Wi-Fi zayıfsa katılımcılar mobil veriyle de girebilir.",
    en: "Open a test room with your own phone before you start. If the Wi-Fi is weak, people can join over mobile data.",
  },
];

const FAQ: { q: T; a: T }[] = [
  {
    q: { tr: "Ücretli mi?", en: "Does it cost anything?" },
    a: { tr: "Hayır. ZecLearn Zcash toplulukları için ücretsizdir.", en: "No. ZecLearn is free for Zcash communities." },
  },
  {
    q: { tr: "Aynı anda kaç kişi katılabilir?", en: "How many people can join at once?" },
    a: {
      tr: "Bir buluşma ya da sınıf için sınır pratikte sorun olmaz; sistem aynı anda yüzlerce cevabı kaybetmeden işler.",
      en: "For a meetup or a classroom the limit is not an issue in practice; the system handles hundreds of simultaneous answers without losing any.",
    },
  },
  {
    q: { tr: "Quizim herkese görünür mü?", en: "Is my quiz visible to everyone?" },
    a: {
      tr: "Hazırladığın quizle hemen canlı oda açabilirsin. Keşfet sayfasında herkese listelenmesi için incelemeye gönderirsin; ekibimiz onaylayınca yayınlanır.",
      en: "You can host a live room with your quiz right away. To have it listed in Explore, submit it for review; it goes live once our team approves it.",
    },
  },
  {
    q: { tr: "Sayfa yenilenirse ne olur?", en: "What if someone refreshes the page?" },
    a: {
      tr: "Hiçbir şey kaybolmaz. Oyun durumu sunucuda tutulur; yenileyen oyuncu ya da sunucu kaldığı yerden devam eder.",
      en: "Nothing is lost. The game state lives on the server; a player or host who refreshes continues where they left off.",
    },
  },
  {
    q: { tr: "Soruları toplu yükleyebilir miyim?", en: "Can I upload questions in bulk?" },
    a: {
      tr: "Evet. Stüdyo'daki JSON içe aktarma ile tek seferde bir ya da birden fazla quiz yükleyebilirsin.",
      en: "Yes. With JSON import in Studio you can upload one or several quizzes at once.",
    },
  },
];

export default function OrganizersPage() {
  const { t, lt, lang } = useI18n();
  const cta = useOrganizerCta();

  return (
    <div className="mx-auto max-w-[1040px]">
      <header className="max-w-[680px]">
        <h1 className="page-title text-[36px] sm:text-[46px]">{t("org_card_title")}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">{t("org_card_sub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={cta.href} className="btn-zec px-6 py-3 text-[15px]">
            {cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/explore" className="btn-ghost px-6 py-3 text-[15px]">
            {t("org_see_quizzes")}
          </Link>
        </div>
      </header>

      <ol className="mt-14 space-y-6">
        {ORGANIZER_STEPS.map(({ title, body }, i) => {
          const shot = SHOTS[i];
          return (
            <li key={title} className="grid items-center gap-6 rounded-[28px] border border-line bg-card p-5 sm:p-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className={i % 2 ? "md:order-2" : ""}>
                <span className="font-display flex h-11 w-11 items-center justify-center rounded-full bg-zec text-[20px] font-extrabold text-[#14161B]">{i + 1}</span>
                <h2 className="font-display mt-4 text-[26px] font-bold leading-tight tracking-[-0.02em]">{t(title)}</h2>
                <p className="mt-2 max-w-[44ch] text-[16px] leading-relaxed text-muted">{t(body)}</p>
                {i === 0 && (
                  <Link href={cta.href} className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-accent hover:underline">
                    {cta.label}
                  </Link>
                )}
              </div>
              <figure className={`overflow-hidden rounded-2xl border border-line bg-app ${shot.phone ? "mx-auto w-[220px] rounded-[28px] border-[6px] border-[#14161B]" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lang === "en" ? shot.src.replace("/guide/", "/guide/en/") : shot.src} alt={lt(shot.alt)} loading="lazy" className="block w-full" />
              </figure>
            </li>
          );
        })}
      </ol>

      <section className="mt-16 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="section-title text-[24px]">{t("org_tips_title")}</h2>
          <ul className="mt-4 space-y-3">
            {TIPS.map((tip) => (
              <li key={tip.en} className="flex gap-3 text-[15.5px] leading-relaxed">
                <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-zec" />
                <span>{lt(tip)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="section-title text-[24px]">{t("org_faq_title")}</h2>
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
            {FAQ.map(({ q, a }) => (
              <details key={q.en} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {lt(q)}
                  <ChevronDown className="h-4 w-4 shrink-0 text-soft transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{lt(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 flex flex-col items-start justify-between gap-5 rounded-[28px] bg-[#14161B] p-8 text-white sm:flex-row sm:items-center sm:p-10">
        <div>
          <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">{t("org_final_title")}</h2>
          <p className="mt-1 text-white/70">{t("org_final_sub")}</p>
        </div>
        <Link href={cta.href} className="btn-zec shrink-0 px-6 py-3 text-[15px]">
          {cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
