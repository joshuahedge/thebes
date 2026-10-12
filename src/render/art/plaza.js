// Plazas and sphinxes (spec 5.7 item 5, rulings 215, 250, 257). A plaza is a 1x1 paved mosaic of blue-and-white checks
// on a low slab with crisp edges (spec 5.2: built surfaces stay crisp); painted plazas join into one court: the checks
// run on across the joins and a sandstone kerb with a gold line runs only along the court's open edges, so the slot
// depends on which neighbours are plazas (plazaEdges: one bit per side, 16 slots). A sphinx is a 1x1 lion lying on a
// banded plinth, its head in a striped headcloth, facing the nearest road (sphinxFacing: four slots); with no road near
// it faces the viewer's left (+y).
import { box, tb, qd, p, U, quad } from './primitives.js';
import { STONE, TEAL, TEAL_DARK, BLUE, GOLD, GOLDC, DOOR, SHADOW } from './palette.js';
import { idx, inBounds } from '../../sim/grid.js';
import { boundsFor } from '../iso.js';

const CHECK = '#3F6FA6', CREAM = '#F3EAD6', KERB = ['#EBD8AE', '#D9C08E', '#B3A0A6'];
const SLAB = ['#F1E6CF', '#E4D6BC', '#BFB2C2'];

// The sides of a plaza tile, as bits: 1 its -y neighbour, 2 +x, 4 +y, 8 -x. A set bit means that neighbour is a plaza.
export const EDGE_BITS = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];

export function plazaEdges(world, b) {
  let mask = 0;
  for (const [dx, dy, bit] of EDGE_BITS) {
    const x = b.x + dx, y = b.y + dy;
    if (!inBounds(world.size, x, y)) continue;
    const o = world.buildings[world.occ[idx(world.size, x, y)]];
    if (o && o.type === 'plaza') mask |= bit;
  }
  return mask;
}

// One plaza tile at (x, y) whose neighbours on the set bits of `joined` are plazas.
export function plaza(g, x, y, joined = 0) {
  const h = 1;
  box(g, x, y, 1, 1, h, 0, SLAB, 0);
  const open = (bit) => !(joined & bit);
  const e = 0.12;
  const x0 = x + (open(8) ? e : 0), x1 = x + 1 - (open(2) ? e : 0), y0 = y + (open(1) ? e : 0), y1 = y + 1 - (open(4) ? e : 0);
  g.poly(quad(x0, y0, x1 - x0, y1 - y0, h), CREAM);
  // the checks: a 4x4 board a tile, the same parity on every tile so they run on across a court's joins
  g.save();
  g.clip(quad(x0, y0, x1 - x0, y1 - y0, h));
  const squares = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) squares.push(quad(x + i / 4, y + j / 4, 0.25, 0.25, h));
  g.polys(squares, CHECK);
  g.restore();
  // the kerb and its gold line along each open edge
  const kerb = [[1, x, y, 1, e], [8, x, y, e, 1], [2, x + 1 - e, y, e, 1], [4, x, y + 1 - e, 1, e]];
  for (const [bit, kx, ky, kw, kd] of kerb) if (open(bit)) g.poly(quad(kx, ky, kw, kd, h), KERB[0]);
  if (open(1)) g.line(U(p(x0, y0), h), U(p(x1, y0), h), GOLD, 0.6);
  if (open(8)) g.line(U(p(x0, y0), h), U(p(x0, y1), h), GOLD, 0.6);
  if (open(2)) g.line(U(p(x1, y0), h), U(p(x1, y1), h), GOLD, 0.6);
  if (open(4)) g.line(U(p(x0, y1), h), U(p(x1, y1), h), GOLD, 0.6);
}

// The four ways a sphinx faces: 0 +x (the viewer's right), 1 +y (the viewer's left), 2 -x, 3 -y (away).
export const FACINGS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const NEAR = 6;   // how far (in tiles, either way) a sphinx looks for a road
const facingMemo = new WeakMap();   // world -> { version, at: Map<id, facing> }

// The way a sphinx at b faces: towards the nearest road tile within NEAR tiles (by straight distance from its centre,
// ties to the lower tile index), along the axis that road lies further along (ties to y, the lit side); +y with none.
export function sphinxFacing(world, b) {
  let m = facingMemo.get(world);
  if (!m || m.version !== world.roadVersion) { m = { version: world.roadVersion, at: new Map() }; facingMemo.set(world, m); }
  const key = `${b.id}:${b.x},${b.y}`;
  if (m.at.has(key)) return m.at.get(key);
  let best = null;
  for (let y = b.y - NEAR; y <= b.y + NEAR; y++) {
    for (let x = b.x - NEAR; x <= b.x + NEAR; x++) {
      if (!inBounds(world.size, x, y) || !world.road[idx(world.size, x, y)]) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (!best || d < best.d - 1e-9) best = { x, y, d };
    }
  }
  let f = 1;
  if (best) {
    const dx = best.x - b.x, dy = best.y - b.y;
    f = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
  }
  m.at.set(key, f);
  return f;
}

const LION = ['#EBCF96', '#D8B47A', '#AC9282'];
const NEMES = ['#F2DCA4', '#E0C084', '#B8A08E'];

// A sphinx on tile (x, y) facing `f` (FACINGS). Its parts are laid out along the facing (u: 0 tail .. 1 paws) and across
// it (v), then drawn back to front, so the head is drawn last when it faces the viewer and first when it faces away.
export function sphinx(g, x, y, f = 1) {
  const [fx, fy] = FACINGS[f];
  const rect = (u0, u1, v0, v1) => {
    if (fx === 1) return [x + u0, y + v0, u1 - u0, v1 - v0];
    if (fx === -1) return [x + 1 - u1, y + v0, u1 - u0, v1 - v0];
    if (fy === 1) return [x + v0, y + u0, v1 - v0, u1 - u0];
    return [x + v0, y + 1 - u1, v1 - v0, u1 - u0];
  };
  const part = (u0, u1, v0, v1, h, z, C, i = 0) => { const [a, b2, w, d] = rect(u0, u1, v0, v1); return tb(g, a, b2, w, d, h, z, i, C); };
  const c = p(x + 0.5, y + 0.5);
  g.ell([c[0] + 4, c[1] + 1], 12, 4, SHADOW, { alpha: 0.12 });
  const P = part(0.06, 0.94, 0.2, 0.8, 3.2, 0, STONE);                         // the plinth, banded in teal and gold
  qd(g, P.L, 0, 1, 1.1, 2, TEAL);
  qd(g, P.R, 0, 1, 1.1, 2, TEAL_DARK);
  qd(g, P.L, 0, 1, 2.6, 3.2, GOLD);
  qd(g, P.R, 0, 1, 2.6, 3.2, GOLDC[2]);
  const towards = fx > 0 || fy > 0;                                            // the head is nearer the viewer than the tail
  const body = () => {
    part(0.12, 0.6, 0.34, 0.66, 3.4, 3.2, LION, 0.03);                         // the back
    part(0.12, 0.32, 0.31, 0.69, 4.6, 3.2, LION, 0.06);                        // the haunch
  };
  const paws = () => {
    for (const [v0, v1] of [[0.35, 0.46], [0.54, 0.65]]) part(0.6, 0.92, v0, v1, 1.3, 3.2, LION);
  };
  const head = () => {
    part(0.52, 0.68, 0.37, 0.63, 5, 3.2, LION, 0.03);                          // the chest
    const H = part(0.54, 0.73, 0.35, 0.65, 5.2, 7.6, NEMES, 0.05);              // the headcloth, falling to the shoulders
    for (const F of [H.L, H.R]) for (let s = 0.6; s < 4.6; s += 1.1) qd(g, F, 0, 1, s, s + 0.5, BLUE, { alpha: 0.85 });
    const face = fx === 1 ? H.R : fy === 1 ? H.L : null;                      // the face shows only towards the viewer
    if (face) {
      qd(g, face, 0.3, 0.7, 0.4, 3.6, LION[1]);
      qd(g, face, 0.36, 0.45, 2.4, 2.9, DOOR);
      qd(g, face, 0.55, 0.64, 2.4, 2.9, DOOR);
    }
    const [hx, hy, hw, hd] = rect(0.6, 0.68, 0.45, 0.55);
    box(g, hx, hy, hw, hd, 1.4, 12.8, GOLDC, 0);                               // the cobra crown
  };
  if (towards) { body(); paws(); head(); } else { paws(); head(); body(); }
  const [tx, ty] = rect(0.1, 0.12, 0.68, 0.7);
  g.line(U(p(tx, ty), 3.4), U(p(tx + (fy ? 0.2 : 0), ty + (fx ? 0.2 : 0)), 3.4), LION[2], 0.7);   // the tail along the plinth
}

const PLAZA_SLOT = { w: 1, d: 1, height: 1, bounds: boundsFor(1, 1, 1), shadows: [] };
const SPHINX_SLOT = { w: 1, d: 1, height: 15, bounds: boundsFor(1, 1, 17), shadows: [] };

export const PLAZA_ART = {
  plaza: { ...PLAZA_SLOT, draw: (g, x, y) => plaza(g, x, y, 0) },
  sphinx: { ...SPHINX_SLOT, draw: (g, x, y) => sphinx(g, x, y, 1) },
};
for (let m = 0; m < 16; m++) PLAZA_ART[`plaza.e${m}`] = { ...PLAZA_SLOT, draw: (g, x, y) => plaza(g, x, y, m) };
for (let f = 0; f < 4; f++) PLAZA_ART[`sphinx.f${f}`] = { ...SPHINX_SLOT, draw: (g, x, y) => sphinx(g, x, y, f) };
