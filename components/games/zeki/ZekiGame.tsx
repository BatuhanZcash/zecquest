"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronUp, Coins, Heart, KeyRound, LogIn, Pause, Play, RotateCcw, Shield, Star, Timer, Volume2, VolumeX, X } from "lucide-react";
import { Sim, STEP_MS, starsOf, SCORE, type Input, type SimEvent } from "./sim";
import { LEVELS } from "./levels";
import { Renderer } from "./render";
import { InputHub } from "./input";
import { Sfx } from "./audio";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { fmtTime, gamesApi, saveLocalRun, type SubmitResult } from "@/lib/api-games";

/* One synth for the whole session so the sound setting survives level changes */
let SFX: Sfx | null = null;
const sfx = () => (SFX ??= new Sfx());
const SOUND_KEY = "zq-sound";

type Phase = "intro" | "play" | "paused" | "won" | "dead";
interface Toast { id: number; title?: string; text: string; kind: "fact" | "good" | "bad" | "info" }
export interface RunResult {
  level: number;
  won: boolean;
  score: number;
  timeMs: number;
  coins: number;
  totalCoins: number;
  stomps: number;
  crystals: number;
  timeBonus: number;
  noHitBonus: number;
  stars: { finish: boolean; coins: boolean; noHit: boolean };
}

declare global {
  interface Window {
    __zeki?: {
      sim: () => Sim | null;
      phase: () => Phase;
      start: () => void;
      setReplay: (track: string | null) => void;
      stats: () => { frames: number; avg: number; p95: number; max: number; steps: number };
      resetStats: () => void;
    };
  }
}

export function ZekiGame({ level, onExit, onNext }: { level: number; onExit: () => void; onNext: (level: number) => void }) {
  const { t } = useI18n();
  const { session, profile } = useAuth();
  const def = LEVELS[level - 1];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const phaseRef = useRef<Phase>("intro");
  const [phase, setPhaseState] = useState<Phase>("intro");
  const [hud, setHud] = useState({ score: 0, coins: 0, lives: 3, shield: 0, time: 0, keys: [] as boolean[] });
  const [toast, setToast] = useState<Toast | null>(null);
  const [sound, setSound] = useState(false);
  const [touch, setTouch] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "local" | "failed"; res?: SubmitResult; newBest?: boolean }>({ state: "idle" });
  const [portrait, setPortrait] = useState(false);
  const inputRef = useRef<InputHub | null>(null);
  const replayRef = useRef<{ track: string; i: number } | null>(null);
  const statsRef = useRef<{ dts: number[]; steps: number }>({ dts: [], steps: 0 });
  const toastSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const tRef = useRef(t);
  tRef.current = t;
  const restartRef = useRef<() => void>(() => {});
  // Server-issued run token (0012): requested when a run starts, sent with the score at the end.
  const runRef = useRef<Promise<string | null> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const beginRun = useCallback(() => {
    runRef.current = sessionRef.current
      ? gamesApi.startRun(level).then((r) => r.run_id).catch(() => null)
      : null;
  }, [level]);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const showToast = useCallback((x: Omit<Toast, "id">, ms = 3200) => {
    const id = ++toastSeq.current;
    setToast({ ...x, id });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), ms);
  }, []);

  /* ---------- sound preference ---------- */
  useEffect(() => {
    try {
      setSound(localStorage.getItem(SOUND_KEY) === "1");
    } catch {}
  }, []);
  const toggleSound = useCallback(() => {
    setSound((on) => {
      const next = !on;
      sfx().setEnabled(next);
      if (next && phaseRef.current === "play") sfx().startMusic(def.theme);
      if (next) sfx().ui();
      try {
        localStorage.setItem(SOUND_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, [def.theme]);

  /* ---------- events from the simulation → UI ---------- */
  const handleEvents = useCallback(
    (events: SimEvent[]) => {
      const tt = tRef.current;
      for (const e of events) {
        switch (e.type) {
          case "shield": showToast({ text: tt("games_t_shield"), kind: "info" }, 3600); break;
          case "shieldEnd": showToast({ text: tt("games_t_shield_end"), kind: "info" }, 2000); break;
          case "checkpoint": showToast({ text: tt("games_t_checkpoint"), kind: "good" }, 1800); break;
          case "caught": showToast({ text: tt("games_t_caught"), kind: "bad" }, 2400); break;
          case "hurt": showToast({ text: tt("games_t_hurt"), kind: "bad" }, 2400); break;
          case "fall": showToast({ text: tt("games_t_fall"), kind: "bad" }, 2000); break;
          case "phish": showToast({ text: tt("games_t_phish"), kind: "bad" }, 5200); break;
          case "key": showToast({ text: tt("games_t_key", { n: e.n + 1 }), kind: "good" }, 3600); break;
          case "door": showToast({ text: tt("games_t_door", { n: e.n + 1 }), kind: "good" }, 4200); break;
          case "doorLocked": showToast({ text: tt("games_t_locked", { n: e.n + 1 }), kind: "info" }, 2400); break;
          case "crystal": showToast({ title: tt("games_t_fact"), text: tt(e.fact as DictKey), kind: "fact" }, 6500); break;
          default: break;
        }
      }
    },
    [showToast],
  );

  /* ---------- run finished ---------- */
  const finishRun = useCallback(
    (sim: Sim) => {
      const s = sim.s;
      const won = s.status === "won";
      const stars = starsOf(sim);
      const r: RunResult = {
        level, won, score: s.score, timeMs: sim.timeMs, coins: s.coins, totalCoins: sim.st.totals.coins,
        stomps: s.stomps, crystals: s.crystals, timeBonus: s.timeBonus, noHitBonus: s.noHitBonus, stars,
      };
      setResult(r);
      sfx().stopMusic();
      if (!won) {
        setPhase("dead");
        return;
      }
      setPhase("won");
      const bits = (stars.finish ? 1 : 0) | (stars.coins ? 2 : 0) | (stars.noHit ? 4 : 0);
      const { prev } = saveLocalRun(level, { score: r.score, timeMs: r.timeMs, coins: r.coins, stars: bits });
      const newBestLocal = !prev || r.score > prev.best_score;
      if (!session) {
        setSave({ state: "local", newBest: newBestLocal });
        return;
      }
      setSave({ state: "saving", newBest: newBestLocal });
      const run = runRef.current ?? Promise.resolve(null);
      runRef.current = null;
      run
        .then((runId) => {
          if (!runId) throw new Error("run_token_required");
          return gamesApi.submitScore({ level, score: r.score, timeMs: r.timeMs, coins: r.coins, noHit: stars.noHit, runId });
        })
        .then((res) => setSave({ state: "saved", res, newBest: res.new_best || newBestLocal }))
        .catch(() => setSave({ state: "failed", newBest: newBestLocal }));
    },
    [level, session, setPhase],
  );

  /* ---------- engine lifecycle ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sim = new Sim(def);
    simRef.current = sim;
    const renderer = new Renderer(ctx, sim, { gate: tRef.current("games_gate_label"), fake: tRef.current("games_fake_label") }, reduced);
    const input = new InputHub(window);
    inputRef.current = input;
    const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    setTouch(isTouch);
    phaseRef.current = "intro";
    setPhase("intro");
    setResult(null);
    setSave({ state: "idle" });

    const fit = () => {
      const r = wrap.getBoundingClientRect();
      let dpr = Math.min(2, window.devicePixelRatio || 1);
      // keep the backing store reasonable on large/high-dpi screens
      while (dpr > 1 && r.width * r.height * dpr * dpr > 3_000_000) dpr -= 0.25;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      renderer.resize(r.width, r.height, dpr, isTouch ? 132 : 0);
      setPortrait(isTouch && r.height > r.width * 1.15);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const start = () => {
      if (phaseRef.current !== "intro") return;
      beginRun();
      setPhase("play");
      if (sfx().enabled) sfx().startMusic(def.theme);
    };
    input.onAction = () => {
      if (phaseRef.current === "intro") start();
    };
    input.onPause = () => {
      if (phaseRef.current === "play") { setPhase("paused"); sfx().stopMusic(); }
      else if (phaseRef.current === "paused") { setPhase("play"); if (sfx().enabled) sfx().startMusic(def.theme); }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && phaseRef.current === "play") { setPhase("paused"); sfx().stopMusic(); }
    };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0, last = 0, acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? Math.min(250, now - last) : STEP_MS;
      last = now;
      const st = statsRef.current;
      if (st.dts.length >= 1200) st.dts.shift();
      st.dts.push(dt);
      const live = input.read();
      if (phaseRef.current === "play") {
        acc += dt;
        let n = 0;
        while (acc >= STEP_MS && n < 8) {
          let inp: Input = live;
          const rp = replayRef.current;
          if (rp) {
            const c = rp.track.charCodeAt(rp.i++) - 97;
            inp = Number.isNaN(c) ? { left: false, right: false, jump: false } : { left: c >> 1 === 0, right: c >> 1 === 2, jump: (c & 1) === 1 };
          }
          sim.step(inp);
          st.steps++;
          acc -= STEP_MS;
          n++;
          if (sim.events.length) {
            renderer.onEvents(sim.events);
            sfx().play(sim.events);
            handleEvents(sim.events);
            sim.events = [];
          }
          if (sim.s.status !== "play") {
            // keep drawing a moment for the finish/caught effects, then show the card
            const done = sim;
            setTimeout(() => simRef.current === done && finishRun(done), done.s.status === "won" ? 650 : 900);
            setPhase(done.s.status === "won" ? "won" : "dead");
            acc = 0;
            break;
          }
        }
        if (n === 8) acc = 0;
      } else {
        acc = 0;
      }
      renderer.draw(phaseRef.current === "play" ? acc / STEP_MS : 1, dt);
    };
    raf = requestAnimationFrame(loop);

    const hudTimer = setInterval(() => {
      const s = sim.s;
      setHud((h) => {
        const next = {
          score: s.score,
          coins: s.coins,
          lives: s.lives,
          shield: Math.ceil(s.player.shield / 60),
          time: Math.floor((s.frame / 60) * 10) / 10,
          keys: s.keys.map((k) => k.got),
        };
        return h.score === next.score && h.coins === next.coins && h.lives === next.lives && h.shield === next.shield && h.time === next.time &&
          h.keys.join() === next.keys.join() ? h : next;
      });
    }, 100);

    window.__zeki = {
      sim: () => simRef.current,
      phase: () => phaseRef.current,
      start,
      setReplay: (track) => {
        replayRef.current = track ? { track, i: 0 } : null;
      },
      stats: () => {
        const d = [...statsRef.current.dts].sort((a, b) => a - b);
        const avg = d.reduce((a, b) => a + b, 0) / Math.max(1, d.length);
        return { frames: d.length, avg, p95: d[Math.floor(d.length * 0.95)] ?? 0, max: d[d.length - 1] ?? 0, steps: statsRef.current.steps };
      },
      resetStats: () => {
        statsRef.current = { dts: [], steps: 0 };
      },
    };

    // restart hook used by the pause/result menus
    restartRef.current = () => {
      sim = new Sim(def);
      simRef.current = sim;
      renderer.setSim(sim);
      replayRef.current = null;
      acc = 0;
      setResult(null);
      setSave({ state: "idle" });
      setToast(null);
      beginRun();
      setPhase("play");
      if (sfx().enabled) sfx().startMusic(def.theme);
    };

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hudTimer);
      ro.disconnect();
      input.dispose();
      document.removeEventListener("visibilitychange", onVis);
      sfx().stopMusic();
      delete window.__zeki;
    };
  }, [def, handleEvents, finishRun, setPhase, beginRun]);

  // lock page scroll while the game is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const startGame = () => {
    if (sound) sfx().setEnabled(true);
    window.__zeki?.start();
  };
  const resume = () => {
    setPhase("play");
    if (sfx().enabled) sfx().startMusic(def.theme);
  };

  const totalKeys = hud.keys.length;
  const levelName = t(`games_l${level}_name` as DictKey);
  const hasNext = level < LEVELS.length;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0B0D12] text-[#ECEEF2]" role="application" aria-label={`${t("games_zeki_title")} · ${levelName}`}>
      <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none select-none overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full" data-testid="zeki-canvas" />

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <HudPill>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A7B3]">{t("games_score")}</span>
              <b className="tabular-nums text-[#F4B728]" data-testid="hud-score">{hud.score.toLocaleString()}</b>
            </HudPill>
            <HudPill>
              <Coins className="h-4 w-4 text-[#F4B728]" aria-hidden />
              <b className="tabular-nums">{hud.coins}</b>
            </HudPill>
            <HudPill className="hidden sm:flex">
              <Timer className="h-4 w-4 text-[#A1A7B3]" aria-hidden />
              <b className="tabular-nums">{hud.time.toFixed(1)}</b>
            </HudPill>
            {totalKeys > 0 && (
              <HudPill aria-label={t("games_keys")}>
                <KeyRound className="h-4 w-4 text-[#A1A7B3]" aria-hidden />
                {hud.keys.map((g, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${g ? "" : "opacity-25"}`} style={{ background: ["#F4B728", "#5CE1C6", "#B48CFF"][i % 3] }} />
                ))}
              </HudPill>
            )}
            {hud.shield > 0 && (
              <HudPill className="!border-[#7FD3FF]/50 !bg-[#0E2A3A]/85">
                <Shield className="h-4 w-4 text-[#7FD3FF]" aria-hidden />
                <b className="tabular-nums text-[#7FD3FF]">{t("games_shielded")} {hud.shield}s</b>
              </HudPill>
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <HudPill aria-label={t("games_lives")}>
              {[0, 1, 2].map((i) => (
                <Heart key={i} className={`h-4 w-4 ${i < hud.lives ? "fill-[#FF5A5F] text-[#FF5A5F]" : "text-[#5B6170]"}`} aria-hidden />
              ))}
            </HudPill>
            <button onClick={toggleSound} className="hud-btn" aria-label={sound ? t("games_sound_off") : t("games_sound_on")} aria-pressed={sound}>
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => (phase === "play" ? (setPhase("paused"), sfx().stopMusic()) : phase === "paused" ? resume() : null)}
              className="hud-btn"
              aria-label={t("games_pause")}
              data-testid="pause-btn"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && phase === "play" && (
          <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-3 sm:top-16" aria-live="polite">
            <div
              key={toast.id}
              className={`max-w-[560px] animate-rise rounded-2xl border px-4 py-3 text-[14px] leading-snug shadow-2xl backdrop-blur-md sm:text-[15px] ${
                toast.kind === "fact" ? "border-[#4EA8DE]/60 bg-[#0D1B28]/90" : toast.kind === "bad" ? "border-[#FF5A5F]/50 bg-[#2A1215]/90" : toast.kind === "good" ? "border-[#F4B728]/50 bg-[#221A08]/90" : "border-[#7FD3FF]/40 bg-[#0E1C26]/90"
              }`}
            >
              {toast.title && <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#7FD3FF]">{toast.title}</p>}
              {toast.text}
            </div>
          </div>
        )}

        {/* Touch controls */}
        {touch && (phase === "play" || phase === "intro") && <TouchPad hub={inputRef} t={t} />}

        {/* Intro */}
        {phase === "intro" && (
          <Overlay>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4B728]">{t("games_level_n", { n: level })}</p>
            <h2 className="mt-1 font-display text-[34px] font-extrabold leading-none tracking-[-0.02em]">{levelName}</h2>
            <div className="mt-5 rounded-2xl border border-[#F4B728]/30 bg-[#F4B728]/[0.07] p-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#F4B728]">{t("games_new_mechanic")}</p>
              <p className="mt-1 text-[15px] leading-snug">{t(`games_l${level}_mech` as DictKey)}</p>
              <p className="mt-2 text-[13px] text-[#A1A7B3]">
                {t("games_teaches")}: <span className="text-[#ECEEF2]">{t(`games_l${level}_lesson` as DictKey)}</span>
              </p>
            </div>
            <ul className="mt-4 space-y-1 text-left text-[13px] text-[#A1A7B3]">
              {!touch && <li>{t("games_controls_keys")}</li>}
              {touch && <li>{t("games_controls_touch")}</li>}
              <li>{t("games_tip_hold")}</li>
            </ul>
            {portrait && def.theme !== "tower" && <p className="mt-3 text-[13px] text-[#7FD3FF]">{t("games_rotate_hint")}</p>}
            <button autoFocus onClick={startGame} className="btn-zec mt-6 w-full py-3.5 text-[17px]" data-testid="zeki-start">
              <Play className="h-5 w-5 fill-current" /> {t("games_start")}
            </button>
            <p className="mt-2 text-[12px] text-[#6E7482]">{t("games_press_start")}</p>
            <button onClick={onExit} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#A1A7B3] hover:text-white">
              <X className="h-4 w-4" /> {t("games_quit")}
            </button>
          </Overlay>
        )}

        {/* Pause */}
        {phase === "paused" && (
          <Overlay>
            <h2 className="font-display text-[30px] font-extrabold">{t("games_paused")}</h2>
            <p className="mt-1 text-[14px] text-[#A1A7B3]">{t("games_level_n", { n: level })} · {levelName}</p>
            <div className="mt-6 grid gap-2.5">
              <button autoFocus onClick={resume} className="btn-zec w-full py-3 text-[16px]" data-testid="zeki-resume">
                <Play className="h-5 w-5 fill-current" /> {t("games_resume")}
              </button>
              <button onClick={() => restartRef.current()} className="btn w-full border border-[#2B3039] bg-[#171A20] py-3 text-[15px] text-white hover:border-[#3A3F4B]">
                <RotateCcw className="h-4 w-4" /> {t("games_restart")}
              </button>
              <button onClick={toggleSound} className="btn w-full border border-[#2B3039] bg-[#171A20] py-3 text-[15px] text-white hover:border-[#3A3F4B]" aria-pressed={sound}>
                {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {sound ? t("games_sound_off") : t("games_sound_on")}
              </button>
              <button onClick={onExit} className="btn w-full py-3 text-[15px] text-[#A1A7B3] hover:text-white">
                <X className="h-4 w-4" /> {t("games_quit")}
              </button>
            </div>
            <div className="mt-5 space-y-1 border-t border-[#282D36] pt-4 text-left text-[12.5px] text-[#A1A7B3]">
              <p className="font-semibold text-[#ECEEF2]">{t("games_controls")}</p>
              <p>{t("games_controls_keys")}</p>
              <p>{t("games_controls_pad")}</p>
              <p>{t("games_controls_touch")}</p>
            </div>
          </Overlay>
        )}

        {/* Results */}
        {result && (phase === "won" || phase === "dead") && (
          <Overlay wide>
            {result.won ? (
              <WinCard result={result} save={save} levelName={levelName} hasNext={hasNext} signedIn={!!session && !profile?.is_guest}
                onNext={() => onNext(level + 1)} onRetry={() => restartRef.current()} onExit={onExit} />
            ) : (
              <>
                <h2 className="font-display text-[32px] font-extrabold">{t("games_dead_title")}</h2>
                <p className="mt-2 text-[15px] text-[#A1A7B3]">{t("games_dead_sub")}</p>
                <p className="mt-4 text-[14px]">
                  {t("games_score")}: <b className="text-[#F4B728]">{result.score.toLocaleString()}</b> · <Coins className="inline h-4 w-4 text-[#F4B728]" /> {result.coins}/{result.totalCoins}
                </p>
                <div className="mt-6 grid gap-2.5">
                  <button autoFocus onClick={() => restartRef.current()} className="btn-zec w-full py-3 text-[16px]" data-testid="zeki-retry">
                    <RotateCcw className="h-5 w-5" /> {t("games_retry")}
                  </button>
                  <button onClick={onExit} className="btn w-full py-3 text-[15px] text-[#A1A7B3] hover:text-white">{t("games_quit")}</button>
                </div>
              </>
            )}
          </Overlay>
        )}
      </div>
      <style jsx global>{`
        .hud-btn {
          display: inline-flex;
          height: 34px;
          width: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #2b3039;
          background: rgba(15, 17, 21, 0.78);
          color: #eceef2;
          backdrop-filter: blur(6px);
        }
        .hud-btn:hover {
          border-color: #4a505c;
        }
      `}</style>
    </div>
  );
}

function HudPill({ children, className = "", ...rest }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`flex h-[34px] items-center gap-2 rounded-full border border-[#2B3039] bg-[#0F1115]/80 px-3 text-[14px] font-bold backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

function Overlay({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-[#08090C]/75 p-4 backdrop-blur-[3px]">
      <div className={`w-full ${wide ? "max-w-[460px]" : "max-w-[400px]"} animate-pop rounded-[26px] border border-[#282D36] bg-[#14171D]/95 p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:p-7`}>
        {children}
      </div>
    </div>
  );
}

function TouchPad({ hub, t }: { hub: React.MutableRefObject<InputHub | null>; t: (k: DictKey) => string }) {
  const bind = (key: "left" | "right" | "jump") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (hub.current) hub.current.touch[key] = true;
      if (key === "jump") hub.current?.onAction?.();
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      if (hub.current) hub.current.touch[key] = false;
    },
    onPointerCancel: () => {
      if (hub.current) hub.current.touch[key] = false;
    },
    onLostPointerCapture: () => {
      if (hub.current) hub.current.touch[key] = false;
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const btn = "flex items-center justify-center rounded-full border-2 border-[#3A3F4B] bg-[#171A20]/75 text-white backdrop-blur active:scale-95 active:bg-[#232833]";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-[max(16px,env(safe-area-inset-bottom))]" data-testid="touchpad">
      <div className="pointer-events-auto flex gap-3">
        <button aria-label={t("games_left")} className={`${btn} h-[72px] w-[72px]`} {...bind("left")}>
          <ArrowLeft className="h-8 w-8" />
        </button>
        <button aria-label={t("games_right")} className={`${btn} h-[72px] w-[72px]`} {...bind("right")}>
          <ArrowRight className="h-8 w-8" />
        </button>
      </div>
      <button aria-label={t("games_jump")} className="pointer-events-auto flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 border-[#F4B728] bg-[#F4B728]/90 text-[#14161B] active:scale-95" {...bind("jump")}>
        <ChevronUp className="h-11 w-11" strokeWidth={3} />
      </button>
    </div>
  );
}

function WinCard({
  result, save, levelName, hasNext, signedIn, onNext, onRetry, onExit,
}: {
  result: RunResult;
  save: { state: string; res?: SubmitResult; newBest?: boolean };
  levelName: string;
  hasNext: boolean;
  signedIn: boolean;
  onNext: () => void;
  onRetry: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const stars = [
    { on: result.stars.finish, label: t("games_star_finish") },
    { on: result.stars.coins, label: t("games_star_coins") },
    { on: result.stars.noHit, label: t("games_star_nohit") },
  ];
  const rows: [string, string | number][] = [
    [t("games_bd_finish"), SCORE.finish],
    [`${t("games_bd_coins")} · ${result.coins}/${result.totalCoins}`, result.coins * SCORE.coin],
    [`${t("games_bd_stomps")} · ${result.stomps}`, result.stomps * SCORE.stomp],
    [`${t("games_bd_crystals")} · ${result.crystals}`, result.crystals * SCORE.crystal],
    [t("games_bd_time"), result.timeBonus],
    [t("games_bd_nohit"), result.noHitBonus],
  ];
  return (
    <div data-testid="zeki-win">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4B728]">{levelName}</p>
      <h2 className="mt-1 font-display text-[28px] font-extrabold leading-tight">{t("games_won_title")}</h2>
      <div className="mt-5 flex justify-center gap-3">
        {stars.map((s, i) => (
          <div key={i} className="flex w-[86px] flex-col items-center gap-1.5" style={{ animation: `pop .35s ${0.15 + i * 0.18}s ease-out both` }}>
            <Star className={`h-11 w-11 ${s.on ? "fill-[#F4B728] text-[#F4B728] drop-shadow-[0_0_12px_rgba(244,183,40,0.5)]" : "text-[#3A3F4B]"}`} strokeWidth={1.6} />
            <span className={`text-[11.5px] font-semibold ${s.on ? "text-[#ECEEF2]" : "text-[#6E7482]"}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-end justify-center gap-6">
        <div>
          <p className="text-[12px] text-[#A1A7B3]">{t("games_score")}</p>
          <p className="font-display text-[34px] font-extrabold tabular-nums leading-none text-[#F4B728]">{result.score.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[12px] text-[#A1A7B3]">{t("games_time")}</p>
          <p className="font-display text-[34px] font-extrabold tabular-nums leading-none">{fmtTime(result.timeMs)}</p>
        </div>
      </div>
      <div className="mt-3 flex min-h-[26px] flex-wrap items-center justify-center gap-2 text-[12.5px] font-semibold">
        {save.newBest && <span className="rounded-full bg-[#F4B728] px-2.5 py-0.5 text-[#14161B]">{t("games_new_best")}</span>}
        {save.res?.rank && <span className="rounded-full bg-[#232833] px-2.5 py-0.5">{t("games_rank_n", { n: save.res.rank })}</span>}
        {!!save.res?.xp_awarded && <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-400">{t("games_xp_plus", { n: save.res.xp_awarded })}</span>}
        {save.state === "saving" && <span className="text-[#A1A7B3]">{t("games_saving")}</span>}
        {save.state === "failed" && <span className="text-[#E8742A]">{t("games_save_failed")}</span>}
      </div>
      <details className="mt-3 rounded-xl bg-[#0F1115] px-4 py-2.5 text-left text-[13px]">
        <summary className="cursor-pointer select-none font-semibold text-[#A1A7B3]">{t("games_total")}</summary>
        <dl className="mt-2 space-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-[#A1A7B3]">{k}</dt>
              <dd className="tabular-nums">+{Number(v).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </details>
      {!signedIn && (
        <p className="mt-3 text-[13px] text-[#A1A7B3]">
          {t("games_saved_local")}{" "}
          <Link href={`/login?next=${encodeURIComponent("/games/zeki")}`} className="inline-flex items-center gap-1 font-semibold text-[#F4B728] hover:underline">
            <LogIn className="h-3.5 w-3.5" /> {t("games_sign_in")}
          </Link>
        </p>
      )}
      {!hasNext && <p className="mt-3 text-[13px] text-[#A1A7B3]">{t("games_all_done")}</p>}
      <div className="mt-5 grid gap-2.5">
        {hasNext && (
          <button autoFocus onClick={onNext} className="btn-zec w-full py-3 text-[16px]" data-testid="zeki-next">
            {t("games_next_level")} <ArrowRight className="h-5 w-5" />
          </button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button autoFocus={!hasNext} onClick={onRetry} className="btn border border-[#2B3039] bg-[#171A20] py-3 text-white hover:border-[#3A3F4B]">
            <RotateCcw className="h-4 w-4" /> {t("games_retry")}
          </button>
          <button onClick={onExit} className="btn border border-[#2B3039] bg-[#171A20] py-3 text-white hover:border-[#3A3F4B]" data-testid="zeki-exit">
            {t("games_quit")}
          </button>
        </div>
      </div>
    </div>
  );
}
