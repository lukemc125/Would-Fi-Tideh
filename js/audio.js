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

  // Per-host speech characteristics so the two hosts are distinguishable
  // even when only one system voice exists.
  var STYLE = {
    a: { pitch: 1.18, rate: 0.97 }, // Auntie Pearl — higher, lively
    b: { pitch: 0.82, rate: 0.95 }  // Uncle Roy — lower, easy
  };

  function RadioPlayer(synth) {
    this.synth = synth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.voices = null;
    this.script = [];
    this.index = 0;
    this.playing = false;
    this.callbacks = {};
  }

  RadioPlayer.prototype.supported = function () { return !!this.synth; };

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
    if (!this.synth) { if (callbacks && callbacks.onUnsupported) callbacks.onUnsupported(); return; }
    this.stop();
    this.script = script || [];
    this.callbacks = callbacks || {};
    this.index = 0;
    this.playing = true;
    this._speakFrom(0);
  };

  RadioPlayer.prototype._speakFrom = function (start) {
    var self = this;
    var voices = this.voices || {};
    for (var i = start; i < this.script.length; i++) {
      (function (i) {
        var line = self.script[i];
        var u = new (typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : function () {})(line.text);
        var style = STYLE[line.voice] || STYLE.a;
        if (voices[line.voice]) u.voice = voices[line.voice];
        u.pitch = style.pitch; u.rate = style.rate; u.lang = (u.voice && u.voice.lang) || 'en-US';
        u.onstart = function () { self.index = i; if (self.callbacks.onLineStart) self.callbacks.onLineStart(i, line); };
        u.onend = function () {
          if (i === self.script.length - 1 && self.playing) {
            self.playing = false;
            if (self.callbacks.onEnd) self.callbacks.onEnd();
          }
        };
        self.synth.speak(u);
      })(i);
    }
  };

  RadioPlayer.prototype.pause = function () { if (this.synth && this.playing) { this.synth.pause(); } };
  RadioPlayer.prototype.resume = function () { if (this.synth) { this.synth.resume(); } };
  RadioPlayer.prototype.stop = function () {
    if (this.synth) { this.synth.cancel(); }
    this.playing = false;
  };

  return { chooseVoices: chooseVoices, RadioPlayer: RadioPlayer };
});
