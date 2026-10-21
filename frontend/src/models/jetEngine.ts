import * as THREE from 'three';
import { alongX, bladedDisc, merge } from './geo';
import type { ModelDef } from './types';

/** Several rotor stages side by side along X. */
const stages = (radii: number[], gap: number, chord: number) =>
  merge(radii.map((r, i) =>
    bladedDisc(r, r * 0.34, 30 - i * 2, chord, 0.7).translate((i - (radii.length - 1) / 2) * gap, 0, 0)));

function nacelle(upper: boolean) {
  // CylinderGeometry theta runs around Y; after alongX, theta in (π, 2π) is the upper half.
  const shell = alongX(new THREE.CylinderGeometry(1.02, 1.02, 3.2, 72, 14, true, upper ? Math.PI : 0, Math.PI));
  const lip = new THREE.TorusGeometry(1.02, 0.07, 10, 48, Math.PI).rotateY(Math.PI / 2);
  if (!upper) lip.rotateX(Math.PI);
  return merge([shell, lip.translate(-1.6, 0, 0)]);
}

export const jetEngine: ModelDef = {
  id: 'jet',
  name: 'Turbofan Jet Engine',
  category: 'Machines',
  icon: '✈️',
  desc: 'Air in, thrust out — every stage of a turbofan.',
  points: 80000,
  view: { yaw: -0.75, pitch: 0.3 },
  build() {
    const fan = merge([
      bladedDisc(0.95, 0.27, 22, 0.24, 0.55),
      new THREE.ConeGeometry(0.27, 0.45, 32, 4, true).rotateZ(Math.PI / 2).translate(-0.26, 0, 0),
    ]);
    const injectors = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return alongX(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6)).translate(-0.2, Math.cos(a) * 0.42, Math.sin(a) * 0.42);
    });
    const combustor = merge([new THREE.TorusGeometry(0.42, 0.11, 14, 56).rotateY(Math.PI / 2), ...injectors]);
    const nozzle = merge([
      alongX(new THREE.CylinderGeometry(0.5, 0.74, 0.7, 56, 6, true)),
      alongX(new THREE.ConeGeometry(0.3, 0.7, 32, 4, true)).translate(0.35, 0, 0),
    ]);

    return [
      { name: 'Fan', desc: 'The big front fan pulls in air; most of it bypasses the core and makes ~80% of the thrust.',
        geometry: fan, position: [-1.55, 0, 0], explode: [-2.3, 0, 0], palette: ['#9ffcff', '#38c8ff'], spin: { axis: 'x', speed: 5 } },
      { name: 'Low-pressure compressor', desc: 'First compressor stages start squeezing the core airflow.',
        geometry: stages([0.62, 0.6, 0.58, 0.56], 0.16, 0.12), position: [-0.85, 0, 0], explode: [-1.5, 0, 0],
        palette: ['#3fa9ff', '#6b7bff'], spin: { axis: 'x', speed: 3 } },
      { name: 'High-pressure compressor', desc: 'Many small stages raise the pressure ~40× before combustion.',
        geometry: stages([0.46, 0.44, 0.42, 0.4, 0.38, 0.36], 0.1, 0.08), position: [-0.15, 0, 0], explode: [-0.7, 0, 0],
        palette: ['#7a5cff', '#c45cff'], spin: { axis: 'x', speed: 4 } },
      { name: 'Combustor', desc: 'Fuel sprays into the compressed air and burns at ~2000 °C.',
        geometry: combustor, position: [0.5, 0, 0], explode: [0, 1.15, 0], palette: ['#ff4fd8', '#ff7a3d'] },
      { name: 'High-pressure turbine', desc: 'Pulls energy from the hot gas to drive the high-pressure compressor.',
        geometry: stages([0.44, 0.46], 0.12, 0.1), position: [0.9, 0, 0], explode: [0.7, 0, 0],
        palette: ['#ff8a3d', '#ff4f4f'], spin: { axis: 'x', speed: 4 } },
      { name: 'Low-pressure turbine', desc: 'Drives the fan through the core shaft.',
        geometry: stages([0.52, 0.56, 0.6], 0.13, 0.11), position: [1.3, 0, 0], explode: [1.45, 0, 0],
        palette: ['#ffd34d', '#ff9b2f'], spin: { axis: 'x', speed: 3 } },
      { name: 'Exhaust nozzle', desc: 'Accelerates the hot core flow out of the back.',
        geometry: nozzle, position: [1.95, 0, 0], explode: [2.3, 0, 0], palette: ['#ffe68a', '#ff7a59'] },
      { name: 'Core shaft', desc: 'One spinning spine: the turbines at the rear turn the fan up front.',
        geometry: alongX(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 12, 8)), position: [0.15, 0, 0], explode: [0, -1.35, 0],
        palette: ['#ffffff', '#99ffff'], weight: 3 },
      { name: 'Nacelle (upper)', desc: 'Aerodynamic outer casing that ducts the bypass air.',
        geometry: nacelle(true), position: [0.05, 0, 0], explode: [0, 1.7, 0], palette: ['#38f4ff', '#2a7bff'], weight: 0.35, shell: true },
      { name: 'Nacelle (lower)', desc: 'Aerodynamic outer casing that ducts the bypass air.',
        geometry: nacelle(false), position: [0.05, 0, 0], explode: [0, -1.7, 0], palette: ['#38f4ff', '#2a7bff'], weight: 0.35, shell: true },
    ];
  },
};
