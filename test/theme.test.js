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
