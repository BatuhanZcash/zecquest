"use client";

import { api } from "./api";

/**
 * Sunucu saatiyle senkronizasyon. Dünyanın her yerinden oyuncuların
 * geri sayımı aynı anda bitsin diye yerel saat yerine sunucu saati kullanılır.
 */
let offset = 0;
let synced: Promise<void> | null = null;

export function syncClock(force = false): Promise<void> {
  if (synced && !force) return synced;
  synced = (async () => {
    const samples: { off: number; rtt: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      try {
        const server = await api.serverTime();
        const t1 = Date.now();
        samples.push({ off: server - (t0 + t1) / 2, rtt: t1 - t0 });
      } catch {
        /* çevrimdışı: yerel saatle devam */
      }
    }
    if (samples.length) {
      samples.sort((a, b) => a.rtt - b.rtt);
      offset = samples[0].off;
    }
  })();
  return synced;
}

/** Sunucunun gönderdiği zaman damgasından (ms) ek düzeltme */
export function noteServerNow(serverNow?: number) {
  if (!serverNow) return;
  const est = serverNow - Date.now();
  // RTT ölçümlü senkron daha hassas; yalnızca büyük sapmada (cihaz saati değişti vb.) düzelt
  if (Math.abs(est - offset) > 2000) offset = est;
}

export function serverNow() {
  return Date.now() + offset;
}
