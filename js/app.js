(function () {
  var data = window.WUD_DATA || [];
  var P = window.Proverbs;
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function prettyDate() {
    try {
      return new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return todayStr(); }
  }

  var dailyIdx = null;
  var todayIdx = null;

  function renderDaily(idx, isToday) {
    var p = data[idx];
    if (!p) return;
    dailyIdx = idx;
    document.getElementById('daily-original').textContent = p.original;
    document.getElementById('daily-english').textContent = '"' + p.english + '"';
    document.getElementById('daily-meaning').textContent = p.meaning;
    document.getElementById('daily-date').textContent = prettyDate();
    document.getElementById('daily-reset').hidden = !!isToday;
  }

  function initDaily() {
    if (!data.length) return;
    todayIdx = P.dailyIndex(todayStr(), data.length);
    renderDaily(todayIdx, true);

    document.getElementById('daily-shuffle').addEventListener('click', function () {
      renderDaily(P.randomIndexExcluding(data.length, dailyIdx), false);
      hearProverb(data[dailyIdx]);
    });
    document.getElementById('daily-reset').addEventListener('click', function () {
      renderDaily(todayIdx, true);
    });
    document.getElementById('daily-hear').addEventListener('click', function () {
      hearProverb(data[dailyIdx]);
    });
  }

  // Lightweight one-off speech for the Daily Wud "Hear it".
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }

  function clipUrl(key) { return 'audio/proverbs/' + key + '.mp3'; }

  // The clip filename (sans .mp3) for a script line, or null if it has none.
  // Mirrors the keys in Proverbs.audioManifest so generated clips line up.
  function clipKeyFor(line, picks) {
    var p = (line.proverb != null) ? picks[line.proverb] : null;
    switch (line.kind) {
      case 'patois': return p ? p.slug : null;
      case 'translation': return p ? p.slug + '.trans' : null;
      case 'meaning': return p ? p.slug + '.meaning' : null;
      case 'intro': return 'intro.' + line.voice + '.' + line.variant;
      case 'outro': return 'outro.' + line.variant;
      default: return null;
    }
  }

  // Play a proverb's pre-generated authentic clip; fall back to browser speech
  // if the clip is missing or won't play.
  var dailyAudio = null;
  function hearProverb(p) {
    if (!p) return;
    if (dailyAudio) { try { dailyAudio.pause(); } catch (e) {} dailyAudio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (typeof Audio === 'undefined') { speak(p.original); return; }
    var a = new Audio();
    dailyAudio = a;
    var done = false;
    function fallback() { if (done) return; done = true; if (dailyAudio === a) speak(p.original); }
    a.onerror = fallback;
    a.src = clipUrl(p.slug);
    var pr = a.play();
    if (pr && pr.catch) pr.catch(fallback);
  }

  function initWow() {
    if (!data.length || !window.Radio) return;
    var player = new window.Radio.RadioPlayer();
    var S = window.Studio;
    if (S) S.init(player);
    var transcriptEl = document.getElementById('wow-transcript');
    var statusEl = document.getElementById('wow-status');
    var barEl = document.getElementById('wow-progress-bar');
    var playBtn = document.getElementById('wow-play');
    var pauseBtn = document.getElementById('wow-pause');
    var stopBtn = document.getElementById('wow-stop');
    var mixBtn = document.getElementById('wow-mix');
    var script = [];
    var paused = false;

    function renderTranscript() {
      transcriptEl.innerHTML = '';
      script.forEach(function (line, i) {
        var div = document.createElement('div');
        div.className = 't-line voice-' + line.voice + (REDUCE ? '' : ' enter');
        div.setAttribute('data-line', i);
        div.innerHTML = '<span class="who">' + line.speaker + ':</span> ' + escapeHtml(line.text);
        transcriptEl.appendChild(div);
      });
      if (!REDUCE) {
        var lines = transcriptEl.querySelectorAll('.t-line.enter');
        requestAnimationFrame(function () {
          for (var k = 0; k < lines.length; k++) {
            (function (node, idx) { setTimeout(function () { node.classList.remove('enter'); }, idx * 35); })(lines[k], k);
          }
        });
      }
      transcriptEl.scrollTop = 0;
      setProgress(0);
    }

    function setProgress(i) {
      var pct = script.length ? Math.round((i / script.length) * 100) : 0;
      barEl.style.width = pct + '%';
    }

    function highlight(i) {
      var nodes = transcriptEl.querySelectorAll('.t-line');
      for (var k = 0; k < nodes.length; k++) nodes[k].classList.toggle('active', k === i);
      setProgress(i + 1);
      var active = nodes[i];
      if (active) {
        var cRect = transcriptEl.getBoundingClientRect();
        var aRect = active.getBoundingClientRect();
        var target = transcriptEl.scrollTop + (aRect.top - cRect.top) - (transcriptEl.clientHeight / 2) + (aRect.height / 2);
        transcriptEl.scrollTo({ top: Math.max(0, target), behavior: REDUCE ? 'auto' : 'smooth' });
      }
    }

    function newSession() {
      player.stop();
      paused = false;
      var picks = window.Proverbs.pickN(data, 5);
      script = window.Proverbs.generateScript(picks, window.Proverbs.DEFAULT_HOSTS);
      // Map every line to its authentic clip; browser TTS fills any gaps.
      script.forEach(function (line) {
        var key = clipKeyFor(line, picks);
        if (key) line.audioSrc = clipUrl(key);
      });
      renderTranscript();
      statusEl.textContent = 'Press play fi hear Auntie Pearl an Uncle Roy.';
      showPlaying(false);
    }

    function showPlaying(on) {
      playBtn.hidden = on; pauseBtn.hidden = !on; stopBtn.hidden = !on;
    }

    // Paused: show Play (as "resume") next to Stop, hide Pause.
    function showPaused() {
      playBtn.hidden = false; pauseBtn.hidden = true; stopBtn.hidden = false;
    }

    if (!player.supported()) {
      statusEl.textContent = 'Yu browser cyaan talk — but read di transcript below.';
    }

    playBtn.addEventListener('click', function () {
      if (paused) {                      // resume where we left off
        paused = false;
        player.resume();
        showPlaying(true);
        if (S) S.onPlay();
        statusEl.textContent = 'On air…';
        return;
      }
      if (!script.length) newSession();
      player.loadVoices(function () {
        player.play(script, {
          onLineStart: function (i, line) { highlight(i); if (S) S.setSpeaker(line.voice); },
          onEnd: function () { paused = false; showPlaying(false); if (S) S.onEnd(); statusEl.textContent = 'Dat done! Mix up a new session?'; setProgress(script.length); },
          onUnsupported: function () { statusEl.textContent = 'Yu browser cyaan talk — but read di transcript below.'; }
        });
        showPlaying(true);
        if (S) S.onPlay();
        statusEl.textContent = 'On air…';
      });
    });
    pauseBtn.addEventListener('click', function () {
      player.pause();
      paused = true;
      showPaused();
      if (S) S.onPause();
      statusEl.textContent = 'Paused. Press play fi continue.';
    });
    stopBtn.addEventListener('click', function () { player.stop(); paused = false; showPlaying(false); if (S) S.onStop(); highlight(-1); setProgress(0); statusEl.textContent = 'Stopped.'; });
    mixBtn.addEventListener('click', function () { paused = false; if (S) S.onStop(); newSession(); });

    newSession();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function initPodcast() {
    var audio = document.getElementById('podcast-audio');
    var player = document.getElementById('podcast-player');
    var missing = document.getElementById('podcast-missing');
    if (!audio) return;
    var vinyl = document.querySelector('#original .vinyl');
    function spin(on) { if (vinyl) vinyl.classList.toggle('spinning', on); }
    // If the file is present and loadable, show the player; otherwise keep the
    // "coming soon" note. 'error' fires when the src 404s.
    audio.addEventListener('error', function () { player.hidden = true; missing.hidden = false; spin(false); });
    audio.addEventListener('loadedmetadata', function () { player.hidden = false; missing.hidden = true; });
    audio.addEventListener('play', function () { spin(true); });
    audio.addEventListener('pause', function () { spin(false); });
    audio.addEventListener('ended', function () { spin(false); });
    // Trigger a metadata probe without autoplaying.
    try { audio.load(); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.Theme) window.Theme.initTheme(document, window);
    if (window.Sky) window.Sky.initSky(document, window);
    initDaily();
    initWow();
    initPodcast();
  });

  // Exposed for later tasks (Wuds of Wisdom, podcast) to extend.
  window.__WFT__ = { data: data, speak: speak };
})();
