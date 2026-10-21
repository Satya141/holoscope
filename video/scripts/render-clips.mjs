// Renders real Holoscope footage for the promo. Drives the app's deterministic `?demo` mode frame by frame
// in headless Chrome and pipes each frame to ffmpeg, so every clip is identical on every run.
//
//   node scripts/render-clips.mjs [shotName ...]      (frontend dev server must be running on :5173)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const APP = process.env.HOLO_URL ?? 'http://localhost:5173/?demo&seed=7';
const SIZE = 1080, FPS = 30, OUT = 'capture/assets';

/**
 * Each shot: model index, seconds to pre-roll (not recorded), seconds to record, and `act(t, d)` which runs
 * in the page before every frame (t = seconds since recording started; d = window.__demo).
 * Model indices: 0 earth · 1 jet engine · 2 sports car · 3 brain · 4 dna.
 */
const SHOTS = {
  'earth-reveal': {
    model: 0, preroll: 0, seconds: 6.5,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = 0.2 + t * 0.18; s.target.pitch = 0.36; s.target.pos.y = -0.45;
      s.target.zoom = t < 2.2 ? 1.2 : Math.max(0.82, 1.2 - (t - 2.2) * 0.3);
      h.explodeTarget = t > 2.2 ? 1 : 0;
    }`,
  },
  'jet-reveal': {
    model: 1, preroll: 0, seconds: 6.5,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = -1.05 + t * 0.16; s.target.pitch = 0.28; s.target.zoom = t < 2.2 ? 1.3 : Math.max(0.74, 1.3 - (t - 2.2) * 0.4);
      h.explodeTarget = t > 2.2 ? 1 : 0;
    }`,
  },
  'car-open': {
    model: 2, preroll: 1.8, seconds: 4,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = -0.9 + t * 0.2; s.target.pitch = 0.3; s.target.zoom = t < 0.5 ? 1.3 : Math.max(1.05, 1.3 - (t - 0.5) * 0.18);
      h.explodeTarget = t > 0.5 ? Math.min(1, (t - 0.5) / 1.6) : 0;
    }`,
  },
  'brain-point': {
    model: 3, preroll: 1.8, seconds: 4,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = 0.75 + t * 0.06; s.target.pitch = 0.22; s.target.zoom = 0.9;
      h.explodeTarget = 0.35;
      const p = d.part(t < 2 ? 'Parietal lobe (R)' : 'Temporal lobe (R)');
      h.selected = t > 0.5 ? p : null;
      if (t > 0.5 && p) {
        const sc = h.screenOf(p, s.camera, innerWidth, innerHeight);
        d.setVisual({ reticle: { x: sc.x, y: sc.y, hit: true } });
      } else d.setVisual({});
    }`,
  },
  'jet-pinch': {
    model: 1, preroll: 2.5, seconds: 4,
    setup: `(d) => { d.holo.explodeTarget = 1; d.holo.explode = 1; d.stage.target.yaw = -0.5; d.stage.target.pitch = 0.32; d.stage.target.zoom = 0.78; }`,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = -0.5 + t * 0.05; s.target.pitch = 0.32; s.target.zoom = 0.78;
      const p = d.part('Combustor');
      const out = t < 0.5 ? 0 : t < 2.9 ? Math.min(1, (t - 0.5) / 1.1) : 0;
      h.grabbed = t > 0.4 && t < 2.9 ? p : null;
      h.selected = h.grabbed;
      p.dragTarget.set(0, out * 0.9, out * 1.6);
      if (h.grabbed) {
        const sc = h.screenOf(p, s.camera, innerWidth, innerHeight);
        d.setVisual({ pinch: { x: sc.x, y: sc.y, grab: true } });
      } else d.setVisual({});
    }`,
  },
  'earth-open': {
    model: 0, preroll: 1.8, seconds: 3,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = 0.4 + t * 0.15; s.target.pitch = 0.38; s.target.zoom = 1.2;
      h.explodeTarget = t > 0.4 ? 1 : 0;
    }`,
  },
  'dna-unzip': {
    model: 4, preroll: 1.8, seconds: 3,
    act: `(t, d) => {
      const s = d.stage, h = d.holo;
      s.target.yaw = t * 0.5; s.target.pitch = 0.12; s.target.zoom = 1.15;
      h.explodeTarget = t > 0.6 ? 1 : 0;
    }`,
  },
  'car-spin': {
    model: 2, preroll: 1.8, seconds: 3,
    act: `(t, d) => {
      const s = d.stage; s.target.yaw = 0.3 + t * 0.7; s.target.pitch = 0.25; s.target.zoom = 1.45;
      d.holo.explodeTarget = 0;
    }`,
  },
};

const chrome = execSync('npx hyperframes browser path', { encoding: 'utf8' }).trim().split(/\r?\n/).pop();
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: SIZE, height: SIZE, deviceScaleFactor: 1 },
});

for (const name of names) {
  const shot = SHOTS[name];
  if (!shot) throw new Error(`unknown shot ${name}`);
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(`[${name}] page error:`, e.message));
  await page.goto(APP, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__demo);
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('#gl').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await page.evaluate((i) => window.__demo.setModel(i), shot.model);
  if (shot.setup) await page.evaluate(`(${shot.setup})(window.__demo)`);

  const dtMs = 1000 / FPS;
  const total = Math.round(shot.preroll * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(`(${shot.act})(0, window.__demo); window.__demo.step(${dtMs})`);
  }

  const file = `${OUT}/${name}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '15', '-preset', 'slow', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(shot.seconds * FPS);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(`(${shot.act})(${i / FPS}, window.__demo); window.__demo.step(${dtMs})`);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 95, optimizeForSpeed: true });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg exit ${c}`)))));
  console.log(`${name}: ${frames} frames → ${file}  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${renderer})`);
  await page.close();
}
await browser.close();
