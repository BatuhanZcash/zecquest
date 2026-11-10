"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth, hasRole } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { newsApi } from "@/lib/api-news";
import { NetworkStatus } from "@/components/NetworkStatus";
import { DigestSkeleton, DigestView } from "@/components/news/DigestView";
import { ArchiveList, ShareActions, XpToast, digestPath, useNewsReadXp } from "@/components/news/parts";
import { ErrorBox } from "@/components/ui";

export default function DigestPage() {
  return (
    <Suspense fallback={<DigestSkeleton />}>
      <DigestDay />
    </Suspense>
  );
}

function DigestDay() {
  const { t, te, lang: uiLang } = useI18n();
  const { profile } = useAuth();
  const { date } = useParams<{ date: string }>();
  const params = useSearchParams();
  const lang = params.get("lang") || uiLang;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const q = useAsync(() => (valid ? newsApi.digest(date, lang) : Promise.resolve(null)), [date, lang, profile?.role]);
  const d = q.data;
  const xp = useNewsReadXp(d?.date, d?.status === "published");
  const canTranslate = !!profile && !profile.is_guest && hasRole(profile, "creator") && d?.status === "published";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/news" className="btn-ghost px-3 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("news_back_to_news")}
        </Link>
        <XpToast amount={xp} />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {q.loading && !d ? (
            <DigestSkeleton />
          ) : q.error ? (
            <ErrorBox message={te(q.error)} action={<button onClick={q.reload} className="btn-ghost">{t("news_retry")}</button>} />
          ) : !d ? (
            <ErrorBox message={t("news_not_found")} action={<Link href="/news" className="btn-ghost">{t("news_back_to_news")}</Link>} />
          ) : (
            <>
              <DigestView
                digest={d}
                hrefForLang={(l) => digestPath(d.date, l)}
                actions={<ShareActions digest={d} />}
              />
              {canTranslate && (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-card px-5 py-4">
                  <p className="max-w-[52ch] text-[14px] text-muted">{t("news_translate_intro")}</p>
                  <Link href={`/news/${d.date}/translate`} className="btn-ink px-4 py-2 text-[13px]">
                    <Languages className="h-4 w-4" aria-hidden="true" />
                    {t("news_translate_cta")}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <NetworkStatus variant="full" />
          <ArchiveList lang={lang} exclude={d?.date} limit={10} />
        </aside>
      </div>
    </div>
  );
}
