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

      <section className="grid gap-6 rounded-[28px] border border-line bg-card p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <QuizCover icon={quiz.icon} cover={quiz.cover_url} index={hashIndex(quiz.id)} big className="aspect-[16/10] rounded-[20px] lg:aspect-auto lg:min-h-[380px]" />

        <div className="flex flex-col px-2 pb-3 lg:py-6 lg:pr-6">
          {!!quiz.tags?.length && (
            <div className="flex flex-wrap gap-2">
              {quiz.tags.map((tg) => (
                <Link key={tg} href={`/explore?q=${encodeURIComponent(tg)}`} className="rounded-full border border-line px-3 py-1 text-[13px] font-medium text-muted hover:border-[rgb(var(--soft))] hover:text-ink">
                  {tg}
                </Link>
              ))}
            </div>
          )}
          <h1 className="font-display mt-4 text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">{lt(quiz.title)}</h1>

          <div className="mt-4 flex items-center gap-2.5 text-[14px] text-muted">
            <Avatar name={author} size={28} />
            {quiz.author?.username ? (
              <Link href={`/u/${quiz.author.username}`} className="font-semibold text-ink hover:text-accent">
                {author}
              </Link>
            ) : (
              <span className="font-semibold text-ink">{author}</span>
            )}
          </div>

          {quiz.description && <p className="mt-4 max-w-[52ch] whitespace-pre-line text-[16px] leading-relaxed text-muted">{lt(quiz.description)}</p>}

          <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
            <Stat label={t("questions_cap")} value={quiz.question_count} />
            <Stat label={t("per_question")} value={`${quiz.avg_time} ${t("sec")}`} />
            <Stat label={t("plays")} value={fmt(quiz.plays)} />
          </dl>

          <div className="mt-auto pt-7">
            <div className="flex flex-wrap gap-3">
              {quiz.can_host && (
                <button onClick={host} disabled={hosting} className="btn-zec px-6 py-3 text-[15px]">
                  {hosting ? <Spinner className="h-4 w-4 text-[#14161B]" /> : <Radio className="h-4 w-4" />}
                  {t("host_live")}
                </button>
              )}
              <Link href={`/solo/${quiz.slug}`} className={`${quiz.can_host ? "btn-ghost" : "btn-zec"} px-6 py-3 text-[15px]`}>
                <Play className="h-4 w-4 fill-current" />
                {t("play_solo")}
              </Link>
            </div>
            {quiz.can_host && <p className="mt-3 text-[13px] text-soft">{t("host_hint")}</p>}
            {hostErr && (
              <div className="mt-3">
                <Alert>{hostErr}</Alert>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 max-w-[720px]">
        <h2 className="section-title flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          {t("quiz_leaderboard")}
        </h2>
        {quiz.top.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-[15px] text-muted">{t("no_scores")}</p>
        ) : (
          <ol className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
            {quiz.top.map((p, i) => (
              <li key={p.user_id}>
                <Link href={`/u/${p.username}`} className="flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-input/60">
                  <span className={`font-display w-6 text-center tabular-nums font-bold ${i < 3 ? "text-accent" : "text-soft"}`}>{i + 1}</span>
                  <Avatar name={p.display_name || p.username} size={30} country={p.country} />
                  <span className="min-w-0 flex-1 truncate font-medium">{p.display_name || p.username}</span>
                  <span className="tabular-nums font-bold">{fmt(p.score)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-app px-3 py-3">
      <dd className="font-display text-[22px] font-extrabold leading-none tabular-nums">{value}</dd>
      <dt className="mt-1.5 text-[12.5px] text-muted">{label}</dt>
    </div>
  );
}
