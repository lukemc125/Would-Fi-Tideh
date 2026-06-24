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
    return count > 0 ? h % count : 0;
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

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  var INTRO_A = [
    'Welcome back to Wuds of Wisdom! Mi deh yah wid yu.',
    'Hello, hello! Yu tune in to Wuds of Wisdom.',
    'Greetings, mi people! Time fi some sweet wisdom.'
  ];
  var INTRO_B = [
    'Big up everybody tunin in. Wi have five proverb fi yu today.',
    'Wi pick five likkle gem fi share wid yu. Come een.',
    'Settle yusself, wi have five ole-time sayin fi yu.'
  ];
  var PATOIS_FRAMES = [
    'Ow about dis one: "{O}."',
    'Mi grandmodda did always seh: "{O}."',
    'Listen to dis: "{O}."',
    'Here go one: "{O}."'
  ];
  var TRANS_FRAMES = [
    'Dat mean: "{E}."',
    'In plain English, dat a seh: "{E}."',
    'Yu know wha dat mean? "{E}."'
  ];
  var MEANING_FRAMES = [
    'True true. Basically, {M}',
    'In oder wuds, {M}',
    'An di lesson deh: {M}',
    'Mmm-hmm. {M}'
  ];
  var OUTRO = [
    'An dat a di wisdom fi today. Walk good, an ketch yu next time!',
    'Tek dem wid yu. Walk good, till wi chat again!',
    'Likkle but talawah. Walk good, everybody!'
  ];

  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function generateScript(proverbs, hosts, rng) {
    rng = rng || Math.random;
    hosts = hosts || DEFAULT_HOSTS;
    var lines = [];
    function add(host, kind, text, proverb) {
      lines.push({ speaker: host.name, voice: host.voice, text: text, kind: kind, proverb: (proverb == null ? null : proverb) });
    }
    add(hosts.a, 'intro', pick(rng, INTRO_A), null);
    add(hosts.b, 'intro', pick(rng, INTRO_B), null);

    for (var i = 0; i < proverbs.length; i++) {
      var p = proverbs[i];
      var lead = (i % 2 === 0) ? hosts.a : hosts.b;
      var other = (lead === hosts.a) ? hosts.b : hosts.a;
      add(lead, 'patois', pick(rng, PATOIS_FRAMES).replace('{O}', p.original), i);
      add(other, 'translation', pick(rng, TRANS_FRAMES).replace('{E}', p.english), i);
      add(lead, 'meaning', pick(rng, MEANING_FRAMES).replace('{M}', lowerFirst(p.meaning)), i);
    }

    add(hosts.b, 'outro', pick(rng, OUTRO), null);
    return lines;
  }

  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex,
    pickN: pickN,
    randomIndexExcluding: randomIndexExcluding,
    generateScript: generateScript
  };
});
