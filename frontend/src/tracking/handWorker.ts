// Runs MediaPipe hand detection off the main thread so rendering never waits on it.
import { FilesetResolver, HandLandmarker, type HandLandmarkerOptions } from '@mediapipe/tasks-vision';

export type ToWorker =
  | { type: 'init'; base: string }
  | { type: 'frame'; bitmap: ImageBitmap; ts: number };

export type FromWorker =
  | { type: 'ready'; delegate: string }
  | { type: 'error'; message: string }
  | { type: 'result'; ts: number; ms: number; hands: { label: string; pts: { x: number; y: number }[] }[] };

// (typed via the DOM lib to avoid pulling WebWorker globals into the whole project)
const post = (m: FromWorker) => (globalThis as unknown as Worker).postMessage(m);
let landmarker: HandLandmarker | null = null;

async function init(base: string) {
  const files = await FilesetResolver.forVisionTasks(`${base}mediapipe`, true);
  const opts = (delegate: 'GPU' | 'CPU'): HandLandmarkerOptions => ({
    baseOptions: { modelAssetPath: `${base}models/hand_landmarker.task`, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5,
  });
  // Warm up and time each delegate, then keep the faster one: on laptops where the browser runs on weak
  // integrated graphics, the CPU (XNNPACK) path can be several times faster than the GPU path.
  // The first inference compiles GPU shaders (~seconds), so this also hides that cost behind the loading screen.
  const gpu = await tryCreate(files, opts('GPU'));
  const gpuMs = gpu ? await timeIt(gpu) : Infinity;
  let delegate = 'GPU';
  landmarker = gpu;
  if (gpuMs > 25) {
    const cpu = await tryCreate(files, opts('CPU'));
    const cpuMs = cpu ? await timeIt(cpu) : Infinity;
    if (cpu && cpuMs < gpuMs) {
      gpu?.close();
      landmarker = cpu;
      delegate = 'CPU';
    } else cpu?.close();
  }
  if (!landmarker) throw new Error('hand tracker could not start on GPU or CPU');
  post({ type: 'ready', delegate });
}

async function tryCreate(files: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, o: HandLandmarkerOptions) {
  try { return await HandLandmarker.createFromOptions(files, o); } catch { return null; }
}

/** Median ms per inference over a few frames, after one untimed warm-up. Never throws. */
async function timeIt(lm: HandLandmarker): Promise<number> {
  try {
    const canvas = new OffscreenCanvas(640, 360);
    const g = canvas.getContext('2d')!;   // a canvas must be drawn on before it can become an ImageBitmap
    const times: number[] = [];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? '#404040' : '#505050';
      g.fillRect(0, 0, 640, 360);
      const bmp = await createImageBitmap(canvas);
      const t0 = performance.now();
      lm.detectForVideo(bmp, t0);
      if (i > 0) times.push(performance.now() - t0);
      bmp.close();
    }
    times.sort((a, b) => a - b);
    return times[times.length >> 1];
  } catch (err) {
    console.warn('[holoscope] tracker benchmark failed', err);
    return Infinity;
  }
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === 'init') {
    try { await init(m.base); } catch (err) { post({ type: 'error', message: (err as Error).message }); }
    return;
  }
  if (!landmarker) { m.bitmap.close(); return; }
  const t0 = performance.now();
  const res = landmarker.detectForVideo(m.bitmap, m.ts);
  m.bitmap.close();
  post({
    type: 'result',
    ts: m.ts,
    ms: performance.now() - t0,
    hands: res.landmarks.map((lms, i) => ({
      label: res.handedness[i]?.[0]?.categoryName ?? 'Hand',
      pts: lms.map((p) => ({ x: p.x, y: p.y })),
    })),
  });
};
