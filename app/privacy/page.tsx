"use client";

import { LegalPage } from "@/components/LegalPage";

// Not: Bu metin bir başlangıç şablonudur; yayına almadan önce hukuki danışmanla gözden geçirin (KVKK/GDPR).
export default function PrivacyPage() {
  return (
    <LegalPage
      title={{ tr: "Gizlilik Politikası", en: "Privacy Policy" }}
      sections={[
        {
          h: { tr: "Topladığımız veriler", en: "What we collect" },
          p: {
            tr: "E-posta adresiniz (giriş için), kullanıcı adınız, görünen adınız, ülkeniz, isteğe bağlı takım/üniversite bilginiz, ve oyun skorlarınız. Misafir olarak katılırsanız yalnızca takma adınız ve o oyundaki skorunuz tutulur.",
            en: "Your email address (for sign-in), username, display name, country, optional team/university, game scores.",
          },
        },
        {
          h: { tr: "Herkese açık olanlar", en: "What is public" },
          p: {
            tr: "Kullanıcı adınız, görünen adınız, ülkeniz, takımınız ve skorlarınız liderlik tablolarında ve profil sayfanızda görünür. E-posta adresiniz asla herkese açık değildir; yalnızca siz ve yöneticiler görebilir.",
            en: "Your username, display name, country, team and scores appear on leaderboards and your profile page. Your email address is never public; only you and admins can see them.",
          },
        },
        {
          h: { tr: "Gizlilik yaklaşımı", en: "Our approach" },
          p: {
            tr: "Zcash'in ruhuna uygun olarak gereğinden fazla veri toplamıyoruz, reklam takibi yapmıyoruz ve verilerinizi satmıyoruz. Ödüller için shielded (u1/zs) adres kullanmanızı öneririz.",
            en: "In the spirit of Zcash we collect no more than necessary, run no ad tracking and never sell your data.",
          },
        },
        {
          h: { tr: "Silme talebi", en: "Deletion" },
          p: {
            tr: "Hesabınızın ve verilerinizin silinmesini istediğinizde organizatörlerle iletişime geçin.",
            en: "Contact the organizers to request deletion of your account and data.",
          },
        },
      ]}
    />
  );
}
