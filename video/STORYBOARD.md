---
format: 1080x1080
duration: 20s
message: "Reach in with your bare hands and see how anything works"
arc: Hook → Promise → Demo ×3 → Breadth → Brand
audience: LinkedIn feed — engineers, students, makers, recruiters scrolling on phones
mode: autonomous
music: none
---

<!-- No narration: each frame's `voiceover` is the ON-SCREEN copy and its reveal cadence. -->

## Video direction

- **Palette (frame.md roles):** canvas = pure-black field the footage sits on; ink = `#eef2f8` for all type; accent = Holoscope
  cyan `#38f4ff` for gesture chips, hairlines and the key word; the footage itself carries the violet / magenta / gold. One
  accent in the type layer — never re-colour the footage.
- **Type:** display role (Inter 800–900, tight tracking) for headlines, sentence case; mono/chrome role (uppercase,
  wide-tracked) for gesture chips. Headlines sit in the **top third**; the footage owns the centre. Nothing in the bottom ~17%.
- **Footage:** every frame is built on a real Holoscope render, full-bleed, unboxed — it IS the product. No device frames, no
  fake hands, no UI chrome. A soft top vignette (black → transparent) keeps headline contrast without dimming the model.
  Footage plays muted, from the in-point named in the frame's narrative.
- **Motion grammar:** long-tail `power3` settles; type enters by **per-word staggered reveal** or **hard-cut word swap**;
  reveals land on their copy cue (the `voiceover` line), never all at t=0. Hold reads still — subtle jitter at most.
- **Rhythm:** F1 is the loud hook; F2 is the deliberate **held breather** (one move, then still); F3–F5 are a fast, identical
  three-beat demo cadence (chip → result line), so the pattern itself reads; F6 is the fastest beat (hard cuts); F7 lands
  and holds.
- **Negative list:** no bouncy/elastic eases; no slideshow (front-load then freeze); no screensaver (things floating
  independently); no stock bokeh / purple "AI" gradients beyond the footage; no slow back-half pans or pushes on type; no
  emoji glyphs (gestures are named in type).

## Frame 1 — Crack it open

- src: compositions/frames/01-take-it-apart.html
- type: hook
- blueprint: kinetic-type-beats (Adapt)
- scene: A planet forms out of glowing particles, then cracks open to its glowing core
- duration: 4.5s
- poster: 3.2s
- transition_in: cut
- status: animated
- voiceover: "Crack a planet open. — With your bare hands."
- asset_candidates: capture/assets/earth-reveal.mp4
- focal: capture/assets/earth-reveal.mp4
- roles: earth-reveal = background (full-bleed, undimmed — it is the hero)
- sfx: whoosh, impact

Visual spectacle IS the hook. Footage in-point 0.0 s (materialise 0–1.4 s, the planet splits at 2.2 s). Outcome language, no product
name yet.

Adapt: keep kinetic-type-beats' statement-builds-across-beats signature; the "spring-pop payoff" becomes the explosion in
the footage itself, with the payoff line landing on the same frame.
Scene 1 (0.0–2.0s): footage plays from its first frame — particles swirl and condense into the planet. Top third, centered:
"Crack a planet open." reveals by **per-word staggered reveal** (`dynamic-content-sequencing`), display role, ink.
Centered hero layout; footage ~80% of frame, type in a band across the top.
Scene 2 (2.0–2.6s): the planet splits open (frame time 2.2 s). On that exact frame the first line is replaced by a
**hard-cut word swap** (`discrete-text-sequence`) — "With your bare hands." with "bare hands" in accent cyan, one size step
larger; a single cyan hairline wipes in under it.
Scene 3 (2.6–4.5s): hold the read while the labelled parts drift outward in the footage; type stays still (subtle jitter at
most). The footage carries all motion.

## Frame 2 — Holoscope

- src: compositions/frames/02-holoscope.html
- type: product_intro
- blueprint: titlecard-reveal (Reproduce)
- scene: The opened planet dims behind the Holoscope name and the one-line promise
- duration: 2.5s
- poster: 1.6s
- transition_in: cut
- status: animated
- voiceover: "Holoscope. — Reach in. See how anything works."
- asset_candidates: capture/assets/earth-reveal.mp4
- focal: capture/assets/earth-reveal.mp4
- roles: earth-reveal = background (dim ~45% under a radial black falloff behind the type)

The promise lands by beat 2. Footage in-point 4.5 s — continuous with Frame 1, so the cut reads as the same shot settling.

Reproduce: one restrained move, then a still hold.
Scene 1 (0.0–0.9s): footage continues (opened planet, camera easing back) and dims behind a soft radial falloff. The
wordmark "Holoscope" rises in with a **slide-up crossfade** (`spring-pop-entrance`, smooth settle), centered, display role at
hero size, with the app's conic ring mark beside it at cap height.
Scene 2 (0.9–2.5s): on the second cue the promise line "Reach in. See how anything works." fades up beneath in body role,
ink at ~80%; then everything holds still — the deliberate breather.

## Frame 3 — Spread your fingers

- src: compositions/frames/03-open-your-hand.html
- type: feature_showcase
- blueprint: video-text-pivot (Adapt)
- scene: A sports car opens into its parts — body lifts, wheels slide out, V8 rises
- duration: 2.5s
- poster: 1.8s
- transition_in: cut
- status: animated
- voiceover: "SPREAD YOUR FINGERS — It breaks apart."
- asset_candidates: capture/assets/car-open.mp4
- focal: capture/assets/car-open.mp4
- roles: car-open = background (full-bleed, undimmed)
- sfx: whoosh

First gesture: the core interaction (spread fingers → it breaks apart). Footage in-point 0.3 s.

Adapt: keep "the product video holds centre while kinetic text lands"; drop the slide-aside — the footage stays full-bleed
and the text owns the top third only. This shape repeats identically in F4 and F5.
Scene 1 (0.0–0.6s): footage plays (car assembled, beginning to open). Top-left, upper third: the gesture chip
"SPREAD YOUR FINGERS" enters — mono/chrome role, accent cyan text inside a 1px cyan hairline pill — by a short left-to-right clip
reveal (`dynamic-content-sequencing`).
Scene 2 (0.6–1.4s): as the car splits, the result line "It breaks apart." lands beneath the chip by **per-word staggered reveal**,
display role, ink.
Scene 3 (1.4–2.5s): hold; the parts finish separating in the footage. Type still.

## Frame 4 — Point

- src: compositions/frames/04-point.html
- type: feature_showcase
- blueprint: video-text-pivot (Adapt)
- scene: A gold reticle targets a brain lobe; it lights up with its name while the rest dims
- duration: 2.5s
- poster: 1.4s
- transition_in: cut
- status: animated
- voiceover: "POINT A FINGER — See what it does."
- asset_candidates: capture/assets/brain-point.mp4
- focal: capture/assets/brain-point.mp4
- roles: brain-point = background (full-bleed, undimmed)
- sfx: click

Footage in-point 0.4 s.

Adapt: same cadence, positions and moves as F3 (the repeated pattern is the point).
Scene 1 (0.0–0.6s): footage — the gold reticle locks onto the parietal lobe. Chip "POINT A FINGER" enters, same place and move as F3.
Scene 2 (0.6–1.4s): result line "See what it does." per-word reveal, display role, ink.
Scene 3 (1.4–2.5s): hold; the reticle jumps to the temporal lobe in the footage. Type still.

## Frame 5 — Pinch

- src: compositions/frames/05-pinch.html
- type: feature_showcase
- blueprint: video-text-pivot (Adapt)
- scene: A gold pinch ring grabs the engine's combustor and pulls it out toward the viewer
- duration: 2.5s
- poster: 1.6s
- transition_in: cut
- status: animated
- voiceover: "PINCH — Pull a piece out."
- asset_candidates: capture/assets/jet-pinch.mp4
- focal: capture/assets/jet-pinch.mp4
- roles: jet-pinch = background (full-bleed, undimmed)
- sfx: pop

Footage in-point 0.3 s.

Adapt: same cadence, positions and moves as F3/F4.
Scene 1 (0.0–0.6s): footage — the gold pinch ring grabs the combustor. Chip "PINCH" enters as in F3.
Scene 2 (0.6–1.4s): result line "Pull a piece out." per-word reveal as the combustor travels toward camera.
Scene 3 (1.4–2.5s): hold; the combustor reaches the viewer and glows gold. Type still.

## Frame 6 — Engines to DNA

- src: compositions/frames/06-engines-to-dna.html
- type: benefit_highlight
- blueprint: fixed-anchor-cycle (Reproduce)
- scene: Fast cuts — an exploded jet engine, DNA unzipping, a car spinning — under a cycling subject word
- duration: 2.5s
- poster: 1.2s
- transition_in: cut
- status: animated
- voiceover: "Look inside — engines. DNA. cars."
- asset_candidates: capture/assets/jet-reveal.mp4, capture/assets/dna-unzip.mp4, capture/assets/car-spin.mp4
- focal: capture/assets/jet-reveal.mp4
- roles: jet-reveal = background (0.0–0.85 s) · dna-unzip = background (0.85–1.7 s) · car-spin = background (1.7–2.5 s); each full-bleed, hard-cut
- sfx: whoosh

Breadth proof: the same hands work on anything. In-points: jet-reveal 3.4 s (already exploded), dna-unzip 0.5 s, car-spin 0.2 s.

Reproduce: the signature is the PINNED anchor while everything around it hard-cuts.
Scene 1 (0.0–0.85s): the exploded jet engine drifts. Top third, centered: anchor "Look inside" (display role, ink) enters once by
per-word reveal and then never moves; the swapping token "engines." sits beside it in accent cyan.
Scene 2 (0.85–1.7s): hard cut to the DNA unzipping; the token swaps to "DNA." on the same frame (**in-place token cycle**,
`discrete-text-sequence`).
Scene 3 (1.7–2.5s): hard cut to the spinning car; token swaps to "cars." — anchor still pinned. The cuts are the motion.

## Frame 7 — Brand

- src: compositions/frames/07-brand.html
- type: branding
- blueprint: logo-assemble-lockup (Adapt)
- scene: The Holoscope ring mark assembles with a glow bloom; wordmark, tagline and "runs in your browser" line
- duration: 3s
- poster: 2.2s
- transition_in: crossfade
- status: animated
- voiceover: "Holoscope — Your hands are the controller. — Webcam · AI hand tracking · runs in your browser"
- asset_candidates: logo-outro
- focal: logo-outro
- roles: logo-outro = registry block (customised); no footage — pure brand frame on the black canvas
- sfx: riser

Sign-off on the name with the promise restated as a benefit. No URL — the post itself carries the link/comments.

Adapt (logo-assemble-lockup via the `logo-outro` registry block): keep its piece-by-piece assembly + glow bloom + tagline;
replace its mark with Holoscope's conic ring (cyan → violet → magenta → gold → green, black core) and its URL pill with the
line "Webcam · AI hand tracking · runs in your browser". Colours from frame.md roles.
Scene 1 (0.0–1.2s): the ring mark assembles piece by piece at centre and a soft cyan **ambient glow blooms** behind it
(`ambient-glow-bloom`); the wordmark "Holoscope" reveals beside/below it.
Scene 2 (1.2–2.0s): tagline "Your hands are the controller." fades up beneath, body role, ink.
Scene 3 (2.0–3.0s): the pill line fades in last (mono/chrome role, cyan hairline pill); hold still to the end — the final
frame's exit is a gentle fade to black over the last ~0.4 s.
