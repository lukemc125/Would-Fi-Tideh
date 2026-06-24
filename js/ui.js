// Progressive-enhancement UI behaviours: scroll-reveal + scroll-spy nav.
// Uses a throttled scroll/resize handler (not IntersectionObserver) so it runs
// reliably in every environment, and an immediate pass on load guarantees that
// in-view content is never left stuck hidden.
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));
    var spy = navLinks
      .map(function (a) {
        var sec = document.getElementById(a.getAttribute('href').slice(1));
        return sec ? { link: a, sec: sec } : null;
      })
      .filter(Boolean);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function update() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      // Reveal any section whose top has entered the lower 90% of the viewport.
      for (var i = reveals.length - 1; i >= 0; i--) {
        if (reveals[i].getBoundingClientRect().top < vh * 0.9) {
          reveals[i].classList.add('revealed');
          reveals.splice(i, 1);
        }
      }

      // Scroll-spy: activate the section that straddles ~40% down the viewport
      // (falling back to the last section above that line).
      if (spy.length) {
        var marker = vh * 0.4, best = null;
        for (var j = 0; j < spy.length; j++) {
          var r = spy[j].sec.getBoundingClientRect();
          if (r.top <= marker && r.bottom > marker) { best = spy[j]; break; }
          if (r.top <= marker) best = spy[j];
        }
        for (var k = 0; k < spy.length; k++) {
          spy[k].link.classList.toggle('active', best === spy[k]);
        }
      }
    }

    update(); // immediate pass: reveal in-view content, set initial active link
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  });
})();
