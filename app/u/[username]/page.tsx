"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Crown, Globe2, Hash, Radio, Settings, Star, Trophy, User } from "lucide-react";
import { Avatar, ErrorBox, PageLoader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { countryName, flag } from "@/lib/countries";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t, lt, fmt, lang } = useI18n();
  const { profile: mine } = useAuth();
  const { data: p, loading } = useAsync(() => api.publicProfile(username), [username]);

  if (loading && !p) return <PageLoader />;
  if (!p) return <ErrorBox message={t("not_found")} />;

  const isMe = mine?.username === p.username;
  const roleLabel = p.role === "admin" ? t("role_admin") : p.role === "creator" ? t("role_creator") : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="relative flex flex-wrap items-center gap-5">
          <Avatar name={p.display_name || p.username} size={84} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[24px] font-bold tracking-[-0.02em]">{p.display_name}</h1>
            <p className="tabular-nums text-muted">@{p.username}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {p.country && (
                <span className="chip normal-case tracking-normal">
                  {flag(p.country)} {countryName(p.country, lang)}
                </span>
              )}
              {p.team && <span className="chip normal-case tracking-normal">{p.team}</span>}
              {roleLabel && (
                <span className="chip">
                  <Star className="h-3 w-3" /> {roleLabel}
                </span>
              )}
            </div>
          </div>
          {isMe && (
            <Link href="/me" className="btn-ghost py-2 text-sm">
              <Settings className="h-4 w-4" /> {t("nav_settings")}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Trophy} label={t("total_score")} value={fmt(p.total_score)} />
        <Stat icon={Globe2} label={t("global_rank")} value={p.rank ? `#${fmt(p.rank)}` : "—"} />
        <Stat icon={Hash} label={t("games")} value={fmt(p.games)} />
        <Stat icon={Crown} label={t("wins")} value={fmt(p.wins)} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">{t("recent_games")}</h2>
        {p.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("no_scores")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {p.recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${r.source === "live" ? "bg-[#E8742A]/15 text-[#E8742A]" : "bg-tint text-accent"}`}>
                  {r.source === "live" ? <Radio className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  {r.quiz_slug ? (
                    <Link href={`/quiz/${r.quiz_slug}`} className="truncate font-medium hover:text-accent">
                      {lt(r.quiz_title)}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{lt(r.quiz_title)}</p>
                  )}
                  <p className="text-xs text-soft">
                    {r.source === "live" ? t("live") : t("solo")} · {t("correct_count", { c: r.correct, t: r.total })} ·{" "}
                    {new Date(r.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                  </p>
                </div>
                <span className="tabular-nums font-bold">{fmt(r.score)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="card p-4">
      <Icon className="h-5 w-5 text-accent" />
      <p className="mt-2 tabular-nums text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
