"""Writes the 7 Holoscope promo frame compositions (compositions/frames/*.html).

Each frame is a <template> sub-composition: an approved footage <video> (hoisted to the host by assemble-index),
a top vignette, and the type layer animated on one paused GSAP timeline. Run: python scripts/build-frames.py
"""
from pathlib import Path

W = H = 1080
OUT = Path(__file__).resolve().parent.parent / "compositions" / "frames"
OUT.mkdir(parents=True, exist_ok=True)

CYAN, INK, BLACK = "#38f4ff", "#eef2f8", "#000000"

FONTS = "\n".join(
    f'@font-face {{ font-family: "Inter"; src: url("assets/fonts/inter-latin-{w}-normal.woff2") format("woff2"); font-weight: {w}; font-display: block; }}'
    for w in (400, 500, 700, 800, 900)
) + '\n@font-face { font-family: "IBM Plex Mono"; src: url("assets/fonts/ibm-plex-mono-latin-500-normal.woff2") format("woff2"); font-weight: 500; font-display: block; }'

GSAP = '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>'


def words(text, cls, accent=()):
    """Split a line into per-word spans (for the staggered reveal). Words in `accent` get the accent colour."""
    out = []
    for w in text.split(" "):
        extra = " accent" if w.strip(".,") in accent else ""
        out.append(f'<span class="{cls}{extra}">{w}</span>')
    return " ".join(out)


def video(src, start, dur, media_start, track, vid):
    return (f'<video id="{vid}" data-frame-video="approved" src="assets/{src}" muted playsinline preload="auto" '
            f'data-media-start="{media_start}" data-start="{start}" data-duration="{dur}" data-track-index="{track}" '
            f'data-frame-video-x="0" data-frame-video-y="0" data-frame-video-width="{W}" data-frame-video-height="{H}" '
            f'data-frame-video-fit="cover"></video>')


def frame(fid, dur, body, css, js):
    p = fid.split("-")[0]  # e.g. "01" — prefix for ids/classes
    return f"""<template>
<div id="root" data-composition-id="{fid}" data-width="{W}" data-height="{H}" data-start="0" data-duration="{dur}">
{body}
<style>
{FONTS}
#root {{ position: absolute; inset: 0; width: {W}px; height: {H}px; overflow: hidden; font-family: "Inter", sans-serif; color: {INK}; }}
.f{p}-layer {{ position: absolute; inset: 0; width: {W}px; height: {H}px; }}
.f{p}-vignette {{ background: linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 24%, rgba(0,0,0,0) 46%); }}
.f{p}-w {{ display: inline-block; will-change: transform, opacity; }}
.accent {{ color: {CYAN}; }}
.f{p}-shadow {{ text-shadow: 0 2px 28px rgba(0,0,0,0.65); }}
{css}
</style>
{GSAP}
<script>
(function () {{
  const R = '[data-composition-id="{fid}"] ';
  const q = (s) => document.querySelectorAll(R + s);
  const tl = gsap.timeline({{ paused: true }});
{js}
  window.__timelines = window.__timelines || {{}};
  window.__timelines["{fid}"] = tl;
}})();
</script>
</div>
</template>
"""


def write(fid, html):
    import re
    n = iter(range(1, 99))
    # stable, human-readable ids on every timed layer (Studio edit targets)
    html = re.sub(r'<div class="clip ', lambda m: f'<div id="f{fid[:2]}-layer-{next(n)}" class="clip ', html)
    (OUT / f"{fid}.html").write_text(html, encoding="utf-8")
    print("wrote", fid)


# ---------- shared demo-beat layout (F3–F5): chip + result line, top-left ----------
DEMO_CSS = """
.f{p}-chip {{ position: absolute; left: 64px; top: 92px; padding: 10px 20px; border: 1.5px solid {c}; border-radius: 999px;
  font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 22px; letter-spacing: 0.14em; text-transform: uppercase;
  color: {c}; background: rgba(0,0,0,0.35); }}
.f{p}-result {{ position: absolute; left: 60px; top: 150px; font-weight: 900; font-size: 92px; line-height: 1;
  letter-spacing: -0.04em; text-transform: lowercase; white-space: nowrap; }}
"""

DEMO_JS = """
  // Scene 1: gesture chip clip-reveals left→right
  tl.fromTo(q('.f{p}-chip'), {{ clipPath: 'inset(0 100% 0 0 round 999px)', opacity: 1 }},
    {{ clipPath: 'inset(0 0% 0 0 round 999px)', duration: 0.5, ease: 'power3.out' }}, 0.1);
  // Scene 2: result line, per-word staggered reveal on its cue
  tl.fromTo(q('.f{p}-result .f{p}-w'), {{ opacity: 0, y: 40 }},
    {{ opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.09 }}, 0.6);
  // Scene 3: hold — subtle jitter only
  tl.fromTo(q('.f{p}-result'), {{ x: 0 }}, {{ x: 1.5, duration: 1.0, ease: 'sine.inOut' }}, 1.5);
"""


def demo_frame(fid, clip, media_start, chip, result):
    p = fid.split("-")[0]
    body = f"""{video(clip, 0, 2.5, media_start, 0, f"f{p}-video")}
<div class="clip f{p}-layer f{p}-vignette" data-start="0" data-duration="2.5" data-track-index="1"></div>
<div class="clip f{p}-layer" data-start="0" data-duration="2.5" data-track-index="2">
  <div class="f{p}-chip">{chip}</div>
  <div class="f{p}-result f{p}-shadow">{words(result, f"f{p}-w")}</div>
</div>"""
    write(fid, frame(fid, 2.5, body, DEMO_CSS.format(p=p, c=CYAN), DEMO_JS.format(p=p)))


# ---------- Frame 1 — Take it apart ----------
p = "01"
write("01-take-it-apart", frame("01-take-it-apart", 4.5, f"""{video("earth-reveal.mp4", 0, 4.5, 0, 0, "f01-video")}
<div class="clip f01-layer f01-vignette" data-start="0" data-duration="4.5" data-track-index="1"></div>
<div class="clip f01-layer" data-start="0" data-duration="4.5" data-track-index="2">
  <div class="f01-line f01-a f01-shadow">{words("crack a planet open.", "f01-w")}</div>
  <div class="f01-line f01-b f01-shadow">{words("with your bare hands.", "f01-w", accent=("bare", "hands"))}</div>
  <div class="f01-rule"></div>
</div>""", f"""
.f01-line {{ position: absolute; left: 0; right: 0; text-align: center; font-weight: 900; letter-spacing: -0.04em;
  text-transform: lowercase; line-height: 1; white-space: nowrap; }}
.f01-a {{ top: 96px; font-size: 80px; }}
.f01-b {{ top: 88px; font-size: 96px; }}
.f01-rule {{ position: absolute; left: 498px; top: 206px; width: 520px; height: 3px; background: {CYAN};
  box-shadow: 0 0 18px {CYAN}; transform-origin: left center; }}
""", """
  // Scene 1: first line, per-word staggered reveal as the engine forms
  tl.fromTo(q('.f01-a .f01-w'), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.25);
  tl.set(q('.f01-b'), { autoAlpha: 0 }, 0);
  tl.set(q('.f01-rule'), { scaleX: 0 }, 0);
  // Scene 2: hard-cut word swap on the explosion frame (2.2 s)
  tl.set(q('.f01-a'), { autoAlpha: 0 }, 2.2);
  tl.set(q('.f01-b'), { autoAlpha: 1 }, 2.2);
  tl.fromTo(q('.f01-b'), { scale: 1.08 }, { scale: 1, duration: 0.45, ease: 'power3.out' }, 2.2);
  tl.fromTo(q('.f01-rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 2.35);
  // Scene 3: hold — subtle jitter only
  tl.fromTo(q('.f01-b'), { y: 0 }, { y: 1.5, duration: 1.6, ease: 'sine.inOut' }, 2.8);
"""))

# ---------- Frame 2 — Holoscope ----------
write("02-holoscope", frame("02-holoscope", 2.5, f"""{video("earth-reveal.mp4", 0, 2.5, 4.5, 0, "f02-video")}
<div class="clip f02-layer f02-dim" data-start="0" data-duration="2.5" data-track-index="1"></div>
<div class="clip f02-layer" data-start="0" data-duration="2.5" data-track-index="2">
  <div class="f02-lockup">
    <div class="f02-mark"></div>
    <div class="f02-word">Holoscope</div>
  </div>
  <div class="f02-promise">Reach in. See how anything works.</div>
</div>""", f"""
.f02-dim {{ background: radial-gradient(ellipse 70% 55% at 50% 46%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.35) 100%); }}
.f02-lockup {{ position: absolute; left: 0; right: 0; top: 330px; display: flex; align-items: center; justify-content: center; gap: 30px; }}
.f02-mark {{ width: 104px; height: 104px; border-radius: 50%; flex: none; position: relative;
  background: conic-gradient(from 200deg, #38f4ff, #a06bff, #ff5fb7, #ffd36b, #57ff9a, #38f4ff);
  box-shadow: 0 0 40px rgba(56,244,255,0.55); }}
.f02-mark::after {{ content: ""; position: absolute; inset: 27px; border-radius: 50%; background: #05060a; }}
.f02-word {{ font-weight: 900; font-size: 136px; letter-spacing: -0.05em; line-height: 1; }}
.f02-promise {{ position: absolute; left: 0; right: 0; top: 520px; text-align: center; font-weight: 500; font-size: 42px;
  color: rgba(238,242,248,0.86); letter-spacing: -0.01em; }}
""", """
  // Scene 1: footage dims; wordmark slide-up crossfade (smooth settle)
  tl.fromTo(q('.f02-dim'), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
  tl.fromTo(q('.f02-lockup'), { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1);
  tl.fromTo(q('.f02-mark'), { rotation: -90 }, { rotation: 0, duration: 1.0, ease: 'power3.out' }, 0.1);
  // Scene 2: promise line on the second cue, then the held breather
  tl.fromTo(q('.f02-promise'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.9);
"""))

# ---------- Frames 3–5 — the gesture beats ----------
demo_frame("03-open-your-hand", "car-open.mp4", 0.3, "Spread your fingers", "it breaks apart.")
demo_frame("04-point", "brain-point.mp4", 0.4, "Point a finger", "see what it does.")
demo_frame("05-pinch", "jet-pinch.mp4", 0.3, "Pinch", "pull a piece out.")

# ---------- Frame 6 — Engines to DNA (pinned anchor, hard-cut token cycle) ----------
write("06-engines-to-dna", frame("06-engines-to-dna", 2.5, f"""{video("jet-reveal.mp4", 0, 0.85, 3.4, 0, "f06-video-a")}
{video("dna-unzip.mp4", 0.85, 0.85, 0.5, 1, "f06-video-b")}
{video("car-spin.mp4", 1.7, 1.3, 0.2, 2, "f06-video-c")}
<div class="clip f06-layer f06-vignette" data-start="0" data-duration="2.5" data-track-index="3"></div>
<div class="clip f06-layer" data-start="0" data-duration="2.5" data-track-index="4">
  <div class="f06-anchor f06-shadow">{words("look inside", "f06-w")}</div>
  <div class="f06-token f06-t1 f06-shadow accent">engines.</div>
  <div class="f06-token f06-t2 f06-shadow accent">DNA.</div>
  <div class="f06-token f06-t3 f06-shadow accent">cars.</div>
</div>""", """
.f06-anchor { position: absolute; left: 60px; top: 84px; font-weight: 900; font-size: 92px; letter-spacing: -0.04em; line-height: 1; white-space: nowrap; }
.f06-token { position: absolute; left: 60px; top: 182px; font-weight: 900; font-size: 92px; letter-spacing: -0.04em; line-height: 1; white-space: nowrap; }
""", """
  // Scene 1: anchor enters once (per-word) and never moves; first token
  tl.fromTo(q('.f06-anchor .f06-w'), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.08 }, 0.05);
  tl.set(q('.f06-t2, .f06-t3'), { autoAlpha: 0 }, 0);
  tl.fromTo(q('.f06-t1'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.2);
  // Scene 2 + 3: in-place token cycle on the hard cuts
  tl.set(q('.f06-t1'), { autoAlpha: 0 }, 0.85);
  tl.set(q('.f06-t2'), { autoAlpha: 1 }, 0.85);
  tl.set(q('.f06-t2'), { autoAlpha: 0 }, 1.7);
  tl.set(q('.f06-t3'), { autoAlpha: 1 }, 1.7);
"""))

# ---------- Frame 7 — Brand (adapted from the logo-outro registry block) ----------
ARCS = [
    ("#38f4ff", "M 104.27 30.13 A 70 70 0 0 1 165.13 74.34"),
    ("#a06bff", "M 167.77 82.47 A 70 70 0 0 1 144.53 154.01"),
    ("#ff5fb7", "M 137.61 159.04 A 70 70 0 0 1 62.39 159.04"),
    ("#ffd36b", "M 55.47 154.01 A 70 70 0 0 1 32.23 82.47"),
    ("#57ff9a", "M 34.87 74.34 A 70 70 0 0 1 95.73 30.13"),
]
arcs = "\n    ".join(f'<path class="f07-piece" d="{d}" stroke="{c}" />' for c, d in ARCS)
write("07-brand", frame("07-brand", 3, f"""<div class="clip f07-layer f07-ground" data-start="0" data-duration="3" data-track-index="0"></div>
<div class="clip f07-layer" data-start="0" data-duration="3" data-track-index="1">
  <div class="f07-glow"></div>
  <svg class="f07-mark" viewBox="0 0 200 200" width="220" height="220">
    {arcs}
  </svg>
  <div class="f07-word">Holoscope</div>
  <div class="f07-tagline">Your hands are the controller.</div>
  <div class="f07-pill">Webcam · AI hand tracking · runs in your browser</div>
</div>
<div class="clip f07-layer f07-fade" data-start="0" data-duration="3" data-track-index="2"></div>""", f"""
.f07-ground {{ background: radial-gradient(ellipse 80% 70% at 50% 40%, #071014 0%, #000 70%); }}
.f07-glow {{ position: absolute; left: 340px; top: 110px; width: 400px; height: 400px; border-radius: 50%;
  background: radial-gradient(circle, rgba(56,244,255,0.42) 0%, rgba(160,107,255,0.18) 40%, rgba(0,0,0,0) 70%); }}
.f07-mark {{ position: absolute; left: 430px; top: 200px; overflow: visible; }}
.f07-piece {{ fill: none; stroke-width: 26; stroke-linecap: round; filter: drop-shadow(0 0 10px currentColor); }}
.f07-word {{ position: absolute; left: 0; right: 0; top: 470px; text-align: center; font-weight: 900; font-size: 124px;
  letter-spacing: -0.05em; line-height: 1; }}
.f07-tagline {{ position: absolute; left: 0; right: 0; top: 632px; text-align: center; font-weight: 500; font-size: 40px;
  color: rgba(238,242,248,0.88); }}
.f07-pill {{ position: absolute; left: 50%; top: 726px; margin-left: -330px; width: 660px; text-align: center; padding: 12px 0;
  border: 1.5px solid rgba(56,244,255,0.6); border-radius: 999px; font-family: "IBM Plex Mono", monospace; font-weight: 500;
  font-size: 19px; letter-spacing: 0.08em; color: {CYAN}; }}
.f07-fade {{ background: #000; }}
""", """
  // Scene 1: ring pieces slide in from the right with a ripple stagger, then the glow blooms
  tl.fromTo(q('.f07-piece'), { x: 700, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0, ease: 'power4.out', stagger: 0.07 }, 0);
  tl.fromTo(q('.f07-mark'), { rotation: -40, transformOrigin: '50% 50%' }, { rotation: 0, duration: 1.3, ease: 'power3.out' }, 0);
  tl.fromTo(q('.f07-glow'), { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1.15, duration: 0.6, ease: 'power2.out' }, 0.8);
  tl.fromTo(q('.f07-word'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.75);
  // Scene 2: tagline
  tl.fromTo(q('.f07-tagline'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 1.25);
  // Scene 3: pill last, hold, then the final frame's fade to black
  tl.fromTo(q('.f07-pill'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 1.9);
  tl.fromTo(q('.f07-fade'), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.in' }, 2.6);
"""))
