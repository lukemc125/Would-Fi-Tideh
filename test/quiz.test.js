const test = require('node:test');
const assert = require('node:assert');
const Q = require('../js/quiz.js');
const { WUD_DATA } = require('../js/data.js');

function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('blankableIndices skips glue words and short tokens', () => {
  const tokens = Q.tokenize('Lion nuh look back wen mongrel dawg baak');
  const idxs = Q.blankableIndices(tokens);
  assert.ok(idxs.length > 0);
  for (const i of idxs) {
    const w = Q.clean(tokens[i]);
    assert.ok(w.length >= 3, w + ' too short');
    assert.ok(!['nuh', 'wen', 'di', 'fi', 'yu'].includes(w), w + ' is glue');
  }
});

test('makeFillBlank produces 4 unique choices including the answer', () => {
  const rng = seeded(3);
  for (const p of WUD_DATA.slice(0, 10)) {
    const others = WUD_DATA.filter(x => x !== p);
    const q = Q.makeFillBlank(p, others, rng);
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4, 'choices unique');
    assert.ok(q.choices.includes(q.answer), 'answer present');
    assert.equal(q.answer, Q.clean(q.tokens[q.blankIndex]), 'answer matches blanked token');
  }
});

test('distractors never contain the answer', () => {
  const rng = seeded(9);
  const d = Q.distractorsFor('mongrel', WUD_DATA, rng, 3);
  assert.equal(d.length, 3);
  assert.ok(!d.includes('mongrel'));
});

test('makeBuildPhrase bank can reconstruct the target', () => {
  const rng = seeded(5);
  const eligible = WUD_DATA.filter(Q.buildEligible);
  assert.ok(eligible.length >= 5, 'enough short proverbs exist');
  const p = eligible[0];
  const q = Q.makeBuildPhrase(p, WUD_DATA.filter(x => x !== p), rng);
  const bank = q.bank.slice();
  for (const w of q.target) {
    const at = bank.indexOf(w);
    assert.ok(at >= 0, 'bank missing target word: ' + w);
    bank.splice(at, 1);
  }
  assert.equal(q.target.join(' '), Q.tokenize(p.original).map(Q.clean).filter(Boolean).join(' '));
});

test('makeMatchMeaning offers 4 options including the true meaning', () => {
  const rng = seeded(7);
  const p = WUD_DATA[4];
  const q = Q.makeMatchMeaning(p, WUD_DATA.filter(x => x !== p), rng);
  assert.equal(q.options.length, 4);
  assert.ok(q.options.includes(p.meaning));
  assert.equal(q.answer, p.meaning);
});

test('buildRound: 8 questions, distinct proverbs, valid types, variety', () => {
  const qs = Q.buildRound(WUD_DATA, seeded(11), 8);
  assert.equal(qs.length, 8);
  assert.equal(new Set(qs.map(q => q.proverb.slug)).size, 8, 'distinct proverbs');
  const types = new Set(qs.map(q => q.type));
  for (const t of types) assert.ok(['fill', 'build', 'ear', 'meaning'].includes(t));
  assert.ok(types.size >= 3, 'at least 3 exercise types in a round');
  for (const q of qs) {
    if (q.type === 'build') assert.ok(Q.buildEligible(q.proverb), 'build only on short proverbs');
    if (q.type === 'ear') assert.ok(q.clip.endsWith(q.proverb.slug + '.mp3'));
  }
});

test('applyAnswer: scores, combo bonus with cap, hearts', () => {
  let s = Q.newScore();
  s = Q.applyAnswer(s, true);   // 10 + 0
  assert.equal(s.score, 10);
  s = Q.applyAnswer(s, true);   // +12
  assert.equal(s.score, 22);
  s = Q.applyAnswer(s, true);   // +14
  s = Q.applyAnswer(s, true);   // +16
  s = Q.applyAnswer(s, true);   // +18
  s = Q.applyAnswer(s, true);   // +20 (bonus capped at 10)
  s = Q.applyAnswer(s, true);   // +20
  assert.equal(s.score, 10 + 12 + 14 + 16 + 18 + 20 + 20);
  assert.equal(s.combo, 7);
  assert.equal(s.bestCombo, 7);
  assert.equal(s.hearts, 3);
  s = Q.applyAnswer(s, false);
  assert.equal(s.combo, 0);
  assert.equal(s.bestCombo, 7);
  assert.equal(s.hearts, 2);
  assert.equal(s.answered, 8);
  assert.equal(s.correct, 7);
  s = Q.applyAnswer(s, false);
  s = Q.applyAnswer(s, false);
  assert.equal(s.hearts, 0);
  s = Q.applyAnswer(s, false);
  assert.equal(s.hearts, 0, 'hearts floor at zero');
});

test('rankFor thresholds', () => {
  assert.equal(Q.rankFor(0), 'Newcomer');
  assert.equal(Q.rankFor(39), 'Newcomer');
  assert.equal(Q.rankFor(40), 'Likkle Learner');
  assert.equal(Q.rankFor(99), 'Yaad Apprentice');
  assert.equal(Q.rankFor(100), 'Wud Master');
  assert.equal(Q.rankFor(130), 'Real Yardie');
});

test('verdictFor bands', () => {
  assert.ok(Q.verdictFor(1).indexOf('Perfect') === 0);
  assert.ok(Q.verdictFor(0.8).indexOf('Big up') === 0);
  assert.ok(Q.verdictFor(0.5).indexOf('Nuh bad') === 0);
  assert.ok(Q.verdictFor(0.2).indexOf('Every mickle') === 0);
});
