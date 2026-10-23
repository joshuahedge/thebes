// Sound and haptics (spec 5.5): nine short synthesised effects (the raid horn and the coin tick from Stage 3; Version 7.0 adds five more, below), on by default (Version 6.0, ruling 746; mute in Settings), unlocked on the first user
// gesture; an ambient audio session so the iPhone silent switch is respected; short vibration pulses.
// No audio element and no silent-switch unlock hack: when the phone is muted, the game is quiet.
export const SFX = {
  place: [{ f: 440, type: 'triangle', t: 0, d: 0.08, g: 0.25 }, { f: 660, type: 'triangle', t: 0.06, d: 0.1, g: 0.2 }],
  road: [{ f: 300, type: 'square', t: 0, d: 0.05, g: 0.12 }],
  demolish: [{ f: 220, type: 'sawtooth', t: 0, d: 0.18, g: 0.2, slide: 80 }],
  upgrade: [{ f: 523, type: 'sine', t: 0, d: 0.1, g: 0.2 }, { f: 659, type: 'sine', t: 0.1, d: 0.1, g: 0.2 }, { f: 784, type: 'sine', t: 0.2, d: 0.16, g: 0.2 }],
  milestone: [{ f: 523, type: 'triangle', t: 0, d: 0.15, g: 0.25 }, { f: 659, type: 'triangle', t: 0.15, d: 0.15, g: 0.25 }, { f: 784, type: 'triangle', t: 0.3, d: 0.15, g: 0.25 }, { f: 1047, type: 'triangle', t: 0.45, d: 0.3, g: 0.3 }],
  alert: [{ f: 330, type: 'square', t: 0, d: 0.12, g: 0.15 }, { f: 330, type: 'square', t: 0.2, d: 0.12, g: 0.15 }],
  goal: [{ f: 587, type: 'sine', t: 0, d: 0.1, g: 0.2 }, { f: 880, type: 'sine', t: 0.1, d: 0.2, g: 0.25 }],
  // Stage 3: the raid horn, three low notes once when a warning appears; the coin tick, one high note when taxes arrive.
  horn: [{ f: 147, type: 'sawtooth', t: 0, d: 0.35, g: 0.2 }, { f: 147, type: 'sawtooth', t: 0.45, d: 0.35, g: 0.2 }, { f: 110, type: 'sawtooth', t: 0.9, d: 0.4, g: 0.22 }],
  coin: [{ f: 1568, type: 'triangle', t: 0, d: 0.08, g: 0.12 }],
  // Version 7.0 (Track S, ruling 938): the living world's short effects, all quiet and made of the same few oscillators. market: a bustle (a few
  // soft voices and a coin) for a bazaar in the view; fire: a crackle of short sharp ticks; battle: two clashes of metal over a low thud; bells:
  // a caravan's bells, four rising notes; oars: a boat's two strokes (a thud and a splash each).
  market: [
    { f: 520, type: 'triangle', t: 0, d: 0.07, g: 0.035 }, { f: 700, type: 'triangle', t: 0.11, d: 0.06, g: 0.03 }, { f: 610, type: 'triangle', t: 0.2, d: 0.07, g: 0.035 },
    { f: 460, type: 'triangle', t: 0.29, d: 0.08, g: 0.03 }, { f: 1760, type: 'sine', t: 0.36, d: 0.06, g: 0.025 },
  ],
  fire: [
    { f: 3100, type: 'square', t: 0, d: 0.014, g: 0.05 }, { f: 4400, type: 'square', t: 0.05, d: 0.012, g: 0.04 }, { f: 2500, type: 'square', t: 0.09, d: 0.02, g: 0.06 },
    { f: 3800, type: 'square', t: 0.17, d: 0.012, g: 0.045 }, { f: 2900, type: 'square', t: 0.2, d: 0.016, g: 0.05 }, { f: 4700, type: 'square', t: 0.28, d: 0.012, g: 0.035 },
    { f: 2300, type: 'square', t: 0.34, d: 0.022, g: 0.055 }, { f: 3500, type: 'square', t: 0.4, d: 0.012, g: 0.04 },
  ],
  battle: [
    { f: 196, type: 'sawtooth', t: 0, d: 0.12, g: 0.1, slide: 110 }, { f: 1318, type: 'square', t: 0, d: 0.07, g: 0.09, slide: 880 }, { f: 2093, type: 'triangle', t: 0.01, d: 0.12, g: 0.07 },
    { f: 1175, type: 'square', t: 0.17, d: 0.07, g: 0.08, slide: 760 }, { f: 1760, type: 'triangle', t: 0.18, d: 0.1, g: 0.06 },
  ],
  bells: [
    { f: 1319, type: 'sine', t: 0, d: 0.3, g: 0.09 }, { f: 1760, type: 'sine', t: 0.13, d: 0.3, g: 0.08 }, { f: 1319, type: 'sine', t: 0.27, d: 0.3, g: 0.08 }, { f: 1976, type: 'sine', t: 0.4, d: 0.3, g: 0.07 },
  ],
  oars: [
    { f: 150, type: 'sine', t: 0, d: 0.16, g: 0.1, slide: 90 }, { f: 420, type: 'triangle', t: 0.02, d: 0.12, g: 0.03, slide: 250 },
    { f: 150, type: 'sine', t: 0.5, d: 0.16, g: 0.1, slide: 90 }, { f: 420, type: 'triangle', t: 0.52, d: 0.12, g: 0.03, slide: 250 },
  ],
};

const ATTACK = 0.01, TAIL = 0.02, SILENT = 0.0001;

function defaultCreate() {
  const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
  if (!Ctx) throw new Error('no_audio');
  return new Ctx();
}
function defaultVibrate() {
  try { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? (ms) => navigator.vibrate(ms) : null; } catch (e) { return null; }
}
function defaultSession() {
  try { return typeof navigator !== 'undefined' && navigator.audioSession ? navigator.audioSession : null; } catch (e) { return null; }
}

// Version 7.0 (Track S, ruling 935): volume() is the effects' own level, 0 to 1 (the Settings' Effects volume / 100; 1 is the loudness every
// effect had before 7.0); the Sound switch (enabled) stays the master. At 0 nothing plays.
export function createSfx({
  context = null, create = defaultCreate, enabled = () => false, volume = () => 1,
  vibrate = defaultVibrate(), canVibrate = () => false, audioSession = defaultSession(),
} = {}) {
  let ctx = context;
  if (audioSession) { try { audioSession.type = 'ambient'; } catch (e) { /* older Safari: no session type */ } }

  function note(n, t0, level) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const start = t0 + n.t, end = start + n.d;
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.f, start);
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, end);
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.linearRampToValueAtTime(Math.max(SILENT * 2, n.g * level), start + ATTACK);
    gain.gain.exponentialRampToValueAtTime(SILENT, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + TAIL);
  }

  return {
    names: Object.keys(SFX),
    get context() { return ctx; },
    // A user gesture: create or resume the context, but only once the player asked for sound. True only once
    // the context is running: resume() settles later, so a touch's first event may return false and the next true.
    unlock() {
      if (!enabled()) return false;
      if (!ctx) { try { ctx = create(); } catch (e) { ctx = null; return false; } }
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') { try { ctx.resume().catch(() => {}); } catch (e) { /* stays suspended */ } }
      return ctx.state === 'running';
    },
    play(name) {
      const notes = SFX[name];
      if (!notes || !enabled() || !ctx || ctx.state !== 'running') return false;   // a suspended context would queue the notes and burst them out on resume
      const level = Math.min(1, Number(volume()));
      if (!(level > 0)) return false;                       // Effects volume 0: silent
      const t0 = ctx.currentTime;
      try { for (const n of notes) note(n, t0, level); } catch (e) { return false; }
      return true;
    },
    buzz(ms) {
      if (!vibrate || !canVibrate()) return false;
      try { vibrate(ms); return true; } catch (e) { return false; }
    },
  };
}
