/**
 * Tiny WebAudio synth: every sound is generated, nothing is downloaded.
 * The AudioContext is created lazily on the first enable (a user gesture), so the
 * game is silent until the player turns sound on.
 */
import type { SimEvent, Theme } from "./sim";

type Wave = OscillatorType;

export class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private step = 0;
  private theme: Theme = "city";
  enabled = false;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      if (!this.ac) {
        const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        if (!AC) return;
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.32;
        this.master.connect(this.ac.destination);
        this.musicGain = this.ac.createGain();
        this.musicGain.gain.value = 0.22;
        this.musicGain.connect(this.master);
        const len = this.ac.sampleRate * 0.4;
        this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      this.ac.resume().catch(() => {});
    } else {
      this.stopMusic();
      this.ac?.suspend().catch(() => {});
    }
  }

  private tone(freq: number, dur: number, type: Wave = "square", vol = 0.25, slideTo?: number, delay = 0, dest?: AudioNode) {
    if (!this.ac || !this.enabled) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.2, freq = 1200, delay = 0) {
    if (!this.ac || !this.enabled || !this.noiseBuf) return;
    const t = this.ac.currentTime + delay;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(events: SimEvent[]) {
    if (!this.enabled || !this.ac) return;
    for (const e of events) {
      switch (e.type) {
        case "jump": this.tone(330, 0.14, "square", 0.12, 620); break;
        case "land": this.noise(0.07, 0.12, 500); break;
        case "coin": {
          const up = ((e.n ?? 0) % 5) * 40;
          this.tone(988 + up, 0.06, "square", 0.1);
          this.tone(1319 + up, 0.12, "square", 0.1, undefined, 0.05);
          break;
        }
        case "stomp": this.tone(220, 0.12, "triangle", 0.3, 90); this.noise(0.08, 0.15, 900); break;
        case "hurt": case "caught": this.tone(440, 0.35, "sawtooth", 0.18, 110); this.noise(0.2, 0.12, 700); break;
        case "phish": this.tone(180, 0.08, "square", 0.2, 900); this.tone(900, 0.2, "sawtooth", 0.15, 90, 0.08); break;
        case "fall": this.tone(600, 0.45, "triangle", 0.2, 80); break;
        case "shield": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.18, undefined, i * 0.06)); break;
        case "shieldEnd": this.tone(660, 0.18, "triangle", 0.14, 330); break;
        case "crystal": this.tone(1568, 0.5, "sine", 0.18); this.tone(2093, 0.4, "sine", 0.1, undefined, 0.07); break;
        case "key": [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, "square", 0.08, undefined, i * 0.05)); break;
        case "door": this.noise(0.4, 0.12, 400); this.tone(392, 0.3, "triangle", 0.2, 784, 0.05); break;
        case "doorLocked": this.tone(140, 0.12, "square", 0.12); this.tone(120, 0.14, "square", 0.12, undefined, 0.12); break;
        case "checkpoint": this.tone(880, 0.12, "triangle", 0.18); this.tone(1175, 0.25, "triangle", 0.18, undefined, 0.1); break;
        case "crumble": this.noise(0.15, 0.08, 1400); break;
        case "won": [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, "square", 0.12, undefined, i * 0.11)); break;
        case "dead": [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.18, undefined, i * 0.18)); break;
        case "respawn": this.tone(523, 0.12, "sine", 0.15, 1047); break;
        default: break;
      }
    }
  }

  ui() {
    this.tone(880, 0.06, "triangle", 0.12);
  }

  /* ---------- music: a soft per-theme arpeggio loop ---------- */
  startMusic(theme: Theme) {
    this.theme = theme;
    if (!this.ac || !this.enabled || this.musicTimer) return;
    this.nextNote = this.ac.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = setInterval(() => this.schedule(), 60);
  }
  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
  private schedule() {
    if (!this.ac || !this.enabled) return;
    const seqs: Record<Theme, { notes: number[]; bass: number[]; tempo: number; wave: Wave }> = {
      city: { notes: [0, 7, 12, 7, 3, 7, 10, 7], bass: [0, 0, -4, -2], tempo: 0.18, wave: "triangle" },
      forest: { notes: [0, 4, 7, 11, 12, 11, 7, 4], bass: [0, -3, -5, -7], tempo: 0.21, wave: "sine" },
      tower: { notes: [0, 3, 7, 10, 12, 10, 7, 3], bass: [0, 1, -2, -4], tempo: 0.16, wave: "square" },
    };
    const sq = seqs[this.theme];
    const root = this.theme === "forest" ? 349.23 : this.theme === "tower" ? 293.66 : 261.63;
    while (this.nextNote < this.ac.currentTime + 0.25) {
      const d = this.nextNote - this.ac.currentTime;
      const n = sq.notes[this.step % sq.notes.length];
      this.tone(root * Math.pow(2, n / 12), sq.tempo * 0.9, sq.wave, sq.wave === "square" ? 0.05 : 0.09, undefined, Math.max(0, d), this.musicGain!);
      if (this.step % 8 === 0) {
        const b = sq.bass[(this.step / 8) % sq.bass.length];
        this.tone((root / 2) * Math.pow(2, b / 12), sq.tempo * 7.5, "sine", 0.16, undefined, Math.max(0, d), this.musicGain!);
      }
      this.nextNote += sq.tempo;
      this.step++;
    }
  }

  dispose() {
    this.stopMusic();
    this.ac?.close().catch(() => {});
    this.ac = null;
  }
}
