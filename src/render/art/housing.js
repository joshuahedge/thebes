// Housing tiers 1-9, ported line for line from the approved mock-up (v4-new-era-style.html, H1-H5 and big()).
// Tiers 6-9 are 2x2. Spec 4.6 gives tiers 5-9 one roof tell each, kept by the tiers above: the striped awning (5,
// on the annexe of the big homes), a vine pergola over the roof mat (6), a roof garden on the annexe (7), painted
// parapet bands (8) and a flag with a roof pool (9). The awning, bands and flag are the mock-up's own; big() adds
// the rest, each on its own patch of roof so none hides another.
import {
  box, tb, qd, crs, door, win, parapet, mat, rug, pots, fence, stairs, ladder, awn, col, bed, pool, statue, p, U, quad,
  shadeWall, silhouette, contactLine, insetOpening, parapetSteps, awning, cornice, band, porch, gildedCap,
} from './primitives.js';
import { palmAt } from './nature.js';
import {
  MUD, MUD2, WASH, WASH2, STONE, THATCH, GOLDC, BLUE, GOLD, RED, RED_DARK, PINK, ORANGE, GREEN, GREEN_DARK, TEAL, TEAL_DARK,
  PURP, WOOD, LEAF, LEAF2, LEAF3, SHADOW, INK, DOOR, WINDOW, PARAPET, POT, POT_LIGHT,
} from './palette.js';
import { MATERIALS, BAND2 } from './materials.js';
import { withLooks, EXPANDED } from './expand.js';
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
function pergola(g, x, y, z, R = PERGOLA) {
  const { w, d } = R, h = PERGOLA.h, x0 = x + R.x, y0 = y + R.y;
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
function roofGarden(g, x, y, z, R = ROOF_GARDEN) {
  const { w, d } = R, x0 = x + R.x, y0 = y + R.y;
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
function roofPool(g, x, y, z, R = ROOF_POOL) {
  const { w, d } = R, x0 = x + R.x, y0 = y + R.y;
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

// Shadow blocks are the mock-up's shd(...) calls, relative to the footprint origin. Version 9.3: these are today's drawings, kept as the look sheet's
// "today" column and for the older pixel tests; the game draws HOUSE_ART below.
export const HOUSE_TODAY = {
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

// =====================================================================================================================================================
// Version 9.3, Track H (spec sections 2, 4 and 7; rulings 1890-1899): every home tier in four looks and three variants, and a plain far drawing.
//   The look sets the materials (MATERIALS[look]); the tier sets the size and the roof tell; the variant sets the massing, so the three tell apart at map
//   zoom (Josh's note on the look sheet): v0 is the tier's own block (a single block, or a block and annexe), v1 steps up (a tall back block and a low front
//   one with an outside stair; a tower), v2 is a courtyard (a low block, a walled court with a palm and a wind-catcher; a set-back top storey). Doors and
//   awnings keep their colour in every look. Nothing here mirrors a drawing: the lit face is on the same side in all of them.
const M = MATERIALS;
const DOORC = [TEAL_DARK, '#9A3A30', '#245A88'];   // a painted door by variant
const CANOPY = [RED, TEAL, BLUE, GOLD];
const PALE = [PARAPET, '#ECE2D2', '#C6BACB'];
const STAIR = ['#E7DDCC', '#D9CFBE', '#B6AAB8'];
const JAR2 = '#E9C08A';
const TIMBER = ['#9A7448', '#8A6A4A', '#6B4A3A'];
const GOLDEN = [GOLDC[0], GOLDC[1], GOLDC[2]];

let PROBE = null;   // set while homeDoor runs a drawing against nothing, to read where its main door stands

// A wall block at the new bar: the faces, a soft shade down each, the silhouette and the contact line where it meets the ground.
function block(g, x, y, w, d, h, z, C) {
  const F = box(g, x, y, w, d, h, z, C);
  shadeWall(g, [F.L(0, 0), F.L(1, 0), F.L(1, h), F.L(0, h)], h);
  shadeWall(g, [F.R(0, 0), F.R(1, 0), F.R(1, h), F.R(0, h)], h);
  silhouette(g, x, y, w, d, h, z);
  if (z === 0) contactLine(g, [x, y, w, d]);
  return F;
}

const jar = (g, q, c = POT, sc = 1) => {
  g.ell([q[0], q[1] + 0.2], 1.7 * sc, 0.6 * sc, SHADOW, { alpha: 0.18 });
  g.ell(U(q, 1.7 * sc), 1.7 * sc, 1.9 * sc, c, { outline: true });
  g.ell([q[0] - 0.55 * sc, q[1] - 2.2 * sc], 0.5 * sc, 0.8 * sc, POT_LIGHT, { alpha: 0.75 });
  g.ell(U(q, 3.5 * sc), 1 * sc, 0.4 * sc, '#6A3A24');
};

const thatch = (g, x, y, w, d, z, h, i = 0.36) => {
  const R = tb(g, x, y, w, d, h, z, i, THATCH);
  for (let u = 0.08; u < 0.95; u += 0.14) {
    g.line(R.L(u, 0), R.L(0.5 + (u - 0.5) * 0.25, h * 0.88), '#AC8840', 0.45, 0.75);
    g.line(R.R(u, 0), R.R(0.5 + (u - 0.5) * 0.25, h * 0.88), '#8E7058', 0.45, 0.75);
  }
  g.line(R.L(0.5, h * 0.9), R.R(0.5, h * 0.9), '#8E7058', 0.6, 0.5);
  return R;
};

// A flat roof at the look's bar: a terrace slab and a plain parapet (Village, Town), or a cornice and a stepped parapet (City, Capital).
function roofTop(g, x, y, w, d, z, look, n = 3) {
  const m = M[look];
  if (look <= 1) {
    box(g, x + 0.02, y + 0.02, w - 0.04, d - 0.04, 0.9, z, PALE);
    g.poly(quad(x + 0.08, y + 0.08, w - 0.16, d - 0.16, z + 0.9), look === 0 ? '#D8BC84' : m.cornice[1], { alpha: 0.9 });
  } else {
    cornice(g, { x, y, w, d, z }, m.cornice);
    g.poly(quad(x + 0.04, y + 0.04, w - 0.08, d - 0.08, z), m.roof[0]);
    parapetSteps(g, { x, y, w, d, z, C: look === 3 ? [m.roof[0], m.roof[1], m.roof[2]] : undefined }, n, look === 3 ? 1.4 : 1.2);
  }
}
const roofZ = (look) => (look <= 1 ? 0.9 : 0.2);   // how high a roof's surface stands above its block's top

function dovecote(g, x, y, z, C, look) {
  const F = box(g, x, y, 0.2, 0.2, 3.4, z, C, 0);
  qd(g, F.L, 0.2, 0.42, 1.4, 2.4, INK, { alpha: 0.8 });
  qd(g, F.L, 0.56, 0.78, 1.4, 2.4, INK, { alpha: 0.8 });
  box(g, x - 0.02, y - 0.02, 0.24, 0.24, 0.7, z + 3.4, look === 3 ? GOLDEN : PALE, 0);
}

function linen(g, x, y, z) {
  const a = U(p(x, y), z), b = U(p(x + 0.45, y + 0.02), z);
  g.line(U(a, 0), U(a, 4), WOOD, 0.5); g.line(U(b, 0), U(b, 4), WOOD, 0.5);
  g.line(U(a, 4), U(b, 4), WOOD, 0.4, 0.8);
  [['#FFFFFF', 0.15], [PINK, 0.45], ['#F7F2E8', 0.75]].forEach(([c, t]) => {
    const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4];
    g.poly([[q[0] - 1.4, q[1]], [q[0] + 1.4, q[1] + 0.5], [q[0] + 1.3, q[1] + 3.8], [q[0] - 1.5, q[1] + 3.3]], c, { outline: true });
  });
}

// The look's finish on a wall block: mud courses (Village), a painted foot (Town), bands under the cornice (City, Capital). n is how many bands a big home carries.
function skin(g, F, h, look, n = 0) {
  const m = M[look];
  if (look === 0) crs(g, F, h, '#9C7A54', 2.4);
  if (look === 1) band(g, F, n ? h - 3.2 : 0.9, m.band, n ? 1.2 : 1.0);
  if (look === 2) { band(g, F, h - 3.4, m.band, 1.3); band(g, F, h - 5, BAND2[2], 0.8); }
  if (look === 3) { band(g, F, h - 3.8, m.band, 1.0); band(g, F, h - 5.2, GOLD, 0.6); }
  if (n > 1 && look <= 1) band(g, F, h - 4.8, look === 0 ? BAND2[0] : BAND2[1], 0.8);
  if (n > 2 && look <= 1) band(g, F, h - 6.2, GOLD, 0.7);
  if (n > 1 && look >= 2) band(g, F, h - 6.8, look === 2 ? BAND2[3] : TEAL, 0.7);
  if (n > 2 && look >= 2) band(g, F, h - 8.2, look === 2 ? RED : GOLD, 0.6);
}

// The door on a block's lit face. R is the block's [x, y, w, d]; the first `main` door of a drawing is the one homeDoor reports.
function doorOn(g, R, A, u, w, h, fill, trim, main = true) {
  if (main && PROBE && !PROBE.door) PROBE.door = { cx: R[0] + (R[2] * (2 * u + w)) / 2, fy: R[1] + R[3], hw: (R[2] * w) / 2, h };
  insetOpening(g, { F: A.L, u, s: 0 }, w, h, { lintel: trim, fill });
}
const openWin = (g, F, u, s, w, h, trim, lit = false) => insetOpening(g, { F, u, s }, w, h, { lintel: trim, fill: WINDOW, lit });

// A timber balcony on a shaded face (City): a slab, a rail and its balusters. x is the face's x, y0..y0+len along it, z the slab's height.
function balcony(g, x, y0, len, z) {
  box(g, x, y0, 0.13, len, 0.8, z, TIMBER, 0);
  for (let u = 0.08; u < 1; u += 0.12) g.line(U(p(x + 0.13, y0 + len * u), z + 0.8), U(p(x + 0.13, y0 + len * u), z + 3.4), WOOD, 0.35, 0.9);
  g.line(U(p(x + 0.13, y0), z + 3.4), U(p(x + 0.13, y0 + len), z + 3.4), WOOD, 0.6);
}

// A small porch at a door (Capital): at is the ground point under the porch's left pillar.
const doorPorch = (g, x, y, w, h = 5.4) => porch(g, p(x, y + 0.01), w, h);

// ---- tier 1: the hut --------------------------------------------------------------------------------------------------------------------
function hutHome(g, x, y, look, v, far) {
  const m = M[look], trim = look === 0 ? WOOD : m.trim, dc = look === 0 ? '#4A3218' : DOORC[v];
  const hh = [6, 6, 8, 9.5][look], wallC = look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall;
  if (v === 0) {                                                  // a square hut
    const R = [x + 0.22, y + 0.22, 0.56, 0.56];
    const F = block(g, ...R, hh, 0, m.wall);
    skin(g, F, hh, look);
    doorOn(g, R, F, 0.34, 0.28, 4.3, dc, look === 0 ? WOOD : trim);
    openWin(g, F.R, 0.36, 2.6, 0.26, 2.2, trim);
    if (look <= 1) thatch(g, R[0] - 0.07, R[1] - 0.07, R[2] + 0.14, R[3] + 0.14, hh, 5.2);
    else roofTop(g, ...R, hh, look, 2);
    if (look === 1 && !far) awning(g, { F: F.L, u: 0.22, s: 5.2 }, 0.42, TEAL);
    if (look === 0) {
      const fence = box(g, x + 0.06, y + 0.88, 0.62, 0.06, 2.6, 0, ['#DDB872', '#CCA463', '#A48474'], 0);
      for (let u = 0.08; u < 1; u += 0.14) g.line(fence.L(u, 0), fence.L(u, 2.6), '#9C7A3A', 0.35);
    }
    if (!far) jar(g, p(x + 0.86, y + 0.66), POT, 0.9);
  } else if (v === 1) {                                           // a long low hut with a lean-to
    const R = [x + 0.1, y + 0.3, 0.8, 0.4], h = hh - 0.5;
    const F = block(g, ...R, h, 0, m.wall);
    skin(g, F, h, look);
    doorOn(g, R, F, 0.58, 0.2, 4.2, dc, trim);
    openWin(g, F.R, 0.3, 2.4, 0.3, 2.0, trim);
    if (look <= 1) thatch(g, R[0] - 0.06, R[1] - 0.06, R[2] + 0.12, R[3] + 0.12, h, 4.6, 0.3);
    else roofTop(g, ...R, h, look, 3);
    const L0 = [x + 0.12, y + 0.7, 0.34, 0.22];
    const LT = block(g, ...L0, 3.4, 0, m.wall);
    if (look === 0) crs(g, LT, 3.4, '#9C7A54', 1.7);
    if (look <= 1) thatch(g, L0[0] - 0.04, L0[1] - 0.04, L0[2] + 0.08, L0[3] + 0.08, 3.4, 2.4, 0.2);
    else roofTop(g, ...L0, 3.4, look, 2);
    if (look === 1 && !far) awning(g, { F: F.L, u: 0.5, s: 5.4 }, 0.36, RED);
    if (!far) jar(g, p(x + 0.8, y + 0.86), look === 0 ? POT : JAR2, 0.85);
  } else {                                                        // a tall narrow hut in a small pen
    const h = hh + 2, R = [x + 0.3, y + 0.16, 0.4, 0.4];
    box(g, x + 0.12, y + 0.62, 0.07, 0.3, 2.4, 0, wallC, 0);
    box(g, x + 0.8, y + 0.5, 0.07, 0.42, 2.4, 0, wallC, 0);
    const F = block(g, ...R, h, 0, m.wall);
    skin(g, F, h, look);
    doorOn(g, R, F, 0.3, 0.4, 4.4, dc, trim);
    openWin(g, F.R, 0.35, h - 4.4, 0.3, 2.2, trim);
    if (look <= 1) thatch(g, R[0] - 0.06, R[1] - 0.06, R[2] + 0.12, R[3] + 0.12, h, 5, 0.3);
    else { roofTop(g, ...R, h, look, 2); if (look === 3 && !far) gildedCap(g, U(p(x + 0.5, y + 0.36), h + 1.2), 1.6); }
    if (look === 1 && !far) awning(g, { F: F.L, u: 0.22, s: 5.8 }, 0.56, GOLD);
    box(g, x + 0.12, y + 0.86, 0.76, 0.06, 2.4, 0, wallC, 0);
    if (!far) { palmAt(g, x + 0.66, y + 0.76, 0.42); jar(g, p(x + 0.22, y + 0.8), look === 0 ? POT : JAR2, 0.8); }
  }
}

// ---- tiers 2-5: the shack, the cottage, the house and the townhouse --------------------------------------------------------------------------
// Heights by tier: [v0's main block, v1's tall back block, v1's low front block, v2's main block].
const TH = { 2: [7, 10, 5, 7], 3: [9, 13, 6.5, 8], 4: [12, 17, 8, 11.5], 5: [16, 21, 10, 14] };

function smallHome(g, x, y, look, tier, v, far) {
  const m = M[look], trim = look === 0 ? WOOD : m.trim, dc = DOORC[v], up = look >= 2 ? 1.5 : 0;
  const [h0, h1, h2, h3] = TH[tier];
  const wallC = look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall;
  const tall = tier >= 4;
  if (v === 0) {                                                  // the tier's own block
    if (!tall) {                                                  // a single block
      const R = tier === 2 ? [x + 0.14, y + 0.14, 0.66, 0.62] : [x + 0.08, y + 0.14, 0.82, 0.68], h = h0 + up;
      const A = block(g, ...R, h, 0, m.wall);
      skin(g, A, h, look);
      doorOn(g, R, A, 0.42, 0.2, 4.6, dc, trim);
      openWin(g, A.L, 0.12, 3.6, 0.16, 2.8, trim);
      if (tier === 3) openWin(g, A.L, 0.72, 3.6, 0.16, 2.8, trim);
      openWin(g, A.R, 0.35, 3.6, 0.26, 2.8, trim);
      roofTop(g, ...R, h, look, tier === 2 ? 3 : 4);
      const z0 = h + roofZ(look);
      if (tier === 2) {
        if (look === 0) { mat(g, R[0] + 0.12, R[1] + 0.15, 0.3, 0.3, z0, PINK, null); }
        else mat(g, R[0] + 0.12, R[1] + 0.15, 0.3, 0.3, z0, [BLUE, RED, TEAL][look - 1], look === 1 ? null : GOLD);
        if (look === 1 && !far) awning(g, { F: A.L, u: 0.34, s: 5.4 }, 0.36, CANOPY[look]);
      } else if (!far) {                                          // the canopy: four posts and a striped cloth
        const cx0 = x + 0.26, cy0 = y + 0.3, cw = 0.46, cd = 0.34;
        for (const [a, b] of [[cx0, cy0 + cd], [cx0 + cw, cy0 + cd], [cx0 + cw, cy0]]) g.line(U(p(a, b), z0), U(p(a, b), z0 + 5.4), WOOD, 0.7);
        g.poly(quad(cx0 - 0.04, cy0 - 0.04, cw + 0.08, cd + 0.08, z0 + 5.6), CANOPY[look], { outline: true });
        for (let u = 0.08; u < 0.95; u += 0.22) g.poly(quad(cx0 - 0.04 + (cw + 0.08) * u, cy0 - 0.04, (cw + 0.08) * 0.11, cd + 0.08, z0 + 5.6), '#F6ECD6', { alpha: 0.9 });
        if (look === 1) awning(g, { F: A.L, u: 0.34, s: 5.6 }, 0.36, CANOPY[look]);
      }
      if (look === 2 && !far) balcony(g, R[0] + R[2], R[1] + 0.12, 0.34, h * 0.45);
      if (look === 3 && !far && tier === 3) doorPorch(g, R[0] + R[2] * 0.39, R[1] + R[3], 8);
      if (!far) jar(g, p(x + 0.14 + (tier === 2 ? 0.76 : 0), y + 0.95), look === 0 ? POT : JAR2, 0.85);
    } else {                                                      // a tall block and a low annexe
      const A0 = [x + 0.08, y + 0.08, 0.6, 0.56], B0 = [x + 0.5, y + 0.44, 0.42, 0.48], hA = h0 + up, hB = (tier === 4 ? 7 : 10) + up * 0.5;
      const A = block(g, ...A0, hA, 0, m.wall), B = block(g, ...B0, hB, 0, m.wall);
      skin(g, A, hA, look, tier === 5 ? 2 : 0); skin(g, B, hB, look);
      openWin(g, A.R, 0.25, 6.5, 0.2, 3, trim);
      openWin(g, A.L, 0.12, 6.5, 0.18, 3, trim);
      if (tier === 5) { openWin(g, A.L, 0.55, 6.5, 0.16, 3, trim); openWin(g, A.L, 0.14, 10.5, 0.16, 2.8, trim); openWin(g, A.R, 0.25, 11, 0.2, 2.8, trim); }
      doorOn(g, B0, B, 0.3, 0.26, tier === 4 ? 4.6 : 5, dc, trim);
      roofTop(g, ...A0, hA, look, 3); roofTop(g, ...B0, hB, look, 3);
      if (!far) {
        const zA = hA + roofZ(look);
        awn(g, x + 0.12, y + 0.12, 0.44, 0.4, zA + 3.4, tier === 4 ? GREEN : TEAL, tier === 4 ? GREEN_DARK : TEAL_DARK, tier === 4 ? TEAL : undefined);
        stairs(g, x + 0.1, y + 0.66, 0.36, 0.13, tier === 4 ? 11 : 9.5, 5, STAIR);
        if (tier === 5) ladder(g, U(p(x + 0.6, y + 0.68), hB + roofZ(look)), U(p(x + 0.6, y + 0.64), hA + 0.5));
        if (tier === 4) dovecote(g, x + 0.68, y + 0.56, hB + roofZ(look), PALE, look);
        else mat(g, x + 0.57, y + 0.5, 0.3, 0.34, hB + roofZ(look), PINK, GOLD);
        pots(g, U(p(x + 0.58, y + 0.2), zA), 2);
        if (look === 1) awning(g, { F: B.L, u: 0.26, s: 5.8 }, 0.34, RED);
        if (look === 3) doorPorch(g, B0[0] + B0[2] * 0.3, B0[1] + B0[3], 7, 6);
      }
      if (look === 2 && !far) balcony(g, B0[0] + B0[2], B0[1] + 0.06, 0.34, hB * 0.4);
    }
  } else if (v === 1) {                                           // stepped: a tall back block, a low front block and a stair up to its roof
    const hA = h1 + up, hB = h2 + up * 0.5;
    const A0 = [x + 0.1, y + 0.1, 0.5, 0.48], B0 = [x + 0.34, y + 0.52, 0.58, 0.4];
    const A = block(g, ...A0, hA, 0, m.wall), B = block(g, ...B0, hB, 0, m.wall);
    skin(g, A, hA, look, tier === 5 ? 2 : 0); skin(g, B, hB, look);
    openWin(g, A.L, 0.12, hA - 7, 0.2, 3.4, trim);
    openWin(g, A.R, 0.3, hA - 7, 0.3, 3.4, trim);
    if (tall) { openWin(g, A.L, 0.12, hA - 12.5, 0.2, 3, trim); openWin(g, A.R, 0.3, hA - 12.5, 0.3, 3, trim); }
    doorOn(g, B0, B, 0.62, 0.22, 4.2 + (tier >= 4 ? 0.4 : 0), dc, trim);
    openWin(g, B.R, 0.35, 2.6, 0.3, 2.2, trim);
    roofTop(g, ...A0, hA, look, 3); roofTop(g, ...B0, hB, look, 3);
    stairs(g, x + 0.36, y + 0.93, 0.26, 0.09, hB + 0.9, 5, STAIR);
    g.line(U(p(x + 0.36, y + 0.93), 1), U(p(x + 0.62, y + 0.93), hB + 3), WOOD, 0.6, 0.9);
    if (!far) {
      const zA = hA + roofZ(look), zB = hB + roofZ(look);
      linen(g, x + 0.72, y + 0.62, zB);
      if (tier === 4) awn(g, x + 0.14, y + 0.14, 0.4, 0.36, zA + 3.4, GREEN, GREEN_DARK, TEAL);
      else if (tier === 5) awn(g, x + 0.14, y + 0.14, 0.4, 0.36, zA + 3.4, TEAL, TEAL_DARK);
      else if (tier === 3) dovecote(g, x + 0.36, y + 0.2, zA, PALE, look);
      else pots(g, U(p(x + 0.2, y + 0.3), zA), 1);
      if (tier >= 4) pots(g, U(p(x + 0.8, y + 0.78), zB), 1);
      if (look === 1) awning(g, { F: B.L, u: 0.54, s: 5 }, 0.36, TEAL);
      if (look === 2) balcony(g, A0[0] + A0[2], A0[1] + 0.1, 0.28, hA * 0.45);
      if (look === 3 && tier >= 3) doorPorch(g, B0[0] + B0[2] * 0.62, B0[1] + B0[3], 8, 5.6);
    }
  } else {                                                        // a courtyard: a low block, a walled court with a palm, a wind-catcher
    const h = h3 + up * 0.7, R = [x + 0.12, y + 0.08, 0.62, 0.5];
    box(g, x + 0.1, y + 0.58, 0.07, 0.34, 3.2, 0, wallC, 0);
    box(g, x + 0.83, y + 0.5, 0.07, 0.42, 3.2, 0, wallC, 0);
    const A = block(g, ...R, h, 0, m.wall);
    skin(g, A, h, look, tier === 5 ? 1 : 0);
    doorOn(g, R, A, 0.4, 0.22, 4.4 + (tier >= 4 ? 0.4 : 0), dc, trim);
    openWin(g, A.L, 0.1, 3.4, 0.16, 2.6, trim);
    openWin(g, A.R, 0.35, 3.2, 0.3, 2.6, trim);
    if (tall) { openWin(g, A.L, 0.1, h - 6, 0.16, 2.6, trim); openWin(g, A.L, 0.7, h - 6, 0.16, 2.6, trim); openWin(g, A.R, 0.35, h - 6, 0.3, 2.6, trim); }
    roofTop(g, ...R, h, look, 3);
    const zr = h + roofZ(look);
    if (tier >= 3 && !far) {                                      // the wind-catcher: a narrow tower with a dark slot, a cap above
      const T = block(g, x + 0.2, y + 0.14, 0.17, 0.17, 7, zr, m.wall);
      qd(g, T.L, 0.2, 0.8, 2.2, 6, INK, { alpha: 0.85 });
      box(g, x + 0.18, y + 0.12, 0.21, 0.21, 0.8, zr + 7, look === 3 ? GOLDEN : PALE, 0);
    }
    if (tier === 2 && !far) linen(g, x + 0.26, y + 0.2, zr);
    if (tier === 4 && !far) awn(g, x + 0.42, y + 0.18, 0.28, 0.26, zr + 3.4, GREEN, GREEN_DARK, TEAL);
    if (tier === 5 && !far) awn(g, x + 0.42, y + 0.18, 0.28, 0.26, zr + 3.4, TEAL, TEAL_DARK);
    if (!far) palmAt(g, x + 0.46, y + 0.78, 0.55);
    const F = box(g, x + 0.1, y + 0.88, 0.82, 0.07, 3.2, 0, wallC, 0);
    qd(g, F.L, 0.34, 0.54, 0, 2.6, dc);                           // the gate
    if (look >= 1) g.line(F.L(0, 3.2), F.L(1, 3.2), m.band, 0.9, 0.9);
    if (look === 1 && !far) awning(g, { F: A.L, u: 0.34, s: 5.4 }, 0.34, GOLD);
    if (look === 2 && !far) balcony(g, R[0] + R[2], R[1] + 0.08, 0.3, h * 0.4);
    if (look === 3 && tier >= 3 && !far) doorPorch(g, R[0] + R[2] * 0.4, R[1] + R[3], 8, 5.6);
    if (!far) jar(g, p(x + 0.9, y + 1.0), JAR2, 0.8);
  }
}

// ---- tiers 6-9: the 2x2 homes -----------------------------------------------------------------------------------------------------------
// BIG (above) keeps each tier's heights, its courtyard dressing (columns, rug, bed, pool, statue), its palms and the awning's colours. The tier's tells keep
// to their own patches of roof: a vine pergola (6), a roof garden (7), painted bands (8) and a flag with a roof pool (9). The three variants differ in massing:
//   v0 a main block at the back and an annexe wing down the right (today's shape);
//   v1 a low, wide main block with a tall tower behind it and a low pavilion in front on the right, an awning over the door;
//   v2 a low main block with a smaller top storey set back on it, and the annexe wing low and open-roofed.
// The courtyard stays in front on the left in all three (the pool the ambient glint rides on stands in it).
const POOL_AT = [0.32, 1.24, 0.6, 0.3];   // the courtyard pool of tiers 8 and 9, relative to the footprint (render/ambient.js reads it)
export const BIG_POOL = POOL_AT;
const BIG_V = [
  { perg: { x: 0.2, y: 0.16, w: 0.52, d: 0.46 }, pool: ROOF_POOL, garden: ROOF_GARDEN, flag: [1.1, 0.25], palms: null },
  { perg: { x: 0.16, y: 0.14, w: 0.44, d: 0.4 }, pool: { x: 0.68, y: 0.5, w: 0.34, d: 0.3 }, garden: { x: 1.22, y: 0.9, w: 0.5, d: 0.36 }, flag: [1.5, 0.4], palms: [[1.55, 1.64]] },
  { perg: { x: 0.34, y: 0.26, w: 0.46, d: 0.4 }, pool: { x: 1.04, y: 0.46, w: 0.22, d: 0.4 }, garden: ROOF_GARDEN, flag: [0.96, 0.26], palms: [[1.05, 1.62], [0.22, 1.72]] },
];

function bigHome(g, x, y, look, tier, v, far) {
  const m = M[look], O = BIG[tier], V = BIG_V[v], trim = look === 0 ? WOOD : m.trim;
  const wallC = look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall;
  const nb = tier >= 9 ? 3 : tier >= 8 ? 2 : 1;
  const dcA = DOORC[v], dcB = DOORC[(v + 1) % 3];
  const up = look >= 2 ? 0.7 : 0;                                  // a City or Capital roof surface sits lower than a Village slab; the walls make it up, so no look is shorter
  const hA = (v === 2 ? O.hA * 0.78 : O.hA) + up, hB = (v === 2 ? O.hB * 0.8 : O.hB) + up, hC = O.hB * 0.62 + up, hT = O.hA + 5 + up, hU = O.hA * 0.22;
  const rows = O.hA > 20 ? [3.2, 9, 14.5] : O.hA > 15 ? [3.2, 9.5] : [3.2, 8];
  // ---- the back masses
  const A0 = v === 1 ? [x + 0.1, y + 0.1, 1.0, 0.84] : [x + 0.1, y + 0.1, 1.2, 0.82];
  const A = block(g, ...A0, hA, 0, m.wall);
  skin(g, A, hA, look, nb);
  doorOn(g, A0, A, 0.42, 0.14, 7, dcA, trim);
  rows.forEach((s, i) => {
    if (s > hA - 4) return;
    for (const u of [0.08, 0.24, 0.6, 0.8]) { if (i === 0 && u > 0.3 && u < 0.6) continue; openWin(g, A.L, u, s, 0.1, 3, trim, look >= 2 && i > 0 && u > 0.5); }
  });
  openWin(g, A.R, 0.3, 4, 0.22, 3, trim);
  if (hA > 12) openWin(g, A.R, 0.3, 9.5, 0.22, 3, trim);
  roofTop(g, ...A0, hA, look, 5);
  const zA = hA + roofZ(look);
  let U0 = null, T0 = null;
  if (v === 2) {                                                  // the set-back top storey
    U0 = [x + 0.28, y + 0.22, 0.74, 0.5];
    const Uf = block(g, ...U0, hU, hA, m.wall);
    skin(g, Uf, hU, look, 0);
    for (const u of [0.16, 0.6]) openWin(g, Uf.L, u, 2, 0.2, 2.6, trim, look >= 2);
    roofTop(g, ...U0, hA + hU, look, 3);
  }
  if (v === 1) {                                                  // the tower behind
    T0 = [x + 1.22, y + 0.1, 0.58, 0.58];
    const T = block(g, ...T0, hT, 0, m.wall);
    skin(g, T, hT, look, 1);
    for (const s of [4, hT - 8]) { openWin(g, T.L, 0.3, s, 0.22, 3, trim); openWin(g, T.R, 0.35, s, 0.3, 3, trim); }
    roofTop(g, ...T0, hT, look, 3);
  }
  const zT = (v === 2 ? hA + hU : hA) + roofZ(look);
  // ---- the roof tells on the main roof
  if (!far) {
    if (tier >= 9 && v !== 2) roofPool(g, x, y, zA - 0.2, V.pool);
    pergola(g, x, y, v === 2 ? hA + hU + roofZ(look) : zA, V.perg);
    if (tier >= 8 && look === 3) gildedCap(g, U(p(x + (v === 1 ? 0.3 : 0.28), y + (v === 2 ? 0.34 : 0.26)), v === 2 ? hA + hU + 1.8 : hA + 1.8), 2.8);
    if (tier >= 9 && look === 2) { box(g, x + 0.9, y + 0.62, 0.22, 0.2, 2.4, zA, m.wall); box(g, x + 0.88, y + 0.6, 0.26, 0.24, 0.8, zA + 2.4, [TEAL, TEAL, TEAL_DARK], 0); }
    pots(g, U(p(x + 0.95, y + 0.3), zA), 2);
    if (O.flag) {
      const q = U(p(x + V.flag[0], y + V.flag[1]), v === 1 ? hT + 0.9 : v === 2 ? hA + hU + 0.9 : zA);
      g.line(q, U(q, 14), WOOD, 0.7);
      g.poly([U(q, 14), [q[0] + 7, q[1] - 12.5], U(q, 11)], look === 3 ? GOLD : PINK);
    }
  }
  if (v === 2 && tier >= 9 && !far) roofPool(g, x, y, hA + 0.2, V.pool);
  // ---- the courtyard, in front on the left
  g.poly(quad(x + 0.15, y + 0.95, 1.07, 0.91, 0), O.floor && look >= 2 ? O.floor : m.paving);
  box(g, x + 0.1, y + 0.95, 0.08, 0.9, 3.5, 0, wallC, 0);
  if (O.cols && !far) {
    for (const u of O.cols) {
      if (look >= 2) col(g, x + u, y + 1.02, O.colH || 9, 0, O.cap);
      else { const q = p(x + u, y + 1.02); g.line(q, U(q, O.colH || 9), WOOD, 1.1); }
    }
    box(g, x + 0.18, y + 0.9, 1.08, 0.22, 1.2, (O.colH || 9) + 1.6, look >= 2 ? STONE : TIMBER, 0);
  }
  if (O.pool) pool(g, x + POOL_AT[0], y + POOL_AT[1], POOL_AT[2], POOL_AT[3]);
  if (O.rug && !far) rug(g, x + 0.28, y + 1.2, 0.5, 0.3, 0, RED, '#F2D7A8', GOLD);
  if (O.bed && !far) bed(g, x + 0.3, y + 1.56, 0.55, 0.22);
  if (O.statue && !far) statue(g, x + 0.28, y + 1.66);
  // ---- the right-hand mass
  if (v === 1) {
    const C0 = [x + 1.15, y + 0.78, 0.75, 0.6];
    const C = block(g, ...C0, hC, 0, m.wall);
    skin(g, C, hC, look, 0);
    doorOn(g, C0, C, 0.3, 0.3, 5, dcB, trim, false);
    openWin(g, C.R, 0.3, 3, 0.4, 2.6, trim);
    roofTop(g, ...C0, hC, look, 3);
    if (tier >= 7 && !far) roofGarden(g, x, y, hC + roofZ(look), V.garden);
    if (!far) {
      awning(g, { F: A.L, u: 0.3, s: 8.6 }, 0.34, O.awn || ORANGE);
      if (look === 2) balcony(g, C0[0] + C0[2], C0[1] + 0.1, 0.4, hC * 0.45);
      if (look === 3 && tier < 8) doorPorch(g, C0[0] + C0[2] * 0.3, C0[1] + C0[3], 9, 5.4);
    }
  } else {
    const B0 = [x + 1.25, y + 0.1, 0.65, 1.25];
    const B = block(g, ...B0, hB, 0, m.wall);
    skin(g, B, hB, look, 0);
    doorOn(g, B0, B, 0.35, 0.3, 5.5, dcB, trim, false);
    openWin(g, B.R, 0.2, 4, 0.15, 2.6, trim); openWin(g, B.R, 0.6, 4, 0.15, 2.6, trim);
    roofTop(g, ...B0, hB, look, 4);
    if (!far) {
      awn(g, x + 1.32, y + 0.18, 0.5, 0.55, hB + roofZ(look) + 3.4, O.awn || ORANGE, O.awn2 || '#B45F2A');
      if (tier >= 7) roofGarden(g, x, y, hB + roofZ(look), V.garden);
      if (look === 2) balcony(g, B0[0] + B0[2], B0[1] + 0.9, 0.4, hB * 0.4);
      if (look === 3 && tier < 8) doorPorch(g, B0[0] + B0[2] * 0.35, B0[1] + B0[3], 9, 5.4);
    }
  }
  if (!far) for (const [u, w] of (V.palms || O.palms || [])) palmAt(g, x + u, y + w, 0.72);
  box(g, x + 1.82, y + 1.35, 0.08, 0.5, 3.5, 0, wallC, 0);
  box(g, x + 0.1, y + 1.8, 0.72, 0.1, 3.5, 0, wallC, 0);
  box(g, x + 0.74, y + 1.76, 0.1, 0.18, 5.5, 0, wallC, 0);
  box(g, x + 1.16, y + 1.76, 0.1, 0.18, 5.5, 0, wallC, 0);
  box(g, x + 1.18, y + 1.8, 0.72, 0.1, 3.5, 0, wallC, 0);
  if (look >= 2 && !far) jar(g, p(x + 0.9, y + 1.7), JAR2, 1);
}

// One home, drawn: tier 1-9, variant 0-2 (far: no clutter, no variant).
function drawHome(g, x, y, look, tier, v, far) {
  if (tier === 1) hutHome(g, x, y, look, v, far);
  else if (tier <= 5) smallHome(g, x, y, look, tier, v, far);
  else bigHome(g, x, y, look, tier, v, far);
}

// Where a home's main door stands on its lit (+y) face, for the sick cloth (render/illness.js): { cx, fy, hw, h } in tiles from the footprint's corner and art px.
// It reads the drawing itself against a canvas that takes no ink, so the cloth cannot drift from the door. The door never depends on the look.
const NOOP = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 1 : NOOP), apply: () => NOOP });
const DOOR_AT = new Map();
export function homeDoor(tier, variant = 0) {
  const key = tier * 3 + variant;
  if (!DOOR_AT.has(key)) {
    PROBE = {};
    try { drawHome(NOOP, 0, 0, 0, tier, variant, false); } finally { const d = PROBE.door; PROBE = null; DOOR_AT.set(key, d); }
  }
  return DOOR_AT.get(key);
}

// Heights are one number a tier (every variant and look), the tallest ink of any of them, so a pick, a marker or a sheet reads the same whichever drawing shows.
const HOME_H = { 1: 12, 2: 14, 3: 17, 4: 23, 5: 27, 6: 21, 7: 24, 8: 27, 9: 31 };   // the measured ink top above the footprint's corner, plus 2 (tests/v93/h)
const HOME_SHADOWS = {
  1: [[0.22, 0.22, 0.56, 0.56, 9]], 2: [[0.14, 0.14, 0.66, 0.66, 10]], 3: [[0.1, 0.1, 0.65, 0.6, 12], [0.5, 0.52, 0.42, 0.4, 8]],
  4: [[0.08, 0.08, 0.62, 0.58, 16], [0.55, 0.42, 0.38, 0.5, 9]], 5: [[0.08, 0.08, 0.6, 0.56, 21], [0.52, 0.44, 0.4, 0.48, 13]],
  6: [[0.1, 0.1, 1.2, 0.82, BIG[6].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[6].hB + 3]], 7: [[0.1, 0.1, 1.2, 0.82, BIG[7].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[7].hB + 3]],
  8: [[0.1, 0.1, 1.2, 0.82, BIG[8].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[8].hB + 3]], 9: [[0.1, 0.1, 1.2, 0.82, BIG[9].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[9].hB + 3]],
};
export const HOME_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const homeEntry = (t) => {
  const n = t >= 6 ? 2 : 1;
  return { w: n, d: n, height: HOME_H[t], bounds: boundsFor(n, n, HOME_H[t]), shadows: HOME_SHADOWS[t], draw: (g, x, y, opt) => drawHome(g, x, y, opt.look, t, opt.variant, false) };
};
const FAR_ART = {};
for (const t of HOME_TIERS) for (let l = 0; l < M.length; l++) FAR_ART[`house.t${t}.l${l}.far`] = { ...homeEntry(t), draw: (g, x, y) => drawHome(g, x, y, l, t, 0, true) };

export const HOUSE_ART = {
  'house.lot': { w: 2, d: 2, height: 9, bounds: boundsFor(2, 2, 9), shadows: [[0.04, 0.04, 1.92, 1.92, 1]], draw: LotPlot },
  ...withLooks(Object.fromEntries(HOME_TIERS.map((t) => [`house.t${t}`, homeEntry(t)])), { variants: 3 }),
  ...FAR_ART,
};
for (const t of HOME_TIERS) EXPANDED.get(`house.t${t}`).far = true;   // slotFor gives the far drawing at far zoom
