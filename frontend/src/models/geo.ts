import * as THREE from 'three';
import type { V3 } from './types';

export function tf(g: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: number | V3 = 1) {
  const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  return g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), q, s));
}

/** Turn a Y-axis primitive (cylinder, cone) so its axis runs along +X. */
export const alongX = <G extends THREE.BufferGeometry>(g: G) => g.rotateZ(-Math.PI / 2);
/** Turn a Y-axis primitive so its axis runs along +Z. */
export const alongZ = <G extends THREE.BufferGeometry>(g: G) => g.rotateX(Math.PI / 2);

function positions(g: THREE.BufferGeometry): ArrayLike<number> {
  return (g.index ? g.toNonIndexed() : g).getAttribute('position').array;
}

/** Concatenate triangle soups (position only). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const arrays = gs.map(positions);
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  gs.forEach((g) => g.dispose());
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  return g;
}

const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
const AB = new THREE.Vector3(), AC = new THREE.Vector3();

function triAreas(a: ArrayLike<number>): { cum: Float32Array; total: number } {
  const tris = Math.floor(a.length / 9);
  const cum = new Float32Array(tris);
  let total = 0;
  for (let i = 0; i < tris; i++) {
    A.fromArray(a, i * 9); B.fromArray(a, i * 9 + 3); C.fromArray(a, i * 9 + 6);
    total += AB.subVectors(B, A).cross(AC.subVectors(C, A)).length() * 0.5;
    cum[i] = total;
  }
  return { cum, total };
}

export const area = (g: THREE.BufferGeometry) => triAreas(positions(g)).total;

/** Area-weighted uniform random points on a mesh surface. */
export function sampleSurface(g: THREE.BufferGeometry, count: number): Float32Array {
  const a = positions(g);
  const { cum, total } = triAreas(a);
  const out = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    const r = Math.random() * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
    A.fromArray(a, lo * 9); B.fromArray(a, lo * 9 + 3); C.fromArray(a, lo * 9 + 6);
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    out[k * 3] = A.x + (B.x - A.x) * u + (C.x - A.x) * v;
    out[k * 3 + 1] = A.y + (B.y - A.y) * u + (C.y - A.y) * v;
    out[k * 3 + 2] = A.z + (B.z - A.z) * u + (C.z - A.z) * v;
  }
  return out;
}

/** Rotor disc on the X axis: hub plus twisted blades. */
export function bladedDisc(radius: number, hub: number, blades: number, chord: number, twist: number, thick = 0.02) {
  const parts: THREE.BufferGeometry[] = [alongX(new THREE.CylinderGeometry(hub, hub, chord * 1.2, 32, 1))];
  const len = radius - hub;
  for (let i = 0; i < blades; i++) {
    const b = new THREE.BoxGeometry(chord, len, thick);
    b.rotateY(twist);
    b.translate(0, hub + len / 2, 0);
    b.rotateX((i / blades) * Math.PI * 2);
    parts.push(b);
  }
  return merge(parts);
}

export class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(public radius: number, public height: number, public turns: number, public phase = 0) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2 + this.phase;
    return target.set(Math.cos(a) * this.radius, (t - 0.5) * this.height, Math.sin(a) * this.radius);
  }
}

/** Cylinder spanning two points. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, dir.length(), seg, 2, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/** Random points in a spherical shell; hemi = 1 north only, -1 south only, 0 both. */
export function sphereCloud(n: number, rMin: number, rMax: number, hemi: -1 | 0 | 1 = 0): Float32Array {
  const out = new Float32Array(n * 3);
  const d = new THREE.Vector3();
  const r0 = rMin ** 3, r1 = rMax ** 3;
  for (let i = 0; i < n; i++) {
    d.randomDirection();
    if (hemi && Math.sign(d.y) !== hemi) d.y = -d.y;
    const r = Math.cbrt(r0 + Math.random() * (r1 - r0));
    out[i * 3] = d.x * r; out[i * 3 + 1] = d.y * r; out[i * 3 + 2] = d.z * r;
  }
  return out;
}

export function concat(...arrays: Float32Array[]): Float32Array {
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}
