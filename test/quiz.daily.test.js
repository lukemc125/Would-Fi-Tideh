const test = require('node:test');
const assert = require('node:assert');
const Q = require('../js/quiz.js');
const { WUD_DATA } = require('../js/data.js');

test('dailyCount is 5-7 and fixed for a date', () => {
  for (const d of ['2026-07-08', '2026-07-09', '2026-07-10', '2026-12-31']) {
    const n = Q.dailyCount(d);
    assert.ok(n >= 5 && n <= 7, d + ' -> ' + n);
    assert.equal(n, Q.dailyCount(d), 'stable per date');
  }
});

test('dailyRound is deterministic per date, 5-7 distinct proverbs', () => {
  const a = Q.dailyRound(WUD_DATA, '2026-07-08');
  const b = Q.dailyRound(WUD_DATA, '2026-07-08');
  assert.equal(a.length, b.length);
  assert.ok(a.length >= 5 && a.length <= 7);
  assert.deepEqual(
    a.map(q => q.proverb.slug + ':' + q.type),
    b.map(q => q.proverb.slug + ':' + q.type),
    'same date reproduces the same set (for practice)'
  );
  assert.equal(new Set(a.map(q => q.proverb.slug)).size, a.length, 'distinct proverbs');
  assert.equal(a.length, Q.dailyCount('2026-07-08'));
});

test('dailyRound varies across days', () => {
  const key = d => Q.dailyRound(WUD_DATA, d).map(q => q.proverb.slug).join('|');
  const keys = ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11'].map(key);
  assert.ok(new Set(keys).size >= 3, 'sets differ across days');
});
