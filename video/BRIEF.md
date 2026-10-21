---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Reach in with your bare hands and see how anything works"
destination: linkedin-feed
aspect: 1080x1080
language: en
length: 20s
angle: magic-reveal
---

## Intent

A 20-second LinkedIn promo for Holoscope — a browser app (webcam + MediaPipe hand tracking + three.js)
that turns 3D models into glowing particle holograms you control with hand gestures. The goal is to
out-perform a competitor's hologram post: open on the wow moment (a planet cracking open to its
glowing core), show the gestures, flash all five models, end on the Holoscope name.
Chose "magic reveal" over problem→solution and builder-story.

## Assets

- ../frontend — the Holoscope app itself (Vite, http://localhost:5173). Real footage of its holograms
  is rendered from the app in a deterministic demo mode and used as the video's primary assets.

## Customizations

- No voice-over; music bed.
- Look inherits the app: black ground, glowing cyan / violet / magenta / gold particles, Inter type.

## Notes

- The camera is unavailable in automation, so the footage shows the holograms without a live hand;
  gestures are communicated with on-screen type, not a faked hand.

- Renamed HoloHand → Holoscope (2026-10-21): the first draft reused another creator's product name, tagline and
  gesture copy; all on-screen language is now original, and the hero is Planet Earth instead of the jet engine.
