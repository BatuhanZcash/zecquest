"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isConfigured } from "./supabase";
import { api } from "./api";
import { noteServerNow, serverNow, syncClock } from "./clock";
import type { GameState } from "./types";

/**
 * Bir oyunun canlı durumunu izler.
 *  1) İlk durum get_game_state ile alınır (yenilemeden sonra da buradan devam eder)
 *  2) Supabase Realtime "game:<id>" kanalından her değişiklik anında gelir
 *  3) Realtime koparsa / hiç bağlanamazsa düzenli yoklamayla güncellenir
 *  4) Süre dolduğunda tick_game çağrılır (sunucu zaten pg_cron ile ilerletiyorsa
 *     bu çağrı hiçbir şey yapmaz — tekrarlı çağrı güvenlidir)
 */
export function useGame(gameId: string | null, opts: { pollMs?: number } = {}) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const stateRef = useRef<GameState | null>(null);

  const apply = useCallback((next: GameState | null) => {
    if (!next) return;
    const cur = stateRef.current;
    // Eski sürümleri yok say (yoklama ile realtime yarışırsa)
    if (cur && next.version < cur.version) return;
    const merged: GameState = {
      ...next,
      player_count: next.player_count ?? cur?.player_count,
      // Realtime yayını sayaç taşımaz; aynı sorudaysak son bilinen değeri koru
      answer_count:
        next.answer_count ??
        (next.status === "question" && cur?.status === "question" && cur.current_q === next.current_q
          ? cur.answer_count
          : 0),
    };
    stateRef.current = merged;
    setState(merged);
  }, []);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    try {
      const s = await api.gameState(gameId);
      if (!s) {
        setError("game_not_found");
        return;
      }
      noteServerNow(s.server_now);
      apply(s);
      setError(null);
    } catch (e: any) {
      setError(e?.code ?? "network");
    }
  }, [gameId, apply]);

  // İlk yükleme + saat senkronu
  useEffect(() => {
    if (!gameId) return;
    stateRef.current = null;
    setState(null);
    syncClock().finally(refresh);
  }, [gameId, refresh]);

  // Realtime
  useEffect(() => {
    if (!gameId || !isConfigured) return;
    const ch = supabase
      .channel(`game:${gameId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "state" }, ({ payload }) => apply(payload as GameState))
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        // Yeniden bağlanınca kaçırılmış olabilecek değişiklikleri al
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId, apply, refresh]);

  // Yoklama: realtime bağlıyken seyrek, değilken sık
  useEffect(() => {
    if (!gameId) return;
    const ms = opts.pollMs ?? (live ? 15000 : 3000);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, ms);
    const onVis = () => document.visibilityState === "visible" && refresh();
    const onOnline = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [gameId, live, refresh, opts.pollMs]);

  // Süre dolumu → tick (rastgele gecikmeyle: binlerce istemci aynı anda çağırmasın)
  useEffect(() => {
    if (!gameId || !state) return;
    const due =
      state.status === "lobby" && state.mode === "scheduled" ? state.starts_at : state.phase_ends_at;
    if (!due || state.status === "ended" || state.status === "cancelled") return;
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    const schedule = () => {
      const wait = Math.max(0, due - serverNow()) + 300 + Math.random() * 1200 + tries * 1500;
      timer = setTimeout(async () => {
        if (stateRef.current?.version !== state.version) return;
        try {
          apply(await api.tick(gameId));
        } catch {}
        tries++;
        if (stateRef.current?.version === state.version && tries < 20) schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [gameId, state?.version, state?.status, state?.phase_ends_at, state?.starts_at, apply]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, error, live, refresh, apply };
}

/** Saniyede birkaç kez yeniden çizim için sunucu saatine göre "şimdi" */
export function useServerNow(active = true, ms = 200) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}
