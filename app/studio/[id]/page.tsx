"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, Plus, Save, Send, Timer, Trash2, X } from "lucide-react";
import { ANSWER_SECS } from "@/lib/config";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { slugify } from "@/lib/quizImport";
import { Alert, BackButton, ErrorBox, Field, PageLoader, Shape, Spinner, StatusChip, ANSWER_STYLES } from "@/components/ui";
import type { EditableQuiz, LocalText, QuizStatus } from "@/lib/types";

type Bi = { tr: string; en: string };
type Q = { text: Bi; options: Bi[]; correct: number; time_limit: string; explanation: Bi; open: boolean };
type Form = { id?: string; slug: string; title: Bi; description: Bi; icon: string; tags: string; default_time: number; status?: QuizStatus; review_note?: string | null; questions: Q[] };

const ICONS = ["shield", "coin", "key", "eye", "layers", "spark", "lock", "cpu"];
const bi = (t: LocalText | null | undefined): Bi => (!t ? { tr: "", en: "" } : typeof t === "string" ? { tr: t, en: "" } : { tr: t.tr ?? "", en: t.en ?? "" });
const out = (b: Bi): LocalText | null => (b.tr.trim() || b.en.trim() ? { tr: b.tr.trim(), en: b.en.trim() } : null);
const emptyQ = (): Q => ({ text: { tr: "", en: "" }, options: [{ tr: "", en: "" }, { tr: "", en: "" }, { tr: "", en: "" }, { tr: "", en: "" }], correct: 0, time_limit: "", explanation: { tr: "", en: "" }, open: true });

function toForm(q: EditableQuiz): Form {
  return {
    id: q.id,
    slug: q.slug,
    title: bi(q.title),
    description: bi(q.description),
    icon: q.icon || "shield",
    tags: (q.tags ?? []).join(", "),
    default_time: q.default_time ?? 20,
    status: q.status,
    review_note: q.review_note,
    questions: q.questions.map((x) => ({
      text: bi(x.text),
      options: x.options.map(bi),
      correct: x.correct,
      time_limit: x.time_limit ? String(x.time_limit) : "",
      explanation: bi(x.explanation),
      open: false,
    })),
  };
}

function fromForm(f: Form): EditableQuiz {
  return {
    id: f.id,
    slug: f.slug,
    title: out(f.title) ?? "",
    description: out(f.description),
    icon: f.icon,
    tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6),
    default_time: f.default_time,
    questions: f.questions.map((q) => ({
      text: out(q.text) ?? "",
      options: q.options.map((o) => out(o) ?? ""),
      correct: q.correct,
      time_limit: q.time_limit ? Number(q.time_limit) : null,
      explanation: out(q.explanation),
    })),
  };
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { t, te } = useI18n();
  const router = useRouter();
  const auth = useRequireAuth("creator");
  const { profile } = useAuth();

  const [form, setForm] = useState<Form | null>(isNew ? { slug: "", title: { tr: "", en: "" }, description: { tr: "", en: "" }, icon: "shield", tags: "", default_time: 20, questions: [emptyQ()] } : null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (!auth.ok || isNew) return;
    api.quizForEdit(id).then((q) => setForm(toForm(q))).catch((e) => setLoadErr(te(e)));
  }, [auth.ok, id, isNew, te]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (auth.forbidden) return <ErrorBox message={t("err_creator_required")} />;
  if (loadErr) return <ErrorBox message={loadErr} action={<BackButton href="/studio" />} />;
  if (!auth.ok || !form) return <PageLoader />;

  const update = (fn: (f: Form) => void, markDirty = true) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    if (markDirty) {
      setDirty(true);
      setMsg(null);
    }
  };

  const save = async (): Promise<string | null> => {
    setBusy("save");
    setMsg(null);
    try {
      const r = await api.saveQuiz(fromForm(form));
      setDirty(false);
      setMsg({ kind: "ok", text: t("saved_ok") });
      if (isNew) router.replace(`/studio/${r.id}`);
      else update((f) => (f.status = profile?.role === "admin" ? f.status : "draft"), false);
      setDirty(false);
      return r.id;
    } catch (e) {
      setMsg({ kind: "error", text: te(e) });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    const qid = dirty || isNew ? await save() : form.id!;
    if (!qid) return;
    setBusy("submit");
    try {
      const r = await api.submitQuiz(qid);
      update((f) => (f.status = r.status as QuizStatus), false);
      setDirty(false);
      setMsg({ kind: "ok", text: r.status === "published" ? t("status_published") : t("status_pending") });
    } catch (e) {
      setMsg({ kind: "error", text: te(e) });
    } finally {
      setBusy(null);
    }
  };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton href="/studio" />
        <h1 className="page-title">{isNew ? t("new_quiz") : form.title.tr || form.title.en || t("edit")}</h1>
        {form.status && <StatusChip status={form.status} />}
        {form.id && (
          <Link href={`/quiz/${form.slug}`} className="btn-ghost ml-auto px-3 py-1.5 text-sm">
            <Eye className="h-4 w-4" /> {t("preview")}
          </Link>
        )}
      </div>

      {form.status === "published" && !isAdmin && <Alert kind="info">{t("edit_unpublishes")}</Alert>}
      {form.status === "rejected" && form.review_note && (
        <Alert>
          <b>{t("review_note")}:</b> {form.review_note}
        </Alert>
      )}

      <div className="flex items-center gap-2 rounded-[10px] border border-line bg-card px-4 py-3 text-[14px] text-muted">
        <Timer className="h-4 w-4 shrink-0 text-accent" />
        {t("answer_rule_editor", { n: ANSWER_SECS })}
      </div>

      {/* ---------- Genel bilgiler ---------- */}
      <section className="card space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("title_tr")}>
            <input
              value={form.title.tr}
              onChange={(e) =>
                update((f) => {
                  f.title.tr = e.target.value;
                  if (!slugTouched) f.slug = slugify(e.target.value);
                })
              }
              className="input"
              maxLength={120}
            />
          </Field>
          <Field label={t("title_en")}>
            <input value={form.title.en} onChange={(e) => update((f) => (f.title.en = e.target.value))} className="input" maxLength={120} />
          </Field>
          <Field label={t("desc_tr")}>
            <textarea value={form.description.tr} onChange={(e) => update((f) => (f.description.tr = e.target.value))} rows={2} className="input" maxLength={600} />
          </Field>
          <Field label={t("desc_en")}>
            <textarea value={form.description.en} onChange={(e) => update((f) => (f.description.en = e.target.value))} rows={2} className="input" maxLength={600} />
          </Field>
          <Field label={t("slug")} hint={`/quiz/${form.slug || "…"}`}>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update((f) => (f.slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60)));
              }}
              className="input tabular-nums text-sm"
            />
          </Field>
          <Field label={t("tags")}>
            <input value={form.tags} onChange={(e) => update((f) => (f.tags = e.target.value))} placeholder="Temeller, Gizlilik" className="input" />
          </Field>
          <Field label={t("icon")}>
            <select value={form.icon} onChange={(e) => update((f) => (f.icon = e.target.value))} className="input cursor-pointer">
              {ICONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ---------- Sorular ---------- */}
      {form.questions.map((q, qi) => {
        const preview = q.text.tr || q.text.en;
        return (
          <section key={qi} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3">
              <button onClick={() => update((f) => (f.questions[qi].open = !f.questions[qi].open), false)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint tabular-nums text-sm font-bold text-accent">{qi + 1}</span>
                <span className={`truncate font-medium ${preview ? "" : "text-soft"}`}>{preview || t("question_n", { n: qi + 1 })}</span>
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-soft transition ${q.open ? "rotate-180" : ""}`} />
              </button>
              <button disabled={qi === 0} onClick={() => update((f) => f.questions.splice(qi - 1, 0, f.questions.splice(qi, 1)[0]))} className="rounded p-1.5 text-soft hover:text-ink disabled:opacity-30" title={t("move_up")}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button disabled={qi === form.questions.length - 1} onClick={() => update((f) => f.questions.splice(qi + 1, 0, f.questions.splice(qi, 1)[0]))} className="rounded p-1.5 text-soft hover:text-ink disabled:opacity-30" title={t("move_down")}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button disabled={form.questions.length === 1} onClick={() => confirm(t("confirm_delete")) && update((f) => f.questions.splice(qi, 1))} className="rounded p-1.5 text-soft hover:text-[#E8742A] disabled:opacity-30" title={t("delete")}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {q.open && (
              <div className="space-y-4 border-t border-line p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("question_tr")}>
                    <textarea value={q.text.tr} onChange={(e) => update((f) => (f.questions[qi].text.tr = e.target.value))} rows={2} className="input" />
                  </Field>
                  <Field label={t("question_en")}>
                    <textarea value={q.text.en} onChange={(e) => update((f) => (f.questions[qi].text.en = e.target.value))} rows={2} className="input" />
                  </Field>
                </div>

                <div className="space-y-2">
                  {q.options.map((o, oi) => {
                    const st = ANSWER_STYLES[oi];
                    const isC = q.correct === oi;
                    return (
                      <div key={oi} className={`flex items-center gap-2 rounded-xl p-2 ${isC ? "bg-emerald-500/10 ring-1 ring-emerald-500/50" : "bg-input/50"}`}>
                        <button
                          onClick={() => update((f) => (f.questions[qi].correct = oi))}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${st.cls}`}
                          title={t("mark_correct")}
                        >
                          {isC ? <Check className="h-5 w-5" /> : <Shape shape={st.shape} className="h-4 w-4" />}
                        </button>
                        <input value={o.tr} onChange={(e) => update((f) => (f.questions[qi].options[oi].tr = e.target.value))} placeholder={`${t("option_n", { n: oi + 1 })} (TR)`} className="input min-w-0 py-2" />
                        <input value={o.en} onChange={(e) => update((f) => (f.questions[qi].options[oi].en = e.target.value))} placeholder={`${t("option_n", { n: oi + 1 })} (EN)`} className="input min-w-0 py-2" />
                        <button
                          disabled={q.options.length <= 2}
                          onClick={() =>
                            update((f) => {
                              const qq = f.questions[qi];
                              qq.options.splice(oi, 1);
                              if (qq.correct >= qq.options.length) qq.correct = 0;
                              else if (qq.correct > oi) qq.correct--;
                            })
                          }
                          className="rounded p-1.5 text-soft hover:text-[#E8742A] disabled:opacity-30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  {q.options.length < 4 && (
                    <button onClick={() => update((f) => f.questions[qi].options.push({ tr: "", en: "" }))} className="btn-ghost px-3 py-1.5 text-sm">
                      <Plus className="h-4 w-4" /> {t("add_option")}
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("explanation_tr")}>
                    <input value={q.explanation.tr} onChange={(e) => update((f) => (f.questions[qi].explanation.tr = e.target.value))} className="input" />
                  </Field>
                  <Field label={t("explanation_en")}>
                    <input value={q.explanation.en} onChange={(e) => update((f) => (f.questions[qi].explanation.en = e.target.value))} className="input" />
                  </Field>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <button
        onClick={() =>
          update((f) => {
            f.questions.forEach((x) => (x.open = false));
            f.questions.push(emptyQ());
          })
        }
        disabled={form.questions.length >= 100}
        className="btn-ghost w-full border-dashed py-4"
      >
        <Plus className="h-5 w-5" /> {t("add_question")}
      </button>

      {/* ---------- Sabit alt çubuk ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur lg:left-[232px]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          {msg ? <span className={`text-sm font-medium ${msg.kind === "ok" ? "text-emerald-500" : "text-[#E8742A]"}`}>{msg.text}</span> : dirty && <span className="text-sm text-soft">{t("unsaved")}</span>}
          <div className="ml-auto flex gap-2">
            <button onClick={save} disabled={!!busy || (!dirty && !isNew)} className="btn-ghost py-2">
              {busy === "save" ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {t("save")}
            </button>
            {form.status !== "published" && form.status !== "pending" && (
              <button onClick={submit} disabled={!!busy} className="btn-zec py-2">
                {busy === "submit" ? <Spinner className="h-4 w-4 text-[#1A1506]" /> : <Send className="h-4 w-4" />}
                {isAdmin ? t("publish") : t("submit_review")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
