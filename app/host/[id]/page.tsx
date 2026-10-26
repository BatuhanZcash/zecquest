"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Globe, Maximize, Moon, Play, Radio, SkipForward, Sun, Trophy, Users, X, Zap } from "lucide-react";
import { AnswerButton, Avatar, ANSWER_STYLES, ErrorBox, PageLoader, Shape, Spinner } from "@/components/ui";
import { BigCountdown, Countdown, OfflineBanner } from "@/components/game";
import { Logo } from "@/components/Logo";
import { formatCode } from "@/components/JoinBox";
import { FinalPodium } from "@/components/FinalPodium";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useGame, useServerNow } from "@/lib/useGame";
import { useWakeLock } from "@/lib/wakeLock";
import { siteUrl } from "@/lib/config";
import type { BoardRow, HostView } from "@/lib/types";

export default function HostPage() {
  const { id } = useParams<{ id: string }>();
  const auth = useRequireAuth();
  if (!auth.ok) return <PageLoader />;
  return <HostConsole gameId={id} />;
}

function HostConsole({ gameId }: { gameId: string }) {
  const { t, lt, te, lang, setLang, fmt } = useI18n();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const { state, apply } = useGame(gameId);
  const [hv, setHv] = useState<HostView | null>(null);
  const [hvErr, setHvErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [qr, setQr] = useState("");

  // Host görünümü (oyuncu listesi + cevap sayısı) — sık yoklama
  const loadHv = useCallback(async () => {
    try {
      const v = await api.hostView(gameId);
      setHv(v);
      apply(v);
      setHvErr(null);
    } catch (e) {
      setHvErr(te(e));
    }
  }, [gameId, apply, te]);

  useEffect(() => {
    loadHv();
    const ms = state?.status === "lobby" || state?.status === "question" ? 1500 : 4000;
    const iv = setInterval(() => document.visibilityState === "visible" && loadHv(), ms);
    return () => clearInterval(iv);
  }, [loadHv, state?.status]);

  const code = state?.code ?? hv?.code ?? "";
  const playUrl = code ? `${siteUrl()}/play/${code}` : "";
  useEffect(() => {
    if (!playUrl) return;
    QRCode.toDataURL(playUrl, { margin: 1, width: 360, color: { dark: "#141418", light: "#FFFFFF" } }).then(setQr);
  }, [playUrl]);

  useWakeLock(true);
  const now = useServerNow(state?.status === "question" || state?.status === "lobby", 200);

  const isHosted = state?.mode === "hosted";
  const players = hv?.players ?? [];
  const playerCount = hv?.player_count ?? state?.player_count ?? 0;

  const advance = useCallback(async () => {
    if (busy || !state) return;
    setBusy(true);
    setActionErr(null);
    try {
      apply(await api.advance(gameId));
      loadHv();
    } catch (e) {
      setActionErr(te(e));
    } finally {
      setBusy(false);
    }
  }, [busy, state, gameId, apply, loadHv, te]);

  const endNow = async () => {
    if (!confirm(t("confirm_end"))) return;
    setBusy(true);
    try {
      apply(await api.endNow(gameId));
    } catch (e) {
      setActionErr(te(e));
    } finally {
      setBusy(false);
    }
  };

  const kick = async (uid: string) => {
    try {
      await api.kick(gameId, uid);
      loadHv();
    } catch (e) {
      setActionErr(te(e));
    }
  };

  // Klavye: Boşluk / Enter / → ile ilerle (yalnızca sunucu yönetimli odada)
  useEffect(() => {
    if (!isHosted) return;
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isHosted, advance]);

  if (hvErr && !hv) return <div className="p-6"><ErrorBox message={hvErr} action={<Link href="/" className="btn-ghost">{t("nav_home")}</Link>} /></div>;
  if (!state) return <PageLoader />;

  const q = state.question;
  const isLast = state.current_q + 1 >= state.question_count;
  const actionLabel =
    state.status === "lobby" ? t("start_game")
      : state.status === "question" ? t("show_answer")
      : state.status === "reveal" ? (isLast ? t("final_results") : t("show_leaderboard"))
      : state.status === "leaderboard" ? t("next_question")
      : "";
  const title = lt(state.title) || lt(state.quiz?.title);
  const answered = state.answer_count ?? hv?.answer_count ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <OfflineBanner />
      <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 sm:px-6">
        <button onClick={() => router.back()} aria-label="Exit" className="rounded-lg p-1.5 text-muted hover:text-ink">
          <X className="h-5 w-5" />
        </button>
        <Logo />
        <span className="hidden h-5 w-px bg-line md:inline-block" />
        <span className="hidden truncate text-[14px] text-muted md:inline">{title}</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {state.status !== "lobby" && code && (
            <span className="hidden items-center gap-2 rounded-full bg-input px-3 py-1 tabular-nums text-sm font-bold sm:inline-flex">
              {t("room_code")}: <span className="text-accent">{formatCode(code)}</span>
            </span>
          )}
          {!isHosted && (
            <span className="hidden items-center gap-1.5 rounded-full bg-zec/15 px-3 py-1 text-xs font-bold text-accent sm:inline-flex">
              <Zap className="h-3.5 w-3.5" /> {t("auto_mode")}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-input px-3 py-1 text-sm font-semibold">
            <Users className="h-4 w-4 text-accent" /> {fmt(playerCount)}
          </span>
          <button onClick={() => setLang(lang === "tr" ? "en" : "tr")} className="rounded-lg p-2 text-muted hover:text-ink" aria-label="Language">
            <Globe className="h-5 w-5" />
          </button>
          <button onClick={toggle} className="rounded-lg p-2 text-muted hover:text-ink" aria-label={t("theme")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
            className="hidden rounded-lg p-2 text-muted hover:text-ink sm:block"
            aria-label={t("fullscreen")}
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col p-4 sm:p-8">
        {state.status === "lobby" && (
          <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="card relative flex flex-col items-center justify-center overflow-hidden p-8 text-center">
              <p className="relative text-lg text-muted">{t("join_at")}</p>
              <p className="relative mt-1 break-all tabular-nums text-lg font-bold sm:text-xl">{siteUrl().replace(/^https?:\/\//, "")}/join</p>
              <p className="label relative mt-6">{t("room_code")}</p>
              <p className="relative tabular-nums text-6xl font-bold tracking-wider text-accent sm:text-8xl">{formatCode(code)}</p>
              {qr && <img src={qr} alt="QR" className="relative mt-6 h-44 w-44 rounded-2xl bg-white p-2 sm:h-52 sm:w-52" />}
              <p className="relative mt-4 text-xs text-soft">{t("host_safe")}</p>
            </div>

            <div className="card flex flex-col p-6">
              {!isHosted && state.starts_at && (
                <div className="mb-6 rounded-xl2 bg-input p-5 text-center">
                  <p className="mb-3 text-sm text-muted">{state.starts_at > now ? t("starts_in") : t("get_ready")}</p>
                  {state.starts_at > now ? <BigCountdown targetMs={state.starts_at} now={now} /> : <Spinner className="mx-auto h-8 w-8" />}
                  <p className="mt-3 text-xs text-soft">{t("auto_mode_hint")}</p>
                </div>
              )}
              <div className="mb-5 flex items-center gap-3">
                <h2 className="page-title">{t("host_lobby_title")}</h2>
                <span className="ml-auto tabular-nums text-3xl font-bold text-accent">{fmt(playerCount)}</span>
              </div>
              {players.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
                  <span className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-zec" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                  {t("waiting_players")}
                </div>
              ) : (
                <div className="flex max-h-[50vh] flex-wrap content-start gap-2.5 overflow-y-auto">
                  {players.map((p) => (
                    <button
                      key={p.user_id}
                      onClick={() => confirm(`${t("kick")}: ${p.name}?`) && kick(p.user_id)}
                      title={t("kick")}
                      className="inline-flex animate-pop items-center gap-2 rounded-full border border-line bg-input py-1.5 pl-1.5 pr-4 text-lg font-semibold transition hover:border-[#E8742A] hover:line-through"
                    >
                      <Avatar name={p.name} size={32} country={p.country} />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(state.status === "question" || state.status === "reveal") && q && (
          <div className="flex flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between text-muted">
              <span className="font-semibold">{t("question_of", { n: state.current_q + 1, t: state.question_count })}</span>
              <span className="font-semibold">
                {t("answered_n", { a: fmt(state.status === "reveal" ? state.reveal?.answered ?? 0 : answered), t: fmt(playerCount) })}
              </span>
            </div>
            <div className="card mb-6 flex items-center gap-6 p-6 sm:p-8">
              {state.status === "question" ? (
                <Countdown remainingMs={(state.phase_ends_at ?? 0) - now} totalSec={q.time_limit} size={96} />
              ) : (
                <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-tint">
                  <Trophy className="h-10 w-10 text-accent" />
                </span>
              )}
              <h1 className="flex-1 text-2xl font-bold leading-tight sm:text-4xl">{lt(q.text)}</h1>
            </div>

            {state.status === "reveal" && state.reveal && (
              <div className="mb-5 flex h-32 items-end justify-center gap-6">
                {q.options.map((_, k) => {
                  const counts = state.reveal!.counts;
                  const max = Math.max(1, ...counts);
                  const st = ANSWER_STYLES[k];
                  return (
                    <div key={k} className="flex w-20 flex-col items-center gap-2">
                      <span className="tabular-nums text-2xl font-bold">{fmt(counts[k] ?? 0)}</span>
                      <div className={`w-full rounded-t-xl ${st.cls} ${k === state.reveal!.correct ? "" : "opacity-40"}`} style={{ height: `${Math.max(8, ((counts[k] ?? 0) / max) * 72)}px` }} />
                      <Shape shape={st.shape} className={`h-6 w-6 ${k === state.reveal!.correct ? "text-accent" : "text-soft"}`} />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid flex-1 content-start gap-4 sm:grid-cols-2">
              {q.options.map((o, k) => (
                <AnswerButton
                  key={k}
                  index={k}
                  size={state.status === "question" ? "lg" : "md"}
                  label={lt(o)}
                  disabled
                  state={state.status === "reveal" ? (k === state.reveal?.correct ? "correct" : "dim") : "idle"}
                />
              ))}
            </div>
            {state.status === "reveal" && state.reveal?.explanation && (
              <p className="mt-6 animate-rise rounded-xl bg-tint p-4 text-center text-lg">{lt(state.reveal.explanation)}</p>
            )}
          </div>
        )}

        {state.status === "leaderboard" && <BoardView rows={state.leaderboard} />}
        {state.status === "ended" && <FinalPodium rows={state.leaderboard} />}
        {state.status === "cancelled" && <ErrorBox message={t("cancelled")} />}
      </main>

      {state.status !== "ended" && state.status !== "cancelled" ? (
        <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-card/90 px-4 py-3 backdrop-blur sm:px-8">
          {actionErr && <span className="text-sm font-medium text-[#E8742A]">{actionErr}</span>}
          {isHosted && <span className="hidden text-sm text-soft sm:inline">␣ / Enter</span>}
          <button onClick={endNow} disabled={busy} className="btn-ghost ml-auto py-2.5 text-sm">
            {t("end_game")}
          </button>
          {isHosted ? (
            <button onClick={advance} disabled={busy || (state.status === "lobby" && playerCount === 0)} className="btn-zec min-w-[200px] text-lg">
              {busy ? <Spinner className="h-5 w-5 text-[#1A1506]" /> : state.status === "lobby" ? <Play className="h-5 w-5 fill-current" /> : <SkipForward className="h-5 w-5" />}
              {actionLabel}
            </button>
          ) : (
            state.status === "lobby" && (
              <button onClick={advance} disabled={busy || playerCount === 0} className="btn-ink">
                <Radio className="h-4 w-4" />
                {t("start_now")}
              </button>
            )
          )}
        </footer>
      ) : (
        <footer className="flex flex-wrap justify-center gap-3 border-t border-line bg-card px-4 py-4">
          <Link href={`/results/${state.id}`} className="btn-zec">
            <Trophy className="h-4 w-4" />
            {t("final_results")}
          </Link>
          {state.quiz && (
            <Link href={`/quiz/${state.quiz.slug}`} className="btn-ghost">
              {t("new_game")}
            </Link>
          )}
        </footer>
      )}
    </div>
  );
}

function BoardView({ rows }: { rows: BoardRow[] }) {
  const { t, fmt } = useI18n();
  const max = Math.max(1, rows[0]?.score ?? 1);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-center text-4xl font-bold">{t("scoreboard")}</h1>
      <ol className="space-y-3">
        {rows.slice(0, 8).map((p, i) => (
          <li key={p.user_id} className="card relative flex animate-rise items-center gap-4 overflow-hidden p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="absolute inset-y-0 left-0 bg-zec/10" style={{ width: `${(p.score / max) * 100}%` }} />
            <span className={`relative w-8 text-center tabular-nums text-2xl font-bold ${p.rank <= 3 ? "text-accent" : "text-soft"}`}>{p.rank}</span>
            <Avatar name={p.name} size={44} country={p.country} className="relative" />
            <div className="relative min-w-0 flex-1">
              <p className="truncate text-xl font-bold">{p.name}</p>
              {p.team && <p className="truncate text-sm text-muted">{p.team}</p>}
            </div>
            <span className="relative tabular-nums text-2xl font-bold">{fmt(p.score)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
