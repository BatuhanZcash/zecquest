"use client";

import { Ban, Check, ShieldAlert } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";

type Rule = "never" | "trusted" | "free";
const ROWS: { name: DictKey; can: DictKey; rule: Rule; ruleText: DictKey }[] = [
  { name: "learn_fig_ws_seed", can: "learn_fig_ws_seed_can", rule: "never", ruleText: "learn_fig_ws_never" },
  { name: "learn_fig_ws_sk", can: "learn_fig_ws_sk_can", rule: "never", ruleText: "learn_fig_ws_never" },
  { name: "learn_fig_ws_fvk", can: "learn_fig_ws_fvk_can", rule: "trusted", ruleText: "learn_fig_ws_fvk_rule" },
  { name: "learn_fig_ws_ivk", can: "learn_fig_ws_ivk_can", rule: "trusted", ruleText: "learn_fig_ws_ivk_rule" },
  { name: "learn_fig_ws_addr", can: "learn_fig_ws_addr_can", rule: "free", ruleText: "learn_fig_ws_free" },
];

const RULE_STYLE: Record<Rule, { pill: string; icon: typeof Ban }> = {
  never: { pill: "bg-[#E8742A]/10 text-[#B5541A] dark:text-[#F29A62]", icon: Ban },
  trusted: { pill: "bg-zec/20 text-accent", icon: ShieldAlert },
  free: { pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: Check },
};

/** The key hierarchy of a shielded wallet and what is safe to share. */
export default function WalletSafety() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[14px_1fr] gap-x-3">
      {/* Power rail: most powerful at the top */}
      <div className="flex flex-col items-center" aria-hidden>
        <span className="w-[3px] flex-1 rounded-full bg-gradient-to-b from-[#E8742A] via-zec to-emerald-500" />
      </div>
      <ol className="space-y-1.5">
        {ROWS.map((r, i) => {
          const S = RULE_STYLE[r.rule];
          return (
            <li key={r.name}>
              <div className="rounded-xl border border-line bg-card px-3.5 py-2.5 sm:flex sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14px] font-bold leading-tight">{t(r.name)}</h4>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{t(r.can)}</p>
                </div>
                <span className={`mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold sm:mt-0 ${S.pill}`}>
                  <S.icon className="h-3.5 w-3.5" aria-hidden />
                  {t(r.ruleText)}
                </span>
              </div>
              {i < ROWS.length - 1 && (
                <div className="flex items-center gap-1.5 pl-4 pt-1.5 text-[11px] text-soft" aria-hidden>
                  <span className="text-[13px] leading-none">↓</span> {t("learn_fig_ws_derives")}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
