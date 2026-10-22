// Housing tiers 1-9, ported line for line from the approved mock-up (v4-new-era-style.html, H1-H5 and big()).
// Tiers 6-9 are 2x2. Spec 4.6 gives tiers 5-9 one roof tell each, kept by the tiers above: the striped awning (5,
// on the annexe of the big homes), a vine pergola over the roof mat (6), a roof garden on the annexe (7), painted
// parapet bands (8) and a flag with a roof pool (9). The awning, bands and flag are the mock-up's own; big() adds
// the rest, each on its own patch of roof so none hides another.
import {
  box, tb, qd, crs, door, win, parapet, mat, rug, pots, fence, stairs, ladder, awn, col, bed, pool, statue, p, U, quad,
} from './primitives.js';
import { palmAt } from './nature.js';
import {
  MUD, MUD2, WASH, WASH2, STONE, THATCH, GOLDC, BLUE, GOLD, RED, RED_DARK, PINK, ORANGE, GREEN, GREEN_DARK, TEAL, TEAL_DARK,
  PURP, WOOD, LEAF, LEAF2, LEAF3, SHADOW,
} from './palette.js';
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

// Townhouse: a tall block banded in teal and red under its parapet, a teal striped awning on the roof terrace (the
// tier-5 tell), an outside staircase, a ladder up from the annexe roof and a pink-and-gold mat on the annexe.
export function H5(g, x, y) {
  const A = box(g, x + 0.08, y + 0.08, 0.6, 0.56, 17, 0, WASH);
  parapet(g, x + 0.08, y + 0.08, 0.6, 0.56, 17);
  qd(g, A.L, 0, 1, 15.6, 16.6, TEAL);
  qd(g, A.R, 0, 1, 15.6, 16.6, TEAL_DARK);
  qd(g, A.L, 0, 1, 14.8, 15.6, RED);
  qd(g, A.R, 0, 1, 14.8, 15.6, RED_DARK);
  win(g, A.L, 0.15, 0.3, 10, 12.5);
  win(g, A.L, 0.55, 0.7, 10, 12.5);
  win(g, A.R, 0.25, 0.42, 10, 12.5);
  win(g, A.R, 0.25, 0.42, 4, 6.5);
  awn(g, x + 0.12, y + 0.12, 0.44, 0.42, 21.2, TEAL, TEAL_DARK);
  pots(g, U(p(x + 0.58, y + 0.2), 17), 2);
  stairs(g, x + 0.1, y + 0.64, 0.36, 0.13, 9.5, 5, WASH2);
  const B = box(g, x + 0.52, y + 0.44, 0.4, 0.48, 10, 0, WASH2);
  parapet(g, x + 0.52, y + 0.44, 0.4, 0.48, 10);
  door(g, B, 0.3, 0.62, 5);
  mat(g, x + 0.57, y + 0.5, 0.3, 0.36, 10, PINK, GOLD);
  ladder(g, U(p(x + 0.6, y + 0.68), 10), U(p(x + 0.6, y + 0.64), 17.5));
}

// The roof tells the mock-up lacked. Each sits on its own patch of roof, so a tier keeps the tells below it.
const BEAM = '#8A6448', SLAT = '#A9805A';
const FLOWERS = [RED, GOLD, '#FFFFFF', PINK];
export const PERGOLA = { x: 0.2, y: 0.16, w: 0.52, d: 0.46, h: 5 };   // over the main roof's mat, relative to the footprint
export const ROOF_GARDEN = { x: 1.34, y: 0.8, w: 0.48, d: 0.46 };      // the front half of the annexe roof
export const ROOF_POOL = { x: 0.84, y: 0.5, w: 0.38, d: 0.32 };         // the main roof's front right corner

// Tier 6: a timber pergola over the roof mat: four posts, two beams, six slats whose shadows stripe the mat, and a
// vine climbing the front post into the back corner.
function pergola(g, x, y, z) {
  const { w, d, h } = PERGOLA, x0 = x + PERGOLA.x, y0 = y + PERGOLA.y;
  for (let i = 0; i <= 5; i++) {                                   // the slats' shadows fall on the roof
    const u = x0 + 0.06 + (w * i) / 5;
    g.line(U(p(u, y0 + 0.02), z), U(p(u, y0 + d - 0.02), z), SHADOW, 1.2, 0.18);
  }
  for (const [a, b] of [[x0, y0], [x0 + w, y0], [x0, y0 + d], [x0 + w, y0 + d]]) {
    const q = U(p(a, b), z);
    g.line(q, U(q, h), WOOD, 1);
  }
  for (const v of [0, d]) g.line(U(p(x0 - 0.05, y0 + v), z + h), U(p(x0 + w + 0.05, y0 + v), z + h), BEAM, 1.2);
  for (let i = 0; i <= 5; i++) {
    const u = x0 + (w * i) / 5;
    g.line(U(p(u, y0 - 0.06), z + h + 0.7), U(p(u, y0 + d + 0.06), z + h + 0.7), SLAT, 1);
  }
  const foot = U(p(x0, y0 + d), z);                                // the vine: up the front post, along the back beam
  g.stroke([['M', foot], ['Q', U(p(x0 + 0.03, y0 + d), z + h * 0.5), U(p(x0, y0 + d), z + h)]], LEAF3, 0.9);
  for (const [u, v, r, c] of [[0, 1, 1.3, LEAF], [0, 0.72, 1.1, LEAF2], [0, 0.4, 1.2, LEAF3], [0.04, 0, 1.4, LEAF], [0.24, 0, 1.2, LEAF2], [0.46, 0, 1.1, LEAF3]]) {
    g.circ(U(p(x0 + w * u, y0 + d * v), z + h + 0.9), r, c);
  }
  g.circ(U(p(x0 + w * 0.24, y0), z + h + 1.6), 0.6, PINK);
}

// Tier 7: a roof garden on the annexe, in front of its awning: a planter of dark soil with shrubs and flowers.
function roofGarden(g, x, y, z) {
  const { w, d } = ROOF_GARDEN, x0 = x + ROOF_GARDEN.x, y0 = y + ROOF_GARDEN.y;
  const P = box(g, x0, y0, w, d, 1.4, z, MUD2, 0);
  qd(g, P.L, 0, 1, 0.5, 0.9, GOLD, { alpha: 0.7 });
  g.poly(quad(x0 + 0.03, y0 + 0.03, w - 0.06, d - 0.06, z + 1.4), '#5A7A34');
  const spots = [[0.2, 0.25], [0.55, 0.2], [0.82, 0.3], [0.3, 0.6], [0.66, 0.58], [0.2, 0.85], [0.52, 0.86], [0.84, 0.78]];
  spots.forEach(([u, v], i) => {
    const q = U(p(x0 + w * u, y0 + d * v), z + 1.4);
    g.circ(U(q, 1.4), 1.8, [LEAF3, LEAF, LEAF2][i % 3], { outline: true });
    if (i % 2 === 0) g.circ(U(q, 2.4), 0.7, FLOWERS[(i / 2) % 4]);
  });
}

// Tier 9: a small pool on the main roof, beside the flag.
function roofPool(g, x, y, z) {
  const { w, d } = ROOF_POOL, x0 = x + ROOF_POOL.x, y0 = y + ROOF_POOL.y;
  g.poly(quad(x0 - 0.04, y0 - 0.04, w + 0.08, d + 0.08, z + 0.2), '#E4D6BC');
  g.poly(quad(x0, y0, w, d, z + 0.2), '#4FB3B5');
  g.poly(quad(x0 + 0.03, y0 + 0.03, w - 0.06, d * 0.35, z + 0.2), '#7FD0CC', { alpha: 0.6 });
  g.line(U(p(x0 + w * 0.25, y0 + d * 0.62), z + 0.2), U(p(x0 + w * 0.65, y0 + d * 0.62), z + 0.2), '#D7F0EE', 0.7);
}

// The 2x2 homes, Manor and up: a main block at the back with a roof mat and pots, a walled courtyard in front of
// it and an annexe down the right side with an awning on its roof. O picks each tier's look, as in the mock-up:
// the block heights hA and hB, the wall tones of the main block (and courtyard walls) and the annexe, painted
// bands, columns, a pool, a rug and a flower bed, a statue, palms, a flag, the annexe awning's colours and the
// courtyard floor. Every big home has the pergola (the tier-6 tell); O.tier adds the roof garden from 7 and the
// roof pool at 9 (the bands and the flag are the mock-up's own options). A main block over 15 has a second row of
// windows and one over 20 a third.
export function big(g, x, y, O) {
  const tier = O.tier || 6;
  const A = box(g, x + 0.1, y + 0.1, 1.2, 0.82, O.hA, 0, O.wall);
  parapet(g, x + 0.1, y + 0.1, 1.2, 0.82, O.hA);
  for (const [s0, s1, c] of O.bands || [[O.hA - 1.4, O.hA - 0.6, TEAL]]) {
    qd(g, A.L, 0, 1, s0, s1, c);
    qd(g, A.R, 0, 1, s0, s1, c, { alpha: 0.8 });
  }
  door(g, A, 0.42, 0.56, 7);
  for (const u of [0.1, 0.24, 0.72, 0.86]) win(g, A.L, u, u + 0.07, 4, 7);
  if (O.hA > 15) for (const u of [0.1, 0.24, 0.72, 0.86]) win(g, A.L, u, u + 0.07, 9.5, 12);
  if (O.hA > 20) for (const u of [0.1, 0.24, 0.72, 0.86]) win(g, A.L, u, u + 0.07, 15, 17.5);
  win(g, A.R, 0.3, 0.5, 4, 7);
  mat(g, x + 0.25, y + 0.2, 0.4, 0.35, O.hA, BLUE, GOLD);
  if (tier >= 9) roofPool(g, x, y, O.hA);
  pots(g, U(p(x + 0.95, y + 0.3), O.hA), 2);
  pergola(g, x, y, O.hA);
  if (O.flag) {
    const q = U(p(x + 1.1, y + 0.25), O.hA);
    g.line(q, U(q, 14), WOOD, 0.7);
    g.poly([U(q, 14), [q[0] + 7, q[1] - 12.5], U(q, 11)], PINK);
  }
  g.poly(quad(x + 0.15, y + 0.95, 1.07, 0.91, 0), O.floor || '#EEE2CA');
  box(g, x + 0.1, y + 0.95, 0.08, 0.9, 3.5, 0, O.wall, 0);
  if (O.cols) {
    for (const u of O.cols) col(g, x + u, y + 1.02, O.colH || 9, 0, O.cap);
    box(g, x + 0.18, y + 0.9, 1.08, 0.22, 1.2, (O.colH || 9) + 1.6, STONE, 0);
  }
  if (O.pool) pool(g, x + 0.32, y + 1.24, 0.6, 0.3);
  if (O.rug) rug(g, x + 0.28, y + 1.2, 0.5, 0.3, 0, RED, '#F2D7A8', GOLD);
  if (O.bed) bed(g, x + 0.3, y + 1.56, 0.55, 0.22);
  if (O.statue) statue(g, x + 0.28, y + 1.66);
  const B = box(g, x + 1.25, y + 0.1, 0.65, 1.25, O.hB, 0, O.wall2);
  parapet(g, x + 1.25, y + 0.1, 0.65, 1.25, O.hB);
  door(g, B, 0.35, 0.65, 5.5);
  win(g, B.R, 0.2, 0.35, 4, 6.5);
  win(g, B.R, 0.6, 0.75, 4, 6.5);
  if (O.bands) {
    qd(g, B.L, 0, 1, O.hB - 1.4, O.hB - 0.6, TEAL);
    qd(g, B.R, 0, 1, O.hB - 1.4, O.hB - 0.6, TEAL, { alpha: 0.8 });
  }
  awn(g, x + 1.32, y + 0.18, 0.5, 0.55, O.hB + 4.2, O.awn || ORANGE, O.awn2 || '#B45F2A');
  if (tier >= 7) roofGarden(g, x, y, O.hB);
  for (const [u, v] of O.palms || []) palmAt(g, x + u, y + v, 0.72);
  box(g, x + 1.82, y + 1.35, 0.08, 0.5, 3.5, 0, O.wall, 0);
  box(g, x + 0.1, y + 1.8, 0.72, 0.1, 3.5, 0, O.wall, 0);
  box(g, x + 0.74, y + 1.76, 0.1, 0.18, 5.5, 0, O.wall, 0);
  box(g, x + 1.16, y + 1.76, 0.1, 0.18, 5.5, 0, O.wall, 0);
  box(g, x + 1.18, y + 1.8, 0.72, 0.1, 3.5, 0, O.wall, 0);
}

// Wall tones for the big homes above the Manor, [top, lit, shaded] as in the palette, each with a slightly deeper
// second for the annexe as WASH2 is to WASH. Spec 5.3 gives every tier its own tone: the Manor keeps the mock-up's
// whitewash and the tiers above warm through cream and pale ochre to a rose plaster, the shaded faces staying a
// cool lavender.
const CREAM = ['#FCF0D6', '#F4DCB0', '#CFB7BD'], CREAM2 = ['#F8EBCD', '#EED5A7', '#C8AFB6'];
const OCHRE = ['#F6DFAC', '#E9C484', '#C2A2A0'], OCHRE2 = ['#F2D8A2', '#E2BC7B', '#BB9A9A'];
const ROSE = ['#F6D6C4', '#E4AE94', '#B48E9E'], ROSE2 = ['#F2CFBC', '#DDA68B', '#AD8798'];

// The mock-up's four variants (H6-H9), keyed by tier, with the main block 3 art px and the annexe 2 taller at
// each tier and a wall tone per tier so the four tell apart by height and tone alone (spec 5.3). The bands sit
// where the mock-up put them, under the parapet.
export const BIG = {
  6: { hA: 13, hB: 10, wall: WASH, wall2: WASH2, rug: 1, bed: 1, palms: [[1.02, 1.6]] },
  7: {
    hA: 16, hB: 12, wall: CREAM, wall2: CREAM2, cols: [0.35, 0.65, 0.95], rug: 1, bed: 1, palms: [[1.05, 1.62]],
    awn: GREEN, awn2: GREEN_DARK,
  },
  8: {
    hA: 19, hB: 14, wall: OCHRE, wall2: OCHRE2, cols: [0.35, 0.65, 0.95], pool: 1, palms: [[0.22, 1.7], [1.05, 1.62]],
    awn: TEAL, awn2: TEAL_DARK, bands: [[17.6, 18.4, TEAL], [16.8, 17.6, RED]],
  },
  9: {
    hA: 22, hB: 16, wall: ROSE, wall2: ROSE2, cols: [0.3, 0.55, 0.8, 1.05], colH: 11, cap: GOLDC, pool: 1, statue: 1,
    palms: [[1.08, 1.62]], bands: [[20.6, 21.4, GOLD], [19.8, 20.6, TEAL], [19, 19.8, RED]], flag: 1, awn: PURP,
    awn2: '#563E78', floor: '#F2E8D2',
  },
};
export const H6 = (g, x, y) => big(g, x, y, { ...BIG[6], tier: 6 });
export const H7 = (g, x, y) => big(g, x, y, { ...BIG[7], tier: 7 });
export const H8 = (g, x, y) => big(g, x, y, { ...BIG[8], tier: 8 });
export const H9 = (g, x, y) => big(g, x, y, { ...BIG[9], tier: 9 });

// A 2x2 home's slot: the mock-up's two shadow blocks (its shd calls) for the variant. height is the top of the
// tallest thing on it: the pergola's vine (main block + 5 + 0.9 + its leaves), or the flag at 9.
const bigSlot = (t, height, draw) => ({
  w: 2, d: 2, height, bounds: boundsFor(2, 2, height),
  shadows: [[0.1, 0.1, 1.2, 0.82, BIG[t].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[t].hB + 3]], draw,
});

// Version 6.0 (Track C): an empty Large plot, a 2x2 lot marked out for a grand home: a low pale plinth with a surveyor's cross on it, a gold cord round its edge
// and a stake at each corner, the front one flying a red pennant. The shape says "empty lot" (a ring and a cross, nothing built); it never relies on colour.
// Static: nothing moves, so it reads the same under Gentle and Still.
const LOT = { slab: ['#EFE4C8', '#E2D2AC', '#BDB0B6'], cord: GOLD, cross: '#B79A62', stake: WOOD, flag: RED };
export function LotPlot(g, x, y) {
  const h = 0.7;
  box(g, x + 0.04, y + 0.04, 1.92, 1.92, h, 0, LOT.slab, 0);
  const a = [x + 0.14, y + 0.14], b = [x + 1.86, y + 0.14], c = [x + 1.86, y + 1.86], d = [x + 0.14, y + 1.86];
  const at = (pt) => U(p(pt[0], pt[1]), h);
  for (const [s, e] of [[a, b], [b, c], [c, d], [d, a]]) g.line(at(s), at(e), LOT.cord, 0.9);
  g.line(at(a), at(c), LOT.cross, 0.6, 0.85);
  g.line(at(b), at(d), LOT.cross, 0.6, 0.85);
  for (const pt of [a, b, d, c]) {
    const q = at(pt), top = U(q, 6);
    g.line(q, top, LOT.stake, 0.8);
    if (pt === c) g.poly([top, [top[0] + 4.2, top[1] + 1.4], [top[0], top[1] + 2.8]], LOT.flag);
  }
}

// Shadow blocks are the mock-up's shd(...) calls, relative to the footprint origin.
export const HOUSE_ART = {
  'house.lot': { w: 2, d: 2, height: 9, bounds: boundsFor(2, 2, 9), shadows: [[0.04, 0.04, 1.92, 1.92, 1]], draw: LotPlot },
  'house.t1': { w: 1, d: 1, height: 12, bounds: boundsFor(1, 1, 12), shadows: [[0.22, 0.22, 0.56, 0.56, 9]], draw: H1 },
  'house.t2': { w: 1, d: 1, height: 8, bounds: boundsFor(1, 1, 8), shadows: [[0.14, 0.14, 0.66, 0.66, 10]], draw: H2 },
  'house.t3': { w: 1, d: 1, height: 9, bounds: boundsFor(1, 1, 9), shadows: [[0.1, 0.1, 0.65, 0.6, 12], [0.5, 0.52, 0.42, 0.4, 8]], draw: H3 },
  'house.t4': { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.08, 0.08, 0.62, 0.58, 16], [0.55, 0.42, 0.38, 0.5, 9]], draw: H4 },
  'house.t5': { w: 1, d: 1, height: 23, bounds: boundsFor(1, 1, 23), shadows: [[0.08, 0.08, 0.6, 0.56, 21], [0.52, 0.44, 0.4, 0.48, 13]], draw: H5 },
  'house.t6': bigSlot(6, 21, H6),
  'house.t7': bigSlot(7, 24, H7),
  'house.t8': bigSlot(8, 27, H8),
  'house.t9': bigSlot(9, 36, H9),
};
