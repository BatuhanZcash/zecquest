import type { DictKey } from "@/lib/i18n";
import { newsDict } from "@/lib/i18n-extra/news";

/** Server error code → news_err_* message (falls back to a generic message) */
export function newsError(e: unknown, t: (k: DictKey, v?: Record<string, string | number>) => string): string {
  const code = (e as { code?: string; message?: string })?.code ?? (e as Error)?.message ?? "";
  const key = `news_err_${code}`;
  if (key in newsDict) return t(key as DictKey);
  const generic = `err_${code}` as DictKey;
  try {
    const s = t(generic);
    if (s !== generic) return s;
  } catch {}
  return t("err_generic");
}
