"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import { QUIZ_LANGUAGES, findLanguage, textAttrs } from "@/lib/languages";
import { newsApi, type AdminDigest, type CollectedRow, type Digest, type EditorItem, type EditorItemText } from "@/lib/api-news";
import { SECTIONS, type Tier } from "@/lib/news/types";
import { formatDigestDate } from "@/lib/news/format";
import { Alert, Field, Spinner } from "@/components/ui";
import { CollectedCard, TIER_STYLE } from "./Collected";
import { SharePanel } from "./parts";
import { newsError } from "./errors";

type Item = EditorItem & { id: string };
type LangText = { title: string; intro: string; items: Record<string, EditorItemText> };
interface Draft {
  baseLang: string;
  items: Item[];
  texts: Record<string, LangText>;
}

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16));

const emptyDraft = (lang = "en"): Draft => ({ baseLang: lang, items: [], texts: { [lang]: { title: "", intro: "", items: {} } } });

function fromAdmin(d: AdminDigest): Draft {
  const texts: Record<string, LangText> = {};
  for (const [lang, v] of Object.entries(d.versions)) texts[lang] = { title: v.title, intro: v.intro ?? "", items: v.items ?? {} };
  if (!texts[d.base_lang]) texts[d.base_lang] = { title: "", intro: "", items: {} };
  return {
    baseLang: d.base_lang,
    items: d.items.map((i) => ({
      id: i.id,
      section: i.section,
      tier: i.tier,
      url: i.url,
      source_name: i.source_name ?? "",
      attribution: i.attribution ?? "",
      kind: i.kind,
      verified: i.verified,
      related_slug: i.related_slug ?? "",
      source_item_id: i.source_item_id ?? null,
    })),
    texts,
  };
}

function sourceNameFor(row: CollectedRow) {
  if (row.source === "forum") return row.author_is_official && row.author ? `${row.metrics.attribution ?? row.author} (Zcash Forum)` : "Zcash Forum";
  return (row.metrics.attribution as string) || "GitHub";
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

export function ComposeTab({ date, onDate }: { date: string | null; onDate: (d: string) => void }) {
  const { t, lang: uiLang } = useI18n();
  const dates = useAsync(() => newsApi.dates(), []);
  const [newDay, setNewDay] = useState(todayUtc());
  const current = date ?? dates.data?.[0]?.date ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <div className="label mb-1.5">{t("news_days")}</div>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {dates.loading && !dates.data && <div className="h-10 w-64 animate-pulse rounded-xl bg-input" />}
            {(dates.data ?? []).map((d) => (
              <button
                key={d.date}
                onClick={() => onDate(d.date)}
                aria-current={d.date === current ? "date" : undefined}
                className={`shrink-0 rounded-xl px-3 py-2 text-left transition ${d.date === current ? "bg-ink text-card" : "bg-card ring-1 ring-line hover:ring-[rgb(var(--soft))]"}`}
              >
                <div className="text-[13px] font-semibold tabular-nums">{formatDigestDate(d.date, uiLang, { short: true })}</div>
                <div className={`text-[11px] ${d.date === current ? "opacity-70" : "text-soft"}`}>
                  {d.status ? t(d.status === "published" ? "news_published" : "news_draft") : "—"} · {t("news_collected_n", { n: d.collected })}
                </div>
              </button>
            ))}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{4}-\d{2}-\d{2}$/.test(newDay)) onDate(newDay);
          }}
          className="flex items-end gap-2"
        >
          <Field label={t("news_day_new")}>
            <input type="date" value={newDay} onChange={(e) => setNewDay(e.target.value)} className="input py-2" />
          </Field>
          <button className="btn-ghost h-[42px] px-3">
            <Plus className="h-4 w-4" aria-label={t("news_day_new")} />
          </button>
        </form>
      </div>

      {current ? <DayEditor key={current} date={current} onSaved={dates.reload} /> : !dates.loading && <p className="text-muted">{t("news_pick_day")}</p>}
    </div>
  );
}

function DayEditor({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { t, lang: uiLang } = useI18n();
  const [showDismissed, setShowDismissed] = useState(false);
  const collected = useAsync(() => newsApi.items(date, showDismissed), [date, showDismissed]);
  const loaded = useAsync(() => newsApi.adminDigest(date), [date]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | null>(null);
  const [editLang, setEditLang] = useState("en");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState<Digest | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (loaded.loading) return;
    const d = loaded.data ? fromAdmin(loaded.data) : emptyDraft("en");
    setDraft(d);
    setStatus(loaded.data?.status ?? null);
    setEditLang(d.baseLang);
    setDirty(false);
  }, [loaded.data, loaded.loading]);

  // Share preview (published digests only: the card route is public)
  useEffect(() => {
    if (status !== "published" || dirty) return setPreview(null);
    newsApi.digest(date, editLang).then(setPreview).catch(() => setPreview(null));
  }, [status, dirty, date, editLang]);

  const update = useCallback((fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
    setMsg(null);
  }, []);

  const setText = (id: string, patch: Partial<EditorItemText>) =>
    update((d) => {
      const lt = d.texts[editLang] ?? { title: "", intro: "", items: {} };
      return { ...d, texts: { ...d.texts, [editLang]: { ...lt, items: { ...lt.items, [id]: { ...{ title: "", summary: "" }, ...lt.items[id], ...patch } } } } };
    });
  const setItem = (id: string, patch: Partial<Item>) =>
    update((d) => {
      let items = d.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
      // only one lead: promoting an item demotes the previous lead
      if (patch.tier === "lead") items = items.map((i) => (i.id !== id && i.tier === "lead" ? { ...i, tier: "brief" as Tier } : i));
      return { ...d, items };
    });
  const move = (from: number, to: number) =>
    update((d) => {
      if (to < 0 || to >= d.items.length) return d;
      const items = [...d.items];
      const [x] = items.splice(from, 1);
      items.splice(to, 0, x);
      return { ...d, items };
    });

  const addRow = (row: CollectedRow) =>
    update((d) => {
      const id = uuid();
      const hasLead = d.items.some((i) => i.tier === "lead");
      const item: Item = {
        id,
        section: (row.metrics.section as string) || "community",
        tier: row.tier === "lead" && hasLead ? "brief" : row.tier,
        url: row.url,
        source_name: sourceNameFor(row),
        attribution: (row.metrics.attribution as string) || row.author || "",
        kind: row.kind,
        verified: !row.single_source,
        related_slug: "",
        source_item_id: row.id,
      };
      const base = d.texts[d.baseLang];
      return {
        ...d,
        items: [...d.items, item],
        texts: { ...d.texts, [d.baseLang]: { ...base, items: { ...base.items, [id]: { title: row.title, summary: row.excerpt ?? "" } } } },
      };
    });
  const addBlank = () =>
    update((d) => ({
      ...d,
      items: [...d.items, { id: uuid(), section: "ecosystem", tier: d.items.length ? "brief" : "lead", url: "https://", source_name: "", attribution: "", kind: "fact", verified: false, related_slug: "", source_item_id: null }],
    }));

  const save = async () => {
    if (!draft) return false;
    setBusy("save");
    setMsg(null);
    try {
      const texts: Record<string, { title: string; intro?: string; items: EditorItemText[] }> = {};
      for (const [lang, v] of Object.entries(draft.texts)) {
        if (!v.title.trim() && lang !== draft.baseLang) continue;
        texts[lang] = {
          title: v.title,
          intro: v.intro,
          items: draft.items.map((i) => {
            const x = v.items[i.id] ?? { title: "", summary: "" };
            return { title: x.title ?? "", summary: x.summary ?? "", badge: x.badge ?? "", facts: (x.facts ?? []).filter((f) => f.value.trim()) };
          }),
        };
      }
      const saved = await newsApi.saveDigest(date, {
        base_lang: draft.baseLang,
        items: draft.items.map((i) => ({ ...i, related_slug: i.related_slug.trim(), attribution: i.kind === "statement" ? i.attribution : i.attribution })),
        texts,
      });
      const next = fromAdmin(saved);
      // keep unsaved empty languages the editor just added
      for (const [l, v] of Object.entries(draft.texts)) if (!next.texts[l]) next.texts[l] = v;
      setDraft(next);
      setStatus(saved.status);
      setDirty(false);
      setMsg({ kind: "ok", text: t("news_saved") });
      onSaved();
      return true;
    } catch (e) {
      setMsg({ kind: "error", text: newsError(e, t) });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const publish = async (to: "draft" | "published") => {
    if (!draft) return;
    if (to === "published") {
      const unverified = draft.items.filter((i) => !i.verified).length;
      if (unverified && !window.confirm(t("news_confirm_unverified", { n: unverified }))) return;
    }
    if (dirty && !(await save())) return;
    setBusy("publish");
    try {
      await newsApi.setStatus(date, to);
      setStatus(to);
      setMsg({ kind: "ok", text: to === "published" ? t("news_published") : t("news_draft") });
      onSaved();
    } catch (e) {
      setMsg({ kind: "error", text: newsError(e, t) });
    } finally {
      setBusy(null);
    }
  };

  const del = async () => {
    if (!window.confirm(t("news_confirm_delete"))) return;
    try {
      await newsApi.deleteDigest(date);
      onSaved();
      loaded.reload();
    } catch (e) {
      setMsg({ kind: "error", text: newsError(e, t) });
    }
  };

  const usedIds = useMemo(() => new Set((draft?.items ?? []).map((i) => i.source_item_id).filter(Boolean)), [draft]);
  const langs = draft ? Object.keys(draft.texts).sort((a, b) => (a === draft.baseLang ? -1 : b === draft.baseLang ? 1 : a.localeCompare(b))) : [];
  const lt = draft?.texts[editLang];
  const isBase = draft?.baseLang === editLang;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      {/* ---------- Collected ---------- */}
      <section aria-labelledby="collected-title" className="space-y-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
        <div className="flex items-center justify-between gap-2">
          <h2 id="collected-title" className="section-title">
            {t("news_collected")}
            {collected.data && <span className="ml-2 text-[13px] font-medium text-soft">{collected.data.length}</span>}
          </h2>
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} className="accent-[#F4B728]" />
            {t("news_show_dismissed")}
          </label>
        </div>
        {collected.loading && !collected.data ? (
          [0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-input" />)
        ) : (collected.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-[14px] text-muted">{t("news_collected_empty")}</p>
        ) : (
          collected.data!.map((row) => (
            <CollectedCard
              key={row.id}
              row={row}
              added={usedIds.has(row.id)}
              onAdd={() => addRow(row)}
              onDismiss={async (dis) => {
                await newsApi.dismiss(row.id, dis);
                collected.reload();
              }}
            />
          ))
        )}
      </section>

      {/* ---------- Composer ---------- */}
      <section aria-labelledby="compose-title" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="compose-title" className="section-title mr-auto">
            {formatDigestDate(date, uiLang, { weekday: true })}
          </h2>
          {status && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status === "published" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-input text-muted"}`}>
              {t(status === "published" ? "news_published" : "news_draft")}
            </span>
          )}
          {dirty && <span className="text-[12px] font-semibold text-accent">{t("news_unsaved")}</span>}
        </div>

        {!draft || loaded.loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-input" />
        ) : (
          <>
            {/* languages */}
            <div className="card flex flex-wrap items-center gap-2 p-3">
              <span className="label px-1">{t("news_languages")}</span>
              {langs.map((l) => (
                <button
                  key={l}
                  onClick={() => setEditLang(l)}
                  aria-pressed={l === editLang}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${l === editLang ? "bg-ink text-card" : "bg-input text-muted hover:text-ink"}`}
                >
                  {findLanguage(l)?.native ?? l}
                  {l === draft.baseLang && <span className="ml-1 opacity-60">★</span>}
                </button>
              ))}
              <select
                value=""
                onChange={(e) => {
                  const l = e.target.value;
                  if (!l) return;
                  update((d) => ({ ...d, texts: { ...d.texts, [l]: d.texts[l] ?? { title: "", intro: "", items: {} } } }));
                  setEditLang(l);
                }}
                className="input w-auto py-1 text-[13px]"
                aria-label={t("news_add_lang")}
              >
                <option value="">+ {t("news_add_lang")}</option>
                {QUIZ_LANGUAGES.filter((l) => !langs.includes(l.code)).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
              {!isBase && status && loaded.data?.versions[editLang] && (
                <button
                  onClick={async () => {
                    await newsApi.deleteVersion(date, editLang);
                    loaded.reload();
                  }}
                  className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#D93036] hover:underline"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("news_delete_lang")}
                </button>
              )}
              {isBase && !status && (
                <label className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
                  {t("news_base_lang")}
                  <select
                    value={draft.baseLang}
                    onChange={(e) => {
                      const l = e.target.value;
                      update((d) => ({ ...d, baseLang: l, texts: { ...d.texts, [l]: d.texts[l] ?? d.texts[d.baseLang] } }));
                      setEditLang(l);
                    }}
                    className="input w-auto py-1 text-[13px]"
                  >
                    {QUIZ_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* title + intro */}
            <div className="card space-y-3 p-4" lang={editLang}>
              <Field label={`${t("news_digest_title")} · ${findLanguage(editLang)?.native ?? editLang}`}>
                <input
                  value={lt?.title ?? ""}
                  onChange={(e) => update((d) => ({ ...d, texts: { ...d.texts, [editLang]: { ...d.texts[editLang], title: e.target.value } } }))}
                  placeholder={t("news_digest_title_ph")}
                  maxLength={140}
                  className="input font-display text-[18px] font-bold"
                  {...textAttrs(editLang)}
                />
              </Field>
              <Field label={t("news_intro")}>
                <textarea
                  value={lt?.intro ?? ""}
                  onChange={(e) => update((d) => ({ ...d, texts: { ...d.texts, [editLang]: { ...d.texts[editLang], intro: e.target.value } } }))}
                  rows={2}
                  maxLength={600}
                  className="input"
                  {...textAttrs(editLang)}
                />
              </Field>
            </div>

            {/* items */}
            {draft.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[14px] text-muted">{t("news_compose_empty")}</p>
            ) : (
              <>
                <p className="text-[12px] text-soft">{t("news_drag_hint")}</p>
                <ol className="space-y-3">
                  {draft.items.map((it, n) => {
                    const x = lt?.items[it.id] ?? { title: "", summary: "" };
                    const baseX = draft.texts[draft.baseLang]?.items[it.id];
                    return (
                      <li
                        key={it.id}
                        draggable
                        onDragStart={(e) => {
                          setDragIdx(n);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIdx !== null && dragIdx !== n) move(dragIdx, n);
                          setDragIdx(null);
                        }}
                        onDragEnd={() => setDragIdx(null)}
                        className={`card overflow-hidden transition ${dragIdx === n ? "opacity-50" : ""} ${it.tier === "lead" ? "ring-2 ring-zec" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-app/60 px-3 py-2">
                          <GripVertical className="h-4 w-4 cursor-grab text-soft" aria-hidden="true" />
                          <span className="font-display text-[15px] font-extrabold tabular-nums text-soft">{n + 1}</span>
                          <select value={it.tier} onChange={(e) => setItem(it.id, { tier: e.target.value as Tier })} aria-label={t("news_item_tier")} className={`rounded-md border-0 px-2 py-1 text-[12px] font-bold ${TIER_STYLE[it.tier]}`}>
                            {(["lead", "brief", "watch"] as Tier[]).map((v) => (
                              <option key={v} value={v}>
                                {t(`news_tier_${v}` as DictKey)}
                              </option>
                            ))}
                          </select>
                          <select value={it.section} onChange={(e) => setItem(it.id, { section: e.target.value })} aria-label={t("news_item_section")} className="rounded-md border border-line bg-card px-2 py-1 text-[12px] font-semibold">
                            {SECTIONS.map((s) => (
                              <option key={s} value={s}>
                                {t(`news_sec_${s}` as DictKey)}
                              </option>
                            ))}
                          </select>
                          <div className="ml-auto flex items-center gap-0.5">
                            <IconBtn label={t("news_move_up")} disabled={n === 0} onClick={() => move(n, n - 1)}>
                              <ArrowUp className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn label={t("news_move_down")} disabled={n === draft.items.length - 1} onClick={() => move(n, n + 1)}>
                              <ArrowDown className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn label={t("news_remove")} onClick={() => update((d) => ({ ...d, items: d.items.filter((i) => i.id !== it.id) }))} danger>
                              <Trash2 className="h-4 w-4" />
                            </IconBtn>
                          </div>
                        </div>

                        <div className="grid gap-3 p-4">
                          <Field label={t("news_item_title")}>
                            <input value={x.title ?? ""} onChange={(e) => setText(it.id, { title: e.target.value })} maxLength={160} placeholder={!isBase ? baseX?.title : undefined} className="input font-semibold" {...textAttrs(editLang)} />
                          </Field>
                          <Field label={t("news_item_summary")} hint={t("news_item_summary_hint")}>
                            <textarea value={x.summary ?? ""} onChange={(e) => setText(it.id, { summary: e.target.value })} rows={3} maxLength={700} placeholder={!isBase ? baseX?.summary : undefined} className="input" {...textAttrs(editLang)} />
                          </Field>
                          {it.tier === "lead" && (
                            <div className="grid gap-3 rounded-xl bg-tint/60 p-3">
                              <Field label={t("news_badge")} hint={t("news_item_badge_hint")}>
                                <input value={x.badge ?? ""} onChange={(e) => setText(it.id, { badge: e.target.value })} maxLength={40} className="input" {...textAttrs(editLang)} />
                              </Field>
                              <div>
                                <div className="label mb-1.5">
                                  {t("news_facts")} <span className="text-soft">· {t("news_item_facts_hint")}</span>
                                </div>
                                <div className="space-y-2">
                                  {(x.facts ?? []).map((f, k) => (
                                    <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)_auto] gap-2">
                                      <input value={f.value} onChange={(e) => setText(it.id, { facts: (x.facts ?? []).map((g, j) => (j === k ? { ...g, value: e.target.value } : g)) })} maxLength={24} placeholder={t("news_fact_value")} aria-label={t("news_fact_value")} className="input py-2" />
                                      <input value={f.label} onChange={(e) => setText(it.id, { facts: (x.facts ?? []).map((g, j) => (j === k ? { ...g, label: e.target.value } : g)) })} maxLength={120} placeholder={t("news_fact_label")} aria-label={t("news_fact_label")} className="input py-2" {...textAttrs(editLang)} />
                                      <IconBtn label={t("news_remove")} onClick={() => setText(it.id, { facts: (x.facts ?? []).filter((_, j) => j !== k) })}>
                                        <X className="h-4 w-4" />
                                      </IconBtn>
                                    </div>
                                  ))}
                                  {(x.facts?.length ?? 0) < 3 && (
                                    <button onClick={() => setText(it.id, { facts: [...(x.facts ?? []), { value: "", label: "" }] })} className="btn-ghost px-3 py-1.5 text-[12.5px]">
                                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                      {t("news_add_fact")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {isBase && (
                            <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                              <Field label={t("news_item_url")}>
                                <input value={it.url} onChange={(e) => setItem(it.id, { url: e.target.value })} type="url" className="input" />
                              </Field>
                              <Field label={t("news_item_source_name")}>
                                <input value={it.source_name} onChange={(e) => setItem(it.id, { source_name: e.target.value })} maxLength={80} placeholder="Zcash Forum" className="input" />
                              </Field>
                              <Field label={t("news_item_kind")}>
                                <select value={it.kind} onChange={(e) => setItem(it.id, { kind: e.target.value as Item["kind"] })} className="input">
                                  <option value="fact">{t("news_kind_fact")}</option>
                                  <option value="statement">{t("news_kind_statement")}</option>
                                </select>
                              </Field>
                              <Field label={t("news_item_attribution")}>
                                <input value={it.attribution} onChange={(e) => setItem(it.id, { attribution: e.target.value })} maxLength={120} required={it.kind === "statement"} className="input" />
                              </Field>
                              <Field label={t("news_item_related")} hint={t("news_item_related_hint")}>
                                <input value={it.related_slug} onChange={(e) => setItem(it.id, { related_slug: e.target.value })} maxLength={100} placeholder="shielded-pool" className="input" />
                              </Field>
                              <label className={`flex items-start gap-2.5 self-end rounded-xl px-3 py-2.5 text-[13px] ${it.verified ? "bg-emerald-500/10" : "bg-[#E8742A]/10"}`}>
                                <input type="checkbox" checked={it.verified} onChange={(e) => setItem(it.id, { verified: e.target.checked })} className="mt-0.5 accent-[#12A387]" />
                                <span>
                                  <span className="font-semibold">{t("news_item_verified")}</span>
                                  {!it.verified && <span className="block text-[12px] text-[#C25A12] dark:text-[#F0965A]">{t("news_single_source_hint")}</span>}
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
            <button onClick={addBlank} className="btn-ghost px-3.5 py-2 text-[13px]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("news_add_blank")}
            </button>

            {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

            <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card/95 p-3 shadow-card backdrop-blur lg:bottom-4">
              <button onClick={save} disabled={!!busy || !dirty} className="btn-ink px-4 py-2">
                {busy === "save" ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {t("news_save")}
              </button>
              {status === "published" ? (
                <button onClick={() => publish("draft")} disabled={!!busy} className="btn-ghost px-4 py-2">
                  {t("news_unpublish")}
                </button>
              ) : (
                <button onClick={() => publish("published")} disabled={!!busy || draft.items.length === 0} className="btn-zec px-4 py-2">
                  {busy === "publish" && <Spinner className="h-4 w-4" />}
                  {t("news_publish")}
                </button>
              )}
              {status && (
                <Link href={`/news/${date}${editLang !== draft.baseLang ? `?lang=${editLang}` : ""}`} target="_blank" className="btn-ghost px-4 py-2">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {t("news_view_public")}
                </Link>
              )}
              {status === "draft" && (
                <button onClick={del} className="ml-auto inline-flex items-center gap-1 px-2 text-[13px] font-semibold text-[#D93036] hover:underline">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t("news_delete_draft")}
                </button>
              )}
            </div>

            {preview && (
              <section className="card p-4">
                <h3 className="mb-3 font-display text-[16px] font-bold">{t("news_share")}</h3>
                <SharePanel digest={preview} />
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 transition disabled:opacity-30 ${danger ? "text-muted hover:bg-[#D93036]/10 hover:text-[#D93036]" : "text-muted hover:bg-input hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
