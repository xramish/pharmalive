// Synthesized sound effects via the Web Audio API (no audio files needed).
(function () {
  'use strict';

  const KEY = 'nr_muted';
  let ctx = null;
  let muted = window.NR.storage.get(KEY, false);

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Browsers only allow audio after a user gesture; unlock on the first one.
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, () => audio(), { once: true, passive: true })
  );

  function tone({ freq, start = 0, dur = 0.15, type = 'sine', vol = 0.25, slideTo }) {
    const ac = audio();
    if (!ac || muted) return;
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const Sound = {
    tick(urgent) {
      tone({ freq: urgent ? 1320 : 880, dur: 0.06, type: 'square', vol: urgent ? 0.12 : 0.06 });
    },
    join() {
      tone({ freq: 660, dur: 0.08, type: 'triangle', vol: 0.15 });
      tone({ freq: 990, start: 0.07, dur: 0.1, type: 'triangle', vol: 0.15 });
    },
    go() {
      tone({ freq: 440, dur: 0.12, type: 'sawtooth', vol: 0.1 });
      tone({ freq: 880, start: 0.12, dur: 0.25, type: 'sawtooth', vol: 0.12 });
    },
    correct() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, start: i * 0.08, dur: 0.2, type: 'triangle', vol: 0.22 }));
    },
    wrong() {
      tone({ freq: 220, dur: 0.35, type: 'sawtooth', vol: 0.15, slideTo: 110 });
      tone({ freq: 233, start: 0.02, dur: 0.35, type: 'square', vol: 0.06, slideTo: 116 });
    },
    timeUp() {
      tone({ freq: 440, dur: 0.5, type: 'square', vol: 0.1, slideTo: 220 });
    },
    podium() {
      const notes = [523, 523, 523, 659, 784, 659, 784, 1047];
      const times = [0, 0.15, 0.3, 0.45, 0.7, 0.9, 1.05, 1.3];
      notes.forEach((f, i) => tone({ freq: f, start: times[i], dur: i === notes.length - 1 ? 0.9 : 0.18, type: 'triangle', vol: 0.25 }));
      notes.forEach((f, i) => tone({ freq: f / 2, start: times[i], dur: 0.18, type: 'sine', vol: 0.12 }));
    },
    drumroll(seconds) {
      const n = Math.floor(seconds * 18);
      for (let i = 0; i < n; i++) tone({ freq: 90 + Math.random() * 30, start: i / 18, dur: 0.05, type: 'triangle', vol: 0.05 + (i / n) * 0.1 });
    },
    isMuted: () => muted,
    setMuted(v) {
      muted = !!v;
      window.NR.storage.set(KEY, muted);
    },
    toggle() {
      Sound.setMuted(!muted);
      if (!muted) audio();
      return muted;
    },
  };

  window.Sound = Sound;
})();
