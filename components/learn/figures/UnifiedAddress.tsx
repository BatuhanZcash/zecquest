"use client";

import { useState } from "react";
import { ArrowDown, Eye, Lock } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { POOL_COLOR } from "./shared";

const RECEIVERS = [
  { key: "orchard", name: "Orchard", shielded: true },
  { key: "sapling", name: "Sapling", shielded: true },
  { key: "transparent", name: "Transparent", shielded: false },
] as const;

const SENDERS: { label: DictKey; supports: string[] }[] = [
  { label: "learn_fig_ua_sender_all", supports: ["orchard", "sapling", "transparent"] },
  { label: "learn_fig_ua_sender_sapling", supports: ["sapling", "transparent"] },
  { label: "learn_fig_ua_sender_t", supports: ["transparent"] },
];

/** A unified address bundles receivers; the sender's wallet uses the most private one it supports. */
export default function UnifiedAddress() {
  const { t } = useI18n();
  const [s, setS] = useState(0);
  const chosen = RECEIVERS.find((r) => SENDERS[s].supports.includes(r.key))!;

  return (
    <div>
      <div className="rounded-xl border border-line bg-card p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-semibold text-muted">{t("learn_fig_ua_one")}</span>
          <span className="font-mono text-[12px] text-soft">u1qz7…w4hd</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {RECEIVERS.map((r) => {
            const active = r.key === chosen.key;
            const supported = SENDERS[s].supports.includes(r.key);
            return (
              <div
                key={r.key}
                className={`relative rounded-lg border-2 px-2 py-2.5 text-center transition-all ${
                  active ? "bg-elevated shadow-card" : "border-transparent bg-input/60"
                } ${supported ? "" : "opacity-45"}`}
                style={active ? { borderColor: POOL_COLOR[r.key] } : undefined}
              >
                <span className="mx-auto mb-1.5 block h-1.5 w-8 rounded-full" style={{ background: POOL_COLOR[r.key] }} aria-hidden />
                <span className="block text-[13px] font-bold leading-tight">{r.name}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted">
                  {r.shielded ? <Lock className="h-3 w-3" aria-hidden /> : <Eye className="h-3 w-3" aria-hidden />}
                  {t(r.shielded ? "learn_fig_ua_shielded" : "learn_fig_ua_public")}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2.5 text-[11.5px] text-soft">{t("learn_fig_ua_packed")}</p>
      </div>

      <div className="flex justify-center py-1.5 text-soft" aria-hidden>
        <ArrowDown className="h-4 w-4" />
      </div>

      <fieldset className="rounded-xl border border-line p-3.5">
        <legend className="px-1 text-[12.5px] font-semibold text-muted">{t("learn_fig_ua_sender")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {SENDERS.map((o, i) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={s === i}
              onClick={() => setS(i)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                s === i ? "border-ink bg-ink text-card" : "border-line bg-card text-muted hover:text-ink"
              }`}
            >
              {t(o.label)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[14px] leading-snug" aria-live="polite">
          <span className="font-semibold">{t("learn_fig_ua_result", { name: chosen.name })}</span>{" "}
          <span className="text-muted">{t(chosen.shielded ? "learn_fig_ua_result_shielded" : "learn_fig_ua_result_public")}</span>
        </p>
        {chosen.key === "orchard" && <p className="mt-2 text-[12.5px] leading-snug text-muted">{t("learn_fig_ua_ironwood")}</p>}
      </fieldset>
    </div>
  );
}
