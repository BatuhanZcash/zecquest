"use client";

import { useI18n } from "@/lib/i18n";
import type { PrizeClaim } from "@/lib/types";

export function PrizeStatusChip({ status }: { status: PrizeClaim["status"] }) {
  const { t } = useI18n();
  const map = {
    awaiting_address: [t("prize_awaiting"), "bg-[#E8742A]/15 text-[#E8742A]"],
    pending: [t("prize_pending"), "bg-zec/15 text-accent"],
    paid: [t("prize_paid"), "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"],
    void: [t("prize_void"), "bg-input text-muted"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}
