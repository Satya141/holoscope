import type { Hologram, PartRT } from '../scene/hologram';
import type { Stage } from '../scene/stage';
import type { Pt } from './handTracker';
import type { HandPose, Pose } from './gestures';

export type GestureId = 'open' | 'fist' | 'twist' | 'point' | 'pinch' | 'two' | 'peace';

export interface Visual {
  reticle?: Pt & { hit: boolean };
  pinch?: Pt & { grab: boolean };
  peace?: Pt & { progress: number };
}

const PEACE_FRAMES = 14;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Maps hand poses onto the stage transform and the current hologram. */
export class Controller {
  active: GestureId | null = null;
  visual: Visual = {};
  private prev: Pt | null = null;
  private prevPose: Pose | null = null;
  private two: { d: number; a: number } | null = null;
  private pinch: { part: PartRT | null } | null = null;
  private peaceFrames = 0;
  private cooldownUntil = 0;
  private lastHit = 0;

  constructor(private stage: Stage, private holo: () => Hologram | null, private onNext: () => void) {}

  update(hands: HandPose[], now: number) {
    const holo = this.holo();
    this.visual = {};
    if (!holo || hands.length === 0) {
      this.endPinch();
      this.prev = null; this.prevPose = null; this.two = null; this.peaceFrames = 0;
      this.active = null;
      return;
    }
    const T = this.stage.target, M = Math.min(innerWidth, innerHeight);

    // ---- two hands: zoom by spread, twist by angle ----
    if (hands.length === 2 && hands.every((h) => h.pose !== 'fist')) {
      this.endPinch();
      this.prev = null; this.prevPose = null;
      const [a, b] = [...hands].sort((p, q) => p.center.x - q.center.x).map((h) => h.center);
      const d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      if (this.two) {
        T.zoom *= d / this.two.d;
        let da = ang - this.two.a;
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        T.roll -= da;
      }
      this.two = { d, a: ang };
      this.active = 'two';
      return;
    }
    this.two = null;

    // ---- one hand: the closest (largest) one drives ----
    const h = hands.reduce((p, q) => (q.palm > p.palm ? q : p));
    if (h.pose !== this.prevPose) {
      if (this.prevPose === 'pinch') this.endPinch();
      if (h.pose !== 'peace') this.peaceFrames = 0;
      this.prev = null;
    }
    const dx = this.prev ? h.center.x - this.prev.x : 0;
    const dy = this.prev ? h.center.y - this.prev.y : 0;
    const W = innerWidth, H = innerHeight, cam = this.stage.camera;

    switch (h.pose) {
      case 'open': {
        holo.explodeTarget = smoothstep(1.2, 1.8, h.openness);
        const moving = Math.hypot(dx, dy) > 2.5;
        if (moving) { T.yaw += (dx / M) * 5; T.pitch += (dy / M) * 3.5; }
        this.active = moving ? 'twist' : 'open';
        break;
      }
      case 'fist': {
        holo.explodeTarget = 0;
        holo.selected = null;
        T.pos.x += dx * this.stage.worldPerPx; T.pos.y -= dy * this.stage.worldPerPx;
        this.active = 'fist';
        break;
      }
      case 'point': {
        const tip = h.pts[8];
        const hit = holo.pickAt(tip.x, tip.y, cam, W, H, 55);
        if (hit) { holo.selected = hit; this.lastHit = now; }
        else if (now - this.lastHit > 900) holo.selected = null;
        this.visual.reticle = { ...tip, hit: !!hit };
        this.active = 'point';
        break;
      }
      case 'pinch': {
        const p = h.pinchPt;
        if (!this.pinch) {
          const part = holo.pickAt(p.x, p.y, cam, W, H, 75);
          this.pinch = { part };
          holo.grabbed = part;
          if (part) holo.selected = part;
        }
        if (this.pinch.part) holo.dragPartTo(this.pinch.part, p.x, p.y, cam, W, H);
        else { T.pos.x += dx * this.stage.worldPerPx; T.pos.y -= dy * this.stage.worldPerPx; }
        this.visual.pinch = { ...p, grab: !!this.pinch.part };
        this.active = 'pinch';
        break;
      }
      case 'peace': {
        if (now > this.cooldownUntil) {
          this.peaceFrames++;
          if (this.peaceFrames >= PEACE_FRAMES) {
            this.peaceFrames = 0;
            this.cooldownUntil = now + 1500;
            this.onNext();
          }
        }
        this.visual.peace = { ...h.center, progress: this.peaceFrames / PEACE_FRAMES };
        this.active = 'peace';
        break;
      }
    }
    this.prev = h.center;
    this.prevPose = h.pose;
  }

  private endPinch() {
    const holo = this.holo();
    if (this.pinch?.part && holo) holo.release(this.pinch.part);
    if (holo) holo.grabbed = null;
    this.pinch = null;
  }
}
