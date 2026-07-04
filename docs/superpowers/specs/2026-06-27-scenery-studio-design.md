# Scenery & Studio Upgrades — Design Spec

_Date: 2026-06-27. Extends the 2026-06-24 site spec; user selected these four
upgrades from an ideas round._

## Overview

Four thematic additions, all dependency-free and progressive (site fully works
without them; everything gates on `prefers-reduced-motion`):

1. **Living sky hero** — the hero becomes a slow animated sky synced to the
   visitor's clock and theme.
2. **Doctor Bird companion** — Jamaica's national hummingbird as an animated
   SVG that periodically flies across the page.
3. **Talking host avatars** — illustrated Auntie Pearl & Uncle Roy light up and
   mouth-move with the actual audio while their line plays.
4. **Live yaad radio set** — ON AIR sign, audio-driven VU meter, and an
   optional synthesized island-ambience toggle (surf by day, crickets at night).

## Modules

- `js/sky.js` → global `Sky`. Pure seams `sunPosition(hour)` / `moonPosition(hour)`
  (unit-tested); `initSky()` injects a `.sky` layer into `.hero`: sun disc +
  drifting clouds on the day theme, moon + twinkling stars on night. Follows
  `data-theme` via MutationObserver; sun/moon placed from the local clock
  (clamped to a sensible default when a manual theme override disagrees with
  the clock). Position refreshes every minute.
- `js/bird.js` — self-contained IIFE. Builds a fixed-position, pointer-events-none
  SVG doctor bird (emerald body, long twin tail streamers, fluttering wing via
  CSS animation) and flies it along bezier-sampled keyframes (Web Animations
  API): in from an edge, hover near the Daily Wud with a gentle bob, dart out.
  First flight shortly after load, then at random 60–120 s intervals; a shuffle
  click triggers a quick dart. Disabled entirely under reduced motion or when
  `Element.animate` is unavailable.
- `js/studio.js` → global `Studio`. Owns the studio scene:
  - **Avatars**: inline SVG Pearl & Roy in `index.html`; `Studio.setSpeaker('a'|'b'|null)`
    toggles a `.speaking` glow and animates the active mouth (ellipse `ry`).
  - **Audio level**: one lazily-created `AudioContext` (first Play click =
    user gesture). `createMediaElementSource(player.audio)` → analyser →
    destination drives mouths + VU meter for clip lines; TTS-fallback lines use
    a pseudo-level so the scene never goes dead. Any AudioContext failure falls
    back to pseudo-levels for everything.
  - **ON AIR sign**: lit class while playing (also via `Studio.onPlay/onPause/onStop/onEnd`).
  - **VU meter**: small canvas, bars from analyser frequency data, painted in a
    requestAnimationFrame loop that runs only while playing.
  - **Ambience**: toggle button (aria-pressed). Synthesized in Web Audio — no
    audio files: surf = looped noise → lowpass → slow LFO gain; crickets =
    band-passed chirp bursts. Picked by current theme, very low gain, off by
    default, independent of the radio.
- `js/app.js` — wires `Studio` into `initWow` (init after player creation;
  onPlay/onPause/onStop/onEnd/setSpeaker at the existing control points).

## Accessibility & performance

- All decorative visuals `aria-hidden`; ambience toggle is a real labelled
  button. Reduced motion: no bird, no sky drift/twinkle, no mouth flap; VU
  meter stays but static-fills. rAF loops run only during playback; sky updates
  once a minute.

## Out of scope

Word-level lip sync (no per-word timings in pre-generated clips), recorded
ambience files, bird interactions beyond flight (no clicking/petting).
