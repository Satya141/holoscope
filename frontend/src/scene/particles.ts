import * as THREE from 'three';

/** Uniforms shared by every hologram material (one object each, so updates propagate). */
export interface Shared {
  uTime: { value: number };
  uPixelRatio: { value: number };
  uScanY: { value: number };
  uSize: { value: number };
}

export const createShared = (): Shared => ({
  uTime: { value: 0 }, uPixelRatio: { value: 1 }, uScanY: { value: -10 }, uSize: { value: 2.4 },
});

const VERT = /* glsl */ `
uniform float uTime, uSize, uPixelRatio, uAppear, uHighlight, uDim, uScanY;
attribute vec3 aColor;
attribute float aRand;
attribute vec3 aScatter;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // materialise: each particle flies in from its scatter position at a slightly different time
  float t = clamp((uAppear - aRand * 0.4) / 0.6, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(aScatter, position, t);
  p += 0.003 * vec3(sin(uTime * 1.7 + aRand * 40.0), cos(uTime * 1.3 + aRand * 25.0), sin(uTime * 1.1 + aRand * 60.0));

  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  float scan = exp(-pow((world.y - uScanY) * 3.0, 2.0));
  float twinkle = 0.88 + 0.12 * sin(uTime * 3.0 + aRand * 50.0);
  gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) * (1.0 + uHighlight * 0.7 + scan * 0.6) * (8.0 / -mv.z);

  vColor = aColor * (1.0 + uHighlight * 1.1 + scan * 1.6);
  vAlpha = 0.55 * twinkle * uDim * (0.15 + 0.85 * t) * smoothstep(0.0, 0.12, uAppear);
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.18, d);   // crisp dot with a solid core
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

export function holoMaterial(shared: Shared, appear: { value: number }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uAppear: appear, uHighlight: { value: 0 }, uDim: { value: 1 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Particle geometry with the attributes the hologram shader expects. */
export function makeCloud(pos: Float32Array, col: Float32Array): THREE.BufferGeometry {
  const n = pos.length / 3;
  const rand = new Float32Array(n);
  const scatter = new Float32Array(n * 3);
  const d = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    rand[i] = Math.random();
    d.randomDirection().multiplyScalar(2 + Math.random() * 4);
    scatter[i * 3] = pos[i * 3] * 1.6 + d.x;
    scatter[i * 3 + 1] = pos[i * 3 + 1] * 1.6 + d.y;
    scatter[i * 3 + 2] = pos[i * 3 + 2] * 1.6 + d.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  g.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  return g;
}

/** Two-colour gradient along the cloud's longest axis, with sparkle variation. */
export function gradientColors(pos: Float32Array, palette: [string, string]): Float32Array {
  const c1 = new THREE.Color(palette[0]), c2 = new THREE.Color(palette[1]), c = new THREE.Color();
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    const k = i % 3;
    if (pos[i] < min[k]) min[k] = pos[i];
    if (pos[i] > max[k]) max[k] = pos[i];
  }
  const ranges = max.map((m, k) => m - min[k]);
  const axis = ranges.indexOf(Math.max(...ranges));
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const t = ranges[axis] > 1e-6 ? (pos[i + axis] - min[axis]) / ranges[axis] : 0.5;
    c.copy(c1).lerp(c2, t * 0.7 + Math.random() * 0.3).multiplyScalar(0.75 + Math.random() * 0.5);
    out[i] = c.r; out[i + 1] = c.g; out[i + 2] = c.b;
  }
  return out;
}
