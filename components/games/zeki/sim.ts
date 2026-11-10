/**
 * Zeki — deterministic game simulation (no DOM, no Math.random).
 *
 * The simulation runs at a fixed 60 Hz step. Everything that affects gameplay lives in
 * `Sim.s` (plain data, cloneable with structuredClone) so the same code drives the browser,
 * the automated playtest solver and replays. Rendering, audio and particles only consume
 * `Sim.events`.
 */

export const T = 32; // tile size (logical px)
export const FPS = 60;
export const STEP_MS = 1000 / FPS;

/* ---------- Tuning (per 60 Hz frame) ---------- */
export const TUNE = {
  runMax: 4.3,
  groundAccel: 0.62,
  groundFriction: 0.68,
  turnBoost: 1.6, // extra accel when reversing direction on the ground
  airAccel: 0.42,
  airDrag: 0.965,
  gravity: 0.56,
  fallGravity: 0.68,
  apexGravity: 0.3, // softer gravity near the apex while jump is held (hang time)
  apexWindow: 1.6,
  maxFall: 13,
  jumpVel: -13.4,
  jumpCut: 0.48, // multiply upward velocity when jump is released early
  coyote: 7,
  buffer: 8,
  stompBounce: -8.6,
  stompBounceHeld: -12.2,
  shieldFrames: 8 * FPS,
  invFrames: 100,
  hurtFrames: 42,
  droneAlert: 9, // frames inside a beam before you are caught
  lives: 3,
} as const;

export const SCORE = {
  coin: 100,
  stomp: 150,
  crystal: 100,
  shield: 50,
  finish: 1000,
  noHit: 1000,
  perSecondUnderPar: 20,
} as const;

export type Theme = "city" | "forest" | "tower";

export interface LevelDef {
  id: number;
  theme: Theme;
  /** Rows of equal length. See legend in levels.ts */
  map: string[];
  /** Seconds; finishing faster than this earns a time bonus */
  par: number;
  /** Fact ids (see facts in the i18n dictionary) assigned to crystals in reading order */
  facts: string[];
  /** Patrol half-range in tiles for drones, left to right (default 4) */
  droneRange?: number[];
}

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
}
export const NO_INPUT: Input = { left: false, right: false, jump: false };

/* ---------- Static (parsed) level ---------- */
interface Static {
  def: LevelDef;
  cols: number;
  rows: number;
  /** tile codes: 0 empty, 1 solid, 2 one-way, 3 crumble, 4 door */
  tiles: Uint8Array;
  /** for crumble/door tiles: index into dynamic arrays */
  ref: Int16Array;
  goal: { x: number; y: number; w: number; h: number };
  start: { x: number; y: number };
  totals: { coins: number; enemies: number; crystals: number; shields: number };
  maxScore: number;
  minTimeMs: number;
}

/* ---------- Dynamic state ---------- */
export interface PlayerState {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  px: number; py: number; // previous position (render interpolation)
  onGround: boolean;
  ride: number; // moving platform index or -1
  coyote: number;
  buffer: number;
  jumpHeld: boolean;
  jumping: boolean;
  face: 1 | -1;
  shield: number;
  inv: number;
  hurt: number;
  alert: number;
  airFrames: number;
}
export interface Walker { x: number; y: number; w: number; h: number; vx: number; vy: number; px: number; py: number; dead: number; onGround: boolean }
export interface Drone { x: number; y: number; ox: number; range: number; vx: number; px: number; beamTop: number; beamBottom: number; t: number }
export interface Pickup { x: number; y: number; w: number; h: number; got: boolean; idx: number }
export interface Platform { x: number; y: number; w: number; h: number; ox: number; oy: number; axis: "x" | "y"; range: number; speed: number; px: number; py: number; dx: number; dy: number }
export interface Crumble { tx: number; ty: number; state: 0 | 1 | 2; t: number }
export interface Door { tx: number; ty0: number; ty1: number; open: boolean; idx: number }

export interface State {
  frame: number;
  freeze: number;
  status: "play" | "won" | "dead";
  lives: number;
  hits: number;
  score: number;
  coins: number;
  stomps: number;
  crystals: number;
  shieldsGot: number;
  checkpoint: { x: number; y: number };
  cpIndex: number;
  player: PlayerState;
  walkers: Walker[];
  drones: Drone[];
  coinsList: Pickup[];
  shields: Pickup[];
  infos: Pickup[];
  keys: Pickup[];
  fakes: Pickup[];
  checkpoints: Pickup[];
  platforms: Platform[];
  crumbles: Crumble[];
  doors: Door[];
  finishFrame: number;
  timeBonus: number;
  noHitBonus: number;
}

export type SimEvent =
  | { type: "jump" | "land" | "coin" | "stomp" | "hurt" | "shield" | "shieldEnd" | "checkpoint" | "phish" | "fall" | "caught" | "won" | "dead" | "crumble" | "respawn"; x: number; y: number; n?: number }
  | { type: "crystal"; x: number; y: number; fact: string }
  | { type: "key"; x: number; y: number; n: number }
  | { type: "door"; x: number; y: number; n: number }
  | { type: "doorLocked"; x: number; y: number; n: number };

/* =====================================================================
   Parsing
   ===================================================================== */
const PW = 22, PH = 28;

export function parseLevel(def: LevelDef): { st: Static; s: State } {
  const rows = def.map.length;
  const cols = Math.max(...def.map.map((r) => r.length));
  const tiles = new Uint8Array(cols * rows);
  const ref = new Int16Array(cols * rows).fill(-1);
  const s: State = {
    frame: 0, freeze: 0, status: "play", lives: TUNE.lives, hits: 0, score: 0, coins: 0, stomps: 0, crystals: 0, shieldsGot: 0,
    checkpoint: { x: 0, y: 0 }, cpIndex: -1,
    player: null as unknown as PlayerState,
    walkers: [], drones: [], coinsList: [], shields: [], infos: [], keys: [], fakes: [], checkpoints: [], platforms: [], crumbles: [], doors: [],
    finishFrame: 0, timeBonus: 0, noHitBonus: 0,
  };
  let start = { x: 2 * T, y: (rows - 3) * T };
  let goal = { x: (cols - 4) * T, y: (rows - 5) * T, w: 2 * T, h: 3 * T };
  const ch = (x: number, y: number) => (def.map[y] && def.map[y][x]) || ".";
  const seenPlat = new Set<number>();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = ch(x, y);
      const i = y * cols + x;
      const px = x * T, py = y * T;
      switch (c) {
        case "#": tiles[i] = 1; break;
        case "=": tiles[i] = 2; break;
        case "~":
          tiles[i] = 3; ref[i] = s.crumbles.length;
          s.crumbles.push({ tx: x, ty: y, state: 0, t: 0 });
          break;
        case "D": {
          tiles[i] = 4;
          // doors are vertical runs of D; reuse the door above if present
          const above = y > 0 ? ref[(y - 1) * cols + x] : -1;
          if (above >= 0 && ch(x, y - 1) === "D") { ref[i] = above; s.doors[above].ty1 = y; }
          else { ref[i] = s.doors.length; s.doors.push({ tx: x, ty0: y, ty1: y, open: false, idx: 0 }); }
          break;
        }
        case "o": s.coinsList.push({ x: px + 8, y: py + 8, w: 16, h: 16, got: false, idx: 0 }); break;
        case "w": s.walkers.push({ x: px + 2, y: py + 8, w: 28, h: 24, vx: -1.05, vy: 0, px: px + 2, py: py + 8, dead: 0, onGround: false }); break;
        case "d": s.drones.push({ x: px, y: py, ox: px, range: 4 * T, vx: 1.25, px, beamTop: py + 22, beamBottom: py + 22, t: x * 0.7 }); break;
        case "S": s.shields.push({ x: px + 5, y: py + 4, w: 22, h: 24, got: false, idx: 0 }); break;
        case "i": s.infos.push({ x: px + 7, y: py + 4, w: 18, h: 24, got: false, idx: 0 }); break;
        case "k": s.keys.push({ x: px + 4, y: py + 6, w: 24, h: 20, got: false, idx: 0 }); break;
        case "F": s.fakes.push({ x: px + 4, y: py + 6, w: 24, h: 20, got: false, idx: 0 }); break;
        case "C": s.checkpoints.push({ x: px + 8, y: py - T, w: 16, h: 2 * T, got: false, idx: 0 }); break;
        case "P": start = { x: px + (T - PW) / 2, y: py + T - PH }; break;
        case "G": goal = { x: px, y: py - 2 * T, w: 2 * T, h: 3 * T }; break;
        case "M":
        case "V": {
          if (seenPlat.has(i)) break;
          let w = 0;
          while (ch(x + w, y) === c) { seenPlat.add(y * cols + x + w); w++; }
          s.platforms.push({
            x: px, y: py, w: w * T, h: 14, ox: px, oy: py, axis: c === "M" ? "x" : "y",
            range: (c === "M" ? 3 : 2.5) * T, speed: c === "M" ? 0.022 : 0.026, px, py, dx: 0, dy: 0,
          });
          break;
        }
      }
    }
  }
  // Ordered indexes: crystals in reading order map to facts, keys/doors left-to-right pair up
  const byX = (a: { x: number }, b: { x: number }) => a.x - b.x;
  s.keys.sort(byX).forEach((k, i) => (k.idx = i));
  s.doors.sort((a, b) => a.tx - b.tx || a.ty0 - b.ty0);
  s.doors.forEach((d, i) => {
    d.idx = i;
    for (let ty = d.ty0; ty <= d.ty1; ty++) ref[ty * cols + d.tx] = i;
  });
  s.infos.sort(def.theme === "tower" ? (a, b) => b.y - a.y : byX).forEach((p, i) => (p.idx = i));
  s.drones.sort((a, b) => a.ox - b.ox || a.y - b.y);
  s.drones.forEach((d, i) => (d.range = (def.droneRange?.[i] ?? 4) * T));
  s.checkpoints.sort(byX).forEach((c, i) => (c.idx = i));

  s.checkpoint = { ...start };
  s.player = newPlayer(start.x, start.y);

  const totals = { coins: s.coinsList.length, enemies: s.walkers.length, crystals: s.infos.length, shields: s.shields.length };
  const maxScore =
    SCORE.finish + SCORE.noHit + totals.coins * SCORE.coin + totals.enemies * SCORE.stomp +
    totals.crystals * SCORE.crystal + totals.shields * SCORE.shield + def.par * SCORE.perSecondUnderPar;
  // Lower bound on a legitimate finish time: straight-line distance at top speed / best climb rate
  const dx = Math.abs(goal.x - start.x), dy = Math.max(0, start.y - goal.y);
  const minTimeMs = Math.floor(0.85 * Math.max(dx / (TUNE.runMax * FPS), dy / 420) * 1000);
  const st: Static = { def, cols, rows, tiles, ref, goal, start, totals, maxScore, minTimeMs };
  return { st, s };
}

function newPlayer(x: number, y: number): PlayerState {
  return {
    x, y, w: PW, h: PH, vx: 0, vy: 0, px: x, py: y, onGround: false, ride: -1, coyote: 0, buffer: 0,
    jumpHeld: false, jumping: false, face: 1, shield: 0, inv: 0, hurt: 0, alert: 0, airFrames: 0,
  };
}

/* =====================================================================
   Simulation
   ===================================================================== */
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Sim {
  readonly st: Static;
  s: State;
  events: SimEvent[] = [];

  constructor(def: LevelDef, state?: State, st?: Static) {
    if (st && state) {
      this.st = st;
      this.s = state;
    } else {
      const p = parseLevel(def);
      this.st = p.st;
      this.s = p.s;
    }
  }

  clone(): Sim {
    return new Sim(this.st.def, structuredClone(this.s), this.st);
  }

  get widthPx() { return this.st.cols * T; }
  get heightPx() { return this.st.rows * T; }
  get timeMs() { return Math.round(((this.s.finishFrame || this.s.frame) * 1000) / FPS); }

  private emit(e: SimEvent) {
    this.events.push(e);
  }

  /* ---------- tiles ---------- */
  tileAt(tx: number, ty: number): number {
    const { cols, rows, tiles, ref } = this.st;
    if (tx < 0 || tx >= cols) return 1; // side walls
    if (ty < 0 || ty >= rows) return 0;
    const i = ty * cols + tx;
    const v = tiles[i];
    if (v === 3) return this.s.crumbles[ref[i]].state === 2 ? 0 : 3;
    if (v === 4) return this.s.doors[ref[i]].open ? 0 : 1;
    return v;
  }
  /** raw tile code + dynamic info for rendering */
  tileInfo(tx: number, ty: number): { v: number; ref: number } {
    const { cols, rows, tiles, ref } = this.st;
    if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return { v: 0, ref: -1 };
    const i = ty * cols + tx;
    return { v: tiles[i], ref: ref[i] };
  }

  private moveX(o: { x: number; y: number; w: number; h: number }, dx: number): boolean {
    o.x += dx;
    const t0 = Math.floor(o.y / T), t1 = Math.floor((o.y + o.h - 1) / T);
    if (dx > 0) {
      const tx = Math.floor((o.x + o.w) / T);
      for (let ty = t0; ty <= t1; ty++) if (this.tileAt(tx, ty) === 1) { o.x = tx * T - o.w; this.bumpDoor(tx, ty); return true; }
    } else if (dx < 0) {
      const tx = Math.floor(o.x / T);
      for (let ty = t0; ty <= t1; ty++) if (this.tileAt(tx, ty) === 1) { o.x = (tx + 1) * T; this.bumpDoor(tx, ty); return true; }
    }
    return false;
  }

  private bumpTarget: { x: number; y: number; w: number; h: number } | null = null;
  private bumpDoor(tx: number, ty: number) {
    if (this.bumpTarget !== this.s.player) return;
    const { v, ref } = this.tileInfo(tx, ty);
    if (v !== 4) return;
    const d = this.s.doors[ref];
    if (d.open) return;
    const key = this.s.keys.find((k) => k.idx === d.idx);
    if (key && key.got) {
      d.open = true;
      this.emit({ type: "door", x: tx * T + T / 2, y: (d.ty0 + d.ty1 + 1) * T / 2, n: d.idx });
    } else if (this.s.frame % 40 === 0 || this.lastLocked !== d.idx) {
      this.lastLocked = d.idx;
      this.emit({ type: "doorLocked", x: tx * T + T / 2, y: d.ty0 * T, n: d.idx });
    }
  }
  private lastLocked = -1;

  /** returns: 0 no hit, 1 landed, -1 hit ceiling */
  private moveY(o: { x: number; y: number; w: number; h: number }, dy: number, oneWay = true): number {
    const prevBottom = o.y + o.h;
    o.y += dy;
    const t0 = Math.floor(o.x / T), t1 = Math.floor((o.x + o.w - 1) / T);
    if (dy > 0) {
      const ty = Math.floor((o.y + o.h) / T);
      for (let tx = t0; tx <= t1; tx++) {
        const v = this.tileAt(tx, ty);
        if (v === 1 || (oneWay && (v === 2 || v === 3) && prevBottom <= ty * T + 0.01)) {
          o.y = ty * T - o.h;
          return 1;
        }
      }
    } else if (dy < 0) {
      const ty = Math.floor(o.y / T);
      for (let tx = t0; tx <= t1; tx++) if (this.tileAt(tx, ty) === 1) { o.y = (ty + 1) * T; return -1; }
    }
    return 0;
  }

  /* ---------- player damage ---------- */
  private hurt(kind: "hurt" | "caught" | "fall" | "phish") {
    const p = this.s.player;
    if (this.s.status !== "play" || p.hurt > 0) return;
    if (kind !== "fall" && kind !== "phish" && p.inv > 0) return;
    this.s.lives--;
    this.s.hits++;
    p.hurt = TUNE.hurtFrames;
    p.alert = 0;
    p.vx = -p.face * 3;
    p.vy = kind === "fall" ? 0 : -7;
    this.s.freeze = 7;
    this.emit({ type: kind, x: p.x + p.w / 2, y: p.y + p.h / 2 });
  }

  private respawn() {
    const p = this.s.player;
    const np = newPlayer(this.s.checkpoint.x, this.s.checkpoint.y);
    np.inv = TUNE.invFrames;
    np.face = p.face;
    this.s.player = np;
    this.emit({ type: "respawn", x: np.x, y: np.y });
  }

  /* ---------- main step ---------- */
  step(inp: Input) {
    const s = this.s;
    if (s.status !== "play") return;
    if (s.freeze > 0) { s.freeze--; return; }
    s.frame++;
    const p = s.player;
    p.px = p.x; p.py = p.y;

    this.stepPlatforms();
    this.stepCrumbles();

    if (p.hurt > 0) {
      // knocked back, no control; then respawn or game over
      p.hurt--;
      p.vy = Math.min(p.vy + TUNE.gravity, TUNE.maxFall);
      p.x += p.vx * 0.5;
      p.y += p.vy;
      if (p.hurt === 0) {
        if (s.lives <= 0) {
          s.status = "dead";
          this.emit({ type: "dead", x: p.x, y: p.y });
          return;
        }
        this.respawn();
      }
      this.stepEnemies();
      return;
    }

    this.stepPlayer(inp);
    this.stepEnemies();
    this.stepPickups();
    this.stepDrones();

    if (p.inv > 0) p.inv--;
    if (p.shield > 0) {
      p.shield--;
      if (p.shield === 0) this.emit({ type: "shieldEnd", x: p.x, y: p.y });
    }
    if (p.y > this.heightPx + 64) this.hurt("fall");

    // finish
    const g = this.st.goal;
    if (s.status === "play" && p.hurt === 0 && overlap(p, { x: g.x + 20, y: g.y, w: g.w - 40, h: g.h })) this.finish();
  }

  private finish() {
    const s = this.s;
    s.status = "won";
    s.finishFrame = s.frame;
    const secs = s.frame / FPS;
    s.timeBonus = Math.max(0, Math.floor(this.st.def.par - secs)) * SCORE.perSecondUnderPar;
    s.noHitBonus = s.hits === 0 ? SCORE.noHit : 0;
    s.score += SCORE.finish + s.timeBonus + s.noHitBonus;
    this.emit({ type: "won", x: s.player.x, y: s.player.y });
  }

  private stepPlayer(inp: Input) {
    const p = this.s.player;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const pressed = inp.jump && !p.jumpHeld;
    p.jumpHeld = inp.jump;

    // horizontal
    if (p.onGround) {
      if (dir !== 0) {
        const reversing = Math.sign(p.vx) === -dir && Math.abs(p.vx) > 0.5;
        p.vx += dir * TUNE.groundAccel * (reversing ? TUNE.turnBoost : 1);
      } else {
        p.vx *= TUNE.groundFriction;
      }
    } else {
      if (dir !== 0) p.vx += dir * TUNE.airAccel;
      else p.vx *= TUNE.airDrag;
    }
    p.vx = Math.max(-TUNE.runMax, Math.min(TUNE.runMax, p.vx));
    if (Math.abs(p.vx) < 0.04) p.vx = 0;
    if (dir !== 0) p.face = dir as 1 | -1;

    // jump: buffer + coyote
    if (pressed) p.buffer = TUNE.buffer;
    else if (p.buffer > 0) p.buffer--;
    p.coyote = p.onGround ? TUNE.coyote : Math.max(0, p.coyote - 1);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = TUNE.jumpVel;
      if (p.ride >= 0) p.vy += Math.min(0, this.s.platforms[p.ride].dy);
      p.buffer = 0;
      p.coyote = 0;
      p.jumping = true;
      p.onGround = false;
      p.ride = -1;
      this.emit({ type: "jump", x: p.x + p.w / 2, y: p.y + p.h });
    }
    // variable jump height
    if (p.jumping && !inp.jump && p.vy < 0) {
      p.vy *= TUNE.jumpCut;
      p.jumping = false;
    }
    if (p.vy >= 0) p.jumping = false;

    // gravity with apex hang
    let g: number = p.vy > 0 ? TUNE.fallGravity : TUNE.gravity;
    if (inp.jump && Math.abs(p.vy) < TUNE.apexWindow) g = TUNE.apexGravity;
    p.vy = Math.min(p.vy + g, TUNE.maxFall);

    // ride moving platform
    if (p.ride >= 0) {
      const pl = this.s.platforms[p.ride];
      p.x += pl.dx;
    }

    const wasGround = p.onGround;
    this.bumpTarget = p;
    if (this.moveX(p, p.vx)) p.vx = 0;
    const prevBottom = p.y + p.h;
    const r = this.moveY(p, p.vy);
    this.bumpTarget = null;
    p.onGround = false;
    if (r === 1) { p.onGround = true; p.ride = -1; }
    if (r === -1) p.vy = 0.5;

    // moving platforms (one-way, from above)
    if (!p.onGround && p.vy >= 0) {
      for (let i = 0; i < this.s.platforms.length; i++) {
        const pl = this.s.platforms[i];
        if (p.x + p.w <= pl.x + 2 || p.x >= pl.x + pl.w - 2) continue;
        const bottom = p.y + p.h;
        if (prevBottom <= pl.py + 6 && bottom >= pl.y - 0.01 && (p.ride === i || bottom <= pl.y + Math.max(14, p.vy + Math.abs(pl.dy) + 2))) {
          p.y = pl.y - p.h;
          p.onGround = true;
          p.ride = i;
          break;
        }
      }
    }
    if (!p.onGround) p.ride = -1;
    if (p.onGround) {
      if (!wasGround && p.airFrames > 4) this.emit({ type: "land", x: p.x + p.w / 2, y: p.y + p.h, n: Math.min(13, p.vy) });
      p.vy = 0;
      p.airFrames = 0;
      // stepping on crumbling tiles starts their timer
      const ty = Math.floor((p.y + p.h + 1) / T);
      for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 1) / T); tx++) {
        const { v, ref } = this.tileInfo(tx, ty);
        if (v === 3) {
          const c = this.s.crumbles[ref];
          if (c.state === 0) { c.state = 1; c.t = 30; this.emit({ type: "crumble", x: tx * T + T / 2, y: ty * T }); }
        }
      }
    } else p.airFrames++;
  }

  private stepPlatforms() {
    for (const pl of this.s.platforms) {
      pl.px = pl.x; pl.py = pl.y;
      const off = Math.sin(this.s.frame * pl.speed) * pl.range;
      if (pl.axis === "x") pl.x = pl.ox + off;
      else pl.y = pl.oy + off;
      pl.dx = pl.x - pl.px;
      pl.dy = pl.y - pl.py;
    }
    const p = this.s.player;
    if (p.ride >= 0 && p.hurt === 0) {
      const pl = this.s.platforms[p.ride];
      p.y = pl.y - p.h;
    }
  }

  private stepCrumbles() {
    const p = this.s.player;
    for (const c of this.s.crumbles) {
      if (c.state === 1 && --c.t <= 0) { c.state = 2; c.t = 240; }
      else if (c.state === 2 && --c.t <= 0) {
        // only reappear when nobody stands inside it
        if (!overlap(p, { x: c.tx * T, y: c.ty * T, w: T, h: T })) c.state = 0;
        else c.t = 10;
      }
    }
  }

  private stepEnemies() {
    const p = this.s.player;
    const camRange = 900;
    for (const e of this.s.walkers) {
      e.px = e.x; e.py = e.y;
      if (e.dead) { e.dead++; continue; }
      if (Math.abs(e.x - p.x) > camRange && Math.abs(e.y - p.y) > 200) continue;
      e.vy = Math.min(e.vy + TUNE.gravity, 12);
      if (this.moveX(e, e.vx)) e.vx = -e.vx;
      if (e.onGround) {
        const ahead = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / T);
        const below = Math.floor((e.y + e.h + 2) / T);
        if (this.tileAt(ahead, below) === 0) e.vx = -e.vx;
      }
      const r = this.moveY(e, e.vy);
      e.onGround = r === 1;
      if (e.onGround) e.vy = 0;
      if (e.y > this.heightPx + 100) e.dead = 30;

      if (p.hurt === 0 && overlap(p, e)) {
        const falling = p.vy > 0.5 || p.py + p.h <= e.y + 4;
        if (falling && p.y + p.h - e.y < 18) {
          e.dead = 1;
          p.vy = p.jumpHeld ? TUNE.stompBounceHeld : TUNE.stompBounce;
          p.jumping = p.jumpHeld;
          p.onGround = false;
          p.ride = -1;
          this.s.stomps++;
          this.s.score += SCORE.stomp;
          this.s.freeze = 4; // hit-stop
          this.emit({ type: "stomp", x: e.x + e.w / 2, y: e.y + e.h / 2 });
        } else if (p.shield <= 0) {
          this.hurt("hurt");
        }
      }
    }
    this.s.walkers = this.s.walkers.filter((e) => e.dead < 30);
  }

  private stepPickups() {
    const s = this.s, p = s.player;
    for (const c of s.coinsList) if (!c.got && overlap(p, c)) {
      c.got = true; s.coins++; s.score += SCORE.coin;
      this.emit({ type: "coin", x: c.x + 8, y: c.y + 8, n: s.coins });
    }
    for (const c of s.shields) if (!c.got && overlap(p, c)) {
      c.got = true; s.shieldsGot++; s.score += SCORE.shield; p.shield = TUNE.shieldFrames; p.alert = 0;
      this.emit({ type: "shield", x: c.x + 11, y: c.y + 12 });
    }
    for (const c of s.infos) if (!c.got && overlap(p, c)) {
      c.got = true; s.crystals++; s.score += SCORE.crystal;
      this.emit({ type: "crystal", x: c.x + 9, y: c.y + 12, fact: this.st.def.facts[c.idx] ?? this.st.def.facts[0] });
    }
    for (const k of s.keys) if (!k.got && overlap(p, k)) {
      k.got = true;
      this.emit({ type: "key", x: k.x + 12, y: k.y + 10, n: k.idx });
    }
    for (const f of s.fakes) if (!f.got && overlap(p, f)) {
      f.got = true;
      this.hurt("phish");
    }
    for (const c of s.checkpoints) if (!c.got && overlap(p, c) && p.onGround) {
      c.got = true;
      if (c.idx > s.cpIndex) {
        s.cpIndex = c.idx;
        s.checkpoint = { x: c.x - 3, y: c.y + 2 * T - PH };
        this.emit({ type: "checkpoint", x: c.x + 8, y: c.y });
      }
    }
  }

  private stepDrones() {
    const p = this.s.player;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    let seen = false;
    for (const d of this.s.drones) {
      d.px = d.x;
      d.t += 0.05;
      d.x += d.vx;
      if (d.x < d.ox - d.range || d.x > d.ox + d.range) { d.vx = -d.vx; d.x = Math.max(d.ox - d.range, Math.min(d.ox + d.range, d.x)); }
      // beam: straight down to the first solid/one-way tile
      const tx = Math.floor((d.x + 16) / T);
      d.beamTop = d.y + 22;
      let gy = this.heightPx;
      for (let ty = Math.floor(d.beamTop / T) + 1; ty < this.st.rows; ty++) {
        if (this.tileAt(tx, ty) !== 0) { gy = ty * T; break; }
      }
      d.beamBottom = gy;
      if (p.shield > 0 || p.hurt > 0) continue;
      if (pcy > d.beamTop && pcy < gy) {
        const half = beamHalfWidth(d, pcy);
        if (Math.abs(pcx - (d.x + 16)) < half + p.w * 0.3) seen = true;
      }
    }
    if (seen) {
      p.alert++;
      if (p.alert >= TUNE.droneAlert) this.hurt("caught");
    } else p.alert = Math.max(0, p.alert - 2);
  }
}

export function beamHalfWidth(d: Drone, y: number) {
  const len = Math.max(1, d.beamBottom - d.beamTop);
  const f = Math.max(0, Math.min(1, (y - d.beamTop) / len));
  const bottomHalf = 18 + len * 0.14;
  return 7 + (bottomHalf - 7) * f;
}

/** Stars: 1 finish, 2 all coins, 3 no hits */
export function starsOf(sim: Sim) {
  const s = sim.s;
  return {
    finish: s.status === "won",
    coins: s.status === "won" && s.coins >= sim.st.totals.coins,
    noHit: s.status === "won" && s.hits === 0,
  };
}
