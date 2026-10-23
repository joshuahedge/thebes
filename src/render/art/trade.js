// Version 7.0, Track T: the art of trade (rulings 870-899): the Quay, the river partners' boats and the caravans' figures. Track T owns this
// file (src/render/art/v70.js joins it into the registry).
//   TRADE_ART               slot -> art entry (src/render/art/registry.js's shape): 'quay' and 'quay.<side>', and 'fig.<kind>' for tradeWalkers'
//                           figures: a trade boat (sail set, or furled while moored), a pack donkey and the caravan's trader, each with a
//                           left-facing `_l` slot (the same drawing mirrored)
//   tradeSlot(b, world)     the slot a Track T building shows (a Quay facing its water), or null to let slotFor go on as before
//
// The house style: white-washed dressed stone with lavender shadows, weathered planks and rope; the Industry category's pennant. A trade boat
// is told from a fishing skiff by its shape (a long hull with a raised stern, a tall mast and a broad sail, bales on deck), never by colour.
import { box, crs, p, U, quad } from './primitives.js';
import { pennant } from './services.js';
import { fig } from './figures.js';
import { wharfSide } from './river.js';
import { STONE, MUD2, WASH, WOOD, SHADOW, TERRAIN, TEAL, GOLD, RED, BLUE, INDUSTRY_TINT } from './palette.js';
import { boundsFor } from '../iso.js';
import { QUAY_TYPE } from '../../data/trade.js';

const PLANK = ['#C9A36B', '#B58A56', '#8D6A44'];
const BALES = ['#E8D3A2', '#D6BC84', '#A99070'];
const ROPE = '#B99A66';

// ── The Quay (2x1) ──
// Drawn in a frame of its own, as the fishing wharf (src/render/art/river.js): u along the bank (0-2), v across it (0-1 the footprint, on land;
// the landing stair runs on into the water to about 1.45). side says where the water lies.
const SIDES = {
  s: { w: 2, d: 1, at: (X, Y, u, v) => [X + u, Y + v] },
  n: { w: 2, d: 1, at: (X, Y, u, v) => [X + u, Y + 1 - v] },
  e: { w: 1, d: 2, at: (X, Y, u, v) => [X + v, Y + u] },
  w: { w: 1, d: 2, at: (X, Y, u, v) => [X + 1 - v, Y + u] },
};
export function quay(g, X, Y, side = 's') {
  const S = SIDES[side];
  const pt = (u, v) => p(...S.at(X, Y, u, v));
  const rect = (u0, v0, du, dv) => {
    const a = S.at(X, Y, u0, v0), b = S.at(X, Y, u0 + du, v0 + dv);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
  };
  const bx = (u0, v0, du, dv, h, z, C, fx) => box(g, ...rect(u0, v0, du, dv), h, z, C, fx);
  // the landing: a platform of dressed stone the width of the footprint, its courses marked, and a stair down into the water
  for (let k = 0; k < 3; k++) bx(0.7, 1.0 + k * 0.15, 0.6, 0.15, 2 - k * 0.6, 0, STONE, 0);
  const L = bx(0.02, 0.04, 1.96, 0.96, 2.4, 0, STONE);
  crs(g, L, 2.4, '#B9AEBF', 1.2);
  g.poly(quad(...rect(0.08, 0.1, 1.84, 0.84), 2.4), '#EFE6D6', { alpha: 0.6 });
  // the mooring posts at the water's edge, rope looped between them
  const posts = [[0.18, 0.92], [1.82, 0.92]];
  for (const [u, v] of posts) { const q = U(pt(u, v), 2.4); g.line(q, U(q, 4.6), WOOD, 1.4); g.ell(U(q, 4.6), 0.9, 0.45, '#8D6A44'); }
  g.stroke([['M', U(pt(0.18, 0.92), 6)], ['Q', U(pt(1, 0.95), 3.4), U(pt(1.82, 0.92), 6)]], ROPE, 0.5);
  // the customs shed on the land side, at one end: mud brick under a striped awning on poles
  const H = bx(0.1, 0.08, 0.62, 0.5, 6.2, 2.4, MUD2);
  crs(g, H, 6.2, '#9A7A5A', 2);
  g.poly(quad(...rect(0.04, 0.02, 0.74, 0.62), 8.6), WASH[0], { outline: true });
  for (const [u, v] of [[0.86, 0.12], [0.86, 0.58]]) { const q = U(pt(u, v), 2.4); g.line(q, U(q, 6.8), WOOD, 0.7); }
  g.poly([U(pt(0.72, 0.1), 9.2), U(pt(1.08, 0.1), 9.2), U(pt(1.08, 0.6), 9.2), U(pt(0.72, 0.6), 9.2)], RED, { alpha: 0.9, outline: true });
  // goods waiting: bales and jars on the landing
  for (const [u, v, c] of [[1.22, 0.3, BALES], [1.5, 0.3, BALES], [1.36, 0.3, PLANK]]) bx(u - 0.12, v - 0.1, 0.24, 0.2, 2.6, 2.4 + (c === PLANK ? 2.6 : 0), c);
  for (const [u, v] of [[1.7, 0.56], [1.56, 0.66]]) {
    const q = U(pt(u, v), 2.4);
    g.ell([q[0], q[1] - 2.2], 1.3, 2.3, '#C96A3C', { outline: true });
    g.ell([q[0], q[1] - 4.6], 0.6, 0.3, '#E9D8B4');
  }
  pennant(g, U(pt(1.9, 0.12), 2.4), 13, INDUSTRY_TINT);
}

// ── Figures ──
const at = (gx, gy) => p(gx, gy);
function facing(g, X, left) {
  if (!left) return g;
  const f = (q) => [2 * X - q[0], q[1]];
  const segs = (list) => list.map((sg) => [sg[0], ...sg.slice(1).map(f)]);
  return {
    ...g, poly: (pts, ...r) => g.poly(pts.map(f), ...r), ell: (q, ...r) => g.ell(f(q), ...r), circ: (q, ...r) => g.circ(f(q), ...r),
    line: (a, b, ...r) => g.line(f(a), f(b), ...r), stroke: (sg, ...r) => g.stroke(segs(sg), ...r), path: (sg, ...r) => g.path(segs(sg), ...r),
  };
}

// A cargo boat of the river trade, heading right: a long planked hull with a raised, curled stern, bales and jars amidships, a steersman at
// the steering oar, and a tall mast with a broad sail (set while it sails, furled along its yard while moored).
export function tradeBoat(g0, gx, gy, left = false, moored = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y + 0.6], 14, 3.4, TERRAIN.foam, { alpha: moored ? 0.25 : 0.4 });
  if (!moored) for (const k of [1, 2]) g.ell([X - 13 - k * 3, Y + 0.4], 2.6 + k, 0.8 + k * 0.2, TERRAIN.foam, { alpha: 0.4 - k * 0.12 });   // the wake
  g.path([['M', [X - 13, Y - 6.4]], ['Q', [X - 9, Y + 1.6], [X, Y + 1.6]], ['Q', [X + 9, Y + 1.6], [X + 13.4, Y - 4]],
    ['Q', [X + 7, Y - 1.6], [X, Y - 1.6]], ['Q', [X - 8, Y - 1.6], [X - 13, Y - 6.4]], ['Z']], PLANK[0], { outline: true });
  g.stroke([['M', [X - 13, Y - 6.4]], ['Q', [X - 15, Y - 9], [X - 12.6, Y - 9.6]]], PLANK[2], 1.2);                       // the curled stern post
  g.line([X - 11.6, Y - 3.2], [X + 12.4, Y - 3.4], PLANK[2], 0.6, 0.9);
  for (const dx of [-7, -2, 3, 8]) g.line([X + dx, Y + 1.2], [X + dx + 0.3, Y - 1.4], PLANK[1], 0.5);
  // cargo: two bales and a jar
  for (const [dx, c] of [[-4.6, BALES], [-1.2, BALES]]) {
    g.poly([[X + dx - 1.7, Y - 1.6], [X + dx + 1.7, Y - 1.6], [X + dx + 1.5, Y - 4.4], [X + dx - 1.5, Y - 4.4]], c[0], { outline: true });
    g.line([X + dx - 1.6, Y - 3], [X + dx + 1.6, Y - 3], c[2], 0.5);
  }
  g.ell([X + 5.2, Y - 3.4], 1.4, 2.2, '#C96A3C', { outline: true });
  // the steersman at the stern with the long steering oar
  const sx = X - 9.4, sy = Y - 2.4;
  g.line([sx - 0.6, sy], [sx - 0.6, sy - 3], '#A0663F', 0.9); g.line([sx + 0.6, sy], [sx + 0.6, sy - 3], '#A0663F', 0.9);
  g.poly([[sx - 1.6, sy - 2.6], [sx + 1.6, sy - 2.6], [sx + 1.3, sy - 5.2], [sx - 1.3, sy - 5.2]], '#F7F2E8', { outline: true });
  g.poly([[sx - 1.3, sy - 5.1], [sx + 1.3, sy - 5.1], [sx + 1.5, sy - 7.8], [sx - 1.5, sy - 7.8]], '#A0663F');
  g.circ([sx, sy - 9.4], 1.5, '#1E150E'); g.circ([sx + 0.3, sy - 9], 1.2, '#A0663F');
  g.line([sx + 0.4, sy - 6.6], [X - 15.6, Y + 1.2], WOOD, 0.8);
  // the mast and the sail
  g.line([X + 1.4, Y - 1.6], [X + 1.4, Y - 27], WOOD, 1);
  if (moored) {
    g.line([X - 6, Y - 22.6], [X + 9, Y - 23.4], WOOD, 0.9);
    g.ell([X + 1.6, Y - 22.6], 7, 1.2, '#F4EFE2', { outline: true });                                                   // furled along the yard
  } else {
    g.line([X - 7.4, Y - 25.8], [X + 10.6, Y - 26.6], WOOD, 0.9);                                                       // the yard
    g.line([X - 6.6, Y - 6], [X + 9.8, Y - 6.6], WOOD, 0.8);                                                            // the boom
    g.path([['M', [X - 7.2, Y - 25.6]], ['L', [X + 10.4, Y - 26.4]], ['Q', [X + 12.2, Y - 16], [X + 9.8, Y - 6.8]], ['L', [X - 6.6, Y - 6.2]],
      ['Q', [X - 4.2, Y - 16], [X - 7.2, Y - 25.6]], ['Z']], '#F4EFE2', { outline: true });
    for (const k of [0.33, 0.66]) g.line([X - 6.4 + k * 0.2, Y - 25.6 + k * 19.6], [X + 10.4 - k * 0.4, Y - 26.4 + k * 19.6], '#D8CFB8', 0.4);
  }
  g.line([X + 1.4, Y - 27], [X + 13.4, Y - 4.4], ROPE, 0.3, 0.8);                                                      // the forestay
  g.poly([[X + 1.4, Y - 27], [X + 5.6, Y - 26.2], [X + 1.4, Y - 25]], BLUE);                                               // a streamer at the masthead
}

// A pack donkey heading right, a striped load on its back (the trading post's donkeys, walking).
export function packDonkey(g0, gx, gy, left = false, pack = RED) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y + 0.4], 5, 1.4, SHADOW, { alpha: 0.22 });
  for (const dx of [-2.6, -1.4, 1.6, 2.8]) g.line([X + dx, Y - 3], [X + dx + (dx < 0 ? -0.4 : 0.4), Y], '#6E625C', 0.8);
  g.ell([X, Y - 4.2], 4, 1.9, '#9A8C84', { outline: true });
  g.line([X + 3.2, Y - 4.6], [X + 4.6, Y - 7], '#9A8C84', 1.6);                                                           // the neck, forward
  g.ell([X + 5.2, Y - 7.2], 1.6, 1.1, '#9A8C84', { outline: true });
  g.ell([X + 6.3, Y - 6.9], 0.7, 0.6, '#E8E0D8');
  g.line([X + 4.8, Y - 8], [X + 4.4, Y - 10], '#8A7C74', 0.7);
  g.line([X + 5.4, Y - 8], [X + 5.6, Y - 10], '#8A7C74', 0.7);
  g.line([X - 3.8, Y - 4.6], [X - 4.6, Y - 2.6], '#6E625C', 0.6);                                                         // the tail
  g.poly([[X - 2.2, Y - 6.4], [X + 2, Y - 6.4], [X + 2.4, Y - 2.6], [X - 2.6, Y - 2.6]], pack, { outline: true });
  g.line([X - 2.2, Y - 4.8], [X + 2.2, Y - 4.8], GOLD, 0.6);
  g.ell([X - 0.1, Y - 7.2], 1.8, 0.9, BALES[0], { outline: true });
}

// The caravan's trader, walking right: a walker in a long striped robe and a headcloth, with a tall staff.
export function trader(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  fig(left ? g : g0, gx, gy, 'noble');
  g.poly([[X - 2, Y - 1], [X + 2, Y - 1], [X + 1.6, Y - 8.4], [X - 1.6, Y - 8.4]], '#E9DCC0', { outline: true });        // the robe
  for (const dx of [-0.8, 0.8]) g.line([X + dx, Y - 1.2], [X + dx * 0.8, Y - 8.2], TEAL, 0.5);
  g.poly([[X - 2.2, Y - 10.4], [X + 1.6, Y - 11.2], [X + 1.4, Y - 9.2], [X - 2.6, Y - 7.6]], '#F4EFE2', { outline: true }); // the headcloth
  g.line([X + 2.6, Y + 0.4], [X + 3.2, Y - 15], WOOD, 0.6);                                                               // the staff
}

// ── The registry ──
const UNIT = (h, wide = 14) => ({ w: 0, d: 0, height: h, bounds: [-wide - 4, -h - 12, wide + 4, 8], shadows: [] });
const both = (name, draw, h, wide) => ({
  [`fig.${name}`]: { ...UNIT(h, wide), draw: (g, x, y) => draw(g, x, y, false) },
  [`fig.${name}_l`]: { ...UNIT(h, wide), draw: (g, x, y) => draw(g, x, y, true) },
});
export const QUAY_HEIGHT = 16;   // the landing, the shed and its awning (the pennant rises above, inside the bounds' margin)
const SIDE_ART = (side) => {
  const S = SIDES[side];
  return { w: S.w, d: S.d, height: QUAY_HEIGHT, bounds: boundsFor(S.w, S.d, QUAY_HEIGHT, 24), shadows: [[0.1, 0.08, 0.7, 0.5, 9]], draw: (g, x, y) => quay(g, x, y, side) };
};
export const TRADE_ART = {
  [QUAY_TYPE]: SIDE_ART('s'),
  [`${QUAY_TYPE}.s`]: SIDE_ART('s'), [`${QUAY_TYPE}.n`]: SIDE_ART('n'), [`${QUAY_TYPE}.e`]: SIDE_ART('e'), [`${QUAY_TYPE}.w`]: SIDE_ART('w'),
  ...both('trade_boat', (g, x, y, left) => tradeBoat(g, x, y, left, false), 30, 22),
  ...both('trade_boat_moored', (g, x, y, left) => tradeBoat(g, x, y, left, true), 30, 22),
  ...both('pack_donkey', (g, x, y, left) => packDonkey(g, x, y, left, RED), 12),
  ...both('pack_donkey_b', (g, x, y, left) => packDonkey(g, x, y, left, BLUE), 12),
  ...both('trader', trader, 18),
};

// The slot a Track T building shows: a Quay facing its water ('quay.<side>'), else null.
export const tradeSlot = (b, world) => (b.type === QUAY_TYPE && world ? `${QUAY_TYPE}.${wharfSide(world, b)}` : null);
