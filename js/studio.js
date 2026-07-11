// The yaad radio studio: talking host avatars, ON AIR sign, audio-driven VU
// meter, and a synthesized island-ambience toggle (surf by day, crickets at
// night — pure Web Audio, no files). Wired from app.js at the play/pause/stop
// control points. Everything degrades: no AudioContext -> pseudo levels; no
// canvas -> no meter; reduced motion -> no mouth flap, static meter fill.
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Studio = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var REDUCE = typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var player = null;
  var ctx = null, analyser = null, freq = null, sourceWired = false;
  var rafId = null, playing = false, speaker = null, tPseudo = 0;
  var autoTurn = false, silenceMs = 0, holdMs = 0;
  var els = {};

  function $(id) { return document.getElementById(id); }

  function ensureContext() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  // Route the radio player's <audio> through an analyser. One-shot: a media
  // element can only be wired to a context once.
  function wireAnalyser() {
    if (sourceWired || !player || !player.audio) return;
    var c = ensureContext();
    if (!c) return;
    try {
      var src = c.createMediaElementSource(player.audio);
      analyser = c.createAnalyser();
      analyser.fftSize = 64;
      freq = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(c.destination);
      sourceWired = true;
    } catch (e) { analyser = null; }
  }

  // 0..1 loudness: real analyser data for clip lines, a lively pseudo-signal
  // for TTS lines (speechSynthesis can't be analysed).
  function level() {
    if (analyser && player && player.mode === 'clip') {
      analyser.getByteFrequencyData(freq);
      var sum = 0;
      for (var i = 0; i < freq.length; i++) sum += freq[i];
      return Math.min(1, (sum / freq.length) / 90);
    }
    tPseudo += 0.16;
    var v = 0.45 + 0.3 * Math.sin(tPseudo * 2.1) + 0.25 * Math.sin(tPseudo * 5.7 + 1.3);
    return Math.max(0.08, Math.min(1, v));
  }

  function setMouth(host, lv) {
    var m = els['mouth-' + host];
    if (m) m.setAttribute('ry', (1.2 + lv * 5.2).toFixed(2));
  }

  function restMouths() {
    setMouth('a', 0.1); setMouth('b', 0.1);
  }

  function drawMeter(lv) {
    var cv = els.vu; if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height, N = 16;
    g.clearRect(0, 0, W, H);
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--studio-accent').trim() || '#FFD23F';
    g.fillStyle = accent;
    var bw = W / N;
    for (var i = 0; i < N; i++) {
      var jitter = analyser && freq ? (freq[Math.floor(i * freq.length / N)] / 255) : lv * (0.55 + 0.45 * Math.sin(tPseudo + i * 0.9));
      var h = Math.max(2, jitter * H);
      g.globalAlpha = 0.35 + 0.65 * jitter;
      g.fillRect(i * bw + 1.5, H - h, bw - 3, h);
    }
    g.globalAlpha = 1;
  }

  function idleMeter() {
    var cv = els.vu; if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = 0.3;
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--studio-accent').trim() || '#FFD23F';
    for (var i = 0; i < 16; i++) g.fillRect(i * (cv.width / 16) + 1.5, cv.height - 3, (cv.width / 16) - 3, 3);
    g.globalAlpha = 1;
  }

  // Episode mode: with a single long recording (two hosts, mono, no transcript)
  // we can't truly diarise who's talking — so we derive turns from the audio
  // itself. When the level drops into a gap and then picks back up, hand the mic
  // to the other host. A minimum hold time stops it flapping mid-sentence.
  var TURN_QUIET = 0.09, TURN_GAP_MS = 240, TURN_HOLD_MS = 850, FRAME_MS = 16;
  function detectTurn(lv) {
    holdMs += FRAME_MS;
    if (lv < TURN_QUIET) { silenceMs += FRAME_MS; return; }
    if (silenceMs >= TURN_GAP_MS && holdMs >= TURN_HOLD_MS) {
      setSpeaker(speaker === 'a' ? 'b' : 'a');
      holdMs = 0;
    }
    silenceMs = 0;
  }

  // Toggle the audio-driven turn-taking. On: seed the first speaker and let the
  // loop hand off; off: speakers are driven per-line by the caller instead.
  function autoTurns(on) {
    autoTurn = !!on;
    silenceMs = 0; holdMs = 0;
    if (on) setSpeaker('a');
  }

  function loop() {
    if (!playing) return;
    var paused = player && player.paused;
    var lv = paused ? 0.05 : level();
    if (autoTurn && !paused) detectTurn(lv);
    if (!REDUCE && speaker) setMouth(speaker, paused ? 0.1 : lv);
    drawMeter(lv);
    rafId = window.requestAnimationFrame(loop);
  }

  // ---- Ambience: synthesized surf / crickets ----
  var amb = { on: false, nodes: [], gain: null, mode: null, timer: null };

  function ambStop() {
    if (amb.timer) { clearInterval(amb.timer); amb.timer = null; }
    amb.nodes.forEach(function (n) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} });
    if (amb.gain) { try { amb.gain.disconnect(); } catch (e) {} }
    amb.nodes = []; amb.gain = null; amb.mode = null;
  }

  function ambStart() {
    var c = ensureContext();
    if (!c) return false;
    if (c.state === 'suspended') c.resume();
    ambStop();
    var master = c.createGain();
    master.gain.value = 0.05;
    master.connect(c.destination);
    amb.gain = master;
    var night = document.documentElement.getAttribute('data-theme') === 'night';
    amb.mode = night ? 'crickets' : 'surf';

    if (!night) {
      // Surf: looped noise -> lowpass, swelling slowly via an LFO on the gain.
      var len = 2 * c.sampleRate;
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var noise = c.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      var swell = c.createGain(); swell.gain.value = 0.6;
      var lfo = c.createOscillator(); lfo.frequency.value = 0.07;
      var lfoAmt = c.createGain(); lfoAmt.gain.value = 0.35;
      lfo.connect(lfoAmt); lfoAmt.connect(swell.gain);
      noise.connect(lp); lp.connect(swell); swell.connect(master);
      noise.start(); lfo.start();
      amb.nodes = [noise, lfo];
    } else {
      // Crickets: short band-passed chirp bursts on a steady rhythm, two voices.
      var voices = [{ f: 4300, gap: 640 }, { f: 3800, gap: 890 }];
      var oscs = [];
      voices.forEach(function (v) {
        var osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = v.f;
        var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = v.f; bp.Q.value = 9;
        var env = c.createGain(); env.gain.value = 0;
        osc.connect(bp); bp.connect(env); env.connect(master);
        osc.start();
        oscs.push({ env: env });
        amb.nodes.push(osc);
      });
      amb.timer = setInterval(function () {
        oscs.forEach(function (o, idx) {
          if (Math.random() < 0.25) return; // leave gaps so it breathes
          var t0 = c.currentTime + idx * 0.09;
          for (var k = 0; k < 3; k++) {
            var t = t0 + k * 0.055;
            o.env.gain.setValueAtTime(0, t);
            o.env.gain.linearRampToValueAtTime(0.5, t + 0.012);
            o.env.gain.linearRampToValueAtTime(0, t + 0.045);
          }
        });
      }, 760);
    }
    return true;
  }

  function toggleAmbience(btn) {
    amb.on = !amb.on;
    if (amb.on && !ambStart()) amb.on = false;
    if (!amb.on) ambStop();
    btn.setAttribute('aria-pressed', String(amb.on));
    btn.classList.toggle('amb-on', amb.on);
  }

  // ---- Public wiring ----

  function init(radioPlayer) {
    player = radioPlayer;
    els.scene = $('studio-scene');
    if (!els.scene) return;
    els.hostA = $('host-a'); els.hostB = $('host-b');
    els['mouth-a'] = $('mouth-a'); els['mouth-b'] = $('mouth-b');
    els.onAir = $('on-air'); els.vu = $('vu-meter');
    var ambBtn = $('ambience');
    if (ambBtn) ambBtn.addEventListener('click', function () { toggleAmbience(ambBtn); });
    // If the theme flips while ambience plays, switch the soundscape to match.
    if (window.MutationObserver) {
      new MutationObserver(function () { if (amb.on) ambStart(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
    restMouths();
    idleMeter();
  }

  function onPlay() {
    if (!els.scene) return;
    wireAnalyser();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    playing = true;
    els.onAir.classList.add('live');
    if (rafId) window.cancelAnimationFrame(rafId);
    loop();
  }

  function setSpeaker(voice) {
    if (!els.scene) return;
    speaker = voice;
    if (els.hostA) els.hostA.classList.toggle('speaking', voice === 'a');
    if (els.hostB) els.hostB.classList.toggle('speaking', voice === 'b');
    if (voice !== 'a') setMouth('a', 0.1);
    if (voice !== 'b') setMouth('b', 0.1);
  }

  function onPause() {
    if (!els.scene) return;
    els.onAir.classList.remove('live');
  }

  function onStop() {
    if (!els.scene) return;
    playing = false;
    autoTurn = false;
    speaker = null;
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    if (els.hostA) els.hostA.classList.remove('speaking');
    if (els.hostB) els.hostB.classList.remove('speaking');
    els.onAir.classList.remove('live');
    restMouths();
    idleMeter();
  }

  return { init: init, onPlay: onPlay, onPause: onPause, onStop: onStop, onEnd: onStop, setSpeaker: setSpeaker, autoTurns: autoTurns };
});
