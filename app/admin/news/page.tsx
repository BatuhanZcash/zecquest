"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, Languages, Newspaper, Users } from "lucide-react";
import { useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ErrorBox, PageLoader } from "@/components/ui";
import { ComposeTab } from "@/components/news/ComposeTab";
import { PeopleTab, SettingsTab, TranslationsTab } from "@/components/news/AdminPanels";

type Tab = "compose" | "translations" | "people" | "settings";

export default function AdminNewsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminNews />
    </Suspense>
  );
}

function AdminNews() {
  const { t } = useI18n();
  const auth = useRequireAuth("admin");
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "compose";
  const date = params.get("date");

  if (auth.forbidden) return <ErrorBox message={t("err_admin_required")} />;
  if (!auth.ok) return <PageLoader />;

  const go = (next: Partial<{ tab: Tab; date: string | null }>) => {
    const q = new URLSearchParams();
    const tb = next.tab ?? tab;
    if (tb !== "compose") q.set("tab", tb);
    const d = next.date !== undefined ? next.date : date;
    if (d && tb === "compose") q.set("date", d);
    router.replace(`/admin/news${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  const tabs: [Tab, string, typeof Users][] = [
    ["compose", t("news_tab_compose"), Newspaper],
    ["translations", t("news_tab_translations"), Languages],
    ["people", t("news_tab_people"), Users],
    ["settings", t("news_tab_settings"), Activity],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="btn-ghost px-3 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("admin_title")}
        </Link>
        <h1 className="page-title">{t("news_admin_title")}</h1>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
        {tabs.map(([k, label, Icon]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => go({ tab: k })}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === k ? "bg-zec text-[#1A1506]" : "bg-card text-muted ring-1 ring-line hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {tab === "compose" && <ComposeTab date={date} onDate={(d) => go({ date: d })} />}
      {tab === "translations" && <TranslationsTab />}
      {tab === "people" && <PeopleTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
