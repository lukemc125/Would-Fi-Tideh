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

  // The three proverbs fi tideh: a seeded set, fixed for the day and fresh
  // tomorrow. The SAME three feed Wuds of Wisdom, so both sections agree.
  // "Gimme anodda one" cycles through them (0 → 1 → 2 → 0), so it always works;
  // "Back to today" jumps back to the first.
  var dailyThree = [];
  var dailyCursor = 0;

  function renderDaily(i) {
    var p = dailyThree[i];
    if (!p) return;
    dailyCursor = i;
    document.getElementById('daily-original').textContent = p.original;
    document.getElementById('daily-english').textContent = '"' + p.english + '"';
    document.getElementById('daily-meaning').textContent = p.meaning;
    document.getElementById('daily-date').textContent = prettyDate();
    document.getElementById('daily-reset').hidden = (i === 0);
    var note = document.getElementById('daily-left');
    if (note) note.textContent = 'Wud ' + (i + 1) + ' of ' + dailyThree.length + ' fi tideh';
  }

  function initDaily() {
    if (!data.length) return;
    dailyThree = P.dailyPicks(data, todayStr(), 3);
    if (!dailyThree.length) return;
    renderDaily(0);

    document.getElementById('daily-shuffle').addEventListener('click', function () {
      var next = (dailyCursor + 1) % dailyThree.length;
      renderDaily(next);
      hearProverb(dailyThree[next]);
    });
    document.getElementById('daily-reset').addEventListener('click', function () {
      renderDaily(0);
    });
    document.getElementById('daily-hear').addEventListener('click', function () {
      hearProverb(dailyThree[dailyCursor]);
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

  // ElevenLabs clips that don't currently exist — the intro.b readings were
  // removed when they miscounted ("five"), and can't be regenerated without the
  // API key. Lines mapping to these are dropped from the podcast so the whole
  // session stays sole-ElevenLabs (nothing falls back to the browser voice).
  // Once `npm run build:audio` regenerates them, empty this to restore the line.
  var UNVOICED = { 'intro.b.0': true, 'intro.b.1': true, 'intro.b.2': true };

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

  // The real recorded reading for a proverb (audio/recordings/<slug>.mp3).
  function recUrl(p) { return p && p.slug ? 'audio/recordings/' + encodeURIComponent(p.slug) + '.mp3' : null; }

  // Play a proverb aloud, preferring the real recording, then the generated
  // clip, then browser speech (if the recording is missing or won't decode).
  var dailyAudio = null;
  function hearProverb(p) {
    if (!p) return;
    if (dailyAudio) { try { dailyAudio.pause(); } catch (e) {} dailyAudio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (typeof Audio === 'undefined') { speak(p.original); return; }
    var sources = [];
    if (recUrl(p)) sources.push(recUrl(p));
    sources.push(clipUrl(p.slug));
    var a = new Audio();
    dailyAudio = a;
    var si = 0, advancing = false;
    function tryNext() {
      if (dailyAudio !== a) return;
      if (si >= sources.length) { speak(p.original); return; }
      a.src = sources[si++];
      var pr = a.play();
      if (pr && pr.catch) pr.catch(fail);
    }
    function fail() {
      // 'error' event and play() rejection can both fire for one source.
      if (advancing || dailyAudio !== a) return;
      advancing = true;
      setTimeout(function () { advancing = false; tryNext(); }, 0);
    }
    a.onerror = fail;
    tryNext();
  }

  // Donald's real, longer podcast episodes (his NotebookLM two-host sessions),
  // one per theme. One is unlocked per Jamaica calendar day (see dailyEpisode),
  // rotating by one each day. Order matters: it sets the rotation sequence, and
  // is arranged so the live rotation featured "Clarity" on launch day.
  var EPISODES = [
    { slug: 'accountability', title: 'Accountability', src: 'audio/episodes/accountability.mp3', dur: 336 },
    { slug: 'faith',          title: 'Faith',          src: 'audio/episodes/faith.mp3',          dur: 311 },
    { slug: 'family',         title: 'Family',         src: 'audio/episodes/family.mp3',         dur: 306 },
    { slug: 'work',           title: 'Work',           src: 'audio/episodes/work.mp3',           dur: 216 },
    { slug: 'clarity',        title: 'Clarity',        src: 'audio/episodes/clarity.mp3',        dur: 326 }
  ];
  function fmtDur(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }

  // Real episodes use Jamaica's calendar so everyone sees the same theme each day.
  function jamaicaDateStr(offset) {
    var d = new Date(Date.now() + (offset || 0) * 86400000);
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Jamaica', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(d);
      var out = {};
      for (var i = 0; i < parts.length; i++) if (parts[i].type !== 'literal') out[parts[i].type] = parts[i].value;
      return out.year + '-' + out.month + '-' + out.day;
    } catch (e) { return todayStr(); }
  }

  function initWow() {
    if (!data.length || !window.Radio) return;
    var player = new window.Radio.RadioPlayer();
    var S = window.Studio;
    var B = window.Bird;
    if (S) S.init(player);
    var transcriptEl = document.getElementById('wow-transcript');
    var statusEl = document.getElementById('wow-status');
    var barEl = document.getElementById('wow-progress-bar');
    var playBtn = document.getElementById('wow-play');
    var pauseBtn = document.getElementById('wow-pause');
    var stopBtn = document.getElementById('wow-stop');
    var subEl = document.getElementById('wow-sub');
    var channelsEl = document.getElementById('wow-channels');
    var dailyEpisodeBtn = document.getElementById('wow-daily-episode');
    var dailyEpisodeTitle = document.getElementById('wow-daily-episode-title');
    var dailyEpisodeMeta = document.getElementById('wow-daily-episode-meta');
    var previewBtn = document.getElementById('wow-preview-next');
    var script = [];
    var paused = false;
    var mode = 'session';   // 'session' (generated daily five) | 'episode' (real)
    var currentEp = null;
    var episodePreview = false;
    var epProg = null;      // timeupdate handler while an episode plays

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

    function dailyEpisode() {
      return window.Proverbs.dailyCyclePick(EPISODES, jamaicaDateStr(episodePreview ? 1 : 0));
    }

    function renderDailyEpisodeChannel() {
      var ep = dailyEpisode();
      if (!ep) return;
      if (dailyEpisodeTitle) dailyEpisodeTitle.textContent = (episodePreview ? 'Tomorrow’s reasoning: ' : 'Today’s reasoning: ') + ep.title;
      if (dailyEpisodeMeta) dailyEpisodeMeta.textContent = 'real · ' + fmtDur(ep.dur);
      if (previewBtn) previewBtn.innerHTML = episodePreview
        ? '<i class="ti ti-arrow-back" aria-hidden="true"></i> Back to today'
        : '<i class="ti ti-flask" aria-hidden="true"></i> Preview tomorrow';
    }

    function newSession() {
      player.stop();
      paused = false;
      mode = 'session';
      currentEp = null;
      if (S) S.autoTurns(false);
      // The same three proverbs as The Daily Wud — seeded by the date, fixed for
      // the day (same picks and banter for everyone) and fresh tomorrow.
      var picks = window.Proverbs.dailyPicks(data, todayStr(), 3);
      script = window.Proverbs.generateScript(picks, window.Proverbs.DEFAULT_HOSTS, window.Proverbs.seededRng(todayStr()));
      // Sole ElevenLabs: the whole podcast plays the pre-generated host clips —
      // no real recordings mixed in (those belong to the Daily Wud "Hear it"),
      // and no browser TTS. Drop any line whose clip is currently missing so
      // nothing falls back to the browser voice.
      script = script.filter(function (line) {
        var key = clipKeyFor(line, picks);
        return !(key && UNVOICED[key]);
      });
      script.forEach(function (line) {
        var key = clipKeyFor(line, picks);
        if (key) line.audioSrc = clipUrl(key);
      });
      renderTranscript();
      statusEl.textContent = 'Di day’s three ready — press play fi hear Auntie Pearl an Uncle Roy.';
      showPlaying(false);
      updateChannelUI();
    }

    // Load a real episode: a one-line "script" whose clip is the whole mp3, so it
    // rides the same studio pipeline. Tune in right away; the studio's audio-
    // driven turn-taking makes the two hosts trade off through it.
    function selectEpisode(ep) {
      player.stop();
      paused = false;
      mode = 'episode';
      currentEp = ep;
      script = [{ kind: 'episode', voice: 'a', speaker: 'Auntie Pearl', text: ep.title, audioSrc: ep.src }];
      if (subEl) subEl.textContent = (episodePreview ? 'Tomorrow’s reasoning' : 'Today’s reasoning') + ' — two co-hosts pon ' + ep.title.toLowerCase();
      renderEpisodeCard(ep);
      setProgress(0); barEl.style.width = '0%';
      updateChannelUI();
      if (S) S.onStop();
      if (B) B.release();
      beginPlay();
    }

    // Back to the generated Daily Five channel (loaded, not auto-played).
    function selectSession() {
      player.stop();
      paused = false;
      if (S) { S.autoTurns(false); S.onStop(); }
      if (B) B.release();
      unbindEpisodeProgress();
      if (subEl) subEl.textContent = 'Di day’s three proverbs plus one likkle radio session fi hol’ a reasoning… — fresh every day';
      newSession();
    }

    function renderEpisodeCard(ep) {
      transcriptEl.innerHTML = '';
      var card = document.createElement('div');
      card.className = 'ep-card';
      card.innerHTML =
        '<div class="ep-badge"><span class="ep-live-dot"></span> Real recording &middot; ' + fmtDur(ep.dur) + '</div>' +
        '<div class="ep-theme">' + escapeHtml(ep.title) + '</div>' +
        '<p class="ep-desc">In this deep-dive conversation, the two co-hosts hol’ a lively reasoning on several of Thompson’s wuds of wisdom relating to “<strong>' + escapeHtml(ep.title) + '</strong>”.</p>';
      transcriptEl.appendChild(card);
      transcriptEl.scrollTop = 0;
    }

    function updateChannelUI() {
      if (!channelsEl) return;
      var active = (mode === 'episode' && currentEp) ? 'episode' : 'session';
      var chans = channelsEl.querySelectorAll('.chan');
      for (var i = 0; i < chans.length; i++) {
        chans[i].classList.toggle('is-active', chans[i].getAttribute('data-chan') === active);
      }
    }

    // Drive the progress bar from real playback time while an episode plays.
    function bindEpisodeProgress() {
      unbindEpisodeProgress();
      var a = player.audio;
      if (!a) return;
      epProg = function () { if (a.duration) barEl.style.width = Math.round((a.currentTime / a.duration) * 100) + '%'; };
      a.addEventListener('timeupdate', epProg);
    }
    function unbindEpisodeProgress() {
      if (epProg && player.audio) player.audio.removeEventListener('timeupdate', epProg);
      epProg = null;
    }

    function sessionCallbacks() {
      return {
        onLineStart: function (i, line) { highlight(i); if (S) S.setSpeaker(line.voice); if (B) B.perchOnHost(line.voice); },
        onEnd: function () { paused = false; showPlaying(false); if (S) S.onEnd(); if (B) B.release(); statusEl.textContent = 'Dat done! Press play fi hear it again.'; setProgress(script.length); },
        onUnsupported: function () { statusEl.textContent = 'Yu browser cyaan talk — but read di transcript below.'; }
      };
    }

    function episodeCallbacks() {
      return {
        onLineStart: function () { if (B) B.perchOnHost('a'); },
        onEnd: function () { paused = false; showPlaying(false); if (S) { S.autoTurns(false); S.onEnd(); } if (B) B.release(); unbindEpisodeProgress(); barEl.style.width = '100%'; statusEl.textContent = 'Dat episode done — back to Di Daily Three, or preview tomorrow.'; },
        onUnsupported: function () { statusEl.textContent = 'Yu browser cyaan play dis audio.'; }
      };
    }

    // Play whatever's currently loaded, with mode-appropriate callbacks.
    function beginPlay() {
      player.loadVoices(function () {
        if (mode === 'episode' && currentEp) {
          if (S) S.autoTurns(true);
          player.play(script, episodeCallbacks());
          bindEpisodeProgress();
          statusEl.textContent = 'On air — Donald’s real session on ' + currentEp.title + '…';
        } else {
          if (S) S.autoTurns(false);
          player.play(script, sessionCallbacks());
          statusEl.textContent = 'On air…';
        }
        showPlaying(true);
        if (S) S.onPlay();
      });
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
        statusEl.textContent = (mode === 'episode' && currentEp) ? 'On air — ' + currentEp.title + '…' : 'On air…';
        return;
      }
      if (!script.length) {
        if (mode === 'episode' && currentEp) script = [{ kind: 'episode', voice: 'a', speaker: 'Auntie Pearl', text: currentEp.title, audioSrc: currentEp.src }];
        else newSession();
      }
      beginPlay();
    });
    pauseBtn.addEventListener('click', function () {
      player.pause();
      paused = true;
      showPaused();
      if (S) S.onPause();
      statusEl.textContent = 'Paused. Press play fi continue.';
    });
    stopBtn.addEventListener('click', function () {
      player.stop(); paused = false; showPlaying(false);
      if (S) { S.autoTurns(false); S.onStop(); }
      if (B) B.release();
      unbindEpisodeProgress();
      if (mode !== 'episode') highlight(-1);
      setProgress(0); barEl.style.width = '0%';
      statusEl.textContent = 'Stopped.';
    });

    if (channelsEl) channelsEl.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.chan') : null;
      if (!btn) return;
      var chan = btn.getAttribute('data-chan');
      if (chan === 'session') { if (mode !== 'session') selectSession(); }
      else if (chan === 'episode') selectEpisode(dailyEpisode());
    });

    if (previewBtn) previewBtn.addEventListener('click', function () {
      episodePreview = !episodePreview;
      renderDailyEpisodeChannel();
      if (mode === 'episode') selectEpisode(dailyEpisode());
    });

    renderDailyEpisodeChannel();
    newSession();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Bento launcher tiles: radio tile scrolls to the studio and starts the
  // session; mini tiles jump to their sections.
  function initBoard() {
    var radio = document.getElementById('radio-jump');
    if (radio) radio.addEventListener('click', function () {
      var wow = document.getElementById('wow');
      if (wow) wow.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
      var play = document.getElementById('wow-play');
      if (play && !play.hidden && !play.disabled) play.click();
    });
    var minis = document.querySelectorAll('.b-mini[data-jump]');
    for (var i = 0; i < minis.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          var t = document.querySelector(b.getAttribute('data-jump'));
          if (t) t.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
        });
      })(minis[i]);
    }
  }

  // Legends photos: a real black-and-white portrait shows when its file is
  // present; if it 404s (or can't decode) the image removes itself and the
  // monogram beneath shows through.
  function initPortraits() {
    var imgs = document.querySelectorAll('.portrait-img');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        function fail() { img.style.display = 'none'; }
        img.addEventListener('error', fail);
        if (img.complete && img.naturalWidth === 0) fail();
      })(imgs[i]);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.Theme) window.Theme.initTheme(document, window);
    if (window.Sky) window.Sky.initSky(document, window);
    initDaily();
    initWow();
    initBoard();
    initPortraits();
  });

  // Exposed for later tasks (Wuds of Wisdom, podcast) to extend.
  window.__WFT__ = { data: data, speak: speak };
})();
