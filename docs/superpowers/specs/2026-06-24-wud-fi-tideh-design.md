# Wud fi Tideh — Design Spec

_Date: 2026-06-24_

## Overview

"Wud fi Tideh" is a novelty single-page website celebrating Jamaican Patois
proverbs drawn from Donald Thompson's podcast of the same name. It presents a
daily proverb, generates a conversational "radio" audio segment from random
proverbs, and pays tribute to the literary figures — chiefly Louise
Bennett-Coverley — who legitimised Patois as a literary craft.

The page is colourful, joyful, and shareable: a self-contained static site with
no backend and no build step. It can be opened from a file or hosted on GitHub
Pages.

### Purpose & success criteria

- A visitor immediately understands what the site is and enjoys it within
  seconds (the "novelty" delight).
- Each core feature works with zero setup, offline, from a single shared link.
- The Patois content is presented faithfully, with the literary heritage
  treated with genuine respect (accurate, sourced).

### Non-goals (YAGNI)

Out of scope for this build: any backend or database, user accounts, comments,
search/filtering, live syncing from the Google Sheet, cloud TTS services, and a
content-management UI. These can be revisited later; none are needed for the
novelty experience.

## Architecture

A vanilla, dependency-free static site. No framework, no bundler, no build.

```
/index.html            — markup + section structure
/css/styles.css        — both theme palettes via CSS custom properties
/js/data.js            — embedded snapshot of all proverbs (the dataset)
/js/proverbs.js        — pure logic: daily selection, random picks, script generation
/js/audio.js           — Web Speech (TTS) playback engine + transcript sync
/js/theme.js           — day/night theme toggle + auto-by-time + persistence
/js/app.js             — wires the DOM to the modules on load
/audio/                — user-supplied podcast mp3 (e.g. wud-fi-tideh.mp3)
/assets/               — optional portrait images for the Legends section
/data/wud-fi-tideh.csv — source-of-truth export (used to regenerate data.js)
```

Each JS module has one clear responsibility and communicates through a small,
explicit interface. The pure-logic module (`proverbs.js`) holds the testable
core (selection + script generation) with no DOM dependencies, so it can be unit
tested directly.

### Data model & source

The dataset is a snapshot of the Google Sheet (33 proverbs today), embedded into
`js/data.js` as an array so the site is reliable and works offline:

```js
window.WUD_DATA = [
  {
    original: "Likkle gud vibes meck Big difference",
    english:  "Good vibes can make a big difference",
    meaning:  "Small acts of positivity ... can have a massive impact ...",
    slug:     "likklegudvibes",
    audio:    null            // or a filename when a per-proverb clip exists
  },
  ...
];
```

`data/wud-fi-tideh.csv` is committed as the source of truth. A short, documented
step (manual re-export → regenerate `data.js`) refreshes the dataset when Donald
adds proverbs. Five proverbs in the current sheet carry `.mp3` references (the
NotebookLM sample); those filenames are preserved in the `audio` field but no
per-proverb audio is wired up in this build.

## Theme system: Sunsplash by day, Reggae Dusk by night

Two full palettes, one layout. Colours are defined as CSS custom properties and
swapped by a `data-theme` attribute on the root element:

- `data-theme="day"` → **Sunsplash**: warm cream background, gold + green +
  black + orange accents, friendly rounded display type.
- `data-theme="night"` → **Reggae Dusk**: deep charcoal background, gold +
  green accents, cream text, late-night-radio mood.

Behaviour:

- A sun/moon toggle in the header flips themes instantly.
- On first visit, the theme defaults by the visitor's local time (day roughly
  06:00–18:00, otherwise night). After a manual toggle, the choice is
  remembered in `localStorage` and overrides auto.
- Both palettes are contrast-checked for legibility.

Layout and content are identical across themes — only the custom-property values
change — so the maintenance cost is a second set of colour tokens, not a second
site.

### Typography

Display/headings: a friendly rounded face (e.g. Fredoka) for the joyful voice;
an editorial serif (e.g. Playfair Display) for the Legends memorial to signal
reverence. Body text in a clean sans. Fonts loaded from Google Fonts with sane
system fallbacks; the site remains fully functional if fonts fail to load.

## Feature 1 — The Daily Wud

Presents one proverb as "today's" Wud: the Patois original (large), the literal
English translation, and the meaning/interpretation.

- **Selection:** deterministic from the calendar date — `index = hashOfDate(today) % N`
  — so the same proverb shows all day and genuinely reads as "today's," and a
  revisit is consistent. (Pure function in `proverbs.js`.)
- **Hear it:** speaks the Patois aloud via the TTS engine.
- **Gimme anodda one:** shuffles to a different random proverb for browsing
  (never repeats the one currently shown); a reset returns to today's Wud.

## Feature 2 — Wuds of Wisdom (conversational audio)

Picks 5 proverbs at random and turns them into a short two-host radio segment,
played with the browser's built-in speech synthesis.

- **Hosts:** "Auntie Pearl" and "Uncle Roy" — a warm, familial yard-radio
  dynamic. Each host is assigned a distinct system voice.
- **Script generation** (`proverbs.js`, pure & testable): builds a structured
  dialogue from the 5 picks:
  1. Warm intro from the hosts.
  2. For each proverb: one host delivers the Patois, the other gives the
     translation, and they exchange a brief, varied riff on the meaning (drawn
     from the proverb's `meaning` text, lightly templated for natural banter).
  3. A short sign-off.
  Templates are varied so repeated sessions don't sound identical.
- **Playback** (`audio.js`): queues one utterance per line through
  `speechSynthesis`, assigning the correct voice per host. The on-screen
  transcript renders all lines; the active line is highlighted as it plays
  (via utterance `onstart`/`onend`). Controls: play / pause / stop.
- **Mix up a new session:** regenerates a fresh random 5 + new script.
- **Limitations (accepted):** system TTS voices are synthetic and will only
  approximate Patois pronunciation — the same limitation the user already
  observed with NotebookLM. Phrasing in the script is tuned to read more
  naturally aloud, but pronunciation will not be perfect. The full transcript is
  always shown, so the segment is never audio-only.

### Audio robustness

- Voices load asynchronously; the engine waits for `voiceschanged` before
  assigning voices and picks two distinct voices when available (falling back to
  one voice with differing pitch/rate to still distinguish the hosts).
- If the browser exposes no speech synthesis at all, playback controls show a
  clear "your browser can't speak this — here's the script" state, and the
  transcript stands alone.

## Feature 3 — Legends memorial ("The Voice of the People")

A reverent section, rendered in the darker/editorial treatment in both themes,
honouring the writers who legitimised Patois as literature.

- A **featured reflection on Louise Bennett-Coverley ("Miss Lou")** — a short,
  warm paragraph on how she took a language dismissed as "broken English" and
  proved it a living literary craft.
- **Memorial cards** for Louise Bennett-Coverley and Claude McKay: name, dates,
  and a one-to-two-line note on their legacy and key works.
- Portraits: initials/monogram placeholders by default; real images can be
  dropped into `/assets/` later.

**Content accuracy requirement:** every biographical fact (dates, titles, claims)
must be verified against authoritative sources during implementation before it
ships. Keeping the section to the two figures the user named (rather than adding
more) keeps the tribute focused and the verification burden honest.

## The Original podcast player

A compact player for Donald Thompson's NotebookLM podcast, styled with the vinyl
/ "Hear the Original" motif. It looks for an mp3 the user drops at
`/audio/wud-fi-tideh.mp3`:

- File present → player is active.
- File absent → the player area shows a tasteful "coming soon" state and stays
  out of the way, so the site is shippable before the audio is added.

## Layout, accessibility & responsiveness

- One vertical scroll, mobile-first, with a sticky header containing the
  wordmark, in-page nav, and the theme toggle. Sections wrap/stack gracefully on
  narrow screens.
- Semantic HTML landmarks; all interactive controls keyboard-operable with
  visible focus and `aria-label`s; the audio transcript guarantees the content
  is never conveyed by sound alone.
- `prefers-reduced-motion` respected for any animation. Colour contrast verified
  in both themes.

## Testing approach

- **Pure logic** (`proverbs.js`): unit tests for deterministic daily selection
  (same date → same proverb; distribution sane), random-pick behaviour (5
  distinct picks; shuffle never repeats current), and script generation (correct
  structure, all 5 proverbs present, host attribution correct). Driven
  test-first.
- **Audio & theme modules:** logic seams (voice assignment, theme resolution by
  time, persistence) unit tested where they don't require a real browser;
  speech playback verified manually in-browser.
- **End-to-end:** manual/visual verification in a real browser (load the page,
  exercise each feature, toggle themes, confirm responsive behaviour) before
  completion.

## Deployment

Static hosting. Primary path: GitHub Pages from this repo (the site is plain
files at the repo root). Also works by opening `index.html` directly or via any
static file server. No build, no environment, no secrets.

## Open implementation tasks

- Regenerate `js/data.js` from `data/wud-fi-tideh.csv` (33 proverbs).
- Verify and write the Legends biographical content against authoritative
  sources.
- User to supply the podcast mp3 at `/audio/wud-fi-tideh.mp3` (optional; site
  ships without it).
