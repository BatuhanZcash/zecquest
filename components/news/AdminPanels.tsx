"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import { findLanguage, textAttrs } from "@/lib/languages";
import { newsApi, type KeyPersonRow, type TranslationRow } from "@/lib/api-news";
import { formatDigestDate, formatNumber } from "@/lib/news/format";
import type { KeyPersonKind } from "@/lib/news/types";
import { Alert, Field, Spinner } from "@/components/ui";
import { NetworkStatus } from "@/components/NetworkStatus";
import { TranslationStatus } from "./parts";
import { newsError } from "./errors";

/* ---------------- Translations ---------------- */
export function TranslationsTab() {
  const { t } = useI18n();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const q = useAsync(() => newsApi.translations(status), [status]);
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} aria-pressed={s === status} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${s === status ? "bg-ink text-card" : "bg-card text-muted ring-1 ring-line"}`}>
            {t(`news_status_${s}` as DictKey)}
          </button>
        ))}
      </div>
      {q.loading && !q.data ? (
        <div className="h-40 animate-pulse rounded-2xl bg-input" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-[14px] text-muted">{t("news_tr_pending_empty")}</p>
      ) : (
        q.data!.map((tr) => <TranslationCard key={tr.id} tr={tr} onDone={q.reload} />)
      )}
    </div>
  );
}

function TranslationCard({ tr, onDone }: { tr: TranslationRow; onDone: () => void }) {
  const { t, lang: uiLang } = useI18n();
  const base = useAsync(() => newsApi.digest(tr.digest_date, null), [tr.digest_date]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const review = async (approve: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await newsApi.reviewTranslation(tr.id, approve, note);
      onDone();
    } catch (e) {
      setErr(newsError(e, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <Link href={`/news/${tr.digest_date}`} className="font-semibold hover:underline">
          {formatDigestDate(tr.digest_date, uiLang)}
        </Link>
        <span className="rounded-md bg-input px-2 py-0.5 text-[12px] font-bold">{findLanguage(tr.lang)?.native ?? tr.lang}</span>
        <span className="text-[13px] text-muted">{t("news_tr_by", { name: tr.submitter.display_name })}</span>
        <span className="ml-auto">
          <TranslationStatus status={tr.status} />
        </span>
      </header>
      <div className="divide-y divide-line">
        <Row a={base.data?.title} b={tr.title} lang={tr.lang} />
        {(tr.intro || base.data?.intro) && <Row a={base.data?.intro ?? ""} b={tr.intro ?? ""} lang={tr.lang} />}
        {(base.data?.items ?? []).map((it) => {
          const x = tr.items[it.id];
          return <Row key={it.id} a={`${it.title}\n${it.summary}`} b={x ? `${x.title}\n${x.summary}` : t("news_not_translated")} lang={tr.lang} muted={!x} />;
        })}
      </div>
      {tr.status === "pending" && (
        <footer className="flex flex-wrap items-end gap-2 border-t border-line bg-app/50 px-5 py-3">
          <div className="min-w-[200px] flex-1">
            <Field label={t("news_tr_note")}>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="input py-2" />
            </Field>
          </div>
          <button onClick={() => review(false)} disabled={busy} className="btn-ghost px-4 py-2">
            <X className="h-4 w-4" aria-hidden="true" />
            {t("news_tr_reject")}
          </button>
          <button onClick={() => review(true)} disabled={busy} className="btn-zec px-4 py-2">
            {busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {t("news_tr_approve")}
          </button>
          {err && <div className="w-full">
            <Alert>{err}</Alert>
          </div>}
        </footer>
      )}
      {tr.note && <p className="border-t border-line px-5 py-2 text-[13px] text-muted">{tr.note}</p>}
    </article>
  );
}

function Row({ a, b, lang, muted }: { a?: string; b: string; lang: string; muted?: boolean }) {
  return (
    <div className="grid gap-2 px-5 py-3 text-[14px] leading-relaxed md:grid-cols-2 md:gap-6">
      <p className="whitespace-pre-line text-muted">{a ?? "…"}</p>
      <p className={`whitespace-pre-line ${muted ? "italic text-soft" : ""}`} {...textAttrs(lang)}>
        {b}
      </p>
    </div>
  );
}

/* ---------------- Key people ---------------- */
const KINDS: KeyPersonKind[] = ["org", "protocol", "zcg", "ecosystem"];

export function PeopleTab() {
  const { t } = useI18n();
  const q = useAsync(() => newsApi.people(), []);
  const [form, setForm] = useState<KeyPersonRow>({ username: "", display_name: "", affiliation: "", kind: "ecosystem", active: true });
  const [err, setErr] = useState<string | null>(null);
  const save = async (p: KeyPersonRow) => {
    setErr(null);
    try {
      await newsApi.savePerson(p);
      q.reload();
      return true;
    } catch (e) {
      setErr(newsError(e, t));
      return false;
    }
  };
  return (
    <div className="space-y-4">
      <p className="max-w-[70ch] text-[14px] text-muted">{t("news_people_intro")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save(form)) setForm({ username: "", display_name: "", affiliation: "", kind: "ecosystem", active: true });
        }}
        className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
      >
        <Field label={t("news_people_username")}>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required pattern="[A-Za-z0-9_.\-]{1,60}" className="input py-2" />
        </Field>
        <Field label={t("news_people_name")}>
          <input value={form.display_name ?? ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="input py-2" />
        </Field>
        <Field label={t("news_people_affiliation")}>
          <input value={form.affiliation ?? ""} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} className="input py-2" />
        </Field>
        <Field label={t("news_people_kind")}>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as KeyPersonKind })} className="input py-2">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`news_kind_${k}` as DictKey)}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn-ink h-[42px] px-4">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("news_people_add")}
        </button>
      </form>
      {err && <Alert>{err}</Alert>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead className="text-left text-[12px] text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 font-medium">{t("news_people_username")}</th>
              <th className="px-2 py-2.5 font-medium">{t("news_people_name")}</th>
              <th className="px-2 py-2.5 font-medium">{t("news_people_affiliation")}</th>
              <th className="px-2 py-2.5 font-medium">{t("news_people_kind")}</th>
              <th className="px-2 py-2.5 font-medium">{t("news_people_active")}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(q.data ?? []).map((p) => (
              <PersonRow key={p.username} p={p} onSave={save} onDelete={async () => {
                await newsApi.deletePerson(p.username);
                q.reload();
              }} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersonRow({ p, onSave, onDelete }: { p: KeyPersonRow; onSave: (p: KeyPersonRow) => Promise<boolean>; onDelete: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState(p);
  useEffect(() => setV(p), [p]);
  const changed = JSON.stringify(v) !== JSON.stringify(p);
  return (
    <tr className={v.active ? "" : "opacity-60"}>
      <td className="px-4 py-2 font-semibold">
        <a href={`https://forum.zcashcommunity.com/u/${encodeURIComponent(p.username)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {p.username}
        </a>
      </td>
      <td className="px-2 py-2">
        <input value={v.display_name ?? ""} onChange={(e) => setV({ ...v, display_name: e.target.value })} className="input px-2.5 py-1.5 text-[13.5px]" aria-label={t("news_people_name")} />
      </td>
      <td className="px-2 py-2">
        <input value={v.affiliation ?? ""} onChange={(e) => setV({ ...v, affiliation: e.target.value })} className="input px-2.5 py-1.5 text-[13.5px]" aria-label={t("news_people_affiliation")} />
      </td>
      <td className="px-2 py-2">
        <select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as KeyPersonKind })} className="input px-2.5 py-1.5 text-[13.5px]" aria-label={t("news_people_kind")}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`news_kind_${k}` as DictKey)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="accent-[#F4B728]" aria-label={t("news_people_active")} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        {changed && (
          <button onClick={() => onSave(v)} className="btn-zec mr-1 px-3 py-1 text-[12.5px]">
            {t("news_save")}
          </button>
        )}
        <button onClick={onDelete} aria-label={t("news_remove")} className="rounded-lg p-1.5 text-muted hover:bg-[#D93036]/10 hover:text-[#D93036]">
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

/* ---------------- Network & collector ---------------- */
export function SettingsTab() {
  const { t, lang } = useI18n();
  const net = useAsync(() => newsApi.network(), []);
  const runs = useAsync(() => newsApi.runs(10), []);
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    const u = net.data?.next_upgrade ?? net.data?.last_upgrade;
    if (u) {
      setName(u.name);
      setHeight(String(u.height));
    }
  }, [net.data]);
  const submit = async (clear = false) => {
    setMsg(null);
    try {
      const h = clear ? null : Number(height.replace(/[^\d]/g, ""));
      await newsApi.setUpgrade(clear ? null : name.trim(), h || null);
      if (clear) {
        setName("");
        setHeight("");
      }
      net.reload();
      setMsg({ kind: "ok", text: t("news_saved") });
    } catch (e) {
      setMsg({ kind: "error", text: newsError(e, t) });
    }
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="card space-y-3 p-5">
          <h2 className="section-title">{t("news_upgrade_title")}</h2>
          <p className="text-[13.5px] text-muted">{t("news_upgrade_hint")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          >
            <Field label={t("news_upgrade_name")}>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="NU8" className="input py-2" />
            </Field>
            <Field label={t("news_upgrade_height")}>
              <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" placeholder="3543405" className="input py-2 tabular-nums" />
            </Field>
            <button className="btn-ink h-[42px] px-4">{t("news_save")}</button>
            <button type="button" onClick={() => submit(true)} className="btn-ghost h-[42px] px-4">
              {t("news_upgrade_clear")}
            </button>
          </form>
          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3.5 section-title">{t("news_runs_title")}</h2>
          {(runs.data ?? []).length === 0 ? (
            <p className="px-5 py-5 text-[14px] text-muted">{t("news_runs_empty")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {runs.data!.map((r) => (
                <li key={r.id} className="px-5 py-3 text-[13.5px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold tabular-nums">{new Date(r.ran_at).toLocaleString(lang)}</span>
                    <span className="text-muted">{r.digest_date}</span>
                    <span className="text-muted">{t("news_collected_n", { n: r.stats.items ?? 0 })}</span>
                    {r.errors.length > 0 && <span className="font-semibold text-[#E8742A]">{t("news_runs_errors", { n: r.errors.length })}</span>}
                    {r.stats.requests != null && <span className="text-soft">{formatNumber(r.stats.requests, lang)} req</span>}
                  </div>
                  {r.errors.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[12px] text-soft">{t("news_runs_errors", { n: r.errors.length })}</summary>
                      <ul className="mt-1 space-y-0.5 font-mono text-[11.5px] text-muted">
                        {r.errors.map((e, i) => (
                          <li key={i} className="break-all">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <NetworkStatus variant="full" data={net.data} />
    </div>
  );
}
