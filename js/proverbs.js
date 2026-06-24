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

  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS,
    dailyIndex: dailyIndex
  };
});
