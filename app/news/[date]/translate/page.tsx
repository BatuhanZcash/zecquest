"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { QUIZ_LANGUAGES, findLanguage, textAttrs } from "@/lib/languages";
import { newsApi, type Digest, type EditorItemText } from "@/lib/api-news";
import { formatDigestDate, sectionLabel } from "@/lib/news/format";
import { Alert, ErrorBox, Field, PageLoader, Spinner } from "@/components/ui";
import { newsError } from "@/components/news/errors";
import { TranslationStatus } from "@/components/news/parts";

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export default function TranslatePage() {
  const { t, lang: uiLang } = useI18n();
  const auth = useRequireAuth("creator");
  const { date } = useParams<{ date: string }>();
  const base = useAsync(() => (auth.ok ? newsApi.digest(date, null) : Promise.resolve(null)), [date, auth.ok]);

  if (auth.forbidden)
    return (
      <ErrorBox
        message={t("news_translate_creator_only")}
        action={
          <Link href="/organizers" className="btn-zec">
            {t("news_translate_become")}
          </Link>
        }
      />
    );
  if (!auth.ok || (base.loading && !base.data)) return <PageLoader />;
  if (!base.data || base.data.status !== "published") return <ErrorBox message={t("news_not_found")} />;
  return <Translator base={base.data} defaultLang={uiLang === "tr" && base.data.base_lang !== "tr" ? "tr" : ""} />;
}

function Translator({ base, defaultLang }: { base: Digest; defaultLang: string }) {
  const { t, lang: uiLang } = useI18n();
  const [target, setTarget] = useState(defaultLang);
  const [custom, setCustom] = useState("");
  const code = target === "__other" ? custom.trim() : target;
  const validCode = LANG_RE.test(code) && code !== base.base_lang;
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [texts, setTexts] = useState<Record<string, EditorItemText>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const mine = useAsync(() => newsApi.myTranslations(), [msg?.kind]);

  // Prefill with an existing published translation in that language (to improve it)
  useEffect(() => {
    setMsg(null);
    if (!validCode) return;
    let alive = true;
    newsApi.digest(base.date, code).then((d) => {
      if (!alive || !d) return;
      const exact = d.lang === code;
      setTitle(exact ? d.title : "");
      setIntro(exact ? d.intro ?? "" : "");
      const next: Record<string, EditorItemText> = {};
      for (const i of d.items) next[i.id] = exact && i.translated ? { title: i.title, summary: i.summary, badge: i.badge ?? "", facts: i.facts } : { title: "", summary: "", badge: "", facts: (base.items.find((b) => b.id === i.id)?.facts ?? []).map((f) => ({ value: f.value, label: "" })) };
      setTexts(next);
    });
    return () => {
      alive = false;
    };
  }, [code, validCode, base]);

  const langs = useMemo(() => QUIZ_LANGUAGES.filter((l) => l.code !== base.base_lang), [base.base_lang]);
  const set = (id: string, patch: Partial<EditorItemText>) => setTexts((m) => ({ ...m, [id]: { ...{ title: "", summary: "" }, ...m[id], ...patch } }));
  const filled = Object.values(texts).filter((x) => x.title?.trim() && x.summary?.trim()).length;

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const items: Record<string, EditorItemText> = {};
      for (const [id, x] of Object.entries(texts)) {
        if (!x.title?.trim() || !x.summary?.trim()) continue;
        items[id] = { title: x.title.trim(), summary: x.summary.trim(), badge: x.badge?.trim() || undefined, facts: (x.facts ?? []).filter((f) => f.value.trim()) };
      }
      const r = await newsApi.submitTranslation(base.date, code, { title: title.trim(), intro: intro.trim() || undefined, items });
      setMsg({ kind: "ok", text: r.status === "approved" ? t("news_translate_published") : t("news_translate_sent") });
    } catch (e) {
      setMsg({ kind: "error", text: newsError(e, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[980px] space-y-6">
      <Link href={`/news/${base.date}`} className="btn-ghost px-3 py-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {formatDigestDate(base.date, uiLang)}
      </Link>
      <div>
        <h1 className="page-title">{t("news_translate_title")}</h1>
        <p className="mt-2 max-w-[65ch] text-[15px] text-muted">{t("news_translate_intro")}</p>
        <p className="mt-1 max-w-[65ch] text-[14px] text-soft">{t("news_translate_rules")}</p>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label={t("news_translate_lang")}>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="input">
            <option value="">—</option>
            {langs.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} · {l.name}
              </option>
            ))}
            <option value="__other">{t("news_translate_lang_other")}</option>
          </select>
        </Field>
        {target === "__other" && (
          <Field label={t("news_translate_lang_other")} hint={custom && !validCode ? t("news_err_invalid_lang") : undefined}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. ca, eu, sw-KE" className="input" />
          </Field>
        )}
      </div>

      {validCode && (
        <>
          <div className="card divide-y divide-line">
            <Pair original={base.title} label={t("news_translate_digest_title")} lang={code}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className="input" {...textAttrs(code)} />
            </Pair>
            {base.intro && (
              <Pair original={base.intro} label={t("news_translate_intro_field")} lang={code}>
                <textarea value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={600} rows={3} className="input" {...textAttrs(code)} />
              </Pair>
            )}
          </div>

          {base.items.map((it, n) => {
            const x = texts[it.id] ?? { title: "", summary: "" };
            return (
              <section key={it.id} className="card divide-y divide-line">
                <div className="flex items-center gap-2 px-5 py-3 text-[13px]">
                  <span className="font-display font-bold tabular-nums text-soft">{n + 1}</span>
                  <span className="font-bold text-accent">{sectionLabel(it.section, uiLang)}</span>
                  {it.tier === "lead" && <span className="chip">{t("news_tier_lead")}</span>}
                  {x.title && x.summary && <Check className="ml-auto h-4 w-4 text-emerald-600" aria-label="✓" />}
                </div>
                <Pair original={it.title} label={t("news_item_title")} lang={code}>
                  <input value={x.title} onChange={(e) => set(it.id, { title: e.target.value })} maxLength={160} className="input" {...textAttrs(code)} />
                </Pair>
                <Pair original={it.summary} label={t("news_item_summary")} lang={code}>
                  <textarea value={x.summary} onChange={(e) => set(it.id, { summary: e.target.value })} maxLength={700} rows={4} className="input" {...textAttrs(code)} />
                </Pair>
                {it.badge && (
                  <Pair original={it.badge} label={t("news_badge")} lang={code}>
                    <input value={x.badge ?? ""} onChange={(e) => set(it.id, { badge: e.target.value })} maxLength={40} className="input" {...textAttrs(code)} />
                  </Pair>
                )}
                {it.facts.map((f, k) => (
                  <Pair key={k} original={`${f.value} — ${f.label}`} label={`${t("news_facts")} ${k + 1}`} lang={code}>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                      <input
                        value={x.facts?.[k]?.value ?? f.value}
                        onChange={(e) => set(it.id, { facts: it.facts.map((g, j) => ({ value: j === k ? e.target.value : x.facts?.[j]?.value ?? g.value, label: x.facts?.[j]?.label ?? "" })) })}
                        maxLength={24}
                        className="input"
                        aria-label={t("news_fact_value")}
                      />
                      <input
                        value={x.facts?.[k]?.label ?? ""}
                        onChange={(e) => set(it.id, { facts: it.facts.map((g, j) => ({ value: x.facts?.[j]?.value ?? g.value, label: j === k ? e.target.value : x.facts?.[j]?.label ?? "" })) })}
                        maxLength={120}
                        className="input"
                        aria-label={t("news_fact_label")}
                        {...textAttrs(code)}
                      />
                    </div>
                  </Pair>
                ))}
              </section>
            );
          })}

          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
          <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-card/95 px-4 py-3 shadow-card backdrop-blur lg:bottom-4">
            <span className="text-[13px] text-muted">
              {findLanguage(code)?.native} · {filled}/{base.items.length}
            </span>
            <button onClick={submit} disabled={busy || !title.trim() || filled === 0} className="btn-zec">
              {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {t("news_translate_submit")}
            </button>
          </div>
        </>
      )}

      {(mine.data?.length ?? 0) > 0 && (
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3.5 font-display text-[16px] font-bold">{t("news_my_translations")}</h2>
          <ul className="divide-y divide-line">
            {mine.data!.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[14px]">
                <span className="font-semibold tabular-nums">{m.date}</span>
                <span className="text-muted">{findLanguage(m.lang)?.native ?? m.lang}</span>
                <span className="min-w-0 flex-1 truncate" {...textAttrs(m.lang)}>
                  {m.title}
                </span>
                <TranslationStatus status={m.status} />
                {m.note && <span className="w-full text-[12.5px] text-soft">{m.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Pair({ original, label, lang, children }: { original: string; label: string; lang: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-2 md:gap-6">
      <div>
        <div className="label mb-1.5">{t("news_translate_original")}</div>
        <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-muted">{original}</p>
      </div>
      <label className="block" lang={lang}>
        <span className="label mb-1.5 block">{label}</span>
        {children}
      </label>
    </div>
  );
}
