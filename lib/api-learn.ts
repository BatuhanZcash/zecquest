"use client";

/**
 * Learn progress: one small client store on top of the shared XP system (0008).
 * - Signed in (account or guest): progress comes from get_my_progress(); finishing awards XP via award_xp().
 * - Not signed in: progress is kept on this device (localStorage) and credited on the next sign-in.
 * Each (source, ref) is sent at most once per session, so glossary views never spam the server.
 */
import { useEffect, useSyncExternalStore } from "react";
import { awardXp, getMyProgress, type XpProgress } from "./api";
import { useAuth } from "./auth";

export type LearnSource = "lesson" | "lesson_quiz" | "glossary";
const SOURCES: LearnSource[] = ["lesson", "lesson_quiz", "glossary"];
const LOCAL_KEY = "zq-learn-local";

interface State {
  /** Keys "source:ref" confirmed by the server */
  server: Set<string>;
  /** Keys done on this device while signed out (pending credit) */
  local: Set<string>;
  /** User id the server set belongs to (null = signed out) */
  uid: string | null;
  loaded: boolean;
  xp: XpProgress | null;
}

let state: State = { server: new Set(), local: new Set(), uid: null, loaded: false, xp: null };
const listeners = new Set<() => void>();
const inflight = new Set<string>();
let localRead = false;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function readLocal(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === "string") : []);
  } catch {
    return new Set();
  }
}
function writeLocal(s: Set<string>) {
  try {
    if (s.size) localStorage.setItem(LOCAL_KEY, JSON.stringify([...s]));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

const key = (source: LearnSource, ref: string) => `${source}:${ref}`;

async function loadFor(uid: string) {
  try {
    const p = await getMyProgress();
    if (state.uid !== uid) return;
    const server = new Set((p.done ?? []).filter((d) => SOURCES.includes(d.source as LearnSource)).map((d) => `${d.source}:${d.ref}`));
    emit({ server, loaded: true, xp: p });
    // Credit what was done on this device before signing in
    const pending = [...state.local].filter((k) => !server.has(k));
    for (const k of pending) {
      const i = k.indexOf(":");
      const res = await awardXp(k.slice(0, i) as LearnSource, k.slice(i + 1)).catch(() => null);
      if (!res || state.uid !== uid) break;
      const s = new Set(state.server);
      s.add(k);
      const local = new Set(state.local);
      local.delete(k);
      writeLocal(local);
      emit({ server: s, local, xp: res });
    }
  } catch {
    if (state.uid === uid) emit({ loaded: true });
  }
}

function setUser(uid: string | null) {
  if (!localRead) {
    localRead = true;
    emit({ local: readLocal() });
  }
  if (uid === state.uid && (state.loaded || uid)) return;
  emit({ uid, server: new Set(), loaded: !uid, xp: null });
  if (uid) loadFor(uid);
}

export interface AwardResult {
  /** XP added now (0 if it was already credited) */
  awarded: number;
  /** true when stored on this device because nobody is signed in */
  local: boolean;
  xp: XpProgress | null;
}

/** Mark something as done. Safe to call repeatedly: the server is called at most once per key. */
export async function markDone(source: LearnSource, ref: string): Promise<AwardResult> {
  const k = key(source, ref);
  if (!state.uid) {
    if (!state.local.has(k)) {
      const local = new Set(state.local);
      local.add(k);
      writeLocal(local);
      emit({ local });
    }
    return { awarded: 0, local: true, xp: null };
  }
  if (state.server.has(k) || inflight.has(k)) return { awarded: 0, local: false, xp: state.xp };
  inflight.add(k);
  try {
    const res = await awardXp(source, ref);
    const server = new Set(state.server);
    server.add(k);
    emit({ server, xp: res });
    return { awarded: res.awarded ?? 0, local: false, xp: res };
  } catch {
    // e.g. a session without a profile yet: keep it on the device, credit later
    const local = new Set(state.local);
    local.add(k);
    writeLocal(local);
    emit({ local });
    return { awarded: 0, local: true, xp: null };
  } finally {
    inflight.delete(k);
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => state;
const serverSnapshot = () => state;

/** Learn progress for the current visitor. */
export function useLearnProgress() {
  const { ready, session, profile } = useAuth();
  const uid = ready && session && profile ? session.user.id : null;
  useEffect(() => {
    if (ready) setUser(uid);
  }, [ready, uid]);
  const s = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const has = (source: LearnSource, ref: string) => s.server.has(key(source, ref)) || s.local.has(key(source, ref));
  return {
    /** Auth and progress are known */
    ready: ready && s.loaded,
    signedIn: !!s.uid,
    isGuest: !!profile?.is_guest,
    /** Number of items stored on this device waiting for sign-in */
    pending: s.uid ? 0 : s.local.size,
    xp: s.xp,
    has,
    lessonRead: (slug: string) => has("lesson", slug),
    quizPassed: (slug: string) => has("lesson_quiz", slug),
    termSeen: (slug: string) => has("glossary", slug),
  };
}
