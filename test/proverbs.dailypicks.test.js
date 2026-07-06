const test = require('node:test');
const assert = require('node:assert');
const { seededRng, dailyPicks, generateScript, DEFAULT_HOSTS } = require('../js/proverbs.js');
const { WUD_DATA } = require('../js/data.js');

test('seededRng is deterministic per seed string', () => {
  const a = seededRng('2026-07-07'), b = seededRng('2026-07-07');
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const c = seededRng('2026-07-08');
  const seqA = seededRng('2026-07-07');
  let differs = false;
  for (let i = 0; i < 20; i++) if (c() !== seqA()) { differs = true; break; }
  assert.ok(differs, 'different dates give different sequences');
});

test('dailyPicks: same date -> same 5 proverbs; distinct; in range', () => {
  const p1 = dailyPicks(WUD_DATA, '2026-07-07', 5);
  const p2 = dailyPicks(WUD_DATA, '2026-07-07', 5);
  assert.deepEqual(p1.map(p => p.slug), p2.map(p => p.slug));
  assert.equal(p1.length, 5);
  assert.equal(new Set(p1.map(p => p.slug)).size, 5, 'distinct picks');
  for (const p of p1) assert.ok(WUD_DATA.includes(p));
});

test('dailyPicks vary across days', () => {
  const days = ['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
  const keys = days.map(d => dailyPicks(WUD_DATA, d, 5).map(p => p.slug).join('|'));
  assert.ok(new Set(keys).size >= 3, 'selections differ across days');
});

test('a fully seeded session script is identical for the same date', () => {
  const build = (date) => {
    const rng = seededRng(date);
    const picks = dailyPicks(WUD_DATA, date, 5);
    return generateScript(picks, DEFAULT_HOSTS, rng);
  };
  assert.deepEqual(build('2026-07-07'), build('2026-07-07'));
});
