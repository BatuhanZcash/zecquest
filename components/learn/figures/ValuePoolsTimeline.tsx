"use client";

import { useI18n } from "@/lib/i18n";
import { pick } from "@/lib/learn";
import { POOL_EVENTS, VALUE_POOLS, type PoolEvent, type PoolLane, type PoolSegment } from "./data";
import { POOL_COLOR, formatYM, ymToMonths } from "./shared";

function segmentStyle(seg: PoolSegment, color: string): React.CSSProperties {
  if (seg.state === "open") return { background: color };
  if (seg.state === "spend-only")
    return { background: `repeating-linear-gradient(135deg, ${color} 0 4px, ${color}55 4px 8px)` };
  return { background: "transparent", border: `1.5px dashed ${color}` };
}

/**
 * Zcash value pools over time. Renders from data (VALUE_POOLS / POOL_EVENTS), see ./data.ts.
 */
export default function ValuePoolsTimeline({ lanes = VALUE_POOLS, events = POOL_EVENTS }: { lanes?: PoolLane[]; events?: PoolEvent[] }) {
  const { t, lang } = useI18n();
  const all = [...lanes.flatMap((l) => l.segments.flatMap((s) => [s.from, s.to ?? s.from])), ...events.map((e) => e.at)].map(ymToMonths);
  const startY = Math.floor(Math.min(...all) / 12);
  const lastM = Math.max(...all);
  // Room after the latest change so recent pools stay readable; the axis shows no future years
  const endM = lastM + 22;
  const start = startY * 12;
  const span = endM - start;
  const x = (m: number) => `${((m - start) / span) * 100}%`;
  const years: number[] = [];
  for (let y = startY; y * 12 <= lastM; y++) years.push(y);

  // Upgrade labels: two rows on narrow screens; on wide screens only close neighbours drop to the second row
  const rows = events.map((_, i) => i % 2);

  const stateLabel = (s: PoolSegment["state"]) =>
    t(s === "open" ? "learn_fig_vp_open" : s === "spend-only" ? "learn_fig_vp_spendonly" : "learn_fig_vp_closed");

  return (
    <div>
      <div className="relative sm:pl-[104px]">
        {/* Year axis */}
        <div className="relative h-5 text-[11px] tabular-nums text-soft" aria-hidden>
          {years.filter((y) => { const f = (y * 12 - start) / span; return f > 0.03 && f < 0.95; }).map((y) => (
            <span
              key={y}
              className={`absolute -translate-x-1/2 ${y % 2 ? "hidden sm:inline" : ""}`}
              style={{ left: x(y * 12) }}
            >
              {y}
            </span>
          ))}
        </div>
        {/* Lanes */}
        <div className="relative">
          {/* Upgrade guides */}
          {events.map((e) => (
            <span
              key={e.at}
              aria-hidden
              className="absolute bottom-0 top-0 w-px bg-line"
              style={{ left: x(ymToMonths(e.at)) }}
            />
          ))}
          <ul className="relative space-y-3 py-2">
            {lanes.map((lane) => {
              const color = POOL_COLOR[lane.key] ?? "#9AA1AE";
              const desc = lane.segments
                .map((s) => `${stateLabel(s.state)}: ${formatYM(s.from, lang)} – ${s.to ? formatYM(s.to, lang) : t("learn_fig_vp_today")}`)
                .join("; ");
              return (
                <li key={lane.key} className="relative">
                  <span className="mb-1 block text-[12.5px] font-semibold sm:absolute sm:-left-[104px] sm:top-1/2 sm:mb-0 sm:w-[96px] sm:-translate-y-1/2 sm:text-right">
                    {lane.name}
                  </span>
                  <div className="relative h-[14px]" role="img" aria-label={`${lane.name}. ${desc}`}>
                    {lane.segments.map((s, i) => {
                      const from = ymToMonths(s.from);
                      const to = s.to ? ymToMonths(s.to) : endM;
                      const running = !s.to && s.state !== "closed";
                      return (
                        <span
                          key={i}
                          className="absolute top-0 h-full rounded-[4px]"
                          style={{
                            left: x(from),
                            width: `calc(${((to - from) / span) * 100}% - ${i < lane.segments.length - 1 ? 2 : 0}px)`,
                            ...segmentStyle(s, color),
                            ...(running ? { maskImage: "linear-gradient(90deg,#000 85%,transparent)", WebkitMaskImage: "linear-gradient(90deg,#000 85%,transparent)" } : {}),
                          }}
                        />
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {/* Upgrade labels */}
        <div className="relative h-9 text-[11px] font-semibold text-muted" aria-hidden>
          {events.map((e, i) => {
            const f = (ymToMonths(e.at) - start) / span;
            const prev = i > 0 ? (ymToMonths(events[i - 1].at) - start) / span : -1;
            const row = rows[i];
            return (
            <span
              key={e.at}
              className={`absolute whitespace-nowrap ${
                i === 0 ? "" : f > 0.88 ? "-translate-x-full" : "-translate-x-1/2"
              } ${row ? "top-4" : "top-0"} ${f - prev > 0.08 ? "sm:top-1" : ""}`}
              style={{ left: x(ymToMonths(e.at)) }}
            >
              {typeof e.label === "string" ? e.label : pick(e.label, lang)}
            </span>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-[12px] text-muted">
        {(["open", "spend-only", "closed"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-6 rounded-[3px]" style={segmentStyle({ from: "2016-01", to: null, state: s }, "#86A85E")} aria-hidden />
            {stateLabel(s)}
          </span>
        ))}
      </div>
    </div>
  );
}
