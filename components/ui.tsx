"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Play } from "lucide-react";
import { QuizCover } from "./QuizCover";
import { useI18n } from "@/lib/i18n";
import { flag } from "@/lib/countries";
import type { QuizCardData } from "@/lib/types";
import { SITE } from "@/lib/config";

export function hashIndex(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/* ---------- Avatar (baş harfler + isteğe bağlı bayrak) ---------- */
const AV = [
  "bg-[#FCEFC7] text-[#7A5600]",
  "bg-[#E9E7E2] text-[#3A3935] dark:bg-[#4A4843] dark:text-[#EDEBE6]",
  "bg-[#1A1A1A] text-[#F4B728] dark:bg-[#383838]",
  "bg-[#FBE3D3] text-[#8A3D10]",
  "bg-[#E3ECE6] text-[#2F5A3C]",
];
export function Avatar({
  name,
  size = 36,
  country,
  className = "",
}: {
  name: string;
  size?: number;
  country?: string | null;
  className?: string;
}) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase("tr"))
    .join("");
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span
        className={`inline-flex h-full w-full items-center justify-center rounded-full font-semibold ${AV[hashIndex(name || "?") % AV.length]}`}
        style={{ fontSize: size * 0.36 }}
      >
        {initials || "?"}
      </span>
      {country && (
        <span
          className="absolute -bottom-0.5 -right-1 leading-none"
          style={{ fontSize: Math.max(10, size * 0.34) }}
          aria-hidden
        >
          {flag(country)}
        </span>
      )}
    </span>
  );
}

/* ---------- Quiz kartı ---------- */
export function QuizCard({ quiz, compact = false, href }: { quiz: QuizCardData; compact?: boolean; href?: string }) {
  const { t, lt } = useI18n();
  const author = quiz.author?.display_name || quiz.author?.username || SITE.name;
  return (
    <Link href={href ?? `/quiz/${quiz.slug}`} className="group card block overflow-hidden transition-colors hover:border-[#CFCDC7]">
      <QuizCover icon={quiz.icon} index={hashIndex(quiz.id)} className={compact ? "h-24" : "h-36"} />
      <div className={compact ? "p-3" : "px-4 pb-4 pt-3"}>
        <h3 className={`truncate font-semibold ${compact ? "text-[14px]" : "text-[15px]"}`}>{lt(quiz.title)}</h3>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
          <Avatar name={author} size={20} />
          <span className="truncate">{author}</span>
        </div>
        {!compact && (
          <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-[13px] text-muted">
            <span>{t("questions_n", { n: quiz.question_count })}</span>
            <span className="inline-flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> {t("plays_n", { n: quiz.plays })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-36 animate-pulse bg-input" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-input" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-input" />
      </div>
    </div>
  );
}

/* ---------- Geri butonu ---------- */
export function BackButton({ href = "/" }: { href?: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="btn-ghost px-3 py-1.5 text-sm">
      <ArrowLeft className="h-4 w-4" />
      {t("back")}
    </Link>
  );
}

/* ---------- Cevap butonları ---------- */
export const ANSWER_STYLES = [
  { cls: "bg-zec text-[#1A1506]", shadow: "#B07A08", shape: "triangle" },
  { cls: "bg-[#1A1A1A] text-white", shadow: "#000000", shape: "diamond" },
  { cls: "bg-[#E8742A] text-white", shadow: "#A64A12", shape: "circle" },
  { cls: "bg-[#F3E9D2] text-[#2A1F08]", shadow: "#BFAE86", shape: "square" },
] as const;

export function Shape({ shape, className = "" }: { shape: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {shape === "triangle" && <path className="fill-current" d="M12 3 22 20H2z" />}
      {shape === "diamond" && <path className="fill-current" d="M12 2 22 12 12 22 2 12z" />}
      {shape === "circle" && <circle className="fill-current" cx="12" cy="12" r="10" />}
      {shape === "square" && <rect className="fill-current" x="3" y="3" width="18" height="18" rx="3" />}
    </svg>
  );
}

export function AnswerButton({
  index,
  label,
  onClick,
  disabled,
  state = "idle",
  size = "md",
}: {
  index: number;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  state?: "idle" | "correct" | "wrong" | "dim" | "picked";
  size?: "md" | "lg" | "fill";
}) {
  const s = ANSWER_STYLES[index % 4];
  const dim = state === "dim" || state === "wrong";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ boxShadow: dim ? "none" : `0 4px 0 0 ${s.shadow}` }}
      className={`relative flex w-full items-center gap-4 rounded-xl2 px-5 text-left font-semibold transition-[transform,opacity,box-shadow] duration-150 enabled:active:translate-y-[4px] enabled:active:!shadow-none ${s.cls} ${
        size === "lg" ? "min-h-[96px] text-xl sm:text-2xl" : size === "fill" ? "h-full min-h-[72px] text-lg" : "min-h-[72px] text-base sm:text-lg"
      } ${dim ? "opacity-30" : ""} ${
        state === "correct" ? "scale-[1.02] outline outline-4 outline-offset-2 outline-emerald-400" : ""
      } ${state === "picked" ? "outline outline-4 outline-offset-2 outline-white/80" : ""} disabled:cursor-default`}
    >
      <Shape shape={s.shape} className="h-7 w-7 shrink-0" />
      <span className="leading-snug">{label}</span>
      {state === "correct" && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
          ✓
        </span>
      )}
    </button>
  );
}

/* ---------- Bölüm başlığı ---------- */
export function SectionHead({ icon, title, right, sub }: { icon?: React.ReactNode; title: string; right?: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent">{icon}</span>}
      <div className="min-w-0">
        <h2 className="section-title leading-tight">{title}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {right && <div className="ml-auto shrink-0">{right}</div>}
    </div>
  );
}

/* ---------- Durum bileşenleri ---------- */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-accent ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function ErrorBox({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-[#E8742A]" />
      <p className="text-muted">{message}</p>
      {action}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "error"
      ? "bg-[#E8742A]/10 text-[#E8742A]"
      : kind === "ok"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-tint text-accent";
  return <div className={`rounded-xl px-4 py-3 text-sm font-medium ${cls}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-soft">{hint}</span>}
    </label>
  );
}

export function StatusChip({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, [string, string]> = {
    draft: [t("status_draft"), "bg-input text-muted"],
    pending: [t("status_pending"), "bg-zec/15 text-accent"],
    published: [t("status_published"), "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"],
    rejected: [t("status_rejected"), "bg-[#E8742A]/15 text-[#E8742A]"],
  };
  const [label, cls] = map[status] ?? [status, "bg-input text-muted"];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}
