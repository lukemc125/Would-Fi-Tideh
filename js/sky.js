(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Sky = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Where the sun sits along its 06:00-18:00 arc. x runs 0..1 left->right;
  // y is 0 at the arc's apex (noon) and 1 at the horizon ends.
  function sunPosition(hour) {
    var t = (hour - 6) / 12;
    if (t < 0) t = 0; if (t > 1) t = 1;
    return { x: t, y: 1 - Math.sin(Math.PI * t) };
  }

  // The moon mirrors it across the night span (18:00 -> 06:00).
  function moonPosition(hour) {
    var h = hour <= 6 ? hour + 24 : hour; // map 0-6 to 24-30 so the span is 18..30
    var t = (h - 18) / 12;
    if (t < 0) t = 0; if (t > 1) t = 1;
    return { x: t, y: 1 - Math.sin(Math.PI * t) };
  }

  // Browser-only. Builds the sky layer inside .hero and keeps it in step with
  // the theme (MutationObserver on data-theme) and the clock (minute timer).
  function initSky(doc, win) {
    doc = doc || document; win = win || window;
    var hero = doc.querySelector('.hero');
    if (!hero) return;

    var sky = doc.createElement('div');
    sky.className = 'sky';
    sky.setAttribute('aria-hidden', 'true');

    var sun = doc.createElement('div'); sun.className = 'sky-sun';
    var moon = doc.createElement('div'); moon.className = 'sky-moon';
    sky.appendChild(sun); sky.appendChild(moon);

    for (var c = 0; c < 3; c++) {
      var cloud = doc.createElement('div');
      cloud.className = 'sky-cloud sky-cloud-' + c;
      sky.appendChild(cloud);
    }

    // A fixed constellation: deterministic pseudo-random spread so every visit
    // (and both of a page's paints) sees the same sky.
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var s = 0; s < 36; s++) {
      var star = doc.createElement('span');
      star.className = 'sky-star';
      star.style.left = (2 + rnd() * 96) + '%';
      star.style.top = (4 + rnd() * 70) + '%';
      star.style.animationDelay = (rnd() * 4).toFixed(2) + 's';
      var sz = rnd() < 0.25 ? 3 : 2;
      star.style.width = sz + 'px'; star.style.height = sz + 'px';
      sky.appendChild(star);
    }

    hero.insertBefore(sky, hero.firstChild);

    function currentHour() { return new Date().getHours() + new Date().getMinutes() / 60; }

    function update() {
      var theme = doc.documentElement.getAttribute('data-theme');
      var hour = currentHour();
      if (theme === 'day') {
        // Manual day theme at night: park the sun mid-morning.
        var h = (hour >= 6 && hour < 18) ? hour : 10;
        var p = sunPosition(h);
        sun.style.left = (6 + p.x * 82) + '%';
        sun.style.top = (14 + p.y * 44) + '%';
      } else {
        var hm = (hour >= 18 || hour < 6) ? hour : 23;
        var m = moonPosition(hm);
        moon.style.left = (8 + m.x * 78) + '%';
        moon.style.top = (12 + m.y * 40) + '%';
      }
      sky.setAttribute('data-sky', theme === 'day' ? 'day' : 'night');
    }

    update();
    win.setInterval(update, 60000);

    if (win.MutationObserver) {
      new win.MutationObserver(update).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }

  return { sunPosition: sunPosition, moonPosition: moonPosition, initSky: initSky };
});
