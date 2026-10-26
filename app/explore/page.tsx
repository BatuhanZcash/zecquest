"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { QuizCard, QuizCardSkeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(q);
  const [sort, setSort] = useState("featured");
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const tags = useAsync(() => api.listTags(), []);
  const list = useAsync(() => api.listQuizzes({ search: debounced, tag: tag ?? undefined, sort, limit: 60 }), [debounced, tag, sort]);

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-5">
        <h1 className="page-title">{t("explore_title")}</h1>
        <p className="text-sm text-muted">{t("explore_sub")}</p>
      </div>

      <div className="mb-4 flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("explore_search")} className="input pl-11" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-[132px] shrink-0 cursor-pointer px-3 text-sm font-semibold sm:w-[170px]">
          <option value="featured">{t("sort_featured")}</option>
          <option value="new">{t("sort_new")}</option>
          <option value="az">{t("sort_az")}</option>
          <option value="questions">{t("sort_questions")}</option>
        </select>
      </div>

      {!!tags.data?.length && (
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
          <TagBtn active={!tag} onClick={() => setTag(null)}>
            {t("all")}
          </TagBtn>
          {tags.data.map((tg) => (
            <TagBtn key={tg} active={tag === tg} onClick={() => setTag(tg)}>
              {tg}
            </TagBtn>
          ))}
        </div>
      )}

      {list.loading && !list.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <QuizCardSkeleton key={i} />
          ))}
        </div>
      ) : !list.data?.length ? (
        <p className="card py-16 text-center text-muted">{t("no_results")}</p>
      ) : (
        <div className={`grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${list.loading ? "opacity-60" : ""}`}>
          {list.data.map((x) => (
            <QuizCard key={x.id} quiz={x} />
          ))}
        </div>
      )}
    </div>
  );
}

function TagBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? "bg-zec text-[#1A1506]" : "border border-line bg-card text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
