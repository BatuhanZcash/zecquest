"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Crown, Gift, Home, Loader2, LogIn, LogOut, Timer, Trophy, Users, XCircle } from "lucide-react";
import { ANSWER_SECS } from "@/lib/config";
import { AnswerButton, Avatar, Spinner } from "@/components/ui";
import { BigCountdown, Countdown, OfflineBanner, StreakBadge } from "@/components/game";
import { LogoMark } from "@/components/Logo";
import { formatCode, addRecentRoom } from "@/components/JoinBox";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useGame, useServerNow } from "@/lib/useGame";
import { useWakeLock } from "@/lib/wakeLock";
import type { GameState, MyStatus } from "@/lib/types";

type Phase = "loading" | "notfound" | "signin" | "joining" | "in" | "kicked" | "error";

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { t, te } = useI18n();
  const { ready, session, profile } = useAuth();

  const [preview, setPreview] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [gameId, setGameId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 1) Oyunu kodla bul (giriş gerekmez — başlık/ödül/başlangıç saati gösterilir)
  useEffect(() => {
    api
      .findGame(code)
      .then((g) => {
        if (!g) setPhase("notfound");
        else setPreview(g);
      })
      .catch((e) => {
        setErr(te(e));
        setPhase("error");
      });
  }, [code, te]);

  // 2) Giriş yapmışsa otomatik katıl (yenilemede de aynı oyuncu olarak döner)
  useEffect(() => {
    if (!preview || !ready) return;
    if (preview.status === "ended") {
      router.replace(`/results/${preview.id}`);
      return;
    }
    if (preview.status === "cancelled") {
      setPhase("error");
      setErr(t("cancelled"));
      return;
    }
    if (!session) {
      setPhase("signin");
      return;
    }
    if (!profile?.username) return; // ClientInit onboarding'e yönlendirir
    setPhase("joining");
    api
      .joinGame(code)
      .then((r) => {
        addRecentRoom(code);
        if (r.is_host) router.replace(`/host/${r.game_id}`);
        else {
          setGameId(r.game_id);
          setPhase("in");
        }
      })
      .catch((e: ApiError) => {
        if (e.code === "kicked") setPhase("kicked");
        else if (e.code === "game_not_found") setPhase("notfound");
        else {
          setErr(te(e));
          setPhase("error");
        }
      });
  }, [preview, ready, session, profile?.username, code, router, t, te]);

  if (phase === "in" && gameId) return <Game gameId={gameId} code={code} />;

  return (
    <Screen code={code}>
      {phase === "loading" || phase === "joining" ? (
        <Center>
          <Spinner className="h-10 w-10" />
          <p className="mt-3 text-muted">{t("connecting")}</p>
        </Center>
      ) : phase === "notfound" ? (
        <Center>
          <XCircle className="h-12 w-12 text-[#E8742A]" />
          <p className="mt-3 text-lg font-semibold">{t("room_not_found")}</p>
          <Link href="/join" className="btn-zec mt-6">
            {t("join_a_game")}
          </Link>
        </Center>
      ) : phase === "kicked" ? (
        <Center>
          <LogOut className="h-12 w-12 text-soft" />
          <p className="mt-3 text-lg font-semibold">{t("kicked")}</p>
          <Link href="/" className="btn-ghost mt-6">
            {t("nav_home")}
          </Link>
        </Center>
      ) : phase === "signin" && preview ? (
        <Center>
          <PreviewCard g={preview} />
          <Link href={`/login?next=${encodeURIComponent(`/play/${code}`)}`} className="btn-zec mt-6 w-full max-w-sm text-lg">
            <LogIn className="h-5 w-5" />
            {t("sign_in_to_join")}
          </Link>
        </Center>
      ) : (
        <Center>
          <XCircle className="h-12 w-12 text-[#E8742A]" />
          <p className="mt-3 text-lg font-semibold">{err ?? t("err_generic")}</p>
          <Link href="/" className="btn-ghost mt-6">
            {t("nav_home")}
          </Link>
        </Center>
      )}
    </Screen>
  );
}

function PreviewCard({ g }: { g: GameState }) {
  const { t, lt } = useI18n();
  const now = useServerNow(true, 1000);
  return (
    <div className="card w-full max-w-sm p-6 text-center">
      <p className="label">{g.mode === "scheduled" ? t("nav_events") : t("room_code")}</p>
      <h1 className="mt-1 text-2xl font-bold">{lt(g.title) || lt(g.quiz?.title)}</h1>
      {g.prize && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zec px-3 py-1 text-sm font-bold text-[#1A1506]">
          <Gift className="h-4 w-4" /> {lt(g.prize)}
        </p>
      )}
      {g.mode === "scheduled" && g.status === "lobby" && g.starts_at && g.starts_at > now && (
        <div className="mt-5">
          <p className="mb-2 text-sm text-muted">{t("starts_in")}</p>
          <BigCountdown targetMs={g.starts_at} now={now} />
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   Oyun ekranı (katıldıktan sonra)
   ===================================================================== */
function Game({ gameId, code }: { gameId: string; code: string }) {
  const { t, lt, te, fmt } = useI18n();
  const { state, error } = useGame(gameId);
  const [me, setMe] = useState<MyStatus | null>(null);
  const [localChoice, setLocalChoice] = useState<{ q: number; choice: number } | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const lastPhase = useRef("");

  const loadMe = useCallback(async () => {
    try {
      setMe(await api.myStatus(gameId));
    } catch {}
  }, [gameId]);

  // Faz değiştikçe kendi durumunu (puan, sıra, sonuç) çek.
  // Cevap gösteriminde binlerce oyuncu aynı anda sormasın diye rastgele gecikme.
  useEffect(() => {
    if (!state) return;
    const key = `${state.status}:${state.current_q}`;
    if (key === lastPhase.current) return;
    const first = lastPhase.current === "";
    lastPhase.current = key;
    const delay = first ? 0 : state.status === "reveal" ? Math.random() * 2000 : state.status === "ended" ? 500 + Math.random() * 1500 : 0;
    const id = setTimeout(loadMe, delay);
    return () => clearTimeout(id);
  }, [state, loadMe]);

  useWakeLock(!!state && state.status !== "ended" && state.status !== "cancelled");
  const now = useServerNow(state?.status === "question" || state?.status === "lobby", 200);

  const answeredQ = localChoice?.q ?? me?.answered_q ?? null;
  const myChoice = localChoice && state && localChoice.q === state.current_q ? localChoice.choice : me?.answered_q === state?.current_q ? me?.choice ?? null : null;

  const answer = async (k: number) => {
    if (!state || state.status !== "question" || answeredQ === state.current_q) return;
    const q = state.current_q;
    setLocalChoice({ q, choice: k });
    setSendErr(null);
    navigator.vibrate?.(25);
    try {
      const r = await api.submitAnswer(gameId, q, k);
      if (!r.accepted && r.reason !== "already") setSendErr(r.reason === "late" ? t("times_up") : null);
      if (r.all_answered) api.tick(gameId).catch(() => {});
    } catch (e) {
      setLocalChoice(null);
      setSendErr(te(e));
    }
  };

  if (!state) {
    return (
      <Screen code={code}>
        <Center>
          {error ? <p className="text-muted">{te({ code: error })}</p> : <Spinner className="h-10 w-10" />}
        </Center>
      </Screen>
    );
  }

  if (me?.kicked) {
    return (
      <Screen code={code}>
        <Center>
          <LogOut className="h-12 w-12 text-soft" />
          <p className="mt-3 text-lg font-semibold">{t("kicked")}</p>
        </Center>
      </Screen>
    );
  }

  const title = lt(state.title) || lt(state.quiz?.title);
  const header = me ? { name: me.name ?? "", score: me.score ?? 0 } : undefined;

  return (
    <Screen code={code} me={header}>
      {state.status === "lobby" && (
        <Center>
          <span className="flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </span>
          <h1 className="mt-4 text-3xl font-bold">{t("you_are_in")}</h1>
          <p className="mt-1 text-lg font-semibold text-accent">{me?.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted">{title}</p>
          {state.prize && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zec px-3 py-1 text-sm font-bold text-[#1A1506]">
              <Gift className="h-4 w-4" /> {lt(state.prize)}
            </p>
          )}
          {state.mode === "scheduled" && state.starts_at ? (
            <div className="mt-6">
              <p className="mb-2 text-sm text-muted">{state.starts_at > now ? t("starts_in") : t("get_ready")}</p>
              {state.starts_at > now ? <BigCountdown targetMs={state.starts_at} now={now} /> : <Spinner className="mx-auto h-8 w-8" />}
            </div>
          ) : (
            <p className="mt-6 text-muted">{t("wait_host")}</p>
          )}
          <p className="mt-6 inline-flex max-w-xs items-start gap-2 rounded-[10px] border border-line bg-card px-3 py-2 text-left text-[13px] text-muted">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {t("answer_rule", { n: ANSWER_SECS })}
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-soft">
            <Users className="h-4 w-4" />
            {t("players_n", { n: state.player_count ?? me?.players ?? 0 })}
          </p>
        </Center>
      )}

      {state.status === "question" && state.question &&
        (answeredQ === state.current_q ? (
          <Center>
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="mt-4 text-xl font-bold">{t("answer_sent")}</p>
            {myChoice !== null && <div className="mt-4 w-full max-w-xs opacity-80"><AnswerButton index={myChoice} label={lt(state.question.options[myChoice])} disabled state="picked" /></div>}
            <p className="mt-4 text-sm text-muted">{t("question_of", { n: state.current_q + 1, t: state.question_count })}</p>
            {sendErr && <p className="mt-2 text-sm text-[#E8742A]">{sendErr}</p>}
          </Center>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mb-3 flex items-center gap-3">
              <Countdown remainingMs={(state.phase_ends_at ?? 0) - now} totalSec={state.question.time_limit} size={54} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-soft">{t("question_of", { n: state.current_q + 1, t: state.question_count })}</p>
                <p className="text-[17px] font-semibold leading-snug">{lt(state.question.text)}</p>
              </div>
              <StreakBadge n={me?.streak ?? 0} />
            </div>
            <div className={`grid flex-1 auto-rows-fr gap-3 ${state.question.options.length > 2 ? "sm:grid-cols-2" : ""}`}>
              {state.question.options.map((o, k) => (
                <AnswerButton key={k} index={k} label={lt(o)} onClick={() => answer(k)} size="fill" disabled={(state.phase_ends_at ?? 0) - now < -1500} />
              ))}
            </div>
            {sendErr && <p className="mt-2 text-center text-sm text-[#E8742A]">{sendErr}</p>}
          </div>
        ))}

      {state.status === "reveal" && state.reveal && (
        <RevealScreen state={state} choice={myChoice} me={me} />
      )}

      {state.status === "leaderboard" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="label">{t("your_score")}</p>
          <p className="tabular-nums text-6xl font-bold text-accent">{fmt(me?.score ?? 0)}</p>
          <p className="mt-2 text-xl font-bold">{me?.rank ? t("rank_n", { n: me.rank }) : ""}</p>
          <p className="text-sm text-soft">{me?.players ? t("players_n", { n: me.players }) : ""}</p>
          <MiniBoard rows={state.leaderboard.slice(0, 5)} meName={me?.name} />
        </div>
      )}

      {state.status === "ended" && <EndScreen state={state} me={me} />}

      {state.status === "cancelled" && (
        <Center>
          <XCircle className="h-12 w-12 text-soft" />
          <p className="mt-3 text-lg font-semibold">{t("cancelled")}</p>
          <Link href="/" className="btn-ghost mt-6">
            {t("nav_home")}
          </Link>
        </Center>
      )}
    </Screen>
  );
}

function RevealScreen({ state, choice, me }: { state: GameState; choice: number | null; me: MyStatus | null }) {
  const { t, lt } = useI18n();
  const rv = state.reveal!;
  // Doğru/yanlış anında yerel olarak bilinir; puan ve sıra sunucudan gelir
  const correct = choice !== null && choice === rv.correct;
  const missed = choice === null;
  const res = me?.result && me.result.q_index === rv.q_index ? me.result : null;
  const bg = correct ? "bg-emerald-500" : missed ? "bg-[#3A3A44]" : "bg-[#E8742A]";
  return (
    <div className={`-mx-4 -mb-4 flex flex-1 animate-pop flex-col items-center justify-center p-6 text-center text-white ${bg}`}>
      {correct ? <CheckCircle2 className="h-20 w-20" /> : missed ? <Clock className="h-20 w-20" /> : <XCircle className="h-20 w-20" />}
      <h1 className="mt-4 text-4xl font-bold">{correct ? t("correct_answer") : missed ? t("times_up") : t("wrong_answer")}</h1>
      <div className="mt-3 h-10">
        {res ? (
          res.points > 0 && <p className="rounded-full bg-black/20 px-4 py-1 tabular-nums text-2xl font-bold">{t("plus_points", { n: res.points })}</p>
        ) : (
          correct && <Loader2 className="h-6 w-6 animate-spin opacity-70" />
        )}
      </div>
      {me?.rank && res && <p className="mt-3 text-lg font-semibold opacity-90">{t("rank_n", { n: me.rank })}</p>}
      {!correct && state.question && (
        <p className="mt-4 max-w-sm text-sm opacity-90">✓ {lt(state.question.options[rv.correct])}</p>
      )}
      {rv.explanation && <p className="mt-4 max-w-sm text-sm opacity-90">{lt(rv.explanation)}</p>}
    </div>
  );
}

function MiniBoard({ rows, meName }: { rows: GameState["leaderboard"]; meName?: string }) {
  const { fmt } = useI18n();
  return (
    <ol className="mt-6 w-full max-w-sm space-y-1.5">
      {rows.map((r) => (
        <li key={r.user_id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.name === meName ? "bg-tint ring-1 ring-zec/40" : "bg-card"}`}>
          <span className={`w-5 tabular-nums font-bold ${r.rank <= 3 ? "text-accent" : "text-soft"}`}>{r.rank}</span>
          <Avatar name={r.name} size={26} country={r.country} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
          <span className="tabular-nums text-sm font-bold">{fmt(r.score)}</span>
        </li>
      ))}
    </ol>
  );
}

function EndScreen({ state, me }: { state: GameState; me: MyStatus | null }) {
  const { t, fmt } = useI18n();
  const rank = me?.rank ?? 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {rank === 1 ? <Crown className="h-16 w-16 fill-zec text-accent" /> : <Trophy className="h-14 w-14 text-accent" />}
      <h1 className="mt-3 text-3xl font-bold">{t("game_over")}</h1>
      {rank > 0 && <p className="mt-2 text-xl font-bold">{t("rank_n", { n: rank })}</p>}
      <p className="mt-1 tabular-nums text-5xl font-bold text-accent">{fmt(me?.score ?? 0)}</p>
      <p className="text-sm text-muted">{t("correct_count", { c: me?.correct ?? 0, t: state.question_count })}</p>

      {me?.prize && (
        <div className="mt-6 w-full max-w-sm rounded-xl2 bg-zec p-4 text-[#1A1506]">
          <p className="flex items-center justify-center gap-2 font-bold">
            <Gift className="h-5 w-5" /> {t("you_won_prize", { n: me.prize.place })}
          </p>
          <Link href="/me/prizes" className="mt-3 block rounded-xl bg-[#1A1506] py-2 font-bold text-accent">
            {t("claim_prize")}
          </Link>
        </div>
      )}

      <MiniBoard rows={state.leaderboard.slice(0, 5)} meName={me?.name} />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/results/${state.id}`} className="btn-zec">
          <Trophy className="h-4 w-4" />
          {t("final_results")}
        </Link>
        <Link href="/" className="btn-ghost">
          <Home className="h-4 w-4" />
          {t("nav_home")}
        </Link>
      </div>
    </div>
  );
}

function Screen({ code, me, children }: { code: string; me?: { name: string; score: number }; children: React.ReactNode }) {
  const { fmt } = useI18n();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-app">
      <OfflineBanner />
      <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/" aria-label="Home">
          <LogoMark size={28} />
        </Link>
        <span className="tabular-nums text-sm font-bold text-muted">{formatCode(code)}</span>
        {me && (
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <Avatar name={me.name} size={28} />
            <span className="max-w-[110px] truncate text-sm font-semibold">{me.name}</span>
            <span className="rounded-full bg-zec px-2.5 py-0.5 tabular-nums text-sm font-bold text-[#1A1506]">{fmt(me.score)}</span>
          </div>
        )}
      </header>
      <main className="flex flex-1 flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>;
}
