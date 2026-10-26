"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { EventRow } from "@/components/EventCard";
import { ErrorBox, PageLoader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useServerNow } from "@/lib/useGame";
import type { GameState } from "@/lib/types";

export default function EventsPage() {
  const { t, te } = useI18n();
  const { data, error, loading, reload } = useAsync(() => api.listEvents(), []);
  const now = useServerNow(true, 1000);

  // Liste her 30 sn'de tazelenir (yeni başlayan / biten yarışmalar)
  useEffect(() => {
    const id = setInterval(reload, 30000);
    return () => clearInterval(id);
  }, [reload]);

  if (loading && !data) return <PageLoader />;
  if (error && !data) return <ErrorBox message={te(error)} />;

  const groups: [string, (GameState & { player_count?: number })[]][] = [
    [t("live_now"), data?.live ?? []],
    [t("upcoming"), data?.upcoming ?? []],
    [t("recent_events"), data?.recent ?? []],
  ];
  const empty = !data?.live.length && !data?.upcoming.length;

  return (
    <div className="mx-auto max-w-[880px] space-y-8">
      <div>
        <h1 className="page-title">{t("nav_events")}</h1>
        <p className="mt-1 max-w-xl text-[14px] text-muted">{t("hero_sub")}</p>
      </div>

      {empty && (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CalendarDays className="h-7 w-7 text-soft" />
          <p className="font-medium">{t("no_events_title")}</p>
          <p className="max-w-sm text-[14px] text-muted">{t("no_events")}</p>
          <Link href="/explore" className="btn-ghost mt-2 py-2 text-[13px]">
            {t("hero_cta_explore")}
          </Link>
        </div>
      )}

      {groups.map(([title, items]) =>
        items.length ? (
          <section key={title}>
            <h2 className="section-title mb-3">{title}</h2>
            <div className="card divide-y divide-line overflow-hidden">
              {items.map((ev) => (
                <EventRow key={ev.id} ev={ev} now={now} />
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
