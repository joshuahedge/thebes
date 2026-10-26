// Version 8.2 "Song of the Nile" (Track M, rulings 1280-1299): the music's pieces, as written. src/audio/music.js composePiece plays them,
// each playing a little different (musicDraw of the city's seed and the play count); between them, silence (MUSIC.gap).
// This file imports nothing (a leaf data file).
//
// A piece: id, name (as Josh would listen for it), mood (the character it is written for), mode (MODES), tonic (the MIDI of degree 0),
// bpm and beats (to a bar), seasons (the seasons whose cities hear it more often: SEASON_IDS), voices (who plays the tune and the
// accompaniment), arpAt and padAt (the accompaniment's and the pad's register, in degrees from the tonic), accents (the most high-pluck
// notes a playing may have), ornament (the chance a long tune note gets a grace note), sections and form.
// A section: chords (a degree root a bar; the pad and the accompaniment play its triad), arp (accompaniment patterns, one drawn a
// playing: ARPS), end (a last-bar pattern), pad (true: a warm pad holds the chord), voice (the tune's voice here, if not the piece's),
// tune (a bar of [eighth, degree, length in eighths] notes per chord), alt (a last bar a repeat may end on instead), drum (soft dums:
// [eighth, velocity]). The form: [section, fewest, most]: each playing draws how many times the section comes.
// Degrees: 0 is the tonic, 7 the octave above, negative below.

export const MODES = {
  hijaz: [0, 1, 4, 5, 7, 8, 10],      // the game's own: D E♭ F♯ G A B♭ C on D
  nahawand: [0, 2, 3, 5, 7, 8, 11],   // the minor with the raised seventh
  kurd: [0, 1, 3, 5, 7, 8, 10],       // the dark, gentle one (a minor with a low second)
  ajam: [0, 2, 4, 5, 7, 9, 11],       // the major: the morning
  rast: [0, 2, 4, 5, 7, 9, 10],       // rast's shape without its quarter tones: a warm, open mode
};

// Accompaniment patterns: [eighth, chord tone (0 root, 1 third, 2 fifth, 3 octave), length in eighths].
export const ARPS = {
  rise: [[0, 0, 3], [2, 1, 3], [4, 2, 3], [6, 3, 2]],
  fall: [[0, 3, 3], [2, 2, 3], [4, 1, 3], [6, 0, 2]],
  toll: [[0, 0, 8]],
  walk: [[0, 0, 4], [4, 2, 4]],
  sway: [[0, 0, 3], [3, 2, 3], [6, 1, 2]],
  ripple: [[0, 0, 2], [1, 1, 2], [2, 2, 3], [4, 3, 2], [5, 2, 2], [6, 1, 2]],
  rock3: [[0, 0, 2], [2, 2, 2], [4, 1, 2]],
  open3: [[0, 0, 4], [4, 2, 2]],
  roll: [[0, 0, 8], [0.5, 1, 8], [1, 2, 8], [1.5, 3, 8]],
  none: [],
};
export const CHORD_TONES = [0, 2, 4, 7];

export const PIECES = [
  {
    id: 'dawn', name: 'First light', mood: 'open and hopeful: the sun coming up over the water',
    mode: 'ajam', tonic: 41, bpm: 66, beats: 4, seasons: ['peret'],
    voices: { tune: 'harp', arp: 'harp' }, arpAt: 0, padAt: 0, accents: 2, ornament: 0.3,
    sections: {
      I: { chords: [0, 0], arp: ['rise'] },
      A: {
        chords: [0, 0, 3, 0], arp: ['rise', 'fall'], pad: true,
        tune: [[[0, 11, 3], [3, 9, 1], [4, 7, 4]], [[2, 8, 2], [4, 9, 4]], [[0, 10, 3], [3, 9, 1], [4, 8, 2], [6, 7, 2]], [[0, 9, 8]]],
        alt: [[0, 7, 8]],
      },
      B: {
        chords: [5, 3, 0, 4], arp: ['rise', 'fall'], pad: true,
        tune: [[[0, 12, 2], [2, 11, 2], [4, 9, 4]], [[2, 10, 2], [4, 8, 4]], [[0, 7, 2], [2, 9, 2], [4, 11, 4]], [[0, 8, 8]]],
      },
      C: { chords: [3, 0, 0], arp: ['rise'], end: 'roll', pad: true, tune: [[[0, 9, 4], [4, 8, 4]], [[0, 7, 8]], []] },
    },
    form: [['I', 1, 1], ['A', 2, 3], ['B', 2, 3], ['A', 1, 2], ['C', 1, 1]],
  },
  {
    id: 'reed', name: 'The low reed', mood: 'longing and slow: one flute over a held chord',
    mode: 'hijaz', tonic: 50, bpm: 56, beats: 4, seasons: ['akhet'],
    voices: { tune: 'flute', arp: 'harp' }, arpAt: -7, padAt: 0, accents: 2, ornament: 0.35,
    sections: {
      I: { chords: [0, 0, 0], arp: ['toll'], pad: true },
      A: {
        chords: [0, 0, 3, 0], arp: ['toll'], pad: true,
        tune: [[[0, 7, 4], [4, 8, 2], [6, 9, 2]], [[0, 9, 3], [3, 8, 1], [4, 9, 4]], [[0, 10, 4], [4, 9, 2], [6, 8, 2]], [[0, 7, 8]]],
        alt: [[0, 8, 2], [2, 7, 6]],
      },
      B: {
        chords: [6, 6, 0, 0], arp: ['toll'], pad: true,
        tune: [[[0, 11, 4], [4, 10, 4]], [[0, 9, 2], [2, 10, 2], [4, 9, 4]], [[0, 8, 4], [4, 7, 4]], [[0, 6, 2], [2, 7, 6]]],
      },
      P: { chords: [0, 0], arp: ['toll'], pad: true },
      C: { chords: [3, 0, 0, 0], arp: ['toll'], pad: true, tune: [[[0, 9, 4], [4, 8, 4]], [[0, 7, 8]], [], []] },
    },
    form: [['I', 1, 1], ['A', 1, 2], ['B', 1, 1], ['P', 1, 1], ['A', 1, 1], ['B', 0, 1], ['C', 1, 1]],
  },
  {
    id: 'lullaby', name: 'Lullaby for the workers\' village', mood: 'tender and rocking, in three',
    mode: 'kurd', tonic: 45, bpm: 60, beats: 3, seasons: ['shemu'],
    voices: { tune: 'low', arp: 'low' }, arpAt: 0, padAt: 0, accents: 2, ornament: 0.2,
    sections: {
      I: { chords: [0, 0], arp: ['rock3'], pad: true },
      A: {
        chords: [0, 0, 3, 6, 0, 5, 3, 0], arp: ['rock3', 'open3'], pad: true,
        tune: [[[0, 7, 3], [3, 9, 1], [4, 8, 2]], [[0, 7, 6]], [[0, 10, 2], [2, 9, 2], [4, 8, 2]], [[0, 9, 6]],
          [[0, 7, 3], [3, 9, 1], [4, 11, 2]], [[0, 10, 4], [4, 9, 2]], [[0, 8, 2], [2, 7, 2], [4, 8, 2]], [[0, 7, 6]]],
        alt: [[2, 8, 2], [4, 7, 2]],
      },
      B: {
        chords: [5, 5, 3, 3, 6, 6, 0, 0], arp: ['rock3', 'open3'], pad: true,
        tune: [[[0, 12, 4], [4, 11, 2]], [[0, 10, 6]], [[0, 11, 2], [2, 10, 2], [4, 9, 2]], [[0, 10, 6]],
          [[0, 9, 3], [3, 8, 1], [4, 9, 2]], [[0, 8, 6]], [[2, 7, 2], [4, 8, 2]], [[0, 7, 6]]],
      },
      C: { chords: [3, 0, 0, 0], arp: ['open3'], end: 'roll', pad: true, tune: [[[0, 8, 3], [3, 7, 3]], [[0, 7, 6]], [], []] },
    },
    form: [['I', 1, 1], ['A', 1, 2], ['B', 1, 2], ['A', 1, 1], ['C', 1, 1]],
  },
  {
    id: 'river', name: 'The river\'s turning', mood: 'flowing: a harp rippling like water, the flute joining',
    mode: 'nahawand', tonic: 50, bpm: 72, beats: 4, seasons: ['akhet'],
    voices: { tune: 'harp', arp: 'harp' }, arpAt: -7, padAt: 0, accents: 3, ornament: 0.25,
    sections: {
      I: { chords: [0, 0, 5, 4], arp: ['ripple'] },
      A: {
        chords: [0, 5, 3, 4], arp: ['ripple', 'rise'], pad: true,
        tune: [[[0, 11, 4], [4, 9, 4]], [[0, 10, 2], [2, 9, 2], [4, 7, 4]], [[0, 8, 4], [4, 10, 4]], [[0, 6, 2], [2, 7, 2], [4, 8, 4]]],
        alt: [[0, 6, 2], [2, 7, 6]],
      },
      B: {
        chords: [5, 3, 0, 4], arp: ['ripple'], pad: true, voice: 'flute',
        tune: [[[0, 9, 4], [4, 10, 2], [6, 9, 2]], [[0, 7, 8]], [[0, 9, 2], [2, 8, 2], [4, 7, 2], [6, 6, 2]], [[0, 8, 8]]],
      },
      C: { chords: [5, 4, 0], arp: ['rise'], end: 'roll', pad: true, tune: [[[0, 9, 4], [4, 8, 4]], [[0, 6, 4], [4, 8, 4]], [[0, 7, 8]]] },
    },
    form: [['I', 1, 1], ['A', 2, 3], ['B', 2, 3], ['A', 1, 2], ['C', 1, 1]],
  },
  {
    id: 'sowing', name: 'Black earth', mood: 'patient and earthy: walking the fields after the flood',
    mode: 'rast', tonic: 43, bpm: 64, beats: 4, seasons: ['peret'],
    voices: { tune: 'low', arp: 'harp' }, arpAt: 0, padAt: 0, accents: 2, ornament: 0.25,
    sections: {
      I: { chords: [0, 0, 3, 0], arp: ['walk'] },
      A: {
        chords: [0, 3, 6, 0], arp: ['walk', 'sway'],
        tune: [[[0, 7, 2], [2, 8, 2], [4, 9, 4]], [[0, 10, 3], [3, 9, 1], [4, 8, 4]], [[0, 13, 4], [4, 12, 2], [6, 11, 2]], [[0, 9, 2], [2, 8, 2], [4, 7, 4]]],
        alt: [[0, 8, 2], [2, 7, 6]],
      },
      B: {
        chords: [4, 3, 0, 4], arp: ['walk'], pad: true,
        tune: [[[0, 11, 4], [4, 12, 4]], [[0, 10, 6], [6, 9, 2]], [[0, 9, 2], [2, 7, 6]], [[0, 8, 8]]],
      },
      P: { chords: [0, 6], arp: ['walk'], pad: true },
      C: { chords: [3, 6, 0, 0], arp: ['walk'], end: 'roll', pad: true, tune: [[[0, 10, 4], [4, 9, 4]], [[0, 8, 8]], [[0, 7, 8]], []] },
    },
    form: [['I', 1, 1], ['A', 2, 3], ['B', 1, 2], ['P', 1, 1], ['A', 1, 2], ['C', 1, 1]],
  },
  {
    id: 'harvest', name: 'Harvest song', mood: 'warm and gently moving, with a soft drum',
    mode: 'hijaz', tonic: 50, bpm: 80, beats: 4, seasons: ['shemu'],
    voices: { tune: 'low', arp: 'harp' }, arpAt: -7, padAt: -7, accents: 2, ornament: 0.3,
    sections: {
      I: { chords: [0, 0], arp: ['sway'], drum: [[0, 0.7]] },
      A: {
        chords: [0, 3, 6, 0], arp: ['sway'], pad: true, drum: [[0, 0.7], [4, 0.45]],
        tune: [[[0, 4, 2], [2, 5, 1], [3, 4, 1], [4, 2, 2], [6, 1, 2]], [[0, 2, 4], [4, 0, 4]], [[0, 6, 2], [2, 5, 2], [4, 4, 2], [6, 3, 2]], [[0, 2, 2], [2, 1, 2], [4, 0, 4]]],
        alt: [[0, 1, 2], [2, 0, 6]],
      },
      B: {
        chords: [3, 6, 0, 0], arp: ['sway', 'rise'], pad: true, drum: [[0, 0.7], [4, 0.45]],
        tune: [[[0, 7, 3], [3, 8, 1], [4, 7, 2], [6, 6, 2]], [[0, 5, 4], [4, 4, 4]], [[0, 2, 2], [2, 4, 2], [4, 5, 2], [6, 4, 2]], [[0, 2, 2], [2, 1, 2], [4, 0, 4]]],
      },
      C: { chords: [3, 0, 0, 0], arp: ['sway'], end: 'roll', pad: true, drum: [[0, 0.5]], tune: [[[0, 4, 4], [4, 2, 4]], [[0, 1, 2], [2, 0, 6]], [], []] },
    },
    form: [['I', 1, 1], ['A', 3, 4], ['B', 2, 3], ['A', 1, 2], ['C', 1, 1]],
  },
  {
    id: 'night', name: 'Night on the west bank', mood: 'still and dark: a pad, a low flute and a few high notes like stars',
    mode: 'nahawand', tonic: 45, bpm: 50, beats: 4, seasons: [],
    voices: { tune: 'flute', arp: 'harp' }, arpAt: 0, padAt: 0, accents: 4, ornament: 0.2,
    sections: {
      I: { chords: [0, 0, 5, 5], arp: ['none'], pad: true },
      A: {
        chords: [0, 0, 5, 5], arp: ['toll'], pad: true,
        tune: [[[0, 11, 8]], [[0, 10, 4], [4, 9, 4]], [[0, 9, 6], [6, 8, 2]], [[0, 7, 8]]],
      },
      P: { chords: [0, 0], arp: ['toll'], pad: true },
      B: {
        chords: [3, 3, 4, 4], arp: ['toll'], pad: true,
        tune: [[[2, 12, 6]], [[0, 11, 4], [4, 10, 4]], [[0, 13, 4], [4, 11, 4]], [[0, 11, 8]]],
      },
      C: { chords: [5, 4, 0, 0], arp: ['toll'], pad: true, tune: [[[0, 9, 4], [4, 8, 4]], [[0, 6, 8]], [[0, 7, 8]], []] },
    },
    form: [['I', 1, 1], ['A', 1, 2], ['P', 1, 1], ['B', 1, 1], ['A', 1, 1], ['C', 1, 1]],
  },
];
