import * as THREE from 'three';
import { concat, merge, sampleSurface, sphereCloud } from './geo';
import type { ModelDef, PartDef } from './types';

const OCEAN = new THREE.Color('#1f6bff'), LAND = new THREE.Color('#57ff9a'), ICE = new THREE.Color('#e8ffff');

/** Cheap procedural continents. */
function crustColors(p: Float32Array): Float32Array {
  const out = new Float32Array(p.length);
  const c = new THREE.Color();
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i] / 1.5, y = p[i + 1] / 1.5, z = p[i + 2] / 1.5;
    const n = Math.sin(3.1 * x + 1.3) * Math.sin(2.7 * y + 0.4) + Math.sin(4.3 * z - 0.7) * 0.6 + Math.sin(5.9 * (x + z)) * 0.25;
    c.copy(Math.abs(y) > 0.88 ? ICE : n > 0.35 ? LAND : OCEAN).multiplyScalar(0.7 + Math.random() * 0.5);
    out[i] = c.r; out[i + 1] = c.g; out[i + 2] = c.b;
  }
  return out;
}

function orbit(): Float32Array {
  const ring = new Float32Array(2600 * 3);
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * Math.PI * 2;
    ring[i * 3] = Math.cos(a) * 2.2; ring[i * 3 + 1] = (Math.random() - 0.5) * 0.01; ring[i * 3 + 2] = Math.sin(a) * 2.2;
  }
  const sat = merge([
    new THREE.BoxGeometry(0.12, 0.08, 0.08),
    new THREE.BoxGeometry(0.02, 0.06, 0.5).translate(0, 0, 0.32),
    new THREE.BoxGeometry(0.02, 0.06, 0.5).translate(0, 0, -0.32),
  ]).translate(2.2, 0, 0);
  return concat(ring, sampleSurface(sat, 1600));
}

export const earth: ModelDef = {
  id: 'earth',
  name: 'Planet Earth',
  category: 'Space',
  icon: '🌍',
  desc: 'Crust, mantle, outer and inner core.',
  points: 75000,
  view: { yaw: 0.4, pitch: 0.35 },
  build() {
    const halves = (north: boolean): PartDef[] => {
      const h = north ? 1 : -1, tag = north ? 'north' : 'south';
      const crust = sphereCloud(14000, 1.5, 1.5, h);
      return [
        { name: `Crust (${tag})`, desc: 'Thin rocky skin of continents and ocean floor, 5–70 km thick.',
          points: crust, colors: crustColors(crust), palette: ['#57ff9a', '#1f6bff'], explode: [0, 1.4 * h, 0], spin: { axis: 'y', speed: 0.12 } },
        { name: `Mantle (${tag})`, desc: 'Hot, slowly flowing rock — 84% of Earth\'s volume.',
          points: concat(sphereCloud(6000, 1.38, 1.38, h), sphereCloud(4000, 0.7, 1.36, h)),
          palette: ['#ff5a3d', '#b0306a'], explode: [0, 0.85 * h, 0] },
        { name: `Outer core (${tag})`, desc: 'Liquid iron whose currents generate Earth\'s magnetic field.',
          points: concat(sphereCloud(2400, 0.64, 0.64, h), sphereCloud(2200, 0.4, 0.62, h)),
          palette: ['#ffb347', '#ff6a1f'], explode: [0, 0.42 * h, 0] },
      ];
    };
    return [
      ...halves(true),
      ...halves(false),
      { name: 'Inner core', desc: 'Solid iron–nickel ball at ~5,400 °C — as hot as the Sun\'s surface.',
        points: sphereCloud(4500, 0, 0.36), palette: ['#fff3a0', '#ffb020'], explode: [0, 0, 0] },
      { name: 'Satellite orbit', desc: 'Low Earth orbit, ~400 km up — the ISS laps the planet every 92 minutes.',
        points: orbit(), palette: ['#ffffff', '#9fdcff'], rotation: [0.35, 0, 0.2], explode: [0, 0, 0], spin: { axis: 'y', speed: 0.5 } },
    ];
  },
};
