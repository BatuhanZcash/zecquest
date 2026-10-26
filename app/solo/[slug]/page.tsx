"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Play, RotateCcw, Timer, Trophy, XCircle } from "lucide-react";
import { AnswerButton, BackButton, ErrorBox, PageLoader, Spinner, hashIndex } from "@/components/ui";
import { Countdown, ProgressBar, StreakBadge } from "@/components/game";
import { QuizCover } from "@/components/QuizCover";
import { useI18n } from "@/lib/i18n";
import { api, type SoloAnswer, type SoloStart } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { syncClock } from "@/lib/clock";
import { useServerNow } from "@/lib/useGame";

export default function SoloPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Solo />
    </Suspense>
  );
}

type Q = SoloStart["question"];
type Finished = { score: number; correct: number; total: number; best: number; quiz_rank: number };

function Solo() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { t, lt, te, fmt } = useI18n();
  const auth = useRequireAuth();
  const quiz = useAsync(() => api.getQuiz(slug), [slug]);

  const [sid, setSid] = useState<string | null>(params.get("s"));
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState<Q | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<SoloAnswer | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const answering = useRef(false);

  const playing = !!q && !finished;
  const now = useServerNow(playing && !result, 200);

  // Yenilemeden sonra devam
  useEffect(() => {
    if (!auth.ok || !sid || q || finished) return;
    (async () => {
      await syncClock();
      try {
        const r = await api.soloResume(sid);
        if (!r) {
          setSid(null);
          router.replace(`/solo/${slug}`);
          return;
        }
        setTotal(r.total);
        setQ(r.question);
        setStartedAt(r.started_at);
        setScore(r.score);
        setStreak(r.streak);
        setResumed(true);
        if (r.answered) {
          // Cevap verilmişti ama sonuç ekranı kaybolmuştu: doğrudan sonrakine geç
          await next(r.session_id);
        }
      } catch (e) {
        setError(te(e));
      }
    })();
  }, [auth.ok, sid]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    if (!quiz.data) return;
    setBusy(true);
    setError(null);
    try {
      await syncClock();
      const s = await api.soloStart(quiz.data.id);
      setSid(s.session_id);
      setTotal(s.total);
      setQ(s.question);
      setStartedAt(s.started_at);
      setScore(0);
      setStreak(0);
      setResult(null);
      setPicked(null);
      setFinished(null);
      setResumed(false);
      router.replace(`/solo/${slug}?s=${s.session_id}`);
    } catch (e) {
      setError(te(e));
    } finally {
      setBusy(false);
    }
  };

  const answer = useCallback(
    async (choice: number | null) => {
      if (!sid || result || answering.current) return;
      answering.current = true;
      setPicked(choice);
      try {
        const r = await api.soloAnswer(sid, choice);
        setResult(r);
        setScore(r.score);
        setStreak(r.streak);
      } catch (e) {
        setError(te(e));
      } finally {
        answering.current = false;
      }
    },
    [sid, result, te]
  );

  const next = async (id = sid) => {
    if (!id) return;
    setBusy(true);
    try {
      const r = await api.soloNext(id);
      if (r.finished) {
        setFinished(r);
        router.replace(`/solo/${slug}`);
        quiz.reload();
      } else {
        setQ(r.question);
        setStartedAt(r.started_at);
        setResult(null);
        setPicked(null);
      }
    } catch (e) {
      setError(te(e));
    } finally {
      setBusy(false);
    }
  };

  // Süre dolunca boş cevap
  const remaining = q ? startedAt + q.time_limit * 1000 - now : 0;
  useEffect(() => {
    if (playing && !result && q && remaining <= 0) answer(null);
  }, [remaining <= 0, playing, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Klavye: 1–4 cevap, Enter sonraki
  useEffect(() => {
    if (!playing) return;
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!result && n >= 1 && n <= (q?.options.length ?? 0)) answer(n - 1);
      if (result && e.key === "Enter" && !busy) next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!auth.ok || (quiz.loading && !quiz.data)) return <PageLoader />;
  if (!quiz.data) return <ErrorBox message={t("not_found")} action={<BackButton href="/explore" />} />;
  const qz = quiz.data;

  /* ---------- Sonuç ---------- */
  if (finished) {
    return (
      <div className="mx-auto grid max-w-[960px] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card relative overflow-hidden p-8 text-center">
          <Trophy className="relative mx-auto h-14 w-14 text-accent" />
          <p className="label relative mt-4">{t("your_score")}</p>
          <p className="relative tabular-nums text-6xl font-bold text-accent">{fmt(finished.score)}</p>
          <p className="relative mt-2 text-muted">{t("correct_count", { c: finished.correct, t: finished.total })}</p>
          <div className="relative mt-5 inline-flex flex-wrap justify-center gap-2 text-sm">
            <span className="chip">
              {t("best_score")}: {fmt(finished.best)}
            </span>
            <span className="chip">{t("quiz_rank", { n: finished.quiz_rank })}</span>
          </div>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={start} disabled={busy} className="btn-zec">
              <RotateCcw className="h-4 w-4" />
              {t("play_again")}
            </button>
            <Link href="/events" className="btn-ghost">
              {t("nav_events")}
            </Link>
          </div>
        </div>
        <TopList quizTop={qz.top} />
      </div>
    );
  }

  /* ---------- Giriş ---------- */
  if (!q) {
    return (
      <div className="mx-auto max-w-md">
        <div className="mb-4">
          <BackButton href={`/quiz/${qz.slug}`} />
        </div>
        <div className="card overflow-hidden">
          <QuizCover icon={qz.icon} index={hashIndex(qz.id)} className="h-36" />
          <div className="p-6">
            <span className="chip mb-2">{t("solo")}</span>
            <h1 className="mb-1 text-2xl font-bold">{lt(qz.title)}</h1>
            <p className="text-sm text-muted">{t("questions_n", { n: qz.question_count })}</p>
            <p className="mb-5 mt-3 flex items-start gap-2 text-[13px] text-muted">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {t("answer_rule", { n: qz.avg_time })}
            </p>
            {error && <p className="mb-3 text-sm text-[#E8742A]">{error}</p>}
            {sid ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <button onClick={start} disabled={busy} className="btn-zec w-full text-lg">
                {busy ? <Spinner className="h-5 w-5 text-[#1A1506]" /> : <Play className="h-5 w-5 fill-current" />}
                {t("start")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Oyun ---------- */
  const ok = result?.is_correct;
  return (
    <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{lt(qz.title)}</h1>
            <p className="text-sm text-muted">{t("question_of", { n: q.index + 1, t: total })}</p>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge n={streak} />
            <span className="chip">{t("solo")}</span>
          </div>
        </div>
        <ProgressBar value={q.index + (result ? 1 : 0)} total={total} />
        {resumed && q.index > 0 && !result && <p className="mt-2 text-xs text-soft">{t("resume_note")}</p>}

        <div className="card mt-4 p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-4">
            <Countdown remainingMs={result ? 0 : remaining} totalSec={q.time_limit} size={56} />
            <h2 className="flex-1 text-lg font-semibold leading-snug sm:text-2xl">{lt(q.text)}</h2>
            <div className="hidden text-right sm:block">
              <p className="label">{t("your_score")}</p>
              <p className="tabular-nums text-xl font-bold text-accent">{fmt(score)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {q.options.map((o, k) => (
              <AnswerButton
                key={k}
                index={k}
                label={lt(o)}
                disabled={!!result || picked !== null}
                onClick={() => answer(k)}
                state={
                  result
                    ? k === result.correct
                      ? "correct"
                      : k === result.choice
                        ? "wrong"
                        : "dim"
                    : picked === k
                      ? "picked"
                      : "idle"
                }
              />
            ))}
          </div>

          {result && (
            <div
              className={`mt-5 flex animate-rise items-start gap-3 rounded-xl p-4 ${
                ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-[#E8742A]/10 text-[#E8742A]"
              }`}
            >
              {result.choice === null ? <Clock className="mt-0.5 h-5 w-5 shrink-0" /> : ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
              <div className="flex-1">
                <p className="font-bold">
                  {result.choice === null ? t("times_up") : ok ? t("correct_answer") : t("wrong_answer")}
                  {result.points > 0 && <span className="ml-2 tabular-nums">{t("plus_points", { n: result.points })}</span>}
                </p>
                {result.explanation && <p className="mt-1 text-sm text-ink/80">{lt(result.explanation)}</p>}
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-[#E8742A]">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={() => next()} disabled={!result || busy} className="btn-zec min-w-[140px]">
            {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
            {result?.is_last ? t("finish") : t("next")}
          </button>
        </div>
      </div>

      <div className="hidden lg:block">
        <TopList quizTop={qz.top} />
      </div>
    </div>
  );
}

function TopList({ quizTop }: { quizTop: { user_id: string; score: number; username: string; display_name: string }[] }) {
  const { t, fmt } = useI18n();
  return (
    <aside className="card h-fit p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Trophy className="h-4 w-4 text-accent" />
        {t("quiz_leaderboard")}
      </h2>
      {quizTop.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{t("no_scores")}</p>
      ) : (
        <ol className="space-y-2.5 text-sm">
          {quizTop.slice(0, 8).map((p, k) => (
            <li key={p.user_id} className="flex items-center gap-3">
              <span className={`w-4 tabular-nums font-bold ${k < 3 ? "text-accent" : "text-soft"}`}>{k + 1}</span>
              <span className="min-w-0 flex-1 truncate">{p.display_name || p.username}</span>
              <span className="tabular-nums font-bold">{fmt(p.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

