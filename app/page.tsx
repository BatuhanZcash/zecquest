"use client";

import { HomeHero } from "@/components/home/Hero";
import { CommunityBlock, ContinueStrip, HomeHead, LearnBlock, PlayBlock, XpBoard } from "@/components/home/Sections";
import { OrganizerCard } from "@/components/OrganizerSteps";
import { QuizCard, QuizCardSkeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { api, xpLeaderboard } from "@/lib/api";
import { communityApi } from "@/lib/api-community";
import { getLatestDigest, getNetworkStatus, loadTracks } from "@/lib/home-data";
import { useMyProgress } from "@/lib/progress";
import { useAsync } from "@/lib/useAsync";

const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

export default function HomePage() {
  const { t } = useI18n();
  const { progress, loading: progressLoading } = useMyProgress();

  const digest = useAsync(() => getLatestDigest(), []);
  const network = useAsync(() => getNetworkStatus(), []);
  const tracks = useAsync(() => loadTracks(), []);
  const meetups = useAsync(() => safe(communityApi.meetups({ limit: 12 }), []), []);
  const quizzes = useAsync(() => safe(api.listQuizzes({ sort: "featured", limit: 12 }), []), []);
  const board = useAsync(() => safe(xpLeaderboard(5), []), []);

  const heroLoading = digest.loading && network.loading;

  return (
    <div className="space-y-10 sm:space-y-12">
      <HomeHero digest={digest.data ?? null} network={network.data ?? null} loading={heroLoading} />

      <ContinueStrip progress={progress} tracks={tracks.data ?? []} digestDate={digest.data?.date || null} loading={progressLoading} />

      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-8">
        <LearnBlock tracks={tracks.data ?? []} loading={tracks.loading} done={progress?.done ?? []} />
        <PlayBlock />
      </div>

      <CommunityBlock meetups={meetups.data ?? []} loading={meetups.loading} />

      <section aria-labelledby="h-quizzes">
        <HomeHead title={t("home_quizzes_title")} sub={t("home_quizzes_sub")} href="/explore" cta={t("view_all")} />
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(quizzes.data ?? (quizzes.loading ? Array(4).fill(null) : [])).map((q, i) => (
            <div key={q?.id ?? i} className="w-[240px] shrink-0 snap-start">
              {q ? <QuizCard quiz={q} /> : <QuizCardSkeleton />}
            </div>
          ))}
          {quizzes.data?.length === 0 && (
            <div className="w-full rounded-[20px] border border-dashed border-line p-6">
              <p className="font-semibold">{t("home_quizzes_empty")}</p>
              <p className="mt-1 text-[14px] text-muted">{t("home_quizzes_empty_sub")}</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <XpBoard rows={board.data ?? []} loading={board.loading} />
        <OrganizerCard />
      </div>
    </div>
  );
}
