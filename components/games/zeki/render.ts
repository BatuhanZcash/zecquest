/**
 * Zeki — canvas renderer. All art is drawn in code (original style: soft vector shapes
 * with crisp gold rims on a dark palette). The renderer never changes gameplay state.
 */
import { T, TUNE, beamHalfWidth, type Sim, type SimEvent, type Theme } from "./sim";

export interface Labels {
  gate: string;
  fake: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  size: number; color: string; kind: "dot" | "spark" | "ring" | "square"; g: number;
}

const GOLD = "#F4B728";
const GOLD_D = "#C1860B";
const INK = "#14161B";
const CYAN = "#7FD3FF";
const RED = "#FF5A5F";
const KEY_COLORS = ["#F4B728", "#5CE1C6", "#B48CFF"];

const PALETTE: Record<Theme, { sky: [string, string, string]; far: string; mid: string; tile: string; tileHi: string; tileTop: string; plat: string; platTop: string; deep: string }> = {
  city: { sky: ["#0B1020", "#141A30", "#1B1E2E"], far: "#161C30", mid: "#1D2440", tile: "#1E222B", tileHi: "#282D38", tileTop: GOLD, plat: "#2A2F3C", platTop: GOLD, deep: "#0E1015" },
  forest: { sky: ["#07140F", "#0E2219", "#142A20"], far: "#0F2119", mid: "#143023", tile: "#2B2219", tileHi: "#3A2E22", tileTop: "#6FCF7A", plat: "#5A3F27", platTop: "#8FD48F", deep: "#0C0A08" },
  tower: { sky: ["#0D0A1C", "#150F2A", "#1C1433"], far: "#1A1430", mid: "#231A40", tile: "#221C33", tileHi: "#2E2645", tileTop: "#9D7BFF", plat: "#2C2440", platTop: "#B9A2FF", deep: "#0A0814" },
};

/** Small deterministic hash for decoration placement */
const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

export class Renderer {
  ctx: CanvasRenderingContext2D;
  sim: Sim;
  theme: Theme;
  labels: Labels;
  reducedMotion: boolean;
  // view
  scale = 1;
  dpr = 1;
  viewW = 800;
  viewH = 480;
  padBottom = 0;
  cam = { x: 0, y: 0, look: 0, init: false };
  trauma = 0;
  particles: Particle[] = [];
  time = 0;
  squash = 0; // landing squash amount
  blinkT = 0;
  private bgCache: HTMLCanvasElement | null = null;

  constructor(ctx: CanvasRenderingContext2D, sim: Sim, labels: Labels, reducedMotion = false) {
    this.ctx = ctx;
    this.sim = sim;
    this.theme = sim.st.def.theme;
    this.labels = labels;
    this.reducedMotion = reducedMotion;
  }

  setSim(sim: Sim) {
    this.sim = sim;
    this.theme = sim.st.def.theme;
    this.particles = [];
    this.cam.init = false;
    this.trauma = 0;
    this.bgCache = null;
  }

  /** css size of the canvas element; padBottom = css px hidden behind touch controls */
  resize(cssW: number, cssH: number, dpr: number, padBottomCss = 0) {
    // show at least 14 tiles across and the full 17-row height of a horizontal level
    const cols = cssH > cssW * 1.15 ? 12 : 14; // portrait phones: zoom in a little
    const s = Math.min(cssW / (cols * T), cssH / (17 * T));
    this.scale = s;
    this.dpr = dpr;
    this.viewW = cssW / s;
    this.viewH = cssH / s;
    this.padBottom = padBottomCss / s;
    this.bgCache = null;
  }

  /* ---------- events → juice ---------- */
  onEvents(events: SimEvent[]) {
    for (const e of events) {
      switch (e.type) {
        case "jump": this.burst(e.x, e.y, 6, "#C9CED8", "dot", 1.6, -0.6, 0.12); this.squash = -0.18; break;
        case "land": {
          const n = Math.min(1, (e.n ?? 6) / 13);
          this.burst(e.x, e.y, 4 + Math.round(n * 8), "#C9CED8", "dot", 2.2 * n + 0.8, -0.8, 0.15);
          this.squash = 0.12 + 0.2 * n;
          if (n > 0.8) this.addTrauma(0.12);
          break;
        }
        case "coin": this.burst(e.x, e.y, 10, GOLD, "spark", 2.6, -1.2, 0.06); this.ring(e.x, e.y, GOLD, 18); break;
        case "stomp": this.burst(e.x, e.y, 16, "#B58CFF", "square", 3.6, -2, 0.18); this.ring(e.x, e.y, "#D9C6FF", 30); this.addTrauma(0.28); break;
        case "hurt": case "caught": case "phish":
          this.burst(e.x, e.y, 22, e.type === "phish" ? "#FF8A3D" : RED, "square", 4, -2.5, 0.2); this.addTrauma(0.65); break;
        case "fall": this.addTrauma(0.4); break;
        case "shield": this.burst(e.x, e.y, 24, CYAN, "spark", 3.2, -1, 0.04); this.ring(e.x, e.y, CYAN, 46); this.addTrauma(0.1); break;
        case "shieldEnd": this.ring(e.x + 11, e.y + 14, "#9FB3C8", 30); break;
        case "crystal": this.burst(e.x, e.y, 14, "#8FD3FF", "spark", 2.6, -1.4, 0.05); this.ring(e.x, e.y, "#8FD3FF", 26); break;
        case "key": this.burst(e.x, e.y, 18, KEY_COLORS[e.n % 3], "spark", 3, -1.5, 0.05); this.ring(e.x, e.y, KEY_COLORS[e.n % 3], 34); break;
        case "door": this.burst(e.x, e.y, 26, KEY_COLORS[e.n % 3], "square", 3.2, -1, 0.12); this.ring(e.x, e.y, KEY_COLORS[e.n % 3], 60); this.addTrauma(0.2); break;
        case "checkpoint": this.burst(e.x, e.y, 14, GOLD, "spark", 2.4, -2.4, 0.08); break;
        case "crumble": this.burst(e.x, e.y + 4, 5, "#B08A6A", "square", 1.2, 0, 0.2); break;
        case "won": this.burst(e.x + 11, e.y, 50, GOLD, "spark", 5, -3, 0.08); this.ring(e.x + 11, e.y + 14, GOLD, 90); break;
        case "respawn": this.ring(e.x + 11, e.y + 14, GOLD, 34); break;
        default: break;
      }
    }
  }

  addTrauma(n: number) {
    if (this.reducedMotion) n *= 0.25;
    this.trauma = Math.min(1, this.trauma + n);
  }

  private burst(x: number, y: number, n: number, color: string, kind: Particle["kind"], speed: number, up: number, g: number) {
    if (this.reducedMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n && this.particles.length < 360; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      const life = 22 + Math.random() * 24;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + up, life, max: life, size: kind === "square" ? 3 + Math.random() * 3 : 2 + Math.random() * 2, color, kind, g });
    }
  }
  private ring(x: number, y: number, color: string, r: number) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 22, max: 22, size: r, color, kind: "ring", g: 0 });
  }

  /* ---------- camera ---------- */
  private updateCamera(dtMs: number, px: number, py: number) {
    const sim = this.sim, p = sim.s.player;
    const W = sim.widthPx, H = sim.heightPx;
    const k = 1 - Math.exp(-dtMs / 140);
    const lookTarget = Math.abs(p.vx) > 1 ? p.face * Math.min(90, this.viewW * 0.14) : this.cam.look * 0.98;
    this.cam.look += (lookTarget - this.cam.look) * (1 - Math.exp(-dtMs / 420));
    const tx = px + p.w / 2 + this.cam.look - this.viewW / 2;
    // vertical: keep the player a bit below centre; react faster when falling
    // tower: follow the climb; side-scrollers: keep the ground in view and only lift the
    // camera when Zeki gets close to the top edge
    const ty = sim.st.def.theme === "tower" ? py + p.h / 2 - this.viewH * 0.55 : py - 2.5 * T;
    const maxX = Math.max(0, W - this.viewW);
    const minY = Math.min(-2 * T, H - this.viewH + this.padBottom);
    const maxY = H - this.viewH + this.padBottom;
    const cx = Math.max(0, Math.min(maxX, tx));
    const cy = Math.max(Math.min(minY, maxY), Math.min(maxY, ty));
    if (!this.cam.init) { this.cam.x = cx; this.cam.y = cy; this.cam.init = true; return; }
    this.cam.x += (cx - this.cam.x) * k;
    const ky = p.vy > 6 ? 1 - Math.exp(-dtMs / 70) : k * 0.8;
    this.cam.y += (cy - this.cam.y) * ky;
  }

  /* ---------- frame ---------- */
  draw(alpha: number, dtMs: number) {
    const { ctx } = this;
    const sim = this.sim, s = sim.s, p = s.player;
    this.time += dtMs;
    const lerp = (a: number, b: number) => a + (b - a) * alpha;
    const px = lerp(p.px, p.x), py = lerp(p.py, p.y);
    this.updateCamera(dtMs, px, py);
    this.squash *= Math.exp(-dtMs / 90);
    this.trauma = Math.max(0, this.trauma - dtMs / 900);

    let sx = 0, sy = 0;
    if (this.trauma > 0) {
      const sh = this.trauma * this.trauma * 14;
      sx = (Math.random() * 2 - 1) * sh;
      sy = (Math.random() * 2 - 1) * sh;
    }
    const camX = Math.round((this.cam.x + sx) * this.scale) / this.scale;
    const camY = Math.round((this.cam.y + sy) * this.scale) / this.scale;

    const k = this.scale * this.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    this.drawBackground(camX, camY);
    ctx.save();
    ctx.translate(-camX, -camY);
    this.drawTiles(camX, camY);
    this.drawGoal();
    this.drawCheckpoints();
    this.drawPlatforms(alpha);
    for (const c of s.coinsList) if (!c.got && this.visible(c.x, c.y, camX, camY)) this.drawCoin(c.x + 8, c.y + 8);
    for (const c of s.infos) if (!c.got && this.visible(c.x, c.y, camX, camY)) this.drawCrystal(c.x + 9, c.y + 12);
    for (const c of s.shields) if (!c.got && this.visible(c.x, c.y, camX, camY)) this.drawShieldPickup(c.x + 11, c.y + 12);
    for (const c of s.keys) if (!c.got && this.visible(c.x, c.y, camX, camY)) this.drawKey(c.x + 12, c.y + 10, KEY_COLORS[c.idx % 3], false);
    for (const c of s.fakes) if (!c.got && this.visible(c.x, c.y, camX, camY)) this.drawFake(c.x + 12, c.y + 10);
    for (const d of s.drones) if (this.visible(d.x, d.y, camX, camY, 400)) this.drawBeam(d, alpha);
    for (const w of s.walkers) if (this.visible(w.x, w.y, camX, camY)) this.drawWalker(w, alpha);
    for (const d of s.drones) if (this.visible(d.x, d.y, camX, camY)) this.drawDrone(d, alpha);
    if (s.status !== "won") this.drawZeki(px, py);
    this.drawParticles(dtMs);
    ctx.restore();
    this.drawOverlay();
  }

  private visible(x: number, y: number, camX: number, camY: number, margin = 64) {
    return x > camX - margin && x < camX + this.viewW + margin && y > camY - margin - 600 && y < camY + this.viewH + margin;
  }

  /* ---------- background ---------- */
  private drawBackground(camX: number, camY: number) {
    const { ctx } = this;
    const pal = PALETTE[this.theme];
    const g = ctx.createLinearGradient(0, 0, 0, this.viewH);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(0.6, pal.sky[1]);
    g.addColorStop(1, pal.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    const t = this.reducedMotion ? 0 : this.time;
    if (this.theme === "city") this.bgCity(camX, camY, t);
    else if (this.theme === "forest") this.bgForest(camX, camY, t);
    else this.bgTower(camX, camY, t);
  }

  private bgCity(camX: number, camY: number, t: number) {
    const { ctx } = this;
    const base = this.sim.heightPx - camY; // ground line in screen space
    // stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 40; i++) {
      const x = (hash(i) * 1600 - camX * 0.05) % 1600;
      const y = hash(i + 99) * this.viewH * 0.5;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 + i));
      ctx.globalAlpha = tw * 0.6;
      ctx.fillRect((x + 1600) % 1600, y, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    // two skyline layers: glass towers whose windows show visible "data" (transparent city)
    const layers = [
      { f: 0.18, color: "#151B2E", win: "rgba(127,211,255,0.10)", h0: 160, h1: 300, w0: 70, w1: 120, gap: 150, lift: 60 },
      { f: 0.38, color: "#1B2238", win: "rgba(244,183,40,0.16)", h0: 110, h1: 230, w0: 60, w1: 100, gap: 120, lift: 30 },
    ];
    for (const L of layers) {
      const off = camX * L.f;
      const first = Math.floor(off / L.gap) - 1;
      for (let i = first; i < first + Math.ceil(this.viewW / L.gap) + 3; i++) {
        const bw = L.w0 + hash(i * 7 + L.gap) * (L.w1 - L.w0);
        const bh = L.h0 + hash(i * 13 + L.gap) * (L.h1 - L.h0);
        const x = i * L.gap - off;
        const yTop = base * (1 - L.f * 0.3) - L.lift - bh;
        ctx.fillStyle = L.color;
        ctx.fillRect(x, yTop, bw, this.viewH - yTop + 400);
        // glass edge
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(x, yTop, 3, bh);
        // windows as little ledger rows
        ctx.fillStyle = L.win;
        for (let wy = yTop + 12; wy < yTop + bh - 10; wy += 16) {
          for (let wx = x + 8; wx < x + bw - 12; wx += 14) {
            if (hash(Math.floor(wx * 3 + wy * 7 + i)) < 0.55) ctx.fillRect(wx, wy, 8, 3);
          }
        }
      }
    }
  }

  private bgForest(camX: number, camY: number, t: number) {
    const { ctx } = this;
    const base = this.sim.heightPx - camY;
    // moon glow
    const mg = ctx.createRadialGradient(this.viewW * 0.78, this.viewH * 0.18, 4, this.viewW * 0.78, this.viewH * 0.18, 120);
    mg.addColorStop(0, "rgba(220,255,230,0.35)");
    mg.addColorStop(1, "rgba(220,255,230,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    const layers = [
      { f: 0.15, color: "#0F241B", gap: 70, h0: 120, h1: 220, lift: 70 },
      { f: 0.35, color: "#123020", gap: 90, h0: 90, h1: 180, lift: 36 },
    ];
    for (const L of layers) {
      const off = camX * L.f;
      const first = Math.floor(off / L.gap) - 2;
      ctx.fillStyle = L.color;
      for (let i = first; i < first + Math.ceil(this.viewW / L.gap) + 4; i++) {
        const x = i * L.gap - off + hash(i) * 30;
        const h = L.h0 + hash(i * 5 + L.gap) * (L.h1 - L.h0);
        const y0 = base * (1 - L.f * 0.3) - L.lift;
        // sapling-like layered crowns
        ctx.fillRect(x - 3, y0 - h * 0.4, 6, h * 0.4 + 400);
        for (let k = 0; k < 3; k++) {
          const cy = y0 - h * (0.35 + k * 0.22);
          const r = (h * 0.32) * (1 - k * 0.22);
          ctx.beginPath();
          ctx.moveTo(x - r, cy + r * 0.5);
          ctx.quadraticCurveTo(x, cy - r * 1.2, x + r, cy + r * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.fillRect(0, base * (1 - L.f * 0.3) - L.lift, this.viewW, 600);
    }
    // fireflies
    for (let i = 0; i < 18; i++) {
      const x = ((hash(i * 3) * 1400 - camX * 0.6 + Math.sin(t / 1300 + i) * 30) % 1400 + 1400) % 1400;
      const y = hash(i * 11) * this.viewH * 0.8 + Math.cos(t / 1100 + i * 2) * 14;
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t / 600 + i));
      ctx.fillStyle = "#D8FF9C";
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private bgTower(camX: number, camY: number, t: number) {
    const { ctx } = this;
    // back wall: server racks scrolling with vertical parallax
    const f = 0.35;
    const offY = camY * f, offX = camX * 0.2;
    const rackW = 70, rackH = 120;
    for (let gx = -1; gx < this.viewW / rackW + 2; gx++) {
      for (let gy = -1; gy < this.viewH / rackH + 2; gy++) {
        const ix = gx + Math.floor(offX / rackW), iy = gy + Math.floor(offY / rackH);
        const x = gx * rackW - (offX % rackW), y = gy * rackH - (((offY % rackH) + rackH) % rackH);
        ctx.fillStyle = (ix + iy) % 2 ? "#17112A" : "#1A1430";
        ctx.fillRect(x + 4, y + 4, rackW - 8, rackH - 8);
        ctx.fillStyle = "#231B3D";
        for (let r = 0; r < 5; r++) ctx.fillRect(x + 10, y + 14 + r * 20, rackW - 20, 8);
        // blinking node LEDs
        for (let r = 0; r < 5; r++) {
          const on = hash(ix * 31 + iy * 17 + r + Math.floor(t / 400 + hash(ix + r) * 10)) > 0.6;
          ctx.fillStyle = on ? (r % 2 ? "#5CE1C6" : GOLD) : "#2E2548";
          ctx.fillRect(x + rackW - 18, y + 16 + r * 20, 3, 3);
        }
      }
    }
    // vignette columns
    const g = ctx.createLinearGradient(0, 0, this.viewW, 0);
    g.addColorStop(0, "rgba(10,8,20,0.7)");
    g.addColorStop(0.2, "rgba(10,8,20,0)");
    g.addColorStop(0.8, "rgba(10,8,20,0)");
    g.addColorStop(1, "rgba(10,8,20,0.7)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
  }

  /* ---------- tiles ---------- */
  private drawTiles(camX: number, camY: number) {
    const { ctx, sim } = this;
    const pal = PALETTE[this.theme];
    const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(sim.st.cols - 1, Math.ceil((camX + this.viewW) / T));
    const y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(sim.st.rows - 1, Math.ceil((camY + this.viewH) / T));
    // below the level (padding under touch controls)
    if (camY + this.viewH > sim.heightPx) {
      ctx.fillStyle = pal.deep;
      ctx.fillRect(camX, sim.heightPx, this.viewW, camY + this.viewH - sim.heightPx + 2);
    }
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const { v, ref } = sim.tileInfo(tx, ty);
        if (!v) continue;
        const x = tx * T, y = ty * T;
        if (v === 1) {
          const top = sim.tileInfo(tx, ty - 1).v !== 1;
          ctx.fillStyle = pal.tile;
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = pal.tileHi;
          ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
          // subtle masonry
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          if ((tx + ty) % 2) ctx.fillRect(x + 2, y + T / 2, T - 4, 1);
          if (top) {
            ctx.fillStyle = pal.tileTop;
            ctx.fillRect(x, y, T, 4);
            if (this.theme === "forest") {
              // grass tufts
              ctx.fillRect(x + 4 + hash(tx) * 18, y - 3, 2, 3);
              ctx.fillRect(x + 10 + hash(tx + 5) * 16, y - 2, 2, 2);
            }
          }
        } else if (v === 2) {
          this.drawOneWay(x, y, pal);
        } else if (v === 3) {
          const c = sim.s.crumbles[ref];
          if (c.state === 2) {
            ctx.strokeStyle = "rgba(255,170,90,0.25)";
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x + 2, y + 2, T - 4, 10);
            ctx.setLineDash([]);
            continue;
          }
          const shake = c.state === 1 && !this.reducedMotion ? (Math.random() - 0.5) * 2.5 : 0;
          ctx.fillStyle = c.state === 1 ? "#6B4A2E" : "#4E3B2C";
          ctx.fillRect(x + 1 + shake, y + 2, T - 2, 12);
          ctx.fillStyle = "#E39A4C";
          ctx.fillRect(x + 1 + shake, y + 2, T - 2, 3);
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(x + 9 + shake, y + 5, 2, 8);
          ctx.fillRect(x + 21 + shake, y + 4, 2, 6);
        } else if (v === 4) {
          const d = sim.s.doors[ref];
          if (!d.open) this.drawDoorTile(x, y, d.idx, ty === d.ty0, ty === d.ty1);
        }
      }
    }
  }

  private drawOneWay(x: number, y: number, pal: (typeof PALETTE)[Theme]) {
    const { ctx } = this;
    if (this.theme === "forest") {
      ctx.fillStyle = pal.plat;
      ctx.beginPath();
      ctx.roundRect(x, y + 2, T, 11, 5);
      ctx.fill();
      ctx.fillStyle = pal.platTop;
      ctx.fillRect(x + 2, y + 1, T - 4, 3);
      return;
    }
    ctx.fillStyle = pal.plat;
    ctx.fillRect(x, y + 2, T, 10);
    ctx.fillStyle = pal.platTop;
    ctx.fillRect(x, y + 1, T, 3);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x + 4, y + 7, 6, 2);
    ctx.fillRect(x + 20, y + 7, 6, 2);
  }

  private drawDoorTile(x: number, y: number, idx: number, top: boolean, bottom: boolean) {
    const { ctx } = this;
    const c = KEY_COLORS[idx % 3];
    ctx.fillStyle = "#2A1F16";
    ctx.fillRect(x + 3, y, T - 6, T);
    ctx.fillStyle = "#3D2D1F";
    ctx.fillRect(x + 6, y, 5, T);
    ctx.fillRect(x + 15, y, 5, T);
    ctx.fillStyle = c;
    ctx.fillRect(x + 1, y, 3, T);
    ctx.fillRect(x + T - 4, y, 3, T);
    if (top) ctx.fillRect(x + 1, y, T - 2, 3);
    if (bottom) ctx.fillRect(x + 1, y + T - 3, T - 2, 3);
    if (top) {
      // eye + keyhole glyph: this gate checks a viewing key
      const cx = x + T / 2, cy = y + T + 6;
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 9, 5.5, 0, 0, 7);
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, 7);
      ctx.fill();
    }
  }

  private drawGoal() {
    const { ctx } = this;
    const g = this.sim.st.goal;
    const t = this.time;
    const x = g.x, y = g.y, w = g.w, h = g.h;
    // inner portal shimmer
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, "rgba(127,211,255,0.55)");
    grd.addColorStop(0.5, "rgba(244,183,40,0.35)");
    grd.addColorStop(1, "rgba(127,211,255,0.25)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 8, w - 16, h - 8, [w / 2 - 8, w / 2 - 8, 4, 4]);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#E8F7FF";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const yy = y + 16 + (((t / 18 + i * 30) % (h - 20)));
      ctx.beginPath();
      ctx.moveTo(x + 14, yy);
      ctx.lineTo(x + w - 14, yy);
      ctx.stroke();
    }
    ctx.restore();
    // gold arch
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, w - 8, h - 4, [w / 2 - 4, w / 2 - 4, 2, 2]);
    ctx.stroke();
    // shield emblem
    this.shieldShape(x + w / 2, y - 8, 11, GOLD, INK);
    // label
    ctx.font = "800 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = GOLD;
    ctx.fillText(this.labels.gate, x + w / 2, y - 24);
  }

  private drawCheckpoints() {
    const { ctx } = this;
    for (const c of this.sim.s.checkpoints) {
      const x = c.x + 8, base = c.y + c.h;
      ctx.fillStyle = "#3A3F4B";
      ctx.fillRect(x - 1.5, base - 52, 3, 52);
      const on = c.idx <= this.sim.s.cpIndex;
      const wave = this.reducedMotion ? 0 : Math.sin(this.time / 200) * 2;
      ctx.fillStyle = on ? GOLD : "#5B6170";
      ctx.beginPath();
      ctx.moveTo(x + 1.5, base - 52);
      ctx.lineTo(x + 20, base - 46 + wave);
      ctx.lineTo(x + 1.5, base - 38);
      ctx.closePath();
      ctx.fill();
      if (on) {
        ctx.fillStyle = INK;
        ctx.font = "900 8px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("✓", x + 8, base - 42.5 + wave / 2);
      }
    }
  }

  private drawPlatforms(alpha: number) {
    const { ctx } = this;
    const pal = PALETTE[this.theme];
    for (const p of this.sim.s.platforms) {
      const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha;
      ctx.fillStyle = pal.plat;
      ctx.beginPath();
      ctx.roundRect(x, y, p.w, p.h, 5);
      ctx.fill();
      ctx.fillStyle = "#5CE1C6";
      ctx.fillRect(x + 3, y, p.w - 6, 3);
      // thrusters
      const flick = this.reducedMotion ? 0.7 : 0.5 + Math.random() * 0.5;
      ctx.fillStyle = `rgba(92,225,198,${0.35 * flick})`;
      for (let i = 0; i < p.w / T; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * T + 10, y + p.h);
        ctx.lineTo(x + i * T + 22, y + p.h);
        ctx.lineTo(x + i * T + 16, y + p.h + 8 + flick * 6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /* ---------- pickups ---------- */
  private bob(x: number, speed = 300, amp = 3) {
    return this.reducedMotion ? 0 : Math.sin(this.time / speed + x * 0.05) * amp;
  }

  drawCoin(cx: number, cy: number) {
    const { ctx } = this;
    const y = cy + this.bob(cx, 280, 2.5);
    const spin = this.reducedMotion ? 1 : Math.cos(this.time / 260 + cx * 0.03);
    const w = 8 * Math.max(0.18, Math.abs(spin));
    ctx.fillStyle = GOLD_D;
    ctx.beginPath();
    ctx.ellipse(cx + 1, y + 1, w, 8, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(cx, y, w, 8, 0, 0, 7);
    ctx.fill();
    if (Math.abs(spin) > 0.45) {
      // ZEC-style "Z" with bars
      const s = Math.abs(spin);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 3.2 * s, y - 3.5);
      ctx.lineTo(cx + 3.2 * s, y - 3.5);
      ctx.lineTo(cx - 3.2 * s, y + 3.5);
      ctx.lineTo(cx + 3.2 * s, y + 3.5);
      ctx.moveTo(cx, y - 6);
      ctx.lineTo(cx, y - 3.5);
      ctx.moveTo(cx, y + 3.5);
      ctx.lineTo(cx, y + 6);
      ctx.stroke();
    }
  }

  private drawCrystal(cx: number, cy: number) {
    const { ctx } = this;
    const y = cy + this.bob(cx, 340, 3);
    const glow = ctx.createRadialGradient(cx, y, 2, cx, y, 18);
    glow.addColorStop(0, "rgba(127,211,255,0.45)");
    glow.addColorStop(1, "rgba(127,211,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 18, y - 18, 36, 36);
    ctx.fillStyle = "#4EA8DE";
    ctx.beginPath();
    ctx.moveTo(cx, y - 11); ctx.lineTo(cx + 8, y - 2); ctx.lineTo(cx, y + 11); ctx.lineTo(cx - 8, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#BFE6FF";
    ctx.beginPath();
    ctx.moveTo(cx, y - 11); ctx.lineTo(cx + 8, y - 2); ctx.lineTo(cx, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = "900 9px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("i", cx, y + 5);
  }

  private shieldShape(cx: number, cy: number, r: number, fill: string, glyph: string | null) {
    const { ctx } = this;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.9, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.8, cy + r * 0.35);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.8, cy + r * 0.35);
    ctx.lineTo(cx - r * 0.9, cy - r * 0.55);
    ctx.closePath();
    ctx.fill();
    if (glyph) {
      ctx.strokeStyle = glyph;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.35, cy - r * 0.35);
      ctx.lineTo(cx + r * 0.35, cy - r * 0.35);
      ctx.lineTo(cx - r * 0.35, cy + r * 0.35);
      ctx.lineTo(cx + r * 0.35, cy + r * 0.35);
      ctx.stroke();
    }
  }

  private drawShieldPickup(cx: number, cy: number) {
    const { ctx } = this;
    const y = cy + this.bob(cx, 320, 3.5);
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(this.time / 200) * 0.12;
    const glow = ctx.createRadialGradient(cx, y, 2, cx, y, 22 * pulse);
    glow.addColorStop(0, "rgba(127,211,255,0.5)");
    glow.addColorStop(1, "rgba(127,211,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 24, y - 24, 48, 48);
    this.shieldShape(cx, y, 12, CYAN, "#0F1115");
  }

  drawKey(cx: number, cy: number, color: string, fake: boolean) {
    const { ctx } = this;
    const y = cy + this.bob(cx, 300, 3);
    const glow = ctx.createRadialGradient(cx, y, 2, cx, y, 20);
    glow.addColorStop(0, fake ? "rgba(255,120,60,0.35)" : color + "66");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 22, y - 22, 44, 44);
    // eye-shaped bow (viewing key) + bit
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(cx - 5, y, 7, 5, 0, 0, 7);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - 5, y, 2, 0, 7);
    ctx.fill();
    ctx.fillRect(cx + 2, y - 1.3, 10, 2.6);
    ctx.fillRect(cx + 8, y, 2.4, 4.5);
    ctx.fillRect(cx + 11, y, 2.4, 3);
  }

  private drawFake(cx: number, cy: number) {
    const { ctx } = this;
    // looks like a key… but glitches and is offered "for free"
    const glitch = !this.reducedMotion && Math.sin(this.time / 70) > 0.82;
    const dx = glitch ? (Math.random() - 0.5) * 4 : 0;
    this.drawKey(cx + dx, cy, glitch ? "#FF6B4A" : "#F2C14E", true);
    const y = cy + this.bob(cx, 300, 3);
    ctx.font = "800 7.5px system-ui, sans-serif";
    ctx.textAlign = "center";
    const label = this.labels.fake;
    const w = ctx.measureText(label).width + 8;
    ctx.fillStyle = "rgba(255,90,95,0.9)";
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - 24, w, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(label, cx, y - 15.8);
  }

  /* ---------- enemies ---------- */
  private drawWalker(e: { x: number; y: number; px: number; py: number; w: number; h: number; vx: number; dead: number }, alpha: number) {
    const { ctx } = this;
    const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
    if (e.dead) {
      ctx.globalAlpha = Math.max(0, 1 - e.dead / 30);
      ctx.fillStyle = "#5B3F8A";
      ctx.beginPath();
      ctx.roundRect(x - 2, y + e.h - 7, e.w + 4, 7, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const sq = this.reducedMotion ? 0 : Math.sin(this.time / 110 + e.x * 0.1) * 1.6;
    const dir = e.vx > 0 ? 1 : -1;
    // feet
    ctx.fillStyle = "#4B2F7A";
    const step = this.reducedMotion ? 0 : Math.sin(this.time / 90 + e.x * 0.2) * 3;
    ctx.fillRect(x + 4 + step, y + e.h - 4, 7, 4);
    ctx.fillRect(x + e.w - 11 - step, y + e.h - 4, 7, 4);
    // body
    ctx.fillStyle = "#7B57C9";
    ctx.beginPath();
    ctx.roundRect(x, y + sq, e.w, e.h - 3 - sq, [12, 12, 7, 7]);
    ctx.fill();
    ctx.fillStyle = "#9873E0";
    ctx.fillRect(x + 4, y + 3 + sq, e.w - 8, 3);
    // single tracking eye with a crosshair pupil
    const ex = x + e.w / 2 + dir * 3, ey = y + 10 + sq;
    ctx.fillStyle = "#ECEEF2";
    ctx.beginPath();
    ctx.arc(ex, ey, 6.5, 0, 7);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + dir * 2.5, ey, 3, 0, 7);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.fillRect(ex + dir * 2.5 - 0.6, ey - 0.6, 1.2, 1.2);
  }

  private drawBeam(d: { x: number; px: number; y: number; t: number; beamTop: number; beamBottom: number }, alpha: number) {
    const { ctx } = this;
    const p = this.sim.s.player;
    const x = d.px + (d.x - d.px) * alpha + 16;
    const top = d.beamTop, bot = d.beamBottom;
    const hb = beamHalfWidth(d as never, bot);
    const blind = p.shield > 0;
    const alert = p.alert / TUNE.droneAlert;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    if (blind) {
      g.addColorStop(0, "rgba(127,211,255,0.10)");
      g.addColorStop(1, "rgba(127,211,255,0.02)");
    } else {
      g.addColorStop(0, `rgba(255,90,95,${0.32 + alert * 0.4})`);
      g.addColorStop(1, `rgba(255,90,95,${0.08 + alert * 0.2})`);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 7, top);
    ctx.lineTo(x + 7, top);
    ctx.lineTo(x + hb, bot);
    ctx.lineTo(x - hb, bot);
    ctx.closePath();
    ctx.fill();
    // scan line sweeping down
    if (!blind && !this.reducedMotion) {
      const f = ((this.time / 700 + d.t) % 1);
      const yy = top + (bot - top) * f;
      const hw = 7 + (hb - 7) * f;
      ctx.fillStyle = "rgba(255,140,140,0.35)";
      ctx.fillRect(x - hw, yy, hw * 2, 2);
    }
    ctx.fillStyle = blind ? "rgba(127,211,255,0.25)" : `rgba(255,90,95,${0.55 + alert * 0.4})`;
    ctx.fillRect(x - hb, bot - 3, hb * 2, 3);
  }

  private drawDrone(d: { x: number; px: number; y: number; t: number }, alpha: number) {
    const { ctx } = this;
    const p = this.sim.s.player;
    const x = d.px + (d.x - d.px) * alpha;
    const y = d.y + (this.reducedMotion ? 0 : Math.sin(d.t) * 3);
    const blind = p.shield > 0;
    // arms + spinning rotors
    ctx.fillStyle = "#3A3F4B";
    ctx.fillRect(x - 6, y + 4, 44, 4);
    const spin = this.reducedMotion ? 1 : Math.abs(Math.sin(this.time / 35));
    ctx.fillStyle = "rgba(236,238,242,0.8)";
    ctx.fillRect(x - 8 - 6 * spin, y + 1, 12 * spin + 4, 2);
    ctx.fillRect(x + 34 - 6 * spin, y + 1, 12 * spin + 4, 2);
    // body
    ctx.fillStyle = "#2B3039";
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 6, 28, 16, 7);
    ctx.fill();
    ctx.fillStyle = "#3C424F";
    ctx.fillRect(x + 6, y + 8, 20, 2);
    // lens
    ctx.fillStyle = blind ? "#5B6170" : RED;
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 5, 0, 7);
    ctx.fill();
    if (!blind) {
      ctx.fillStyle = "#FFD1D2";
      ctx.fillRect(x + 14, y + 13.5, 2, 2);
    } else {
      ctx.strokeStyle = "#9FB3C8";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 16);
      ctx.lineTo(x + 20, y + 16);
      ctx.stroke();
    }
  }

  /* ---------- Zeki ---------- */
  private drawZeki(x: number, y: number) {
    const { ctx } = this;
    const p = this.sim.s.player;
    if (p.inv > 0 && p.hurt === 0 && Math.floor(p.inv / 5) % 2 === 0) ctx.globalAlpha = 0.45;
    const hurt = p.hurt > 0;
    const shielded = p.shield > 0;
    const t = this.time;
    const moving = Math.abs(p.vx) > 0.4 && p.onGround;
    const runPhase = (this.sim.s.frame * Math.abs(p.vx)) / 18;
    const airborne = !p.onGround;

    // squash & stretch
    let sxs = 1, sys = 1;
    if (airborne) {
      const st = Math.max(-0.14, Math.min(0.16, -p.vy * 0.012));
      sys = 1 + st; sxs = 1 - st * 0.8;
    }
    sys -= this.squash; sxs += this.squash * 0.9;
    const cx = x + p.w / 2, base = y + p.h;
    ctx.save();
    ctx.translate(cx, base);
    ctx.scale(sxs * p.face, sys);
    // shadow-ish rim
    const bob = moving ? Math.abs(Math.sin(runPhase)) * 2 : (airborne ? 0 : Math.sin(t / 420) * 0.8);
    const lean = moving ? 0.08 : airborne ? -0.04 : 0;
    ctx.rotate(lean);

    // legs
    ctx.fillStyle = GOLD_D;
    if (airborne) {
      const tuck = p.vy < 0 ? 4 : 1;
      ctx.fillRect(-8, -7 - tuck, 6, 6);
      ctx.fillRect(2, -7, 6, 6);
    } else if (moving) {
      const a = Math.sin(runPhase) * 5;
      ctx.fillRect(-8 + a, -6, 6, 6);
      ctx.fillRect(2 - a, -6, 6, 6);
    } else {
      ctx.fillRect(-8, -6, 6, 6);
      ctx.fillRect(2, -6, 6, 6);
    }
    // body
    const by = -28 - bob;
    ctx.fillStyle = hurt ? (Math.floor(t / 60) % 2 ? "#FFFFFF" : "#FF8B8F") : GOLD;
    ctx.beginPath();
    ctx.roundRect(-12, by, 24, 23, 9);
    ctx.fill();
    // belly plate + highlight
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(-9, by + 2, 10, 2.5);
    ctx.fillStyle = GOLD_D;
    ctx.fillRect(-6, by + 18, 12, 2);
    // arm (swings)
    ctx.fillStyle = GOLD_D;
    const arm = moving ? Math.sin(runPhase + Math.PI) * 4 : airborne ? -5 : 0;
    ctx.fillRect(-14, by + 11 + arm * 0.3, 4, 7);
    // visor
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(-4, by + 5, 15, 9, 4);
    ctx.fill();
    // eyes (blink / hurt X)
    const blink = !hurt && (Math.floor(t / 100) % 38 === 0);
    if (hurt) {
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1.6;
      for (const ex of [2, 7.5]) {
        ctx.beginPath();
        ctx.moveTo(ex - 1.6, by + 7.6); ctx.lineTo(ex + 1.6, by + 11);
        ctx.moveTo(ex + 1.6, by + 7.6); ctx.lineTo(ex - 1.6, by + 11);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = shielded ? "#CFF4FF" : CYAN;
      const eh = blink ? 1 : 4;
      ctx.fillRect(1, by + 9.5 - eh / 2, 3, eh);
      ctx.fillRect(6.5, by + 9.5 - eh / 2, 3, eh);
    }
    // antenna
    ctx.fillStyle = GOLD;
    const sway = airborne ? p.vy * 0.15 : Math.sin(t / 300) * 1.2;
    ctx.fillRect(-1, by - 6, 2, 6);
    ctx.beginPath();
    ctx.arc(sway * 0.4, by - 7, 3, 0, 7);
    ctx.fill();
    ctx.fillStyle = shielded ? CYAN : "#FFE08A";
    ctx.beginPath();
    ctx.arc(sway * 0.4, by - 7, 1.4, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    if (shielded) {
      // hex bubble; flickers in the last 2 seconds
      const left = p.shield;
      const flick = left < 120 && Math.floor(left / 8) % 2 === 0;
      if (!flick) {
        const r = 24 + (this.reducedMotion ? 0 : Math.sin(t / 140) * 1.5);
        ctx.save();
        ctx.translate(cx, y + p.h / 2 - 2);
        ctx.rotate(this.reducedMotion ? 0 : t / 1600);
        ctx.strokeStyle = "rgba(127,211,255,0.9)";
        ctx.fillStyle = "rgba(127,211,255,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    // alert meter above head when a beam is on you
    if (p.alert > 0 && !shielded && !hurt) {
      const f = p.alert / TUNE.droneAlert;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(cx - 12, y - 16, 24, 4);
      ctx.fillStyle = RED;
      ctx.fillRect(cx - 12, y - 16, 24 * f, 4);
      ctx.font = "900 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("!", cx, y - 20);
    }
  }

  /* ---------- particles & overlay ---------- */
  private drawParticles(dtMs: number) {
    const { ctx } = this;
    const k = dtMs / 16.67;
    const next: Particle[] = [];
    for (const q of this.particles) {
      q.life -= k;
      if (q.life <= 0) continue;
      q.x += q.vx * k;
      q.y += q.vy * k;
      q.vy += q.g * k;
      q.vx *= Math.pow(0.97, k);
      const a = Math.min(1, q.life / (q.max * 0.6));
      ctx.globalAlpha = a;
      if (q.kind === "ring") {
        const f = 1 - q.life / q.max;
        ctx.strokeStyle = q.color;
        ctx.lineWidth = 2.5 * (1 - f) + 0.5;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.3 + f * 0.9), 0, 7);
        ctx.stroke();
      } else if (q.kind === "spark") {
        ctx.fillStyle = q.color;
        ctx.fillRect(q.x - q.size / 2, q.y - 0.5, q.size, 1.4);
        ctx.fillRect(q.x - 0.5, q.y - q.size / 2, 1.4, q.size);
      } else if (q.kind === "square") {
        ctx.fillStyle = q.color;
        ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, 7);
        ctx.fill();
      }
      next.push(q);
    }
    ctx.globalAlpha = 1;
    this.particles = next;
  }

  private drawOverlay() {
    const { ctx } = this;
    const p = this.sim.s.player;
    // shielded tint vignette
    if (p.shield > 0) {
      const f = Math.min(1, p.shield / 60);
      const g = ctx.createRadialGradient(this.viewW / 2, this.viewH / 2, this.viewH * 0.35, this.viewW / 2, this.viewH / 2, this.viewH * 0.9);
      g.addColorStop(0, "rgba(127,211,255,0)");
      g.addColorStop(1, `rgba(60,150,210,${0.28 * f})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
    if (p.alert > 0 && p.shield <= 0) {
      ctx.fillStyle = `rgba(255,60,70,${0.12 * (p.alert / TUNE.droneAlert)})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
    // soft vignette
    const v = ctx.createRadialGradient(this.viewW / 2, this.viewH / 2, this.viewH * 0.5, this.viewW / 2, this.viewH / 2, this.viewH * 1.05);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
  }
}
