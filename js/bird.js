// The Doctor Bird — Jamaica's national red-billed streamertail. It idles in a
// gentle hover beside whatever you're reading, and when you scroll somewhere
// else it flies over to join you (a real flight — never a teleport; direction
// changes bank through a turn). During a radio session it lands on the
// shoulder of whichever host is speaking and hops between them. A watchdog
// re-summons it if it's ever left out of view, so it can't disappear.
// Purely decorative: pointer-events none, aria-hidden, disabled under reduced
// motion / without Web Animations.
(function (root) {
  'use strict';
  var api = { perchOnHost: function () {}, release: function () {} };
  root.Bird = api;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!Element.prototype.animate) return;

  var SVG =
    '<svg viewBox="0 0 140 100" width="92" height="66" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M54 56 C40 62 24 76 12 92 C15 92 18 91 21 88 C34 76 46 66 58 61 Z" fill="#171717"/>' +
    '<path d="M52 50 C36 53 20 61 8 74 C11 74 14 73 17 71 C31 61 44 55 56 53 Z" fill="#2c2c2c"/>' +
    '<path d="M46 52 C46 41 56 34 70 34 C83 34 92 41 92 51 C92 60 83 65 70 65 C55 65 46 61 46 52 Z" fill="#0F8B3B"/>' +
    '<path d="M52 57 C57 63 68 64 78 61 C72 66 58 67 51 58 Z" fill="#1D9E75"/>' +
    '<circle cx="92" cy="44" r="11.5" fill="#161616"/>' +
    '<path d="M84 40 C88 35 96 35 101 40 C97 43 89 43 84 43 Z" fill="#0F6E56"/>' +
    '<path d="M101 42 C112 42 124 45 134 49 C124 47 113 47 101 46 Z" fill="#D8341C"/>' +
    '<path d="M130 48 L134 49 L131 50 Z" fill="#161616"/>' +
    '<circle cx="94" cy="42" r="2.2" fill="#0A0A0A"/>' +
    '<circle cx="94.8" cy="41.2" r="0.8" fill="#FFF7E6"/>' +
    '<path d="M62 64 L61 72 M70 64 L71 72" stroke="#171717" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
    '<g class="bird-wing"><path d="M62 42 C54 26 60 13 74 9 C72 24 71 36 68 46 Z" fill="#0A6B45"/></g>' +
    '</svg>';

  var BW = 92, BH = 66;
  var FRONT = 8; // above the cards (z2), below the sticky header (z10)

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var el = document.createElement('div');
    el.className = 'doctor-bird';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="bird-inner">' + SVG + '</div>';
    document.body.appendChild(el);

    var cur = { x: -160, y: 160, s: 0.5, f: 1 };
    var mode = 'boot';   // boot | idle | settle | transit | perch
    var perched = null;  // 'a' | 'b'
    var anim = null;
    var GEN = 0;         // generation token: bumping it abandons pending flights
    var flitTimer = null, followTimer = null;

    function place(t) {
      cur = { x: t.x, y: t.y, s: t.s, f: t.f };
      el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + (t.f * t.s) + ',' + t.s + ')';
    }
    place(cur);

    function cancelFlight() {
      GEN++;
      if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    }

    // Where the bird visibly is right now, mid-animation included.
    function livePos() {
      var s = getComputedStyle(el).transform;
      if (!s || s === 'none' || typeof DOMMatrixReadOnly === 'undefined') return cur;
      try {
        var m = new DOMMatrixReadOnly(s);
        return { x: m.m41, y: m.m42, s: Math.abs(m.d) || 0.5, f: m.a < 0 ? -1 : 1 };
      } catch (e) { return cur; }
    }

    // One flight: a sampled cubic arc from the live position to `to`, facing
    // the travel direction. Signed scaleX interpolates through zero on
    // direction changes, so the bird banks and turns instead of flipping.
    function segment(to, dur, opts, done) {
      opts = opts || {};
      var g = GEN;
      var from = livePos();
      var dx = to.x - from.x;
      var f = Math.abs(dx) < 4 ? (to.f || from.f) : (dx >= 0 ? 1 : -1);
      if (to.z != null) el.style.zIndex = to.z;
      el.style.visibility = 'visible';
      var lift = opts.lift || 0;
      var c1, c2;
      if (lift) {
        var apex = Math.min(from.y, to.y) - lift;
        c1 = { x: from.x + dx * 0.3, y: apex };
        c2 = { x: from.x + dx * 0.7, y: apex };
      } else {
        c1 = { x: from.x + dx * 0.33, y: from.y + (to.y - from.y) * 0.33 };
        c2 = { x: from.x + dx * 0.66, y: from.y + (to.y - from.y) * 0.66 };
      }
      var sx0 = from.f * from.s, sx1 = f * to.s;
      var frames = [], STEPS = 10;
      for (var i = 0; i <= STEPS; i++) {
        var t = i / STEPS, u = 1 - t;
        var x = u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x;
        var y = u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y;
        var sx = sx0 + (sx1 - sx0) * t;
        var sy = from.s + (to.s - from.s) * t;
        frames.push({ transform: 'translate(' + x + 'px,' + y + 'px) scale(' + sx + ',' + sy + ')' });
      }
      if (anim) { try { anim.cancel(); } catch (e) {} }
      anim = el.animate(frames, { duration: dur, easing: opts.easing || 'ease-in-out', fill: 'forwards' });
      anim.onfinish = function () {
        if (g !== GEN) return;
        place({ x: to.x, y: to.y, s: to.s, f: f });
        try { anim.cancel(); } catch (e) {}
        anim = null;
        if (done) done();
      };
    }

    // ---- Idle: hover beside what the reader is looking at ----

    function inView() {
      var p = livePos();
      return p.x > window.scrollX - 30 && p.x < window.scrollX + window.innerWidth - 24 &&
             p.y > window.scrollY + 70 && p.y < window.scrollY + window.innerHeight - 30;
    }

    // A calm spot in the current viewport: beside the content column on wide
    // screens, tucked toward the top-right on narrow ones.
    function idleSpot() {
      var vw = window.innerWidth, vh = window.innerHeight;
      var contentRight = (vw + 760) / 2;
      var xv = vw > 1000 ? Math.min(vw - 150, contentRight + 26) : vw - 132;
      var yv = Math.max(96, vh * 0.2);
      return {
        x: window.scrollX + xv + (Math.random() * 24 - 12),
        y: window.scrollY + yv + (Math.random() * 18 - 9),
        s: 0.5, z: FRONT
      };
    }

    function settleTo(spot, dur, lift) {
      mode = 'settle';
      el.classList.remove('perched', 'hovering');
      cancelFlight();
      segment(spot, dur, { lift: lift }, function () {
        mode = 'idle';
        el.classList.add('hovering');
        scheduleFlit();
      });
    }

    function goIdle() { settleTo(idleSpot(), 1200, 60); }

    // Follow the reader: when scrolling settles and the bird was left behind,
    // it flies to the new viewport.
    function queueFollow() {
      if (mode !== 'idle') return;
      clearTimeout(followTimer);
      followTimer = setTimeout(function () {
        if (mode === 'idle' && !inView()) goIdle();
      }, 420);
    }
    window.addEventListener('scroll', queueFollow, { passive: true });

    // A small reposition now and then so idling looks alive, not parked.
    function scheduleFlit() {
      clearTimeout(flitTimer);
      flitTimer = setTimeout(function () {
        if (mode !== 'idle') return;
        if (!inView()) { goIdle(); return; }
        var p = livePos();
        var t = {
          x: Math.min(Math.max(p.x + (Math.random() * 160 - 80), window.scrollX + 40), window.scrollX + window.innerWidth - 120),
          y: Math.min(Math.max(p.y + (Math.random() * 70 - 35), window.scrollY + 86), window.scrollY + window.innerHeight - 120),
          s: 0.5, z: FRONT
        };
        settleTo(t, 900, 36);
      }, 18000 + Math.random() * 14000);
    }

    // Watchdog: whatever happens, an idle bird out of view (with no flight in
    // progress) gets summoned back. This is the never-disappear guarantee.
    setInterval(function () {
      if (mode !== 'idle' || anim) return;
      if (!inView()) goIdle();
      else if (!el.classList.contains('hovering')) el.classList.add('hovering');
    }, 4000);

    // ---- Perch on the speaking host's shoulder (document coordinates) ----
    function perchTarget(voice) {
      var host = document.getElementById(voice === 'a' ? 'host-a' : 'host-b');
      var av = host && host.querySelector('.avatar');
      if (!av) return null;
      var r = av.getBoundingClientRect();
      var left = r.left + window.scrollX, right = r.right + window.scrollX, top = r.top + window.scrollY;
      var s = 0.5;
      if (voice === 'a') {
        return { x: left - BW * s * 0.18, y: top - BH * s * 0.30, s: s, f: 1 };
      }
      return { x: right - BW * s * 0.82, y: top - BH * s * 0.30, s: s, f: -1 };
    }

    function perchOnHost(voice) {
      if (voice !== 'a' && voice !== 'b') return;
      if (mode === 'perch' && perched === voice) return;
      var t = perchTarget(voice);
      if (!t) return;
      perched = voice;
      mode = 'transit';
      el.classList.remove('perched', 'hovering');
      cancelFlight();
      segment({ x: t.x, y: t.y, s: t.s, f: t.f, z: FRONT }, 950, { lift: 70 }, function () {
        if (perched !== voice) return;
        mode = 'perch';
        el.classList.add('perched');
      });
    }

    function release() {
      if (mode === 'idle' || mode === 'boot') return;
      perched = null;
      el.classList.remove('perched');
      goIdle();
    }

    window.addEventListener('resize', function () {
      if (mode === 'perch' && perched) {
        var t = perchTarget(perched);
        if (!t) return;
        el.classList.remove('perched');
        cancelFlight();
        segment({ x: t.x, y: t.y, s: t.s, f: t.f, z: FRONT }, 400, {}, function () {
          if (mode === 'perch') el.classList.add('perched');
        });
      } else {
        queueFollow();
      }
    });

    // Shuffle: swoop over to the Daily Wud and hover there a while.
    var shuffle = document.getElementById('daily-shuffle');
    if (shuffle) shuffle.addEventListener('click', function () {
      if (mode !== 'idle') return;
      var d = document.getElementById('daily');
      if (!d) return;
      var r = d.getBoundingClientRect();
      settleTo({
        x: r.left + window.scrollX + r.width * 0.72,
        y: r.top + window.scrollY - 26,
        s: 0.6, z: FRONT
      }, 1300, 120);
    });

    window.setTimeout(function () {
      if (mode !== 'boot') return;
      place({ x: window.scrollX - 140, y: window.scrollY + Math.max(120, window.innerHeight * 0.25), s: 0.5, f: 1 });
      goIdle();
    }, 2200);

    api.perchOnHost = perchOnHost;
    api.release = release;
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
