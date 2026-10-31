"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LogoMark } from "@/components/Logo";
import { SITE } from "@/lib/config";
import { Alert, Spinner } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

function Login() {
  const { t, te } = useI18n();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const { ready, session, profile, refreshProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? t("err_generic") : null);
  const [note, setNote] = useState<string | null>(null);
  // Misafir oturumu varsa: aynı kullanıcıyı e-postayla kalıcı hesaba çevir (puanlar korunur)
  const [upgrade, setUpgrade] = useState(false);
  useEffect(() => setUpgrade(!!profile?.is_guest), [profile?.is_guest]);

  // Zaten girişliyse yönlendir
  useEffect(() => {
    if (!ready || !session) return;
    if (profile === null || profile.is_guest) return;
    router.replace(profile.username ? next : `/onboarding?next=${encodeURIComponent(next)}`);
  }, [ready, session, profile, next, router]);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const google = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) {
      setError(te(error));
      setBusy(false);
    }
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    if (upgrade) {
      const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: callback() });
      if (!error) {
        setBusy(false);
        setStep("code");
        return;
      }
      if (!/already|exists|registered/i.test(error.message + " " + (error as { code?: string }).code)) {
        setBusy(false);
        setError(te(error));
        return;
      }
      // Bu e-postayla zaten hesap var: o hesaba normal giriş yapılır (misafir puanı aktarılmaz)
      setUpgrade(false);
      setNote(t("guest_email_exists"));
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: callback() },
    });
    setBusy(false);
    if (error) setError(te(error));
    else setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: upgrade ? "email_change" : "email" });
    if (error) {
      setBusy(false);
      setError(t("err_otp"));
      return;
    }
    const p = await refreshProfile();
    router.replace(p?.username ? next : `/onboarding?next=${encodeURIComponent(next)}`);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col pt-2 sm:pt-10">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="relative text-center">
          <LogoMark size={44} className="mx-auto" />
          <h1 className="mt-4 text-[20px] font-bold tracking-[-0.01em]">{upgrade ? t("guest_upgrade_title") : t("login_title")}</h1>
          <p className="mt-1 text-sm text-muted">{upgrade ? t("guest_upgrade_sub") : t("login_sub")}</p>
        </div>

        <div className="relative mt-6 space-y-4">
          {error && <Alert>{error}</Alert>}
          {note && <Alert kind="info">{note}</Alert>}

          {step === "email" ? (
            <>
              {SITE.googleAuth && (
                <>
                  <button onClick={google} disabled={busy} className="btn-ghost w-full">
                    <GoogleIcon />
                    {t("continue_google")}
                  </button>
                  <div className="flex items-center gap-3 text-[13px] text-soft">
                    <span className="h-px flex-1 bg-line" />
                    {t("or")}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                </>
              )}
              <form onSubmit={sendCode} className="space-y-3">
                <label className="block">
                  <span className="label mb-1.5 block">{t("email")}</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                  />
                </label>
                <button disabled={busy || !email.includes("@")} className="btn-zec w-full">
                  {busy ? <Spinner className="h-5 w-5 text-[#1A1506]" /> : <Mail className="h-5 w-5" />}
                  {upgrade ? t("send_verify_code") : t("send_code")}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <Alert kind="info">{t("code_sent", { email })}</Alert>
              <label className="block">
                <span className="label mb-1.5 block">{t("enter_code_label")}</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="input text-center tabular-nums text-2xl tracking-[0.5em]"
                  placeholder="••••••"
                />
              </label>
              <button disabled={busy || code.length < 6} className="btn-zec w-full">
                {busy && <Spinner className="h-5 w-5 text-[#1A1506]" />}
                {t("verify")}
              </button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={() => setStep("email")} className="text-muted hover:text-ink">
                  {t("change_email")}
                </button>
                <button type="button" onClick={() => sendCode()} disabled={busy} className="font-semibold text-zec-600 hover:underline dark:text-accent">
                  {t("resend")}
                </button>
              </div>
            </form>
          )}

          <p className="pt-2 text-center text-xs text-soft">
            <Link href="/terms" className="hover:underline">
              {t("login_terms")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
