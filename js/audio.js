(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.Radio = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function chooseVoices(voices) {
    if (!voices || voices.length === 0) return null;
    var english = voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('en') === 0; });
    var pool = english.length >= 1 ? english : voices;
    var a = pool[0];
    var b = pool.length > 1 ? pool[1] : pool[0];
    return { a: a, b: b };
  }

  // Per-host speech characteristics so the two hosts are distinguishable even
  // when only one system voice exists (browser-TTS fallback only).
  var STYLE = {
    a: { pitch: 1.18, rate: 0.97 }, // Auntie Pearl — higher, lively
    b: { pitch: 0.82, rate: 0.95 }  // Uncle Roy — lower, easy
  };

  // Plays a script ONE line at a time, in order. A line carrying an `audioSrc`
  // (a pre-generated authentic clip) is played from that file; if the file is
  // missing or unplayable, that line falls back to browser speech. Lines with no
  // `audioSrc` use browser speech. So the patois lines can sound authentic while
  // the English banter rides the system voice.
  function RadioPlayer(synth, AudioCtor) {
    this.synth = synth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    var AC = AudioCtor || (typeof Audio !== 'undefined' ? Audio : null);
    this.audio = AC ? new AC() : null;
    this.voices = null;
    this.script = [];
    this.cb = {};
    this.index = -1;
    this.playing = false;
    this.paused = false;
    this.mode = null; // 'clip' | 'tts'
    this._gapTimer = null; // pending pauseAfter gap
    this._gapOwed = false; // a gap was interrupted by pause(); finish it on resume
  }

  RadioPlayer.prototype.supported = function () { return !!(this.synth || this.audio); };

  RadioPlayer.prototype.loadVoices = function (cb) {
    var self = this;
    if (!this.synth) { cb(null); return; }
    var got = this.synth.getVoices();
    if (got && got.length) this.voices = chooseVoices(got);
    // Don't block playback waiting for voices — the session plays clips, and
    // voices are only for the TTS fallback. Keep updating them in the background
    // so a later fallback still gets good voices, but start now.
    this.synth.onvoiceschanged = function () {
      self.voices = chooseVoices(self.synth.getVoices());
    };
    cb(this.voices || null);
  };

  RadioPlayer.prototype.play = function (script, callbacks) {
    this.cb = callbacks || {};
    if (!this.supported()) { if (this.cb.onUnsupported) this.cb.onUnsupported(); return; }
    this.stop();
    this.cb = callbacks || {};
    this.script = script || [];
    this.index = -1;
    this.playing = true;
    this.paused = false;
    this._next();
  };

  RadioPlayer.prototype._next = function () {
    if (!this.playing) return;
    this.index++;
    if (this.index >= this.script.length) {
      this.playing = false;
      if (this.cb.onEnd) this.cb.onEnd();
      return;
    }
    var line = this.script[this.index];
    if (this.cb.onLineStart) this.cb.onLineStart(this.index, line);
    if (line.audioSrc && this.audio) this._playClip(line);
    else this._speak(line);
  };

  // Play line.audioSrc; on failure fall back to line.audioAlt (e.g. a real
  // recording the browser can't decode falls back to the generated clip),
  // and only then to speech.
  RadioPlayer.prototype._playClip = function (line, src, alt) {
    var self = this, a = this.audio, settled = false;
    if (src == null) { src = line.audioSrc; alt = line.audioAlt || null; }
    this.mode = 'clip';
    function clear() { a.onended = null; a.onerror = null; }
    function onErr() {
      if (settled) return; settled = true; clear();
      if (alt) self._playClip(line, alt, null);
      else self._speak(line);
    }
    a.onended = function () { if (settled) return; settled = true; clear(); self._afterLine(line); };
    a.onerror = onErr;
    try { a.src = src; } catch (e) { onErr(); return; }
    var p = a.play();
    if (p && p.catch) p.catch(onErr);
  };

  RadioPlayer.prototype._speak = function (line) {
    var self = this;
    this.mode = 'tts';
    if (!this.synth || typeof window === 'undefined' || !window.SpeechSynthesisUtterance) { self._next(); return; }
    var u = new window.SpeechSynthesisUtterance(line.text);
    var style = STYLE[line.voice] || STYLE.a;
    var voices = this.voices || {};
    if (voices[line.voice]) u.voice = voices[line.voice];
    u.pitch = style.pitch; u.rate = style.rate; u.lang = (u.voice && u.voice.lang) || 'en-US';
    u.onend = function () { self._afterLine(line); };
    u.onerror = function () { self._next(); };
    this.synth.speak(u);
  };

  // Advance to the next line, holding line.pauseAfter ms of silence first so the
  // reading breathes. A pause() during the gap defers the advance to resume().
  RadioPlayer.prototype._afterLine = function (line) {
    if (!this.playing) return;
    var d = (line && line.pauseAfter) || 0;
    if (d > 0) {
      var self = this;
      this._gapTimer = setTimeout(function () { self._gapTimer = null; self._next(); }, d);
    } else {
      this._next();
    }
  };

  RadioPlayer.prototype.pause = function () {
    if (!this.playing || this.paused) return;
    this.paused = true;
    if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapTimer = null; this._gapOwed = true; }
    if (this.mode === 'clip' && this.audio) this.audio.pause();
    else if (this.synth) this.synth.pause();
  };

  RadioPlayer.prototype.resume = function () {
    if (!this.paused) return;
    this.paused = false;
    if (this._gapOwed) { this._gapOwed = false; this._next(); return; }
    if (this.mode === 'clip' && this.audio) { var p = this.audio.play(); if (p && p.catch) p.catch(function () {}); }
    else if (this.synth) this.synth.resume();
  };

  RadioPlayer.prototype.stop = function () {
    this.playing = false;
    this.paused = false;
    if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapTimer = null; }
    this._gapOwed = false;
    if (this.synth) this.synth.cancel();
    if (this.audio) {
      try { this.audio.pause(); this.audio.onended = null; this.audio.onerror = null; this.audio.removeAttribute('src'); } catch (e) {}
    }
  };

  return { chooseVoices: chooseVoices, RadioPlayer: RadioPlayer };
});
