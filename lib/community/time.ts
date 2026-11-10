/** Saat dilimi yardımcıları (harici kütüphane olmadan, Intl ile) */

function parts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** tz dilimindeki saat farkı (ms): yerel = utc + offset */
function offset(ms: number, tz: string) {
  const p = parts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** "2026-11-20" + "19:00" (tz'de) → ISO UTC */
export function zonedToIso(date: string, time: string, tz: string): string | null {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{2}):(\d{2})$/);
  if (!m || !t) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
  try {
    let utc = guess - offset(guess, tz);
    utc = guess - offset(utc, tz);
    return new Date(utc).toISOString();
  } catch {
    return new Date(guess).toISOString();
  }
}

/** ISO → tz'deki { date: "YYYY-MM-DD", time: "HH:MM" } */
export function isoToZoned(iso: string, tz: string) {
  try {
    const p = parts(new Date(iso).getTime(), tz);
    const pad = (n: number) => String(n).padStart(2, "0");
    return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
  } catch {
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }
}

export function timeZones(): string[] {
  try {
    const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (f) return f("timeZone");
  } catch {}
  return ["UTC", "Europe/Istanbul", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"];
}
