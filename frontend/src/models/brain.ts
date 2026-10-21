import * as THREE from 'three';
import type { ModelDef, PartDef, V3 } from './types';

const LOBES = {
  Frontal: { desc: 'Planning, decisions, personality and voluntary movement.', palette: ['#ff5fb7', '#ffa3d9'], dir: [0, 0.1, 0.9] },
  Parietal: { desc: 'Touch, spatial awareness and navigation.', palette: ['#6b8bff', '#a8bcff'], dir: [0, 0.75, -0.1] },
  Temporal: { desc: 'Hearing, language and memory — the hippocampus sits inside.', palette: ['#4fffb0', '#2fd0ff'], dir: [0.45, -0.55, 0.15] },
  Occipital: { desc: 'Primary visual processing.', palette: ['#ffd34d', '#ffa13d'], dir: [0, 0, -0.95] },
} as const;
type Lobe = keyof typeof LOBES;

/** Gyri-like ripples on the cortex. */
const folds = (x: number, y: number, z: number) =>
  Math.sin(x * 9 + Math.sin(y * 5) * 2) * Math.sin(y * 11 + z * 3) * 0.5 + Math.sin(z * 13 + x * 4) * 0.5;

export const brain: ModelDef = {
  id: 'brain',
  name: 'Human Brain',
  category: 'Anatomy',
  icon: '🧠',
  desc: 'Cortex lobes, cerebellum and brain stem.',
  points: 52000,
  view: { yaw: 0.9, pitch: 0.25 },
  build() {
    const buckets = new Map<string, number[]>();
    const push = (k: string, x: number, y: number, z: number) => {
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = []));
      b.push(x, y, z);
    };
    const d = new THREE.Vector3();

    for (let i = 0; i < 40000; i++) {
      const side = i % 2 ? 1 : -1;
      d.randomDirection();
      const f = 1 + 0.065 * folds(d.x * 1.3, d.y * 1.3, d.z * 1.3);
      let x = side * 0.66 + d.x * 0.68 * f;
      let y = d.y * 1.0 * f;
      const z = d.z * 1.5 * f;
      x = side * Math.max(0.05, side * x);                // flat medial wall → visible fissure
      if (y < -0.45) y = -0.45 + (y + 0.45) * 0.35;        // flatter base
      y += 0.15;
      const lobe: Lobe = z > 0.45 ? 'Frontal' : z < -0.95 ? 'Occipital' : y > 0.35 ? 'Parietal' : 'Temporal';
      push(`${lobe}|${side}`, x, y, z);
    }
    for (let i = 0; i < 6000; i++) {
      d.randomDirection();
      const f = 1 + 0.06 * Math.sin(d.y * 40);
      push('Cerebellum', d.x * 0.9 * f, -0.5 + d.y * 0.42 * f, -1.0 + d.z * 0.55 * f);
    }
    for (let i = 0; i < 2500; i++) {
      const t = Math.random(), a = Math.random() * Math.PI * 2, r = 0.2 * (1 - 0.3 * t);
      push('Stem', Math.cos(a) * r, -0.55 - t * 1.2, -0.45 - t * 0.2 + Math.sin(a) * r);
    }

    const parts: PartDef[] = [];
    for (const [key, arr] of buckets) {
      const pts = new Float32Array(arr);
      if (key === 'Cerebellum') {
        parts.push({ name: 'Cerebellum', desc: 'Balance, coordination and fine motor timing.', points: pts,
          palette: ['#b46bff', '#ff6bf0'], explode: [0, -0.6, -0.9] });
      } else if (key === 'Stem') {
        parts.push({ name: 'Brain stem', desc: 'Breathing, heart rate and the link to the spinal cord.', points: pts,
          palette: ['#ff6b6b', '#ffb36b'], explode: [0, -1.1, 0] });
      } else {
        const [lobe, s] = key.split('|') as [Lobe, string];
        const side = Number(s);
        const L = LOBES[lobe];
        const explode: V3 = [L.dir[0] * side + side * 0.75, L.dir[1], L.dir[2]];
        parts.push({ name: `${lobe} lobe (${side < 0 ? 'L' : 'R'})`, desc: L.desc, points: pts,
          palette: [L.palette[0], L.palette[1]], explode });
      }
    }
    return parts;
  },
};
