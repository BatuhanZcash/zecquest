"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isConfigured } from "./supabase";
import { gamesApi, type ArenaState } from "./api-games";
import { noteServerNow, serverNow, syncClock } from "./clock";

/**
 * Live view of an Arena match. Same approach as useGame:
 *  1) arena_state gives the player's own view (it also advances timed phases on the server)
 *  2) Supabase Realtime "arena:<id>" pings with {version} on every change → refetch
 *  3) polling fallback (fast when realtime is down, slow when it is up)
 *  4) a timer refetches right when the current phase is due to end
 */
export function useArenaMatch(matchId: string | null) {
  const [state, setState] = useState<ArenaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const ref = useRef<ArenaState | null>(null);
  const inflight = useRef(false);

  const apply = useCallback((s: ArenaState) => {
    const cur = ref.current;
    if (cur && cur.id === s.id && s.version < cur.version) return;
    ref.current = s;
    setState(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!matchId || inflight.current) return;
    inflight.current = true;
    try {
      const s = await gamesApi.arenaState(matchId);
      noteServerNow(s.server_now);
      apply(s);
      setError(null);
    } catch (e: unknown) {
      setError((e as { code?: string })?.code ?? "network");
    } finally {
      inflight.current = false;
    }
  }, [matchId, apply]);

  useEffect(() => {
    ref.current = null;
    setState(null);
    if (!matchId) return;
    syncClock().finally(refresh);
  }, [matchId, refresh]);

  // Realtime ping
  useEffect(() => {
    if (!matchId || !isConfigured) return;
    const ch = supabase
      .channel(`arena:${matchId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const v = (payload as { version?: number })?.version ?? 0;
        if (!ref.current || v > ref.current.version) refresh();
      })
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [matchId, refresh]);

  const ended = state?.status === "ended";

  // Polling fallback
  useEffect(() => {
    if (!matchId || ended) return;
    // a bot's "answered" flag appears by time, so poll a bit faster during bot questions
    const fast = state?.opp.bot && state.status === "question" && !state.opp_answered;
    const ms = live ? (fast ? 900 : 2500) : 750;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, ms);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", refresh);
    };
  }, [matchId, ended, live, refresh, state?.opp.bot, state?.status, state?.opp_answered]);

  // Phase deadline → refetch (server advances the phase lazily)
  useEffect(() => {
    if (!state?.phase_ends_at || ended) return;
    const wait = Math.max(0, state.phase_ends_at - serverNow()) + 120;
    const id = setTimeout(refresh, wait);
    return () => clearTimeout(id);
  }, [state?.phase_ends_at, state?.version, ended, refresh]);

  return { state, error, live, refresh };
}
