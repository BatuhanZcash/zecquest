"use client";

import { useState } from "react";
import { Ban, Check, KeyRound, Unlink, Wallet } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { fakeHash } from "./shared";

const OTHERS_CM = ["a", "b", "c", "d", "e"].map((s) => fakeHash("cm" + s, 6));
const OTHERS_NF = ["p", "q", "r"].map((s) => fakeHash("nf" + s, 6));
const MY_CM = fakeHash("my-commitment", 6);
const MY_NF = fakeHash("my-nullifier", 6);

const STEPS: { title: DictKey; body: DictKey }[] = [
  { title: "learn_fig_nn_s1", body: "learn_fig_nn_s1_body" },
  { title: "learn_fig_nn_s2", body: "learn_fig_nn_s2_body" },
  { title: "learn_fig_nn_s3", body: "learn_fig_nn_s3_body" },
];

function Chip({ text, mine, state }: { text: string; mine?: boolean; state?: "new" | "bad" }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2 font-mono text-[11.5px] tabular-nums transition-colors ${
        state === "bad"
          ? "border-[#E8742A] bg-[#E8742A]/10 text-[#C2571A] line-through dark:text-[#F0955A]"
          : mine
            ? "border-zec bg-zec/20 font-semibold text-ink"
            : "border-line bg-input/60 text-muted"
      }`}
    >
      {text}
    </span>
  );
}

/** How notes, commitments and nullifiers stop double-spends without linking payments. */
export default function NoteNullifier() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const received = step >= 0;
  const spent = step >= 1;
  const again = step === 2;

  return (
    <div>
      {/* Step picker: a real sequence, so numbered */}
      <div role="tablist" aria-label={t("learn_fig_steps")} className="grid grid-cols-3 gap-1 rounded-xl bg-input p-1">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            role="tab"
            aria-selected={step === i}
            onClick={() => setStep(i)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12.5px] font-semibold transition-colors ${
              step === i ? "bg-card text-ink shadow-press" : "text-muted hover:text-ink"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums ${
                step >= i ? "bg-zec text-[#1A1506]" : "bg-line text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className="truncate">{t(s.title)}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-[3.2em] text-[14px] leading-relaxed text-ink" aria-live="polite">
        {t(STEPS[step].body)}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        {/* Private side */}
        <section className="rounded-xl border border-dashed border-line p-3.5">
          <h4 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
            <Wallet className="h-4 w-4" aria-hidden /> {t("learn_fig_nn_wallet")}
          </h4>
          {received && (
            <div className={`mt-3 rounded-lg border p-3 ${spent ? "border-line bg-input/40" : "border-zec bg-zec/10"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[15px] font-bold">{t("learn_fig_nn_note")}</span>
                {spent && <span className="text-[11.5px] font-semibold text-muted">{t("learn_fig_nn_spent")}</span>}
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
                <dt className="text-muted">{t("learn_fig_nn_value")}</dt>
                <dd className="font-medium tabular-nums">1.5 ZEC</dd>
                <dt className="text-muted">{t("learn_fig_nn_owner")}</dt>
                <dd className="font-medium">{t("learn_fig_nn_you")}</dd>
                <dt className="text-muted">{t("learn_fig_nn_rand")}</dt>
                <dd className="font-mono text-[11.5px] text-muted">{fakeHash("rseed", 8)}</dd>
              </dl>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5 text-[11.5px] text-muted">
                <KeyRound className="h-3.5 w-3.5 text-accent" aria-hidden />
                {t("learn_fig_nn_only_you")}
              </div>
            </div>
          )}
        </section>

        {/* Public side */}
        <section className="rounded-xl border border-line bg-card p-3.5">
          <h4 className="text-[12.5px] font-semibold text-muted">{t("learn_fig_nn_public")}</h4>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold">{t("learn_fig_nn_tree")}</span>
              <span className="text-[11.5px] text-soft">{t("learn_fig_nn_tree_hint")}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {OTHERS_CM.map((h) => (
                <Chip key={h} text={h} />
              ))}
              {received && <Chip text={MY_CM} mine />}
            </div>
          </div>

          <div className="my-3 flex items-center gap-2 text-[11.5px] font-medium text-muted" aria-hidden={!spent}>
            <span className="h-px flex-1 border-t border-dashed border-line" />
            <Unlink className="h-3.5 w-3.5 text-accent" aria-hidden />
            <span>{t("learn_fig_nn_unlinkable")}</span>
            <span className="h-px flex-1 border-t border-dashed border-line" />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold">{t("learn_fig_nn_set")}</span>
              <span className="text-[11.5px] text-soft">{t("learn_fig_nn_set_hint")}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {OTHERS_NF.map((h) => (
                <Chip key={h} text={h} />
              ))}
              {spent && <Chip text={MY_NF} mine />}
              {again && <Chip text={MY_NF} state="bad" />}
            </div>
          </div>

          <div className="mt-3 border-t border-line pt-3 text-[12.5px] font-semibold">
            {again ? (
              <span className="inline-flex items-center gap-1.5 text-[#C2571A] dark:text-[#F0955A]">
                <Ban className="h-4 w-4" aria-hidden /> {t("learn_fig_nn_rejected")}
              </span>
            ) : spent ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Check className="h-4 w-4" aria-hidden /> {t("learn_fig_nn_accepted")}
              </span>
            ) : (
              <span className="text-muted">{t("learn_fig_nn_waiting")}</span>
            )}
          </div>
        </section>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-[3px] border border-zec bg-zec/20" aria-hidden /> {t("learn_fig_nn_yours")}
        </span>
        <span>{t("learn_fig_example_hashes")}</span>
      </p>
    </div>
  );
}
