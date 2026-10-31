"use client";

import { LegalPage } from "@/components/LegalPage";

// Not: Bu metin bir başlangıç şablonudur; yayına almadan önce hukuki danışmanla gözden geçirin.
export default function TermsPage() {
  return (
    <LegalPage
      title={{ tr: "Kullanım Koşulları", en: "Terms of Use" }}
      sections={[
        {
          h: { tr: "Hizmet", en: "The service" },
          p: {
            tr: "ZecLearn, Zcash toplulukları için canlı bilgi yarışmaları (quiz) düzenlemeye yarayan bağımsız bir platformdur. Hizmet olduğu gibi sunulur.",
            en: "ZecLearn is an independent platform for running live Zcash quizzes in communities. The service is provided as is.",
          },
        },
        {
          h: { tr: "Hesaplar", en: "Accounts" },
          p: {
            tr: "Canlı odalara misafir olarak katılabilirsin; puanını kaydetmek, solo oynamak ve organizatör olmak için hesap gerekir. Her kişi tek hesap kullanmalıdır. Hile, çoklu hesap veya otomasyon tespit edilirse hesap engellenebilir.",
            en: "You can join live rooms as a guest; an account is needed to keep your score, play solo and become an organizer. Each person should use a single account. Cheating, multiple accounts or automation may lead to a ban.",
          },
        },
        {
          h: { tr: "İçerik", en: "Content" },
          p: {
            tr: "Quizler onaylı organizatörler tarafından hazırlanır ve yayından önce incelenir. Hatalı bir soru bildirirseniz inceleyip düzelteceğiz.",
            en: "Quizzes are created by approved organizers and reviewed before publishing. If you report an incorrect question we will review and fix it.",
          },
        },
      ]}
    />
  );
}
