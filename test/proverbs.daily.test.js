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
