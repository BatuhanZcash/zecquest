"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, LogOut, PenSquare, Shield } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { CountrySelect } from "@/components/CountrySelect";
import { Alert, Field, PageLoader, Spinner } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { t, te } = useI18n();
  const auth = useRequireAuth();
  const { profile, session, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [team, setTeam] = useState("");
  const [addr, setAddr] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reqBusy, setReqBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setCountry(profile.country ?? "");
    setTeam(profile.team ?? "");
    setAddr(profile.zcash_address ?? "");
  }, [profile]);

  if (!auth.ok || !profile) return <PageLoader />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile({ display_name: displayName, username, country, team, zcash_address: addr.trim() || null });
      await refreshProfile();
      setMsg({ kind: "ok", text: t("saved_ok") });
    } catch (err) {
      setMsg({ kind: "error", text: te(err) });
    } finally {
      setBusy(false);
    }
  };

  const request = async () => {
    setReqBusy(true);
    try {
      await api.requestCreator(note);
      await refreshProfile();
    } catch (err) {
      setMsg({ kind: "error", text: te(err) });
    } finally {
      setReqBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">{t("nav_settings")}</h1>
        <div className="flex gap-2">
          <Link href={`/u/${profile.username}`} className="btn-ghost py-2 text-sm">
            {t("nav_profile")}
          </Link>
          <Link href="/me/prizes" className="btn-ghost py-2 text-sm">
            <Gift className="h-4 w-4" /> {t("nav_prizes")}
          </Link>
        </div>
      </div>

      <form onSubmit={save} className="card space-y-4 p-6">
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <p className="text-sm text-muted">{session?.user.email}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("display_name")}>
            <input required maxLength={32} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
          </Field>
          <Field label={t("username")} hint={t("username_hint")}>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              className="input tabular-nums"
            />
          </Field>
          <Field label={t("country")}>
            <CountrySelect value={country} onChange={setCountry} required />
          </Field>
          <Field label={t("team")}>
            <input maxLength={64} value={team} onChange={(e) => setTeam(e.target.value)} placeholder={t("team_placeholder")} className="input" />
          </Field>
        </div>
        <Field label={t("zcash_address")} hint={t("zcash_address_hint")}>
          <div className="relative">
            <Shield className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value.trim())}
              placeholder="u1…"
              spellCheck={false}
              autoComplete="off"
              className="input pl-10 tabular-nums text-sm"
            />
          </div>
        </Field>
        <button disabled={busy} className="btn-zec">
          {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
          {t("save")}
        </button>
      </form>

      {profile.role === "player" && (
        <div className="card space-y-3 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <PenSquare className="h-5 w-5 text-accent" /> {t("become_creator")}
          </h2>
          <p className="text-sm text-muted">{t("become_creator_hint")}</p>
          {profile.creator_request_at ? (
            <Alert kind="info">{t("request_pending")}</Alert>
          ) : (
            <>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t("creator_note")} className="input" />
              <button onClick={request} disabled={reqBusy || note.trim().length < 10} className="btn-ink">
                {reqBusy && <Spinner className="h-4 w-4" />}
                {t("send_request")}
              </button>
            </>
          )}
        </div>
      )}

      <button
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="btn-ghost w-full text-[#E8742A]"
      >
        <LogOut className="h-4 w-4" />
        {t("sign_out")}
      </button>
    </div>
  );
}
