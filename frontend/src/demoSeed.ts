/**
 * `?demo` — deterministic render mode used to produce promo footage (see video/scripts/render-clips.mjs).
 * Imported first so every particle cloud is generated from the same seed on every run.
 */
export const DEMO = new URLSearchParams(location.search).has('demo');

if (DEMO) {
  let a = Number(new URLSearchParams(location.search).get('seed') ?? 7) >>> 0;
  Math.random = () => {   // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
