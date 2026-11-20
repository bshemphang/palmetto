// audio.js: synthesised WebAudio sounds only. No audio files, no network.
(function () {
  var ctx = null;
  var engineOsc = null;
  var engineGain = null;
  var sirenOn = false;
  var sirenOsc = null;
  var sirenGain = null;
  var sirenTimer = 0;
  var muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = low ? 'lowpass' : 'highpass';
    f.frequency.value = low ? 900 : 1200;
    var g = c.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start();
  }

  window.AudioSys = {
    unlock: function () { ensure(); },
    blip: function () { tone(880, 0.09, 'sine', 0.15, 1320); },
    coin: function () { tone(660, 0.08, 'sine', 0.15); setTimeout(function () { tone(990, 0.12, 'sine', 0.15); }, 80); },
    punch: function () { noise(0.08, 0.25, true); },
    gunshot: function () { noise(0.16, 0.4, false); tone(160, 0.1, 'sawtooth', 0.2, 50); },
    crash: function () { noise(0.25, 0.35, true); },
    alarm: function () { tone(440, 0.15, 'square', 0.1, 220); },
    mission: function () { tone(523, 0.12, 'sine', 0.15); setTimeout(function () { tone(659, 0.12, 'sine', 0.15); }, 110); setTimeout(function () { tone(784, 0.2, 'sine', 0.15); }, 220); },
    engineStart: function () {
      var c = ensure();
      if (!c || engineOsc) return;
      engineOsc = c.createOscillator();
      engineGain = c.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.0;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      engineOsc.connect(f);
      f.connect(engineGain);
      engineGain.connect(c.destination);
      engineOsc.start();
    },
    engineSet: function (speedNorm, on) {
      if (!engineOsc || !engineGain || !ctx) return;
      var target = on ? 0.05 + speedNorm * 0.06 : 0.0;
      engineGain.gain.setTargetAtTime(muted ? 0 : target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(50 + speedNorm * 140, ctx.currentTime, 0.1);
    },
    engineStop: function () {
      if (engineOsc) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; engineGain = null; }
    },
    sirenSet: function (on) {
      if (on === sirenOn) return;
      sirenOn = on;
      var c = ensure();
      if (!c) return;
      if (on && !sirenOsc) {
        sirenOsc = c.createOscillator();
        sirenGain = c.createGain();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.045;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(c.destination);
        sirenOsc.start();
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); } catch (e) {}
        sirenOsc = null;
        sirenGain = null;
      }
    },
    sirenTick: function (dt) {
      if (!sirenOsc || !ctx) return;
      sirenTimer += dt;
      var f = 650 + Math.sin(sirenTimer * 4.5) * 260;
      sirenOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
    },
    toggleMute: function () { muted = !muted; return muted; }
  };
})();
