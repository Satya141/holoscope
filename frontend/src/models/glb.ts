import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { area, merge } from './geo';
import type { ModelDef, PartDef, V3 } from './types';

const PALETTES: [string, string][] = [
  ['#38f4ff', '#2a7bff'], ['#ff5fb7', '#a06bff'], ['#ffd34d', '#ff8a3d'], ['#57ff9a', '#2fd0ff'],
  ['#ff6b6b', '#ffb36b'], ['#b46bff', '#ff6bf0'], ['#9ffcff', '#ffffff'], ['#ff9b2f', '#ff4f6d'],
];
const MAX_PARTS = 20;

/** Any glTF dropped at public/models/custom.glb becomes an explodable particle hologram. */
export async function customModel(): Promise<ModelDef | null> {
  const url = `${import.meta.env.BASE_URL}models/custom.glb`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    if (!r.ok || (r.headers.get('content-type') ?? '').includes('text/html')) return null;
  } catch {
    return null;
  }
  return {
    id: 'custom',
    name: 'Your Model',
    category: 'Custom',
    icon: '📦',
    desc: 'Loaded from public/models/custom.glb',
    points: 60000,
    view: { yaw: -0.6, pitch: 0.3 },
    async build() {
      const scene = (await new GLTFLoader().loadAsync(url)).scene;
      scene.updateMatrixWorld(true);
      const meshes: { name: string; geo: THREE.BufferGeometry; area: number }[] = [];
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', m.geometry.getAttribute('position').clone());
        if (m.geometry.index) g.setIndex(m.geometry.index.clone());
        g.applyMatrix4(m.matrixWorld);
        meshes.push({ name: m.name || m.parent?.name || 'Part', geo: g, area: area(g) });
      });
      meshes.sort((a, b) => b.area - a.area);
      const main = meshes.slice(0, MAX_PARTS - 1);
      const rest = meshes.slice(MAX_PARTS - 1);
      if (rest.length) main.push({ name: 'Other parts', geo: merge(rest.map((m) => m.geo)), area: 0 });

      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const reach = box.getSize(new THREE.Vector3()).length() * 0.35;
      return main.map((m, i): PartDef => {
        m.geo.computeBoundingBox();
        const dir = m.geo.boundingBox!.getCenter(new THREE.Vector3()).sub(center);
        if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
        return { name: m.name, desc: '', geometry: m.geo, palette: PALETTES[i % PALETTES.length],
          explode: dir.normalize().multiplyScalar(reach).toArray() as V3 };
      });
    },
  };
}
