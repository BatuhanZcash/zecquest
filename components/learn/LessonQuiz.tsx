"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, Trophy, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { passMark, pick } from "@/lib/learn";
import type { LessonQuestion } from "@/lib/content/types";

/**
 * End-of-lesson quiz: one question at a time, instant feedback with the explanation, retry at the end.
 * Calls onPass once the score reaches the pass mark (3 of 4).
 */
export function LessonQuiz({
  questions,
  lang,
  passed,
  onPass,
}: {
  questions: LessonQuestion[];
  lang: string;
  passed: boolean;
  onPass: () => void;
}) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const total = questions.length;
  const need = passMark(total);
  const q = questions[i];

  useEffect(() => {
    if (started) headRef.current?.focus();
  }, [i, done, started]);

  if (!total) return null;

  const answer = (k: number) => {
    if (choice != null) return;
    setStarted(true);
    setChoice(k);
    if (k === q.answer) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 < total) {
      setI(i + 1);
      setChoice(null);
    } else {
      setDone(true);
      if (score >= need) onPass();
    }
  };
  const retry = () => {
    setI(0);
    setChoice(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const ok = score >= need;
    return (
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ok ? "bg-zec text-[#1A1506]" : "bg-input text-muted"}`}
            aria-hidden
          >
            {ok ? <Trophy className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}
          </span>
          <div className="min-w-0">
            <h3 ref={headRef} tabIndex={-1} className="font-display text-[20px] font-bold leading-tight outline-none">
              {t(ok ? "learn_quiz_pass_title" : "learn_quiz_fail_title")}
            </h3>
            <p className="mt-1 text-[15px] text-muted">
              {t("learn_quiz_score", { score, total })} · {t(ok ? "learn_quiz_pass_body" : "learn_quiz_fail_body", { need })}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {questions.map((_, k) => (
            <span key={k} className={`h-1.5 flex-1 rounded-full ${k < score ? "bg-zec" : "bg-line"}`} />
          ))}
        </div>
        <button onClick={retry} className="btn-ghost mt-5">
          <RotateCcw className="h-4 w-4" aria-hidden /> {t("learn_quiz_retry")}
        </button>
      </div>
    );
  }

  const answered = choice != null;
  const correct = answered && choice === q.answer;
  return (
    <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span className="tabular-nums">{t("learn_quiz_progress", { n: i + 1, total })}</span>
        {passed && (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" aria-hidden /> {t("learn_quiz_passed_before")}
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {questions.map((_, k) => (
          <span key={k} className={`h-1 flex-1 rounded-full ${k < i || (k === i && answered) ? "bg-zec" : "bg-line"}`} />
        ))}
      </div>
      <h3 ref={headRef} tabIndex={-1} className="mt-4 font-display text-[19px] font-bold leading-snug outline-none sm:text-[21px]">
        {pick(q.q, lang)}
      </h3>
      <div className="mt-4 grid gap-2" role="group" aria-label={pick(q.q, lang)}>
        {q.options.map((o, k) => {
          const isRight = k === q.answer;
          const picked = k === choice;
          let cls = "border-line bg-card hover:border-[rgb(var(--soft))] hover:bg-input/40";
          if (answered) {
            if (isRight) cls = "border-emerald-500 bg-emerald-500/10";
            else if (picked) cls = "border-[#E8742A] bg-[#E8742A]/10";
            else cls = "border-line bg-card opacity-60";
          }
          return (
            <button
              key={k}
              type="button"
              disabled={answered}
              onClick={() => answer(k)}
              aria-pressed={picked}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left text-[15px] font-medium transition-colors disabled:cursor-default ${cls}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold ${
                  answered && isRight ? "bg-emerald-500 text-white" : answered && picked ? "bg-[#E8742A] text-white" : "bg-input text-muted"
                }`}
                aria-hidden
              >
                {answered && isRight ? <Check className="h-3.5 w-3.5" /> : answered && picked ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + k)}
              </span>
              <span>{pick(o, lang)}</span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <div className="mt-4 rounded-xl bg-input/50 p-4">
            <p className={`text-[14px] font-bold ${correct ? "text-emerald-700 dark:text-emerald-400" : "text-[#C2571A] dark:text-[#F0955A]"}`}>
              {t(correct ? "learn_quiz_correct" : "learn_quiz_wrong")}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink/90">{pick(q.explain, lang)}</p>
          </div>
        )}
      </div>
      {answered && (
        <div className="mt-4 flex justify-end">
          <button onClick={next} className="btn-ink">
            {t(i + 1 < total ? "learn_quiz_next" : "learn_quiz_finish")} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
