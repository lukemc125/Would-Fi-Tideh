const test = require('node:test');
const assert = require('node:assert');
const { sunPosition, moonPosition } = require('../js/sky.js');

function close(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 1e-9, msg + ' (got ' + actual + ', want ~' + expected + ')');
}

test('sun rises east, peaks at noon, sets west', () => {
  close(sunPosition(6).x, 0, 'sunrise x');
  close(sunPosition(6).y, 1, 'sunrise y at horizon');
  close(sunPosition(12).x, 0.5, 'noon x');
  close(sunPosition(12).y, 0, 'noon y at apex');
  close(sunPosition(18).x, 1, 'sunset x');
  close(sunPosition(18).y, 1, 'sunset y at horizon');
});

test('sun position clamps outside the 06-18 span', () => {
  close(sunPosition(3).x, 0, 'pre-dawn clamps to sunrise');
  close(sunPosition(22).x, 1, 'late night clamps to sunset');
});

test('moon spans 18:00 to 06:00 with a midnight apex', () => {
  close(moonPosition(18).x, 0, 'moonrise x');
  close(moonPosition(0).x, 0.5, 'midnight x');
  close(moonPosition(0).y, 0, 'midnight y at apex');
  close(moonPosition(6).x, 1, 'moonset x');
});
