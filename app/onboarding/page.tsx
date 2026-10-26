"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { guessCountry } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";
import { LogoMark } from "@/components/Logo";
import { Alert, Field, PageLoader, Spinner } from "@/components/ui";

export default function OnboardingPage() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}

function suggestUsername(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

function Onboarding() {
  const { t, te } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next") || "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/onboarding") ? raw : "/";
  const { ready, session, profile, refreshProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [team, setTeam] = useState("");
  const [avail, setAvail] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, session, router, next]);

  useEffect(() => {
    if (!profile) return;
    if (profile.username) {
      router.replace(next);
      return;
    }
    setDisplayName((d) => d || profile.display_name || "");
    setUsername((u) => u || suggestUsername(profile.display_name || ""));
    setCountry((c) => c || profile.country || guessCountry());
  }, [profile, router, next]);

  // Kullanıcı adı uygunluğu (yazmayı bitirince)
  useEffect(() => {
    setAvail(null);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return;
    const id = setTimeout(() => api.usernameAvailable(username).then(setAvail).catch(() => {}), 350);
    return () => clearTimeout(id);
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateProfile({ username, display_name: displayName.trim(), country, team: team.trim() });
      await refreshProfile();
      router.replace(next);
    } catch (err) {
      setError(te(err));
      setBusy(false);
    }
  };

  if (!ready || !profile) return <PageLoader />;
  const validUser = /^[a-z0-9_]{3,20}$/.test(username);

  return (
    <div className="mx-auto max-w-md pt-2 sm:pt-8">
      <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
        <div className="text-center">
          <LogoMark size={48} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-bold">{t("onboarding_title")}</h1>
          <p className="text-sm text-muted">{t("onboarding_sub")}</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <Field
          label={t("username")}
          hint={
            avail === true ? (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <Check className="h-3.5 w-3.5" /> {t("username_ok")}
              </span>
            ) : avail === false ? (
              <span className="inline-flex items-center gap-1 text-[#E8742A]">
                <X className="h-3.5 w-3.5" /> {t("username_taken")}
              </span>
            ) : (
              t("username_hint")
            )
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soft">@</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              className="input pl-8 tabular-nums"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </Field>
        <Field label={t("display_name")}>
          <input required maxLength={32} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
        </Field>
        <Field label={t("country")}>
          <CountrySelect value={country} onChange={setCountry} required />
        </Field>
        <Field label={t("team")}>
          <input maxLength={64} value={team} onChange={(e) => setTeam(e.target.value)} placeholder={t("team_placeholder")} className="input" />
        </Field>
        <button disabled={busy || !validUser || avail === false || !displayName.trim() || !country} className="btn-zec w-full text-lg">
          {busy && <Spinner className="h-5 w-5 text-[#1A1506]" />}
          {t("save_continue")}
        </button>
      </form>
    </div>
  );
}
