(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Theme = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var KEY = 'wft-theme';

  function resolveTheme(hour, stored) {
    if (stored === 'day' || stored === 'night') return stored;
    return (hour >= 6 && hour < 18) ? 'day' : 'night';
  }

  // Browser-only wiring; called from app.js after DOM is ready.
  function initTheme(doc, win) {
    doc = doc || document; win = win || window;
    var stored = null;
    try { stored = win.localStorage.getItem(KEY); } catch (e) {}
    var current = resolveTheme(new Date().getHours(), stored);
    apply(doc, current);

    var btn = doc.getElementById('theme-toggle');
    if (btn) {
      updateButton(btn, current);
      btn.addEventListener('click', function () {
        current = (current === 'day') ? 'night' : 'day';
        apply(doc, current);
        updateButton(btn, current);
        try { win.localStorage.setItem(KEY, current); } catch (e) {}
      });
    }
  }

  function apply(doc, theme) {
    doc.documentElement.setAttribute('data-theme', theme);
  }

  function updateButton(btn, theme) {
    var toNight = (theme === 'day');
    btn.setAttribute('aria-label', toNight ? 'Switch to night theme' : 'Switch to day theme');
    btn.innerHTML = toNight
      ? '<i class="ti ti-moon" aria-hidden="true"></i>'
      : '<i class="ti ti-sun" aria-hidden="true"></i>';
  }

  return { resolveTheme: resolveTheme, initTheme: initTheme };
});
