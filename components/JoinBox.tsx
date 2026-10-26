"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clock, UserPlus } from "lucide-react";
import { SectionHead } from "./ui";
import { useI18n } from "@/lib/i18n";

export function formatCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/* ---- Son katılınan odalar (yalnızca kolaylık; cihazda saklanır) ---- */
export function getRecentRooms(): { code: string; at: number }[] {
  try {
    const list = JSON.parse(localStorage.getItem("zq-recent") || "[]") as { code: string; at: number }[];
    return list.filter((r) => Date.now() - r.at < 1000 * 60 * 60 * 24);
  } catch {
    return [];
  }
}
export function addRecentRoom(code: string) {
  try {
    const list = [{ code, at: Date.now() }, ...getRecentRooms().filter((r) => r.code !== code)].slice(0, 5);
    localStorage.setItem("zq-recent", JSON.stringify(list));
  } catch {}
}

/** 6 haneli, 3-3 bölünmüş oda kodu girişi */
export function CodeInput({
  value,
  onChange,
  onEnter,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const set = (i: number, ch: string) => {
    const digits = value.padEnd(6, " ").split("");
    digits[i] = ch || " ";
    onChange(digits.join("").replace(/\s+$/, "").replace(/ /g, ""));
  };

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="contents">
          {i === 3 && <span className="text-soft">–</span>}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            aria-label={`Digit ${i + 1}`}
            value={value[i] ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v.length > 1) {
                onChange((value.slice(0, i) + v).slice(0, 6));
                refs.current[Math.min(5, i + v.length)]?.focus();
                return;
              }
              set(i, v);
              if (v && i < 5) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "Enter") onEnter?.();
            }}
            onFocus={(e) => e.target.select()}
            className="h-12 w-10 rounded-xl border border-line bg-input text-center tabular-nums text-xl font-bold text-ink outline-none transition focus:border-zec focus:ring-2 focus:ring-zec/30 sm:h-14 sm:w-12 sm:text-2xl"
          />
        </span>
      ))}
    </div>
  );
}

export function JoinBox() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<{ code: string; at: number }[]>([]);

  useEffect(() => setRecent(getRecentRooms()), []);
  const go = () => code.length === 6 && router.push(`/play/${code}`);

  return (
    <section className="card relative flex flex-col overflow-hidden p-4 sm:p-5">
      <SectionHead icon={<UserPlus className="h-5 w-5" />} title={t("join_a_game")} sub={t("join_sub")} />
      <div className="mt-2">
        <CodeInput value={code} onChange={setCode} onEnter={go} />
      </div>
      {recent.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {recent.map((r) => (
            <Link
              key={r.code}
              href={`/play/${r.code}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 tabular-nums text-sm hover:border-zec hover:text-accent"
            >
              <Clock className="h-3.5 w-3.5" />
              {formatCode(r.code)}
            </Link>
          ))}
        </div>
      )}
      <button onClick={go} disabled={code.length !== 6} className="btn-zec mt-5 w-full text-base">
        {t("join_btn")}
      </button>
    </section>
  );
}
