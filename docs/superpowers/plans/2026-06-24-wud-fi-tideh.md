# Wud fi Tideh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Wud fi Tideh" — a colourful, self-contained single-page site of Jamaican Patois proverbs with a Daily Wud, a browser-spoken "Wuds of Wisdom" radio segment, a literary Legends memorial, and a day/night theme toggle.

**Architecture:** Vanilla, dependency-free static site (HTML + CSS + classic-script JS). All proverb data is embedded. Pure logic (selection, script generation, theme resolution, voice choice) lives in DOM-agnostic modules that export to both `window` (browser) and `module.exports` (Node), so they run over `file://` AND are unit-testable with Node's built-in test runner. Two colour palettes (Sunsplash / Reggae Dusk) swap via a `data-theme` attribute.

**Tech Stack:** HTML5, CSS custom properties, vanilla ES5-compatible JS, Web Speech API (`speechSynthesis`), Node 22 built-in test runner (`node --test`), no build step, no dependencies. Deployed as static files (GitHub Pages).

---

## Naming & interface contract (locked — used across all tasks)

**Files**
- `js/data.js` → global `WUD_DATA`: array of `{ original, english, meaning, slug, audio }` (audio = filename string or `null`).
- `js/proverbs.js` → global `Proverbs` = `{ dailyIndex, randomIndexExcluding, pickN, generateScript, DEFAULT_HOSTS }`.
- `js/theme.js` → global `Theme` = `{ resolveTheme, initTheme }`.
- `js/audio.js` → global `Radio` = `{ chooseVoices, RadioPlayer }`.
- `js/app.js` → no exports; runs on `DOMContentLoaded`.

**Module wrapper pattern (every JS module in `js/` uses this exact shape):**

```js
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Proverbs = api; } // <-- global name differs per file
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // ... definitions ...
  return { /* api */ };
});
```

**`DEFAULT_HOSTS`** = `{ a: { name: 'Auntie Pearl', voice: 'a' }, b: { name: 'Uncle Roy', voice: 'b' } }`.

**Script line shape** (output of `generateScript`): `{ speaker: string, voice: 'a'|'b', text: string, kind: 'intro'|'patois'|'translation'|'meaning'|'outro', proverb: number|null }`.

**DOM id contract** (used by `app.js`, defined in `index.html`):
- Header: `#theme-toggle`
- Daily Wud: `#daily-date`, `#daily-original`, `#daily-english`, `#daily-meaning`, `#daily-hear`, `#daily-shuffle`, `#daily-reset`
- Wuds of Wisdom: `#wow-mix`, `#wow-play`, `#wow-pause`, `#wow-stop`, `#wow-progress`, `#wow-progress-bar`, `#wow-transcript`, `#wow-status`
- Podcast: `#podcast-audio`, `#podcast-player`, `#podcast-missing`

---

## Task 1: Project scaffolding + data pipeline

**Files:**
- Create: `package.json`, `.nvmrc`
- Create: `tools/build-data.mjs`
- Create: `js/data.js` (generated)
- Test: `test/data.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "wud-fi-tideh",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "description": "A novelty site of Jamaican Patois proverbs from the Wud fi Tideh podcast.",
  "scripts": {
    "test": "node --test",
    "build:data": "node tools/build-data.mjs"
  }
}
```

- [ ] **Step 2: Create `.nvmrc`**

```
22
```

- [ ] **Step 3: Write `tools/build-data.mjs`** (parses the committed CSV → `js/data.js`)

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'data', 'wud-fi-tideh.csv');
const OUT_PATH = join(__dirname, '..', 'js', 'data.js');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);
const dataRows = rows.slice(1).filter(r => (r[0] || '').trim().length > 0);

const items = dataRows.map(r => ({
  original: (r[0] || '').trim(),
  english: (r[1] || '').trim(),
  meaning: (r[2] || '').trim(),
  audio: (r[3] || '').trim() || null,
  slug: (r[4] || '').trim()
}));

const banner = '// Auto-generated from data/wud-fi-tideh.csv by tools/build-data.mjs — do not edit by hand.\n';
const out = banner +
  '(function (root, factory) {\n' +
  '  var api = factory();\n' +
  '  if (typeof module !== "undefined" && module.exports) { module.exports = api; }\n' +
  '  else { root.WUD_DATA = api.WUD_DATA; }\n' +
  '})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n' +
  '  var WUD_DATA = ' + JSON.stringify(items, null, 2).replace(/\n/g, '\n  ') + ';\n' +
  '  return { WUD_DATA: WUD_DATA };\n' +
  '});\n';

writeFileSync(OUT_PATH, out, 'utf8');
console.log('Wrote ' + items.length + ' proverbs to ' + OUT_PATH);
```

- [ ] **Step 4: Generate the data file**

Run: `npm run build:data`
Expected: `Wrote 34 proverbs to .../js/data.js`

- [ ] **Step 5: Write the data shape test `test/data.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { WUD_DATA } = require('../js/data.js');

test('WUD_DATA is a non-trivial array', () => {
  assert.ok(Array.isArray(WUD_DATA));
  assert.ok(WUD_DATA.length >= 30, 'expected at least 30 proverbs');
});

test('every proverb has the required non-empty text fields', () => {
  for (const p of WUD_DATA) {
    for (const key of ['original', 'english', 'meaning']) {
      assert.equal(typeof p[key], 'string');
      assert.ok(p[key].length > 0, key + ' should be non-empty');
    }
    assert.equal(typeof p.slug, 'string');
    assert.ok(p.audio === null || typeof p.audio === 'string');
  }
});
```

- [ ] **Step 6: Run the test**

Run: `node --test test/data.test.js`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json .nvmrc tools/build-data.mjs js/data.js test/data.test.js
git commit -m "feat: scaffold project and generate embedded proverb data"
```

---

## Task 2: Daily selection (proverbs.js, TDD)

**Files:**
- Create: `js/proverbs.js`
- Test: `test/proverbs.daily.test.js`

- [ ] **Step 1: Write the failing test `test/proverbs.daily.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { dailyIndex } = require('../js/proverbs.js');

test('dailyIndex is deterministic for the same date', () => {
  assert.equal(dailyIndex('2026-06-24', 33), dailyIndex('2026-06-24', 33));
});

test('dailyIndex stays within range', () => {
  for (const d of ['2026-01-01', '2026-06-24', '2026-12-31', '2027-03-15']) {
    const i = dailyIndex(d, 33);
    assert.ok(Number.isInteger(i));
    assert.ok(i >= 0 && i < 33, d + ' -> ' + i);
  }
});

test('dailyIndex generally differs across consecutive days', () => {
  const a = dailyIndex('2026-06-24', 33);
  const b = dailyIndex('2026-06-25', 33);
  const c = dailyIndex('2026-06-26', 33);
  assert.ok(!(a === b && b === c), 'three consecutive days should not all collide');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/proverbs.daily.test.js`
Expected: FAIL — cannot find module `../js/proverbs.js`.

- [ ] **Step 3: Create `js/proverbs.js` with `dailyIndex`**

```js
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Proverbs = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var DEFAULT_HOSTS = {
    a: { name: 'Auntie Pearl', voice: 'a' },
    b: { name: 'Uncle Roy', voice: 'b' }
  };

  // djb2 string hash + avalanche finalization so the result spreads evenly for
  // ANY count. Without the mix, djb2's *33 recurrence makes (h % count)
  // degenerate when count shares a factor with 33 (e.g. count=33 -> only the
  // last character matters). A coverage regression test in
  // test/proverbs.daily.test.js guards this.
  function dailyIndex(dateStr, count) {
    var h = 5381;
    for (var i = 0; i < dateStr.length; i++) {
      h = ((h << 5) + h + dateStr.charCodeAt(i)) >>> 0;
    }
    h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return count > 0 ? h % count : 0;
  }

  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex
  };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/proverbs.daily.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add js/proverbs.js test/proverbs.daily.test.js
git commit -m "feat: deterministic daily proverb selection"
```

---

## Task 3: Random picks (proverbs.js, TDD)

**Files:**
- Modify: `js/proverbs.js`
- Test: `test/proverbs.picks.test.js`

- [ ] **Step 1: Write the failing test `test/proverbs.picks.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { pickN, randomIndexExcluding } = require('../js/proverbs.js');

// Deterministic RNG for tests (mulberry32).
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('pickN returns n distinct items from the source', () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const out = pickN(items, 5, seeded(42));
  assert.equal(out.length, 5);
  assert.equal(new Set(out).size, 5, 'all picks distinct');
  for (const x of out) assert.ok(items.includes(x));
});

test('pickN caps at the source length', () => {
  const out = pickN([1, 2, 3], 5, seeded(1));
  assert.equal(out.length, 3);
});

test('randomIndexExcluding never returns the excluded index', () => {
  for (let i = 0; i < 50; i++) {
    const idx = randomIndexExcluding(33, 10, seeded(i));
    assert.ok(idx >= 0 && idx < 33);
    assert.notEqual(idx, 10);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/proverbs.picks.test.js`
Expected: FAIL — `pickN is not a function`.

- [ ] **Step 3: Add `pickN` and `randomIndexExcluding` to `js/proverbs.js`**

Insert these function definitions before the `return {` statement, and add them to the returned object:

```js
  function pickN(items, n, rng) {
    rng = rng || Math.random;
    var pool = items.slice();
    var count = Math.min(n, pool.length);
    var out = [];
    for (var k = 0; k < count; k++) {
      var j = Math.floor(rng() * pool.length);
      out.push(pool[j]);
      pool.splice(j, 1);
    }
    return out;
  }

  function randomIndexExcluding(count, exclude, rng) {
    rng = rng || Math.random;
    if (count <= 1) return 0;
    var idx = exclude;
    while (idx === exclude) { idx = Math.floor(rng() * count); }
    return idx;
  }
```

Update the return block to:

```js
  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex,
    pickN: pickN,
    randomIndexExcluding: randomIndexExcluding
  };
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/proverbs.picks.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add js/proverbs.js test/proverbs.picks.test.js
git commit -m "feat: random distinct picks and shuffle-excluding helper"
```

---

## Task 4: Conversational script generation (proverbs.js, TDD)

**Files:**
- Modify: `js/proverbs.js`
- Test: `test/proverbs.script.test.js`

- [ ] **Step 1: Write the failing test `test/proverbs.script.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { generateScript, DEFAULT_HOSTS } = require('../js/proverbs.js');

function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIVE = [
  { original: 'O1', english: 'E1', meaning: 'M1' },
  { original: 'O2', english: 'E2', meaning: 'M2' },
  { original: 'O3', english: 'E3', meaning: 'M3' },
  { original: 'O4', english: 'E4', meaning: 'M4' },
  { original: 'O5', english: 'E5', meaning: 'M5' }
];

test('script starts with intro and ends with outro', () => {
  const s = generateScript(FIVE, DEFAULT_HOSTS, seeded(7));
  assert.equal(s[0].kind, 'intro');
  assert.equal(s[s.length - 1].kind, 'outro');
});

test('every proverb appears with patois, translation and meaning lines', () => {
  const s = generateScript(FIVE, DEFAULT_HOSTS, seeded(7));
  for (let i = 0; i < FIVE.length; i++) {
    const kinds = s.filter(l => l.proverb === i).map(l => l.kind);
    assert.ok(kinds.includes('patois'), 'proverb ' + i + ' patois');
    assert.ok(kinds.includes('translation'), 'proverb ' + i + ' translation');
    assert.ok(kinds.includes('meaning'), 'proverb ' + i + ' meaning');
  }
});

test('patois line text contains the original, translation contains the english', () => {
  const s = generateScript(FIVE, DEFAULT_HOSTS, seeded(7));
  const p0 = s.find(l => l.proverb === 0 && l.kind === 'patois');
  const t0 = s.find(l => l.proverb === 0 && l.kind === 'translation');
  assert.ok(p0.text.includes('O1'));
  assert.ok(t0.text.includes('E1'));
});

test('every line has a valid speaker and voice', () => {
  const s = generateScript(FIVE, DEFAULT_HOSTS, seeded(7));
  const names = [DEFAULT_HOSTS.a.name, DEFAULT_HOSTS.b.name];
  for (const l of s) {
    assert.ok(names.includes(l.speaker), 'speaker ' + l.speaker);
    assert.ok(l.voice === 'a' || l.voice === 'b');
    assert.equal(typeof l.text, 'string');
    assert.ok(l.text.length > 0);
  }
});

test('generation is deterministic for a fixed seed', () => {
  const a = generateScript(FIVE, DEFAULT_HOSTS, seeded(11));
  const b = generateScript(FIVE, DEFAULT_HOSTS, seeded(11));
  assert.deepEqual(a, b);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/proverbs.script.test.js`
Expected: FAIL — `generateScript is not a function`.

- [ ] **Step 3: Add `generateScript` to `js/proverbs.js`**

Insert before the `return {` statement, then add `generateScript` to the returned object:

```js
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  var INTRO_A = [
    'Welcome back to Wuds of Wisdom! Mi deh yah wid yu.',
    'Hello, hello! Yu tune in to Wuds of Wisdom.',
    'Greetings, mi people! Time fi some sweet wisdom.'
  ];
  var INTRO_B = [
    'Big up everybody tunin in. Wi have five proverb fi yu today.',
    'Wi pick five likkle gem fi share wid yu. Come een.',
    'Settle yusself, wi have five ole-time sayin fi yu.'
  ];
  var PATOIS_FRAMES = [
    'Ow about dis one: "{O}."',
    'Mi grandmodda did always seh: "{O}."',
    'Listen to dis: "{O}."',
    'Here go one: "{O}."'
  ];
  var TRANS_FRAMES = [
    'Dat mean: "{E}."',
    'In plain English, dat a seh: "{E}."',
    'Yu know wha dat mean? "{E}."'
  ];
  var MEANING_FRAMES = [
    'True true. Basically, {M}',
    'In oder wuds, {M}',
    'An di lesson deh: {M}',
    'Mmm-hmm. {M}'
  ];
  var OUTRO = [
    'An dat a di wisdom fi today. Walk good, an ketch yu next time!',
    'Tek dem wid yu. Walk good, till wi chat again!',
    'Likkle but talawah. Walk good, everybody!'
  ];

  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function generateScript(proverbs, hosts, rng) {
    rng = rng || Math.random;
    hosts = hosts || DEFAULT_HOSTS;
    var lines = [];
    function add(host, kind, text, proverb) {
      lines.push({ speaker: host.name, voice: host.voice, text: text, kind: kind, proverb: (proverb == null ? null : proverb) });
    }
    add(hosts.a, 'intro', pick(rng, INTRO_A), null);
    add(hosts.b, 'intro', pick(rng, INTRO_B), null);

    for (var i = 0; i < proverbs.length; i++) {
      var p = proverbs[i];
      var lead = (i % 2 === 0) ? hosts.a : hosts.b;
      var other = (lead === hosts.a) ? hosts.b : hosts.a;
      add(lead, 'patois', pick(rng, PATOIS_FRAMES).replace('{O}', p.original), i);
      add(other, 'translation', pick(rng, TRANS_FRAMES).replace('{E}', p.english), i);
      add(lead, 'meaning', pick(rng, MEANING_FRAMES).replace('{M}', lowerFirst(p.meaning)), i);
    }

    add(hosts.b, 'outro', pick(rng, OUTRO), null);
    return lines;
  }
```

Return block becomes:

```js
  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex,
    pickN: pickN,
    randomIndexExcluding: randomIndexExcluding,
    generateScript: generateScript
  };
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/proverbs.script.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS (all proverbs + data tests green)

- [ ] **Step 6: Commit**

```bash
git add js/proverbs.js test/proverbs.script.test.js
git commit -m "feat: generate two-host conversational radio script"
```

---

## Task 5: Theme resolution (theme.js, TDD + DOM wiring)

**Files:**
- Create: `js/theme.js`
- Test: `test/theme.test.js`

- [ ] **Step 1: Write the failing test `test/theme.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { resolveTheme } = require('../js/theme.js');

test('stored preference always wins', () => {
  assert.equal(resolveTheme(2, 'day'), 'day');
  assert.equal(resolveTheme(14, 'night'), 'night');
});

test('with no stored preference, daytime hours resolve to day', () => {
  assert.equal(resolveTheme(6, null), 'day');
  assert.equal(resolveTheme(12, null), 'day');
  assert.equal(resolveTheme(17, null), 'day');
});

test('with no stored preference, night hours resolve to night', () => {
  assert.equal(resolveTheme(5, null), 'night');
  assert.equal(resolveTheme(18, null), 'night');
  assert.equal(resolveTheme(23, null), 'night');
});

test('an invalid stored value is ignored and falls back to time', () => {
  assert.equal(resolveTheme(12, 'banana'), 'day');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/theme.test.js`
Expected: FAIL — cannot find module `../js/theme.js`.

- [ ] **Step 3: Create `js/theme.js`**

```js
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Theme = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var KEY = 'wft-theme';

  function resolveTheme(hour, stored) {
    if (stored === 'day' || stored === 'night') return stored;
    return (hour >= 6 && hour < 18) ? 'day' : 'night';
  }

  // Browser-only wiring; called from app.js after DOM is ready.
  function initTheme(doc, win) {
    doc = doc || document; win = win || window;
    var stored = null;
    try { stored = win.localStorage.getItem(KEY); } catch (e) {}
    var current = resolveTheme(new Date().getHours(), stored);
    apply(doc, current);

    var btn = doc.getElementById('theme-toggle');
    if (btn) {
      updateButton(btn, current);
      btn.addEventListener('click', function () {
        current = (current === 'day') ? 'night' : 'day';
        apply(doc, current);
        updateButton(btn, current);
        try { win.localStorage.setItem(KEY, current); } catch (e) {}
      });
    }
  }

  function apply(doc, theme) {
    doc.documentElement.setAttribute('data-theme', theme);
  }

  function updateButton(btn, theme) {
    var toNight = (theme === 'day');
    btn.setAttribute('aria-label', toNight ? 'Switch to night theme' : 'Switch to day theme');
    btn.innerHTML = toNight
      ? '<i class="ti ti-moon" aria-hidden="true"></i>'
      : '<i class="ti ti-sun" aria-hidden="true"></i>';
  }

  return { resolveTheme: resolveTheme, initTheme: initTheme };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/theme.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add js/theme.js test/theme.test.js
git commit -m "feat: day/night theme resolution and toggle wiring"
```

---

## Task 6: Voice choice + TTS engine (audio.js, TDD for the seam)

**Files:**
- Create: `js/audio.js`
- Test: `test/audio.test.js`

- [ ] **Step 1: Write the failing test `test/audio.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const { chooseVoices } = require('../js/audio.js');

const v = (name, lang, def) => ({ name, lang, default: !!def });

test('returns null when no voices are available', () => {
  assert.equal(chooseVoices([]), null);
});

test('prefers two distinct English voices', () => {
  const voices = [v('Bsi', 'fr-FR'), v('Alex', 'en-US'), v('Kate', 'en-GB')];
  const out = chooseVoices(voices);
  assert.ok(out.a && out.b);
  assert.notEqual(out.a.name, out.b.name);
  assert.ok(out.a.lang.indexOf('en') === 0);
  assert.ok(out.b.lang.indexOf('en') === 0);
});

test('falls back to the same single voice for both hosts', () => {
  const voices = [v('Solo', 'en-US')];
  const out = chooseVoices(voices);
  assert.equal(out.a.name, 'Solo');
  assert.equal(out.b.name, 'Solo');
});

test('uses any voices when none are English', () => {
  const voices = [v('Una', 'es-ES'), v('Dos', 'de-DE')];
  const out = chooseVoices(voices);
  assert.ok(out.a && out.b);
  assert.notEqual(out.a.name, out.b.name);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/audio.test.js`
Expected: FAIL — cannot find module `../js/audio.js`.

- [ ] **Step 3: Create `js/audio.js`**

```js
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Radio = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function chooseVoices(voices) {
    if (!voices || voices.length === 0) return null;
    var english = voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('en') === 0; });
    var pool = english.length >= 1 ? english : voices;
    var a = pool[0];
    var b = pool.length > 1 ? pool[1] : pool[0];
    return { a: a, b: b };
  }

  // Per-host speech characteristics so the two hosts are distinguishable
  // even when only one system voice exists.
  var STYLE = {
    a: { pitch: 1.18, rate: 0.97 }, // Auntie Pearl — higher, lively
    b: { pitch: 0.82, rate: 0.95 }  // Uncle Roy — lower, easy
  };

  function RadioPlayer(synth) {
    this.synth = synth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.voices = null;
    this.script = [];
    this.index = 0;
    this.playing = false;
    this.callbacks = {};
  }

  RadioPlayer.prototype.supported = function () { return !!this.synth; };

  RadioPlayer.prototype.loadVoices = function (cb) {
    var self = this;
    if (!this.synth) { cb(null); return; }
    var got = this.synth.getVoices();
    if (got && got.length) { this.voices = chooseVoices(got); cb(self.voices); return; }
    this.synth.onvoiceschanged = function () {
      self.voices = chooseVoices(self.synth.getVoices());
      cb(self.voices);
    };
  };

  RadioPlayer.prototype.play = function (script, callbacks) {
    if (!this.synth) { if (callbacks && callbacks.onUnsupported) callbacks.onUnsupported(); return; }
    this.stop();
    this.script = script || [];
    this.callbacks = callbacks || {};
    this.index = 0;
    this.playing = true;
    this._speakFrom(0);
  };

  RadioPlayer.prototype._speakFrom = function (start) {
    var self = this;
    var voices = this.voices || {};
    for (var i = start; i < this.script.length; i++) {
      (function (i) {
        var line = self.script[i];
        var u = new (typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : function () {})(line.text);
        var style = STYLE[line.voice] || STYLE.a;
        if (voices[line.voice]) u.voice = voices[line.voice];
        u.pitch = style.pitch; u.rate = style.rate; u.lang = (u.voice && u.voice.lang) || 'en-US';
        u.onstart = function () { self.index = i; if (self.callbacks.onLineStart) self.callbacks.onLineStart(i, line); };
        u.onend = function () {
          if (i === self.script.length - 1 && self.playing) {
            self.playing = false;
            if (self.callbacks.onEnd) self.callbacks.onEnd();
          }
        };
        self.synth.speak(u);
      })(i);
    }
  };

  RadioPlayer.prototype.pause = function () { if (this.synth && this.playing) { this.synth.pause(); } };
  RadioPlayer.prototype.resume = function () { if (this.synth) { this.synth.resume(); } };
  RadioPlayer.prototype.stop = function () {
    if (this.synth) { this.synth.cancel(); }
    this.playing = false;
  };

  return { chooseVoices: chooseVoices, RadioPlayer: RadioPlayer };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/audio.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add js/audio.js test/audio.test.js
git commit -m "feat: voice selection and speech-synthesis radio player"
```

---

## Task 7: HTML skeleton

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html`** (all sections, semantic landmarks, no-flash theme script, script tags at end)

```html
<!DOCTYPE html>
<html lang="en" data-theme="day">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wud fi Tideh — Jamaican wisdom fi every day</title>
  <meta name="description" content="A daily dose of Jamaican Patois proverbs, with translations, meanings, and a conversational radio segment." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.5.0/dist/tabler-icons.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <script>
    (function () {
      try {
        var s = localStorage.getItem('wft-theme');
        var h = new Date().getHours();
        var t = (s === 'day' || s === 'night') ? s : ((h >= 6 && h < 18) ? 'day' : 'night');
        document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
</head>
<body>
  <header class="site-header">
    <a class="wordmark" href="#top">Wud fi <span>Tideh</span></a>
    <nav class="site-nav" aria-label="Sections">
      <a href="#daily">Daily Wud</a>
      <a href="#wow">Wuds of Wisdom</a>
      <a href="#original">The Original</a>
      <a href="#legends">Legends</a>
    </nav>
    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch theme"></button>
  </header>

  <main id="top">
    <section class="hero">
      <h1>Wud fi Tideh</h1>
      <p>A piece a Jamaican wisdom fi every day</p>
      <div class="flag-rule" aria-hidden="true"><span></span><span></span><span></span></div>
    </section>

    <section id="daily" class="section">
      <article class="daily-card">
        <div class="card-top">
          <span class="eyebrow">The Daily Wud</span>
          <span id="daily-date" class="date"></span>
        </div>
        <p id="daily-original" class="patois"></p>
        <p id="daily-english" class="english"></p>
        <p id="daily-meaning" class="meaning"></p>
        <div class="actions">
          <button id="daily-hear" class="btn btn-green" type="button"><i class="ti ti-volume" aria-hidden="true"></i> Hear it</button>
          <button id="daily-shuffle" class="btn btn-gold" type="button"><i class="ti ti-refresh" aria-hidden="true"></i> Gimme anodda one</button>
          <button id="daily-reset" class="btn btn-ghost" type="button" hidden><i class="ti ti-arrow-back-up" aria-hidden="true"></i> Back to today</button>
        </div>
      </article>
    </section>

    <section id="wow" class="section">
      <div class="wow-studio">
        <div class="wow-head">
          <div>
            <h2>Wuds of Wisdom</h2>
            <p>Five proverbs, one likkle radio session</p>
          </div>
          <button id="wow-mix" class="btn btn-orange" type="button"><i class="ti ti-refresh" aria-hidden="true"></i> Mix up a new session</button>
        </div>
        <div class="wow-controls">
          <button id="wow-play" class="round-btn" type="button" aria-label="Play session"><i class="ti ti-player-play" aria-hidden="true"></i></button>
          <button id="wow-pause" class="round-btn" type="button" aria-label="Pause" hidden><i class="ti ti-player-pause" aria-hidden="true"></i></button>
          <button id="wow-stop" class="round-btn" type="button" aria-label="Stop" hidden><i class="ti ti-player-stop" aria-hidden="true"></i></button>
          <div id="wow-progress" class="wow-progress"><span id="wow-progress-bar"></span></div>
        </div>
        <p id="wow-status" class="wow-status" role="status" aria-live="polite"></p>
        <div id="wow-transcript" class="wow-transcript" aria-label="Session transcript"></div>
      </div>
    </section>

    <section id="original" class="section">
      <div class="podcast">
        <div class="vinyl" aria-hidden="true"><span></span></div>
        <div class="podcast-body">
          <h2>Hear the Original</h2>
          <p>Donald Thompson's "Wud fi Tideh" podcast</p>
          <audio id="podcast-audio" preload="none" src="audio/wud-fi-tideh.mp3"></audio>
          <div id="podcast-player" class="podcast-player" hidden>
            <button class="btn btn-gold" type="button" onclick="document.getElementById('podcast-audio').play()"><i class="ti ti-player-play" aria-hidden="true"></i> Play</button>
          </div>
          <p id="podcast-missing" class="podcast-missing">The original recording is coming soon.</p>
        </div>
      </div>
    </section>

    <section id="legends" class="legends">
      <div class="legends-inner">
        <p class="eyebrow center">A weh wi come from</p>
        <h2 class="legends-title">The Voice of the People</h2>
        <article class="legend-feature">
          <span class="portrait portrait-lg" aria-hidden="true">LB</span>
          <div>
            <h3>Louise Bennett-Coverley</h3>
            <p class="legend-dates">"Miss Lou" · 1919–2006</p>
            <p class="legend-text"></p>
          </div>
        </article>
        <div class="legend-cards">
          <article class="legend-card">
            <span class="portrait" aria-hidden="true">CM</span>
            <h3>Claude McKay</h3>
            <p class="legend-dates">1890–1948</p>
            <p class="legend-text"></p>
          </article>
          <article class="legend-card">
            <span class="portrait" aria-hidden="true">LB</span>
            <h3>Louise Bennett</h3>
            <p class="legend-dates">Poet · Folklorist</p>
            <p class="legend-text"></p>
          </article>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <p class="farewell">Walk good.</p>
    <p class="credit">Proverbs from the “Wud fi Tideh” podcast by Donald Thompson</p>
    <div class="flag-rule small" aria-hidden="true"><span></span><span></span><span></span></div>
  </footer>

  <script src="js/data.js"></script>
  <script src="js/proverbs.js"></script>
  <script src="js/theme.js"></script>
  <script src="js/audio.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

(Legends paragraph text is intentionally empty here; Task 13 fills it with verified, final copy.)

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: page skeleton with all sections and semantic landmarks"
```

---

## Task 8: Stylesheet — layout + Sunsplash (day) theme

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Create `css/styles.css`** (design tokens, day palette, full layout)

```css
:root {
  --radius: 16px;
  --radius-sm: 12px;
  --maxw: 760px;
  --font-display: 'Fredoka', system-ui, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

html[data-theme='day'] {
  --bg: #FFF7E6; --surface: #FFFFFF; --ink: #1A1A1A; --muted: #5A5346;
  --green: #0F8B3B; --gold: #E8A200; --gold-bright: #FFD23F; --orange: #FF7A1A;
  --hero-bg: #FFC400; --hero-ink: #1A1A1A; --header-bg: #0F8B3B; --header-ink: #FFF7E6;
  --studio-bg: #1A1A1A; --studio-ink: #F5ECD8; --studio-panel: #262320; --studio-accent: #FFD23F;
  --legends-bg: #15140F; --legends-ink: #FFF7E6; --legends-card: #211F18; --legends-muted: #C7BFAE;
  --footer-bg: #0F8B3B; --footer-ink: #FFF7E6;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: var(--font-body); line-height: 1.6;
}

.site-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 14px;
  background: var(--header-bg); color: var(--header-ink);
  padding: 10px 18px;
}
.wordmark { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--header-ink); text-decoration: none; }
.wordmark span { color: var(--gold-bright); }
.site-nav { margin-left: auto; display: flex; gap: 14px; flex-wrap: wrap; }
.site-nav a { color: var(--header-ink); text-decoration: none; font-size: 14px; font-family: var(--font-display); }
.site-nav a:hover { text-decoration: underline; }
.theme-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,0.2); color: var(--header-ink); font-size: 18px;
}
.theme-toggle:hover { background: rgba(255,255,255,0.32); }

.hero { background: var(--hero-bg); color: var(--hero-ink); text-align: center; padding: 40px 20px 32px; }
.hero h1 { font-family: var(--font-display); font-weight: 700; font-size: 44px; margin: 0; line-height: 1.05; }
.hero p { font-family: var(--font-display); font-size: 17px; margin: 8px 0 0; }
.flag-rule { display: flex; justify-content: center; gap: 6px; margin-top: 18px; }
.flag-rule span { width: 52px; height: 6px; border-radius: 3px; }
.flag-rule span:nth-child(1) { background: var(--green); }
.flag-rule span:nth-child(2) { background: var(--ink); }
.flag-rule span:nth-child(3) { background: var(--orange); }
.flag-rule.small span { width: 36px; height: 4px; }

.section { max-width: var(--maxw); margin: 0 auto; padding: 22px 18px; }

.daily-card { background: var(--surface); border-radius: var(--radius); border-left: 7px solid var(--green); padding: 22px 24px; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; color: var(--gold); }
.eyebrow.center { display: block; text-align: center; color: var(--studio-accent); }
.date { font-size: 12px; color: var(--muted); }
.patois { font-family: var(--font-display); font-weight: 600; font-size: 26px; line-height: 1.25; margin: 0 0 12px; color: var(--ink); }
.english { font-size: 15px; color: var(--green); font-weight: 500; margin: 0 0 8px; }
.meaning { font-size: 14px; color: var(--muted); margin: 0 0 18px; }

.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn { font-family: var(--font-display); font-weight: 500; font-size: 14px; border: none; border-radius: 24px; padding: 9px 16px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
.btn-green { background: var(--green); color: #fff; }
.btn-gold { background: var(--gold-bright); color: var(--ink); }
.btn-orange { background: var(--orange); color: #fff; }
.btn-ghost { background: transparent; border: 1.5px solid currentColor; color: var(--muted); }
.btn:hover { filter: brightness(1.05); }
.btn:focus-visible, .round-btn:focus-visible, .theme-toggle:focus-visible, a:focus-visible { outline: 3px solid var(--orange); outline-offset: 2px; }

.wow-studio { max-width: var(--maxw); margin: 0 auto; background: var(--studio-bg); color: var(--studio-ink); border-radius: var(--radius); padding: 22px 24px; }
.wow-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.wow-head h2 { font-family: var(--font-display); font-size: 22px; margin: 0; color: var(--studio-accent); }
.wow-head p { margin: 2px 0 0; font-size: 13px; color: #B8AF9C; }
.wow-controls { display: flex; align-items: center; gap: 14px; background: var(--studio-panel); border-radius: var(--radius-sm); padding: 14px 16px; }
.round-btn { width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer; background: var(--green); color: #fff; font-size: 22px; display: inline-flex; align-items: center; justify-content: center; }
.wow-progress { flex: 1; height: 6px; background: #444; border-radius: 3px; overflow: hidden; }
.wow-progress span { display: block; width: 0%; height: 6px; background: var(--studio-accent); border-radius: 3px; transition: width 0.3s ease; }
.wow-status { font-size: 13px; color: #B8AF9C; margin: 12px 0 0; min-height: 18px; }
.wow-transcript { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.t-line { background: var(--studio-panel); border-radius: 10px; padding: 10px 14px; font-size: 14px; line-height: 1.5; opacity: 0.78; }
.t-line .who { font-weight: 600; }
.t-line.voice-a .who { color: var(--studio-accent); }
.t-line.voice-b .who { color: var(--orange); }
.t-line.active { opacity: 1; outline: 2px solid var(--studio-accent); }

.podcast { max-width: var(--maxw); margin: 0 auto; display: flex; align-items: center; gap: 16px; background: #2B1B33; color: #F3E9F7; border-radius: var(--radius); padding: 18px 22px; }
.vinyl { width: 48px; height: 48px; border-radius: 50%; background: #0E0D0C; border: 2px solid var(--studio-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vinyl span { width: 7px; height: 7px; border-radius: 50%; background: var(--studio-accent); }
.podcast-body { flex: 1; }
.podcast-body h2 { font-family: var(--font-display); font-size: 18px; margin: 0; color: var(--studio-accent); }
.podcast-body p { margin: 2px 0 0; font-size: 13px; color: #C9B8D6; }
.podcast-missing { font-style: italic; opacity: 0.85; }

.legends { background: var(--legends-bg); color: var(--legends-ink); padding: 34px 18px; margin-top: 12px; }
.legends-inner { max-width: var(--maxw); margin: 0 auto; }
.legends-title { font-family: var(--font-serif); font-weight: 700; font-size: 28px; text-align: center; margin: 4px 0 22px; }
.legend-feature { display: flex; gap: 16px; align-items: flex-start; background: var(--legends-card); border-radius: var(--radius-sm); padding: 20px; margin-bottom: 16px; }
.legend-cards { display: flex; gap: 14px; flex-wrap: wrap; }
.legend-card { flex: 1; min-width: 200px; background: var(--legends-card); border-radius: var(--radius-sm); padding: 18px; text-align: center; }
.legend-card .portrait { margin: 0 auto 10px; }
.portrait { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%; background: var(--green); color: var(--gold-bright); font-family: var(--font-serif); font-weight: 700; font-size: 17px; flex-shrink: 0; }
.portrait-lg { width: 64px; height: 64px; font-size: 21px; }
.legend-feature h3, .legend-card h3 { font-family: var(--font-serif); margin: 0 0 2px; color: var(--legends-ink); }
.legend-dates { font-size: 12px; color: var(--gold-bright); margin: 0 0 8px; }
.legend-text { font-size: 13.5px; color: var(--legends-muted); line-height: 1.6; margin: 0; }

.site-footer { background: var(--footer-bg); color: var(--footer-ink); text-align: center; padding: 22px 18px; }
.farewell { font-family: var(--font-serif); font-style: italic; font-size: 18px; margin: 0 0 6px; }
.credit { font-size: 12px; opacity: 0.9; margin: 0; }

@media (max-width: 560px) {
  .site-nav { display: none; }
  .hero h1 { font-size: 34px; }
  .patois { font-size: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .wow-progress span { transition: none; }
}
```

- [ ] **Step 2: Verify visually (day theme)**

Run: `python3 -m http.server 8000` (from repo root), open `http://localhost:8000/`.
Expected: bright Sunsplash page; all sections present; header sticky; cards laid out. (Content is wired in later tasks — empty proverb text is fine here.) Stop the server when done.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: layout and Sunsplash day theme"
```

---

## Task 9: Reggae Dusk (night) theme

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Add the night palette block** — insert immediately after the `html[data-theme='day'] { ... }` block in `css/styles.css`:

```css
html[data-theme='night'] {
  --bg: #1A1816; --surface: #262320; --ink: #F5ECD8; --muted: #B8AF9C;
  --green: #2FA84F; --gold: #F2B705; --gold-bright: #F2B705; --orange: #FF8C3B;
  --hero-bg: #211F18; --hero-ink: #F2B705; --header-bg: #0E0D0C; --header-ink: #F2B705;
  --studio-bg: #211F18; --studio-ink: #F5ECD8; --studio-panel: #15140F; --studio-accent: #F2B705;
  --legends-bg: #100F0C; --legends-ink: #F5ECD8; --legends-card: #1C1A15; --legends-muted: #BBB2A1;
  --footer-bg: #0E0D0C; --footer-ink: #F2B705;
}
html[data-theme='night'] .daily-card { border-left-color: var(--green); }
html[data-theme='night'] .hero { border-bottom: 1px solid #332F25; }
html[data-theme='night'] .wow-studio { border: 1px solid #3A3528; }
html[data-theme='night'] .podcast { background: #2A2118; border: 1px solid #463720; color: #F3E7D2; }
html[data-theme='night'] .podcast-body p { color: #C2B59C; }
html[data-theme='night'] .legend-feature, html[data-theme='night'] .legend-card { border: 1px solid #2E2A22; }
```

- [ ] **Step 2: Verify the toggle visually**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/`, click the theme toggle in the header.
Expected: page flips between bright Sunsplash and deep Reggae Dusk; text stays legible in both; choice persists on reload. Stop the server when done.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: Reggae Dusk night theme and toggle styling"
```

---

## Task 10: Wire the Daily Wud + theme init (app.js)

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create `js/app.js`** with theme init + Daily Wud rendering and controls

```js
(function () {
  var data = window.WUD_DATA || [];
  var P = window.Proverbs;

  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function prettyDate() {
    try {
      return new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return todayStr(); }
  }

  var dailyIdx = null;
  var todayIdx = null;

  function renderDaily(idx, isToday) {
    var p = data[idx];
    if (!p) return;
    dailyIdx = idx;
    document.getElementById('daily-original').textContent = p.original;
    document.getElementById('daily-english').textContent = '“' + p.english + '”';
    document.getElementById('daily-meaning').textContent = p.meaning;
    document.getElementById('daily-date').textContent = prettyDate();
    document.getElementById('daily-reset').hidden = !!isToday;
  }

  function initDaily() {
    if (!data.length) return;
    todayIdx = P.dailyIndex(todayStr(), data.length);
    renderDaily(todayIdx, true);

    document.getElementById('daily-shuffle').addEventListener('click', function () {
      renderDaily(P.randomIndexExcluding(data.length, dailyIdx), false);
      speak(data[dailyIdx].original);
    });
    document.getElementById('daily-reset').addEventListener('click', function () {
      renderDaily(todayIdx, true);
    });
    document.getElementById('daily-hear').addEventListener('click', function () {
      speak(data[dailyIdx].original);
    });
  }

  // Lightweight one-off speech for the Daily Wud "Hear it".
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.Theme) window.Theme.initTheme(document, window);
    initDaily();
  });

  // Exposed for later tasks (Wuds of Wisdom, podcast) to extend.
  window.__WFT__ = { data: data, speak: speak };
})();
```

- [ ] **Step 2: Verify visually**

Run: `python3 -m http.server 8000`, open the page.
Expected: today's proverb shows with date; "Gimme anodda one" swaps to a different proverb and reveals "Back to today"; "Back to today" restores today's; "Hear it" speaks (audio depends on the browser's voices). Stop the server.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: render Daily Wud with shuffle, reset and hear-it"
```

---

## Task 11: Wire Wuds of Wisdom (app.js)

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add the Wuds of Wisdom controller** — insert this function in `js/app.js` before the `DOMContentLoaded` listener:

```js
  function initWow() {
    if (!data.length || !window.Radio) return;
    var player = new window.Radio.RadioPlayer();
    var transcriptEl = document.getElementById('wow-transcript');
    var statusEl = document.getElementById('wow-status');
    var barEl = document.getElementById('wow-progress-bar');
    var playBtn = document.getElementById('wow-play');
    var pauseBtn = document.getElementById('wow-pause');
    var stopBtn = document.getElementById('wow-stop');
    var mixBtn = document.getElementById('wow-mix');
    var script = [];

    function renderTranscript() {
      transcriptEl.innerHTML = '';
      script.forEach(function (line, i) {
        var div = document.createElement('div');
        div.className = 't-line voice-' + line.voice;
        div.setAttribute('data-line', i);
        div.innerHTML = '<span class="who">' + line.speaker + ':</span> ' + escapeHtml(line.text);
        transcriptEl.appendChild(div);
      });
      setProgress(0);
    }

    function setProgress(i) {
      var pct = script.length ? Math.round((i / script.length) * 100) : 0;
      barEl.style.width = pct + '%';
    }

    function highlight(i) {
      var nodes = transcriptEl.querySelectorAll('.t-line');
      for (var k = 0; k < nodes.length; k++) nodes[k].classList.toggle('active', k === i);
      setProgress(i + 1);
    }

    function newSession() {
      player.stop();
      var picks = window.Proverbs.pickN(data, 5);
      script = window.Proverbs.generateScript(picks, window.Proverbs.DEFAULT_HOSTS);
      renderTranscript();
      statusEl.textContent = 'Press play fi hear Auntie Pearl an Uncle Roy.';
      showPlaying(false);
    }

    function showPlaying(on) {
      playBtn.hidden = on; pauseBtn.hidden = !on; stopBtn.hidden = !on;
    }

    if (!player.supported()) {
      statusEl.textContent = 'Yu browser cyaan talk — but read di transcript below.';
    }

    playBtn.addEventListener('click', function () {
      if (!script.length) newSession();
      player.loadVoices(function () {
        player.play(script, {
          onLineStart: function (i) { highlight(i); },
          onEnd: function () { showPlaying(false); statusEl.textContent = 'Dat done! Mix up a new session?'; setProgress(script.length); },
          onUnsupported: function () { statusEl.textContent = 'Yu browser cyaan talk — but read di transcript below.'; }
        });
        showPlaying(true);
        statusEl.textContent = 'On air…';
      });
    });
    pauseBtn.addEventListener('click', function () { player.pause(); });
    stopBtn.addEventListener('click', function () { player.stop(); showPlaying(false); highlight(-1); setProgress(0); statusEl.textContent = 'Stopped.'; });
    mixBtn.addEventListener('click', newSession);

    newSession();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
```

- [ ] **Step 2: Call `initWow()`** — update the `DOMContentLoaded` listener body to:

```js
    if (window.Theme) window.Theme.initTheme(document, window);
    initDaily();
    initWow();
    initPodcast();
```

(`initPodcast` is added in Task 12; add the call now so the listener is final — Task 12 defines the function. If running this task standalone before Task 12, temporarily omit the `initPodcast();` line and add it back in Task 12.)

- [ ] **Step 3: Verify visually**

Run: `python3 -m http.server 8000`, open the page, scroll to Wuds of Wisdom.
Expected: a transcript of ~18 lines (Auntie Pearl / Uncle Roy alternating, 5 proverbs); "Mix up a new session" regenerates it; "Play" speaks the lines and highlights each as it goes with the progress bar advancing; pause/stop work. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: Wuds of Wisdom session generation, playback and transcript sync"
```

---

## Task 12: Podcast player present/absent (app.js)

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add `initPodcast()`** — insert before the `DOMContentLoaded` listener in `js/app.js`:

```js
  function initPodcast() {
    var audio = document.getElementById('podcast-audio');
    var player = document.getElementById('podcast-player');
    var missing = document.getElementById('podcast-missing');
    if (!audio) return;
    // If the file is present and loadable, show the player; otherwise keep the
    // "coming soon" note. 'error' fires when the src 404s.
    audio.addEventListener('error', function () { player.hidden = true; missing.hidden = false; });
    audio.addEventListener('loadedmetadata', function () { player.hidden = false; missing.hidden = true; });
    // Trigger a metadata probe without autoplaying.
    try { audio.load(); } catch (e) {}
  }
```

- [ ] **Step 2: Ensure the `DOMContentLoaded` listener includes `initPodcast();`** (added in Task 11 Step 2). If it was omitted, add it now.

- [ ] **Step 3: Verify both states**

Run: `python3 -m http.server 8000`, open the page.
Expected (no mp3 yet): the original section shows "The original recording is coming soon." and no Play button.
Then create a dummy file to confirm the present-state: `mkdir -p audio && cp <any small mp3> audio/wud-fi-tideh.mp3` (or skip if none handy), reload → Play button appears. Remove the dummy afterwards. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: original-podcast player with graceful coming-soon state"
```

---

## Task 13: Legends content (verified copy)

**Files:**
- Modify: `index.html`

All facts below are verified against Wikipedia (Louise Bennett-Coverley; Claude McKay), June 2026. Note McKay's birth year is **1890**.

- [ ] **Step 1: Fill the feature reflection** — set the text of `.legend-feature .legend-text` in `index.html` to:

```
She took the everyday speech of the Jamaican people — long dismissed as “broken English” — and proved it a language fit for poetry, satire and serious art. Through her verse, her Anancy folk tales and decades of performance, “Miss Lou” made Jamaican Patois a celebrated “nation language,” and gave the writers who came after her permission to speak in their own voice.
```

- [ ] **Step 2: Fill the Claude McKay card** — set that card's `.legend-text` to:

```
Born in Clarendon, Jamaica, McKay published “Songs of Jamaica” and “Constab Ballads” in 1912 — the first books of poetry written in Jamaican Patois. He went on to become a central voice of the Harlem Renaissance (“If We Must Die,” 1919; “Home to Harlem,” 1928).
```

- [ ] **Step 3: Fill the Louise Bennett card** — set that card's `.legend-text` to:

```
Poet, folklorist and performer whose “Jamaica Labrish” (1966) and Anancy stories carried the island's voice to the world. Honoured with the Jamaican Order of Merit in 2001.
```

- [ ] **Step 4: Verify visually**

Run: `python3 -m http.server 8000`, open the page, scroll to Legends in both themes.
Expected: reverent serif memorial; accurate dates and works; readable in day and night. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: verified Legends memorial content (Miss Lou, Claude McKay)"
```

---

## Task 14: Accessibility, responsive & cross-theme polish pass

**Files:**
- Modify: `css/styles.css`, `index.html` (as needed)

- [ ] **Step 1: Add a skip link** — insert as the first child of `<body>` in `index.html`:

```html
  <a class="skip-link" href="#top">Skip to content</a>
```

And add to `css/styles.css`:

```css
.skip-link { position: absolute; left: -9999px; top: 0; background: var(--ink); color: var(--bg); padding: 8px 14px; border-radius: 0 0 8px 0; z-index: 20; }
.skip-link:focus { left: 0; }
```

- [ ] **Step 2: Manual a11y + responsive checklist** (fix any failures inline, then re-verify):

Run: `python3 -m http.server 8000` and check:
- [ ] Keyboard: Tab reaches the skip link, nav, theme toggle, and every button with a visible focus ring.
- [ ] Each icon-only button (`#theme-toggle`, `#wow-play/pause/stop`) has an `aria-label`.
- [ ] At 360px width nothing overflows horizontally; cards stack; hero text fits.
- [ ] Contrast: proverb, translation and meaning text are legible in BOTH themes (check the studio and legends sections especially).
- [ ] With OS "reduce motion" on, no smooth-scroll or progress animation.
- [ ] `speechSynthesis`-absent path: transcript still readable and a status message explains it.

Stop the server.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all unit tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css index.html
git commit -m "feat: accessibility, responsive and cross-theme polish"
```

---

## Task 15: README + deployment

**Files:**
- Create: `README.md`
- Create: `audio/.gitkeep`

- [ ] **Step 1: Create `audio/.gitkeep`** (empty file, so the folder exists for the user's mp3)

```
```

- [ ] **Step 2: Create `README.md`**

````markdown
# Wud fi Tideh

A colourful, self-contained web page celebrating Jamaican Patois proverbs from
Donald Thompson's "Wud fi Tideh" podcast.

- **The Daily Wud** — today's proverb with its English translation and meaning.
- **Wuds of Wisdom** — five random proverbs turned into a two-host radio
  segment, spoken aloud by the browser, with a live transcript.
- **Legends** — a tribute to Louise Bennett-Coverley ("Miss Lou") and Claude
  McKay, who made Patois a literary language.
- Day/night theme: **Sunsplash** by day, **Reggae Dusk** by night.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

(Open over http rather than file:// so the audio and fonts load cleanly.)

## Add the original podcast

Drop the mp3 at `audio/wud-fi-tideh.mp3`. The "Hear the Original" player
activates automatically; until then it shows a "coming soon" note.

## Update the proverbs

The data is embedded in `js/data.js`, generated from `data/wud-fi-tideh.csv`:

```bash
npm run build:data
```

## Test

```bash
npm test   # Node's built-in runner; no dependencies
```

## Deploy (GitHub Pages)

Push to GitHub, then enable Pages → Deploy from branch → `main` / root. The site
is plain static files at the repo root.

## Credits

Proverbs from the "Wud fi Tideh" podcast by Donald Thompson. Built as a tribute
to the Jamaican literary tradition.
````

- [ ] **Step 3: Final full verification**

Run: `npm test` (expect all green), then `python3 -m http.server 8000` and walk the whole page once more in both themes. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add README.md audio/.gitkeep
git commit -m "docs: README and deployment notes"
```

---

## Self-review against the spec

- **Daily Wud** (deterministic + shuffle + hear) → Tasks 2, 10. ✓
- **Wuds of Wisdom** (5 random, two-host script, browser TTS, transcript, mix-up) → Tasks 3, 4, 6, 11. ✓
- **Legends memorial** (Miss Lou feature + McKay/Bennett cards, verified) → Tasks 7, 13. ✓
- **Original podcast player** (present/absent) → Tasks 7, 12. ✓
- **Day/night theme toggle + auto-by-time + persistence** → Tasks 5, 8, 9. ✓
- **Embedded data from the Sheet** → Task 1. ✓
- **Self-contained static site, no build, GitHub Pages** → Tasks 7–9, 15. ✓
- **Accessibility & responsive** → Task 14. ✓
- **TDD on pure logic; manual/visual for UI** → Tasks 2–6 (tests) + per-task visual checks. ✓

Type/name consistency checked: `WUD_DATA`, `Proverbs.{dailyIndex,randomIndexExcluding,pickN,generateScript,DEFAULT_HOSTS}`, `Theme.{resolveTheme,initTheme}`, `Radio.{chooseVoices,RadioPlayer}`, the script line shape, and the DOM id contract are used identically across all tasks.
