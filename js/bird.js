// The Doctor Bird — Jamaica's national red-billed streamertail. It lives in the
// page's world (document coordinates, not the viewport): when idle it circles
// in a lazy patrol loop, weaving BEHIND the cards along the top of its arc and
// IN FRONT of them along the bottom; during a radio session it flies to the
// shoulder of whichever host is speaking and hops between them. Every move is
// a flight — never a teleport: even direction changes bank through a turn
// (signed scaleX interpolates through zero). Purely decorative: pointer-events
// none, aria-hidden, disabled under reduced motion / without Web Animations.
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
  var FRONT = 8, BACK = 1; // cards sit at z-index 2; header stays above at 10

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
    var mode = 'boot';   // boot | idle | transit | perch
    var perched = null;  // 'a' | 'b'
    var anim = null;
    var GEN = 0;         // generation token: bumping it abandons any pending chain

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

    // One flight segment: a sampled cubic arc from the live position to `to`,
    // facing the direction of travel. Signed scaleX runs from (from.f*from.s)
    // to (f*to.s), so a direction change thins the bird through zero mid-air —
    // it banks and turns instead of mirror-flipping.
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

    function chain(list, dur, done) {
      var g = GEN;
      (function next(i) {
        if (g !== GEN) return;
        if (i >= list.length) { if (done) done(); return; }
        segment(list[i], dur, { easing: 'linear' }, function () { next(i + 1); });
      })(0);
    }

    // ---- Idle patrol: a lazy oval around whatever is on screen. The top arc
    // passes BEHIND the cards (smaller, further away); the bottom arc sweeps
    // IN FRONT of them. Each lap re-anchors to the current viewport, so after
    // a scroll the bird comes to where the reader is. ----
    function runLap() {
      if (mode !== 'idle') return;
      var vw = window.innerWidth, vh = window.innerHeight;
      var cx = window.scrollX + vw / 2;
      var cy = window.scrollY + Math.max(200, vh * 0.42);
      var rx = Math.max(220, Math.min(vw * 0.38, 540));
      var ry = Math.max(100, Math.min(vh * 0.22, 220));
      var from = livePos();
      var a0 = Math.atan2((from.y - cy) / ry || 0.001, (from.x - cx) / rx || 0.001);
      var N = 12, segs = [];
      for (var i = 1; i <= N; i++) {
        var a = a0 + i * (Math.PI * 2 / N);
        var y = cy + ry * Math.sin(a);
        var front = y > cy;
        segs.push({ x: cx + rx * Math.cos(a), y: y, s: front ? 0.56 : 0.4, z: front ? FRONT : BACK });
      }
      chain(segs, 1150, runLap);
    }

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
      el.classList.remove('perched');
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
      cancelFlight();
      mode = 'idle';
      runLap(); // the lap's first chord lifts it naturally off the shoulder
    }

    // Window resized while perched: glide to the shoulder's new spot.
    window.addEventListener('resize', function () {
      if (mode !== 'perch' || !perched) return;
      var t = perchTarget(perched);
      if (!t) return;
      el.classList.remove('perched');
      cancelFlight();
      segment({ x: t.x, y: t.y, s: t.s, f: t.f, z: FRONT }, 400, {}, function () {
        if (mode === 'perch') el.classList.add('perched');
      });
    });

    // Shuffle: swoop past the Daily Wud, then settle back into the patrol.
    var shuffle = document.getElementById('daily-shuffle');
    if (shuffle) shuffle.addEventListener('click', function () {
      if (mode !== 'idle') return;
      var d = document.getElementById('daily');
      if (!d) return;
      var r = d.getBoundingClientRect();
      cancelFlight();
      mode = 'idle';
      segment({
        x: r.left + window.scrollX + r.width * 0.72,
        y: r.top + window.scrollY - 26,
        s: 0.6, z: FRONT
      }, 1500, { lift: 130 }, runLap);
    });

    window.setTimeout(function () {
      if (mode !== 'boot') return;
      place({ x: window.scrollX - 140, y: window.scrollY + 170, s: 0.5, f: 1 });
      mode = 'idle';
      runLap();
    }, 2500);

    api.perchOnHost = perchOnHost;
    api.release = release;
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
