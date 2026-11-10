"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";

const GUEST_NAME_KEY = "zq-guest-name";

/**
 * Shown to visitors who aren't signed in: progress stays on this device until they
 * continue as a guest or sign in, then it's credited as XP.
 */
export function SaveProgress({ pending, compact = false }: { pending: number; compact?: boolean }) {
  const { t, te } = useI18n();
  const { refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState("/learn");

  useEffect(() => {
    setNext(window.location.pathname);
    try {
      const saved = localStorage.getItem(GUEST_NAME_KEY);
      if (saved) setName(saved);
    } catch {}
  }, []);

  const clean = name.trim().replace(/\s+/g, " ");
  const valid = clean.length >= 2 && clean.length <= 24;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      await api.guestStart(clean);
      try {
        localStorage.setItem(GUEST_NAME_KEY, clean);
      } catch {}
      await refreshProfile();
    } catch (err) {
      setError(te(err));
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-dashed border-zec/60 bg-tint/40 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug">{t("learn_save_title")}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            {pending > 0 ? t("learn_save_body_pending", { n: pending }) : t("learn_save_body")}
          </p>
        </div>
      </div>
      {open ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="learn-guest-name">
            {t("guest_name_label")}
          </label>
          <input
            id="learn-guest-name"
            autoFocus
            value={name}
            maxLength={24}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
            placeholder={t("guest_name_placeholder")}
            className="input sm:max-w-[240px]"
          />
          <button disabled={busy || !valid} className="btn-zec">
            {busy ? <Spinner className="h-4 w-4 text-[#1A1506]" /> : <UserRound className="h-4 w-4" aria-hidden />}
            {t("learn_save_guest_go")}
          </button>
          {error && <p className="text-sm font-medium text-[#D93036] sm:self-center">{error}</p>}
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(true)} className="btn-zec py-2">
            {t("learn_save_guest")}
          </button>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-ghost py-2">
            {t("sign_in")}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Small confirmation that appears after XP is earned (or saved on the device). */
export function XpToast({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [text, onDone]);
  if (!text) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[90vw] animate-rise rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-card shadow-card lg:bottom-8"
    >
      {text}
    </div>
  );
}
