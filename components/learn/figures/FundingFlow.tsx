"use client";

import { Coins, Receipt } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { FUNDING_FLOW, type FlowPart } from "./data";

const TONE: Record<FlowPart["tone"], { bar: string; alt: string; dot: string; text: string }> = {
  miner: { bar: "bg-ink/85", alt: "bg-ink/60", dot: "bg-ink/85", text: "text-card" },
  fund: { bar: "bg-zec", alt: "bg-zec-300", dot: "bg-zec", text: "text-[#1A1506]" },
  reserve: { bar: "bg-[#2E9C8F]", alt: "bg-[#57B5AA]", dot: "bg-[#2E9C8F]", text: "text-white" },
};

function Bar({ icon, title, sub, parts }: { icon: React.ReactNode; title: string; sub: string; parts: FlowPart[] }) {
  const { t } = useI18n();
  const known = parts.every((p) => p.pct != null);
  const segs = parts.flatMap((p) =>
    p.parts && p.parts.every((x) => x.pct != null) && known
      ? p.parts.map((x, j) => ({ id: `${p.key}-${j}`, label: x.name, pct: x.pct, tone: p.tone, alt: j % 2 === 1 }))
      : [{ id: p.key, label: t(`learn_fig_ff_${p.key}` as DictKey), pct: p.pct, tone: p.tone, alt: false }]
  );
  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-input text-muted" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-[14px] font-bold leading-tight">{title}</h4>
          <p className="text-[12px] text-muted">{sub}</p>
        </div>
      </div>
      {/* Bar: a part with fully known sub-shares is drawn as its sub-segments (same tone, alternating shade) */}
      <div className="mt-2.5 flex h-9 overflow-hidden rounded-lg" role="img" aria-label={segs.map((g) => `${g.label}${g.pct != null ? ` ${g.pct}%` : ""}`).join(", ")}>
        {segs.map((g, i) => (
          <div
            key={g.id}
            className={`flex min-w-0 items-center justify-center text-[13px] font-bold tabular-nums ${g.alt ? TONE[g.tone].alt : TONE[g.tone].bar} ${TONE[g.tone].text} ${i ? "border-l-2 border-elevated" : ""}`}
            style={{ flex: known ? `${g.pct} 0 0` : "1 0 0" }}
          >
            {g.pct != null ? `${g.pct}%` : ""}
          </div>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segs.map((g) => (
          <li key={g.id} className="inline-flex items-center gap-1.5 text-[12.5px]">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${g.alt ? TONE[g.tone].alt : TONE[g.tone].bar}`} aria-hidden />
            <span className="font-semibold">{g.label}</span>
            {g.pct != null && <span className="tabular-nums text-muted">{g.pct}%</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Where each block's value goes. Renders from data (FUNDING_FLOW), see ./data.ts. */
export default function FundingFlow({ flow = FUNDING_FLOW }: { flow?: typeof FUNDING_FLOW }) {
  const { t } = useI18n();
  const tones = Array.from(new Set([...flow.subsidy, ...flow.fees].map((p) => p.tone)));
  return (
    <div className="space-y-5">
      <Bar icon={<Coins className="h-4 w-4" />} title={t("learn_fig_ff_subsidy")} sub={t("learn_fig_ff_subsidy_sub")} parts={flow.subsidy} />
      <Bar icon={<Receipt className="h-4 w-4" />} title={t("learn_fig_ff_fees")} sub={t("learn_fig_ff_fees_sub")} parts={flow.fees} />
      <dl className="grid gap-2 border-t border-line pt-3 text-[12.5px] sm:grid-cols-3">
        {tones.map((tone) => (
          <div key={tone} className="flex gap-2">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px] ${TONE[tone].dot}`} aria-hidden />
            <div>
              <dt className="font-semibold">{t(`learn_fig_ff_${tone}_t` as DictKey)}</dt>
              <dd className="text-muted">{t(`learn_fig_ff_${tone}_d` as DictKey)}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
