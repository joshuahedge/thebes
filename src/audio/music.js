// Music (spec 5.5, rulings 266-270): an original, quiet loop generated with Web Audio, in hijaz on D at 72 beats a
// minute: a drone, a plucked voice, a ney-like flute about once a minute and a soft frame drum, built bar by bar from
// motifs by a seeded draw of the city's seed and the bar number (never the sim's random numbers). A tenser raid mood
// fades in over four bars while a raid warning or a raid is on. On by default at volume 30, separate from the effects.
// Stage 4 contract: Track 0 fixed the names and the boot wiring; Track G implements createMusic and owns this file.
//
// boot.js makes one for the page (it outlives each game, so the title card plays too) and:
//   calls unlock() on every pointerdown, pointerup and keydown until it returns true (the browser's autoplay rule:
//   nothing sounds before the first gesture);
//   calls stop() when the page is hidden and start() when it shows again;
//   calls refresh() whenever the settings change (music on or off, the volume);
//   calls tick(now) once a frame from the title's and the game's loops (now: performance.now() ms), so the music can
//   schedule notes a little ahead on that light timer;
//   calls destroy() when the page goes.
// The music reads everything else through its options when it needs it: enabled() (settings music), volume() (0-1),
// seed() (the city's seed, or the title city's), mood() ('calm', 'tense' or 'raid', musicMood of the city on screen; Version 7.0 added tense) and,
// from Version 7.0 (Track S), season() (the season the city's date is in, which colours the bars: SEASON_MUSIC).
// It respects the iPhone silent switch as the effects do (navigator.audioSession.type = 'ambient', set by createSfx).
//
// How it is made (Track G). Everything is synthesised in the page: no files, no third-party code.
//   composeBar(seed, bar, tension) is pure: the bar's notes and drone levels. A phrase is four bars: a motif on the
//   phrase's anchor (D4 or A4), the same motif moved or a second one, a third, then a cadence that ends a phrase on A
//   (a question) or on D (the answer). Motifs, anchors, moves and velocities are drawn by musicDraw(seed, n, salt), a
//   stateless hash, so the same city plays the same bars and two minutes are never the same.
//   Voices: three drone oscillators (tonic D3 and fifth A3; the low D2 of the raid mood), a plucked string (a
//   Karplus-Strong buffer made once per pitch, ringing until the next pluck: one line, at most two sounding), a ney
//   (a soft flute wave with a scoop and vibrato, one note at a time, in a two-bar line every fifth phrase: about once a
//   minute, never in the raid mood), and a frame drum (a low dum and a light tek). The drones hold three of the eight
//   voices and the rest can never sound more than five at once (the voice check drops a note that would).
//   tension moves a quarter a bar towards 1 while the mood is raid and back to 0 after (ruling 267): the fifth gives way
//   to the low drone, the drum takes the quicker maqsum and plays firmer, the pluck thins out, the ney waits.
//   The scheduler is tick(): it schedules a whole bar once that bar's start is within MUSIC.lookahead seconds of the
//   audio clock. A short feedback delay gives space; there is no reverb, worklet or compressor.
//   scheduleOffline(ctx, ...) schedules bars on an OfflineAudioContext with the same code (the level test and
//   tools/music.html, which plays and renders a sample to listen to).

// Version 7.0 (Track S, rulings 936-937): the season moods and the tense variant. The numbers are in src/data/seasons.js (a leaf).
//   SEASON_MUSIC  a colour for each season (akhet, peret, shemu) laid over the bars the generator composes: how much of the pluck is kept, how
//                 often the flute comes, the drones, the drum's teks, the pluck's level and brightness and the echo's.
//   MOOD_TENSION  the tension each mood moves to: calm 0, tense 0.45, raid 1.
import { SEASON_MUSIC, MOOD_TENSION } from '../data/seasons.js';

// The music's mood for a world: 'raid' while a raid warning or a raid is on (ruling 267); Version 7.0 (ruling 937): 'tense' while another danger
// is live (a plague, a drought or a locust swarm warned or under way, or a building on fire); else 'calm'.
export function musicMood(world) {
  if (!world) return 'calm';
  if (world.raid && (world.raid.warning || world.raid.active)) return 'raid';
  const h = world.hazards;
  if (h && ['plague', 'drought', 'locusts'].some((k) => h[k] && (h[k].warning || h[k].active))) return 'tense';
  if (world.buildings && Object.values(world.buildings).some((b) => b && b.fire)) return 'tense';
  return 'calm';
}

// Every number of the music (ruling 266: a taste call, so all of it is here).
export const MUSIC = {
  bpm: 72, beatsPerBar: 4,
  base: 50,                                 // MIDI D3 is degree 0
  scale: [0, 1, 4, 5, 7, 8, 10],            // hijaz on D (Phrygian dominant): D E♭ F♯ G A B♭ C
  lookahead: 1.5,                           // s: a bar is scheduled once its start is this close (frames run at 30 fps or more)
  maxVoices: 8, droneVoices: 3,             // the three drones are always counted
  moodBars: 4,                              // the raid mood fades in and out over four bars
  neyEvery: 5,                              // a ney line every fifth phrase of four bars: one about every 67 s
  fadeIn: 2, fadeOut: 0.3,                  // s: the music's own fades (start, stop, on and off)
  pluckRing: 0.3,                           // s a pluck rings past its written length, unless the next pluck cuts it
  pluckSeconds: 1.4,                        // the longest a pluck rings
  volumeCurve: 0.8,                         // the master gain is volume ^ this (30 -> 0.38, -8.4 dB)
  level: { drone: 0.062, pluck: 0.5, ney: 0.1, dum: 0.36, tek: 0.24, wet: 0.24, feedback: 0.3, delay: 0.208 },   // delay: s, a sixteenth at 72 bpm
  tone: { drone: 700, pluck: 1800, delay: 2000, tek: 2800 },   // Hz: the low-pass on each (the tek's band-pass)
};

const BAR_BEATS = MUSIC.beatsPerBar;
export const beatSeconds = () => 60 / MUSIC.bpm;
export const barSeconds = () => BAR_BEATS * beatSeconds();

// A stateless draw in [0, 1) from the city's seed, a number (a bar, a phrase) and a salt: the music's own hash, so the
// sim's random numbers are never touched (spec 5.5).
export function musicDraw(seed, n, salt) {
  let h = (Math.imul(seed | 0, 0x9E3779B1) ^ Math.imul((n | 0) + 0x632BE5AB, 0x85EBCA77) ^ Math.imul(salt | 0, 0xC2B2AE3D)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7FEB352D) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846CA68B) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const pick = (list, r) => list[Math.min(list.length - 1, Math.floor(r * list.length))];

// A degree of the mode (0 = D3, 7 = D4, 14 = D5; negative below D3) as a MIDI note, and a MIDI note as Hz.
export const midiOfDegree = (d) => MUSIC.base + 12 * Math.floor(d / 7) + MUSIC.scale[((d % 7) + 7) % 7];
export const freqOf = (midi) => 440 * 2 ** ((midi - 69) / 12);

// The pluck's motifs: [eighth in the bar, degree from the anchor, length in eighths]. Hijaz lives in the step from
// E♭ to F♯ (degrees 1 to 2): most motifs turn on it.
const MOTIFS = [
  [[0, 0, 2], [2, 1, 1], [3, 2, 1], [4, 1, 2], [6, 0, 2]],
  [[0, 4, 1], [1, 3, 1], [2, 2, 2], [4, 1, 1], [5, 0, 3]],
  [[0, 0, 3], [3, 4, 1], [4, 3, 2], [6, 2, 2]],
  [[0, 2, 1], [1, 1, 1], [2, 2, 1], [3, 3, 1], [4, 2, 2], [6, 1, 2]],
  [[0, 0, 1], [1, 4, 3], [4, 3, 1], [5, 2, 1], [6, 1, 2]],
  [[0, 0, 1], [1, 0, 1], [2, 1, 2], [4, 0, 1], [5, -1, 1], [6, 0, 2]],
  [[2, 2, 2], [4, 1, 2], [6, 0, 2]],
  [[0, -1, 2], [2, 0, 1], [3, 1, 1], [4, 2, 4]],
];
const SPARSE = [[[0, 0, 4], [4, -1, 2], [6, 0, 2]], [[0, 0, 6], [6, 1, 2]], [[2, 0, 4], [6, -1, 2]]];
// Cadences end on degree 0 (the phrase's goal note).
const CADENCES = [[[0, 2, 1], [1, 1, 1], [2, 0, 6]], [[0, 1, 2], [2, 0, 6]], [[0, 3, 1], [1, 2, 1], [2, 1, 2], [4, 0, 4]]];
const MOVES = [-1, 1, 2, 0];
// The ney's two-bar lines, in absolute degrees (7 = D4 ... 14 = D5), [eighth, degree, length in eighths] per bar.
const NEY_LINES = [
  [[[0, 11, 3], [3, 12, 1], [4, 11, 4]], [[0, 10, 2], [2, 9, 2], [4, 8, 2], [6, 9, 2]]],
  [[[0, 14, 4], [4, 13, 2], [6, 12, 2]], [[0, 11, 2], [2, 10, 2], [4, 11, 4]]],
  [[[0, 9, 2], [2, 11, 2], [4, 12, 4]], [[0, 11, 2], [2, 9, 2], [4, 8, 4]]],
];
// The drum: [voice, eighth, velocity]. Calm is a light baladi, with a pickup at a phrase's end; raid is a quicker,
// firmer maqsum with sixteenth teks.
const DRUMS = {
  calm: [['dum', 0, 0.9], ['tek', 3, 0.55], ['dum', 4, 0.7], ['tek', 6, 0.5]],
  turn: [['dum', 0, 0.9], ['dum', 1, 0.55], ['tek', 3, 0.55], ['dum', 4, 0.7], ['tek', 6, 0.5], ['tek', 7, 0.4]],
  raid: [['dum', 0, 1], ['tek', 1, 0.6], ['tek', 1.5, 0.35], ['tek', 3, 0.7], ['dum', 4, 0.95], ['tek', 5, 0.45], ['tek', 6, 0.7], ['tek', 6.5, 0.4], ['tek', 7, 0.55], ['tek', 7.5, 0.35]],
};

// Whether phrase p (four bars) has a ney line in its second and third bars: every MUSIC.neyEvery phrases, from a phrase
// the seed picks (never the first, so the music starts with the pluck).
// Version 7.0: `every` is the season's own (SEASON_MUSIC.neyEvery), MUSIC.neyEvery without one.
export function neyPhrase(seed, p, every = MUSIC.neyEvery) {
  const offset = Math.floor(musicDraw(seed, 0, 7) * every);
  return p > 0 && (p + offset) % every === 0;
}

// Keeps a motif's notes inside the pluck's range (A3 to E♭5) by moving the whole motif an octave.
function inRange(notes) {
  const lo = Math.min(...notes.map((n) => n[1])), hi = Math.max(...notes.map((n) => n[1]));
  const shift = lo < 4 ? 7 : hi > 15 ? -7 : 0;
  return shift ? notes.map(([at, d, len]) => [at, d + shift, len]) : notes;
}

// One bar: { notes: [{ voice, at, len, midi, vel }] (at and len in beats from the bar's start; drums have no midi),
// drone: { tonic, fifth, low } (0-1, times MUSIC.level.drone), tension }. Pure: the same seed, bar and tension always
// give the same bar. Version 7.0 (ruling 936): `season` ('akhet', 'peret', 'shemu' or null: none, the bar as it always was) colours the bar
// by SEASON_MUSIC, and the bar then carries `look: { tone, wet }`, the pluck's filter and the echo's send the scheduler moves to.
export function composeBar(seed, bar, tension = 0, season = null) {
  const t = Math.max(0, Math.min(1, tension));
  const S = season ? SEASON_MUSIC[season] || null : null;
  const p = Math.floor(bar / 4), pos = bar % 4;
  const notes = [];
  const anchor = pick([7, 11], musicDraw(seed, p, 1));
  const goal = p % 2 === 0 ? 11 : 7;                                        // a question on A, the answer on D
  const ney = t === 0 && neyPhrase(seed, p, S ? S.neyEvery : MUSIC.neyEvery) && (pos === 1 || pos === 2);
  // The pluck.
  let motif;
  if (ney) motif = pick(SPARSE, musicDraw(seed, bar, 6)).map(([at, d, len]) => [at, d + 7, len]);
  else if (pos === 3) motif = pick(CADENCES, musicDraw(seed, p, 5)).map(([at, d, len]) => [at, d + goal, len]);
  else {
    const first = pick(MOTIFS, musicDraw(seed, p, 2));
    let m = first, move = 0;
    if (pos === 1) {
      if (musicDraw(seed, p, 3) < 0.15) m = pick(SPARSE, musicDraw(seed, p, 10));
      else if (musicDraw(seed, p, 3) < 0.6) move = pick(MOVES, musicDraw(seed, p, 4));
      else m = pick(MOTIFS, musicDraw(seed, p, 12));
    } else if (pos === 2) {
      m = pick(MOTIFS, musicDraw(seed, p, 13));
      move = pick([0, 2, -2], musicDraw(seed, p, 14));
    }
    motif = inRange(m.map(([at, d, len]) => [at, d + anchor + move, len]));
  }
  motif.forEach(([at, d, len], i) => {
    if (i > 0 && musicDraw(seed, bar * 16 + i, 9) < 0.45 * t) return;    // the raid mood thins the pluck
    if (i > 0 && S && S.keep < 1 && musicDraw(seed, bar * 16 + i, 19) >= S.keep) return;   // and the flood's season a little
    const vel = (i === 0 ? 0.95 : 0.6 + 0.3 * musicDraw(seed, bar * 16 + i, 8)) * (1 + 0.15 * t) * (S ? S.pluck : 1);
    notes.push({ voice: 'pluck', at: at / 2, len: len / 2, midi: midiOfDegree(d), vel: Math.min(1, vel) });
  });
  // The ney.
  if (ney) {
    const line = pick(NEY_LINES, musicDraw(seed, p, 15))[pos - 1];
    for (const [at, d, len] of line) notes.push({ voice: 'ney', at: at / 2, len: len / 2, midi: midiOfDegree(d), vel: 0.8 + 0.2 * musicDraw(seed, bar * 16 + at, 16) });
  }
  // The drum.
  let pattern = t >= 0.5 ? DRUMS.raid : pos === 3 ? DRUMS.turn : DRUMS.calm;
  if (S && t < 0.5) {
    // A season's drum: the flood's teks come and go (a share of them), the harvest's pattern gains a light tek on the off beats.
    if (S.drum < 1) pattern = pattern.filter(([voice, at]) => voice !== 'tek' || musicDraw(seed, bar * 16 + at * 2, 21) < S.drum);
    else if (S.drum > 1) pattern = [...pattern, ['tek', 1, 0.3 * S.drum], ['tek', 5, 0.3 * S.drum]];
  }
  for (const [voice, at, vel] of pattern) notes.push({ voice, at: at / 2, len: voice === 'dum' ? 0.5 : 0.25, vel: Math.min(1, vel * (1 + 0.35 * t) * (0.9 + 0.1 * musicDraw(seed, bar * 16 + at * 2, 17))) });
  const swell = 0.6 + 0.4 * musicDraw(seed, bar, 11);
  const bed = { tonic: swell * (1 + 0.2 * t), fifth: (0.6 + 0.4 * musicDraw(seed, bar, 18)) * (1 - t), low: swell * t };
  if (S) { bed.tonic *= S.drone[0]; bed.fifth *= S.drone[1]; }
  return S ? { notes, drone: bed, tension: t, look: { tone: S.tone, wet: S.wet } } : { notes, drone: bed, tension: t };
}

// The next bar's tension: a quarter of the way per bar towards the mood's (ruling 267: four bars to fade in or out; Version 7.0: calm 0, tense
// 0.45, raid 1: MOOD_TENSION).
export const nextTension = (tension, mood) => {
  const step = 1 / MUSIC.moodBars, target = MOOD_TENSION[mood] || 0;
  return tension < target ? Math.min(target, tension + step) : Math.max(target, tension - step);
};

// The master gain for a volume of 0-1 (the settings' 0-100 / 100).
export const masterGain = (volume) => (volume > 0 ? Math.min(1, volume) ** MUSIC.volumeCurve : 0);

// ── The audio graph ──

// A soft reed for the drone and a breathy flute for the ney, as harmonic amplitudes (index 1 = the fundamental).
const DRONE_PARTIALS = [0, 1, 0.5, 0.32, 0.2, 0.12, 0.07, 0.04];
const NEY_PARTIALS = [0, 1, 0.12, 0.05, 0.02];

function waveOf(ctx, partials) {
  const real = new Float32Array(partials.length), imag = new Float32Array(partials);
  return ctx.createPeriodicWave(real, imag);
}
function lowpass(ctx, hz, type = 'lowpass') {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  return f;
}
// A small fixed noise buffer for the tek, from a seeded generator (the same every time).
function noiseBuffer(ctx, seconds = 0.12) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  return buf;
}

// A plucked string at a MIDI note (Karplus-Strong): a softened noise burst one period long (its mean taken out), fed back through a
// two-tap average, decaying to about -34 dB in 1.2 s, faded out at the end and scaled to a peak of 1.
export function pluckSamples(sampleRate, midi, seconds = MUSIC.pluckSeconds) {
  const f = freqOf(midi), period = Math.max(2, Math.round(sampleRate / f));
  const len = Math.max(period + 2, Math.floor(sampleRate * seconds));
  const d = new Float32Array(len);
  const rho = Math.pow(0.02, 1 / (f * 1.2));
  let s = (midi * 7919 + 1) >>> 0, prev = 0;
  for (let i = 0; i < period; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    prev = 0.7 * prev + 0.3 * ((s / 4294967296) * 2 - 1);
    d[i] = prev;
  }
  let mean = 0;
  for (let i = 0; i < period; i++) mean += d[i] / period;
  for (let i = 0; i < period; i++) d[i] -= mean;                           // no offset to ring on
  for (let i = period; i < len; i++) d[i] = rho * 0.5 * (d[i - period] + (i - period - 1 >= 0 ? d[i - period - 1] : 0));
  const fade = Math.min(len, Math.floor(sampleRate * 0.03));
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
  return d;
}

// The graph: master (the volume) to the speakers; a feedback delay for space (the pluck and the ney send to it); the
// three drones, started once and moved bar by bar; per-note voices made as they are scheduled.
function buildGraph(ctx) {
  const L = MUSIC.level, T = MUSIC.tone;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const send = ctx.createGain();
  send.gain.value = L.wet;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = L.delay;
  const echo = lowpass(ctx, T.delay);
  const feedback = ctx.createGain();
  feedback.gain.value = L.feedback;
  send.connect(delay); delay.connect(echo); echo.connect(feedback); feedback.connect(delay); echo.connect(master);
  const pluckBus = lowpass(ctx, T.pluck);
  pluckBus.connect(master); pluckBus.connect(send);
  const neyBus = ctx.createGain();
  neyBus.connect(master); neyBus.connect(send);
  const drumBus = ctx.createGain();
  drumBus.connect(master);
  const tekBus = lowpass(ctx, T.tek, 'bandpass');
  tekBus.Q.value = 1.1;
  tekBus.connect(drumBus);
  const droneBus = lowpass(ctx, T.drone);
  droneBus.connect(master);
  const droneWave = waveOf(ctx, DRONE_PARTIALS);
  const drones = {};
  for (const [name, midi] of [['tonic', MUSIC.base], ['fifth', MUSIC.base + 7], ['low', MUSIC.base - 12]]) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.setPeriodicWave(droneWave);
    osc.frequency.value = freqOf(midi);
    gain.gain.value = 0;
    osc.connect(gain); gain.connect(droneBus);
    osc.start(ctx.currentTime);
    drones[name] = { osc, gain };
  }
  return {
    ctx, master, send, pluckBus, neyBus, drumBus, tekBus, drones,
    neyWave: waveOf(ctx, NEY_PARTIALS), noise: noiseBuffer(ctx), plucks: new Map(),
    voices: [],            // [start, stop] of every note still to end, for the voice check
    lastPluck: null,       // the last pluck scheduled: { gain, src, stop } (the next pluck cuts it)
    tension: 0, bar: 0, nextAt: 0,
  };
}

function pluckBuffer(g, midi) {
  let buf = g.plucks.get(midi);
  if (!buf) {
    const d = pluckSamples(g.ctx.sampleRate, midi);
    buf = g.ctx.createBuffer(1, d.length, g.ctx.sampleRate);
    buf.getChannelData(0).set(d);
    g.plucks.set(midi, buf);
  }
  return buf;
}

// The voice check: true (and the note is counted) when [start, stop) keeps the notes sounding at once, with the three
// drones, at or under MUSIC.maxVoices.
function takeVoice(g, start, stop) {
  g.voices = g.voices.filter((v) => v[1] > g.ctx.currentTime - 0.01);
  const limit = MUSIC.maxVoices - MUSIC.droneVoices;
  const points = [start, ...g.voices.map((v) => v[0]).filter((s) => s > start && s < stop)];
  for (const p of points) if (g.voices.filter((v) => v[0] <= p && v[1] > p).length >= limit) return false;
  g.voices.push([start, stop]);
  return true;
}

const SILENT = 0.0001;
// A note's gain starts at 0, not the default 1: a source may sound a frame before its gain's first event (a click).
const silentGain = (ctx) => { const gain = ctx.createGain(); gain.gain.value = 0; return gain; };
// A note's nodes leave the graph once its source ends.
const end = (src, ...nodes) => { src.onended = () => { for (const n of [src, ...nodes]) { try { n.disconnect(); } catch (e) { /* already gone */ } } }; };

function playPluck(g, n, t, len) {
  const ctx = g.ctx;
  const stop = t + Math.min(MUSIC.pluckSeconds, len + MUSIC.pluckRing) + 0.08;
  // The next pluck cuts the last one short (one line on one string), freeing its voice.
  const last = g.lastPluck;
  if (last && last.stop > t) {
    last.gain.gain.setTargetAtTime(0, t, 0.015);
    try { last.src.stop(t + 0.08); } catch (e) { /* already stopped */ }
    const v = g.voices.find((x) => x[0] === last.start && x[1] === last.stop);
    if (v) v[1] = t + 0.08;
  }
  if (!takeVoice(g, t, stop)) return false;
  const src = ctx.createBufferSource(), gain = silentGain(ctx);
  src.buffer = pluckBuffer(g, n.midi);
  gain.gain.setValueAtTime(MUSIC.level.pluck * n.vel, t);
  gain.gain.setTargetAtTime(0, stop - 0.08, 0.015);
  src.connect(gain); gain.connect(g.pluckBus);
  end(src, gain);
  src.start(t);
  src.stop(stop);
  g.lastPluck = { gain, src, start: t, stop };
  return true;
}

function playNey(g, n, t, len) {
  const ctx = g.ctx, stop = t + len;
  if (!takeVoice(g, t, stop)) return false;
  const osc = ctx.createOscillator(), gain = silentGain(ctx);
  osc.setPeriodicWave(g.neyWave);
  // A scoop up from a little flat, then a gentle vibrato that grows in (one curve, no extra oscillator).
  const f = freqOf(n.midi), steps = Math.max(8, Math.ceil(len * 60)), curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const s = (i / (steps - 1)) * len;
    const scoop = s < 0.08 ? 2 ** ((-0.3 * (1 - s / 0.08)) / 12) : 1;
    curve[i] = f * scoop * (1 + 0.006 * Math.min(1, s / 0.35) * Math.sin(2 * Math.PI * 5 * s));
  }
  osc.frequency.setValueCurveAtTime(curve, t, len);
  const peak = MUSIC.level.ney * n.vel, release = Math.min(0.12, len / 3);
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.linearRampToValueAtTime(peak, t + Math.min(0.15, len / 3));
  gain.gain.setValueAtTime(peak, stop - release);
  gain.gain.linearRampToValueAtTime(0, stop);
  osc.connect(gain); gain.connect(g.neyBus);
  end(osc, gain);
  osc.start(t);
  osc.stop(stop);
  return true;
}

function playDum(g, n, t) {
  const ctx = g.ctx, stop = t + 0.4;
  if (!takeVoice(g, t, stop)) return false;
  const osc = ctx.createOscillator(), gain = silentGain(ctx);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(62, t + 0.12);
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.linearRampToValueAtTime(MUSIC.level.dum * n.vel, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(SILENT, t + 0.38);
  osc.connect(gain); gain.connect(g.drumBus);
  end(osc, gain);
  osc.start(t);
  osc.stop(stop);
  return true;
}

function playTek(g, n, t) {
  const ctx = g.ctx, stop = t + 0.09;
  if (!takeVoice(g, t, stop)) return false;
  const src = ctx.createBufferSource(), gain = silentGain(ctx);
  src.buffer = g.noise;
  gain.gain.setValueAtTime(MUSIC.level.tek * n.vel, t);
  gain.gain.exponentialRampToValueAtTime(SILENT, t + 0.07);
  src.connect(gain); gain.connect(g.tekBus);
  end(src, gain);
  src.start(t);
  src.stop(stop);
  return true;
}

const PLAYERS = { dum: playDum, ney: playNey, pluck: playPluck, tek: playTek };
const ORDER = ['dum', 'ney', 'pluck', 'tek'];   // who keeps a voice when one must go

// Schedules bar `bar` to start at t0 (the audio clock's seconds) at `tension`; returns the composed bar.
function scheduleBar(g, bar, t0, seed, tension, season = null) {
  const composed = composeBar(seed, bar, tension, season), beat = beatSeconds(), barLen = barSeconds();
  const L = MUSIC.level;
  for (const [name, level] of Object.entries(composed.drone)) g.drones[name].gain.gain.setTargetAtTime(level * L.drone, t0, barLen / 3);
  // Version 7.0: the season's pluck brightness and echo, moved to over the bar (the first bar of a season: a gentle turn, never a step).
  if (composed.look) {
    const to = (param, v) => { if (param && typeof param.setTargetAtTime === 'function') param.setTargetAtTime(v, t0, barLen / 2); };
    to(g.pluckBus.frequency, composed.look.tone);
    to(g.send.gain, L.wet * composed.look.wet);
  }
  const notes = composed.notes.slice().sort((a, b) => (ORDER.indexOf(a.voice) - ORDER.indexOf(b.voice)) || (a.at - b.at));
  const plucks = composed.notes.filter((n) => n.voice === 'pluck').sort((a, b) => a.at - b.at);
  // Plucks are scheduled in time order (each cuts the one before), after the drum and the ney have their voices.
  for (const n of notes) if (n.voice !== 'pluck') PLAYERS[n.voice](g, n, t0 + n.at * beat, n.len * beat);
  for (const n of plucks) playPluck(g, n, t0 + n.at * beat, n.len * beat);
  return composed;
}

// Schedules `bars` bars from the context's start on an OfflineAudioContext, at master gain masterGain(volume), with the
// mood of each bar from mood(bar) (a raid from bar 0 starts at full tension); returns the graph. Each bar after the first
// is scheduled when the render reaches the look-ahead before it (ctx.suspend), as tick() does live, so only a bar or two
// of notes exist at a time (a render with every note made up front is many times slower). The level test and
// tools/music.html render with it.
export function scheduleOffline(ctx, { seed = 1, bars = 9, volume = 0.3, mood = () => 'calm', season = () => null } = {}) {
  const g = buildGraph(ctx);
  g.master.gain.setValueAtTime(masterGain(volume), 0);
  let tension = 0;
  const one = (bar) => {
    tension = bar === 0 && mood(0) === 'raid' ? 1 : nextTension(tension, mood(bar));
    scheduleBar(g, bar, bar * barSeconds() + 0.05, seed, tension, season(bar));
  };
  one(0);
  for (let bar = 1; bar < bars; bar++) ctx.suspend(bar * barSeconds() + 0.05 - MUSIC.lookahead).then(() => { one(bar); ctx.resume(); });
  return g;
}

function defaultCreate() {
  const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
  if (!Ctx) throw new Error('no_audio');
  return new Ctx();
}

// The music's controls (spec 5.5). context: an audio context to use (tests); create: how to make one on the first
// gesture; timer(fn, ms): how a fade-out's suspend waits (tests).
export function createMusic({
  context = null, create = defaultCreate, enabled = () => false, volume = () => 0.3, seed = () => 1, mood = () => 'calm',
  season = () => null,                                   // Version 7.0: the season on screen ('akhet', 'peret', 'shemu') or null (src/audio/music.js composeBar)
  timer = (fn, ms) => setTimeout(fn, ms), cancelTimer = (id) => clearTimeout(id),
} = {}) {
  let ctx = context, g = null, hidden = false, destroyed = false, quieting = null;

  const running = () => Boolean(ctx && ctx.state === 'running');
  const on = () => !destroyed && !hidden && Boolean(enabled());
  function graph() {
    if (!g && ctx) { try { g = buildGraph(ctx); g.nextAt = ctx.currentTime + 0.1; } catch (e) { g = null; } }
    return g;
  }
  function resume() {
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* stays suspended */ } }
  }
  // Fades the master to the volume (or in from silence), cancelling a pending suspend.
  function fadeTo(level, seconds) {
    if (!g) return;
    const t = ctx.currentTime;
    g.master.gain.cancelScheduledValues(t);
    g.master.gain.setValueAtTime(g.master.gain.value, t);
    g.master.gain.setTargetAtTime(level, t, seconds / 3);
  }
  function wake() {
    if (quieting !== null) { cancelTimer(quieting); quieting = null; }
    if (!graph()) return;
    resume();
    if (g.nextAt < ctx.currentTime) g.nextAt = ctx.currentTime + 0.1;   // never catch up on bars missed
    fadeTo(masterGain(volume()), MUSIC.fadeIn);
  }
  // Fades out, then suspends the context, so nothing plays (or costs anything) while off or hidden.
  function quiet(seconds) {
    if (!g || quieting !== null) return;
    fadeTo(0, seconds);
    quieting = timer(() => {
      quieting = null;
      if (!on() && ctx && ctx.state === 'running' && typeof ctx.suspend === 'function') { try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* keeps running, silent */ } }
    }, seconds * 1000 + 50);
  }

  const api = {
    get context() { return ctx; },
    // A user gesture: make or resume the context, but only while the music is on; true once it is running.
    unlock() {
      if (!on()) return false;
      if (!ctx) { try { ctx = create(); } catch (e) { ctx = null; return false; } }
      wake();
      return running();
    },
    start() { hidden = false; if (on() && ctx) wake(); },
    stop() { hidden = true; quiet(0.05); },
    // The settings changed: on or off, the volume.
    refresh() {
      if (destroyed) return;
      if (!on()) { quiet(MUSIC.fadeOut); return; }
      if (!ctx) { try { ctx = create(); } catch (e) { ctx = null; return; } }   // turned on from the Settings sheet: a tap
      wake();
    },
    // The light timer: schedules each bar once its start is within the look-ahead.
    tick() {
      if (!on() || !running() || !g) return;
      const now = ctx.currentTime;
      if (g.nextAt < now) g.nextAt = now + 0.05;
      while (g.nextAt < now + MUSIC.lookahead) {
        g.tension = nextTension(g.tension, mood());
        scheduleBar(g, g.bar, g.nextAt, seed(), g.tension, season());
        g.bar += 1;
        g.nextAt += barSeconds();
      }
    },
    destroy() {
      destroyed = true;
      if (quieting !== null) { cancelTimer(quieting); quieting = null; }
      if (ctx && !context && typeof ctx.close === 'function') { try { const p = ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* gone */ } }
      g = null;
    },
    playing: () => on() && running() && Boolean(g),
    // For tests: the bar about to be scheduled and the tension it will move from.
    state: () => (g ? { bar: g.bar, tension: g.tension, nextAt: g.nextAt } : null),
  };
  return api;
}
