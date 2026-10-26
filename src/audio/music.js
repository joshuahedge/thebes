// Music (spec 5.5, rulings 266-270; Version 8.2 "Song of the Nile", rulings 1280-1299): original music generated with Web Audio.
// Since 8.2 it is no longer one endless loop but short pieces with silence between them, "in the C418 way": seven pieces of a
// minute and a half to two and a half (src/data/pieces.js: a harp at dawn, a low flute over a pad, a plucked lullaby, a river
// piece, a sowing piece, a harvest song, a night piece), soft and low, each played a little differently every time; one to
// four minutes of quiet between them (the city's own sounds carry the gaps); a softened danger tune while a raid or another
// danger is live. On by default at volume 30, separate from the effects.
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
// How it is made (Version 8.2). Everything is synthesised in the page: no files, no third-party code.
//   The programme (conduct, run by tick() live and by scheduleOffline on an OfflineAudioContext): a short first wait
//   (MUSIC.firstWait) once the music is unlocked, then a piece, a gap of silence (MUSIC.gap, drawn per gap), the next piece.
//   choosePiece(seed, n, last, season) never picks the piece just played and leans on the pieces written for the season;
//   composePiece(id, seed, play) is pure: the piece's notes in seconds, varied by musicDraw of the seed and the play count
//   (how often each section comes, the accompaniment's pattern and register, the pad's voicing, grace notes, resting
//   bars, a second ending, the tempo within 3%, where its few high-pluck accents fall).
//   Voices: a harp (a soft, dark Karplus-Strong string with a little body), a piano-like low pluck (the same string,
//   rounder and lower), a low flute (the old ney's wave, lower, with a breath of filtered noise), a warm pad (slow attack,
//   low-passed), the old high pluck kept for the rare accent, and a soft frame-drum dum. Never more than MUSIC.maxVoices
//   sound at once (the voice check drops a note that would; a flute note counts two, its tone and its breath).
//   Danger (musicMood 'tense' or 'raid'): the piece fades out (MUSIC.pieceOut) and the danger tune fades in
//   (MUSIC.dangerIn): composeDanger is 8.1's raid bars from composeBar, softened: an octave lower, at 60 beats a minute,
//   the drones swelling over a bar, soft dums only (no teks). When the danger ends it fades out (MUSIC.dangerOut), then a
//   gap, then the next calm piece.
// How 8.1's loop was made (Track G); composeBar is unchanged and now feeds only the danger tune.
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
//   scheduleOffline(ctx, ...) runs the programme on an OfflineAudioContext with the same code (the level tests and
//   tools/music.html, which plays and renders any piece to listen to).

// Version 7.0 (Track S, rulings 936-937): the season moods and the tense variant. The numbers are in src/data/seasons.js (a leaf).
//   SEASON_MUSIC  a colour for each season (akhet, peret, shemu) laid over the bars the generator composes: how much of the pluck is kept, how
//                 often the flute comes, the drones, the drum's teks, the pluck's level and brightness and the echo's.
//   MOOD_TENSION  the tension each mood moves to: calm 0, tense 0.45, raid 1.
import { SEASON_MUSIC, MOOD_TENSION } from '../data/seasons.js';
import { PIECES, MODES, ARPS, CHORD_TONES } from '../data/pieces.js';

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
  bpm: 60, beatsPerBar: 4,                  // Version 8.2: the danger tune's tempo (8.1's loop ran at 72); each piece has its own
  base: 50,                                 // MIDI D3 is degree 0
  scale: [0, 1, 4, 5, 7, 8, 10],            // hijaz on D (Phrygian dominant): D E♭ F♯ G A B♭ C
  lookahead: 1.5,                           // s: a note (a danger bar) is scheduled once its start is this close (frames run at 30 fps or more)
  maxVoices: 8, droneVoices: 3,             // at most eight at once; the danger tune's three drones are among them
  moodBars: 4,                              // composeBar's tension moves a quarter a bar
  neyEvery: 5,                              // composeBar: a ney line every fifth phrase (its calm bars are no longer played)
  fadeIn: 2, fadeOut: 0.3,                  // s: the music's own fades (start, stop, on and off)
  pluckRing: 0.3,                           // s 8.1's pluck rang past its written length
  pluckSeconds: 1.4,                        // the longest the high pluck (the accent) rings
  volumeCurve: 0.8,                         // the master gain is volume ^ this (30 -> 0.38, -8.4 dB)
  // Version 8.2 (rulings 1280-1286): the pieces and the quiet between them.
  firstWait: [5, 20],                       // s before the first piece once the music is unlocked
  gap: [60, 240],                           // s of silence between pieces, drawn per gap
  seasonLean: 3,                            // a piece written for the city's season is this many times as likely
  tempoMove: 0.03,                          // a playing's tempo moves up to 3% either way
  tail: 4,                                  // s after a piece's last bar for its last notes to ring out
  accentMax: 4,                             // the most high-pluck notes in any playing
  dangerIn: 4, pieceOut: 3, dangerOut: 5,   // s: the danger tune fades in while the piece fades out; and out again
  padAttack: 1.6, padRelease: 1.5,          // s: the pad swells in and dies away slowly
  ring: { harp: 0.5, low: 0.4, accent: 0.3 },   // s a string rings past its written length
  ranges: { harp: [38, 69], low: [43, 67], flute: [55, 69], pad: [38, 62], accent: [67, 81] },   // MIDI: D2-A4, G2-G4, G3-A4, D2-D4, G4-A5
  level: { harp: 0.26, low: 0.24, flute: 0.075, breath: 0.4, pad: 0.03, accent: 0.2, dum: 0.18, drone: 0.04, wet: 0.24, feedback: 0.32, delay: 0.36 },
  tone: { harp: 2200, low: 1500, flute: 1800, pad: 700, pluck: 1800, drone: 600, dum: 420, delay: 1600, breath: 1400 },   // Hz: the low-pass on each
  offlineStep: 1,                           // s: how often scheduleOffline runs the programme (as tick() does each frame)
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

// ── Version 8.2: the pieces (rulings 1280-1290) ──

// The music's own salts (musicDraw is the music's hash, apart from the sim's): the programme's three, and twenty for each piece.
const SALT = { choose: 1281, gap: 1282, first: 1283, piece: 1300 };
const PIECE_INDEX = Object.fromEntries(PIECES.map((p, i) => [p.id, i]));
export const pieceById = (id) => (id in PIECE_INDEX ? PIECES[PIECE_INDEX[id]] : null);

// The n-th piece of a city: never `last` (the piece just played), and a piece written for the season `season` is MUSIC.seasonLean times as
// likely as another (none on the title card, where the season is null).
export function choosePiece(seed, n, last = null, season = null) {
  const list = PIECES.filter((p) => p.id !== last);
  const weights = list.map((p) => (season && p.seasons.includes(season) ? MUSIC.seasonLean : 1));
  let r = musicDraw(seed, n, SALT.choose) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r < 0) return list[i].id; }
  return list[list.length - 1].id;
}
// The n-th gap of silence (s), and the wait before the first piece.
export const gapSeconds = (seed, n) => MUSIC.gap[0] + (MUSIC.gap[1] - MUSIC.gap[0]) * musicDraw(seed, n, SALT.gap);
export const firstWaitSeconds = (seed) => MUSIC.firstWait[0] + (MUSIC.firstWait[1] - MUSIC.firstWait[0]) * musicDraw(seed, 0, SALT.first);

// The pad's voicings, in degrees above the chord's root: open fifth, the triad, the triad with its third an octave up.
const VOICINGS = [[0, 4], [0, 2, 4], [0, 4, 9]];
// Who sounds first when two notes start together and only one voice is free.
const PARTS = ['tune', 'accent', 'pad', 'arp', 'drum'];

// One playing of a piece: { id, name, bpm, bars, seconds, notes: [{ voice, part, at, len, midi, vel }] } (at and len in seconds from the
// piece's start; a dum has no midi). Pure: the same piece, seed and play count always give the same notes, and another play count
// another playing of the same piece (src/data/pieces.js says what may vary).
export function composePiece(id, seed, play) {
  const P = pieceById(id);
  if (!P) return null;
  const key = SALT.piece + 20 * PIECE_INDEX[id];
  const draw = (n, s) => musicDraw(seed, (play | 0) * 4096 + n, key + s);
  const scale = MODES[P.mode], R = MUSIC.ranges;
  const midiOf = (d) => P.tonic + 12 * Math.floor(d / 7) + scale[((d % 7) + 7) % 7];
  const fold = (m, [lo, hi]) => { while (m > hi) m -= 12; while (m < lo) m += 12; return m; };
  const fits = (voice, list) => list.every((m) => m >= R[voice][0] && m <= R[voice][1]);
  const bpm = P.bpm * (1 + MUSIC.tempoMove * (2 * draw(0, 0) - 1));
  const eighth = 30 / bpm, barLen = P.beats * 2 * eighth;
  // The form: how many times each section comes this playing.
  const plan = [];
  P.form.forEach(([name, lo, hi], i) => {
    const times = lo + Math.min(hi - lo, Math.floor(draw(i, 1) * (hi - lo + 1)));
    for (let k = 0; k < times; k++) plan.push({ name, k, last: k === times - 1 });
  });
  const notes = [], roots = [];
  let bar = 0, held = null;                                               // held: the pad's chord while it lasts
  const closePad = (t) => {
    if (!held) return;
    for (const off of held.voicing) notes.push({ voice: 'pad', part: 'pad', at: held.at, len: t - held.at, midi: fold(midiOf(P.padAt + held.root + off), R.pad), vel: held.vel });
    held = null;
  };
  plan.forEach(({ name, k, last }, j) => {
    const S = P.sections[name], arpVoice = P.voices.arp, tuneVoice = S.voice || P.voices.tune;
    const arp = ARPS[pick(S.arp, draw(j, 2))];
    // A repeat may move the accompaniment an octave, when it stays in the voice's range.
    let move = k > 0 ? pick([0, 0, -7, 7], draw(j, 3)) : 0;
    if (move && !fits(arpVoice, S.chords.flatMap((root) => arp.map(([, tone]) => midiOf(P.arpAt + root + CHORD_TONES[tone] + move))))) move = 0;
    const voicing = pick(VOICINGS, draw(j, 4));
    const altEnd = Boolean(S.alt) && k > 0 && last && draw(j, 5) < 0.5;
    S.chords.forEach((root, b) => {
      const t0 = bar * barLen, m = bar * 64, lastBar = b === S.chords.length - 1;
      roots.push(root);
      // The pad holds its chord until the chord or the section changes.
      if (b === 0 || !S.pad || (held && held.root !== root)) closePad(t0);
      if (S.pad && !held) held = { root, voicing, at: t0, vel: 0.8 + 0.2 * draw(m, 6) };
      // The accompaniment (a coda's last bar may roll its chord instead).
      const pattern = lastBar && S.end ? ARPS[S.end] : arp, shift = pattern === arp ? move : 0;
      pattern.forEach(([e, tone, len], i) => notes.push({
        voice: arpVoice, part: 'arp', at: t0 + e * eighth, len: len * eighth,
        midi: midiOf(P.arpAt + root + CHORD_TONES[tone] + shift), vel: (i === 0 ? 0.6 : 0.45) * (0.85 + 0.15 * draw(m + i, 7)),
      }));
      // The tune: on a repeat a bar may rest (never the section's last) and the last bar may take the other ending.
      let line = S.tune ? S.tune[b] : null;
      if (line && altEnd && lastBar) line = S.alt;
      if (line && k > 0 && !lastBar && draw(m, 8) < 0.15) line = null;
      (line || []).forEach(([e, d, len], i) => {
        const at = t0 + e * eighth, vel = 0.8 + 0.2 * draw(m + i, 9);
        if (len >= 3 && draw(m + i, 10) < P.ornament) {                   // a grace note from the step above (below, at the top of the range)
          const grace = fits(tuneVoice, [midiOf(d + 1)]) ? midiOf(d + 1) : midiOf(d - 1);
          notes.push({ voice: tuneVoice, part: 'tune', at, len: eighth / 4, midi: grace, vel: 0.6 * vel, grace: true });
          notes.push({ voice: tuneVoice, part: 'tune', at: at + eighth / 4, len: len * eighth - eighth / 4, midi: midiOf(d), vel });
        } else notes.push({ voice: tuneVoice, part: 'tune', at, len: len * eighth, midi: midiOf(d), vel });
      });
      for (const [e, vel] of S.drum || []) notes.push({ voice: 'dum', part: 'drum', at: t0 + e * eighth, len: eighth, vel: vel * (0.9 + 0.1 * draw(m + e, 11)) });
      bar += 1;
    });
  });
  closePad(bar * barLen + MUSIC.tail / 2);                               // the last chord dies away in the tail
  // The high pluck: a rare accent, a few notes at most, on the third beat of bars the playing draws (never the first two or the last).
  const count = Math.min(P.accents, MUSIC.accentMax, 1 + Math.floor(draw(1, 12) * P.accents));
  const chosen = new Set();
  for (let i = 0; chosen.size < count && i < 64; i++) chosen.add(2 + Math.floor(draw(i, 13) * Math.max(1, bar - 3)));
  for (const b of chosen) {
    const midi = fold(midiOf(roots[b] + CHORD_TONES[Math.floor(draw(b, 14) * 3)] + 14), R.accent);
    notes.push({ voice: 'accent', part: 'accent', at: b * barLen + (P.beats === 3 ? 2 : 4) * eighth, len: 2 * eighth, midi, vel: 0.7 + 0.2 * draw(b, 15) });
  }
  notes.sort((a, b) => (a.at - b.at) || (PARTS.indexOf(a.part) - PARTS.indexOf(b.part)));
  return { id, name: P.name, bpm, bars: bar, seconds: bar * barLen + MUSIC.tail, notes };
}

// The danger tune's bar (ruling 1287): composeBar's bar at the tension, softened: its pluck an octave lower on the low string, soft dums
// in place of the frame drum (no teks), the same drones (swelling over a whole bar when scheduled). at and len in beats, as composeBar's.
const DANGER_DRUM = { tense: [[0, 0.6], [2, 0.4]], raid: [[0, 0.8], [1.5, 0.45], [2, 0.65], [3, 0.4]] };   // [beat, velocity]
export function composeDanger(seed, bar, tension, season = null) {
  const b = composeBar(seed, bar, tension, season);
  const notes = b.notes.filter((n) => n.voice === 'pluck').map((n) => ({ voice: 'low', part: 'tune', at: n.at, len: n.len, midi: n.midi - 12, vel: 0.8 * n.vel }));
  for (const [at, vel] of DANGER_DRUM[b.tension >= 0.5 ? 'raid' : 'tense']) notes.push({ voice: 'dum', part: 'drum', at, len: 0.5, vel: vel * (0.9 + 0.1 * musicDraw(seed, bar * 16 + at * 2, 17)) });
  return { notes, drone: b.drone, tension: b.tension };
}

// ── The audio graph ──

// A soft reed for the drones, the old ney's breathy flute (a little more second harmonic, for the low register) and a warm pad, as
// harmonic amplitudes (index 1 = the fundamental).
const DRONE_PARTIALS = [0, 1, 0.5, 0.32, 0.2, 0.12, 0.07, 0.04];
const FLUTE_PARTIALS = [0, 1, 0.22, 0.07, 0.03];
const PAD_PARTIALS = [0, 1, 0.45, 0.28, 0.18, 0.12, 0.08, 0.05, 0.03];

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
// A small fixed noise buffer (the flute's breath), from a seeded generator (the same every time).
function noiseBuffer(ctx, seconds) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  return buf;
}

// A plucked string at a MIDI note (Karplus-Strong): a softened noise burst one period long (its mean taken out), fed back through a
// two-tap average, decaying to about -34 dB in `decay` s, faded out at the end and scaled to a peak of 1. Version 8.2: soft (how much
// of the burst's brightness is kept: less is darker) and body (a sine at the note under the string, for the harp's and the low
// pluck's roundness); the defaults are 8.1's pluck, the accent's.
export function pluckSamples(sampleRate, midi, seconds = MUSIC.pluckSeconds, { soft = 0.3, decay = 1.2, body = 0 } = {}) {
  const f = freqOf(midi), period = Math.max(2, Math.round(sampleRate / f));
  const len = Math.max(period + 2, Math.floor(sampleRate * seconds));
  const d = new Float32Array(len);
  const rho = Math.pow(0.02, 1 / (f * decay));
  let s = (midi * 7919 + 1) >>> 0, prev = 0;
  for (let i = 0; i < period; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    prev = (1 - soft) * prev + soft * ((s / 4294967296) * 2 - 1);
    d[i] = prev;
  }
  let mean = 0;
  for (let i = 0; i < period; i++) mean += d[i] / period;
  for (let i = 0; i < period; i++) d[i] -= mean;                           // no offset to ring on
  for (let i = period; i < len; i++) d[i] = rho * 0.5 * (d[i - period] + (i - period - 1 >= 0 ? d[i - period - 1] : 0));
  if (body > 0) {
    let top = 0;
    for (let i = 0; i < period; i++) top = Math.max(top, Math.abs(d[i]));
    const w = 2 * Math.PI * f / sampleRate, fall = 1 / (sampleRate * decay * 0.4);
    for (let i = 0; i < len; i++) d[i] += body * top * Math.sin(w * i) * Math.exp(-i * fall);
  }
  const fade = Math.min(len, Math.floor(sampleRate * 0.03));
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
  return d;
}
// The three strings (ruling 1283): the harp soft and dark with a little body, the low pluck rounder (more body, a quicker fall: a
// piano-like note), the accent 8.1's high pluck.
const STRINGS = {
  harp: { seconds: 3, soft: 0.12, decay: 2.4, body: 0.35 },
  low: { seconds: 2.5, soft: 0.2, decay: 1.8, body: 0.6 },
  accent: { seconds: MUSIC.pluckSeconds },
};

// The graph: master (the volume) to the speakers and an echo for space (each piece's and each danger's own output sends to it). A
// piece and a danger tune each build their own buses into one output gain, so either fades on its own.
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
  return {
    ctx, master, send,
    droneWave: waveOf(ctx, DRONE_PARTIALS), fluteWave: waveOf(ctx, FLUTE_PARTIALS), padWave: waveOf(ctx, PAD_PARTIALS),
    breath: noiseBuffer(ctx, 1), strings: new Map(),
    voices: [],            // every note still to end: { start, stop, w (voices it takes), srcs, owner (its playing, or 'danger') }
    phase: 'rest', until: 0, count: 0, gaps: 0, last: null, play: null, danger: null, dangerBar: 0, ended: [],
  };
}
// One output gain and a low-passed bus for each voice in `voices`, into the master and the echo.
function buses(g, voices) {
  const out = g.ctx.createGain();
  out.gain.value = 1;
  out.connect(g.master); out.connect(g.send);
  const bus = { out };
  for (const v of voices) { bus[v] = lowpass(g.ctx, MUSIC.tone[v === 'accent' ? 'pluck' : v]); bus[v].connect(out); }
  return bus;
}
const unplug = (bus) => { for (const n of Object.values(bus)) { try { n.disconnect(); } catch (e) { /* already gone */ } } };

function stringBuffer(g, kind, midi) {
  const key = `${kind}:${midi}`;
  let buf = g.strings.get(key);
  if (!buf) {
    const S = STRINGS[kind], d = pluckSamples(g.ctx.sampleRate, midi, S.seconds, S);
    buf = g.ctx.createBuffer(1, d.length, g.ctx.sampleRate);
    buf.getChannelData(0).set(d);
    g.strings.set(key, buf);
  }
  return buf;
}

// The voice check: a note taking w voices over [start, stop) is counted (its entry returned) when the voices sounding at once stay
// at or under MUSIC.maxVoices; else null and the note is dropped.
const loadAt = (g, p) => g.voices.reduce((n, v) => n + (v.start <= p && v.stop > p ? v.w : 0), 0);
function takeVoice(g, start, stop, w, owner) {
  g.voices = g.voices.filter((v) => v.stop > g.ctx.currentTime - 0.01);
  const points = [start, ...g.voices.map((v) => v.start).filter((s) => s > start && s < stop)];
  for (const p of points) if (loadAt(g, p) + w > MUSIC.maxVoices) return null;
  const v = { start, stop, w, srcs: [], owner };
  g.voices.push(v);
  return v;
}
// The first moment from t at which w more voices are free for good (the danger's drones, which hold until it ends).
function freeFrom(g, t, w) {
  const times = [t, ...g.voices.map((v) => v.stop).filter((s) => s > t && s !== Infinity)].sort((a, b) => a - b);
  for (const c of times) {
    const points = [c, ...g.voices.map((v) => v.start).filter((s) => s > c)];
    if (points.every((p) => loadAt(g, p) + w <= MUSIC.maxVoices)) return c;
  }
  return times[times.length - 1];
}

const SILENT = 0.0001;
// A note's gain starts at 0, not the default 1: a source may sound a frame before its gain's first event (a click).
const silentGain = (ctx) => { const gain = ctx.createGain(); gain.gain.value = 0; return gain; };
// A note's nodes leave the graph once its source ends.
const end = (src, ...nodes) => { src.onended = () => { for (const n of [src, ...nodes]) { try { n.disconnect(); } catch (e) { /* already gone */ } } }; };

// A string (the harp, the low pluck, the accent): rings its written length and MUSIC.ring more, then dies quickly.
function playString(g, bus, n, t, owner) {
  const kind = n.voice, ctx = g.ctx;
  const stop = t + Math.min(STRINGS[kind].seconds, n.len + MUSIC.ring[kind]) + 0.08;
  const v = takeVoice(g, t, stop, 1, owner);
  if (!v) return false;
  const src = ctx.createBufferSource(), gain = silentGain(ctx);
  src.buffer = stringBuffer(g, kind, n.midi);
  gain.gain.setValueAtTime(MUSIC.level[kind] * n.vel, t);
  gain.gain.setTargetAtTime(0, stop - 0.08, 0.02);
  src.connect(gain); gain.connect(bus[kind]);
  end(src, gain);
  src.start(t);
  src.stop(stop);
  v.srcs.push(src);
  return true;
}

// The low flute: the old ney's wave a register lower, a slower swell, a scoop up from a little flat, a vibrato that grows in, and a
// breath of band-passed noise under it (two voices).
function playFlute(g, bus, n, t, owner) {
  const ctx = g.ctx, len = Math.max(0.12, n.len), stop = t + len;
  const v = takeVoice(g, t, stop + 0.02, 2, owner);
  if (!v) return false;
  const osc = ctx.createOscillator(), gain = silentGain(ctx);
  osc.setPeriodicWave(g.fluteWave);
  const f = freqOf(n.midi), steps = Math.max(8, Math.ceil(len * 60)), curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const s = (i / (steps - 1)) * len;
    const scoop = s < 0.12 ? 2 ** ((-0.4 * (1 - s / 0.12)) / 12) : 1;
    curve[i] = f * scoop * (1 + 0.007 * Math.min(1, s / 0.6) * Math.sin(2 * Math.PI * 4.6 * s));
  }
  osc.frequency.setValueCurveAtTime(curve, t, len);
  const peak = MUSIC.level.flute * n.vel, attack = Math.min(0.28, len / 3), release = Math.min(0.25, len / 3);
  const shape = (param, top) => {
    param.setValueAtTime(SILENT, t);
    param.linearRampToValueAtTime(top, t + attack);
    param.setValueAtTime(top, stop - release);
    param.linearRampToValueAtTime(0, stop);
  };
  shape(gain.gain, peak);
  osc.connect(gain); gain.connect(bus.flute);
  const air = ctx.createBufferSource(), band = lowpass(ctx, MUSIC.tone.breath, 'bandpass'), airGain = silentGain(ctx);
  air.buffer = g.breath;
  air.loop = true;
  band.Q.value = 0.9;
  shape(airGain.gain, peak * MUSIC.level.breath);
  air.connect(band); band.connect(airGain); airGain.connect(bus.flute);
  end(osc, gain);
  end(air, band, airGain);
  osc.start(t); air.start(t);
  osc.stop(stop); air.stop(stop);
  v.srcs.push(osc, air);
  return true;
}

// The pad: a warm wave, a slow swell in and a slow fall away, a few cents apart from its neighbours.
function playPad(g, bus, n, t, owner) {
  const ctx = g.ctx, attack = Math.min(MUSIC.padAttack, n.len / 2), stop = t + n.len + MUSIC.padRelease;
  const v = takeVoice(g, t, stop, 1, owner);
  if (!v) return false;
  const osc = ctx.createOscillator(), gain = silentGain(ctx);
  osc.setPeriodicWave(g.padWave);
  osc.frequency.value = freqOf(n.midi);
  if (osc.detune) osc.detune.value = (n.midi % 3 - 1) * 4;
  const peak = MUSIC.level.pad * n.vel;
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + n.len);
  gain.gain.linearRampToValueAtTime(0, stop);
  osc.connect(gain); gain.connect(bus.pad);
  end(osc, gain);
  osc.start(t);
  osc.stop(stop);
  v.srcs.push(osc);
  return true;
}

// A soft frame-drum dum: a low thump with a gentle (20 ms) front, through a low-pass; never a tek.
function playDum(g, bus, n, t, owner) {
  const ctx = g.ctx, stop = t + 0.6;
  const v = takeVoice(g, t, stop, 1, owner);
  if (!v) return false;
  const osc = ctx.createOscillator(), gain = silentGain(ctx);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(92, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.18);
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.linearRampToValueAtTime(MUSIC.level.dum * n.vel, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(SILENT, t + 0.55);
  osc.connect(gain); gain.connect(bus.dum);
  end(osc, gain);
  osc.start(t);
  osc.stop(stop);
  v.srcs.push(osc);
  return true;
}

const PLAYERS = { harp: playString, low: playString, accent: playString, flute: playFlute, pad: playPad, dum: playDum };
const PIECE_VOICES = ['harp', 'low', 'flute', 'pad', 'accent', 'dum'];

// A playing of piece `id` from t0: its notes and its own buses. Version 7.0's season colour, now per piece: the accent's brightness and
// the echo's send (SEASON_MUSIC tone and wet).
function startPlay(g, t0, id, seed, play, season) {
  const piece = composePiece(id, seed, play), bus = buses(g, PIECE_VOICES);
  const S = season ? SEASON_MUSIC[season] || null : null;
  bus.accent.frequency.value = S ? S.tone : MUSIC.tone.pluck;
  g.send.gain.setTargetAtTime(MUSIC.level.wet * (S ? S.wet : 1), t0, 0.5);
  return { id, piece, t0, end: t0 + piece.seconds, next: 0, bus };
}
// Danger came: the playing fades out over `fade` s; a note not yet started never sounds, one sounding ends with the fade.
function cutPlay(g, p, now, fade) {
  const gain = p.bus.out.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(1, now);
  gain.linearRampToValueAtTime(0, now + fade);
  for (const v of g.voices) {
    if (v.owner !== p) continue;
    const to = v.start > now ? v.start : Math.min(v.stop, now + fade);
    if (to < v.stop) { for (const s of v.srcs) { try { s.stop(to); } catch (e) { /* already stopped */ } } v.stop = to; }
  }
  g.voices = g.voices.filter((v) => v.stop > v.start);
  g.ended.push({ bus: p.bus, until: now + fade + 1 });
}

// The danger tune begins: its own buses fade in over MUSIC.dangerIn, its three drones start as soon as three voices are free for good.
function beginDanger(g, now, seed, mood, season) {
  if (g.play) { cutPlay(g, g.play, now, MUSIC.pieceOut); g.play = null; }
  const ctx = g.ctx, bus = buses(g, ['low', 'dum', 'drone']);
  bus.out.gain.setValueAtTime(0, now);
  bus.out.gain.linearRampToValueAtTime(1, now + MUSIC.dangerIn);
  const tension = MOOD_TENSION[mood] || 0, at = freeFrom(g, now, MUSIC.droneVoices);
  const drones = {};
  for (const [name, midi] of [['tonic', MUSIC.base], ['fifth', MUSIC.base + 7], ['low', MUSIC.base - 12]]) {
    const osc = ctx.createOscillator(), gain = silentGain(ctx);
    osc.setPeriodicWave(g.droneWave);
    osc.frequency.value = freqOf(midi);
    osc.connect(gain); gain.connect(bus.drone);
    osc.start(at);
    const v = { start: at, stop: Infinity, w: 1, srcs: [osc], owner: 'danger' };
    g.voices.push(v);
    drones[name] = { osc, gain, v };
  }
  g.danger = { bus, drones, tension, from: now, nextAt: now + 0.05, first: true };
  g.phase = 'danger';
}
// The danger is over: the tune fades out over MUSIC.dangerOut, its drones stop, and a gap of silence comes before the next piece.
function endDanger(g, now, seed, plan) {
  const D = g.danger, gain = D.bus.out.gain, outAt = now + MUSIC.dangerOut;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(Math.min(1, Math.max(0, (now - D.from) / MUSIC.dangerIn)), now);
  gain.linearRampToValueAtTime(0, outAt);
  for (const d of Object.values(D.drones)) {
    try { d.osc.stop(outAt + 0.05); } catch (e) { /* already stopped */ }
    d.v.stop = Math.max(d.v.start, outAt + 0.05);
  }
  g.ended.push({ bus: D.bus, until: outAt + 2 });
  g.danger = null;
  g.phase = 'rest';
  g.until = outAt + plan.gap(seed, g.gaps++);
}
// The danger tune's bars, each scheduled once its start is within the look-ahead (as 8.1's bars were).
function dangerBars(g, now, seed, mood, season) {
  const D = g.danger, beat = beatSeconds(), barLen = barSeconds();
  if (D.nextAt < now) D.nextAt = now + 0.05;                            // never catch up on bars missed
  while (D.nextAt < now + MUSIC.lookahead) {
    if (!D.first) D.tension = nextTension(D.tension, mood);
    const bar = composeDanger(seed, g.dangerBar, D.tension, season);
    for (const [name, level] of Object.entries(bar.drone)) {
      const param = D.drones[name].gain.gain;
      if (D.first) param.setValueAtTime(0, D.nextAt);
      param.setTargetAtTime(level * MUSIC.level.drone, D.nextAt, barLen);   // the slow swell: a whole bar's time constant
    }
    D.first = false;
    for (const n of bar.notes) PLAYERS[n.voice](g, D.bus, { ...n, len: n.len * beat }, D.nextAt + n.at * beat, 'danger');
    g.dangerBar += 1;
    D.nextAt += barLen;
  }
}

// The programme at audio time `now`, run on every tick (live) or every MUSIC.offlineStep (offline): danger first, then the rest, the
// next piece once its time is within the look-ahead, and the playing's notes as they come within it.
function conduct(g, now, { seed, mood, season, plan }) {
  const danger = mood === 'tense' || mood === 'raid';
  if (danger && g.phase !== 'danger') beginDanger(g, now, seed, mood, season);
  else if (!danger && g.phase === 'danger') endDanger(g, now, seed, plan);
  if (g.phase === 'danger') dangerBars(g, now, seed, mood, season);
  if (g.phase === 'rest' && now + MUSIC.lookahead >= g.until) {
    const id = plan.choose(seed, g.count, g.last, season);
    g.play = startPlay(g, Math.max(g.until, now + 0.05), id, seed, g.count, season);
    g.last = id;
    g.count += 1;
    g.phase = 'piece';
  }
  if (g.phase === 'piece') {
    const p = g.play, notes = p.piece.notes;
    while (p.next < notes.length && p.t0 + notes[p.next].at < now + MUSIC.lookahead) {
      const n = notes[p.next++], t = p.t0 + n.at;
      if (t >= now - 0.02) PLAYERS[n.voice](g, p.bus, n, Math.max(t, now), p);   // never catch up on notes missed
    }
    if (p.next >= notes.length && now >= p.end) {
      g.ended.push({ bus: p.bus, until: p.end + 1 });
      g.play = null;
      g.phase = 'rest';
      g.until = p.end + plan.gap(seed, g.gaps++);
    }
  }
  if (g.ended.length) g.ended = g.ended.filter((e) => { if (now < e.until) return true; unplug(e.bus); return false; });
}

// The programme's choices, each replaceable (tools/music.html plays one piece, or the pieces with short gaps).
const planOf = (plan = {}) => ({ choose: choosePiece, gap: gapSeconds, firstWait: firstWaitSeconds, ...plan });

// Runs the programme for `seconds` on an OfflineAudioContext at master gain masterGain(volume), with the mood and the season at each
// moment from mood(t) and season(t), from play count `play`: the first piece after plan.firstWait(seed). The programme runs every
// MUSIC.offlineStep s of the render (ctx.suspend), as tick() does live, so only a few seconds of notes exist at a time. The level tests
// and tools/music.html render with it; returns the graph.
export function scheduleOffline(ctx, { seed = 1, seconds = 40, volume = 0.3, mood = () => 'calm', season = () => null, plan = {}, play = 0 } = {}) {
  const g = buildGraph(ctx), p = planOf(plan);
  g.master.gain.setValueAtTime(masterGain(volume), 0);
  g.count = play;
  g.until = p.firstWait(seed);
  const at = (t) => conduct(g, t, { seed, mood: mood(t), season: season(t), plan: p });
  at(0);
  for (let t = MUSIC.offlineStep; t < seconds; t += MUSIC.offlineStep) ctx.suspend(t).then(() => { at(t); ctx.resume(); });
  return g;
}

function defaultCreate() {
  const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
  if (!Ctx) throw new Error('no_audio');
  return new Ctx();
}

// The music's controls (spec 5.5). context: an audio context to use (tests); create: how to make one on the first
// gesture; timer(fn, ms): how a fade-out's suspend waits (tests). Version 8.2: plan, the programme's choices (tools/music.html).
export function createMusic({
  context = null, create = defaultCreate, enabled = () => false, volume = () => 0.3, seed = () => 1, mood = () => 'calm',
  season = () => null,                                   // Version 7.0: the season on screen ('akhet', 'peret', 'shemu') or null (src/audio/music.js composeBar)
  timer = (fn, ms) => setTimeout(fn, ms), cancelTimer = (id) => clearTimeout(id), plan = {},
} = {}) {
  let ctx = context, g = null, hidden = false, destroyed = false, quieting = null;
  const programme = planOf(plan);

  const running = () => Boolean(ctx && ctx.state === 'running');
  const on = () => !destroyed && !hidden && Boolean(enabled());
  function graph() {
    if (!g && ctx) { try { g = buildGraph(ctx); g.until = ctx.currentTime + programme.firstWait(seed()); } catch (e) { g = null; } }
    return g;
  }
  function resume() {
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* stays suspended */ } }
  }
  // Fades the master to the volume (or in from silence), cancelling a pending suspend. During a gap too: the volume is the master's.
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
    // The light timer: runs the programme (the next piece, its notes within the look-ahead, the danger tune).
    tick() {
      if (!on() || !running() || !g) return;
      conduct(g, ctx.currentTime, { seed: seed(), mood: mood(), season: season(), plan: programme });
    },
    destroy() {
      destroyed = true;
      if (quieting !== null) { cancelTimer(quieting); quieting = null; }
      if (ctx && !context && typeof ctx.close === 'function') { try { const p = ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* gone */ } }
      g = null;
    },
    playing: () => on() && running() && Boolean(g),
    // For tests and tools/music.html: where the programme is. phase 'rest' (silence until `until`), 'piece' or 'danger'; played: pieces
    // begun; piece: the one playing; bar and tension: the danger tune's next bar and its tension.
    state: () => (g ? {
      phase: g.phase, until: g.until, played: g.count, piece: g.play ? g.play.id : null, last: g.last,
      bar: g.dangerBar, tension: g.danger ? g.danger.tension : 0,
    } : null),
  };
  return api;
}

