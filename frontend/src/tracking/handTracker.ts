import { OneEuro } from './oneEuro';
import type { FromWorker, ToWorker } from './handWorker';

export interface Pt { x: number; y: number }
export interface RawHand { id: string; pts: Pt[] }

const BASE = new URL(import.meta.env.BASE_URL, location.href).href;
/** Width of the frame sent to the tracker; smaller = faster detection, same accuracy for hands at arm's length. */
const TRACK_WIDTH = 640;
/** Fraction of the measured pipeline delay to predict ahead (0 = none, 1 = full). */
const PREDICT = 0.8;
const MAX_LEAD_MS = 70;

type Result = Extract<FromWorker, { type: 'result' }>;

/**
 * Webcam + MediaPipe hand landmarks. Detection runs in a Web Worker on downscaled frames;
 * results come back as smoothed, latency-compensated points in (mirrored) screen pixels.
 */
export class HandTracker {
  private worker: Worker | null = null;
  private video: HTMLVideoElement | null = null;
  private busy = false;
  private lastTime = -1;
  private sentAt = 0;
  private fresh: Result | null = null;
  private filters = new Map<string, OneEuro[]>();
  ready = false;
  delegate = '';
  /** Diagnostics: tracked frames per second, detection time and full camera→result delay (ms). */
  camFps = 0;
  detectMs = 0;
  latencyMs = 0;
  private frameCount = 0;
  /** Set if this browser can't downscale video into an ImageBitmap; we then send full frames. */
  private noResize = false;
  private frameWindow = 0;

  async startCamera(video: HTMLVideoElement) {
    this.video = video;
    (video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 60 }, facingMode: 'user' },
      audio: false,
    });
    await video.play();
  }

  loadModel(): Promise<void> {
    if (this.worker) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const w = new Worker(new URL('./handWorker.ts', import.meta.url), { type: 'module' });
      const failInit = (msg: string) => { w.terminate(); reject(new Error(msg)); };
      w.onerror = (e) => failInit(e.message || 'tracking worker failed');
      w.onmessage = (e: MessageEvent<FromWorker>) => {
        const m = e.data;
        if (m.type === 'ready') { this.ready = true; this.delegate = m.delegate; this.worker = w; resolve(); }
        else if (m.type === 'error') failInit(m.message);
        else this.onResult(m);
      };
      w.postMessage({ type: 'init', base: BASE } satisfies ToWorker);
    });
  }

  private onResult(m: Result) {
    this.busy = false;
    const now = performance.now();
    this.detectMs += (m.ms - this.detectMs) * 0.15;
    this.latencyMs += (now - this.sentAt - this.latencyMs) * 0.15;
    this.fresh = m;
    this.frameCount++;
    if (now - this.frameWindow > 1000) {
      this.camFps = (this.frameCount * 1000) / (now - this.frameWindow);
      this.frameCount = 0;
      this.frameWindow = now;
    }
  }

  /** Call every animation frame: feeds the worker and returns new hands when a result has arrived. */
  detect(now: number): RawHand[] | null {
    const v = this.video;
    if (!this.worker || !v || v.readyState < 2) return null;

    if (!this.busy && v.currentTime !== this.lastTime) {
      this.lastTime = v.currentTime;
      this.busy = true;
      this.sentAt = performance.now();
      const h = Math.round((TRACK_WIDTH * v.videoHeight) / v.videoWidth);
      const grab = this.noResize
        ? createImageBitmap(v)
        : createImageBitmap(v, { resizeWidth: TRACK_WIDTH, resizeHeight: h, resizeQuality: 'low' })
            .catch((e) => { console.warn('[holoscope] resized capture failed, using full frames', e); this.noResize = true; return createImageBitmap(v); });
      grab
        .then((bitmap) => this.worker!.postMessage({ type: 'frame', bitmap, ts: performance.now() } satisfies ToWorker, [bitmap]))
        .catch((e) => { console.warn('[holoscope] frame capture failed', e); this.busy = false; });
    }

    const r = this.fresh;
    if (!r) return null;
    this.fresh = null;

    // normalised video coords → screen px, matching the mirrored cover-fit camera background
    const W = innerWidth, H = innerHeight, vw = v.videoWidth, vh = v.videoHeight;
    const s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    const lead = Math.min(MAX_LEAD_MS, this.latencyMs * PREDICT) / 1000;

    const seen = new Set<string>();
    const hands = r.hands.map(({ label, pts }, i) => {
      const id = seen.has(label) ? label + i : label;
      seen.add(id);
      let f = this.filters.get(id);
      if (!f) this.filters.set(id, (f = Array.from({ length: 42 }, () => new OneEuro())));
      return {
        id,
        pts: pts.map((p, j) => {
          const fx = f![j * 2], fy = f![j * 2 + 1];
          const x = fx.filter(W - (ox + p.x * vw * s), now), y = fy.filter(oy + p.y * vh * s, now);
          return { x: x + fx.dx * lead, y: y + fy.dx * lead };   // predict where the hand is *now*
        }),
      };
    });
    for (const id of this.filters.keys()) if (!seen.has(id)) this.filters.delete(id);
    return hands;
  }
}
