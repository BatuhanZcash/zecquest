"use client";

import { useI18n } from "@/lib/i18n";
import { pick } from "@/lib/learn";
import { UPGRADES, type Upgrade } from "./data";
import { formatYM } from "./shared";

function sourceLabel(url: string) {
  const m = url.match(/zips\.z\.cash\/zip-0*(\d+)/);
  if (m) return `ZIP ${m[1]}`;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Network upgrades as a vertical chain. Renders from data (UPGRADES), see ./data.ts. */
export default function UpgradeTimeline({ upgrades = UPGRADES }: { upgrades?: Upgrade[] }) {
  const { t, lang, fmt } = useI18n();
  const last = upgrades.length - 1;
  return (
    <ol className="relative">
      {upgrades.map((u, i) => {
        const latest = i === last;
        return (
          <li key={u.name} className="relative grid grid-cols-[20px_1fr] gap-x-3 pb-4 last:pb-0 sm:grid-cols-[84px_20px_1fr]">
            <div className="hidden pt-[3px] text-right text-[12.5px] font-medium tabular-nums text-muted sm:block">{formatYM(u.at, lang)}</div>
            <div className="relative flex justify-center" aria-hidden>
              {i < last && <span className="absolute bottom-[-16px] top-[14px] w-[2px] bg-line" />}
              <span
                className={`relative mt-[4px] h-3 w-3 rounded-[3px] ${latest ? "bg-zec ring-4 ring-zec/25" : "border-2 border-ink/70 bg-card"}`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h4 className="font-display text-[15px] font-bold leading-tight">{u.name}</h4>
                <span className="text-[12px] tabular-nums text-muted sm:hidden">{formatYM(u.at, lang)}</span>
                {u.height != null && (
                  <span className="text-[12px] tabular-nums text-soft">
                    {t("learn_fig_ut_block", { n: fmt(u.height) })}
                  </span>
                )}
              </div>
              {u.notes.length > 0 && <ul className="mt-1 space-y-0.5 text-[13.5px] leading-snug text-muted">
                {u.notes.map((n) => (
                  <li key={n.en}>{pick(n, lang)}</li>
                ))}
              </ul>}
              {u.source && (
                <a href={u.source} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] font-medium text-accent hover:underline">
                  {sourceLabel(u.source)}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
