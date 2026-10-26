"use client";

import { useMemo } from "react";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";

export function CountrySelect({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const { lang, t } = useI18n();
  const options = useMemo(
    () =>
      COUNTRY_CODES.map((c) => ({ c, n: countryName(c, lang) })).sort((a, b) =>
        a.n.localeCompare(b.n, lang === "tr" ? "tr" : "en")
      ),
    [lang]
  );
  return (
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="input cursor-pointer">
      <option value="">{t("select_country")}</option>
      {options.map(({ c, n }) => (
        <option key={c} value={c}>
          {n}
        </option>
      ))}
    </select>
  );
}
