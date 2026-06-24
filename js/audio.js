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
  }

  RadioPlayer.prototype.supported = function () { return !!(this.synth || this.audio); };

  RadioPlayer.prototype.loadVoices = function (cb) {
    var self = this;
    if (!this.synth) { cb(null); return; }
    var got = this.synth.getVoices();
    if (got && got.length) { this.voices = chooseVoices(got); cb(self.voices); return; }
    this.synth.onvoiceschanged = function () {
      self.voices = chooseVoices(self.synth.getVoices());
      cb(self.voices);
    };
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

  RadioPlayer.prototype._playClip = function (line) {
    var self = this, a = this.audio, settled = false;
    this.mode = 'clip';
    function clear() { a.onended = null; a.onerror = null; }
    function onErr() { if (settled) return; settled = true; clear(); self._speak(line); } // clip missing -> speak
    a.onended = function () { if (settled) return; settled = true; clear(); self._next(); };
    a.onerror = onErr;
    try { a.src = line.audioSrc; } catch (e) { onErr(); return; }
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
    u.onend = function () { self._next(); };
    u.onerror = function () { self._next(); };
    this.synth.speak(u);
  };

  RadioPlayer.prototype.pause = function () {
    if (!this.playing || this.paused) return;
    this.paused = true;
    if (this.mode === 'clip' && this.audio) this.audio.pause();
    else if (this.synth) this.synth.pause();
  };

  RadioPlayer.prototype.resume = function () {
    if (!this.paused) return;
    this.paused = false;
    if (this.mode === 'clip' && this.audio) { var p = this.audio.play(); if (p && p.catch) p.catch(function () {}); }
    else if (this.synth) this.synth.resume();
  };

  RadioPlayer.prototype.stop = function () {
    this.playing = false;
    this.paused = false;
    if (this.synth) this.synth.cancel();
    if (this.audio) {
      try { this.audio.pause(); this.audio.onended = null; this.audio.onerror = null; this.audio.removeAttribute('src'); } catch (e) {}
    }
  };

  return { chooseVoices: chooseVoices, RadioPlayer: RadioPlayer };
});
