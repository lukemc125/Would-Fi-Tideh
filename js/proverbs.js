(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Proverbs = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var DEFAULT_HOSTS = {
    a: { name: 'Auntie Pearl', voice: 'a' },
    b: { name: 'Uncle Roy', voice: 'b' }
  };

  // djb2 string hash -> stable, well-spread index for a given date string.
  function dailyIndex(dateStr, count) {
    var h = 5381;
    for (var i = 0; i < dateStr.length; i++) {
      h = ((h << 5) + h + dateStr.charCodeAt(i)) >>> 0;
    }
    // Avalanche-mix the accumulated hash so the result spreads evenly for ANY
    // count. Without this, djb2's *33 recurrence makes (h % count) degenerate
    // whenever count shares a factor with 33 (e.g. count=33 -> only the last
    // character matters), so most proverbs could never become the Daily Wud.
    h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return count > 0 ? h % count : 0;
  }

  // Deterministic RNG (mulberry32) seeded from a string — same date string,
  // same sequence, on every visit and every device.
  function seededRng(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }
    h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0;
    var seed = (h ^ (h >>> 13)) >>> 0;
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The day's fixed random selection: same n proverbs for everyone all day.
  function dailyPicks(items, dateStr, n) {
    return pickN(items, n, seededRng(dateStr));
  }

  // The one daily item for a collection such as the real podcast episodes.
  function dailyPick(items, dateStr) {
    if (!items || !items.length) return null;
    return items[dailyIndex(dateStr, items.length)];
  }

  // A predictable daily rotation: adjacent calendar days always advance by one.
  // Useful when people should share the same daily item and "tomorrow" needs to
  // be an actual next item, not another random hash result.
  function dailyCyclePick(items, dateStr) {
    if (!items || !items.length) return null;
    var parts = String(dateStr).split('-');
    var day = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86400000;
    return items[((day % items.length) + items.length) % items.length];
  }

  function pickN(items, n, rng) {
    rng = rng || Math.random;
    var pool = items.slice();
    var count = Math.min(n, pool.length);
    var out = [];
    for (var k = 0; k < count; k++) {
      var j = Math.floor(rng() * pool.length);
      out.push(pool[j]);
      pool.splice(j, 1);
    }
    return out;
  }

  function randomIndexExcluding(count, exclude, rng) {
    rng = rng || Math.random;
    if (count <= 1) return 0;
    var idx = exclude;
    while (idx === exclude) { idx = Math.floor(rng() * count); }
    return idx;
  }

  var INTRO_A = [
    'Welcome back to Wuds of Wisdom! Mi deh yah wid yu.',
    'Hello, hello! Yu tune in to Wuds of Wisdom.',
    'Greetings, mi people! Time fi some sweet wisdom.'
  ];
  var INTRO_B = [
    'Big up everybody tunin in. Wi have some ole-time wisdom fi yu today.',
    'Wi pick some likkle gem fi share wid yu. Come een.',
    'Settle yusself, wi have some sweet ole-time sayin fi yu.'
  ];
  var TRANS_FIXED = 'Dat mean: "{E}."';
  var MEANING_FIXED = 'In oder wuds, {M}';
  var OUTRO = [
    'An dat a di wisdom fi today. Walk good, an ketch yu next time!',
    'Tek dem wid yu. Walk good, till wi chat again!',
    'Likkle but talawah. Walk good, everybody!'
  ];

  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function transText(p) { return TRANS_FIXED.replace('{E}', p.english); }
  function meaningText(p) { return MEANING_FIXED.replace('{M}', lowerFirst(p.meaning)); }

  function generateScript(proverbs, hosts, rng) {
    rng = rng || Math.random;
    hosts = hosts || DEFAULT_HOSTS;
    var lines = [];
    function add(host, kind, text, proverb, variant) {
      lines.push({ speaker: host.name, voice: host.voice, text: text, kind: kind,
        proverb: (proverb == null ? null : proverb), variant: (variant == null ? null : variant) });
    }
    var ia = Math.floor(rng() * INTRO_A.length);
    var ib = Math.floor(rng() * INTRO_B.length);
    add(hosts.a, 'intro', INTRO_A[ia], null, ia);
    add(hosts.b, 'intro', INTRO_B[ib], null, ib);

    // Auntie Pearl (a) reads the proverb and its meaning; Uncle Roy (b) gives the
    // translation. Every line's text is deterministic for a given proverb (the
    // intro/outro carry a `variant` index), so each line maps to exactly one
    // pre-generated clip and the audio always matches the transcript.
    for (var i = 0; i < proverbs.length; i++) {
      var p = proverbs[i];
      add(hosts.a, 'patois', '"' + p.original + '"', i, null);
      add(hosts.b, 'translation', transText(p), i, null);
      add(hosts.a, 'meaning', meaningText(p), i, null);
    }

    var io = Math.floor(rng() * OUTRO.length);
    add(hosts.b, 'outro', OUTRO[io], null, io);
    return lines;
  }

  // Every clip the site can play, for offline generation. `voice` selects the
  // ElevenLabs voice that reads it (a = Auntie Pearl, b = Uncle Roy). Each `clip`
  // key matches the audioSrc path app.js builds for the corresponding line.
  function audioManifest(proverbs) {
    var out = [];
    INTRO_A.forEach(function (t, i) { out.push({ clip: 'intro.a.' + i, text: t, voice: 'a' }); });
    INTRO_B.forEach(function (t, i) { out.push({ clip: 'intro.b.' + i, text: t, voice: 'b' }); });
    OUTRO.forEach(function (t, i) { out.push({ clip: 'outro.' + i, text: t, voice: 'b' }); });
    // Uncle Roy's spoken congrats on finishing the quiz (voice b = male).
    out.push({ clip: 'quiz.success', text: 'Big up yuhself. Yah real yaadie', voice: 'b' });
    proverbs.forEach(function (p) {
      if (!p.slug) return;
      out.push({ clip: p.slug, text: p.original, voice: 'a' });
      out.push({ clip: p.slug + '.trans', text: transText(p), voice: 'b' });
      out.push({ clip: p.slug + '.meaning', text: meaningText(p), voice: 'a' });
    });
    return out;
  }

  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex,
    seededRng: seededRng,
    dailyPicks: dailyPicks,
    dailyPick: dailyPick,
    dailyCyclePick: dailyCyclePick,
    pickN: pickN,
    randomIndexExcluding: randomIndexExcluding,
    generateScript: generateScript,
    audioManifest: audioManifest
  };
});
