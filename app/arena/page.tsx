"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Info, Languages, LogIn, Swords, Trophy, UserRound, Zap } from "lucide-react";
import { Avatar, Spinner } from "@/components/ui";
import { LeagueEmblem } from "@/components/games/GameArt";
import { Duel, Result, leagueKey } from "@/components/games/arena/ArenaViews";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { useArenaMatch } from "@/lib/useArena";
import { gamesApi, LEAGUES, leagueOf, nextLeague, type ArenaBoardRow, type MyArena, type Period } from "@/lib/api-games";

const MATCH_KEY = "zq-arena-match";
const LANG_KEY = "zq-arena-lang";
const GUEST_NAME_KEY = "zq-guest-name";

type View = "lobby" | "searching" | "match";

export default function ArenaPage() {
  const { t, lang: uiLang } = useI18n();
  const { ready, session, profile, refreshProfile } = useAuth();
  const [view, setView] = useState<View>("lobby");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [me, setMe] = useState<MyArena | null>(null);
  const [qLang, setQLang] = useState<string>("");
  const [langs, setLangs] = useState<{ code: string; count: number }[]>([]);
  const [online, setOnline] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardKey, setBoardKey] = useState(0);

  const canPlay = !!session && !!profile && (profile.is_guest ? !!profile.display_name : !!profile.username);

  const loadMe = useCallback(async () => {
    if (!canPlay) return;
    try {
      const m = await gamesApi.myArena();
      setMe(m);
      // resume a running match after a reload
      if (m.active_match) {
        setMatchId(m.active_match);
        setView("match");
      }
    } catch {}
  }, [canPlay]);

  useEffect(() => {
    if (ready) loadMe();
  }, [ready, loadMe]);

  useEffect(() => {
    try {
      setQLang(localStorage.getItem(LANG_KEY) || "");
    } catch {}
    api.listQuizLanguages().then(setLangs).catch(() => {});
    const tick = () => gamesApi.arenaOnline().then(setOnline).catch(() => {});
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const lang = qLang || uiLang;

  const findOpponent = () => {
    setError(null);
    setView("searching");
  };

  const backToLobby = () => {
    setView("lobby");
    setMatchId(null);
    try {
      sessionStorage.removeItem(MATCH_KEY);
    } catch {}
    loadMe();
    setBoardKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-[1080px]">
      {view === "lobby" && (
        <>
          <Link href="/games" className="btn-ghost mb-5 px-3 py-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" /> {t("games_nav")}
          </Link>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zec text-[#14161B]"><Swords className="h-6 w-6" /></span>
            <h1 className="page-title">{t("games_arena_title")}</h1>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
            <div className="space-y-4">
              {!ready ? (
                <div className="card h-48 animate-pulse" />
              ) : canPlay ? (
                <LeagueCard me={me} />
              ) : (
                <JoinCard onReady={async () => { await refreshProfile(); }} />
              )}
              {canPlay && (
                <>
                  <button onClick={findOpponent} className="group w-full rounded-[22px] bg-zec px-6 py-6 text-center text-[#14161B] shadow-[0_14px_40px_-16px_rgba(244,183,40,0.7)] transition hover:bg-[#F7C24A] active:scale-[0.99]" data-testid="arena-find">
                    <span className="block font-display text-[30px] font-extrabold leading-none tracking-[-0.02em]">{t("games_arena_find")}</span>
                    <span className="mt-2 block text-[14px] font-medium opacity-80">{t("games_arena_find_sub")}</span>
                  </button>
                  {error && <p className="text-center text-sm font-medium text-[#E8742A]">{error}</p>}
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13.5px] text-muted">
                    {online !== null && online > 0 && (
                      <span className="inline-flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
                        {t("games_arena_online", { n: online })}
                      </span>
                    )}
                    <label className="inline-flex items-center gap-1.5">
                      <Languages className="h-4 w-4" />
                      <span className="sr-only">{t("games_arena_lang")}</span>
                      <select value={lang} onChange={(e) => { setQLang(e.target.value); try { localStorage.setItem(LANG_KEY, e.target.value); } catch {} }}
                        className="rounded-lg border border-line bg-card px-2 py-1 text-[13px] text-ink" aria-label={t("games_arena_lang")}>
                        {Array.from(new Set([uiLang, "en", ...langs.map((l) => l.code)])).map((c) => (
                          <option key={c} value={c}>{languageLabel(c)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}
              <HowItWorks />
            </div>
            <Rankings key={boardKey} myRank={me} />
          </div>
        </>
      )}

      {view === "searching" && (
        <Searching lang={lang} onMatched={(id) => { setMatchId(id); setView("match"); try { sessionStorage.setItem(MATCH_KEY, id); } catch {} }}
          onCancel={backToLobby} onError={(m) => { setError(m); setView("lobby"); }} />
      )}

      {view === "match" && matchId && <Match id={matchId} onAgain={() => { setMatchId(null); setView("searching"); }} onLobby={backToLobby} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Lobby pieces
   --------------------------------------------------------------------- */
function LeagueCard({ me }: { me: MyArena | null }) {
  const { t } = useI18n();
  const rating = me?.rating ?? 1000;
  const league = leagueOf(rating);
  const nl = nextLeague(rating);
  const cur = LEAGUES.filter((x) => x.min <= rating).pop()!;
  const span = nl ? nl.min - cur.min : 1;
  const pct = nl ? ((rating - cur.min) / span) * 100 : 100;
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-line bg-card p-6" data-testid="arena-league">
      <LeagueEmblem league={league} size={170} className="pointer-events-none absolute -right-6 -top-6 opacity-95" />
      <p className="label">{t("games_your_league")}</p>
      <p className="mt-1 font-display text-[38px] font-extrabold leading-none tracking-[-0.02em]">{t("games_arena_league_title", { league: t(leagueKey(league)) })}</p>
      <p className="mt-3 max-w-[60%] text-[14px] text-muted">
        {nl ? t("games_arena_to_next", { n: nl.min - rating, league: t(leagueKey(nl.id)) }) : t("games_arena_top")}
      </p>
      <div className="mt-5 max-w-[70%]">
        <div className="h-2.5 overflow-hidden rounded-full bg-input">
          <div className="h-full rounded-full bg-zec transition-all duration-700" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[12.5px] font-semibold tabular-nums text-muted">
          <span>{rating}</span>
          {nl && <span>{nl.min}</span>}
        </div>
      </div>
      {me && me.matches > 0 && (
        <p className="mt-3 text-[13px] text-muted">
          {t("games_arena_record", { w: me.wins, l: me.losses, d: me.draws })}
          {me.streak >= 2 && <span className="ml-2 font-semibold text-[#E8742A]">🔥 {me.streak}</span>}
        </p>
      )}
      {me?.is_guest && <p className="mt-3 text-[12.5px] text-soft">{t("games_arena_guest_note")}</p>}
    </section>
  );
}

function JoinCard({ onReady }: { onReady: () => Promise<void> }) {
  const { t, te } = useI18n();
  const { session, profile } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    try {
      setName(localStorage.getItem(GUEST_NAME_KEY) || "");
    } catch {}
  }, []);
  const clean = name.trim().replace(/\s+/g, " ");
  const needsOnboarding = !!session && !!profile && !profile.is_guest && !profile.username;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length < 2 || clean.length > 24) return;
    setBusy(true);
    setErr(null);
    try {
      if (!session || !profile?.is_guest) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      await api.guestStart(clean);
      try {
        localStorage.setItem(GUEST_NAME_KEY, clean);
      } catch {}
      await onReady();
    } catch (x) {
      setErr(te(x));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-[22px] border border-line bg-card p-6">
      <div className="flex items-start gap-4">
        <LeagueEmblem league="bronze" size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[24px] font-extrabold leading-tight">{t("games_arena_sign_in")}</p>
          <p className="mt-1 text-[14px] text-muted">{t("games_arena_desc")}</p>
        </div>
      </div>
      {needsOnboarding ? (
        <Link href="/onboarding?next=/arena" className="btn-zec mt-5 w-full py-3">{t("games_arena_find")}</Link>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href={`/login?next=${encodeURIComponent("/arena")}`} className="btn-ink py-3" data-testid="arena-signin">
            <LogIn className="h-4 w-4" /> {t("games_sign_in")}
          </Link>
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="arena-guest">{t("games_arena_guest_name")}</label>
            <input id="arena-guest" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={t("games_arena_guest_name")} className="input min-w-0 flex-1" autoComplete="nickname" />
            <button disabled={busy || clean.length < 2} className="btn-ghost shrink-0 px-4 py-2.5" data-testid="arena-guest-go">
              {busy ? <Spinner className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
              <span>{t("games_arena_guest_cta")}</span>
            </button>
          </form>
        </div>
      )}
      {err && <p className="mt-3 text-sm font-medium text-[#E8742A]">{err}</p>}
      <p className="mt-3 text-[12.5px] text-soft">{t("games_arena_guest_note")}</p>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  return (
    <section className="rounded-[22px] border border-line bg-card p-5">
      <p className="flex items-center gap-2 font-bold"><Info className="h-4 w-4 text-accent" /> {t("games_arena_how")}</p>
      <ol className="mt-3 space-y-2 text-[14px] text-muted">
        {(["games_arena_how_1", "games_arena_how_2", "games_arena_how_3"] as const).map((k, i) => (
          <li key={k} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-[12px] font-bold text-accent">{i + 1}</span>
            <span>{t(k)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Rankings({ myRank }: { myRank: MyArena | null }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<{ rows: ArenaBoardRow[]; me: { rank: number; value: number } | null } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setData(null);
    setErr(false);
    gamesApi.arenaLeaderboard(period, 10).then((d) => alive && setData(d)).catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [period, myRank?.matches]);
  return (
    <section className="card self-start overflow-hidden" data-testid="arena-rankings">
      <div className="flex items-center gap-2 border-b border-line px-5 pb-0 pt-4">
        <Trophy className="mb-3 h-4 w-4 text-accent" />
        {(["week", "all"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p}
            className={`-mb-px border-b-2 px-2 pb-3 text-[14px] font-bold transition ${period === p ? "border-zec text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {p === "week" ? t("games_arena_weekly") : t("games_arena_alltime")}
          </button>
        ))}
      </div>
      {err ? (
        <p className="p-6 text-center text-sm text-muted">{t("games_board_error")}</p>
      ) : !data ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-input" />)}</div>
      ) : data.rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">{t("games_arena_rank_empty")}</p>
      ) : (
        <ol className="divide-y divide-line">
          {data.rows.map((r) => {
            const mine = profile?.username === r.username;
            return (
              <li key={r.username} className={`flex items-center gap-3 px-5 py-3 ${mine ? "bg-tint" : ""}`}>
                <span className={`w-6 text-center font-display text-[15px] font-bold tabular-nums ${r.rank <= 3 ? "text-accent" : "text-muted"}`}>{r.rank}</span>
                <Avatar name={r.display_name || r.username} size={34} country={r.country} />
                <Link href={`/u/${r.username}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{mine ? t("games_arena_you") : r.display_name || r.username}</Link>
                <LeagueEmblem league={r.league} size={20} />
                <b className="w-14 text-right tabular-nums">{r.value.toLocaleString()}</b>
              </li>
            );
          })}
          {data.me && !data.rows.some((r) => r.rank === data.me!.rank) && (
            <li className="flex items-center gap-3 bg-tint px-5 py-3">
              <span className="w-6 text-center font-display font-bold tabular-nums text-accent">{data.me.rank}</span>
              <span className="flex-1 font-semibold">{t("games_arena_you")}</span>
              <b className="tabular-nums text-accent">{data.me.value.toLocaleString()}</b>
            </li>
          )}
        </ol>
      )}
      <p className="border-t border-line px-5 py-2.5 text-[12px] text-soft">
        {period === "week" ? `${t("games_period_week")} · ${t("games_arena_points")}` : t("games_arena_rating")}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------------
   Matchmaking
   --------------------------------------------------------------------- */
function Searching({ lang, onMatched, onCancel, onError }: { lang: string; onMatched: (id: string) => void; onCancel: () => void; onError: (m: string) => void }) {
  const { t } = useI18n();
  const [waited, setWaited] = useState(0);
  const [botAfter, setBotAfter] = useState(8000);
  const [fallback, setFallback] = useState(false);
  const started = useRef(Date.now());
  const done = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let fails = 0;
    const poll = async () => {
      if (done.current) return;
      try {
        const r = await gamesApi.arenaFind(lang);
        fails = 0;
        if (r.status === "matched") {
          done.current = true;
          onMatched(r.match_id);
          return;
        }
        setBotAfter(r.bot_after_ms);
        setFallback(r.lang !== lang.split("-")[0]);
        started.current = Date.now() - r.waited_ms;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "not_enough_questions") { done.current = true; onError(t("games_err_not_enough_questions")); return; }
        if (++fails > 6) { done.current = true; onError(t("games_err_generic")); return; }
      }
      timer = setTimeout(poll, 1100);
    };
    poll();
    const tk = setInterval(() => setWaited(Date.now() - started.current), 200);
    return () => {
      clearTimeout(timer);
      clearInterval(tk);
    };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = async () => {
    done.current = true;
    try {
      await gamesApi.arenaCancel();
    } catch {}
    onCancel();
  };
  const left = Math.max(0, Math.ceil((botAfter - waited) / 1000));
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" data-testid="arena-searching">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-zec/20 motion-reduce:hidden" style={{ animationDuration: "1.8s" }} />
        <span className="absolute inset-6 animate-ping rounded-full bg-zec/25 motion-reduce:hidden" style={{ animationDuration: "1.8s", animationDelay: ".5s" }} />
        <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-zec text-[#14161B] shadow-[0_10px_40px_-10px_rgba(244,183,40,0.8)]">
          <Swords className="h-12 w-12" />
        </span>
      </div>
      <h1 className="mt-8 font-display text-[28px] font-extrabold">{t("games_arena_searching")}</h1>
      <p className="mt-1 font-display text-[18px] font-bold tabular-nums text-muted">{(waited / 1000).toFixed(0)}s</p>
      <p className="mt-3 inline-flex items-center gap-2 text-[14px] text-muted">
        <Bot className="h-4 w-4" /> {left > 0 ? t("games_arena_bot_soon", { n: left }) : t("games_arena_bot_now")}
      </p>
      {fallback && <p className="mt-2 text-[13px] text-soft">{t("games_arena_lang_fallback")}</p>}
      <button onClick={cancel} className="btn-ghost mt-8 px-6" data-testid="arena-cancel">{t("games_arena_cancel")}</button>
    </div>
  );
}

function Match({ id, onAgain, onLobby }: { id: string; onAgain: () => void; onLobby: () => void }) {
  const { t } = useI18n();
  const { state, error, refresh } = useArenaMatch(id);
  const [picked, setPicked] = useState<{ q: number; c: number } | null>(null);

  const answer = async (c: number) => {
    if (!state || state.status !== "question" || picked?.q === state.current_q) return;
    setPicked({ q: state.current_q, c });
    try {
      await gamesApi.arenaAnswer(id, state.current_q, c);
    } catch {}
    refresh();
  };

  // keyboard: 1–4 / A–D to answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!state?.question || state.status !== "question") return;
      const k = e.key.toLowerCase();
      const i = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
      if (i >= 0 && i < state.question.options.length) answer(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!state) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <Spinner className="h-8 w-8" />
        {error && <p className="text-sm">{t("games_err_connection")}</p>}
        {error === "forbidden" || error === "match_not_found" ? <button onClick={onLobby} className="btn-ghost">{t("games_arena_lobby")}</button> : null}
      </div>
    );
  }
  if (state.status === "ended" && state.result) return <Result s={state} onAgain={onAgain} onLobby={onLobby} />;
  const pickedNow = picked && picked.q === state.current_q ? picked.c : null;
  return (
    <div className="py-2">
      <Duel s={state} onAnswer={answer} picked={pickedNow} />
      {error && <p className="mt-4 text-center text-[13px] text-[#E8742A]"><Zap className="mr-1 inline h-4 w-4" />{t("games_err_connection")}</p>}
    </div>
  );
}
