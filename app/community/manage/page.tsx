"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, Check, Clock, ExternalLink, Pencil, Plus, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { hasRole, useRequireAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { api } from "@/lib/api";
import { communityApi, isUuid, type CommunityCard, type CommunityInput, type MeetupInput } from "@/lib/api-community";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { QUIZ_LANGUAGES, findLanguage } from "@/lib/languages";
import { isoToZoned, timeZones, zonedToIso } from "@/lib/community/time";
import { Alert, Field, PageLoader, Spinner } from "@/components/ui";
import { CommunityMark, Empty, viewerZone } from "@/components/community/bits";

export default function ManagePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Manage />
    </Suspense>
  );
}

function Manage() {
  const auth = useRequireAuth();
  const params = useSearchParams();
  if (!auth.ok || !auth.profile) return <PageLoader />;
  const edit = params.get("edit");
  const meetup = params.get("meetup");
  if (params.get("new") === "community" || (edit && isUuid(edit))) return <CommunityForm id={edit} />;
  if (meetup) return <MeetupForm id={meetup === "new" ? null : meetup} communityId={params.get("community")} />;
  return <Dashboard />;
}

/* ---------------------------------------------------------------------
   Pano: topluluklarım + (yönetici) onay bekleyenler
   --------------------------------------------------------------------- */
function Dashboard() {
  const { t, te, lang } = useI18n();
  const { profile } = useRequireAuth();
  const q = useAsync(() => communityApi.mine(), []);
  const canCreate = hasRole(profile ?? null, "creator");
  const [err, setErr] = useState<string | null>(null);

  const approve = async (c: CommunityCard, ok: boolean) => {
    setErr(null);
    try {
      await communityApi.setApproved(c.id, ok);
      q.reload();
    } catch (e) {
      setErr(te(e));
    }
  };

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("community_manage")}</h1>
          <p className="text-[15px] text-muted">{t("community_manage_sub")}</p>
        </div>
        {canCreate && (
          <Link href="/community/manage?new=community" className="btn-zec">
            <Plus className="h-4 w-4" />
            {t("community_new")}
          </Link>
        )}
      </div>
      {err && <Alert>{err}</Alert>}

      {q.data && q.data.pending.length > 0 && (
        <section className="rounded-[20px] border border-zec/50 bg-card">
          <h2 className="flex items-center gap-2 border-b border-line px-5 py-4 font-display text-[17px] font-bold">
            <ShieldCheck className="h-5 w-5 text-accent" />
            {t("community_awaiting", { n: q.data.pending.length })}
          </h2>
          <ul className="divide-y divide-line">
            {q.data.pending.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <CommunityMark c={c} size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/community/${c.slug}`} className="font-semibold hover:text-accent">
                    {c.name}
                  </Link>
                  <p className="text-[13px] text-muted">
                    {c.country ? countryName(c.country, lang) : t("community_global")}
                    {c.created_by?.username && ` · @${c.created_by.username}`}
                  </p>
                </div>
                <button onClick={() => approve(c, true)} className="btn-zec py-2 text-[13px]">
                  <Check className="h-4 w-4" />
                  {t("community_approve")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="section-title mb-3">{t("community_mine")}</h2>
        {q.loading && !q.data ? (
          <div className="h-32 animate-pulse rounded-[20px] bg-card ring-1 ring-line" />
        ) : !q.data || q.data.mine.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-line">
            <Empty
              icon={<CalendarPlus className="h-6 w-6" />}
              title={t("community_mine_empty")}
              body={canCreate ? t("community_mine_empty_body") : t("community_need_organizer")}
              action={
                canCreate ? (
                  <Link href="/community/manage?new=community" className="btn-ghost py-2 text-[13px]">
                    {t("community_new")}
                  </Link>
                ) : (
                  <Link href="/me#organizer" className="btn-ghost py-2 text-[13px]">
                    {t("org_cta_apply")}
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {q.data.mine.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-card p-4">
                <CommunityMark c={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/community/${c.slug}`} className="font-display text-[17px] font-bold hover:text-accent">
                      {c.name}
                    </Link>
                    {c.approved ? (
                      <span className="chip bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">{t("community_approved")}</span>
                    ) : (
                      <span className="chip">
                        <Clock className="h-3 w-3" />
                        {t("community_pending")}
                      </span>
                    )}
                    {profile?.role === "admin" && c.approved && (
                      <button onClick={() => approve(c, false)} className="text-[12.5px] font-semibold text-muted hover:text-ink">
                        {t("community_unapprove")}
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] text-muted">
                    {c.upcoming_count > 0 ? t("community_upcoming_n", { n: c.upcoming_count }) : t("community_no_upcoming_short")}
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Link href={`/community/manage?edit=${c.id}`} className="btn-ghost py-2 text-[13px]">
                    <Pencil className="h-4 w-4" />
                    {t("community_edit")}
                  </Link>
                  <Link href={`/community/manage?meetup=new&community=${c.id}`} className="btn-ink py-2 text-[13px]">
                    <CalendarPlus className="h-4 w-4" />
                    {t("community_add_meetup")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-[13px] leading-relaxed text-soft">{t("community_manage_rules")}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------
   Topluluk formu
   --------------------------------------------------------------------- */
const slugify = (s: string) =>
  s
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

function CommunityForm({ id }: { id: string | null }) {
  const { t, te, lt, lang } = useI18n();
  const router = useRouter();
  const mine = useAsync(() => (id ? communityApi.mine() : Promise.resolve(null)), [id]);
  const existing = id ? mine.data?.mine.find((c) => c.id === id) ?? mine.data?.pending.find((c) => c.id === id) ?? null : null;
  const detail = useAsync(() => (existing ? communityApi.get(existing.slug) : Promise.resolve(null)), [existing?.slug]);

  const [f, setF] = useState<CommunityInput>({ slug: "", name: "", country: null, city: null, languages: [], description: null, links: {} });
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setF({
        id: existing.id,
        slug: existing.slug,
        name: existing.name,
        country: existing.country,
        city: existing.city,
        languages: existing.languages,
        description: lt(existing.description) || null,
        links: existing.links ?? {},
      });
      setSlugTouched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  const countries = useMemo(
    () => COUNTRY_CODES.map((c) => ({ c, n: countryName(c, lang) })).sort((a, b) => a.n.localeCompare(b.n, lang)),
    [lang]
  );

  if (id && mine.loading) return <PageLoader />;
  if (id && !existing) return <Alert>{t("not_found")}</Alert>;

  const set = <K extends keyof CommunityInput>(k: K, v: CommunityInput[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await communityApi.save({ ...f, description: typeof f.description === "string" ? f.description.trim() || null : f.description });
      router.push(`/community/${r.slug}`);
    } catch (e) {
      setErr(te(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <Link href="/community/manage" className="btn-ghost px-3 py-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" />
        {t("community_manage")}
      </Link>
      <h1 className="page-title">{existing ? t("community_edit_title") : t("community_new")}</h1>
      {!existing && <p className="-mt-3 text-[15px] text-muted">{t("community_new_sub")}</p>}

      <form onSubmit={save} className="card space-y-5 p-6">
        {err && <Alert>{err}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("community_f_name")}>
            <input
              required
              maxLength={80}
              dir="auto"
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              className="input"
            />
          </Field>
          <Field label={t("community_f_slug")} hint={`/community/${f.slug || "…"}`}>
            <input
              required
              minLength={3}
              maxLength={48}
              value={f.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              className="input tabular-nums"
            />
          </Field>
          <Field label={t("country")}>
            <select value={f.country ?? ""} onChange={(e) => set("country", e.target.value || null)} className="input cursor-pointer">
              <option value="">{t("community_global")}</option>
              {countries.map(({ c, n }) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("community_f_city")}>
            <input maxLength={80} dir="auto" value={f.city ?? ""} onChange={(e) => set("city", e.target.value || null)} className="input" />
          </Field>
        </div>

        <Field label={t("community_f_languages")} hint={t("community_f_languages_hint")}>
          <LanguagePicker value={f.languages} onChange={(v) => set("languages", v)} />
        </Field>

        <Field label={t("community_f_description")} hint={t("community_f_description_hint")}>
          <textarea
            rows={5}
            maxLength={2000}
            dir="auto"
            value={typeof f.description === "string" ? f.description : lt(f.description)}
            onChange={(e) => set("description", e.target.value)}
            className="input"
          />
        </Field>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="label mb-2">{t("community_f_links")}</legend>
          {(["website", "x", "telegram"] as const).map((k) => (
            <input
              key={k}
              type="url"
              inputMode="url"
              aria-label={k}
              placeholder={k === "website" ? "https://…" : k === "x" ? "https://x.com/…" : "https://t.me/…"}
              pattern="https://.*"
              value={f.links[k] ?? ""}
              onChange={(e) => set("links", { ...f.links, [k]: e.target.value })}
              className="input text-[14px]"
            />
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button disabled={busy} className="btn-zec">
            {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
            {existing ? t("save") : t("community_submit")}
          </button>
          {!existing && <p className="text-[13px] text-muted">{t("community_review_note")}</p>}
        </div>
      </form>

      {existing && detail.data?.organizers && <Organizers id={existing.id} list={detail.data.organizers} reload={detail.reload} />}
    </div>
  );
}

function LanguagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => onChange(value.filter((x) => x !== l))}
              className="inline-flex items-center gap-1 rounded-lg bg-tint px-2 py-1 text-[13px] font-semibold text-accent"
              aria-label={`${findLanguage(l)?.native ?? l} ×`}
            >
              {findLanguage(l)?.native ?? l}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
      {value.length < 8 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          className="input cursor-pointer"
          aria-label={t("community_f_add_language")}
        >
          <option value="">{t("community_f_add_language")}</option>
          {QUIZ_LANGUAGES.filter((l) => !value.includes(l.code)).map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} · {l.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Organizers({ id, list, reload }: { id: string; list: { id: string; username: string | null; display_name: string | null }[]; reload: () => void }) {
  const { t, te } = useI18n();
  const [u, setU] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      setU("");
      reload();
    } catch (e) {
      setErr(te(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card space-y-4 p-6">
      <div>
        <h2 className="section-title">{t("community_organizers")}</h2>
        <p className="text-[13.5px] text-muted">{t("community_organizers_hint")}</p>
      </div>
      {err && <Alert>{err}</Alert>}
      <ul className="divide-y divide-line">
        {list.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <span className="flex-1 text-[14px] font-medium">
              {o.display_name} {o.username && <span className="text-soft">@{o.username}</span>}
            </span>
            {list.length > 1 && (
              <button disabled={busy} onClick={() => run(() => communityApi.removeOrganizer(id, o.id))} className="rounded-full p-2 text-muted hover:bg-input hover:text-ink" aria-label={t("community_remove")}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (u.trim()) run(() => communityApi.addOrganizer(id, u.trim().replace(/^@/, "")));
        }}
        className="flex gap-2"
      >
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder={t("community_username_ph")} aria-label={t("username")} className="input" />
        <button disabled={busy || !u.trim()} className="btn-ink shrink-0">
          <UserPlus className="h-4 w-4" />
          {t("community_add")}
        </button>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------------
   Buluşma formu
   --------------------------------------------------------------------- */
function MeetupForm({ id, communityId }: { id: string | null; communityId: string | null }) {
  const { t, te, lt, lang } = useI18n();
  const router = useRouter();
  const existing = useAsync(() => (id && isUuid(id) ? communityApi.meetup(id) : Promise.resolve(null)), [id]);
  const mine = useAsync(() => communityApi.mine(), []);
  const quizzes = useAsync(() => api.listQuizzes({ sort: "popular", limit: 100 }), []);
  const zones = useMemo(() => timeZones(), []);

  const [cid, setCid] = useState(communityId ?? "");
  const [f, setF] = useState({
    title: "",
    description: "",
    language: "",
    date: "",
    start: "18:00",
    end: "",
    timezone: viewerZone(),
    venue: "",
    city: "",
    country: "",
    lat: "",
    lng: "",
    online_url: "",
    quiz_slug: "",
    room_code: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const m = existing.data;
    if (!m) return;
    const s = isoToZoned(m.starts_at, m.timezone);
    const e = m.ends_at ? isoToZoned(m.ends_at, m.timezone) : null;
    setCid(m.community.id);
    setF({
      title: m.title,
      description: m.description ?? "",
      language: m.language ?? "",
      date: s.date,
      start: s.time,
      end: e?.time ?? "",
      timezone: m.timezone,
      venue: m.venue ?? "",
      city: m.city ?? "",
      country: m.country ?? "",
      lat: m.lat?.toString() ?? "",
      lng: m.lng?.toString() ?? "",
      online_url: m.online_url ?? "",
      quiz_slug: m.quiz?.slug ?? "",
      room_code: m.room_code ?? "",
    });
  }, [existing.data]);

  // Yeni buluşmada ülke varsayılanı: topluluğun ülkesi
  const community = mine.data?.mine.find((c) => c.id === cid) ?? null;
  useEffect(() => {
    if (!id && community?.country) setF((s) => (s.country ? s : { ...s, country: community.country!, city: s.city || community.city || "" }));
  }, [id, community]);

  const countries = useMemo(
    () => COUNTRY_CODES.map((c) => ({ c, n: countryName(c, lang) })).sort((a, b) => a.n.localeCompare(b.n, lang)),
    [lang]
  );

  if ((id && existing.loading) || mine.loading) return <PageLoader />;
  if (id && !existing.data) return <Alert>{t("not_found")}</Alert>;

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const starts = zonedToIso(f.date, f.start, f.timezone);
    let ends = f.end ? zonedToIso(f.date, f.end, f.timezone) : null;
    if (!starts) return setErr(t("err_invalid_time"));
    // Bitiş başlangıçtan önceyse gece yarısını geçiyordur
    if (ends && ends <= starts) ends = new Date(new Date(ends).getTime() + 86400e3).toISOString();
    const p: MeetupInput = {
      id: id ?? undefined,
      community_id: id ? undefined : cid,
      title: f.title,
      description: f.description || null,
      language: f.language || null,
      starts_at: starts,
      ends_at: ends,
      timezone: f.timezone,
      city: f.city || null,
      country: f.country || null,
      lat: f.lat ? Number(f.lat) : null,
      lng: f.lng ? Number(f.lng) : null,
      venue: f.venue || null,
      online_url: f.online_url || null,
      quiz_slug: f.quiz_slug || null,
      room_code: f.room_code.replace(/\D/g, "") || null,
    };
    setBusy(true);
    try {
      const r = await communityApi.saveMeetup(p);
      router.push(`/community/meetups/${r.id}`);
    } catch (e) {
      setErr(te(e));
      setBusy(false);
    }
  };

  const communities = mine.data?.mine ?? [];
  if (!id && communities.length === 0)
    return (
      <div className="mx-auto max-w-[760px]">
        <Alert kind="info">{t("community_mine_empty")}</Alert>
      </div>
    );

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <Link href={id ? `/community/meetups/${id}` : "/community/manage"} className="btn-ghost px-3 py-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>
      <h1 className="page-title">{id ? t("community_edit_meetup") : t("community_add_meetup")}</h1>

      <form onSubmit={save} className="card space-y-6 p-6">
        {err && <Alert>{err}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t("community_f_title")}>
              <input required minLength={3} maxLength={120} dir="auto" value={f.title} onChange={(e) => set("title", e.target.value)} className="input" />
            </Field>
          </div>
          {!id && (
            <Field label={t("community_f_community")}>
              <select required value={cid} onChange={(e) => setCid(e.target.value)} className="input cursor-pointer">
                <option value="">—</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t("community_language")}>
            <select value={f.language} onChange={(e) => set("language", e.target.value)} className="input cursor-pointer">
              <option value="">—</option>
              {QUIZ_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} · {l.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t("community_f_description")}>
          <textarea rows={5} maxLength={4000} dir="auto" lang={f.language || undefined} value={f.description} onChange={(e) => set("description", e.target.value)} className="input" />
        </Field>

        <fieldset className="space-y-3">
          <legend className="font-display text-[16px] font-bold">{t("community_when")}</legend>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label={t("community_f_date")}>
              <input required type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="input" />
            </Field>
            <Field label={t("community_f_start")}>
              <input required type="time" value={f.start} onChange={(e) => set("start", e.target.value)} className="input" />
            </Field>
            <Field label={t("community_f_end")}>
              <input type="time" value={f.end} onChange={(e) => set("end", e.target.value)} className="input" />
            </Field>
            <Field label={t("community_f_timezone")}>
              <select value={f.timezone} onChange={(e) => set("timezone", e.target.value)} className="input cursor-pointer text-[14px]">
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display text-[16px] font-bold">{t("community_where")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("community_f_venue")}>
              <input maxLength={200} dir="auto" value={f.venue} onChange={(e) => set("venue", e.target.value)} className="input" />
            </Field>
            <Field label={t("community_f_city")}>
              <input maxLength={80} dir="auto" value={f.city} onChange={(e) => set("city", e.target.value)} className="input" />
            </Field>
            <Field label={t("country")}>
              <select value={f.country} onChange={(e) => set("country", e.target.value)} className="input cursor-pointer">
                <option value="">—</option>
                {countries.map(({ c, n }) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("community_f_online")} hint={t("community_f_online_hint")}>
              <input type="url" pattern="https://.*" placeholder="https://…" value={f.online_url} onChange={(e) => set("online_url", e.target.value)} className="input" />
            </Field>
            <Field label={t("community_f_coords")} hint={t("community_f_coords_hint")}>
              <div className="flex gap-2">
                <input inputMode="decimal" placeholder="41.0082" aria-label="lat" value={f.lat} onChange={(e) => set("lat", e.target.value.replace(/[^0-9.\-]/g, ""))} className="input tabular-nums" />
                <input inputMode="decimal" placeholder="28.9784" aria-label="lng" value={f.lng} onChange={(e) => set("lng", e.target.value.replace(/[^0-9.\-]/g, ""))} className="input tabular-nums" />
              </div>
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display text-[16px] font-bold">{t("community_quiz_title")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("community_f_quiz")}>
              <select value={f.quiz_slug} onChange={(e) => set("quiz_slug", e.target.value)} className="input cursor-pointer">
                <option value="">—</option>
                {(quizzes.data ?? []).map((q) => (
                  <option key={q.id} value={q.slug}>
                    {lt(q.title)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("community_f_room")} hint={t("community_f_room_hint")}>
              <input inputMode="numeric" maxLength={7} placeholder="123 456" value={f.room_code} onChange={(e) => set("room_code", e.target.value.replace(/[^\d ]/g, ""))} className="input tabular-nums" />
            </Field>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button disabled={busy} className="btn-zec">
            {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
            {id ? t("save") : t("community_publish_meetup")}
          </button>
          {community && !community.approved && <p className="text-[13px] text-muted">{t("community_meetup_hidden_note")}</p>}
          {id && (
            <Link href={`/community/meetups/${id}`} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
              <ExternalLink className="h-3.5 w-3.5" />
              {t("community_view")}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
