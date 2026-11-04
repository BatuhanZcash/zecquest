/**
 * Quiz dilleri. Organizatör quizini bunlardan tek bir dilde hazırlar.
 * code: BCP-47 kodu (veritabanında quizzes.language), native: kendi dilindeki adı, name: İngilizce adı.
 * null dil = eski iki dilli (Türkçe + İngilizce) quiz.
 */
export interface QuizLanguage {
  code: string;
  native: string;
  name: string;
  rtl?: boolean;
}

export const QUIZ_LANGUAGES: QuizLanguage[] = [
  { code: "en", native: "English", name: "English" },
  { code: "tr", native: "Türkçe", name: "Turkish" },
  { code: "es", native: "Español", name: "Spanish" },
  { code: "pt", native: "Português", name: "Portuguese" },
  { code: "pt-BR", native: "Português (Brasil)", name: "Portuguese (Brazil)" },
  { code: "fr", native: "Français", name: "French" },
  { code: "de", native: "Deutsch", name: "German" },
  { code: "it", native: "Italiano", name: "Italian" },
  { code: "nl", native: "Nederlands", name: "Dutch" },
  { code: "pl", native: "Polski", name: "Polish" },
  { code: "ru", native: "Русский", name: "Russian" },
  { code: "uk", native: "Українська", name: "Ukrainian" },
  { code: "cs", native: "Čeština", name: "Czech" },
  { code: "ro", native: "Română", name: "Romanian" },
  { code: "hu", native: "Magyar", name: "Hungarian" },
  { code: "el", native: "Ελληνικά", name: "Greek" },
  { code: "bg", native: "Български", name: "Bulgarian" },
  { code: "sr", native: "Српски", name: "Serbian" },
  { code: "hr", native: "Hrvatski", name: "Croatian" },
  { code: "sv", native: "Svenska", name: "Swedish" },
  { code: "no", native: "Norsk", name: "Norwegian" },
  { code: "da", native: "Dansk", name: "Danish" },
  { code: "fi", native: "Suomi", name: "Finnish" },
  { code: "az", native: "Azərbaycanca", name: "Azerbaijani" },
  { code: "kk", native: "Қазақша", name: "Kazakh" },
  { code: "uz", native: "Oʻzbekcha", name: "Uzbek" },
  { code: "ka", native: "ქართული", name: "Georgian" },
  { code: "ar", native: "العربية", name: "Arabic", rtl: true },
  { code: "fa", native: "فارسی", name: "Persian", rtl: true },
  { code: "he", native: "עברית", name: "Hebrew", rtl: true },
  { code: "ur", native: "اردو", name: "Urdu", rtl: true },
  { code: "hi", native: "हिन्दी", name: "Hindi" },
  { code: "bn", native: "বাংলা", name: "Bengali" },
  { code: "ta", native: "தமிழ்", name: "Tamil" },
  { code: "te", native: "తెలుగు", name: "Telugu" },
  { code: "mr", native: "मराठी", name: "Marathi" },
  { code: "gu", native: "ગુજરાતી", name: "Gujarati" },
  { code: "kn", native: "ಕನ್ನಡ", name: "Kannada" },
  { code: "ml", native: "മലയാളം", name: "Malayalam" },
  { code: "pa", native: "ਪੰਜਾਬੀ", name: "Punjabi" },
  { code: "ne", native: "नेपाली", name: "Nepali" },
  { code: "si", native: "සිංහල", name: "Sinhala" },
  { code: "zh", native: "中文", name: "Chinese" },
  { code: "ja", native: "日本語", name: "Japanese" },
  { code: "ko", native: "한국어", name: "Korean" },
  { code: "vi", native: "Tiếng Việt", name: "Vietnamese" },
  { code: "th", native: "ไทย", name: "Thai" },
  { code: "id", native: "Bahasa Indonesia", name: "Indonesian" },
  { code: "ms", native: "Bahasa Melayu", name: "Malay" },
  { code: "fil", native: "Filipino", name: "Filipino" },
  { code: "my", native: "မြန်မာ", name: "Burmese" },
  { code: "pcm", native: "Naijá (Pidgin)", name: "Nigerian Pidgin" },
  { code: "yo", native: "Yorùbá", name: "Yoruba" },
  { code: "ha", native: "Hausa", name: "Hausa" },
  { code: "ig", native: "Igbo", name: "Igbo" },
  { code: "sw", native: "Kiswahili", name: "Swahili" },
  { code: "am", native: "አማርኛ", name: "Amharic" },
  { code: "zu", native: "isiZulu", name: "Zulu" },
  { code: "af", native: "Afrikaans", name: "Afrikaans" },
];

const BY_CODE = new Map(QUIZ_LANGUAGES.map((l) => [l.code, l]));

export function findLanguage(code: string | null | undefined): QuizLanguage | null {
  if (!code) return null;
  return BY_CODE.get(code) ?? BY_CODE.get(code.split("-")[0]) ?? { code, native: code.toUpperCase(), name: code.toUpperCase() };
}

/** Quizin dil etiketi: tek dilliyse kendi adı, iki dilliyse "TR / EN" */
export function languageLabel(code: string | null | undefined): string {
  return code ? findLanguage(code)!.native : "TR / EN";
}

/** Metin alanlarına verilecek lang/dir öznitelikleri */
export function textAttrs(code: string | null | undefined): { lang?: string; dir: "rtl" | "auto" } {
  const l = findLanguage(code);
  return l ? { lang: l.code, dir: l.rtl ? "rtl" : "auto" } : { dir: "auto" };
}
