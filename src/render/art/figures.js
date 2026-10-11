// Small people, ported from the mock-up's fig(). Walkers (walkers.js) pick a kind per service; the hauler
// carries a mud brick for the work gang that raises a new building (early-game pass 2.4) and, in Stage 4,
// the monument crews.
import { p, U } from './primitives.js';
import { SHADOW, TEAL, BLUE, GOLD, ORANGE, WOOD, MUD } from './palette.js';

export const FIGURE_KINDS = ['citizen', 'woman', 'water', 'porter', 'priest', 'farmer', 'noble', 'fisher', 'hauler'];

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
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], kind === 'noble' ? GOLD : (kind === 'woman' ? TEAL : BLUE), 1 * s);
  if (kind === 'priest') g.line([X - 1.6 * s, Y - 8.2 * s], [X + 1.4 * s, Y - 5.5 * s], ORANGE, 1 * s);
  if (kind === 'woman') g.ell([X - 0.5 * s, Y - 9.6 * s], 1.7 * s, 2.4 * s, hair);
  if (kind !== 'priest') g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  if (kind === 'water') g.ell([X + 2.4 * s, Y - 9.4 * s], 1.5 * s, 1.8 * s, '#C9552F', { outline: true });
  if (kind === 'porter') g.ell([X, Y - 12.8 * s], 2.6 * s, 1.2 * s, '#D9B060', { outline: true });
  if (kind === 'farmer') g.line([X + 2.4 * s, Y - 5 * s], [X + 5 * s, Y + 0.8 * s], WOOD, 0.8 * s);
  if (kind === 'hauler') brick(g, X + 0.2 * s, Y - 12.4 * s, s);
  if (kind === 'fisher') {
    g.line([X + 2.4 * s, Y - 6 * s], [X + 10 * s, Y - 15 * s], WOOD, 0.6);
    g.line([X + 10 * s, Y - 15 * s], [X + 12 * s, Y + 2 * s], '#EDE6D2', 0.3);
  }
}

// A hauler at tile point (gx, gy), bouncing one step per `phase` cycle (0..1).
export function hauler(g, gx, gy, phase = 0) {
  fig(g, gx, gy, 'hauler', Math.abs(Math.sin(phase * Math.PI)) * 1.4);
}

export const FIGURE_ART = {};
for (const kind of FIGURE_KINDS) {
  FIGURE_ART[`fig.${kind}`] = { w: 0, d: 0, height: 14, bounds: [-14, -30, 14, 6], shadows: [], draw: (g, x, y) => fig(g, x, y, kind) };
}
