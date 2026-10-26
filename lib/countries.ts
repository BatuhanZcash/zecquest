/** ISO 3166-1 alpha-2 ülke kodları. Ülke adları tarayıcının Intl.DisplayNames'i ile seçili dilde gösterilir. */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

/** "TR" → 🇹🇷 */
export function flag(code?: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const cache = new Map<string, Intl.DisplayNames>();
export function countryName(code: string | null | undefined, lang: string): string {
  if (!code) return "";
  try {
    let dn = cache.get(lang);
    if (!dn) {
      dn = new Intl.DisplayNames([lang], { type: "region" });
      cache.set(lang, dn);
    }
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Tarayıcının diline göre tahmini ülke (onboarding'de varsayılan) */
export function guessCountry(): string {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language;
    const m = loc.match(/-([A-Z]{2})\b/);
    if (m && COUNTRY_CODES.includes(m[1])) return m[1];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Europe/Istanbul") return "TR";
  } catch {}
  return "";
}
