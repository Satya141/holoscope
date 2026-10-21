// Copies the MediaPipe WASM runtime into public/ and downloads the hand-landmark model once,
// so the app runs fully offline after `npm install`.
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const wasmDst = join(root, 'public/mediapipe');
mkdirSync(wasmDst, { recursive: true });
cpSync(wasmSrc, wasmDst, { recursive: true });
console.log('[holoscope] MediaPipe WASM copied');

const model = join(root, 'public/models/hand_landmarker.task');
if (!existsSync(model) || statSync(model).size < 1_000_000) {
  mkdirSync(dirname(model), { recursive: true });
  console.log('[holoscope] downloading hand landmark model…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Model download failed: ${res.status}`);
  writeFileSync(model, Buffer.from(await res.arrayBuffer()));
  console.log('[holoscope] model saved');
}
