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
