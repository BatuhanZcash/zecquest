"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, FileJson, Pencil, Plus, Radio, Send, Trash2, Upload } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { parseQuizJson } from "@/lib/quizImport";
import { QuizCover } from "@/components/QuizCover";
import { Alert, ErrorBox, PageLoader, Spinner, StatusChip, hashIndex } from "@/components/ui";
import type { QuizCardData } from "@/lib/types";

export default function StudioPage() {
  const { t, te } = useI18n();
  const auth = useRequireAuth("creator");
  const { data, loading, reload } = useAsync(() => (auth.ok ? api.myQuizzes() : Promise.resolve(null)), [auth.ok]);
  const [importOpen, setImportOpen] = useState(false);

  if (auth.forbidden) return <ErrorBox message={t("err_creator_required")} action={<Link href="/me" className="btn-zec">{t("become_creator")}</Link>} />;
  if (!auth.ok || (loading && !data)) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("studio_title")}</h1>
          <p className="text-sm text-muted">{t("studio_sub")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen((o) => !o)} className="btn-ghost py-2 text-sm">
            <FileJson className="h-4 w-4" /> {t("import_json")}
          </button>
          <Link href="/studio/new" className="btn-zec py-2 text-sm">
            <Plus className="h-4 w-4" /> {t("new_quiz")}
          </Link>
        </div>
      </div>

      {importOpen && <ImportPanel onDone={() => { reload(); }} />}

      {!data?.length ? (
        <div className="card p-10 text-center text-muted">{t("no_quizzes_yet")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((q) => (
            <StudioCard key={q.id} q={q} onChange={reload} onError={(e) => alert(te(e))} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudioCard({ q, onChange, onError }: { q: QuizCardData; onChange: () => void; onError: (e: unknown) => void }) {
  const { t, lt } = useI18n();
  const router = useRouter();
  const { profile } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  const act = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    try {
      await fn();
      onChange();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card flex flex-col overflow-hidden">
      <QuizCover icon={q.icon} cover={q.cover_url} index={hashIndex(q.id)} className="h-24" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-semibold leading-snug">{lt(q.title)}</h3>
          <StatusChip status={q.status} />
        </div>
        <p className="mt-1 text-xs text-soft">
          {q.question_count} {t("questions")} · {q.plays} {t("plays").toLowerCase()}
        </p>
        {q.status === "rejected" && q.review_note && (
          <div className="mt-3">
            <Alert>
              <b>{t("review_note")}:</b> {q.review_note}
            </Alert>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2 pt-1 [margin-top:auto]">
          <Link href={`/studio/${q.id}`} className="btn-ghost px-3 py-1.5 text-sm">
            <Pencil className="h-3.5 w-3.5" /> {t("edit")}
          </Link>
          <Link href={`/quiz/${q.slug}`} className="btn-ghost px-3 py-1.5 text-sm" title={t("preview")}>
            <Eye className="h-3.5 w-3.5" />
          </Link>
          {(q.status === "draft" || q.status === "rejected") && (
            <button onClick={() => act("submit", () => api.submitQuiz(q.id))} disabled={!!busy} className="btn-zec px-3 py-1.5 text-sm">
              {busy === "submit" ? <Spinner className="h-3.5 w-3.5 text-[#1A1506]" /> : <Send className="h-3.5 w-3.5" />}
              {isAdmin ? t("publish") : t("submit_review")}
            </button>
          )}
          {q.status === "published" && (
            <button
              onClick={() => act("host", async () => router.push(`/host/${(await api.createHostedGame(q.id)).id}`))}
              disabled={!!busy}
              className="btn-ink px-3 py-1.5 text-sm"
            >
              {busy === "host" ? <Spinner className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
              {t("host_live")}
            </button>
          )}
          {(q.status !== "published" || isAdmin) && (
            <button
              onClick={() => confirm(t("confirm_delete")) && act("delete", () => api.deleteQuiz(q.id))}
              disabled={!!busy}
              className="btn-ghost ml-auto px-3 py-1.5 text-sm text-[#E8742A]"
              title={t("delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportPanel({ onDone }: { onDone: () => void }) {
  const { t, te } = useI18n();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    let quizzes;
    try {
      quizzes = parseQuizJson(raw);
    } catch (e) {
      setMsg({ kind: "error", text: `${t("err_invalid_json")} ${(e as Error).message}` });
      setBusy(false);
      return;
    }
    const errors: string[] = [];
    let ok = 0;
    for (const q of quizzes) {
      try {
        await api.saveQuiz(q);
        ok++;
      } catch (e) {
        errors.push(`${q.slug}: ${te(e)}`);
      }
    }
    setMsg(errors.length ? { kind: "error", text: `${t("imported_n", { n: ok })} — ${errors.join(" · ")}` } : { kind: "ok", text: t("imported_n", { n: ok }) });
    setBusy(false);
    if (ok) onDone();
  };

  return (
    <div className="card space-y-3 p-5">
      <p className="text-sm text-muted">{t("import_hint")}</p>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} spellCheck={false} placeholder='{ "title": { "tr": "...", "en": "..." }, "questions": [ ... ] }' className="input tabular-nums text-xs" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="flex flex-wrap gap-2">
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setRaw(await f.text());
          }}
        />
        <button onClick={() => file.current?.click()} className="btn-ghost py-2 text-sm">
          <Upload className="h-4 w-4" /> .json
        </button>
        <button onClick={run} disabled={busy || !raw.trim()} className="btn-zec py-2 text-sm">
          {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
          {t("import_btn")}
        </button>
      </div>
    </div>
  );
}
