import type { Pt, RawHand } from './handTracker';

export type Pose = 'open' | 'fist' | 'point' | 'peace' | 'pinch';

export interface HandPose {
  id: string;
  pts: Pt[];
  pose: Pose;
  /** Wrist → middle-finger knuckle distance, px (hand scale). */
  palm: number;
  /** Mean fingertip distance from the wrist, in palms: ~0.9 fist … ~1.9 flat open hand. */
  openness: number;
  center: Pt;
  pinchPt: Pt;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const FINGERS: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];   // [tip, pip]

interface State { stable: Pose; cand: Pose; n: number; pinching: boolean }

/** Per-hand pose classification with pinch hysteresis and frame debouncing. */
export class GestureClassifier {
  private state = new Map<string, State>();

  classify(hands: RawHand[]): HandPose[] {
    const seen = new Set<string>();
    const out = hands.map(({ id, pts: p }) => {
      seen.add(id);
      const palm = dist(p[0], p[9]) || 1;
      const ext = FINGERS.map(([tip, pip]) => dist(p[tip], p[0]) > dist(p[pip], p[0]) * 1.12);
      const openness = FINGERS.reduce((s, [tip]) => s + dist(p[tip], p[0]), 0) / (4 * palm);

      let s = this.state.get(id);
      if (!s) this.state.set(id, (s = { stable: 'open', cand: 'open', n: 0, pinching: false }));
      const pinchRatio = dist(p[4], p[8]) / palm;
      s.pinching = s.pinching ? pinchRatio < 0.5 : pinchRatio < 0.32 && dist(p[8], p[0]) / palm > 1.05;

      let raw: Pose;
      if (s.pinching) raw = 'pinch';
      else if (ext[0] && !ext[1] && !ext[2] && !ext[3]) raw = 'point';
      else if (ext[0] && ext[1] && !ext[2] && !ext[3]) raw = 'peace';
      else if (!ext.some(Boolean)) raw = 'fist';
      else raw = 'open';

      if (raw === s.cand) s.n++;
      else { s.cand = raw; s.n = 1; }
      if (s.n >= (raw === 'pinch' || s.stable === 'pinch' ? 1 : 2)) s.stable = raw;

      const c = [0, 5, 9, 13, 17].reduce((a, i) => ({ x: a.x + p[i].x / 5, y: a.y + p[i].y / 5 }), { x: 0, y: 0 });
      return {
        id, pts: p, pose: s.stable, palm, openness, center: c,
        pinchPt: { x: (p[4].x + p[8].x) / 2, y: (p[4].y + p[8].y) / 2 },
      };
    });
    for (const id of this.state.keys()) if (!seen.has(id)) this.state.delete(id);
    return out;
  }
}
