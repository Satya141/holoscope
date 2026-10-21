# Holoscope — reach in, see how anything works

Crack open planet Earth, a jet engine, a sports car, a human brain or DNA as a glowing particle hologram, and take it apart with your bare hands.
Webcam + MediaPipe hand tracking + three.js, all running live in the browser.

## Run

```bash
cd frontend
npm install        # also copies the MediaPipe runtime and downloads the hand model (~8 MB)
npm run dev
```

Open http://localhost:5173 in Chrome and allow the camera.

## Gestures

| Gesture | Does |
|---|---|
| 🖐️ Spread your fingers | Breaks the model into parts; the wider your hand, the further apart |
| ✊ Make a fist | Snaps it back together; move the fist to drag the model around |
| 👋 Swipe your palm | Spins and tilts the model |
| ☝️ Point a finger | Shows what that part is and what it does |
| 🤏 Pinch | Grabs a piece and pulls it out; let go and it snaps home. Pinch empty space to move the model |
| 🙌 Use both hands | Stretch to zoom, turn to roll |
| ✌️ Show a V sign (hold) | Switches to the next model |

Mouse: drag to rotate, wheel to zoom, click a part to select it.
Keys: `←/→` model · `E` explode · `R` reset · `S` screenshot · `V` record · `C` camera bg · `P` pyramid · `H` hide UI · `F` fullscreen.

## Making the post video

Press **V** to start and stop recording. You get an MP4 (or WebM) with the camera, the hologram, the hand skeleton and the labels composited together, ready to upload.
Press **H** for a clean frame without UI, or screen-record the whole window to include the panel.

**Pyramid mode** (`P`) draws four views for a Pepper's-ghost acrylic pyramid placed on your screen, so the hologram floats in real space.

## Your own model

Drop a glTF binary at `frontend/public/models/custom.glb`. It shows up as **Your Model**, and each mesh becomes an explodable part.

## Project layout

```
frontend/src
├── main.ts              app wiring + frame loop
├── models/              procedural models (jetEngine, sportsCar, brain, earth, dna) + glb loader
├── scene/
│   ├── particles.ts     hologram point shader (materialise, twinkle, scan beam, highlight)
│   ├── hologram.ts      model → particle parts, explode, pick, drag
│   └── stage.ts         renderer, bloom, platform, transform, pyramid mode
├── tracking/
│   ├── handTracker.ts   webcam + MediaPipe HandLandmarker + One-Euro smoothing
│   ├── gestures.ts      pose classification (open/fist/point/peace/pinch)
│   └── controller.ts    gestures → actions
└── ui/                  side panel, 2D overlay (skeleton, cursors, labels), capture/recording
```

## Promo video (`video/`)

A 20-second, 1080×1080 promo built with [HyperFrames](https://hyperframes.heygen.com) from **real renders of the app**.

```bash
# 1. start the app (frontend/) — the footage is rendered from its ?demo mode
cd frontend && npm run dev
# 2. in another terminal: render the hologram clips, rebuild frames, render the MP4
cd video && npm install
node scripts/render-clips.mjs          # → capture/assets/*.mp4 (copy into assets/)
python scripts/build-frames.py
npx hyperframes render --output renders/holoscope.mp4
```

Rendered clips, sound effects and final videos are not committed (they are large and regenerable).
Sound effects are fetched from Openverse by the HyperFrames audio step — check each sound's license
and credit its author before publishing a video that uses them.
