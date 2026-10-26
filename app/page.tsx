"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { JoinBox } from "@/components/JoinBox";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { EventRow } from "@/components/EventCard";
import { QuizCard, QuizCardSkeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useServerNow } from "@/lib/useGame";

export default function HomePage() {
  const { t } = useI18n();
  const quizzes = useAsync(() => api.listQuizzes({ sort: "featured", limit: 12 }), []);
  const events = useAsync(() => api.listEvents(), []);
  const now = useServerNow(true, 1000);
  const fixtures = [...(events.data?.live ?? []), ...(events.data?.upcoming ?? [])].slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Öne çıkan quizler */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="section-title">{t("featured")}</h2>
          <Link href="/explore" className="text-[14px] font-medium text-accent hover:underline">
            {t("view_all")}
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(quizzes.data ?? (quizzes.loading ? Array(4).fill(null) : [])).map((q, i) => (
            <div key={q?.id ?? i} className="w-[240px] shrink-0 snap-start">
              {q ? <QuizCard quiz={q} /> : <QuizCardSkeleton />}
            </div>
          ))}
          {quizzes.data?.length === 0 && <p className="text-sm text-muted">{t("no_results")}</p>}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Yarışma fikstürü */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="section-title">{t("competitions")}</h2>
            <Link href="/events" className="text-[14px] font-medium text-accent hover:underline">
              {t("view_all")}
            </Link>
          </div>
          {events.loading && !events.data ? (
            <div className="divide-y divide-line">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-[62px] w-[58px] animate-pulse rounded-[10px] bg-input" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-input" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-input" />
                  </div>
                </div>
              ))}
            </div>
          ) : fixtures.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <CalendarDays className="h-7 w-7 text-soft" />
              <p className="font-medium">{t("no_events_title")}</p>
              <p className="max-w-xs text-[14px] text-muted">{t("no_events")}</p>
              <Link href="/explore" className="btn-ghost mt-2 py-2 text-[13px]">
                {t("hero_cta_explore")}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {fixtures.map((ev) => (
                <EventRow key={ev.id} ev={ev} now={now} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <JoinBox />
          <LeaderboardPanel limit={5} />
        </div>
      </div>
    </div>
  );
}
