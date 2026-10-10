// Housing tiers 1-4, ported line for line from the approved mock-up (v4-new-era-style.html, H1-H4).
// Tiers 5-9 arrive in Stage 2 and follow the same pattern.
import { box, tb, qd, crs, door, win, parapet, mat, pots, fence, stairs, awn, p, U } from './primitives.js';
import { MUD, MUD2, WASH, WASH2, THATCH, BLUE, GOLD, RED, PINK, GREEN, GREEN_DARK, TEAL } from './palette.js';
import { boundsFor } from '../iso.js';

// Hut: a mud-brick cube with a tall thatched roof, a woven door, a reed fence and a pot.
export function H1(g, x, y) {
  const a = x + 0.22, b = y + 0.22, w = 0.56;
  const F = box(g, a, b, w, w, 5.5, 0, MUD);
  crs(g, F, 5.5, '#9C7A54', 2.2);
  qd(g, F.L, 0.36, 0.62, 0, 3.8, '#4A3218');
  for (let u = 0.39; u < 0.6; u += 0.055) g.line(F.L(u, 0), F.L(u, 3.8), '#B08C50', 0.4, 0.8);
  const R = tb(g, a - 0.07, b - 0.07, w + 0.14, w + 0.14, 5.5, 5.5, 0.36, THATCH);
  for (let u = 0.08; u < 0.95; u += 0.14) {
    g.line(R.L(u, 0), R.L(0.5 + (u - 0.5) * 0.25, 4.8), '#AC8840', 0.4, 0.7);
    g.line(R.R(u, 0), R.R(0.5 + (u - 0.5) * 0.25, 4.8), '#8E7058', 0.4, 0.7);
  }
  fence(g, x + 0.06, y + 0.86, 0.6, 0.07);
  pots(g, p(x + 0.86, y + 0.6), 1);
}

// Shack: a taller mud block with a door, a window, a beamed flat roof and a pink mat.
export function H2(g, x, y) {
  const a = x + 0.14, b = y + 0.14, w = 0.66;
  const F = box(g, a, b, w, w, 7, 0, MUD2);
  crs(g, F, 7, '#9C7A54', 2.3);
  door(g, F, 0.36, 0.6, 4.4);
  win(g, F.R, 0.35, 0.55, 3.5, 5.2);
  box(g, a - 0.03, b - 0.03, w + 0.06, w + 0.06, 0.8, 7, ['#D8BC84', '#BEA064', '#A08878'], 0);
  for (let u = 0.12; u < 1; u += 0.16) g.line(U(p(a + u * w, b), 7.8), U(p(a + u * w, b + w), 7.8), '#B49660', 0.5, 0.8);
  mat(g, a + 0.12, b + 0.15, 0.3, 0.3, 7.85, PINK, null);
  pots(g, p(x + 0.9, y + 0.5), 2);
}

// Cottage: two whitewashed blocks, a blue-and-gold roof mat, windows and pots by the door.
export function H3(g, x, y) {
  const A = box(g, x + 0.1, y + 0.1, 0.65, 0.6, 9, 0, WASH);
  parapet(g, x + 0.1, y + 0.1, 0.65, 0.6, 9);
  mat(g, x + 0.2, y + 0.18, 0.35, 0.3, 9, BLUE, GOLD);
  win(g, A.R, 0.3, 0.5, 5, 7);
  win(g, A.L, 0.12, 0.28, 5, 7);
  const B = box(g, x + 0.5, y + 0.52, 0.42, 0.4, 6, 0, WASH2);
  parapet(g, x + 0.5, y + 0.52, 0.42, 0.4, 6);
  door(g, B, 0.3, 0.6, 4.4);
  pots(g, U(p(x + 0.74, y + 0.7), 6), 2);
}

// House: a tall block with a green awning on the roof terrace, an outside staircase and a low annexe.
export function H4(g, x, y) {
  const A = box(g, x + 0.08, y + 0.08, 0.62, 0.58, 12, 0, WASH);
  parapet(g, x + 0.08, y + 0.08, 0.62, 0.58, 12);
  win(g, A.R, 0.25, 0.45, 6.5, 9);
  win(g, A.L, 0.12, 0.3, 6.5, 9);
  awn(g, x + 0.12, y + 0.12, 0.48, 0.44, 16.2, GREEN, GREEN_DARK, TEAL);
  stairs(g, x + 0.1, y + 0.66, 0.4, 0.13, 11, 5, WASH2);
  const B = box(g, x + 0.55, y + 0.42, 0.38, 0.5, 7, 0, WASH2);
  parapet(g, x + 0.55, y + 0.42, 0.38, 0.5, 7);
  door(g, B, 0.3, 0.62, 4.6);
  mat(g, x + 0.6, y + 0.48, 0.26, 0.3, 7, GOLD, RED);
  pots(g, U(p(x + 0.86, y + 0.5), 7), 1);
}

// Shadow blocks are the mock-up's shd(...) calls, relative to the footprint origin.
export const HOUSE_ART = {
  'house.t1': { w: 1, d: 1, height: 12, bounds: boundsFor(1, 1, 12), shadows: [[0.22, 0.22, 0.56, 0.56, 9]], draw: H1 },
  'house.t2': { w: 1, d: 1, height: 8, bounds: boundsFor(1, 1, 8), shadows: [[0.14, 0.14, 0.66, 0.66, 10]], draw: H2 },
  'house.t3': { w: 1, d: 1, height: 9, bounds: boundsFor(1, 1, 9), shadows: [[0.1, 0.1, 0.65, 0.6, 12], [0.5, 0.52, 0.42, 0.4, 8]], draw: H3 },
  'house.t4': { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.08, 0.08, 0.62, 0.58, 16], [0.55, 0.42, 0.38, 0.5, 9]], draw: H4 },
};
