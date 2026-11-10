"use client";

import type { ComponentType } from "react";
import ShieldedVsTransparent from "./ShieldedVsTransparent";
import ValuePoolsTimeline from "./ValuePoolsTimeline";
import NoteNullifier from "./NoteNullifier";
import UnifiedAddress from "./UnifiedAddress";
import UpgradeTimeline from "./UpgradeTimeline";
import FundingFlow from "./FundingFlow";
import WalletSafety from "./WalletSafety";
import ZkpIntuition from "./ZkpIntuition";

/** Lesson `figure` block key → diagram component. */
export const FIGURES: Record<string, ComponentType> = {
  "shielded-vs-transparent": ShieldedVsTransparent,
  "value-pools-timeline": ValuePoolsTimeline,
  "note-nullifier": NoteNullifier,
  "unified-address": UnifiedAddress,
  "upgrade-timeline": UpgradeTimeline,
  "funding-flow": FundingFlow,
  "wallet-safety": WalletSafety,
  "zkp-intuition": ZkpIntuition,
};

export const FIGURE_KEYS = Object.keys(FIGURES);

/** A figure with its caption. Unknown keys render nothing but the caption (never break a lesson). */
export function Figure({
  figKey,
  caption,
  label,
  describeLabel = "Text description",
}: {
  figKey: string;
  caption: string;
  label?: string;
  /** Summary text for long, alt-text-style captions, which are folded away */
  describeLabel?: string;
}) {
  const C = FIGURES[figKey];
  const long = caption.length > 140;
  return (
    <figure className="not-prose my-8 sm:-mx-6">
      {C && (
        <div className="rounded-2xl border border-line bg-elevated p-4 sm:p-6">
          <C />
        </div>
      )}
      {caption && !long && (
        <figcaption className="mt-2.5 px-1 text-[13.5px] leading-snug text-muted sm:px-6">
          {label && <span className="mr-1.5 font-semibold tabular-nums text-ink">{label}</span>}
          {caption}
        </figcaption>
      )}
      {caption && long && (
        <figcaption className="mt-2.5 px-1 text-[13.5px] leading-snug text-muted sm:px-6">
          <details className="group">
            <summary className="cursor-pointer list-none">
              {label && <span className="mr-1.5 font-semibold tabular-nums text-ink">{label}</span>}
              <span className="underline decoration-line underline-offset-[3px] group-hover:decoration-[rgb(var(--soft))]">{describeLabel}</span>
            </summary>
            <p className="mt-1.5">{caption}</p>
          </details>
        </figcaption>
      )}
    </figure>
  );
}
