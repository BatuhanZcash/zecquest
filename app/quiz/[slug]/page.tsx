"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Play, Radio, Trophy } from "lucide-react";
import { QuizCover } from "@/components/QuizCover";
import { Alert, Avatar, BackButton, ErrorBox, PageLoader, Spinner, hashIndex } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAuth } from "@/lib/auth";
import { SITE } from "@/lib/config";

export default function QuizDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lt, te, fmt } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const { data: quiz, loading, error } = useAsync(() => api.getQuiz(slug), [slug, session?.user.id]);
  const [hosting, setHosting] = useState(false);
  const [hostErr, setHostErr] = useState<string | null>(null);

  if (loading && !quiz) return <PageLoader />;
  if (error) return <ErrorBox message={te(error)} />;
  if (!quiz)
    return (
      <ErrorBox
        message={t("not_found")}
        action={<BackButton href="/explore" />}
      />
    );

  const host = async () => {
    setHosting(true);
    setHostErr(null);
    try {
      const g = await api.createHostedGame(quiz.id);
      router.push(`/host/${g.id}`);
    } catch (e) {
      setHostErr(te(e));
      setHosting(false);
    }
  };

  const author = quiz.author?.display_name || quiz.author?.username || SITE.name;

  return (
    <div>
      <div className="mb-5">
        <BackButton href="/explore" />
      </div>
      {quiz.status !== "published" && (
        <div className="mb-4">
          <Alert kind="info">{t("draft_preview")}</Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="card p-4 sm:p-6">
          <QuizCover icon={quiz.icon} cover={quiz.cover_url} index={hashIndex(quiz.id)} big className="h-44 rounded-xl sm:h-72" />
          <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em]">{lt(quiz.title)}</h1>

          <div className="my-5 flex items-center gap-3 border-y border-line py-4">
            <Avatar name={author} size={42} />
            <div>
              <p className="text-xs text-soft">{t("created_by")}</p>
              {quiz.author?.username ? (
                <Link href={`/u/${quiz.author.username}`} className="font-semibold hover:text-accent">
                  {author}
                </Link>
              ) : (
                <p className="font-semibold">{author}</p>
              )}
            </div>
          </div>

          {quiz.description && (
            <>
              <h2 className="mb-1.5 font-semibold">{t("description")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-muted">{lt(quiz.description)}</p>
            </>
          )}
          {!!quiz.tags?.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {quiz.tags.map((tg) => (
                <Link key={tg} href={`/explore?q=${encodeURIComponent(tg)}`} className="chip">
                  {tg}
                </Link>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">{t("play_quiz")}</h2>
            <div className="space-y-3">
              <Link href={`/solo/${quiz.slug}`} className="btn-zec w-full">
                <Play className="h-4 w-4 fill-current" />
                {t("play_solo")}
              </Link>
              {quiz.can_host && (
                <>
                  <button onClick={host} disabled={hosting} className="btn-ink w-full">
                    {hosting ? <Spinner className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                    {t("host_live")}
                  </button>
                  <p className="text-xs text-soft">{t("host_hint")}</p>
                </>
              )}
              {hostErr && <Alert>{hostErr}</Alert>}
            </div>
          </div>

          <div className="card p-5">
            <p className="label mb-3">{t("quiz_stats")}</p>
            <Stat label={t("questions_cap")} value={quiz.question_count} />
            <Stat label={t("avg_time")} value={`${quiz.avg_time} ${t("sec")}`} />
            <Stat label={t("plays")} value={fmt(quiz.plays)} last />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-accent" />
              {t("quiz_leaderboard")}
            </h2>
            {quiz.top.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">{t("no_scores")}</p>
            ) : (
              <ol className="space-y-2.5">
                {quiz.top.map((p, i) => (
                  <li key={p.user_id}>
                    <Link href={`/u/${p.username}`} className="flex items-center gap-3 text-sm hover:text-accent">
                      <span className={`w-4 tabular-nums font-bold ${i < 3 ? "text-accent" : "text-soft"}`}>{i + 1}</span>
                      <Avatar name={p.display_name || p.username} size={26} country={p.country} />
                      <span className="min-w-0 flex-1 truncate">{p.display_name || p.username}</span>
                      <span className="tabular-nums font-bold">{fmt(p.score)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 text-sm ${last ? "" : "border-b border-line"}`}>
      <span className="text-muted">{label}</span>
      <span className="tabular-nums font-bold">{value}</span>
    </div>
  );
}
