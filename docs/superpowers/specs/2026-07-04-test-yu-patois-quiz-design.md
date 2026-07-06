# Test yu Patois — Quiz Design Spec

_Date: 2026-07-04. Extends the site spec; design approved in conversation._

## Overview

A Duolingo-style quiz built entirely from the existing 34-proverb dataset and
authentic audio clips. A section card on the page shows persistent stats and
launches a full-viewport takeover where the user plays an 8-question round
mixing four exercise types. No accounts, no backend — progress persists in
localStorage.

## Entry card (new section, between The Original and Legends)

"Test yu Patois" card showing: current rank, daily streak, best score, and a
Start button. Stats refresh on load and after each round.

## The takeover

Full-viewport fixed overlay (z-index above header and bird; body scroll
locked; focus-trapped; Esc or ✕ closes, returning focus to Start).

- **Top bar**: close ✕ · segmented progress bar (one segment per question,
  filled green/red by result) · three hearts · mute toggle.
- **Stage**: the current exercise.
- **Footer**: Check → Continue button; a feedback banner slides up —
  green with random patois praise on correct, red with the correct answer on
  a miss (aria-live polite; slide gated on reduced motion).

## Exercises (8 per round, distinct proverbs, types mixed)

1. **Fill di blank** — the patois with one word blanked; four word chips.
   Blank chosen from content words (length ≥ 3, patois stoplist excluded:
   di/fi/yu/nuh/dem/weh/…); distractors are blankable words from other
   proverbs with similar length.
2. **Build di phrase** — the English translation shown; assemble the patois
   in order from a shuffled chip bank (the target words + 2-3 decoys). Only
   proverbs ≤ 10 words are eligible. Tapping a bank chip appends it to the
   answer line; tapping a placed chip returns it.
3. **Ear test** — a speaker button plays Auntie Pearl's authentic clip; the
   sentence shows with the blank; pick the heard word from four chips. If the
   clip fails to load, the question falls back to a plain fill-di-blank.
4. **Match di meaning** — the patois shown; pick the correct meaning of four.

A round tries to include every selected type at least once when eligibility
allows.

## Scoring, hearts, ranks

- +10 per correct, plus a combo bonus of 2×(combo−1), capped at +10; combo
  flames shown during streaks (pure reducer, unit-tested).
- 3 hearts; a wrong answer costs one; at zero the round ends early (end
  screen still shows).
- End screen: score, accuracy, best combo, confetti (reduced-motion gated),
  a patois verdict by accuracy, and the persistent rank from best-ever score:
  Newcomer → Likkle Learner → Yaad Apprentice → Wud Master → Real Yardie.
  Buttons: "Gwaan again" / "Done".
- localStorage `wft-quiz`: `{ best, streak, last, muted }`. Daily streak:
  first completed round each day increments (consecutive days), else resets
  to 1; same-day repeats don't change it.

## Sound

Synthesized via Web Audio (no files): correct ding (two ascending sines),
wrong buzz (low square), end-screen fanfare (arpeggio). Mute toggle persists.

## Architecture

- `js/quiz.js` — pure, dual-export (browser global `Quiz` + CommonJS), unit
  tested: tokenization, blankable-word selection, the four question builders,
  `buildRound`, the score reducer, `rankFor`, verdicts.
- `js/quiz-ui.js` — overlay DOM/state machine, sounds, confetti, persistence,
  entry-card stats. Browser-only IIFE.
- `index.html` — entry section + overlay skeleton; new script tags.
- `css/styles.css` — quiz styles for both themes via existing variables.
- `test/quiz.test.js` — Node tests for all pure logic.

## Accessibility

Focus trap; every control a real button; chips keyboard-operable; feedback
aria-live; reduced motion removes banner slide, confetti, and flame pulse;
ear-test never sound-only (sentence text always visible).
