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
            tr: "ZecLearn, Zcash hakkında bilgi yarışmaları düzenleyen bağımsız bir topluluk platformudur. Hizmet olduğu gibi sunulur.",
            en: "ZecLearn is an independent community platform that runs Zcash knowledge competitions. The service is provided as is.",
          },
        },
        {
          h: { tr: "Hesaplar", en: "Accounts" },
          p: {
            tr: "Yarışmalara katılmak için hesap gerekir. Her kişi tek hesap kullanmalıdır. Hile, çoklu hesap veya otomasyon tespit edilirse hesap engellenebilir ve ödüller iptal edilebilir.",
            en: "An account is required to compete. Each person should use a single account. Cheating, multiple accounts or automation may lead to a ban and forfeiture of prizes.",
          },
        },
        {
          h: { tr: "Ödüller", en: "Prizes" },
          p: {
            tr: "Ödüller, yarışma sayfasında belirtilen koşullara göre organizatörler tarafından ZEC olarak elle gönderilir. Eşitlik durumunda yarışmaya daha önce katılan oyuncu önde sayılır. Ödülün alınabilmesi için kazananın geçerli bir Zcash adresi girmesi gerekir. Yerel mevzuattan doğan vergi ve yükümlülükler kazanana aittir.",
            en: "Prizes are sent manually in ZEC by the organizers according to the terms on the competition page. Ties are broken in favor of the player who joined earlier. Winners must provide a valid Zcash address to receive a prize. Any taxes or obligations under local law are the winner's responsibility.",
          },
        },
        {
          h: { tr: "İçerik", en: "Content" },
          p: {
            tr: "Quizler onaylı içerik üreticileri tarafından hazırlanır ve yayından önce incelenir. Hatalı bir soru bildirirseniz inceleyip düzelteceğiz.",
            en: "Quizzes are created by approved creators and reviewed before publishing. If you report an incorrect question we will review and fix it.",
          },
        },
      ]}
    />
  );
}
