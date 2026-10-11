// Stage 2 workshops, the storehouse and the trading post (spec 4.10, 4.15), drawn in the mock-up's style: smooth
// whitewash, cool lavender shaded faces, striped reed canopies, orange pots and painted bands. Each building carries
// a pennant in the industry tint (spec 5.3), so the category reads at phone zoom. Everything is 2x2 and is drawn
// back to front, so nearer things cover farther ones. The storehouse shows its stock in four stages (stages.js),
// and INDUSTRY_ART registers one slot per stage beside its plain slot.
import { box, tb, qd, door, win, parapet, mat, rug, pots, ladder, awn, p, U, quad, hs } from './primitives.js';
import { rock } from './nature.js';
import { fig } from './figures.js';
import { pennant } from './services.js';
import {
  WASH, WASH2, MUD, MUD2, ROCK, GOLDC, TEAL, TEAL_DARK, BLUE, RED, RED_DARK, GOLD, PINK, ORANGE, GREEN, GREEN_DARK,
  PURP, WOOD, POT, POT_LIGHT, SHADOW, DOOR, INDUSTRY_TINT,
} from './palette.js';
import { boundsFor } from '../iso.js';

const TIMBER = ['#C9A26A', '#A8814E', '#86705E'];          // crates and posts: lit top, lit side, shaded side
const BALE = ['#DCC27A', '#C4A85E', '#9C8A6E'];
const CLAY = '#9A6A48', CLAY_WET = '#7A5238', CLAY_LIGHT = '#B8865C';

// A wooden crate standing on tile point (gx, gy), s tiles across, h art px tall, raised by z.
function crate(g, gx, gy, s, h, z = 0) {
  const F = box(g, gx - s / 2, gy - s / 2, s, s, h, z, TIMBER);
  g.line(F.L(0.5, 0), F.L(0.5, h), '#86603E', 0.4, 0.7);
  g.line(F.R(0.5, 0), F.R(0.5, h), '#6E5A50', 0.4, 0.7);
}
// A bale of flax or straw, banded with twine.
function bale(g, gx, gy, w, d, z = 0) {
  const F = box(g, gx - w / 2, gy - d / 2, w, d, 2.4, z, BALE);
  qd(g, F.L, 0.3, 0.36, 0, 2.4, '#8C7240');
  qd(g, F.L, 0.64, 0.7, 0, 2.4, '#8C7240');
}
// A tall storage jar (an amphora) with a stopper, standing on art point q.
function jar(g, q, color = POT, h = 5) {
  g.ell([q[0] + 1, q[1] + 0.3], 2, 0.8, SHADOW, { alpha: 0.18 });
  g.path([['M', [q[0] - 0.8, q[1]]], ['Q', [q[0] - 2.4, q[1] - h * 0.55], [q[0] - 0.7, q[1] - h]], ['L', [q[0] + 0.7, q[1] - h]], ['Q', [q[0] + 2.4, q[1] - h * 0.55], [q[0] + 0.8, q[1]]], ['Z']], color, { outline: true });
  g.ell([q[0] - 0.6, q[1] - h * 0.55], 0.45, h * 0.18, POT_LIGHT, { alpha: 0.6 });
  g.ell([q[0], q[1] - h - 0.2], 0.9, 0.45, '#E9D8B4');
}
// A sack of grain or barley.
function sack(g, q, color = '#D8B47A') {
  g.ell(U(q, 1.4), 1.8, 1.5, color, { outline: true });
  g.ell(U(q, 3), 0.8, 0.45, '#9C7A54');
}
// A round vat or kiln drum: an upright cylinder on tile point (gx, gy), r art px across the middle, h tall.
function drum(g, gx, gy, r, h, side, shade, top) {
  const c = p(gx, gy), ry = r * 0.5;
  g.ell([c[0] + r * 0.4, c[1] + ry * 0.4], r * 1.1, ry * 1.1, SHADOW, { alpha: 0.16 });
  g.path([['M', [c[0] - r, c[1]]], ['L', [c[0] - r, c[1] - h]], ['L', [c[0] + r, c[1] - h]], ['L', [c[0] + r, c[1]]], ['Q', [c[0], c[1] + ry * 2], [c[0] - r, c[1]]], ['Z']], side, { outline: true });
  g.path([['M', [c[0], c[1] + ry]], ['Q', [c[0] + r, c[1] + ry], [c[0] + r, c[1]]], ['L', [c[0] + r, c[1] - h]], ['L', [c[0], c[1] - h + ry]], ['Z']], shade, { alpha: 0.55 });
  g.ell([c[0], c[1] - h], r, ry, top, { outline: true });
  return [c[0], c[1] - h];
}
// A soft puff of smoke centred on art point q.
const puff = (g, q, r, a) => g.radial(q, r, r * 0.8, '#F4F0F2', a);

// Clay pit: a dug pit of wet clay with puddles, a digger and a ladder, bricks drying in rows along the front, a
// green reed shade over the brick moulds and baskets of clay.
export function clayPit(g, X, Y) {
  const x0 = X + 0.14, y0 = Y + 0.14, w = 1.26, d = 1.12, deep = 3.2;
  g.poly(quad(x0 - 0.06, y0 - 0.06, w + 0.12, d + 0.12, 0), CLAY_LIGHT, { outline: true });   // the spoil rim
  g.save();
  g.clip(quad(x0, y0, w, d, 0));
  g.poly(quad(x0, y0, w, d, -deep), CLAY_WET);
  g.poly([p(x0, y0), p(x0 + w, y0), U(p(x0 + w, y0), -deep), U(p(x0, y0), -deep)], CLAY);           // the far walls
  g.poly([p(x0, y0), p(x0, y0 + d), U(p(x0, y0 + d), -deep), U(p(x0, y0), -deep)], '#86604A');
  for (const [u, v, rx] of [[0.3, 0.55, 4], [0.7, 0.35, 3], [0.62, 0.78, 2.6]]) {
    const q = U(p(x0 + w * u, y0 + d * v), -deep);
    g.ell(q, rx, rx * 0.45, '#6E8A84', { alpha: 0.85 });
    g.ell([q[0] - rx * 0.3, q[1] - rx * 0.1], rx * 0.4, rx * 0.15, '#B8E0DA', { alpha: 0.6 });
  }
  for (let i = 0; i < 9; i++) g.circ(U(p(x0 + w * hs(i, 3, 5), y0 + d * hs(i, 4, 5)), -deep + 0.6), 0.9, CLAY_LIGHT, { alpha: 0.8 });
  g.restore();
  ladder(g, U(p(x0 + 0.6, y0 + 0.04), -deep), U(p(x0 + 0.6, y0 + 0.04), 3));
  fig(g, x0 + 0.42, y0 + 0.62, 'farmer', -deep + 0.4, 0.9);
  // the brick yard: rows of mud bricks drying along the front and right edges
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) box(g, X + 0.18 + i * 0.2, Y + 1.5 + j * 0.2, 0.13, 0.09, 1.2, 0, MUD, 0);
  for (let j = 0; j < 4; j++) box(g, X + 1.56, Y + 0.3 + j * 0.2, 0.09, 0.13, 1.2, 0, MUD, 0);
  awn(g, X + 1.46, Y + 0.18, 0.42, 0.9, 6, GREEN, GREEN_DARK, TEAL);
  for (let k = 0; k < 3; k++) box(g, X + 1.5, Y + 1.32, 0.3, 0.2, 1.1, k * 1.1, MUD2, 0);                // a stack of dry bricks
  for (const [u, v] of [[1.72, 1.66], [1.3, 1.86]]) {
    const q = p(X + u, Y + v);
    g.ell(U(q, 0.9), 2.3, 1.35, '#B08436', { outline: true });
    g.ell(U(q, 1.9), 1.8, 1.05, CLAY, { outline: true });
  }
  jar(g, p(X + 1.88, Y + 1.36), POT, 4.4);
  pennant(g, U(p(X + 1.9, Y + 0.12), 0), 11, INDUSTRY_TINT);
}

// Potter: a whitewashed workshop with a striped awning over the wheel, a domed mud kiln glowing at its mouth with
// soft smoke rising, and rows of finished pots in the yard.
export function potter(g, X, Y) {
  const W = box(g, X + 0.12, Y + 0.12, 0.92, 0.66, 9, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 0.92, 0.66, 9);
  qd(g, W.L, 0, 1, 7.4, 8.2, TEAL);
  qd(g, W.R, 0, 1, 7.4, 8.2, TEAL_DARK);
  door(g, W, 0.62, 0.8, 5.6);
  win(g, W.L, 0.18, 0.32, 4, 6);
  win(g, W.R, 0.3, 0.5, 4, 6);
  mat(g, X + 0.24, Y + 0.22, 0.4, 0.3, 9, ORANGE, GOLD);
  // the kiln: a tapered mud drum, its stoke hole glowing, smoke from the top
  const K = tb(g, X + 1.22, Y + 0.22, 0.6, 0.6, 9, 0, 0.14, MUD2);
  qd(g, K.L, 0.36, 0.64, 0.4, 3.6, '#3A2420');
  qd(g, K.L, 0.42, 0.58, 0.6, 2.4, ORANGE);
  qd(g, K.L, 0.46, 0.54, 0.6, 1.6, GOLD);
  g.poly(quad(X + 1.42, Y + 0.42, 0.2, 0.2, 9), '#4A3030');
  const top = U(p(X + 1.52, Y + 0.52), 9);
  puff(g, [top[0] + 1, top[1] - 4], 3, 0.55);
  puff(g, [top[0] + 3.5, top[1] - 8.5], 3.8, 0.42);
  puff(g, [top[0] + 6.5, top[1] - 13], 4.4, 0.3);
  // the wheel under its awning, the potter at work
  awn(g, X + 0.2, Y + 0.84, 0.66, 0.42, 6.4, RED, RED_DARK, GOLD);
  const wh = U(p(X + 0.54, Y + 1.04), 1.6);
  g.line(p(X + 0.54, Y + 1.04), wh, WOOD, 1);
  g.ell(wh, 2.4, 1.2, '#8A6448', { outline: true });
  g.ell(U(wh, 1.4), 1.2, 1.4, CLAY_LIGHT, { outline: true });
  fig(g, X + 0.36, Y + 1.12, 'citizen', 0, 0.85);
  // rows of finished pots, set out to sell
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) jar(g, p(X + 1.08 + i * 0.2, Y + 1.24 + r * 0.22), (i + r) % 3 ? POT : '#E9C08A', 3.4);
  for (const [u, v] of [[0.3, 1.62], [0.52, 1.7], [0.74, 1.78]]) jar(g, p(X + u, Y + v), POT);
  jar(g, p(X + 1.86, Y + 0.96), '#E9C08A', 4.4);
  pennant(g, U(p(X + 1.9, Y + 1.0), 0), 11, INDUSTRY_TINT);
}

// Brewery: a whitewashed brewhouse with barley sacks on its roof, three open vats of dark beer with foam in the
// yard, a rack of sealed beer jars and a heap of barley sacks.
export function brewery(g, X, Y) {
  const W = box(g, X + 0.12, Y + 0.12, 1.06, 0.72, 10, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 1.06, 0.72, 10);
  qd(g, W.L, 0, 1, 8.4, 9.2, GOLD);
  qd(g, W.R, 0, 1, 8.4, 9.2, GOLDC[2]);
  door(g, W, 0.44, 0.6, 6);
  for (const u of [0.12, 0.26, 0.76]) win(g, W.L, u, u + 0.08, 4.2, 6.6);
  win(g, W.R, 0.35, 0.55, 4.2, 6.6);
  for (const [u, v] of [[0.35, 0.35], [0.55, 0.3], [0.45, 0.55]]) sack(g, U(p(X + u, Y + v), 10), '#E2C27E');
  ladder(g, U(p(X + 1.0, Y + 0.86), 0), U(p(X + 1.0, Y + 0.82), 10.5));
  for (const [u, v] of [[1.48, 0.42], [1.5, 0.98], [0.9, 1.22]]) {
    const t = drum(g, X + u, Y + v, 5.4, 6, '#B07E52', '#7A5848', '#5A3420');
    g.ell([t[0] - 0.4, t[1] - 0.2], 3.8, 1.6, '#3E2216');
    g.ell([t[0] - 1.6, t[1] - 0.6], 1.6, 0.6, '#F2E2BC', { alpha: 0.9 });
    g.line([t[0] - 5.4, t[1]], [t[0] + 5.4, t[1]], '#6E4A30', 0.6, 0.8);
  }
  box(g, X + 0.14, Y + 1.5, 0.92, 0.16, 1.6, 0, TIMBER, 0);                                              // the jar rack
  for (let i = 0; i < 4; i++) jar(g, U(p(X + 0.24 + i * 0.25, Y + 1.58), 1.6), i % 2 ? '#C9552F' : '#B8643A', 5.2);
  for (const [u, v] of [[1.5, 1.6], [1.66, 1.5], [1.6, 1.74], [1.78, 1.66]]) sack(g, p(X + u, Y + v), '#D8B47A');
  pennant(g, U(p(X + 1.9, Y + 0.12), 0), 11, INDUSTRY_TINT);
}

// Weaver: a whitewashed workshop, an upright loom with a banded cloth, a ground loom with a striped linen cloth
// and a weaver at it, lengths of coloured cloth drying on a line in front of a teal reed canopy, and bales of flax.
export function weaver(g, X, Y) {
  const W = box(g, X + 0.12, Y + 0.12, 0.8, 0.7, 9, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 0.8, 0.7, 9);
  qd(g, W.L, 0, 1, 7.4, 8.2, BLUE);
  qd(g, W.R, 0, 1, 7.4, 8.2, '#245A88');
  door(g, W, 0.56, 0.74, 5.6);
  win(g, W.L, 0.16, 0.3, 4, 6);
  win(g, W.R, 0.3, 0.5, 4, 6);
  rug(g, X + 0.22, Y + 0.24, 0.5, 0.3, 9, PINK, '#F2D7A8', TEAL);
  // the upright loom, its cloth banded blue, gold and red
  const a = U(p(X + 1.12, Y + 0.3), 0), b = U(p(X + 1.62, Y + 0.3), 0);
  g.line(a, U(a, 11), WOOD, 1);
  g.line(b, U(b, 11), WOOD, 1);
  g.line(U(a, 11), U(b, 11), WOOD, 1.1);
  const cloth = (s0, s1, c) => g.poly([U(p(X + 1.16, Y + 0.3), s0), U(p(X + 1.58, Y + 0.3), s0), U(p(X + 1.58, Y + 0.3), s1), U(p(X + 1.16, Y + 0.3), s1)], c);
  cloth(3, 10.6, '#F4EEE2');
  cloth(8, 9.2, BLUE);
  cloth(6.4, 7.4, GOLD);
  cloth(4.8, 5.6, RED);
  g.line(U(p(X + 1.14, Y + 0.3), 2.6), U(p(X + 1.6, Y + 0.3), 2.6), WOOD, 0.9);
  // the canopy, and the drying line in front of it
  awn(g, X + 1.2, Y + 0.62, 0.66, 0.66, 8.4, TEAL, TEAL_DARK);
  const ly = Y + 1.42, l0 = p(X + 1.24, ly), l1 = p(X + 1.86, ly);
  g.line(l0, U(l0, 7), WOOD, 0.8);
  g.line(l1, U(l1, 7), WOOD, 0.8);
  g.line(U(l0, 6.6), U(l1, 6.6), '#8C7B5C', 0.5);
  [[0.06, '#F4EEE2'], [0.3, TEAL], [0.54, GOLD], [0.78, RED]].forEach(([u, c]) => {
    const l = p(X + 1.24 + 0.62 * u, ly), r = p(X + 1.24 + 0.62 * (u + 0.16), ly);
    g.poly([U(l, 6.6), U(r, 6.6), U(r, 2.4), U(l, 2.6)], c, { outline: true });
  });
  // the ground loom: a striped linen cloth pegged out, the weaver kneeling at its near end
  const gx = X + 0.2, gy = Y + 1.08;
  g.poly(quad(gx, gy, 0.86, 0.42, 0.4), '#F4EEE2', { outline: true });
  for (const v of [0.2, 0.5, 0.8]) g.line(U(p(gx + 0.04, gy + 0.42 * v), 0.4), U(p(gx + 0.82, gy + 0.42 * v), 0.4), v === 0.5 ? RED : TEAL, 0.8);
  for (const [u, v] of [[0, 0], [0.86, 0], [0, 0.42], [0.86, 0.42]]) { const q = p(gx + u, gy + v); g.line(q, U(q, 1.6), WOOD, 0.8); }
  g.line(U(p(gx + 0.6, gy - 0.02), 1.2), U(p(gx + 0.6, gy + 0.44), 1.2), WOOD, 1);
  fig(g, gx + 0.66, gy + 0.58, 'woman', 0, 0.85);
  for (const [u, v] of [[1.4, 1.7], [1.66, 1.66], [1.56, 1.86]]) bale(g, X + u, Y + v, 0.22, 0.16);
  pennant(g, U(p(X + 1.92, Y + 0.6), 0), 11, INDUSTRY_TINT);
}

// Gem mine: a rocky outcrop at the back, a timber-framed shaft in front of it under a winch with its wheel, rope
// and bucket, a heap of broken rock, and gems glinting in a basket and on the spoil.
const GEMS = [TEAL, RED, PURP, '#3FA0D8', GOLD];
function gem(g, q, c) {
  g.poly([[q[0], q[1] - 1.5], [q[0] + 1.1, q[1]], [q[0], q[1] + 1.1], [q[0] - 1.1, q[1]]], c, { outline: true });
  g.poly([[q[0], q[1] - 1.5], [q[0] + 1.1, q[1]], [q[0], q[1] - 0.2]], '#FFFFFF', { alpha: 0.45 });
}
function glint(g, q) {
  g.line([q[0] - 2, q[1]], [q[0] + 2, q[1]], '#FFFFFF', 0.5, 0.9);
  g.line([q[0], q[1] - 2], [q[0], q[1] + 2], '#FFFFFF', 0.5, 0.9);
}
export function gemMine(g, X, Y) {
  [[0.06, 0.08, 0.9, 0.72, 13, 0.16], [0.84, 0.1, 0.7, 0.62, 9, 0.14], [1.4, 0.2, 0.48, 0.5, 6, 0.12], [0.08, 0.76, 0.52, 0.5, 6, 0.12]].forEach(([dx, dy, w, d, h, i], k) => {
    const F = tb(g, X + dx, Y + dy, w, d, h, 0, i, ROCK);
    for (let s = 2; s < h - 1; s += 2.2) {
      g.line(F.L(0.05, s), F.L(0.95, s + hs(k, s, 1) * 1.2 - 0.6), '#8E6E4A', 0.5, 0.45);
      g.line(F.R(0.05, s), F.R(0.95, s), '#6E5A5E', 0.5, 0.4);
    }
  });
  // the shaft, framed in timber
  const sx = X + 0.86, sy = Y + 1.0, s = 0.42;
  g.poly(quad(sx - 0.05, sy - 0.05, s + 0.1, s + 0.1, 0), '#A8814E', { outline: true });
  g.poly(quad(sx, sy, s, s, 0), '#2E2430');
  g.poly([p(sx, sy), p(sx + s, sy), U(p(sx + s, sy), -3), U(p(sx, sy), -3)], '#4A3A40');
  // the winch: two A-frames, an axle with a wheel, the rope and a bucket
  for (const v of [sy - 0.02, sy + s + 0.02]) {
    const l = p(sx - 0.06, v), r = p(sx + s + 0.06, v), top = U(p(sx + s / 2, v), 10);
    g.line(l, top, WOOD, 1);
    g.line(r, top, WOOD, 1);
  }
  const ax0 = U(p(sx + s / 2, sy - 0.02), 10), ax1 = U(p(sx + s / 2, sy + s + 0.02), 10);
  g.line(ax0, ax1, '#5A3E2A', 1.1);
  g.ell([(ax0[0] + ax1[0]) / 2, (ax0[1] + ax1[1]) / 2], 2.6, 2.6, 'none', { stroke: WOOD, strokeWidth: 0.9 });
  const mid = [(ax0[0] + ax1[0]) / 2, (ax0[1] + ax1[1]) / 2];
  g.line(mid, [mid[0], mid[1] + 9], '#C8B48A', 0.5);
  g.poly([[mid[0] - 1.4, mid[1] + 9], [mid[0] + 1.4, mid[1] + 9], [mid[0] + 1.1, mid[1] + 11], [mid[0] - 1.1, mid[1] + 11]], '#8A6448', { outline: true });
  // spoil, a basket of gems, glints
  for (const [u, v] of [[1.52, 1.12], [1.7, 1.32], [1.46, 1.44], [1.76, 1.04]]) rock(g, p(X + u, Y + v));
  gem(g, U(p(X + 1.56, Y + 1.24), 3), GEMS[0]);
  gem(g, U(p(X + 1.7, Y + 1.12), 2.6), GEMS[1]);
  glint(g, U(p(X + 1.56, Y + 1.24), 5));
  const bq = p(X + 0.6, Y + 1.72);
  g.ell(U(bq, 0.9), 2.6, 1.5, '#B08436', { outline: true });
  for (let i = 0; i < 5; i++) gem(g, U([bq[0] - 1.6 + i * 0.8, bq[1] + (i % 2) * 0.4], 2.2), GEMS[i]);
  glint(g, U(bq, 4.8));
  fig(g, X + 1.4, Y + 1.66, 'porter', 0, 0.85);
  pennant(g, U(p(X + 1.9, Y + 0.12), 0), 11, INDUSTRY_TINT);   // clear of the outcrop, whose shade is the tint's colour
}

// Jeweller: a small whitewashed shop with a gold sign over its door, a purple-and-gold striped awning over a table
// of gold pieces, a little furnace with a gold glow, and a mosaic step in front.
export function jeweller(g, X, Y) {
  const W = box(g, X + 0.3, Y + 0.22, 1.2, 0.8, 12, 0, WASH);
  parapet(g, X + 0.3, Y + 0.22, 1.2, 0.8, 12);
  qd(g, W.L, 0, 1, 10.4, 11.2, PURP);
  qd(g, W.R, 0, 1, 10.4, 11.2, '#563E78');
  door(g, W, 0.44, 0.58, 6.4);
  for (const u of [0.12, 0.26, 0.72, 0.86]) win(g, W.L, u, u + 0.07, 4.4, 7);
  win(g, W.R, 0.3, 0.5, 4.4, 7);
  mat(g, X + 0.5, Y + 0.34, 0.5, 0.36, 12, BLUE, GOLD);
  pots(g, U(p(X + 1.3, Y + 0.4), 12), 2);
  // the gold sign, standing on the roof's front edge so it shows over the awning
  const s0 = p(X + 0.62, Y + 0.96), s1 = p(X + 1.18, Y + 0.96);
  g.line(U(s0, 12), U(s0, 15.6), WOOD, 0.8);
  g.line(U(s1, 12), U(s1, 15.6), WOOD, 0.8);
  g.poly([U(p(X + 0.66, Y + 0.96), 12.8), U(p(X + 1.14, Y + 0.96), 12.8), U(p(X + 1.14, Y + 0.96), 15.6), U(p(X + 0.66, Y + 0.96), 15.6)], GOLD, { stroke: GOLDC[2], strokeWidth: 0.6 });
  g.circ(U(p(X + 0.9, Y + 0.96), 14.2), 0.9, 'none', { stroke: '#FFF4C8', strokeWidth: 0.5 });
  // the furnace at the side: a small mud dome glowing gold
  const K = tb(g, X + 1.58, Y + 0.3, 0.32, 0.32, 5, 0, 0.1, MUD2);
  qd(g, K.L, 0.3, 0.7, 0.4, 2.4, ORANGE);
  qd(g, K.L, 0.38, 0.62, 0.4, 1.6, GOLD);
  puff(g, U(p(X + 1.74, Y + 0.46), 8), 2.4, 0.4);
  // the mosaic step and the awning over the table
  g.poly(quad(X + 0.36, Y + 1.12, 1.1, 0.7, 0), '#F3DDB2', { stroke: RED, strokeWidth: 0.8 });
  for (const [u, v, c] of [[0.2, 0.3, TEAL], [0.5, 0.5, RED], [0.8, 0.3, TEAL], [0.35, 0.75, GOLD], [0.65, 0.75, GOLD]]) g.circ(p(X + 0.36 + 1.1 * u, Y + 1.12 + 0.7 * v), 1, c);
  awn(g, X + 0.32, Y + 1.04, 1.16, 0.4, 7.4, PURP, '#563E78', GOLD);
  const T = box(g, X + 0.5, Y + 1.12, 0.6, 0.18, 2.6, 0, TIMBER);
  for (let i = 0; i < 5; i++) {
    const q = U(p(X + 0.56 + i * 0.12, Y + 1.21), 2.7);
    g.circ(q, 0.8, i % 2 ? GOLD : GOLDC[0], { outline: true });
    if (i % 2 === 0) g.circ([q[0] + 0.3, q[1] - 0.4], 0.35, [RED, TEAL, BLUE][i / 2]);
  }
  qd(g, T.L, 0, 1, 1.6, 2.2, RED);
  fig(g, X + 1.26, Y + 1.5, 'noble', 0, 0.85);
  pennant(g, U(p(X + 1.88, Y + 1.0), 0), 11, INDUSTRY_TINT);
}

// Storehouse: a whitewashed shed across the back with wide dark doors and a teal band, a low wall round a yard,
// and the yard's stock. `stage` (storehouseStage): 0 a bare yard; 1 a few crates and jars; 2 rows of crates, jars,
// bales and sacks; 3 crates stacked high and every spot full.
const STORE_SPOTS = [   // [kind, u, v, stage]: each spot shows from its stage on; crate2 and bale2 sit on the one below
  ['crate', 0.36, 0.98, 1], ['jar', 0.76, 0.96, 1], ['bale', 1.1, 1.0, 1], ['crate', 1.46, 0.98, 1],
  ['crate', 0.4, 1.34, 2], ['jar', 0.86, 1.3, 2], ['jar', 1.0, 1.4, 2], ['sack', 1.36, 1.36, 2], ['crate', 1.66, 1.24, 2], ['bale', 0.62, 1.62, 2],
  ['crate2', 0.36, 0.98, 3], ['crate2', 1.46, 0.98, 3], ['crate2', 0.4, 1.34, 3], ['bale2', 1.1, 1.0, 3], ['crate', 1.22, 1.64, 3],
  ['jar', 0.88, 1.62, 3], ['sack', 1.56, 1.6, 3], ['crate2', 1.66, 1.24, 3],
];
export function storehouse(g, X, Y, stage = 3) {
  g.poly(quad(X + 0.12, Y + 0.12, 1.76, 1.76, 0), '#E2CFA6');                                            // the yard floor
  const S = box(g, X + 0.12, Y + 0.12, 1.76, 0.6, 9, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 1.76, 0.6, 9);
  qd(g, S.L, 0, 1, 7.4, 8.2, TEAL);
  qd(g, S.R, 0, 1, 7.4, 8.2, TEAL_DARK);
  for (const u of [0.16, 0.44, 0.72]) qd(g, S.L, u, u + 0.14, 0, 5.6, DOOR);
  win(g, S.R, 0.4, 0.6, 4, 6);
  for (const [u, c] of [[0.3, RED], [0.8, GREEN]]) mat(g, X + 0.12 + u - 0.12, Y + 0.24, 0.3, 0.3, 9, c, GOLD);
  box(g, X + 0.12, Y + 0.72, 0.08, 1.16, 3, 0, WASH2, 0);                                                    // the yard walls
  box(g, X + 1.8, Y + 0.72, 0.08, 1.16, 3, 0, WASH2, 0);
  const layers = STORE_SPOTS.filter((sp) => sp[3] <= stage);
  for (const [kind, u, v] of layers.sort((a, b) => a[1] + a[2] - (b[1] + b[2]))) {
    if (kind === 'crate') crate(g, X + u, Y + v, 0.22, 3.2);
    else if (kind === 'crate2') crate(g, X + u, Y + v, 0.2, 3, 3.2);
    else if (kind === 'bale') bale(g, X + u, Y + v, 0.26, 0.18);
    else if (kind === 'bale2') bale(g, X + u, Y + v, 0.24, 0.16, 2.4);
    else if (kind === 'sack') sack(g, p(X + u, Y + v));
    else jar(g, p(X + u, Y + v), POT, 5);
  }
  box(g, X + 0.12, Y + 1.8, 0.66, 0.08, 3, 0, WASH2, 0);                                                     // the front wall and gate
  box(g, X + 1.22, Y + 1.8, 0.66, 0.08, 3, 0, WASH2, 0);
  box(g, X + 0.72, Y + 1.76, 0.08, 0.16, 5, 0, WASH, 0);
  box(g, X + 1.2, Y + 1.76, 0.08, 0.16, 5, 0, WASH, 0);
  pennant(g, U(p(X + 1.88, Y + 0.14), 9), 7, INDUSTRY_TINT);
}

// Trading post: two striped tents, a tall flag in teal and gold, two donkeys with packs tethered at a rail, and
// traded goods (crates, jars, a bale, a rug) in front.
function tent(g, x, y, w, d, h, cloth, stripe) {
  const ridge0 = U(p(x, y + d / 2), h), ridge1 = U(p(x + w, y + d / 2), h);
  g.poly([p(x + w, y), p(x + w, y + d), ridge1], cloth[2], { outline: true });                           // the end, in shade
  g.poly([p(x + w, y + d * 0.3), p(x + w, y + d * 0.7), U(p(x + w, y + d / 2), h * 0.62)], DOOR, { alpha: 0.85 });   // its door flap
  g.poly([p(x, y + d), p(x + w, y + d), ridge1, ridge0], cloth[1], { outline: true });                    // the lit side
  for (let u = 0.1; u < 0.95; u += 0.2) {
    g.poly([p(x + w * u, y + d), p(x + w * (u + 0.09), y + d), U(p(x + w * (u + 0.09), y + d / 2), h), U(p(x + w * u, y + d / 2), h)], stripe, { alpha: 0.9 });
  }
  g.line(ridge0, ridge1, '#FFFFFF', 0.6, 0.6);
  g.line(ridge1, U(ridge1, 2.4), WOOD, 0.7);
}
function donkey(g, gx, gy, pack) {
  const c = p(gx, gy);
  g.ell([c[0] + 1.5, c[1] + 0.4], 5, 1.4, SHADOW, { alpha: 0.2 });
  for (const dx of [-2.6, -1.6, 1.8, 2.8]) g.line([c[0] + dx, c[1] - 3], [c[0] + dx, c[1]], '#6E625C', 0.8);
  g.ell([c[0], c[1] - 4.2], 4, 1.9, '#9A8C84', { outline: true });
  g.line([c[0] - 3.2, c[1] - 4.6], [c[0] - 4.6, c[1] - 7], '#9A8C84', 1.6);                                 // the neck
  g.ell([c[0] - 5.2, c[1] - 7.2], 1.6, 1.1, '#9A8C84', { outline: true });
  g.ell([c[0] - 6.3, c[1] - 6.9], 0.7, 0.6, '#E8E0D8');
  g.line([c[0] - 4.8, c[1] - 8], [c[0] - 4.4, c[1] - 10], '#8A7C74', 0.7);                                 // the ears
  g.line([c[0] - 5.4, c[1] - 8], [c[0] - 5.6, c[1] - 10], '#8A7C74', 0.7);
  g.line([c[0] + 3.8, c[1] - 4.6], [c[0] + 4.6, c[1] - 2.6], '#6E625C', 0.6);
  g.poly([[c[0] - 1.8, c[1] - 6], [c[0] + 1.8, c[1] - 6], [c[0] + 2.2, c[1] - 2.8], [c[0] - 2.2, c[1] - 2.8]], pack, { outline: true });
  g.line([c[0] - 1.8, c[1] - 5], [c[0] + 1.8, c[1] - 5], GOLD, 0.6);
}
export function tradingPost(g, X, Y) {
  rug(g, X + 0.9, Y + 1.0, 0.5, 0.34, 0, RED, '#F2D7A8', GOLD);
  tent(g, X + 0.14, Y + 0.16, 0.8, 0.62, 9, WASH, RED);
  tent(g, X + 1.0, Y + 0.2, 0.82, 0.6, 10, WASH2, TEAL);
  // the flag
  const f = p(X + 0.98, Y + 0.12);
  g.line(f, U(f, 22), WOOD, 0.9);
  g.poly([U(f, 22), [f[0] + 9, f[1] - 20.5], U(f, 17.5)], TEAL);
  g.poly([U(f, 20.6), [f[0] + 5.4, f[1] - 19.7], U(f, 18.9)], GOLD);
  // goods
  crate(g, X + 0.3, Y + 1.04, 0.22, 3.2);
  crate(g, X + 0.3, Y + 1.04, 0.18, 2.6, 3.2);
  jar(g, p(X + 0.58, Y + 1.0), POT, 5);
  bale(g, X + 0.62, Y + 1.3, 0.26, 0.18);
  for (const [u, v] of [[1.6, 0.96], [1.74, 1.08]]) jar(g, p(X + u, Y + v), u > 1.7 ? '#E9C08A' : POT, 4.6);
  // the hitching rail and the donkeys
  const r0 = p(X + 0.4, Y + 1.66), r1 = p(X + 1.6, Y + 1.66);
  g.line(r0, U(r0, 4), WOOD, 0.9);
  g.line(r1, U(r1, 4), WOOD, 0.9);
  g.line(U(r0, 4), U(r1, 4), WOOD, 0.9);
  donkey(g, X + 0.78, Y + 1.5, RED);
  donkey(g, X + 1.32, Y + 1.52, BLUE);
  fig(g, X + 1.62, Y + 1.36, 'porter', 0, 0.85);
  pennant(g, U(p(X + 1.86, Y + 0.24), 0), 12, INDUSTRY_TINT);
}

// The plain storehouse slot (cards and assets) is the full yard.
export const PLAIN_STORE_STAGE = 3;
const slot = (height, shadows, draw) => ({ w: 2, d: 2, height, bounds: boundsFor(2, 2, height), shadows, draw });
const STORE_SHADOWS = [[0.12, 0.12, 1.76, 0.6, 12]];
export const INDUSTRY_ART = {
  clay_pit: slot(12, [[1.46, 0.18, 0.42, 0.9, 6]], clayPit),
  potter: slot(26, [[0.12, 0.12, 0.92, 0.66, 12], [1.22, 0.22, 0.6, 0.6, 11]], potter),
  brewery: slot(14, [[0.12, 0.12, 1.06, 0.72, 13]], brewery),
  weaver: slot(12, [[0.12, 0.12, 0.8, 0.7, 12], [1.2, 0.62, 0.66, 0.66, 9]], weaver),
  gem_mine: slot(14, [[0.08, 0.1, 1.1, 0.8, 14], [1.0, 0.12, 0.86, 0.9, 10]], gemMine),
  jeweller: slot(16, [[0.3, 0.22, 1.2, 0.8, 15]], jeweller),
  storehouse: slot(16, STORE_SHADOWS, (g, x, y) => storehouse(g, x, y, PLAIN_STORE_STAGE)),
  trading_post: slot(23, [[0.14, 0.16, 0.8, 0.62, 7], [1.0, 0.2, 0.82, 0.6, 8]], tradingPost),
};
// One slot per stock stage, named as slotFor (registry.js) names them: storehouse.s0-s3.
for (let s = 0; s < 4; s++) INDUSTRY_ART[`storehouse.s${s}`] = slot(16, STORE_SHADOWS, (g, x, y) => storehouse(g, x, y, s));
