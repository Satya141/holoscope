import * as THREE from 'three';
import { alongX, alongZ, Helix, merge, tf } from './geo';
import type { ModelDef, PartDef } from './types';

function bodyShell() {
  const s = new THREE.Shape();
  s.moveTo(-2.15, 0.32);
  s.lineTo(-2.2, 0.62);
  s.quadraticCurveTo(-2.15, 0.82, -1.85, 0.84);
  s.lineTo(-1.0, 0.9);
  s.quadraticCurveTo(-0.65, 1.3, -0.3, 1.33);
  s.lineTo(0.5, 1.33);
  s.quadraticCurveTo(0.85, 1.3, 1.15, 0.95);
  s.lineTo(1.95, 0.82);
  s.quadraticCurveTo(2.25, 0.75, 2.22, 0.5);
  s.lineTo(2.15, 0.32);
  s.lineTo(1.78, 0.32);
  s.absarc(1.3, 0.32, 0.48, 0, Math.PI, false);   // front wheel arch
  s.lineTo(-0.82, 0.32);
  s.absarc(-1.3, 0.32, 0.48, 0, Math.PI, false);  // rear wheel arch
  s.lineTo(-2.15, 0.32);
  const win = new THREE.Path();
  win.moveTo(-0.9, 0.95);
  win.quadraticCurveTo(-0.6, 1.25, -0.3, 1.26);
  win.lineTo(0.45, 1.26);
  win.quadraticCurveTo(0.75, 1.23, 1.0, 0.96);
  win.lineTo(-0.9, 0.95);
  s.holes.push(win);
  return new THREE.ExtrudeGeometry(s, {
    depth: 1.5, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.08, bevelSegments: 4, curveSegments: 24,
  }).translate(0, 0, -0.75);
}

function wheel() {
  const spokes = Array.from({ length: 5 }, (_, i) => new THREE.BoxGeometry(0.035, 0.5, 0.035).rotateZ((i / 5) * Math.PI));
  return merge([
    new THREE.TorusGeometry(0.3, 0.1, 14, 44),
    alongZ(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16)),
    alongZ(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32)).translate(0, 0, -0.08),   // brake disc
    ...spokes,
  ]);
}

function v8() {
  const g: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.9, 0.35, 0.5), new THREE.BoxGeometry(0.8, 0.08, 0.16).translate(0, 0.42, 0)];
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    g.push(tf(new THREE.CylinderGeometry(0.085, 0.085, 0.34, 14), [-0.33 + i * 0.22, 0.3, side * 0.18], [side * 0.5, 0, 0]));
  }
  g.push(alongZ(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20)).translate(0.48, 0, 0.2));
  return merge(g);
}

function seats() {
  const g: THREE.BufferGeometry[] = [];
  for (const z of [-0.38, 0.38]) {
    g.push(tf(new THREE.BoxGeometry(0.5, 0.12, 0.42), [0, 0, z]));
    g.push(tf(new THREE.BoxGeometry(0.1, 0.55, 0.42), [-0.27, 0.3, z], [0, 0, 0.25]));
  }
  return merge(g);
}

function springs() {
  const g: THREE.BufferGeometry[] = [];
  for (const [x, z] of [[1.3, 0.55], [1.3, -0.55], [-1.3, 0.55], [-1.3, -0.55]]) {
    g.push(new THREE.TubeGeometry(new Helix(0.09, 0.42, 6), 140, 0.016, 6).translate(x, 0, z));
  }
  return merge(g);
}

export const sportsCar: ModelDef = {
  id: 'car',
  name: 'Sports Car',
  category: 'Vehicles',
  icon: '🏎️',
  desc: 'V8, drivetrain, suspension and cabin.',
  points: 58000,
  view: { yaw: -0.65, pitch: 0.32 },
  build() {
    const wheels: PartDef[] = ([[1.3, 0.82], [1.3, -0.82], [-1.3, 0.82], [-1.3, -0.82]] as const).map(([x, z]) => ({
      name: `${x > 0 ? 'Front' : 'Rear'} wheel ${z > 0 ? 'R' : 'L'}`,
      desc: 'Alloy rim, performance tyre and ventilated brake disc.',
      geometry: z > 0 ? wheel() : wheel().rotateY(Math.PI),
      position: [x, 0.4, z], explode: [x * 0.15, -0.25, z * 1.5],
      palette: ['#57ff9a', '#2fd0ff'], spin: { axis: 'z', speed: -3 },
    }));
    return [
      { name: 'Body shell', desc: 'Carbon-fibre body; aerodynamics keep the car pinned at speed.',
        geometry: bodyShell(), explode: [0, 2.0, 0], palette: ['#38f4ff', '#a06bff'], weight: 0.45, shell: true },
      ...wheels,
      { name: 'V8 engine', desc: 'Eight cylinders in two banks of four, at 90°.',
        geometry: v8(), position: [1.35, 0.68, 0], explode: [1.0, 1.4, 0], palette: ['#ff9b2f', '#ff4f6d'], weight: 2 },
      { name: 'Gearbox', desc: 'Transfers engine torque to the driveshaft through selectable ratios.',
        geometry: alongX(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 24, 4)), position: [0.55, 0.48, 0], explode: [0.3, -0.9, 0],
        palette: ['#ffd34d', '#ff9b2f'], weight: 2 },
      { name: 'Driveshaft', desc: 'Spinning shaft carrying power to the rear axle.',
        geometry: alongX(new THREE.CylinderGeometry(0.045, 0.045, 2.0, 10, 6)), position: [-0.6, 0.4, 0], explode: [0, -1.25, 0],
        palette: ['#ffffff', '#99ffff'], weight: 3 },
      { name: 'Seats', desc: 'Bucket seats mounted low for a lower centre of gravity.',
        geometry: seats(), position: [-0.35, 0.6, 0], explode: [0, 1.1, 0], palette: ['#ff5fb7', '#c45cff'] },
      { name: 'Steering wheel', desc: 'Steers the front wheels through the rack.',
        geometry: merge([new THREE.TorusGeometry(0.17, 0.025, 8, 32).rotateY(Math.PI / 2), alongX(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8)).translate(0.25, 0, 0)]),
        position: [0.3, 0.98, 0.38], rotation: [0, 0, 0.45], explode: [0.5, 1.4, 0.6], palette: ['#ffffff', '#ffd36b'], weight: 3 },
      { name: 'Suspension', desc: 'Coil-over springs and dampers keep the tyres on the road.',
        geometry: springs(), position: [0, 0.5, 0], explode: [0, -0.7, 0], palette: ['#b46bff', '#ff6bf0'], weight: 2 },
      { name: 'Exhaust', desc: 'Twin pipes carry burnt gases out of the back.',
        geometry: merge([alongX(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 12)).translate(0, 0, 0.25), alongX(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 12)).translate(0, 0, -0.25), new THREE.BoxGeometry(0.5, 0.18, 0.7).translate(-1.0, 0, 0)]),
        position: [-0.9, 0.24, 0], explode: [-1.0, -0.8, 0], palette: ['#ff6b6b', '#ffb36b'] },
      { name: 'Fuel tank', desc: 'Sits ahead of the rear axle for balance and crash safety.',
        geometry: new THREE.BoxGeometry(0.55, 0.25, 1.0, 4, 2, 6), position: [-1.55, 0.5, 0], explode: [-1.3, 0.3, 0], palette: ['#ffe14d', '#ffa13d'] },
      { name: 'Radiator', desc: 'Cools the engine coolant with air from the front grille.',
        geometry: new THREE.BoxGeometry(0.06, 0.4, 1.2, 1, 6, 16), position: [2.02, 0.55, 0], explode: [1.5, 0.1, 0], palette: ['#7ffcff', '#3f8bff'], weight: 1.5 },
    ];
  },
};
