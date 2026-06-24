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

  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex,
    pickN: pickN,
    randomIndexExcluding: randomIndexExcluding
  };
});
