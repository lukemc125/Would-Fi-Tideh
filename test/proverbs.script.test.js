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
