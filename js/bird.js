// The Doctor Bird — Jamaica's national red-billed streamertail. It roams the
// page now and then, and during a Wuds of Wisdom session it perches on the
// shoulder of whichever host is speaking (hopping between them as they trade
// lines). Purely decorative: pointer-events none, aria-hidden, disabled under
// reduced motion or when the Web Animations API is unavailable.
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

    var cur = { x: -160, y: 120, s: 1, f: 1 };
    var mode = 'idle';       // idle | roam | perch
    var perched = null;      // 'a' | 'b'
    var flying = false;
    var roamTimer = null;
    var anim = null;

    function tf(t) { return 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + (t.f * t.s) + ',' + t.s + ')'; }
    function place(t) { cur = { x: t.x, y: t.y, s: t.s, f: t.f }; el.style.transform = tf(t); }
    place(cur);

    // Live position, so an interrupted flight resumes from where it visibly is.
    function livePos() {
      var s = getComputedStyle(el).transform;
      if (!s || s === 'none' || typeof DOMMatrixReadOnly === 'undefined') return cur;
      try {
        var m = new DOMMatrixReadOnly(s);
        return { x: m.m41, y: m.m42, s: Math.abs(m.a) || 1, f: m.a < 0 ? -1 : 1 };
      } catch (e) { return cur; }
    }

    function bezier(p0, p1, p2, p3, t) {
      var u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
      };
    }

    function flyTo(target, duration, cb) {
      flying = true;
      el.classList.remove('perched');
      el.style.visibility = 'visible';
      var from = livePos();
      var lift = Math.min(from.y, target.y) - 44;
      var c1 = { x: from.x + (target.x - from.x) * 0.3, y: lift };
      var c2 = { x: from.x + (target.x - from.x) * 0.7, y: lift };
      var frames = [];
      for (var i = 0; i <= 16; i++) {
        var t = i / 16;
        var p = bezier(from, c1, c2, target, t);
        var s = from.s + (target.s - from.s) * t;
        frames.push({ transform: 'translate(' + p.x + 'px,' + p.y + 'px) scale(' + (target.f * s) + ',' + s + ')' });
      }
      if (anim) { try { anim.cancel(); } catch (e) {} }
      anim = el.animate(frames, { duration: duration, easing: 'ease-in-out', fill: 'forwards' });
      anim.onfinish = function () {
        place(target);
        try { anim.cancel(); } catch (e) {}
        anim = null; flying = false;
        if (cb) cb();
      };
    }

    // ---- Perch on the speaking host's shoulder ----
    function perchTarget(voice) {
      var host = document.getElementById(voice === 'a' ? 'host-a' : 'host-b');
      var av = host && host.querySelector('.avatar');
      if (!av) return null;
      var r = av.getBoundingClientRect();
      var s = 0.5;
      if (voice === 'a') {
        // left host: perch on the top-left of the avatar, facing in toward her
        return { x: r.left - BW * s * 0.18, y: r.top - BH * s * 0.30, s: s, f: 1 };
      }
      // right host: mirror — top-right of the avatar, facing left toward him
      return { x: r.right - BW * s * 0.82, y: r.top - BH * s * 0.30, s: s, f: -1 };
    }

    function perchOnHost(voice) {
      if (voice !== 'a' && voice !== 'b') return;
      if (perched === voice && mode === 'perch') return;
      if (roamTimer) { clearTimeout(roamTimer); roamTimer = null; }
      var target = perchTarget(voice);
      if (!target) return;
      mode = 'perch'; perched = voice;
      flyTo(target, 700, function () {
        if (mode === 'perch' && perched === voice) el.classList.add('perched');
      });
    }

    function release() {
      if (mode === 'idle') return;
      el.classList.remove('perched');
      perched = null; mode = 'idle';
      flyTo({ x: window.innerWidth + 170, y: 60 + Math.random() * 80, s: 1, f: -1 }, 1400, function () {
        el.style.visibility = 'hidden';
        place({ x: -160, y: 120, s: 1, f: 1 });
        scheduleRoam();
      });
    }

    // Keep a perched bird glued to the shoulder as the page scrolls/resizes.
    var ticking = false;
    function follow() {
      if (mode !== 'perch' || flying || !perched || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (mode !== 'perch' || flying || !perched) return;
        var t = perchTarget(perched);
        if (t) place(t);
      });
    }
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow);

    // ---- Ambient roaming (only when not tied to the radio) ----
    function roamFlight(quick) {
      if (mode !== 'idle') return;
      mode = 'roam';
      var vw = window.innerWidth;
      var hover = { x: vw * 0.6, y: 150, s: 1, f: 1 };
      var daily = document.getElementById('daily');
      if (daily) {
        var r = daily.getBoundingClientRect();
        if (r.bottom > 90 && r.top < window.innerHeight - 120) {
          hover = { x: Math.min(r.right - 70, vw - 160), y: Math.max(80, r.top - 18), s: 1, f: 1 };
        }
      }
      place({ x: -160, y: 100 + Math.random() * 140, s: 1, f: 1 });
      el.style.visibility = 'visible';
      flyTo(hover, quick ? 3200 : 5000, function () {
        window.setTimeout(function () {
          if (mode !== 'roam') return;
          flyTo({ x: window.innerWidth + 170, y: 50 + Math.random() * 90, s: 1, f: -1 }, 4200, function () {
            el.style.visibility = 'hidden'; mode = 'idle';
            place({ x: -160, y: 120, s: 1, f: 1 });
            scheduleRoam();
          });
        }, 1500);
      });
    }

    function scheduleRoam() {
      if (roamTimer) clearTimeout(roamTimer);
      roamTimer = window.setTimeout(function () { roamFlight(false); }, 60000 + Math.random() * 60000);
    }

    window.setTimeout(function () { roamFlight(false); }, 3000);
    scheduleRoam();
    var shuffle = document.getElementById('daily-shuffle');
    if (shuffle) shuffle.addEventListener('click', function () { roamFlight(true); });

    api.perchOnHost = perchOnHost;
    api.release = release;
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
