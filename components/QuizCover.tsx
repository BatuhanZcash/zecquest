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

/**
 * Fotoğrafsız kapaklar: üç zemin (altın, mürekkep, buz grisi) üzerinde
 * büyük, kenardan taşan çizgi ikon ve ince eğik çizgiler.
 */
const VARIANTS = [
  { bg: "bg-[#FBE3A4]", icon: "text-[#8C6100]", stripe: "rgba(140,97,0,0.10)" },
  { bg: "bg-[#1C2027]", icon: "text-zec", stripe: "rgba(244,183,40,0.10)" },
  { bg: "bg-[#DDE3EC] dark:bg-[#2A3140]", icon: "text-[#3B4658] dark:text-[#AFC0D8]", stripe: "rgba(59,70,88,0.10)" },
];

export function QuizCover({
  icon = "shield",
  cover,
  index = 0,
  className = "",
  big = false,
}: {
  icon?: string;
  /** Yüklenen kapak fotoğrafı; yoksa ikonlu kapak gösterilir */
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
    <div
      className={`relative overflow-hidden ${v.bg} ${className}`}
      style={{ backgroundImage: `repeating-linear-gradient(-35deg, ${v.stripe} 0 2px, transparent 2px 14px)` }}
    >
      <Icon
        strokeWidth={1.25}
        className={`absolute ${v.icon} ${big ? "-bottom-10 -right-6 h-64 w-64" : "-bottom-6 -right-4 h-[62%] w-auto"}`}
        style={{ aspectRatio: "1 / 1" }}
      />
    </div>
  );
}
