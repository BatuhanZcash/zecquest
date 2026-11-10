"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Ban, CalendarDays, CalendarPlus, Check, Clock, Hash, Languages, MapPin, Pencil, PlayCircle, RotateCcw, Users, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { communityApi, isUuid, type MeetupDetail } from "@/lib/api-community";
import { countryName } from "@/lib/countries";
import { findLanguage } from "@/lib/languages";
import { notifyXpChanged } from "@/lib/progress";
import { Alert, Avatar, ErrorBox, PageLoader, Spinner } from "@/components/ui";
import { DateLeaf, fmtInZone, viewerZone, zoneLabel } from "@/components/community/bits";
import { WorldMap } from "@/components/community/WorldMap";

export default function MeetupPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const q = useAsync(() => (isUuid(id) ? communityApi.meetup(id) : Promise.resolve(null)), [id]);

  if (q.loading && !q.data) return <PageLoader />;
  if (q.error) return <ErrorBox message={t("community_load_error")} />;
  if (!q.data) return <ErrorBox message={t("not_found")} action={<Link href="/community" className="btn-ghost py-2 text-sm">{t("community_title")}</Link>} />;
  return <Meetup m={q.data} reload={q.reload} />;
}

function Meetup({ m, reload }: { m: MeetupDetail; reload: () => void }) {
  const { t, lt, lang } = useI18n();
  const tz = m.timezone;
  const mine = viewerZone();
  const day = fmtInZone(m.starts_at, tz, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = [m.starts_at, m.ends_at].filter(Boolean).map((x) => fmtInZone(x!, tz, lang, { hour: "2-digit", minute: "2-digit" })).join("–");
  const local =
    mine !== tz
      ? `${fmtInZone(m.starts_at, mine, lang, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ${zoneLabel(mine, m.starts_at, lang)}`
      : null;
  const place = [m.venue, m.city, m.country ? countryName(m.country, lang) : null].filter(Boolean).join(", ");
  const live = m.started && !m.ended && !m.cancelled;
  const hasPin = typeof m.lat === "number" || !!m.country;

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <Link href={`/community/${m.community.slug}`} className="btn-ghost px-3 py-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" />
        {m.community.name}
      </Link>

      <header className="rounded-[24px] border border-line bg-card p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <DateLeaf iso={m.starts_at} tz={tz} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap gap-2">
              {m.cancelled && <span className="chip bg-[#E8742A]/15 text-[#E8742A]">{t("community_cancelled")}</span>}
              {live && (
                <span className="chip bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {t("community_happening")}
                </span>
              )}
              {m.ended && !m.cancelled && <span className="chip bg-input text-muted">{t("community_ended")}</span>}
            </div>
            <h1 dir="auto" className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[34px]">
              {m.title}
            </h1>
            <Link href={`/community/${m.community.slug}`} className="mt-1 inline-block text-[15px] font-medium text-accent hover:underline">
              {m.community.name}
            </Link>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
          <Info icon={<Clock className="h-4 w-4" />} label={t("community_when")}>
            <span className="block">{day}</span>
            <span className="block tabular-nums">
              {time} <span className="text-muted">{zoneLabel(tz, m.starts_at, lang)}</span>
            </span>
            {local && <span className="mt-0.5 block text-[13px] text-muted">{t("community_your_time", { time: local })}</span>}
          </Info>
          <Info icon={m.online && !place ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} label={t("community_where")}>
            {place && <span dir="auto" className="block">{place}</span>}
            {m.online_url && (
              <a href={m.online_url} target="_blank" rel="noopener noreferrer nofollow" className="block font-semibold text-accent hover:underline">
                {t("community_online_link")}
              </a>
            )}
          </Info>
          {m.language && (
            <Info icon={<Languages className="h-4 w-4" />} label={t("community_language")}>
              {findLanguage(m.language)?.native ?? m.language}
            </Info>
          )}
        </dl>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {m.description && (
            <section className="rounded-[20px] border border-line bg-card p-6">
              <h2 className="section-title mb-3">{t("community_about_meetup")}</h2>
              <p dir="auto" lang={m.language ?? undefined} className="max-w-[68ch] whitespace-pre-line text-[15.5px] leading-relaxed">
                {m.description}
              </p>
            </section>
          )}
          {(m.quiz || m.room_code) && (
            <section className="rounded-[20px] border border-line bg-card p-6">
              <h2 className="section-title mb-1">{t("community_quiz_title")}</h2>
              <p className="mb-4 text-[14px] text-muted">{t("community_quiz_sub")}</p>
              <div className="flex flex-wrap gap-2">
                {m.room_code && !m.ended && (
                  <Link href={`/play/${m.room_code}`} className="btn-zec">
                    <Hash className="h-4 w-4" />
                    {t("community_join_room", { code: `${m.room_code.slice(0, 3)} ${m.room_code.slice(3)}` })}
                  </Link>
                )}
                {m.quiz && (
                  <Link href={`/quiz/${m.quiz.slug}`} className="btn-ghost">
                    <PlayCircle className="h-4 w-4" />
                    {lt(m.quiz.title)}
                  </Link>
                )}
              </div>
            </section>
          )}
          {m.is_organizer && <OrganizerPanel m={m} reload={reload} />}
        </div>

        <aside className="min-w-0 space-y-4">
          <RsvpCard m={m} reload={reload} />
          {hasPin && (
            <div className="overflow-hidden rounded-[20px] border border-line bg-card p-3">
              <WorldMap
                points={[{ key: m.id, lat: m.lat, lng: m.lng, country: m.country, label: place || m.title, pulse: !m.ended }]}
                label={t("community_map_label")}
                fit
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-accent">{icon}</span>
      <div className="min-w-0 text-[15px]">
        <dt className="text-[12.5px] font-medium text-muted">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  );
}

/* ---------- Katılacağım ---------- */
function RsvpCard({ m, reload }: { m: MeetupDetail; reload: () => void }) {
  const { t, te, fmt } = useI18n();
  const { session, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const going = !!m.me?.going;
  const canRsvp = !m.cancelled && !m.ended && m.community.approved;

  const toggle = async () => {
    setBusy(true);
    setErr(null);
    try {
      await communityApi.rsvp(m.id, !going);
      reload();
    } catch (e) {
      setErr(te(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[20px] border border-line bg-card p-5">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-[34px] font-extrabold tabular-nums leading-none">{fmt(m.going_count)}</span>
        <span className="text-[14px] text-muted">{t("community_going_label")}</span>
      </p>
      {m.me?.attended && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[13.5px] font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {t("community_attended_you")}
        </p>
      )}
      <div className="mt-4 space-y-2">
        {err && <Alert>{err}</Alert>}
        {canRsvp &&
          (!session || profile?.is_guest ? (
            <Link href={`/login?next=${encodeURIComponent(`/community/meetups/${m.id}`)}`} className="btn-zec w-full">
              {t("community_signin_rsvp")}
            </Link>
          ) : (
            <button onClick={toggle} disabled={busy || !!m.me?.attended} aria-pressed={going} className={`${going ? "btn-ghost" : "btn-zec"} w-full`}>
              {busy ? <Spinner className="h-4 w-4" /> : going ? <Check className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
              {going ? t("community_going_yes") : t("community_going_cta")}
            </button>
          ))}
        {!m.cancelled && !m.ended && (
          <button onClick={() => downloadIcs(m)} className="btn-ghost w-full py-2 text-[13.5px]">
            <CalendarPlus className="h-4 w-4" />
            {t("community_add_calendar")}
          </button>
        )}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-soft">{t("community_xp_note")}</p>
    </section>
  );
}

function downloadIcs(m: MeetupDetail) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = m.ends_at ?? new Date(new Date(m.starts_at).getTime() + 2 * 3600e3).toISOString();
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const url = typeof window !== "undefined" ? `${window.location.origin}/community/meetups/${m.id}` : "";
  const loc = [m.venue, m.city, m.country].filter(Boolean).join(", ") || m.online_url || "";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZecLearn//Community//EN",
    "BEGIN:VEVENT",
    `UID:${m.id}@zeclearn`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(m.starts_at)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(m.title)}`,
    loc && `LOCATION:${esc(loc)}`,
    `URL:${url}`,
    `DESCRIPTION:${esc(`${m.community.name}\n${url}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "meetup.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Organizatör paneli: katılımcılar ve katılım işaretleme ---------- */
function OrganizerPanel({ m, reload }: { m: MeetupDetail; reload: () => void }) {
  const { t, te } = useI18n();
  const { profile } = useAuth();
  const list = useAsync(() => communityApi.attendees(m.id), [m.id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mark = async (user: string, attended: boolean) => {
    setBusy(user);
    setErr(null);
    // İyimser güncelleme: kutu hemen değişir, hata olursa geri alınır
    const flip = (v: boolean) => list.setData((l) => l?.map((a) => (a.user_id === user ? { ...a, attended: v } : a)) ?? l);
    flip(attended);
    try {
      await communityApi.markAttendance(m.id, user, attended);
      notifyXpChanged();
    } catch (e) {
      flip(!attended);
      setErr(te(e));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setErr(null);
    try {
      await communityApi.setCancelled(m.id, !m.cancelled);
      reload();
    } catch (e) {
      setErr(te(e));
    }
  };

  const rows = list.data ?? [];
  const attended = rows.filter((a) => a.attended).length;

  return (
    <section className="rounded-[20px] border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h2 className="section-title">{t("community_org_panel")}</h2>
          <p className="text-[13px] text-muted">{t("community_org_panel_sub")}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/community/manage?meetup=${m.id}`} className="btn-ghost py-2 text-[13px]">
            <Pencil className="h-4 w-4" />
            {t("community_edit")}
          </Link>
          {!m.ended && (
            <button onClick={cancel} className="btn-ghost py-2 text-[13px]">
              {m.cancelled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {m.cancelled ? t("community_restore") : t("community_cancel")}
            </button>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4">
        {err && (
          <div className="mb-3">
            <Alert>{err}</Alert>
          </div>
        )}
        {!m.started && <p className="mb-3 rounded-xl bg-input px-3 py-2 text-[13px] text-muted">{t("community_mark_after_start")}</p>}
        {!m.community.approved && <p className="mb-3 rounded-xl bg-tint px-3 py-2 text-[13px] text-accent">{t("community_xp_needs_approval")}</p>}
        {list.loading && !list.data ? (
          <div className="h-24 animate-pulse rounded-xl bg-input" />
        ) : rows.length === 0 ? (
          <p className="flex items-center gap-2 px-2 py-6 text-[14px] text-muted">
            <Users className="h-4 w-4" />
            {t("community_no_rsvps")}
          </p>
        ) : (
          <>
            <p className="px-2 pb-2 text-[13px] tabular-nums text-muted">{t("community_attended_count", { a: attended, n: rows.length })}</p>
            <ul className="divide-y divide-line">
              {rows.map((a) => {
                const self = a.user_id === profile?.id;
                return (
                  <li key={a.user_id} className="flex items-center gap-3 px-2 py-2.5">
                    <Avatar name={a.display_name || a.username || "?"} size={32} country={a.country} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{a.display_name}</p>
                      {a.username && <p className="truncate text-[12.5px] text-soft">@{a.username}</p>}
                    </div>
                    <label className={`flex items-center gap-2 text-[13px] font-semibold ${!m.started || self ? "opacity-40" : "cursor-pointer"}`}>
                      {busy === a.user_id && <Spinner className="h-3.5 w-3.5" />}
                      <input
                        type="checkbox"
                        checked={a.attended}
                        disabled={!m.started || self || m.cancelled}
                        onChange={(e) => mark(a.user_id, e.target.checked)}
                        className="h-4 w-4 accent-[#F4B728]"
                      />
                      {t("community_attended")}
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
