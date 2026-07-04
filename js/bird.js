// The Doctor Bird — Jamaica's national swallow-tail hummingbird — flits across
// the page now and then, hovering near the Daily Wud. Purely decorative:
// pointer-events none, aria-hidden, disabled under reduced motion or when the
// Web Animations API is unavailable.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!Element.prototype.animate) return;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  var SVG =
    '<svg viewBox="0 0 130 90" width="86" height="60" xmlns="http://www.w3.org/2000/svg">' +
    // twin tail streamers, trailing behind (left)
    '<path d="M38 46 C18 52 6 68 2 84 C16 70 30 60 42 52 Z" fill="#085041"/>' +
    '<path d="M40 42 C22 40 10 46 4 58 C18 52 32 48 44 47 Z" fill="#0F6E56"/>' +
    // body + head
    '<ellipse cx="62" cy="46" rx="22" ry="13" fill="#0F8B3B"/>' +
    '<circle cx="86" cy="38" r="10" fill="#085041"/>' +
    // beak (long, gently decurved) + eye
    '<path d="M95 37 C106 38 116 41 124 45 C115 44 105 43 95 42 Z" fill="#1A1A1A"/>' +
    '<circle cx="89" cy="36" r="1.8" fill="#FFF7E6"/>' +
    // chest highlight
    '<ellipse cx="56" cy="52" rx="10" ry="5" fill="#1D9E75"/>' +
    // wing (flutters via CSS)
    '<g class="bird-wing"><path d="M60 42 C52 24 60 12 74 8 C70 24 70 36 66 44 Z" fill="#0A6B45"/></g>' +
    '</svg>';

  ready(function () {
    var el = document.createElement('div');
    el.className = 'doctor-bird';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = SVG;
    document.body.appendChild(el);

    var flying = false;

    // Sample a cubic bezier into WAAPI keyframes.
    function bezier(p0, p1, p2, p3, t) {
      var u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
      };
    }

    function hoverPoint() {
      var daily = document.getElementById('daily');
      var vw = window.innerWidth;
      if (daily) {
        var r = daily.getBoundingClientRect();
        if (r.bottom > 80 && r.top < window.innerHeight - 120) {
          return { x: Math.min(r.right - 40, vw - 130), y: Math.max(70, r.top - 26) };
        }
      }
      return { x: vw * 0.62, y: 140 };
    }

    function flight(quick) {
      if (flying) return;
      flying = true;
      var vw = window.innerWidth;
      var from = { x: -120, y: 90 + Math.random() * 160 };
      var hover = hoverPoint();
      var exit = { x: vw + 140, y: 40 + Math.random() * 90 };
      var c1 = { x: vw * 0.25, y: from.y - 70 };
      var c2 = { x: hover.x - 130, y: hover.y + 45 };

      var frames = [];
      var IN = 12;
      for (var i = 0; i <= IN; i++) {
        var p = bezier(from, c1, c2, hover, i / IN);
        frames.push({ transform: 'translate(' + p.x + 'px,' + p.y + 'px)', offset: (i / IN) * 0.42 });
      }
      // hover bob
      frames.push({ transform: 'translate(' + hover.x + 'px,' + (hover.y - 7) + 'px)', offset: 0.55 });
      frames.push({ transform: 'translate(' + hover.x + 'px,' + (hover.y + 4) + 'px)', offset: 0.68 });
      frames.push({ transform: 'translate(' + hover.x + 'px,' + (hover.y - 5) + 'px)', offset: 0.8 });
      // dart out
      frames.push({ transform: 'translate(' + exit.x + 'px,' + exit.y + 'px)', offset: 1 });

      el.style.visibility = 'visible';
      var anim = el.animate(frames, { duration: quick ? 5200 : 10500, easing: 'ease-in-out' });
      anim.onfinish = function () { el.style.visibility = 'hidden'; flying = false; };
    }

    function schedule() {
      window.setTimeout(function () { flight(false); schedule(); }, 60000 + Math.random() * 60000);
    }

    window.setTimeout(function () { flight(false); }, 2500);
    schedule();

    var shuffle = document.getElementById('daily-shuffle');
    if (shuffle) shuffle.addEventListener('click', function () { flight(true); });
  });
})();
