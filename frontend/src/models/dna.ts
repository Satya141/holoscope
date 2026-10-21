import * as THREE from 'three';
import { Helix, merge, rod } from './geo';
import type { ModelDef } from './types';

const SEQ = 'ATGCGTACCGATTGCAGTCAAGCTTGCATG';

export const dna: ModelDef = {
  id: 'dna',
  name: 'DNA Double Helix',
  category: 'Biology',
  icon: '🧬',
  desc: 'Two backbones zipped together by base pairs.',
  points: 65000,
  view: { yaw: 0, pitch: 0.15 },
  build() {
    const a = new Helix(0.7, 4.6, 2.2, 0), b = new Helix(0.7, 4.6, 2.2, Math.PI * 0.8);
    const at: THREE.BufferGeometry[] = [], gc: THREE.BufferGeometry[] = [];
    const n = SEQ.length;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const pa = a.getPoint(t), pb = b.getPoint(t);
      const base = SEQ[i];
      (base === 'A' || base === 'T' ? at : gc).push(rod(pa, pb, 0.04, 8));
    }
    return [
      { name: 'Backbone strand 1', desc: 'Sugar–phosphate chain, read 5′ → 3′.',
        geometry: new THREE.TubeGeometry(a, 500, 0.07, 8), explode: [-1.0, 0, 0], palette: ['#38f4ff', '#2a7bff'] },
      { name: 'Backbone strand 2', desc: 'Complementary chain running the opposite direction.',
        geometry: new THREE.TubeGeometry(b, 500, 0.07, 8), explode: [1.0, 0, 0], palette: ['#ff5fb7', '#a06bff'] },
      { name: 'A–T base pairs', desc: 'Adenine pairs with thymine through two hydrogen bonds.',
        geometry: merge(at), explode: [0, 0, 0.6], palette: ['#ffd34d', '#ff8a3d'], weight: 1.6 },
      { name: 'G–C base pairs', desc: 'Guanine pairs with cytosine through three hydrogen bonds — a stronger link.',
        geometry: merge(gc), explode: [0, 0, -0.6], palette: ['#57ff9a', '#2fd0ff'], weight: 1.6 },
    ];
  },
};
