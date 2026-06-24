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
