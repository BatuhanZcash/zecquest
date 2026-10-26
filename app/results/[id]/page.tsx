"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Gift, Share2, Trophy, Users } from "lucide-react";
import { FinalPodium } from "@/components/FinalPodium";
import { Avatar, ErrorBox, PageLoader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { siteUrl } from "@/lib/config";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lt, fmt, lang } = useI18n();
  const { session } = useAuth();
  const { data, loading } = useAsync(() => api.results(id), [id, session?.user.id]);
  const [copied, setCopied] = useState(false);

  if (loading && !data) return <PageLoader />;
  if (!data) return <ErrorBox message={t("err_game_not_found")} action={<Link href="/events" className="btn-ghost">{t("nav_events")}</Link>} />;

  const title = lt(data.title) || lt(data.quiz?.title);
  const me = data.me;
  const share = async () => {
    const text = me?.rank
      ? `${title}: #${me.rank} / ${data.player_count} — ${fmt(me.score ?? 0)} ${t("points")}`
      : title;
    const url = `${siteUrl()}/results/${data.id}`;
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <p className="label">{t("final_results")}</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 inline-flex flex-wrap items-center justify-center gap-3 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" /> {t("players_n", { n: fmt(data.player_count) })}
          </span>
          {data.ended_at && <span>{new Date(data.ended_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</span>}
          {data.prize && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
              <Gift className="h-4 w-4" /> {lt(data.prize)}
            </span>
          )}
        </p>
      </div>

      {me?.joined && me.rank && (
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <Trophy className="h-10 w-10 text-accent" />
          <div className="flex-1">
            <p className="text-sm text-muted">{t("your_score")}</p>
            <p className="page-title">
              #{me.rank} · <span className="tabular-nums text-accent">{fmt(me.score ?? 0)}</span>
            </p>
            <p className="text-sm text-muted">{t("correct_count", { c: me.correct ?? 0, t: data.question_count })}</p>
          </div>
          {me.prize && (
            <Link href="/me/prizes" className="btn-zec">
              <Gift className="h-4 w-4" /> {t("claim_prize")}
            </Link>
          )}
          <button onClick={share} className="btn-ghost">
            <Share2 className="h-4 w-4" /> {copied ? t("copied") : t("share_result")}
          </button>
        </div>
      )}

      <div className="card p-6">
        <FinalPodium rows={data.leaderboard.slice(0, 3)} />
        {data.leaderboard.length > 3 && (
          <ol className="mt-8 space-y-1.5">
            {data.leaderboard.slice(3).map((p) => (
              <li key={p.user_id} className="flex items-center gap-3 rounded-xl bg-input/60 px-3 py-2">
                <span className="w-7 text-center tabular-nums text-sm font-bold text-soft">{p.rank}</span>
                <Avatar name={p.name} size={28} country={p.country} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  {p.team && <p className="truncate text-xs text-soft">{p.team}</p>}
                </div>
                <span className="tabular-nums text-sm font-bold">{fmt(p.score)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
