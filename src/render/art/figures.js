// Small people, ported from the mock-up's fig(). Walkers (walkers.js) pick a kind per service; the hauler
// carries a mud brick for the work gang that raises a new building (early-game pass 2.4) and, in Stage 4,
// the monument crews; the firefighter (Stage 3) walks the firehouse's reach with a leather bucket. Raiders and
// soldiers (Stage 3, spec 5.4) are drawn UNIT_SCALE times a citizen's size and told apart by shape: a raider is a dark
// silhouette with a crested helmet and a round shield; a soldier wears a white kilt and carries a tall spear and a tall,
// round-topped teal shield.
import { p, U } from './primitives.js';
import { SHADOW, TEAL, TEAL_DARK, BLUE, GOLD, ORANGE, WOOD, MUD, RED, STONE } from './palette.js';

export const FIGURE_KINDS = ['citizen', 'woman', 'water', 'porter', 'priest', 'farmer', 'noble', 'fisher', 'hauler', 'firefighter'];
export const UNIT_KINDS = ['raider', 'soldier'];
export const UNIT_SCALE = 1.5;

// A small mud brick in the art's iso shading (lit left face, shaded right face, pale top), its bottom front
// corner at (cx, by).
function brick(g, cx, by, s) {
  const r = 2.6 * s, h = 1.8 * s, k = r * 0.5;
  g.poly([[cx - r, by - k], [cx, by], [cx, by - h], [cx - r, by - k - h]], MUD[1], { outline: true });
  g.poly([[cx, by], [cx + r, by - k], [cx + r, by - k - h], [cx, by - h]], MUD[2], { outline: true });
  g.poly([[cx - r, by - k - h], [cx, by - h], [cx + r, by - k - h], [cx, by - 2 * k - h]], MUD[0], { outline: true });
}

export function fig(g, gx, gy, kind, z = 0, sc = 1) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, sk = '#A0663F', hair = '#1E150E';
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  const long = kind === 'woman' || kind === 'priest';
  const cl = kind === 'priest' ? '#FFFFFF' : '#F7F2E8';
  if (!long) {
    g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.poly([[X - 1.9 * s, Y - 2.8 * s], [X + 1.9 * s, Y - 2.8 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], cl);
    g.line([X - 1.5 * s, Y - 5.4 * s], [X + 1.5 * s, Y - 5.4 * s], kind === 'noble' ? GOLD : TEAL, 0.7 * s);
    g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], sk);
  } else {
    g.poly([[X - 2 * s, Y], [X + 2 * s, Y], [X + 1.6 * s, Y - 8.7 * s], [X - 1.6 * s, Y - 8.7 * s]], cl, { outline: true });
  }
  const hand = kind === 'hauler' ? -13.2 : -5;   // a hauler holds both arms up to the brick on its head
  g.line([X - 1.8 * s, Y - 8.4 * s], [X - 2.4 * s, Y + hand * s], sk, 0.9 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 2.4 * s, Y + hand * s], sk, 0.9 * s);
  const collar = { noble: GOLD, woman: TEAL, firefighter: RED }[kind] || BLUE;
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], collar, 1 * s);
  if (kind === 'priest') g.line([X - 1.6 * s, Y - 8.2 * s], [X + 1.4 * s, Y - 5.5 * s], ORANGE, 1 * s);
  if (kind === 'woman') g.ell([X - 0.5 * s, Y - 9.6 * s], 1.7 * s, 2.4 * s, hair);
  if (kind !== 'priest') g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  if (kind === 'water') g.ell([X + 2.4 * s, Y - 9.4 * s], 1.5 * s, 1.8 * s, '#C9552F', { outline: true });
  if (kind === 'porter') g.ell([X, Y - 12.8 * s], 2.6 * s, 1.2 * s, '#D9B060', { outline: true });
  if (kind === 'farmer') g.line([X + 2.4 * s, Y - 5 * s], [X + 5 * s, Y + 0.8 * s], WOOD, 0.8 * s);
  if (kind === 'hauler') brick(g, X + 0.2 * s, Y - 12.4 * s, s);
  if (kind === 'firefighter') {                                   // a leather bucket of water in the right hand
    g.poly([[X + 1.2 * s, Y - 5.4 * s], [X + 3.8 * s, Y - 5.4 * s], [X + 3.4 * s, Y - 2.2 * s], [X + 1.6 * s, Y - 2.2 * s]], '#8A4A2A', { outline: true });
    g.ell([X + 2.5 * s, Y - 5.4 * s], 1.3 * s, 0.45 * s, '#4FB3B5');
  }
  if (kind === 'fisher') {
    g.line([X + 2.4 * s, Y - 6 * s], [X + 10 * s, Y - 15 * s], WOOD, 0.6);
    g.line([X + 10 * s, Y - 15 * s], [X + 12 * s, Y + 2 * s], '#EDE6D2', 0.3);
  }
}

// A hauler at tile point (gx, gy), bouncing one step per `phase` cycle (0..1).
export function hauler(g, gx, gy, phase = 0) {
  fig(g, gx, gy, 'hauler', Math.abs(Math.sin(phase * Math.PI)) * 1.4);
}

// A raider at tile point (gx, gy): a dark figure in a crested helmet with a round shield on the left arm and a short
// axe in the right hand.
const RAIDER = { body: '#3E3446', kilt: '#55465A', helm: '#6A5A4E', crest: '#8A2E26', shield: '#6E5A3E', rim: '#B39466' };
export function raider(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc;
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.3 });
  g.line([X - 0.9 * s, Y], [X - 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);          // legs astride
  g.line([X + 0.9 * s, Y], [X + 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], RAIDER.kilt);
  g.poly([[X - 1.6 * s, Y - 5.6 * s], [X + 1.6 * s, Y - 5.6 * s], [X + 1.9 * s, Y - 8.8 * s], [X - 1.9 * s, Y - 8.8 * s]], RAIDER.body);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 3.2 * s, Y - 6 * s], RAIDER.body, 0.9 * s);   // the axe arm, raised
  g.line([X + 3.2 * s, Y - 6 * s], [X + 3.6 * s, Y - 12 * s], WOOD, 0.6 * s);
  g.poly([[X + 3.4 * s, Y - 12.4 * s], [X + 5.4 * s, Y - 11.6 * s], [X + 3.6 * s, Y - 10.2 * s]], STONE[2]);
  g.circ([X + 0.2 * s, Y - 10.4 * s], 1.5 * s, RAIDER.body);                            // the head
  g.path([['M', [X - 1.7 * s, Y - 10.6 * s]], ['Q', [X + 0.2 * s, Y - 13.6 * s], [X + 1.9 * s, Y - 10.6 * s]], ['Z']], RAIDER.helm);
  g.path([['M', [X - 2 * s, Y - 11 * s]], ['Q', [X - 0.6 * s, Y - 16.2 * s], [X + 2.4 * s, Y - 13.4 * s]],
    ['Q', [X + 0.4 * s, Y - 13.4 * s], [X - 2 * s, Y - 11 * s]], ['Z']], RAIDER.crest);   // the crest, sweeping back
  g.circ([X - 2.4 * s, Y - 6.4 * s], 2.6 * s, RAIDER.shield, { stroke: RAIDER.rim, strokeWidth: 0.6 * s });   // the round shield
  g.circ([X - 2.4 * s, Y - 6.4 * s], 0.7 * s, RAIDER.rim);
}

// A soldier at tile point (gx, gy): a white kilt and a teal collar, a tall spear held upright and a tall, round-topped
// teal shield in front.
export function soldier(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, sk = '#A0663F', hair = '#1E150E';
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  g.line([X + 3 * s, Y + 0.6 * s], [X + 3 * s, Y - 20 * s], WOOD, 0.6 * s);           // the spear, taller than the man
  g.poly([[X + 3 * s, Y - 22.4 * s], [X + 3.8 * s, Y - 19.6 * s], [X + 2.2 * s, Y - 19.6 * s]], GOLD);
  g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
  g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], '#FAF6EC', { outline: true });
  g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], sk);
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], TEAL, 1 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 3 * s, Y - 6.4 * s], sk, 0.9 * s);           // the hand on the spear
  g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  g.line([X - 1.6 * s, Y - 11.4 * s], [X + 1.6 * s, Y - 11.4 * s], '#FAF6EC', 0.6 * s);   // a white headband
  g.path([['M', [X - 3.8 * s, Y - 1.4 * s]], ['L', [X - 3.8 * s, Y - 7.6 * s]], ['Q', [X - 2.3 * s, Y - 10.6 * s], [X - 0.8 * s, Y - 7.6 * s]],
    ['L', [X - 0.8 * s, Y - 1.4 * s]], ['Z']], TEAL, { stroke: TEAL_DARK, strokeWidth: 0.5 * s });   // the shield, round-topped
  g.line([X - 2.3 * s, Y - 2.4 * s], [X - 2.3 * s, Y - 8.2 * s], '#F6ECD6', 0.4 * s, 0.7);
}

export const FIGURE_ART = {};
for (const kind of FIGURE_KINDS) {
  FIGURE_ART[`fig.${kind}`] = { w: 0, d: 0, height: 14, bounds: [-14, -30, 14, 6], shadows: [], draw: (g, x, y) => fig(g, x, y, kind) };
}
// Units stand UNIT_SCALE times as tall, so their slots are that much bigger (the soldier's spear is the tallest point).
FIGURE_ART['fig.raider'] = { w: 0, d: 0, height: 26, bounds: [-21, -45, 21, 9], shadows: [], draw: (g, x, y) => raider(g, x, y) };
FIGURE_ART['fig.soldier'] = { w: 0, d: 0, height: 34, bounds: [-21, -45, 21, 9], shadows: [], draw: (g, x, y) => soldier(g, x, y) };
