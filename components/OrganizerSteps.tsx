"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, MonitorPlay, PenSquare, QrCode } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useAuth, hasRole } from "@/lib/auth";

export const ORGANIZER_STEPS: { icon: typeof BadgeCheck; title: DictKey; body: DictKey }[] = [
  { icon: BadgeCheck, title: "org_step1_t", body: "org_step1_b" },
  { icon: PenSquare, title: "org_step2_t", body: "org_step2_b" },
  { icon: MonitorPlay, title: "org_step3_t", body: "org_step3_b" },
  { icon: QrCode, title: "org_step4_t", body: "org_step4_b" },
];

/** Kullanıcının durumuna göre organizatör eylemi: giriş → başvuru → stüdyo */
export function useOrganizerCta() {
  const { t } = useI18n();
  const { session, profile } = useAuth();
  if (profile && hasRole(profile, "creator") && !profile.is_guest) return { href: "/studio", label: t("org_cta_studio") };
  if (session && profile && !profile.is_guest && profile.creator_request_at) return { href: "/me#organizer", label: t("org_cta_pending") };
  if (session && profile && !profile.is_guest) return { href: "/me#organizer", label: t("org_cta_apply") };
  return { href: `/login?next=${encodeURIComponent("/me#organizer")}`, label: t("org_cta_apply") };
}

/** Ana sayfadaki "Topluluğun için quiz düzenle" kartı */
export function OrganizerCard() {
  const { t } = useI18n();
  const cta = useOrganizerCta();
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="font-display text-[21px] font-bold leading-snug tracking-[-0.01em]">{t("org_card_title")}</h2>
        <p className="mt-1 text-[14px] text-muted">{t("org_card_sub")}</p>
      </div>
      <ol className="divide-y divide-line">
        {ORGANIZER_STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="flex gap-4 px-5 py-4 sm:px-6">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-accent">
              <Icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zec text-[11px] font-bold text-[#1A1506] ring-2 ring-card">
                {i + 1}
              </span>
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{t(title)}</p>
              <p className="mt-0.5 text-[14px] leading-snug text-muted">{t(body)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3 border-t border-line px-5 py-4 sm:px-6">
        <Link href={cta.href} className="btn-zec">
          {cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/organizers" className="btn-ghost">
          {t("org_read_guide")}
        </Link>
      </div>
    </section>
  );
}
