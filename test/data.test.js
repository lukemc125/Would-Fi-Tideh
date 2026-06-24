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
