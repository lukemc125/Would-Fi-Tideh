(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Quiz = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Patois glue words that would make useless blanks or decoys.
  var STOP = {};
  ('a an di fi yu wi mi it dat dis dem weh wen nuh pon deh him tu si seh guh ' +
   'and the for you your her his out are all')
    .split(' ').forEach(function (w) { STOP[w] = 1; });

  function tokenize(text) { return String(text || '').split(/\s+/).filter(Boolean); }
  function clean(w) { return String(w || '').replace(/[.,!?;:"“”()]/g, '').toLowerCase(); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Indices of words worth blanking: content words, longest first, top 6.
  function blankableIndices(tokens) {
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var c = clean(tokens[i]);
      if (c.length >= 3 && !STOP[c]) out.push(i);
    }
    out.sort(function (a, b) { return clean(tokens[b]).length - clean(tokens[a]).length; });
    return out.slice(0, 6);
  }

  // Blankable words drawn from other proverbs, similar length preferred.
  function distractorsFor(answer, pool, rng, n) {
    var seen = {};
    pool.forEach(function (p) {
      tokenize(p.original).forEach(function (t) {
        var c = clean(t);
        if (c.length >= 3 && !STOP[c] && c !== answer) seen[c] = 1;
      });
    });
    var all = Object.keys(seen);
    var near = all.filter(function (w) { return Math.abs(w.length - answer.length) <= 2; });
    var src = near.length >= n ? near : all;
    var copy = src.slice(), out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    }
    return out;
  }

  function makeFillBlank(proverb, pool, rng, type) {
    var tokens = tokenize(proverb.original);
    var cands = blankableIndices(tokens);
    var idx = cands.length ? pick(rng, cands) : 0;
    var answer = clean(tokens[idx]);
    var choices = shuffle(distractorsFor(answer, pool, rng, 3).concat([answer]), rng);
    return { type: type || 'fill', proverb: proverb, tokens: tokens, blankIndex: idx, answer: answer, choices: choices };
  }

  function makeEarTest(proverb, pool, rng) {
    var q = makeFillBlank(proverb, pool, rng, 'ear');
    q.clip = 'audio/proverbs/' + proverb.slug + '.mp3';
    return q;
  }

  function buildEligible(proverb) { return tokenize(proverb.original).length <= 10; }

  function makeBuildPhrase(proverb, pool, rng) {
    var target = tokenize(proverb.original).map(clean).filter(Boolean);
    var decoys = distractorsFor('', pool, rng, 2 + Math.floor(rng() * 2))
      .filter(function (d) { return target.indexOf(d) < 0; });
    return {
      type: 'build', proverb: proverb, english: proverb.english,
      target: target, bank: shuffle(target.concat(decoys), rng)
    };
  }

  function makeMatchMeaning(proverb, pool, rng) {
    var others = shuffle(pool, rng).slice(0, 3).map(function (p) { return p.meaning; });
    return {
      type: 'meaning', proverb: proverb, patois: proverb.original,
      options: shuffle(others.concat([proverb.meaning]), rng), answer: proverb.meaning
    };
  }

  var TYPES = ['fill', 'build', 'ear', 'meaning'];

  function buildRound(data, rng, n) {
    n = n || 8;
    var pool = data.slice(), picks = [];
    while (picks.length < Math.min(n, pool.length)) {
      picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    var types = shuffle(TYPES, rng);
    return picks.map(function (p, i) {
      var t = types[i % types.length];
      if (t === 'build' && !buildEligible(p)) t = 'fill';
      var others = data.filter(function (x) { return x !== p; });
      if (t === 'ear') return makeEarTest(p, others, rng);
      if (t === 'build') return makeBuildPhrase(p, others, rng);
      if (t === 'meaning') return makeMatchMeaning(p, others, rng);
      return makeFillBlank(p, others, rng);
    });
  }

  // ---- Daily set: seeded by the date so everyone gets the same 5-7 questions
  // all day, and a replay (same date) reproduces them exactly for practice. ----
  function seededRng(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0;
    var seed = (h ^ (h >>> 13)) >>> 0;
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dailyCount(dateStr) {
    return 5 + Math.floor(seededRng(dateStr + '#n')() * 3); // 5, 6 or 7
  }

  function dailyRound(data, dateStr) {
    return buildRound(data, seededRng(dateStr + '#quiz'), dailyCount(dateStr));
  }

  // ---- Scoring: +10 per correct, combo bonus 2*(combo-1) capped at +10;
  // a miss resets the combo and costs a heart. ----
  function newScore() {
    return { score: 0, combo: 0, bestCombo: 0, hearts: 3, correct: 0, answered: 0 };
  }

  function applyAnswer(s, ok) {
    var n = {
      score: s.score, combo: s.combo, bestCombo: s.bestCombo,
      hearts: s.hearts, correct: s.correct, answered: s.answered + 1
    };
    if (ok) {
      n.combo = s.combo + 1;
      n.correct = s.correct + 1;
      if (n.combo > n.bestCombo) n.bestCombo = n.combo;
      n.score = s.score + 10 + Math.min(10, 2 * (n.combo - 1));
    } else {
      n.combo = 0;
      n.hearts = Math.max(0, s.hearts - 1);
    }
    return n;
  }

  var RANKS = [
    { min: 0, name: 'Newcomer' },
    { min: 40, name: 'Likkle Learner' },
    { min: 70, name: 'Yaad Apprentice' },
    { min: 100, name: 'Wud Master' },
    { min: 130, name: 'Real Yardie' }
  ];

  function rankFor(best) {
    var name = RANKS[0].name;
    for (var i = 0; i < RANKS.length; i++) {
      if (best >= RANKS[i].min) name = RANKS[i].name;
    }
    return name;
  }

  function verdictFor(accuracy) {
    if (accuracy >= 0.99) return 'Perfect! Yu a real Yardie!';
    if (accuracy >= 0.75) return 'Big up yuself — yu patois sweet!';
    if (accuracy >= 0.5) return 'Nuh bad at all — practice mek perfect!';
    return 'Every mickle mek a muckle — gwaan again!';
  }

  return {
    tokenize: tokenize, clean: clean, blankableIndices: blankableIndices,
    distractorsFor: distractorsFor, makeFillBlank: makeFillBlank,
    makeEarTest: makeEarTest, makeBuildPhrase: makeBuildPhrase,
    makeMatchMeaning: makeMatchMeaning, buildEligible: buildEligible,
    buildRound: buildRound, seededRng: seededRng, dailyCount: dailyCount,
    dailyRound: dailyRound, newScore: newScore, applyAnswer: applyAnswer,
    rankFor: rankFor, verdictFor: verdictFor, RANKS: RANKS
  };
});
