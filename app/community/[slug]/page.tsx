"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarPlus, Clock, Globe, Pencil, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import { communityApi } from "@/lib/api-community";
import { countryName } from "@/lib/countries";
import { BackButton, ErrorBox, PageLoader } from "@/components/ui";
import { CommunityMark, Empty, LangTag, MeetupRow } from "@/components/community/bits";
import { WorldMap } from "@/components/community/WorldMap";

export default function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lt, lang } = useI18n();
  const { data: c, loading, error } = useAsync(() => communityApi.get(slug), [slug]);

  if (loading && !c) return <PageLoader />;
  if (error) return <ErrorBox message={t("community_load_error")} />;
  if (!c) return <ErrorBox message={t("not_found")} action={<BackButton href="/community" />} />;

  const desc = lt(c.description);
  const place = c.country ? [c.city, countryName(c.country, lang)].filter(Boolean).join(", ") : t("community_global");
  const pins = [...c.upcoming, ...c.past]
    .filter((m) => typeof m.lat === "number" || m.country)
    .map((m, i) => ({ key: m.id, lat: m.lat, lng: m.lng, country: m.country, label: m.title, href: `/community/meetups/${m.id}`, pulse: i === 0 && c.upcoming.length > 0 }));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <BackButton href="/community" />

      {!c.approved && (
        <div className="flex items-center gap-3 rounded-2xl bg-tint px-4 py-3 text-[14px] font-medium text-accent">
          <Clock className="h-4 w-4 shrink-0" />
          {t("community_pending_note")}
        </div>
      )}

      <header className="rounded-[24px] border border-line bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <CommunityMark c={c} size={64} />
          <div className="min-w-0 flex-1">
            <h1 dir="auto" className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[36px]">
              {c.name}
            </h1>
            <p className="mt-1 text-[15px] text-muted">{place}</p>
            {c.languages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.languages.map((l) => (
                  <LangTag key={l} code={l} />
                ))}
              </div>
            )}
          </div>
          {c.is_organizer && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Link href={`/community/manage?edit=${c.id}`} className="btn-ghost py-2 text-[13.5px]">
                <Pencil className="h-4 w-4" />
                {t("community_edit")}
              </Link>
              <Link href={`/community/manage?meetup=new&community=${c.id}`} className="btn-zec py-2 text-[13.5px]">
                <CalendarPlus className="h-4 w-4" />
                {t("community_add_meetup")}
              </Link>
            </div>
          )}
        </div>
        {desc && (
          <p dir="auto" className="mt-6 max-w-[68ch] whitespace-pre-line text-[15.5px] leading-relaxed text-ink/90">
            {desc}
          </p>
        )}
        <Links links={c.links} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="h-up" className="min-w-0">
          <h2 id="h-up" className="section-title mb-3">
            {t("community_upcoming")}
          </h2>
          <div className="rounded-[20px] border border-line bg-card p-1.5 sm:p-2">
            {c.upcoming.length === 0 ? (
              <Empty icon={<CalendarPlus className="h-6 w-6" />} title={t("community_no_upcoming")} body={t("community_follow_links")} />
            ) : (
              <ul>
                {c.upcoming.map((m) => (
                  <li key={m.id} className={m.cancelled ? "opacity-50" : ""}>
                    <MeetupRow m={m} showCommunity={false} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {c.past.length > 0 && (
            <>
              <h2 className="section-title mb-3 mt-8">{t("community_past")}</h2>
              <div className="rounded-[20px] border border-line bg-card p-1.5 sm:p-2">
                <ul>
                  {c.past.map((m) => (
                    <li key={m.id}>
                      <MeetupRow m={m} showCommunity={false} />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          {pins.length > 0 && (
            <div className="overflow-hidden rounded-[20px] border border-line bg-card p-3">
              <WorldMap points={pins} label={t("community_map_label")} fit />
            </div>
          )}
          {c.is_organizer && c.organizers && (
            <div className="rounded-[20px] border border-line bg-card p-5">
              <h2 className="font-semibold">{t("community_organizers")}</h2>
              <ul className="mt-2 space-y-1 text-[14px] text-muted">
                {c.organizers.map((o) => (
                  <li key={o.id}>
                    {o.display_name} {o.username && <span className="text-soft">@{o.username}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] text-soft">{t("community_organizers_private")}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Links({ links }: { links: { x?: string; telegram?: string; website?: string } }) {
  const { t } = useI18n();
  const items = [
    links.website && { href: links.website, label: t("community_link_website"), icon: <Globe className="h-4 w-4" /> },
    links.x && {
      href: links.x,
      label: "X",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
          <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.828l-5.35-6.99L4.7 22H1.44l8.02-9.17L1 2h6.997l4.836 6.39L18.244 2Zm-1.196 18h1.88L7.03 3.9H5.01L17.048 20Z" />
        </svg>
      ),
    },
    links.telegram && { href: links.telegram, label: "Telegram", icon: <Send className="h-4 w-4" /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];
  if (!items.length) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost py-2 text-[13.5px]">
          {l.icon}
          {l.label}
        </a>
      ))}
    </div>
  );
}
