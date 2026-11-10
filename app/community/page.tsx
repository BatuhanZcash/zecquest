"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, CalendarX2, Plus, Users, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth, hasRole } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { communityApi, type CommunityCard, type MeetupCard } from "@/lib/api-community";
import { countryName } from "@/lib/countries";
import { findLanguage } from "@/lib/languages";
import { WorldMap, type MapPoint } from "@/components/community/WorldMap";
import { CommunityTile, Empty, MeetupRow, MeetupRowSkeleton, fmtInZone } from "@/components/community/bits";

export default function CommunityPage() {
  return (
    <Suspense>
      <Community />
    </Suspense>
  );
}

function Community() {
  const { t, lang } = useI18n();
  const params = useSearchParams();
  const { profile } = useAuth();
  const isOrganizer = !!profile && !profile.is_guest && hasRole(profile, "creator");
  const comms = useAsync(() => communityApi.list(), []);
  const meets = useAsync(() => communityApi.meetups({ limit: 200 }), []);
  const [country, setCountry] = useState(() => (/^[A-Z]{2}$/.test(params.get("country") ?? "") ? params.get("country")! : ""));
  const [language, setLanguage] = useState(() => params.get("lang") ?? "");

  const allC = useMemo(() => comms.data ?? [], [comms.data]);
  const allM = useMemo(() => meets.data ?? [], [meets.data]);

  const base = (l: string) => l.split("-")[0];
  const matchC = (c: CommunityCard) =>
    (!country || c.country === country) && (!language || c.languages.some((l) => base(l) === language));
  const matchM = (m: MeetupCard) => (!country || m.country === country) && (!language || (m.language && base(m.language) === language));
  const fc = allC.filter(matchC);
  const fm = allM.filter(matchM);

  const countries = useMemo(() => {
    const s = new Set<string>();
    allC.forEach((c) => c.country && s.add(c.country));
    allM.forEach((m) => m.country && s.add(m.country));
    return [...s].sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), lang));
  }, [allC, allM, lang]);
  const languages = useMemo(() => {
    const s = new Set<string>();
    allC.forEach((c) => c.languages.forEach((l) => s.add(base(l))));
    allM.forEach((m) => m.language && s.add(base(m.language)));
    return [...s].sort();
  }, [allC, allM]);

  // Harita: ülke başına bir nokta (topluluk + buluşma sayısı). Tıklamak ülkeye süzer.
  const points: MapPoint[] = useMemo(() => {
    const by = new Map<string, { c: number; m: number }>();
    allC.filter((c) => !language || c.languages.some((l) => base(l) === language)).forEach((c) => {
      if (!c.country) return;
      const v = by.get(c.country) ?? { c: 0, m: 0 };
      v.c++;
      by.set(c.country, v);
    });
    allM.filter((m) => !language || (m.language && base(m.language) === language)).forEach((m) => {
      if (!m.country || (m.online && !m.city)) return;
      const v = by.get(m.country) ?? { c: 0, m: 0 };
      v.m++;
      by.set(m.country, v);
    });
    const next = allM[0]?.country;
    return [...by.entries()].map(([code, v]) => ({
      key: code,
      country: code,
      count: v.c + v.m,
      label: `${countryName(code, lang)} · ${t("community_map_tip", { c: v.c, m: v.m })}`,
      active: country === code,
      pulse: code === next && !country,
      onClick: () => setCountry((cur) => (cur === code ? "" : code)),
    }));
  }, [allC, allM, language, country, lang, t]);

  // Takvim: aya göre grupla (buluşmanın kendi saat diliminde)
  const months = useMemo(() => {
    const g: { key: string; label: string; items: MeetupCard[] }[] = [];
    for (const m of fm) {
      const label = fmtInZone(m.starts_at, m.timezone, lang, { month: "long", year: "numeric" });
      const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(m);
      else g.push({ key: label + m.id, label, items: [m] });
    }
    return g;
  }, [fm, lang]);

  const filtered = !!country || !!language;
  const loading = (comms.loading && !comms.data) || (meets.loading && !meets.data);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[640px]">
          <h1 className="page-title">{t("community_title")}</h1>
          <p className="mt-1 text-[15.5px] leading-relaxed text-muted">{t("community_sub")}</p>
        </div>
        {isOrganizer ? (
          <Link href="/community/manage" className="btn-ink">
            <Plus className="h-4 w-4" />
            {t("community_manage")}
          </Link>
        ) : (
          <Link href="/organizers" className="btn-ghost">
            {t("community_start_cta")}
          </Link>
        )}
      </header>

      {/* Harita + süzgeçler */}
      <section className="overflow-hidden rounded-[24px] border border-line bg-card">
        <div className="px-2 pt-4 sm:px-6 sm:pt-6">
          <WorldMap points={points} label={t("community_map_label")} />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-6">
          <label className="sr-only" htmlFor="f-country">
            {t("country")}
          </label>
          <select id="f-country" value={country} onChange={(e) => setCountry(e.target.value)} className="input w-auto min-w-[150px] cursor-pointer py-2 text-[14px] font-semibold">
            <option value="">{t("community_all_countries")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryName(c, lang)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-lang">
            {t("community_language")}
          </label>
          <select id="f-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="input w-auto min-w-[150px] cursor-pointer py-2 text-[14px] font-semibold">
            <option value="">{t("lang_all")}</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {findLanguage(l)?.native ?? l}
              </option>
            ))}
          </select>
          {filtered && (
            <button onClick={() => (setCountry(""), setLanguage(""))} className="btn-ghost py-2 text-[13px]">
              <X className="h-3.5 w-3.5" />
              {t("community_clear")}
            </button>
          )}
          <p className="ml-auto text-[13px] tabular-nums text-muted" aria-live="polite">
            {!loading && t("community_counts", { c: fc.length, m: fm.length })}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Takvim */}
        <section aria-labelledby="h-meetups" className="min-w-0">
          <h2 id="h-meetups" className="section-title mb-3">
            {t("community_upcoming")}
          </h2>
          <div className="rounded-[20px] border border-line bg-card p-1.5 sm:p-2">
            {loading ? (
              [0, 1, 2].map((i) => <MeetupRowSkeleton key={i} />)
            ) : meets.error ? (
              <Empty icon={<CalendarX2 className="h-6 w-6" />} title={t("community_load_error")} />
            ) : fm.length === 0 ? (
              <Empty
                icon={<CalendarPlus className="h-6 w-6" />}
                title={filtered ? t("community_no_meetups_filtered") : t("community_no_meetups")}
                body={filtered ? undefined : t("community_no_meetups_body")}
                action={
                  filtered ? (
                    <button onClick={() => (setCountry(""), setLanguage(""))} className="btn-ghost py-2 text-[13px]">
                      {t("community_clear")}
                    </button>
                  ) : (
                    <Link href={isOrganizer ? "/community/manage" : "/organizers"} className="btn-ghost py-2 text-[13px]">
                      {isOrganizer ? t("community_add_meetup") : t("community_start_cta")}
                    </Link>
                  )
                }
              />
            ) : (
              months.map((g) => (
                <div key={g.key}>
                  <h3 className="px-3 pb-1 pt-3 text-[13px] font-semibold capitalize text-soft sm:px-4">{g.label}</h3>
                  <ul>
                    {g.items.map((m) => (
                      <li key={m.id}>
                        <MeetupRow m={m} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Topluluklar */}
        <section aria-labelledby="h-comms" className="min-w-0">
          <h2 id="h-comms" className="section-title mb-3">
            {t("community_communities")}
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-[132px] animate-pulse rounded-2xl bg-card ring-1 ring-line" />
              ))}
            </div>
          ) : fc.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-line">
              <Empty
                icon={<Users className="h-6 w-6" />}
                title={filtered ? t("community_no_comms_filtered") : t("community_no_comms")}
                body={filtered ? undefined : t("community_no_comms_body")}
              />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {fc.map((c) => (
                <li key={c.id}>
                  <CommunityTile c={c} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
