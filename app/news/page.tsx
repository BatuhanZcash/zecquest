"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Newspaper } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAsync } from "@/lib/useAsync";
import { newsApi } from "@/lib/api-news";
import { NetworkStatus } from "@/components/NetworkStatus";
import { DigestSkeleton, DigestView } from "@/components/news/DigestView";
import { ArchiveList, ShareActions, XpToast, digestPath, useNewsReadXp } from "@/components/news/parts";
import { ErrorBox } from "@/components/ui";

export default function NewsPage() {
  return (
    <Suspense fallback={<DigestSkeleton />}>
      <News />
    </Suspense>
  );
}

function News() {
  const { t, te, lang: uiLang } = useI18n();
  const params = useSearchParams();
  const lang = params.get("lang") || uiLang;
  const latest = useAsync(() => newsApi.latest(lang), [lang]);
  const d = latest.data;
  const xp = useNewsReadXp(d?.date, d?.status === "published");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-accent">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
            {t("news_today")}
          </div>
          <h1 className="page-title mt-1">{t("news_title")}</h1>
          <p className="mt-1 max-w-[60ch] text-[15px] text-muted">{t("news_tagline")}</p>
        </div>
        <XpToast amount={xp} />
      </div>

      <NetworkStatus variant="compact" className="lg:hidden" />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {latest.loading && !d ? (
            <DigestSkeleton />
          ) : latest.error ? (
            <ErrorBox message={te(latest.error)} action={<button onClick={latest.reload} className="btn-ghost">{t("news_retry")}</button>} />
          ) : !d ? (
            <div className="card flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-accent">
                <Newspaper className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-[22px] font-bold">{t("news_empty_title")}</h2>
              <p className="mt-2 max-w-md text-[15px] text-muted">{t("news_empty_body")}</p>
            </div>
          ) : (
            <>
              <DigestView
                digest={d}
                headingLevel={2}
                hrefForLang={(l) => `/news?lang=${encodeURIComponent(l)}`}
                actions={<ShareActions digest={d} showPost={false} />}
              />
              <Link href={digestPath(d.date, params.get("lang"))} className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:underline">
                {t("news_read_full")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <NetworkStatus variant="full" />
          <ArchiveList lang={lang} exclude={d?.date} />
        </aside>
      </div>
    </div>
  );
}
