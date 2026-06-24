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

test('dailyIndex spreads across (almost) all buckets over a year', () => {
  for (const count of [34, 33, 37]) {
    const seen = new Set();
    const base = Date.UTC(2026, 0, 1);
    for (let d = 0; d < 366; d++) {
      const iso = new Date(base + d * 86400000).toISOString().slice(0, 10);
      seen.add(dailyIndex(iso, count));
    }
    assert.ok(seen.size >= count - 2, 'count=' + count + ': only ' + seen.size + '/' + count + ' buckets reached over a year');
  }
});
