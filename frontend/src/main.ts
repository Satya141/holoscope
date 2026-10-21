import { DEMO } from './demoSeed';
import './style.css';
import { customModel, MODELS } from './models';
import type { ModelDef } from './models/types';
import { Hologram } from './scene/hologram';
import { Stage } from './scene/stage';
import { Controller } from './tracking/controller';
import { GestureClassifier, type HandPose } from './tracking/gestures';
import { HandTracker } from './tracking/handTracker';
import { Capture } from './ui/capture';
import { Overlay, type Label } from './ui/overlay';
import { Panel, type TrackState } from './ui/panel';
import type { Visual } from './tracking/controller';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const video = $<HTMLVideoElement>('video');
const stage = new Stage($<HTMLCanvasElement>('gl'));
const overlay = new Overlay($<HTMLCanvasElement>('overlay'));
const capture = new Capture(stage.renderer.domElement, overlay.canvas);
stage.attachVideo(video);
const panel = new Panel();
const tracker = new HandTracker();
const classifier = new GestureClassifier();

const models: ModelDef[] = [...MODELS];
let index = 0;
let holo: Hologram | null = null;
const fading: Hologram[] = [];
let loadToken = 0;
let intensity = 1;
let hands: HandPose[] = [];
let trackState: TrackState = 'loading';
let lastInteract = 0;

const controller = new Controller(stage, () => holo, () => setModel(index + 1, true));

/* ---------------- models ---------------- */
async function setModel(i: number, announce = false) {
  index = (i + models.length) % models.length;
  const token = ++loadToken;
  const model = models[index];
  panel.setModel(index, model);
  const defs = await model.build();
  if (token !== loadToken) return;
  if (holo) {
    holo.appearTarget = 0;
    holo.selected = holo.grabbed = null;
    fading.push(holo);
  }
  holo = new Hologram(model, defs, stage.shared);
  holo.intensity = intensity;
  stage.turn.add(holo.group);
  stage.setView(model.view);
  panel.setPartCount(holo.parts.length);
  if (announce) panel.toast(`${model.icon}  ${model.name}`);
}

panel.setModels(models);
panel.onModel = (i) => setModel(i);
panel.onExplode = (v) => { if (holo) holo.explodeTarget = v; };
panel.onIntensity = (v) => { intensity = v; if (holo) holo.intensity = v; };
if (!DEMO) setModel(0);
if (!DEMO) customModel().then((m) => {
  if (!m) return;
  models.push(m);
  panel.setModels(models);
  panel.setModel(index, models[index]);
});

/* ---------------- camera + tracking ---------------- */
const splash = $('splash'), splashMsg = $('splashMsg'), splashSkip = $('splashSkip');
const splashRetry = $('splashRetry');
splashSkip.onclick = () => splash.classList.add('gone');
splashRetry.onclick = () => boot();

const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: 'Camera permission is blocked. Click the camera icon in the address bar → Allow, then Retry.',
  NotReadableError: 'The camera is busy — close other tabs or apps using it (another Holoscope tab, Zoom, Teams…), then Retry.',
  NotFoundError: 'No camera found. Plug one in, then Retry.',
  OverconstrainedError: 'This camera doesn\'t support the requested mode. Retry, or try another camera.',
};

function fail(msg: string) {
  splash.classList.remove('gone');
  splashMsg.textContent = msg;
  splashSkip.classList.remove('hidden');
  splashRetry.classList.remove('hidden');
}

async function boot() {
  splashSkip.classList.add('hidden');
  splashRetry.classList.add('hidden');
  splashMsg.textContent = 'Starting camera…';
  try {
    await tracker.startCamera(video);
  } catch (e) {
    const err = e as DOMException;
    console.error('[holoscope] camera:', err);
    trackState = 'off';
    return fail(CAMERA_ERRORS[err.name] ?? `Camera error: ${err.name} — ${err.message}`);
  }
  splashMsg.textContent = 'Loading hand tracking…';
  try {
    await tracker.loadModel();
  } catch (e) {
    console.error('[holoscope] hand model:', e);
    trackState = 'off';
    return fail(`Camera is on, but hand tracking failed to start: ${(e as Error).message}. Click Retry — if it keeps failing, send this message to the developer.`);
  }
  splash.classList.add('gone');
  trackState = 'search';
  panel.toast('✋  Show your hand to the camera');
}
if (!DEMO) boot();

/* ---------------- tools + keyboard ---------------- */
let recTimer = 0;
function toggleRec() {
  const btn = $('tRec'), badge = $('recBadge');
  if (capture.recording) {
    capture.stop();
    clearInterval(recTimer);
    btn.classList.remove('on');
    badge.classList.add('hidden');
    panel.toast('🎬  Recording saved to Downloads');
    return;
  }
  const ext = capture.start();
  btn.classList.add('on');
  badge.classList.remove('hidden');
  recTimer = window.setInterval(() => {
    const s = Math.floor((performance.now() - capture.startedAt) / 1000);
    $('recTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 250);
  panel.toast(`Recording ${ext.toUpperCase()} — press V to stop`);
}
const toggleCam = () => {
  stage.videoOn = !stage.videoOn;
  $('tCam').classList.toggle('on', !stage.videoOn);
};
const togglePyramid = () => {
  stage.pyramid = !stage.pyramid;
  $('tPyr').classList.toggle('on', stage.pyramid);
  document.body.classList.toggle('clean', stage.pyramid);
  panel.toast(stage.pyramid ? 'Pyramid mode — put a Pepper\'s-ghost pyramid on the centre (P to exit)' : 'Pyramid mode off');
};
const toggleUi = () => document.body.classList.toggle('clean');
const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
const shot = () => capture.screenshot().then(() => panel.toast('📸  Screenshot saved'));
const reset = () => { stage.reset(models[index].view); if (holo) holo.explodeTarget = 0; };

$('tShot').onclick = shot;
$('tRec').onclick = toggleRec;
$('tCam').onclick = toggleCam;
$('tPyr').onclick = togglePyramid;
$('tUi').onclick = toggleUi;
$('tFull').onclick = toggleFull;

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowright') setModel(index + 1, true);
  else if (k === 'arrowleft') setModel(index - 1, true);
  else if (k === 'e' && holo) holo.explodeTarget = holo.explodeTarget > 0.5 ? 0 : 1;
  else if (k === 'r') reset();
  else if (k === 's') shot();
  else if (k === 'v') toggleRec();
  else if (k === 'c') toggleCam();
  else if (k === 'p') togglePyramid();
  else if (k === 'h') toggleUi();
  else if (k === 'f') toggleFull();
});

/* ---------------- mouse fallback ---------------- */
const gl = stage.renderer.domElement;
let drag: { x: number; y: number; moved: boolean } | null = null;
gl.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; lastInteract = performance.now(); });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  stage.target.yaw += dx * 0.008;
  stage.target.pitch += dy * 0.006;
  drag.x = e.clientX; drag.y = e.clientY;
  lastInteract = performance.now();
});
addEventListener('pointerup', (e) => {
  if (drag && !drag.moved && holo) holo.selected = holo.pickAt(e.clientX, e.clientY, stage.camera, innerWidth, innerHeight, 40);
  drag = null;
});
gl.addEventListener('wheel', (e) => {
  stage.target.zoom *= e.deltaY > 0 ? 0.92 : 1.08;
  lastInteract = performance.now();
}, { passive: true });

/* ---------------- frame loop ---------------- */
let lowFps = 0;
let last = DEMO ? 0 : performance.now(), fps = 0, fpsAcc = 0, fpsN = 0, uiAt = 0;
let demoVisual: Visual = {};

function labels(h: Hologram): { list: Label[]; alpha: number } {
  const W = innerWidth, H = innerHeight;
  const alpha = Math.min(1, Math.max(0, (h.explode - 0.3) / 0.25)) * Math.min(1, h.appear.value);
  const focus = h.grabbed ?? h.selected;
  if ((alpha <= 0.01 && !focus) || stage.pyramid) return { list: [], alpha };
  const o = h.originOnScreen(stage.camera, W, H);
  const list: Label[] = [];
  for (const p of h.parts) {
    if (alpha <= 0.01 && p !== focus) continue;
    const s = h.screenOf(p, stage.camera, W, H);
    if (s.visible) list.push({ x: s.x, y: s.y, cx: o.x, cy: o.y, name: p.def.name, strong: p === focus });
  }
  return { list, alpha };
}

function step(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) {
    fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    lowFps = fps < 40 ? lowFps + 1 : 0;
    if (!DEMO && lowFps >= 4 && stage.quality > 0.6) {   // ~2 s below 40 fps → render at lower resolution
      stage.quality = Math.max(0.6, stage.quality - 0.2);
      stage.resize();
      lowFps = 0;
    }
  }

  const raw = tracker.detect(now);
  if (raw) {
    hands = classifier.classify(raw);
    controller.update(hands, now);
    if (hands.length) lastInteract = now;
    if (trackState !== 'off') trackState = hands.length ? 'on' : 'search';
  }
  if (!DEMO) stage.autoRotate = !drag && now - lastInteract > 2500;

  const t = now / 1000;
  stage.update(dt, t);
  holo?.update(dt);
  for (let i = fading.length - 1; i >= 0; i--) {
    fading[i].update(dt);
    if (fading[i].gone) { fading[i].dispose(); fading.splice(i, 1); }
  }
  stage.render();

  const lb = holo ? labels(holo) : { list: [], alpha: 0 };
  overlay.draw(stage.pyramid ? [] : hands, DEMO ? demoVisual : controller.visual, lb.list, lb.alpha, t);
  capture.tick();

  if (now - uiAt > 100) {
    uiAt = now;
    panel.setTracking(trackState, hands.length, fps, tracker.ready
      ? `tracking ${tracker.camFps.toFixed(0)}/s · ${tracker.detectMs.toFixed(0)} ms · delay ${tracker.latencyMs.toFixed(0)} ms · ${tracker.delegate}`
      : '');
    panel.setActive(controller.active, trackState);
    if (holo) {
      panel.setExplode(holo.explode);
      const p = holo.grabbed ?? holo.selected;
      panel.setPart(p ? p.def : null);
    }
  }
}

function loop(now: number) {
  step(now);
  requestAnimationFrame(loop);
}

if (DEMO) {
  // Scripted, frame-stepped rendering: a recorder drives time explicitly, so output is identical every run.
  document.body.classList.add('clean');
  $('splash').classList.add('gone');
  stage.videoOn = false;
  stage.autoRotate = false;
  let clock = 0;
  Object.assign(window, {
    __demo: {
      stage,
      get holo() { return holo; },
      setModel: (i: number) => setModel(i),
      /** Advance the simulation by `ms` and render one frame. */
      step(ms: number) { clock += ms; step(clock); },
      setVisual(v: Visual) { demoVisual = v; },
      part: (name: string) => holo?.parts.find((p) => p.def.name === name) ?? null,
    },
  });
} else {
  requestAnimationFrame(loop);
}
