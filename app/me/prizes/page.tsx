"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Gift, Shield } from "lucide-react";
import { useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { SITE } from "@/lib/config";
import { Alert, PageLoader, Spinner } from "@/components/ui";
import type { PrizeClaim } from "@/lib/types";
import { PrizeStatusChip } from "@/components/PrizeStatusChip";

export default function MyPrizesPage() {
  const { t } = useI18n();
  const auth = useRequireAuth();
  const { data, loading, setData } = useAsync(() => (auth.ok ? api.myPrizes() : Promise.resolve(null)), [auth.ok]);

  if (!auth.ok || (loading && !data)) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Gift className="h-6 w-6 text-accent" /> {t("prizes_title")}
      </h1>
      {!data?.length ? (
        <div className="card p-10 text-center text-muted">
          {t("no_prizes")}
          <div className="mt-4">
            <Link href="/events" className="btn-zec">
              {t("nav_events")}
            </Link>
          </div>
        </div>
      ) : (
        data.map((c) => <PrizeCard key={c.id} c={c} onUpdate={setData} />)
      )}
    </div>
  );
}

function PrizeCard({ c, onUpdate }: { c: PrizeClaim; onUpdate: (d: PrizeClaim[]) => void }) {
  const { t, lt, te } = useI18n();
  const [addr, setAddr] = useState(c.address ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = c.status === "awaiting_address" || c.status === "pending";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      onUpdate(await api.submitPrizeAddress(c.id, addr.trim()));
    } catch (er) {
      setErr(te(er));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`card p-5 ${c.status === "awaiting_address" ? "ring-2 ring-zec/60" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zec tabular-nums text-lg font-bold text-[#1A1506]">
          {c.place}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/results/${c.game.id}`} className="font-semibold hover:text-accent">
            {lt(c.game.title)}
          </Link>
          <p className="text-sm text-muted">
            {t("place_n", { n: c.place })}
            {c.game.prize ? ` · ${lt(c.game.prize)}` : ""}
          </p>
        </div>
        <PrizeStatusChip status={c.status} />
      </div>

      {editable && (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <div className="relative">
            <Shield className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value.trim())}
              placeholder="u1… / zs1… / t1…"
              spellCheck={false}
              className="input pl-10 tabular-nums text-sm"
            />
          </div>
          <p className="text-xs text-soft">{t("zcash_address_hint")}</p>
          {err && <Alert>{err}</Alert>}
          <button disabled={busy || addr.length < 30 || addr === c.address} className="btn-zec py-2 text-sm">
            {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
            {t("submit_address")}
          </button>
        </form>
      )}

      {c.status === "paid" && c.txid && (
        <a
          href={SITE.explorerTx.replace("{txid}", c.txid)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          {t("view_tx")} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
