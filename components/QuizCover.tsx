"use client";

import { useState } from "react";
import { Coins, Cpu, Eye, KeyRound, Layers, Lock, Shield, Sparkles, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  coin: Coins,
  key: KeyRound,
  eye: Eye,
  layers: Layers,
  spark: Sparkles,
  lock: Lock,
  cpu: Cpu,
};

/** Düz renkli kapaklar: altın ve siyah sırayla */
const VARIANTS = [
  { bg: "bg-zec", circle: "bg-white/35", icon: "text-[#1A1506]" },
  { bg: "bg-[#1A1A1A] dark:bg-[#2A2A2A]", circle: "bg-white/10", icon: "text-zec" },
];

export function QuizCover({
  icon = "shield",
  cover,
  index = 0,
  className = "",
  big = false,
}: {
  icon?: string;
  /** Yüklenen kapak fotoğrafı; yoksa ikonlu düz kapak gösterilir */
  cover?: string | null;
  index?: number;
  className?: string;
  big?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  if (cover && !broken) {
    return (
      <div className={`relative overflow-hidden bg-input ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  const Icon = ICONS[icon] ?? Shield;
  const v = VARIANTS[index % VARIANTS.length];
  return (
    <div className={`flex items-center justify-center ${v.bg} ${className}`}>
      <div className={`flex items-center justify-center rounded-full ${v.circle} ${big ? "h-36 w-36" : "h-[72px] w-[72px]"}`}>
        <Icon strokeWidth={1.5} className={`${v.icon} ${big ? "h-16 w-16" : "h-8 w-8"}`} />
      </div>
    </div>
  );
}
