// Test yu Patois — the quiz overlay. Duolingo-style: segmented progress,
// hearts, word chips, a feedback banner that slides up, synthesized sounds,
// confetti, and localStorage persistence (best score, rank, daily streak,
// mute). All question generation/scoring lives in js/quiz.js (pure, tested);
// this file is only DOM, state and noise.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var Q = window.Quiz;
  var DATA = window.WUD_DATA || [];
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PRAISE = ['Nice! Big up yuself!', 'Yes iyah — correct!', 'Sweet! Yu know yu wuds!', 'Bullseye! Gwaan so!', 'Dat right! Walk good!'];

  var els = {};
  var st = null;        // { qs, i, s, results[], answered, selection, line[], ear }
  var lastFocus = null;
  var store = { best: 0, streak: 0, last: '', muted: false };
  try {
    var raw = localStorage.getItem('wft-quiz');
    if (raw) { var p = JSON.parse(raw); for (var k in store) if (k in p) store[k] = p[k]; }
  } catch (e) {}

  function save() { try { localStorage.setItem('wft-quiz', JSON.stringify(store)); } catch (e) {} }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---- Sounds: tiny synthesized blips, no files ----
  var actx = null;
  function ctx() {
    if (actx) return actx;
    var AC = window.AudioContext || window.webkitAudioContext;
    try { actx = AC ? new AC() : null; } catch (e) { actx = null; }
    return actx;
  }
  function tone(freq, at, dur, type, vol) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + at);
    g.gain.linearRampToValueAtTime(vol || 0.12, c.currentTime + at + 0.015);
    g.gain.linearRampToValueAtTime(0, c.currentTime + at + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.02);
  }
  function sfx(kind) {
    if (store.muted) return;
    var c = ctx(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (kind === 'ok') { tone(660, 0, 0.1); tone(880, 0.09, 0.14); }
    else if (kind === 'bad') { tone(180, 0, 0.2, 'square', 0.07); }
    else if (kind === 'fanfare') { tone(523, 0, 0.12); tone(659, 0.11, 0.12); tone(784, 0.22, 0.12); tone(1046, 0.33, 0.3); }
  }

  // ---- Countdown to the next daily set (local midnight) ----
  var countdownTimer = null;
  function msToMidnight() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;
  }
  function fmtHMS(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(ss);
  }
  function fmtShort(ms) {
    if (ms < 0) ms = 0;
    var m = Math.floor(ms / 60000);
    return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : (m % 60) + 'm';
  }
  function stopCountdown() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }
  function startEndCountdown() {
    var el = document.getElementById('quiz-next');
    if (!el) return;
    stopCountdown();
    function tick() {
      var ms = msToMidnight();
      if (ms <= 0) {
        el.innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i> A fresh game ready — press Practice fi di new questions!';
        stopCountdown();
        return;
      }
      el.innerHTML = '<i class="ti ti-clock" aria-hidden="true"></i> New game in <strong>' + fmtHMS(ms) + '</strong> — come back tomorrow fi a fresh game';
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ---- Entry-card stats ----
  function refreshCard() {
    var r = document.getElementById('quiz-rank');
    var s = document.getElementById('quiz-streak');
    var b = document.getElementById('quiz-best');
    var c = document.getElementById('quiz-count');
    if (r) r.textContent = Q.rankFor(store.best);
    if (s) s.textContent = store.streak;
    if (b) b.textContent = store.best;
    if (c) c.innerHTML = '<i class="ti ti-clock" aria-hidden="true"></i> New game in ' + fmtShort(msToMidnight());
  }

  // ---- Overlay open/close ----
  function open() {
    stopCountdown();
    lastFocus = document.activeElement;
    st = {
      qs: Q.dailyRound(DATA, today()),
      i: 0, s: Q.newScore(), results: [],
      answered: false, selection: null, line: [], ear: null, over: false
    };
    els.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    buildProgress();
    renderHearts();
    els.check.hidden = false;
    renderQuestion();
    els.close.focus();
  }

  function close() {
    stopEar();
    stopCountdown();
    els.overlay.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var focusables = els.overlay.querySelectorAll('button:not([disabled]):not([hidden])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  // ---- Top bar ----
  function buildProgress() {
    els.progress.innerHTML = '';
    for (var i = 0; i < st.qs.length; i++) els.progress.appendChild(document.createElement('span'));
  }
  function renderProgress() {
    var segs = els.progress.children;
    for (var i = 0; i < segs.length; i++) {
      segs[i].className = i < st.results.length ? (st.results[i] ? 'ok' : 'bad') : '';
    }
  }
  function renderHearts() {
    els.hearts.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var h = document.createElement('i');
      h.className = 'ti ti-heart' + (i < st.s.hearts ? '' : ' lost');
      h.setAttribute('aria-hidden', 'true');
      els.hearts.appendChild(h);
    }
    els.hearts.setAttribute('aria-label', st.s.hearts + ' of 3 hearts remaining');
  }

  // ---- Questions ----
  var KIND_LABEL = { fill: 'Fill di blank', build: 'Build di phrase', ear: 'Ear test', meaning: 'Match di meaning' };

  function sentenceHtml(q) {
    return q.tokens.map(function (t, i) {
      if (i === q.blankIndex) return '<span class="q-blank" id="q-blank">&nbsp;</span>';
      return esc(t);
    }).join(' ');
  }

  function renderQuestion() {
    var q = st.qs[st.i];
    st.answered = false; st.selection = null; st.line = [];
    stopEar();
    hideBanner();
    els.check.textContent = 'Check';
    els.check.disabled = true;

    var html = '<p class="q-kind">' + KIND_LABEL[q.type] + '</p>';
    if (q.type === 'fill' || q.type === 'ear') {
      html += '<h3 class="q-prompt">' + (q.type === 'ear' ? 'Listen, den fill di missing wud' : 'Fill di missing wud') + '</h3>';
      if (q.type === 'ear') {
        html += '<button id="q-speak" class="q-speak" type="button" aria-label="Play the proverb"><i class="ti ti-volume" aria-hidden="true"></i></button>';
      }
      html += '<p class="q-sentence">' + sentenceHtml(q) + '</p>';
      html += '<div class="q-chips">' + q.choices.map(function (w) {
        return '<button class="q-chip" type="button" data-w="' + esc(w) + '">' + esc(w) + '</button>';
      }).join('') + '</div>';
    } else if (q.type === 'build') {
      html += '<h3 class="q-prompt">Build di patois fi dis:</h3>';
      html += '<p class="q-english">&ldquo;' + esc(q.english) + '&rdquo;</p>';
      html += '<div class="q-line" id="q-line" aria-label="Your answer"></div>';
      html += '<div class="q-chips" id="q-bank">' + q.bank.map(function (w, i) {
        return '<button class="q-chip" type="button" data-bi="' + i + '" data-w="' + esc(w) + '">' + esc(w) + '</button>';
      }).join('') + '</div>';
    } else {
      html += '<h3 class="q-prompt">Wha dis mean?</h3>';
      html += '<p class="q-sentence">&ldquo;' + esc(q.patois) + '&rdquo;</p>';
      html += '<div class="q-options">' + q.options.map(function (m, i) {
        return '<button class="q-option" type="button" data-i="' + i + '">' + esc(m) + '</button>';
      }).join('') + '</div>';
    }
    els.stage.innerHTML = html;
    els.stage.scrollTop = 0;

    if (q.type === 'ear') setupEar(q);
  }

  function setupEar(q) {
    var btn = document.getElementById('q-speak');
    var a = new Audio();
    st.ear = a;
    a.onerror = function () {
      // Clip unavailable: quietly become a plain fill-di-blank.
      q.type = 'fill';
      if (btn) btn.remove();
      var kind = els.stage.querySelector('.q-kind');
      if (kind) kind.textContent = KIND_LABEL.fill;
      var prompt = els.stage.querySelector('.q-prompt');
      if (prompt) prompt.textContent = 'Fill di missing wud';
    };
    a.src = q.clip;
    if (btn) btn.addEventListener('click', function () {
      try { a.currentTime = 0; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    });
  }

  function stopEar() {
    if (st && st.ear) { try { st.ear.pause(); } catch (e) {} st.ear = null; }
  }

  // Chip / option interaction (delegated).
  function onStageClick(e) {
    if (!st || st.answered) return;
    var q = st.qs[st.i];
    var btn = e.target.closest('button');
    if (!btn || btn.id === 'q-speak') return;

    if (q.type === 'build') {
      if (btn.parentElement && btn.parentElement.id === 'q-bank') {
        if (btn.classList.contains('used')) return;
        btn.classList.add('used');
        btn.disabled = true;
        var lineChip = document.createElement('button');
        lineChip.type = 'button';
        lineChip.className = 'q-chip q-chip-line';
        lineChip.textContent = btn.getAttribute('data-w');
        lineChip.setAttribute('data-bi', btn.getAttribute('data-bi'));
        document.getElementById('q-line').appendChild(lineChip);
        st.line.push(btn.getAttribute('data-w'));
      } else if (btn.classList.contains('q-chip-line')) {
        var bi = btn.getAttribute('data-bi');
        var bankChip = els.stage.querySelector('#q-bank .q-chip[data-bi="' + bi + '"]');
        if (bankChip) { bankChip.classList.remove('used'); bankChip.disabled = false; }
        var idx = Array.prototype.indexOf.call(btn.parentElement.children, btn);
        st.line.splice(idx, 1);
        btn.remove();
      }
      els.check.disabled = st.line.length !== q.target.length;
      return;
    }

    if (q.type === 'meaning' && btn.classList.contains('q-option')) {
      els.stage.querySelectorAll('.q-option').forEach(function (o) { o.classList.remove('sel'); });
      btn.classList.add('sel');
      st.selection = q.options[parseInt(btn.getAttribute('data-i'), 10)];
      els.check.disabled = false;
      return;
    }

    if (btn.classList.contains('q-chip')) {
      els.stage.querySelectorAll('.q-chip').forEach(function (c) { c.classList.remove('sel'); });
      btn.classList.add('sel');
      st.selection = btn.getAttribute('data-w');
      els.check.disabled = false;
    }
  }

  // ---- Check / continue ----
  function grade(q) {
    if (q.type === 'build') return st.line.join(' ') === q.target.join(' ');
    return st.selection === q.answer;
  }

  function showBanner(ok, q) {
    var html;
    if (ok) {
      html = '<strong>' + PRAISE[Math.floor(Math.random() * PRAISE.length)] + '</strong>';
      if (st.s.combo >= 2) html += ' <span class="q-combo"><i class="ti ti-flame" aria-hidden="true"></i>' + st.s.combo + ' combo</span>';
    } else {
      var correct = q.type === 'build' ? q.proverb.original : (q.type === 'meaning' ? q.answer : q.answer);
      html = '<strong>Nuh quite.</strong> Di right answer: <em>' + esc(correct) + '</em>';
    }
    els.banner.innerHTML = html;
    els.banner.className = 'quiz-banner show ' + (ok ? 'ok' : 'bad');
  }

  function hideBanner() { els.banner.className = 'quiz-banner'; els.banner.innerHTML = ''; }

  function revealBlank(q, ok) {
    var blank = document.getElementById('q-blank');
    if (blank) { blank.textContent = q.answer; blank.className = 'q-blank ' + (ok ? 'filled-ok' : 'filled-bad'); }
  }

  function onCheck() {
    if (!st) return;
    var q = st.qs[st.i];
    if (!st.answered) {
      var ok = grade(q);
      st.s = Q.applyAnswer(st.s, ok);
      st.results.push(ok);
      st.answered = true;
      if (q.type === 'fill' || q.type === 'ear') revealBlank(q, ok);
      els.stage.classList.add('locked');
      showBanner(ok, q);
      renderProgress();
      renderHearts();
      sfx(ok ? 'ok' : 'bad');
      els.check.textContent = 'Continue';
      els.check.disabled = false;
    } else {
      els.stage.classList.remove('locked');
      st.i++;
      if (st.i >= st.qs.length || st.s.hearts === 0) endScreen();
      else renderQuestion();
    }
  }

  // ---- End screen ----
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function yesterday() {
    var d = new Date(Date.now() - 86400000);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function endScreen() {
    stopEar();
    hideBanner();
    var s = st.s;
    var accuracy = s.correct / Math.max(1, s.answered);
    var t = today();
    if (store.last !== t) {
      store.streak = store.last === yesterday() ? store.streak + 1 : 1;
      store.last = t;
    }
    if (s.score > store.best) store.best = s.score;
    save();
    refreshCard();

    var outOfHearts = s.hearts === 0 && s.answered < st.qs.length;
    els.stage.innerHTML =
      '<div class="quiz-end">' +
      (outOfHearts ? '<p class="q-kind">Hearts done!</p>' : '<p class="q-kind">Round done!</p>') +
      '<p class="quiz-score-big">' + s.score + '</p>' +
      '<p class="quiz-verdict">' + Q.verdictFor(accuracy) + '</p>' +
      '<div class="quiz-end-stats">' +
      '<span class="quiz-stat"><i class="ti ti-target" aria-hidden="true"></i> ' + Math.round(accuracy * 100) + '%</span>' +
      '<span class="quiz-stat"><i class="ti ti-flame" aria-hidden="true"></i> ' + s.bestCombo + ' best combo</span>' +
      '<span class="quiz-stat"><i class="ti ti-medal" aria-hidden="true"></i> ' + Q.rankFor(store.best) + '</span>' +
      '<span class="quiz-stat"><i class="ti ti-calendar" aria-hidden="true"></i> ' + store.streak + '-day streak</span>' +
      '</div>' +
      '<p class="quiz-next" id="quiz-next"></p>' +
      '<div class="quiz-end-actions">' +
      '<button id="quiz-again" class="btn btn-orange" type="button"><i class="ti ti-refresh" aria-hidden="true"></i> Practice again</button>' +
      '<button id="quiz-done" class="btn btn-ghost" type="button">Done</button>' +
      '</div></div>';
    els.check.hidden = true;
    st.over = true;
    document.getElementById('quiz-again').addEventListener('click', function () { els.check.hidden = false; open(); });
    document.getElementById('quiz-done').addEventListener('click', close);
    startEndCountdown();
    sfx('fanfare');
    if (!REDUCE && accuracy >= 0.5) confetti();
    document.getElementById('quiz-again').focus();
  }

  function confetti() {
    var colors = ['#0F8B3B', '#FFD23F', '#FF7A1A', '#FFF7E6'];
    for (var i = 0; i < 50; i++) {
      var bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.left = (Math.random() * 100) + '%';
      bit.style.background = colors[i % colors.length];
      els.overlay.appendChild(bit);
      var fall = bit.animate([
        { transform: 'translateY(-20px) rotate(0deg)', opacity: 1 },
        { transform: 'translateY(' + (window.innerHeight + 40) + 'px) rotate(' + (360 + Math.random() * 540) + 'deg)', opacity: 0.7 }
      ], { duration: 2200 + Math.random() * 1800, delay: Math.random() * 500, easing: 'ease-in', fill: 'forwards' });
      (function (b, f) { f.onfinish = function () { b.remove(); }; })(bit, fall);
    }
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', function () {
    if (!Q || !DATA.length) return;
    els.overlay = document.getElementById('quiz-overlay');
    if (!els.overlay) return;
    els.stage = document.getElementById('quiz-stage');
    els.banner = document.getElementById('quiz-banner');
    els.check = document.getElementById('quiz-check');
    els.progress = document.getElementById('quiz-progress');
    els.hearts = document.getElementById('quiz-hearts');
    els.close = document.getElementById('quiz-close');
    var start = document.getElementById('quiz-start');
    var mute = document.getElementById('quiz-mute');

    function renderMute() {
      mute.setAttribute('aria-pressed', String(store.muted));
      mute.innerHTML = '<i class="ti ' + (store.muted ? 'ti-volume-off' : 'ti-volume') + '" aria-hidden="true"></i>';
      mute.setAttribute('aria-label', store.muted ? 'Unmute sounds' : 'Mute sounds');
    }
    renderMute();

    if (start) start.addEventListener('click', open);
    els.close.addEventListener('click', close);
    els.check.addEventListener('click', onCheck);
    els.stage.addEventListener('click', onStageClick);
    mute.addEventListener('click', function () { store.muted = !store.muted; save(); renderMute(); });
    refreshCard();
    window.setInterval(refreshCard, 30000);
  });
})();
