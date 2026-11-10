"use client";

import { Check, Eye, Lock } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { Redacted } from "./shared";

type Row = { k: DictKey; t: string; s: "redacted" | string };

const ROWS: Row[] = [
  { k: "learn_fig_svt_sender", t: "t1Vq…r8Kd", s: "redacted" },
  { k: "learn_fig_svt_receiver", t: "t1Mx…2pQe", s: "redacted" },
  { k: "learn_fig_svt_amount", t: "1.25 ZEC", s: "redacted" },
  { k: "learn_fig_svt_memo", t: "—", s: "redacted" },
  { k: "learn_fig_svt_fee", t: "0.0001 ZEC", s: "0.0001 ZEC" },
];

/** What an observer sees on a block explorer: transparent vs shielded. */
export default function ShieldedVsTransparent() {
  const { t } = useI18n();
  const Side = ({ shielded }: { shielded: boolean }) => {
    const visibleCount = shielded ? 1 : 5;
    return (
      <div
        className={`flex flex-col rounded-xl border p-4 ${
          shielded ? "border-zec/50 bg-zec/[0.06]" : "border-line bg-card"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${shielded ? "bg-zec text-[#1A1506]" : "bg-input text-muted"}`}
            aria-hidden
          >
            {shielded ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </span>
          <h4 className="font-display text-[15px] font-bold leading-tight">
            {t(shielded ? "learn_fig_svt_shielded" : "learn_fig_svt_transparent")}
          </h4>
        </div>
        <dl className="mt-3 divide-y divide-line/70 text-[13.5px]">
          {ROWS.map((r) => {
            const hidden = shielded && r.s === "redacted";
            const value = shielded ? r.s : r.t;
            return (
              <div key={r.k} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted">{t(r.k)}</dt>
                <dd className="flex min-w-0 items-center gap-2 font-medium">
                  {hidden ? (
                    <Redacted w={r.k === "learn_fig_svt_memo" ? 72 : 92} label={t("learn_fig_svt_encrypted")} />
                  ) : (
                    <span className="truncate tabular-nums">
                      {r.k === "learn_fig_svt_memo" && !shielded ? t("learn_fig_svt_no_memo") : value}
                    </span>
                  )}
                  {hidden ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <Eye className="h-3.5 w-3.5 shrink-0 text-soft" aria-hidden />
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="mt-auto pt-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t(shielded ? "learn_fig_svt_proof_ok" : "learn_fig_svt_sig_ok")}
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {t("learn_fig_svt_visible_count", { n: visibleCount, total: ROWS.length })}
          </p>
        </div>
      </div>
    );
  };
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Side shielded={false} />
        <Side shielded />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-soft" aria-hidden /> {t("learn_fig_svt_legend_public")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Redacted w={22} label="" /> {t("learn_fig_svt_legend_encrypted")}
        </span>
        <span className="text-soft">{t("learn_fig_example")}</span>
      </div>
    </div>
  );
}
