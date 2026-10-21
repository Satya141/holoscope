import * as THREE from 'three';
import { area, sampleSurface } from '../models/geo';
import type { ModelDef, PartDef } from '../models/types';
import { gradientColors, holoMaterial, makeCloud, Shared } from './particles';

export interface PartRT {
  def: PartDef;
  points: THREE.Points;
  mat: THREE.ShaderMaterial;
  base: THREE.Vector3;
  dir: THREE.Vector3;
  drag: THREE.Vector3;
  dragTarget: THREE.Vector3;
  /** Centre of the part's particles, in its own local space. */
  center: THREE.Vector3;
  /** Subset of particle positions used for screen-space picking. */
  picks: Float32Array;
  hl: number;
  dim: number;
}

const FIT_SIZE = 3.7;
const v = new THREE.Vector3(), w = new THREE.Vector3();

/** One particle model: builds the clouds, explodes, highlights, picks and drags parts. */
export class Hologram {
  readonly group = new THREE.Group();
  /** Inner group that normalises the model's size and centre. */
  readonly fit = new THREE.Group();
  readonly parts: PartRT[] = [];
  readonly appear = { value: 0 };
  appearTarget = 1;
  explode = 0;
  explodeTarget = 0;
  intensity = 1;
  selected: PartRT | null = null;
  grabbed: PartRT | null = null;

  constructor(readonly model: ModelDef, defs: PartDef[], shared: Shared) {
    this.group.add(this.fit);
    const sampled = defs.filter((d) => !d.points && d.geometry);
    const fixed = defs.reduce((n, d) => n + (d.points ? d.points.length / 3 : 0), 0);
    const budget = Math.max(8000, model.points - fixed);
    const weights = sampled.map((d) => area(d.geometry!) * (d.weight ?? 1));
    const total = weights.reduce((a, b) => a + b, 0) || 1;

    for (const def of defs) {
      let pos: Float32Array;
      if (def.points) pos = def.points;
      else {
        const share = weights[sampled.indexOf(def)] / total;
        pos = sampleSurface(def.geometry!, Math.max(400, Math.round(budget * share)));
        def.geometry!.dispose();
      }
      const mat = holoMaterial(shared, this.appear);
      const points = new THREE.Points(makeCloud(pos, def.colors ?? gradientColors(pos, def.palette)), mat);
      points.frustumCulled = false;
      if (def.position) points.position.set(...def.position);
      if (def.rotation) points.rotation.set(...def.rotation);
      points.geometry.computeBoundingBox();
      const n = pos.length / 3, step = Math.max(1, Math.floor(n / 160));
      const picks = new Float32Array(Math.ceil(n / step) * 3);
      for (let i = 0, j = 0; i < n; i += step, j += 3) picks.set(pos.subarray(i * 3, i * 3 + 3), j);
      this.parts.push({
        def, points, mat,
        base: points.position.clone(),
        dir: new THREE.Vector3(...def.explode),
        drag: new THREE.Vector3(), dragTarget: new THREE.Vector3(),
        center: points.geometry.boundingBox!.getCenter(new THREE.Vector3()),
        picks, hl: 0, dim: 1,
      });
      this.fit.add(points);
    }

    this.fit.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.fit);
    const size = box.getSize(v);
    const s = FIT_SIZE / Math.max(size.x, size.y, size.z);
    this.fit.scale.setScalar(s);
    this.fit.position.copy(box.getCenter(w)).multiplyScalar(-s);
  }

  get gone() { return this.appearTarget === 0 && this.appear.value <= 0.001; }

  update(dt: number) {
    const k = 1 - Math.pow(0.001, dt);
    this.explode += (this.explodeTarget - this.explode) * (1 - Math.pow(0.003, dt));
    const a = this.appear;
    a.value = this.appearTarget > a.value ? Math.min(1, a.value + dt / 1.4) : Math.max(0, a.value - dt / 0.7);

    for (const p of this.parts) {
      const focus = p === this.selected || p === this.grabbed;
      const anyFocus = this.selected || this.grabbed;
      p.hl += ((focus ? 1 : 0) - p.hl) * k;
      p.dim += ((anyFocus && !focus ? 0.28 : 1) - p.dim) * k;
      p.mat.uniforms.uHighlight.value = p.hl;
      p.mat.uniforms.uDim.value = p.dim * (p.def.shell ? 1 - this.explode * 0.6 : 1);
      p.drag.lerp(p.dragTarget, 1 - Math.pow(0.0005, dt));
      p.points.position.copy(p.base).addScaledVector(p.dir, this.explode * this.intensity).add(p.drag);
      if (p.def.spin) p.points.rotation[p.def.spin.axis] += p.def.spin.speed * dt;
    }
  }

  private toScreen(world: THREE.Vector3, camera: THREE.Camera, W: number, H: number) {
    world.project(camera);
    return { x: (world.x + 1) / 2 * W, y: (1 - world.y) / 2 * H, visible: world.z < 1 };
  }

  screenOf(p: PartRT, camera: THREE.Camera, W: number, H: number) {
    return this.toScreen(p.points.localToWorld(v.copy(p.center)), camera, W, H);
  }

  originOnScreen(camera: THREE.Camera, W: number, H: number) {
    return this.toScreen(this.group.getWorldPosition(v), camera, W, H);
  }

  /** Part whose particles are closest to a screen point, within `radius` px. */
  pickAt(x: number, y: number, camera: THREE.Camera, W: number, H: number, radius: number): PartRT | null {
    let best: PartRT | null = null, bestD = radius;
    for (const p of this.parts) {
      const m = p.points.matrixWorld;
      const penalty = p.def.shell ? 20 + this.explode * 60 : 0;   // prefer inner parts over the casing
      for (let i = 0; i < p.picks.length; i += 3) {
        v.fromArray(p.picks, i).applyMatrix4(m).project(camera);
        if (v.z > 1) continue;
        const d = Math.hypot((v.x + 1) / 2 * W - x, (1 - v.y) / 2 * H - y) + penalty;
        if (d < bestD) { bestD = d; best = p; }
      }
    }
    return best;
  }

  /** Pull a part so its centre sits under the given screen point (at its current depth). */
  dragPartTo(p: PartRT, x: number, y: number, camera: THREE.Camera, W: number, H: number) {
    const ndcZ = p.points.localToWorld(v.copy(p.center)).project(camera).z;
    const target = this.fit.worldToLocal(w.set((x / W) * 2 - 1, -(y / H) * 2 + 1, ndcZ).unproject(camera));
    const rest = v.copy(p.center).applyEuler(p.points.rotation).add(p.base).addScaledVector(p.dir, this.explode * this.intensity);
    p.dragTarget.copy(target).sub(rest);
  }

  release(p: PartRT) { p.dragTarget.set(0, 0, 0); }

  dispose() {
    for (const p of this.parts) { p.points.geometry.dispose(); p.mat.dispose(); }
    this.group.removeFromParent();
  }
}
