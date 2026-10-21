import type * as THREE from 'three';

export type V3 = [number, number, number];

export interface PartDef {
  name: string;
  desc: string;
  /** Surface to sample particles from (local coordinates). */
  geometry?: THREE.BufferGeometry;
  /** Or explicit particle positions (local coordinates). */
  points?: Float32Array;
  /** Optional per-particle colours matching `points`. */
  colors?: Float32Array;
  /** Relative particle density for sampled geometry (default 1). */
  weight?: number;
  palette: [string, string];
  position?: V3;
  rotation?: V3;
  /** Offset applied at 100% explode, in model units. */
  explode: V3;
  spin?: { axis: 'x' | 'y' | 'z'; speed: number };
  /** Outer casing: fades as the model explodes. */
  shell?: boolean;
}

export interface ModelDef {
  id: string;
  name: string;
  category: string;
  icon: string;
  desc: string;
  /** Particle budget for the whole model. */
  points: number;
  view: { yaw: number; pitch: number; roll?: number };
  build(): PartDef[] | Promise<PartDef[]>;
}
