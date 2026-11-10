"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LEVEL_TITLES, levelFraction, levelTitleKey, nextTitle, xpForLevel } from "@/lib/progress";
import type { XpProgress } from "@/lib/api";

type P = Pick<XpProgress, "xp" | "level" | "level_floor" | "next_level_at">;

/** Seviye halkası: ortada seviye numarası, halka seviye içi ilerleme */
export function LevelRing({ progress, size = 32, stroke }: { progress: P; size?: number; stroke?: number }) {
  const sw = stroke ?? Math.max(2.5, size / 11);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const f = levelFraction(progress);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} className="stroke-input" />
        {f > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={sw}
          strokeLinecap="round"
          stroke="#F4B728"
          strokeDasharray={`${c * f} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />}
      </svg>
      <span className="absolute font-display font-extrabold tabular-nums leading-none text-ink" style={{ fontSize: size * 0.4 }}>
        {progress.level}
      </span>
    </span>
  );
}

/** XP çubuğu: seviye tabanından bir sonraki seviyeye */
export function XpBar({ progress, className = "" }: { progress: P; className?: string }) {
  const { t, fmt } = useI18n();
  const f = levelFraction(progress);
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin={progress.level_floor}
        aria-valuemax={progress.next_level_at}
        aria-valuenow={progress.xp}
        aria-label={t("home_xp_to_next", { n: fmt(progress.next_level_at - progress.xp), level: progress.level + 1 })}
        className="h-2.5 overflow-hidden rounded-full bg-input"
      >
        <div className="h-full rounded-full bg-zec transition-[width] duration-700 ease-out" style={{ width: `${Math.max(2, f * 100)}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[12.5px] tabular-nums text-muted">
        <span>{fmt(progress.xp)} XP</span>
        <span>{t("home_xp_to_next", { n: fmt(progress.next_level_at - progress.xp), level: progress.level + 1 })}</span>
      </div>
    </div>
  );
}

/** Profil sayfası için tam ilerleme kartı: seviye, unvan, XP çubuğu ve unvan merdiveni */
export function ProgressCard({ progress, done }: { progress: P; done?: { source: string; ref: string }[] }) {
  const { t, fmt } = useI18n();
  const nt = nextTitle(progress.level);
  const counts = (done ?? []).reduce<Record<string, number>>((a, d) => ((a[d.source] = (a[d.source] ?? 0) + 1), a), {});
  const stats: [string, number][] = [
    [t("home_stat_lessons"), counts.lesson ?? 0],
    [t("home_stat_terms"), counts.glossary ?? 0],
    [t("home_stat_levels"), counts.game_level ?? 0],
    [t("home_stat_meetups"), counts.event_join ?? 0],
  ];
  return (
    <section id="progress" className="card scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center gap-5 p-6">
        <LevelRing progress={progress} size={76} stroke={7} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted">{t("home_level_n", { n: progress.level })}</p>
          <h2 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{t(levelTitleKey(progress.level))}</h2>
          {nt && (
            <p className="mt-0.5 text-[13.5px] text-muted">
              {t("home_next_title", { title: t(nt.key), level: nt.from, n: fmt(Math.max(0, xpForLevel(nt.from) - progress.xp)) })}
            </p>
          )}
        </div>
      </div>
      <div className="px-6 pb-6">
        <XpBar progress={progress} />
      </div>
      {done && (
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {stats.map(([label, n], i) => (
            <div key={label} className={`px-6 py-4 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""} border-line`}>
              <dt className="text-[12.5px] text-muted">{label}</dt>
              <dd className="font-display text-[22px] font-bold tabular-nums">{fmt(n)}</dd>
            </div>
          ))}
        </dl>
      )}
      <TitleLadder level={progress.level} />
    </section>
  );
}

/** Unvan merdiveni: hangi seviyede hangi unvan */
export function TitleLadder({ level }: { level: number }) {
  const { t } = useI18n();
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-3.5 text-[13.5px] font-semibold text-muted hover:text-ink">
        {t("home_titles_ladder")}
        <span className="text-[12px] font-medium transition group-open:rotate-180">▾</span>
      </summary>
      <ol className="grid gap-1 px-4 pb-4 sm:grid-cols-2">
        {LEVEL_TITLES.map((x, i) => {
          const reached = level >= x.from;
          const current = reached && (LEVEL_TITLES[i + 1]?.from ?? Infinity) > level;
          return (
            <li
              key={x.key}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-[14px] ${current ? "bg-tint font-semibold text-ink ring-1 ring-zec/40" : reached ? "text-ink" : "text-soft"}`}
            >
              <span>{t(x.key)}</span>
              <span className="tabular-nums text-[12.5px]">{t("home_level_short", { n: x.from })}</span>
            </li>
          );
        })}
      </ol>
      <p className="px-6 pb-5 text-[12.5px] leading-relaxed text-soft">{t("home_titles_note")}</p>
    </details>
  );
}

/** Giriş yapmamış kullanıcıya ilerleme davetiyesi */
export function ProgressInvite({ next = "/" }: { next?: string }) {
  const { t } = useI18n();
  return (
    <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-ink">
      {t("home_progress_signin")}
    </Link>
  );
}
