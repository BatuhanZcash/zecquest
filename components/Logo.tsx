"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/config";

/**
 * Resmi Zcash logosu. Dosya public/brand/ klasöründen okunur (README → "Marka").
 * Dosya henüz konmadıysa yerine sade bir "ZEC" rozeti gösterilir.
 */
export function ZcashMark({ size = 32, className = "", variant = "mark" }: { size?: number; className?: string; variant?: "mark" | "mark-white" }) {
  const src = variant === "mark-white" ? SITE.brand.zcashMarkWhite : SITE.brand.zcashMark;
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Görsel, hidrasyondan önce hata vermiş olabilir
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-zec font-bold text-[#1A1506] ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.3 }}
        aria-label="Zcash"
      >
        ZEC
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      width={size}
      height={size}
      alt="Zcash"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Eski adıyla kullanılan yerler için */
export const LogoMark = ZcashMark;

/** Uygulama logosu: Zcash işareti + uygulama adı (adı lib/config.ts → SITE.name) */
export function Logo({ compact = false, size = 30 }: { compact?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ZcashMark size={size} />
      {!compact && <span className="text-[18px] font-bold leading-none tracking-[-0.02em]">{SITE.name}</span>}
    </span>
  );
}
