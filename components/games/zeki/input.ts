/** Keyboard + gamepad + touch → one Input per simulation step. */
import type { Input } from "./sim";

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const JUMP = new Set(["Space", "ArrowUp", "KeyW", "KeyZ", "KeyK"]);
const PAUSE = new Set(["Escape", "KeyP"]);

export class InputHub {
  private keys = new Set<string>();
  touch = { left: false, right: false, jump: false };
  /** fired on pause key / gamepad Start */
  onPause: (() => void) | null = null;
  /** fired on any jump press (used to start / dismiss cards) */
  onAction: (() => void) | null = null;
  private padStartWas = false;
  private padJumpWas = false;
  usedGamepad = false;
  private target: Window;

  constructor(target: Window = window) {
    this.target = target;
    target.addEventListener("keydown", this.down);
    target.addEventListener("keyup", this.up);
    target.addEventListener("blur", this.clear);
  }

  dispose() {
    this.target.removeEventListener("keydown", this.down);
    this.target.removeEventListener("keyup", this.up);
    this.target.removeEventListener("blur", this.clear);
  }

  private isTyping(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  }

  private down = (e: KeyboardEvent) => {
    if (this.isTyping(e)) return;
    if (PAUSE.has(e.code)) {
      e.preventDefault();
      if (!e.repeat) this.onPause?.();
      return;
    }
    if (LEFT.has(e.code) || RIGHT.has(e.code) || JUMP.has(e.code)) {
      // don't steal Space/Enter from focused buttons in menus
      const el = e.target as HTMLElement | null;
      if (el && el.tagName === "BUTTON" && (e.code === "Space" || e.code === "Enter")) return;
      e.preventDefault();
      if (JUMP.has(e.code) && !e.repeat) this.onAction?.();
      this.keys.add(e.code);
    }
  };
  private up = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  clear = () => {
    this.keys.clear();
    this.touch = { left: false, right: false, jump: false };
  };

  private pad(): Input & { start: boolean } {
    const out = { left: false, right: false, jump: false, start: false };
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] ?? 0;
      const b = (i: number) => !!gp.buttons[i]?.pressed;
      const left = ax < -0.35 || b(14);
      const right = ax > 0.35 || b(15);
      const jump = b(0) || b(1) || b(12);
      const start = b(9);
      if (left || right || jump || start) this.usedGamepad = true;
      out.left ||= left;
      out.right ||= right;
      out.jump ||= jump;
      out.start ||= start;
    }
    return out;
  }

  /** Polls everything once; call once per animation frame. */
  read(): Input {
    const p = this.pad();
    if (p.start && !this.padStartWas) this.onPause?.();
    this.padStartWas = p.start;
    if (p.jump && !this.padJumpWas) this.onAction?.();
    this.padJumpWas = p.jump;
    const k = this.keys;
    const has = (s: Set<string>) => { for (const c of s) if (k.has(c)) return true; return false; };
    return {
      left: has(LEFT) || this.touch.left || p.left,
      right: has(RIGHT) || this.touch.right || p.right,
      jump: has(JUMP) || this.touch.jump || p.jump,
    };
  }
}
