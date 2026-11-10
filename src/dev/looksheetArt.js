// Version 9.3 wave 0 (ruling 1889): the reference drawings of the look sheet (src/dev/looksheet.js). They are not registered in ART: the sheet draws
// them directly, so nothing in the game changes until the tracks lift this code into their own files, at the same bar. Everything is drawn through
// the new primitives (src/render/art/primitives.js) and the materials of the four looks (src/render/art/materials.js). look is 0 village, 1 town,
// 2 city, 3 capital. Each function draws one tile footprint (or a 2x2) at tile (x, y) of the art's own space.
import {
  box, tb, qd, crs, pots, p, U, quad, hs, groundShadow, shadeWall, silhouette, contactLine, insetOpening, parapetSteps, awning, cornice, band,
  porch, gildedCap, col, mat, bed, pool,
} from '../render/art/primitives.js';
import { MATERIALS, BAND2 } from '../render/art/materials.js';
import { palmAt } from '../render/art/nature.js';
import {
  MUD, THATCH, TEAL, TEAL_DARK, BLUE, RED, GOLD, GOLDC, PINK, PURP, ORANGE, WOOD, TRUNK, TRUNK_RING, LEAF, LEAF2, LEAF3, SHADOW, INK, DOOR, WINDOW,
  PARAPET, POT, POT_LIGHT, OUTLINE, TERRAIN, STONE, WASH,
} from '../render/art/palette.js';

const M = MATERIALS;
const DOORS = [TEAL_DARK, '#9A3A30', '#245A88'];   // a painted door by variant (Village and Town); the City and the Capital paint the frame instead
const MATS = [[BLUE, GOLD], [RED, GOLD], [TEAL, PINK]];

// A wall block at the new bar: the faces, a soft shade down each, the 1.0 px silhouette and the contact line where it meets the ground.
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

// ---- the ground under a building: the trodden yard (spec section 5) --------------------------------------------------------------------
// Village: packed earth, a frayed blob with pebbles; Town: swept gravel with a firm edge; City: part packed, part paved at the front with a kerb;
// Capital: a paved court with a border and joints. w x d is the footprint, e how far the yard reaches beyond it.
export function yard(g, x, y, w, d, look, e = 0.3) {
  const m = M[look], [packed, edge] = m.ground;
  const c = [p(x - e, y - e), p(x + w + e, y - e), p(x + w + e, y + d + e), p(x - e, y + d + e)];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const blob = (k) => {
    const q = c.map((pt, i) => { const cx = (c[0][0] + c[2][0]) / 2, cy = (c[0][1] + c[2][1]) / 2; return [cx + (pt[0] - cx) * k, cy + (pt[1] - cy) * k]; });
    return [['M', mid(q[0], q[1])], ['Q', q[1], mid(q[1], q[2])], ['Q', q[2], mid(q[2], q[3])], ['Q', q[3], mid(q[3], q[0])], ['Q', q[0], mid(q[0], q[1])], ['Z']];
  };
  if (look <= 1) {
    g.path(blob(1.1), edge, { alpha: 0.35 });          // the worn rim, fading into the sand
    g.path(blob(0.98), packed, { alpha: look === 0 ? 0.9 : 0.95 });
    if (look === 1) g.path(blob(0.98), 'none', { stroke: edge, strokeWidth: 0.9, strokeAlpha: 0.8 });   // a firm edge
    const n = look === 0 ? 7 : 12;
    for (let i = 0; i < n; i++) {
      const q = p(x - e + (w + 2 * e) * (0.12 + 0.76 * hs(x, y, i + 3)), y - e + (d + 2 * e) * (0.12 + 0.76 * hs(y, x, i + 9)));
      g.circ(q, look === 0 ? 0.7 : 0.55, look === 0 ? TERRAIN.roadPebble : TERRAIN.pebble, { alpha: 0.6 });
    }
    return;
  }
  g.path(blob(1.08), edge, { alpha: 0.3 });
  g.path(blob(0.98), packed, { alpha: 0.9 });
  const front = look === 2 ? [p(x - e, y + d * 0.35), p(x + w + e, y + d * 0.35), p(x + w + e, y + d + e), p(x - e, y + d + e)] : c;
  g.poly(front, m.paving, { stroke: look === 2 ? STONE[2] : '#CDB27A', strokeWidth: look === 2 ? 1.2 : 1, strokeAlpha: 0.85 });
  const [a, b, cc, dd] = front;
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    g.line([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [dd[0] + (cc[0] - dd[0]) * t, dd[1] + (cc[1] - dd[1]) * t], STONE[2], 0.4, 0.3);
    g.line([a[0] + (dd[0] - a[0]) * t, a[1] + (dd[1] - a[1]) * t], [b[0] + (cc[0] - b[0]) * t, b[1] + (cc[1] - b[1]) * t], STONE[2], 0.4, 0.3);
  }
}

// ---- homes -------------------------------------------------------------------------------------------------------------------------------
const thatch = (g, x, y, w, d, z, h, i = 0.36) => {
  const R = tb(g, x, y, w, d, h, z, i, THATCH);
  for (let u = 0.08; u < 0.95; u += 0.14) {
    g.line(R.L(u, 0), R.L(0.5 + (u - 0.5) * 0.25, h * 0.88), '#AC8840', 0.45, 0.75);
    g.line(R.R(u, 0), R.R(0.5 + (u - 0.5) * 0.25, h * 0.88), '#8E7058', 0.45, 0.75);
  }
  g.line(R.L(0.5, h * 0.9), R.R(0.5, h * 0.9), '#8E7058', 0.6, 0.5);
  return R;
};

// A flat roof at the look's bar: a terrace slab, then the parapet's steps (City, Capital) or a plain parapet (Village, Town).
function roofTop(g, x, y, w, d, z, look, n = 3) {
  const m = M[look];
  if (look <= 1) {
    box(g, x + 0.02, y + 0.02, w - 0.04, d - 0.04, 0.9, z, [PARAPET, '#ECE2D2', '#C6BACB']);
    g.poly(quad(x + 0.08, y + 0.08, w - 0.16, d - 0.16, z + 0.9), look === 0 ? '#D8BC84' : m.cornice[1], { alpha: 0.9 });
  } else {
    cornice(g, { x, y, w, d, z }, m.cornice);
    g.poly(quad(x + 0.04, y + 0.04, w - 0.08, d - 0.08, z), m.roof[0]);
    parapetSteps(g, { x, y, w, d, z, C: look === 3 ? [m.roof[0], m.roof[1], m.roof[2]] : undefined }, n, look === 3 ? 1.4 : 1.2);
  }
}

// Tier 1: a hut. Mud and thatch in the Village; whitewash under reed in the Town; a small flat-roofed house in the City and the Capital.
export function hut(g, x, y, look, v = 0) {
  const m = M[look], a = x + 0.22, b = y + 0.22, w = 0.56, h = look >= 2 ? 7.5 : 6;
  groundShadow(g, a, b, w, w, 9);
  const F = block(g, a, b, w, w, h, 0, m.wall);
  if (look === 0) crs(g, F, h, '#9C7A54', 2.2);
  insetOpening(g, { F: F.L, u: 0.34, s: 0 }, 0.28, 4.3, { lintel: look === 0 ? WOOD : m.trim, fill: look === 0 ? '#4A3218' : DOOR, lit: false });
  insetOpening(g, { F: F.R, u: 0.36, s: 2.6 }, 0.26, 2.2, { lintel: look === 0 ? WOOD : m.trim, fill: WINDOW });
  if (look <= 1) {
    thatch(g, a - 0.07, b - 0.07, w + 0.14, w + 0.14, h, 5.2);
    if (look === 1) {
      band(g, F, 0.8, m.band, 0.9);
      awning(g, { F: F.L, u: 0.22, s: 5.2 }, 0.42, TEAL);
    }
  } else {
    band(g, F, h - 2.8, m.band, 1.1);
    if (look === 2) band(g, F, h - 4.4, BAND2[look], 0.7);
    roofTop(g, a, b, w, w, h, look, 2);
  }
  if (look === 0) {
    const fence = box(g, x + 0.06, y + 0.88, 0.62, 0.06, 2.6, 0, ['#DDB872', '#CCA463', '#A48474'], 0);
    for (let u = 0.08; u < 1; u += 0.14) { g.line(fence.L(u, 0), fence.L(u, 2.6), '#9C7A3A', 0.35); }
  }
  jar(g, p(x + (look === 0 ? 0.86 : 0.84), y + (look === 0 ? 0.62 : 0.72)), POT, 0.9);
  if (look === 1) jar(g, p(x + 0.72, y + 0.9), '#E9C08A', 0.8);
}

// A dovecote: a small stepped box with two dark openings.
function dovecote(g, x, y, z, C) {
  const F = box(g, x, y, 0.2, 0.2, 3.4, z, C, 0);
  qd(g, F.L, 0.2, 0.42, 1.4, 2.4, INK, { alpha: 0.8 });
  qd(g, F.L, 0.56, 0.78, 1.4, 2.4, INK, { alpha: 0.8 });
  box(g, x - 0.02, y - 0.02, 0.24, 0.24, 0.7, z + 3.4, [PARAPET, '#ECE2D2', '#C6BACB'], 0);
}

// Linen drying on a line across a roof.
function linen(g, x, y, z) {
  const a = U(p(x, y), z), b = U(p(x + 0.45, y + 0.02), z);
  g.line(U(a, 0), U(a, 4), WOOD, 0.5); g.line(U(b, 0), U(b, 4), WOOD, 0.5);
  g.line(U(a, 4), U(b, 4), WOOD, 0.4, 0.8);
  [['#FFFFFF', 0.15], [PINK, 0.45], ['#F7F2E8', 0.75]].forEach(([c, t]) => {
    const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4];
    g.poly([[q[0] - 1.4, q[1]], [q[0] + 1.4, q[1] + 0.5], [q[0] + 1.3, q[1] + 3.8], [q[0] - 1.5, q[1] + 3.3]], c, { outline: true });
  });
}

// Tier 3: a cottage of two blocks; v is the variant (0 door on the annex and jars on the roof; 1 door on the main block and linen; 2 a dovecote and a palm).
export function cottage(g, x, y, look, v = 0) {
  const m = M[look];
  const hA = 9 + (look >= 2 ? 1.5 : 0) + (look === 3 ? 1 : 0), hB = 6 + (look >= 2 ? 1 : 0);
  const A0 = [x + 0.1, y + 0.1, 0.65, 0.6], B0 = [x + 0.5, y + 0.52, 0.42, 0.4];
  groundShadow(g, ...A0, hA + 3); groundShadow(g, ...B0, hB + 2);
  const A = block(g, ...A0, hA, 0, m.wall);
  const B = block(g, ...B0, hB, 0, look === 3 ? M[3].wall : look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall);
  if (look === 0) { crs(g, A, hA, '#9C7A54', 2.4); crs(g, B, hB, '#9C7A54', 2.4); }
  const trim = look === 0 ? WOOD : m.trim;
  const doorFill = look <= 1 ? DOORS[v] : DOOR;
  // windows and door by variant
  insetOpening(g, { F: A.R, u: 0.3, s: 4.6 }, 0.22, 2.6, { lintel: trim, fill: WINDOW });
  if (v !== 2) insetOpening(g, { F: A.L, u: 0.1, s: 4.6 }, 0.2, 2.6, { lintel: trim, fill: WINDOW });
  if (v === 1) {
    insetOpening(g, { F: A.L, u: 0.56, s: 0 }, 0.26, 4.6, { lintel: trim, fill: doorFill });
    insetOpening(g, { F: B.L, u: 0.3, s: 2.2 }, 0.28, 2.2, { lintel: trim, fill: WINDOW });
  } else {
    insetOpening(g, { F: B.L, u: v === 2 ? 0.58 : 0.3, s: 0 }, 0.28, 4.4, { lintel: trim, fill: doorFill });
    if (v === 2) insetOpening(g, { F: A.L, u: 0.3, s: 3.8 }, 0.3, 3, { lintel: trim, fill: WINDOW });
  }
  // the look's walls and top
  if (look === 1) band(g, A, 0.9, m.band, 1.0);
  if (look === 2) { band(g, A, hA - 3.4, m.band, 1.3); band(g, A, hA - 5.2, BAND2[look], 0.8); band(g, B, hB - 2.6, BAND2[look], 1.2); }
  if (look === 3) { band(g, A, hA - 4, m.band, 1.0); band(g, B, hB - 2.8, m.band, 0.9); }
  roofTop(g, ...A0, hA, look, 3);
  roofTop(g, ...B0, hB, look, 2);
  if (look <= 1) mat(g, x + 0.22, y + 0.2, 0.34, 0.28, hA + 0.9, MATS[v][0], MATS[v][1]);
  if (look === 3 && v === 1) gildedCap(g, U(p(x + 0.42, y + 0.4), hA + 2.8), 2);
  // door furniture
  const doorF = v === 1 ? { F: A.L, u: 0.5 } : { F: B.L, u: v === 2 ? 0.5 : 0.24 };
  if (look === 1) awning(g, { F: doorF.F, u: doorF.u, s: v === 1 ? 5.6 : 5.4 }, 0.42, v === 1 ? RED : TEAL);
  if (look === 2) {   // a timber balcony on the shaded face
    box(g, x + 0.75, y + 0.18, 0.13, 0.34, 0.7, 4.2, ['#9A7448', '#8A6A4A', '#6B4A3A'], 0);
    for (let u = 0.1; u < 1; u += 0.22) g.line(U(p(x + 0.88, y + 0.18 + 0.34 * u), 4.9), U(p(x + 0.88, y + 0.18 + 0.34 * u), 7.2), WOOD, 0.35, 0.9);
    g.line(U(p(x + 0.88, y + 0.18), 7.2), U(p(x + 0.88, y + 0.52), 7.2), WOOD, 0.6);
  }
  // clutter
  if (v === 0) { pots(g, U(p(x + 0.64, y + 0.7), hB + 0.9), 2); }
  if (v === 1) linen(g, x + 0.2, y + 0.18, hA + 0.9);
  if (v === 2) { dovecote(g, x + 0.3, y + 0.24, hA + 0.9, look >= 2 ? [m.wall[0], m.wall[1], m.wall[2]] : [PARAPET, '#ECE2D2', '#C6BACB']); palmAt(g, x + 0.88, y + 0.88, 0.6); }
  if (look >= 1 && v !== 2) jar(g, p(x + 0.22, y + 0.92), look === 1 ? POT : '#E9C08A', 0.85);
  if (look === 1 && v === 0) box(g, x + 0.08, y + 0.8, 0.3, 0.1, 1.6, 0, ['#DDB872', '#CCA463', '#A48474'], 0);   // a bench
}

// Draws fn with everything raised z art px (the primitives that draw flat on the ground, put on a roof).
const lift = (g, z, fn) => { g.ctx.save(); g.ctx.translate(0, -z * g.scale); fn(); g.ctx.restore(); };

// A vine pergola over a roof terrace: four posts, a lattice of beams and leaves.
function pergola(g, x, y, w, d, z) {
  const cs = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].map(([a, b]) => p(a, b));
  for (const c of cs) g.line(U(c, z), U(c, z + 5.4), WOOD, 0.7);
  const top = cs.map((c) => U(c, z + 5.4));
  g.poly(top, 'none', { stroke: WOOD, strokeWidth: 0.8 });
  for (let t = 0.25; t < 1; t += 0.25) {
    g.line([top[0][0] + (top[1][0] - top[0][0]) * t, top[0][1] + (top[1][1] - top[0][1]) * t], [top[3][0] + (top[2][0] - top[3][0]) * t, top[3][1] + (top[2][1] - top[3][1]) * t], WOOD, 0.5, 0.9);
  }
  for (let i = 0; i < 9; i++) { const q = [top[0][0] + (top[2][0] - top[0][0]) * hs(x, i, 1), top[0][1] + (top[2][1] - top[0][1]) * hs(y, i, 2)]; g.circ(q, 1.3, i % 3 ? LEAF : LEAF2); }
}

// Tiers 6-9: a big home, 2x2: a tall main block with a lower wing and a court. The look sets its walls and top; the tier sets its size and its crown.
export function manor(g, x, y, look, tier) {
  const m = M[look], top = tier === 9;
  const hA = top ? 21 : 14, hB = top ? 13 : 9;
  const A0 = [x + 0.12, y + 0.1, top ? 1.3 : 1.15, top ? 1.05 : 0.95], B0 = [x + 1.1, y + 0.86, 0.8, 0.98];
  groundShadow(g, ...A0, hA + 3); groundShadow(g, ...B0, hB + 3);
  const A = block(g, ...A0, hA, 0, m.wall), B = block(g, ...B0, hB, 0, m.wall);
  if (look === 0) { crs(g, A, hA, '#9C7A54', 2.6); crs(g, B, hB, '#9C7A54', 2.6); }
  const trim = look === 0 ? WOOD : m.trim;
  // two storeys of windows on the main block, a door on the wing
  for (const [u, s] of [[0.12, hA * 0.5], [0.4, hA * 0.5], [0.68, hA * 0.5], [0.12, hA * 0.18], [0.68, hA * 0.18]]) {
    if (!top && s < hA * 0.2 && u > 0.5) continue;
    insetOpening(g, { F: A.L, u, s: Math.max(s, 2.6) }, 0.15, top ? 4 : 3.2, { lintel: trim, fill: WINDOW, lit: look >= 2 && u > 0.5 && s > 5 });
  }
  insetOpening(g, { F: A.L, u: 0.4, s: 0 }, 0.2, 5, { lintel: trim, fill: look <= 1 ? TEAL_DARK : DOOR });
  for (const u of [0.2, 0.55]) insetOpening(g, { F: A.R, u, s: hA * 0.45 }, 0.18, 3.6, { lintel: trim, fill: WINDOW });
  insetOpening(g, { F: B.L, u: 0.38, s: 0 }, 0.24, 5, { lintel: trim, fill: look <= 1 ? '#9A3A30' : DOOR });
  insetOpening(g, { F: B.R, u: 0.3, s: hB * 0.35 }, 0.2, 3, { lintel: trim, fill: WINDOW });
  // walls by look
  if (look === 1) { band(g, A, 1, m.band, 1); band(g, B, 1, m.band, 1); }
  if (look === 2) { band(g, A, hA - 4.2, m.band, 1.6); band(g, A, hA - 6.4, BAND2[look], 0.9); band(g, B, hB - 3, BAND2[look], 1.4); }
  if (look === 3) { band(g, A, hA - 4.5, m.band, 1.2); band(g, A, hA - 6.4, GOLD, 0.7); band(g, B, hB - 3.2, m.band, 1.1); }
  // roofs
  if (look === 0) {
    thatch(g, A0[0] - 0.05, A0[1] - 0.05, A0[2] + 0.1, A0[3] + 0.1, hA, 6, 0.3);
    roofTop(g, ...B0, hB, 0);
    if (!top) mat(g, B0[0] + 0.1, B0[1] + 0.12, 0.4, 0.4, hB + 0.9, PINK, null);
  } else {
    roofTop(g, ...A0, hA, look, 5);
    roofTop(g, ...B0, hB, look, 3);
  }
  // the tier's roof tell (spec 4.6): a vine pergola at 6, a garden and a pool at 9
  if (!top && look <= 1) pergola(g, B0[0] + 0.14, B0[1] + 0.16, 0.5, 0.5, hB + 0.9);
  else if (!top) lift(g, hB + 1.5, () => bed(g, B0[0] + 0.14, B0[1] + 0.16, 0.5, 0.5));
  else {
    lift(g, hB + 0.9, () => { bed(g, B0[0] + 0.1, B0[1] + 0.1, 0.32, 0.32); pool(g, B0[0] + 0.42, B0[1] + 0.5, 0.3, 0.34); });
  }
  // the look's extras and the tier's crown
  if (look <= 1) { awning(g, { F: B.L, u: 0.2, s: 5.8 }, 0.55, look === 0 ? ORANGE : TEAL); if (look === 1) awning(g, { F: A.L, u: 0.3, s: 5.8 }, 0.4, RED); }
  if (look === 2) {
    box(g, x + 1.9, y + 0.9, 0.13, 0.62, 0.8, hB - 5, ['#9A7448', '#8A6A4A', '#6B4A3A'], 0);   // a timber balcony on the wing's shaded face
    for (let u = 0.08; u < 1; u += 0.12) g.line(U(p(x + 2.03, y + 0.9 + 0.62 * u), hB - 4.2), U(p(x + 2.03, y + 0.9 + 0.62 * u), hB - 1.6), WOOD, 0.35, 0.9);
    g.line(U(p(x + 2.03, y + 0.9), hB - 1.6), U(p(x + 2.03, y + 1.52), hB - 1.6), WOOD, 0.6);
  }
  if (look === 3 && !top) gildedCap(g, U(p(x + 0.7, y + 0.6), hA + 1.8), 2.6);
  if (top) {
    if (look === 3) gildedCap(g, U(p(x + 0.76, y + 0.62), hA + 1.8), 4);
    else if (look === 2) { box(g, x + 0.5, y + 0.4, 0.5, 0.4, 3.4, hA + 0.9, m.wall); box(g, x + 0.46, y + 0.36, 0.58, 0.48, 0.8, hA + 4.3, [TEAL, TEAL, TEAL_DARK], 0); }
    const f = U(p(x + 0.3, y + 0.3), hA + 1);
    g.line(f, U(f, 9), WOOD, 0.7);
    g.poly([U(f, 9), [f[0] + 5, f[1] - 7.6], U(f, 5.4)], look === 3 ? GOLD : RED);
  }
  palmAt(g, x + 0.3, y + 1.75, 0.65);
  if (tier >= 8 || look >= 2) jar(g, p(x + 1.0, y + 1.7), '#E9C08A', 1);
}

// ---- services and workshops --------------------------------------------------------------------------------------------------------------
const planks = (g, F, u0, u1, s0, s1) => {   // a shut plank door or shutter, barred across
  qd(g, F, u0, u1, s0, s1, '#6A4A38');
  for (let u = u0 + (u1 - u0) / 4; u < u1 - 0.001; u += (u1 - u0) / 4) g.line(F(u, s0), F(u, s1), INK, 0.4, 0.55);
  g.line(F(u0, s0 + (s1 - s0) * 0.3), F(u1, s0 + (s1 - s0) * 0.7), '#B08A5A', 0.8, 0.95);
  g.line(F(u0, s0 + (s1 - s0) * 0.7), F(u1, s0 + (s1 - s0) * 0.3), '#B08A5A', 0.8, 0.95);
};
const sack = (g, q, c = '#D9C495') => {
  g.ell([q[0], q[1] + 0.3], 2.4, 0.9, SHADOW, { alpha: 0.18 });
  g.path([['M', [q[0] - 2, q[1]]], ['Q', [q[0] - 2.6, q[1] - 4.2], [q[0] - 0.4, q[1] - 5.2]], ['Q', [q[0] + 2.4, q[1] - 4.4], [q[0] + 2, q[1]]], ['Z']], c, { outline: true });
  g.line([q[0] - 1.1, q[1] - 4.4], [q[0] + 1, q[1] - 4.4], '#8A6A4A', 0.5);
};
const puff = (g, q, r, a) => { g.circ(q, r, '#FFFFFF', { alpha: a }); g.circ([q[0] - r * 0.3, q[1] - r * 0.25], r * 0.65, '#FFFFFF', { alpha: a * 0.6 }); };

// A drum with a lit side and a shaded side (the granary's silo, the kiln): centre of its base at c, radius r, height h, C = [top, lit, shade].
function drum(g, c, r, h, C, cap = true) {
  const ry = r * 0.5, s = g.scale;
  const gr = g.ctx.createLinearGradient((c[0] - r) * s, 0, (c[0] + r) * s, 0);
  gr.addColorStop(0, C[1]); gr.addColorStop(0.45, C[1]); gr.addColorStop(1, C[2]);
  g.path([['M', [c[0] - r, c[1] - h]], ['L', [c[0] - r, c[1]]], ['Q', [c[0], c[1] + 2 * ry], [c[0] + r, c[1]]], ['L', [c[0] + r, c[1] - h]], ['Z']], gr);
  g.path([['M', [c[0] - r, c[1] - h]], ['L', [c[0] - r, c[1]]], ['Q', [c[0], c[1] + 2 * ry], [c[0] + r, c[1]]], ['L', [c[0] + r, c[1] - h]]], 'none', { stroke: OUTLINE, strokeWidth: 1, strokeAlpha: 0.55 });
  g.path([['M', [c[0] - r, c[1]]], ['Q', [c[0], c[1] + 2 * ry], [c[0] + r, c[1]]]], 'none', { stroke: INK, strokeWidth: 1.1, strokeAlpha: 0.45 });
  if (cap) { g.ell([c[0], c[1] - h], r, ry, C[0], { stroke: OUTLINE, strokeWidth: 1, strokeAlpha: 0.55 }); }
}

// The granary: a big silo with its yard. work: the door open on a warm lit doorway, sacks and a heap of grain in the yard. shut: the plank door barred, no sacks.
export function granaryRef(g, x, y, look, state = 'work') {
  const m = M[look], c = p(x + 1, y + 0.9);
  groundShadow(g, x + 0.3, y + 0.2, 1.4, 1.2, 14);
  // a low walled base on the lit side, with the door
  const baseC = look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall;
  const Bs = block(g, x + 0.22, y + 0.95, 1.5, 0.8, 5, 0, baseC);
  if (look === 0) crs(g, Bs, 5, '#9C7A54', 2.5);
  const doorFill = state === 'work' ? '#F6D46A' : '#6A4A38';
  if (state === 'work') insetOpening(g, { F: Bs.L, u: 0.38, s: 0 }, 0.24, 4, { lintel: look === 0 ? WOOD : m.trim, lit: true });
  else { qd(g, Bs.L, 0.35, 0.65, 0, 4.2, look === 0 ? WOOD : m.trim); planks(g, Bs.L, 0.38, 0.62, 0, 3.8); }
  void doorFill;
  if (look >= 1) band(g, Bs, 3.4, m.band, 0.9);
  // two smaller silos behind the big one
  { const SC = look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall; drum(g, [c[0] - 16, c[1] - 11], 5.4, 11, SC); drum(g, [c[0] + 13, c[1] - 11], 5.4, 12, SC);
    for (const dx of [-16, 13]) { const t = [c[0] + dx, c[1] - 22]; if (look <= 1) g.path([['M', [t[0] - 6.2, t[1] + 0.6]], ['L', [t[0], t[1] - 6]], ['L', [t[0] + 6.2, t[1] + 0.6]], ['Q', [t[0], t[1] + 6.4], [t[0] - 6.2, t[1] + 0.6]], ['Z']], THATCH, { outline: true }); else g.dome([t[0], t[1] + 1], 5.8, 5, 2, { outline: true }); } }
  // the silo
  const C = look === 0 ? [MUD[0], MUD[1], MUD[2]] : m.wall;
  const r = look === 3 ? 9.5 : 9;
  drum(g, [c[0] - 2, c[1] - 7], r, look === 3 ? 17 : 15, C);
  if (look >= 1) { const bandC = look === 1 ? TEAL : look === 2 ? m.band : m.band; g.path([['M', [c[0] - 2 - r, c[1] - 7 - 6]], ['Q', [c[0] - 2, c[1] - 7 - 6 + r], [c[0] - 2 + r, c[1] - 7 - 6]]], 'none', { stroke: bandC, strokeWidth: 1.6, strokeAlpha: 0.95 }); }
  const topC = [c[0] - 2, c[1] - 7 - (look === 3 ? 17 : 15)];
  if (look === 0) { g.path([['M', [topC[0] - r - 1, topC[1] + 1]], ['L', [topC[0], topC[1] - 9]], ['L', [topC[0] + r + 1, topC[1] + 1]], ['Q', [topC[0], topC[1] + r + 1], [topC[0] - r - 1, topC[1] + 1]], ['Z']], THATCH, { outline: true }); }
  else if (look === 1) { g.path([['M', [topC[0] - r - 1, topC[1] + 1]], ['L', [topC[0], topC[1] - 8]], ['L', [topC[0] + r + 1, topC[1] + 1]], ['Q', [topC[0], topC[1] + r + 1], [topC[0] - r - 1, topC[1] + 1]], ['Z']], THATCH, { outline: true }); g.line(topC, [topC[0], topC[1] - 8], '#AC8840', 0.5); }
  else if (look === 2) { g.dome([topC[0], topC[1] + 1], r + 0.5, 8, 3, { outline: true }); }
  else { g.dome([topC[0], topC[1] + 1], r + 0.5, 7, 3, { outline: true }); gildedCap(g, [topC[0], topC[1] - 5], 3.2); }
  if (look >= 2) {   // a stair up the lit side
    for (let i = 0; i < 4; i++) box(g, x + 0.04 + i * 0.1, y + 1.1, 0.1, 0.5, 1.2 * (i + 1), 0, ['#F4EDDF', '#E7DDCC', '#C3B8C6'], 0);
  }
  // the yard
  if (state === 'work') {
    [[0.35, 1.95], [0.6, 2.0], [0.48, 1.88]].forEach(([u, v], i) => sack(g, p(x + u, y + v), i === 1 ? '#E9D6A4' : '#D9C495'));
    g.ell(p(x + 1.5, y + 1.95), 4.6, 2.1, '#E6C45A', { outline: true });
    g.ell(U(p(x + 1.5, y + 1.95), 1.6), 3.2, 1.5, '#F3D775');
    g.ell(U(p(x + 1.4, y + 1.9), 2.2), 1.4, 0.6, '#FFF0B0', { alpha: 0.8 });
  }
}

// A potter's workshop with its kiln. work: the kiln glows and smokes, the awning is out over the wheel, finished pots stand in the yard. shut: no smoke, the
// mouth bricked up, the shutters barred, the yard bare.
export function kilnRef(g, x, y, look, state = 'work') {
  const m = M[look];
  groundShadow(g, x + 0.12, y + 0.12, 0.92, 0.66, 12); groundShadow(g, x + 1.22, y + 0.22, 0.6, 0.6, 11);
  const W = block(g, x + 0.12, y + 0.12, 0.92, 0.66, 9, 0, look === 0 ? MUD : m.wall);
  if (look === 0) crs(g, W, 9, '#9C7A54', 2.5);
  const trim = look === 0 ? WOOD : m.trim;
  if (state === 'work') insetOpening(g, { F: W.L, u: 0.6, s: 0 }, 0.2, 5.4, { lintel: trim, lit: true });
  else { qd(g, W.L, 0.57, 0.83, 0, 5.8, trim); planks(g, W.L, 0.6, 0.8, 0, 5.2); }
  if (state === 'work') insetOpening(g, { F: W.R, u: 0.3, s: 3.8 }, 0.2, 2.6, { lintel: trim, fill: WINDOW, lit: true });
  else planks(g, W.R, 0.3, 0.5, 3.8, 6.4);
  insetOpening(g, { F: W.L, u: 0.16, s: 3.8 }, 0.16, 2.6, { lintel: trim, fill: state === 'work' ? WINDOW : '#6A4A38' });
  if (look >= 1) band(g, W, 7.2, look === 1 ? TEAL : m.band, 1.0);
  roofTop(g, x + 0.12, y + 0.12, 0.92, 0.66, 9, look, 3);
  // the kiln drum
  const kc = p(x + 1.52, y + 0.58);
  const KC = look === 3 ? [GOLDC[0], '#E9D2A0', '#B8A090'] : [MUD[0], MUD[1], MUD[2]];
  drum(g, kc, 7.5, 11, look >= 2 ? [m.wall[0], m.wall[1], m.wall[2]] : [MUD[0], MUD[1], MUD[2]]);
  void KC;
  g.ell([kc[0], kc[1] - 11], 2.6, 1.3, '#4A3030');
  if (state === 'work') {
    g.ell([kc[0] - 1.5, kc[1] - 2.8], 2.8, 2.2, '#3A2420'); g.ell([kc[0] - 1.5, kc[1] - 2.6], 2, 1.6, ORANGE); g.ell([kc[0] - 1.5, kc[1] - 2.4], 1.1, 0.9, GOLD);
    puff(g, [kc[0] + 1, kc[1] - 15], 3, 0.55); puff(g, [kc[0] + 3.4, kc[1] - 20], 3.8, 0.42); puff(g, [kc[0] + 6.4, kc[1] - 25.5], 4.4, 0.3);
    awning(g, { F: W.L, u: 0.0, s: 5.6 }, 0.34, RED);
  } else {
    g.ell([kc[0] - 1.5, kc[1] - 2.8], 2.8, 2.2, '#6A4A38'); g.line([kc[0] - 3.6, kc[1] - 2.8], [kc[0] + 0.6, kc[1] - 2.8], INK, 0.5, 0.6); g.line([kc[0] - 1.5, kc[1] - 4.8], [kc[0] - 1.5, kc[1] - 0.8], INK, 0.5, 0.6);
  }
  if (state === 'work') {
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) jar(g, p(x + 1.05 + i * 0.2, y + 1.3 + r * 0.22), (i + r) % 3 ? POT : '#E9C08A', 0.9);
    for (const [u, v] of [[0.3, 1.5], [0.52, 1.6]]) jar(g, p(x + u, y + v), POT, 0.9);
  } else {
    jar(g, p(x + 1.9, y + 1.1), '#B08A6A', 0.8);   // one cracked pot left by the wall
  }
}

// The bazaar, 2x2. Village: four reed-shaded stalls. Town: striped awnings and whitewashed counters. City: a covered market under one roof. Capital: a colonnaded hall.
// work: open, with goods heaped and a figure at the counter. shut: the awnings drawn in, the counters barred with planks, the yard empty.
export function bazaarRef(g, x, y, look, state = 'work') {
  const m = M[look], work = state === 'work';
  const GOODS = ['#C9552F', GOLD, '#6E9E3A'];
  const cs = [[RED, '#933E2B'], [GOLD, '#B08436'], [BLUE, '#245A88'], [TEAL, TEAL_DARK]];
  groundShadow(g, x + 0.1, y + 0.1, 1.8, 1.8, 9);
  const counter = (cx, cy, k) => {
    const C = look === 0 ? ['#D9B47A', '#C49E66', '#A08478'] : m.wall;
    const F = block(g, cx + 0.24, cy + 0.3, 0.52, 0.4, 3.2, 0, C);
    if (work) { GOODS.forEach((c, i) => g.ell(U(p(cx + 0.28 + 0.44 * (i / 2.4), cy + 0.55), 3.5), 1.35, 0.9, GOODS[(i + k) % 3], { outline: true })); }
    else planks(g, F.L, 0.1, 0.9, 0.3, 2.9);
    return F;
  };
  if (look <= 1) {
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => {
      const cx = x + i, cy = y + j;
      counter(cx, cy, k);
      const colr = look === 0 ? cs[k] : [cs[k][0], cs[k][1]];
      if (work) { awningStall(g, cx, cy, colr, look === 1); }
      else awningStall(g, cx, cy, ['#D9B060', '#B08436'], look === 1, true);
      if (work) { g.ell(p(cx + 0.5, cy + 0.9), 2.3, 1.1, '#B08436', { outline: true }); g.ell(U(p(cx + 0.5, cy + 0.9), 1.2), 1.7, 0.8, GOODS[k % 3]); }
    });
  } else if (look === 2) {
    // a covered market: a hall along the back with open doorways, and two striped stalls in front of it
    const hall = block(g, x + 0.1, y + 0.1, 1.8, 0.8, 9, 0, m.wall);
    band(g, hall, 6.2, m.band, 1.2); band(g, hall, 7.8, BAND2[2], 0.7);
    for (const u of [0.1, 0.42, 0.74]) {
      if (work) insetOpening(g, { F: hall.L, u, s: 0 }, 0.16, 5, { lintel: BLUE, lit: true });
      else { qd(g, hall.L, u - 0.02, u + 0.18, 0, 5.4, BLUE); planks(g, hall.L, u, u + 0.16, 0, 5); }
    }
    roofTop(g, x + 0.1, y + 0.1, 1.8, 0.8, 9, 2, 5);
    [0, 1].forEach((k) => {
      counter(x + k * 0.9 - 0.1, y + 1.02, k);
      awningStall(g, x + k * 0.9 - 0.1, y + 1.02, k ? [GOLD, '#B08436'] : [BLUE, '#245A88'], true, !work);
      if (work) { g.ell(p(x + k * 0.9 + 0.4, y + 1.95), 2.3, 1.1, '#B08436', { outline: true }); g.ell(U(p(x + k * 0.9 + 0.4, y + 1.95), 1.2), 1.7, 0.8, GOODS[k]); }
    });
  } else {
    // a colonnaded hall: a stepped podium, a pale hall with a painted frieze and a gilded cap, columns across its front with the stalls between
    block(g, x + 0.08, y + 0.1, 1.84, 1.0, 1.4, 0, [m.roof[0], m.roof[1], m.roof[2]]);
    const hall = block(g, x + 0.2, y + 0.2, 1.6, 0.7, 10, 1.4, m.wall);
    band(g, hall, 7, m.band, 1.0); band(g, hall, 8.4, GOLD, 0.6);
    for (const u of [0.14, 0.46, 0.78]) {
      if (work) insetOpening(g, { F: hall.L, u, s: 1.4 }, 0.14, 5.6, { lintel: TEAL, lit: true });
      else { qd(g, hall.L, u - 0.02, u + 0.16, 1.4, 7.2, TEAL); planks(g, hall.L, u, u + 0.14, 1.4, 6.8); }
    }
    cornice(g, { x: x + 0.2, y: y + 0.2, w: 1.6, d: 0.7, z: 11.4 }, M[3].cornice);
    roofTop(g, x + 0.2, y + 0.2, 1.6, 0.7, 11.4, 3, 5);
    gildedCap(g, U(p(x + 1.0, y + 0.55), 12.6), 4.2);
    for (const gx of [0.3, 0.77, 1.23, 1.7]) col(g, x + gx, y + 1.0, 8.4, 1.4);
    [0, 1].forEach((k) => {
      counter(x + k * 0.9, y + 1.12, k);
      if (work) { g.ell(p(x + k * 0.9 + 0.55, y + 1.97), 2.3, 1.1, '#B08436', { outline: true }); g.ell(U(p(x + k * 0.9 + 0.55, y + 1.97), 1.2), 1.7, 0.8, GOODS[k + 1]); }
    });
  }
  if (work) { figNew(g, x + 1.9, y + (look <= 1 ? 1.4 : 1.95), 'citizen', 0.85); }
}
function awningStall(g, cx, cy, c, striped, furled = false) {
  const z = 7.5;
  for (const [a, b] of [[cx + 0.14, cy + 0.86], [cx + 0.86, cy + 0.86], [cx + 0.86, cy + 0.14]]) { const q = U(p(a, b), z - 4.2); g.line(q, U(q, 4.2), WOOD, 0.7); }
  if (furled) { const A = tb(g, cx + 0.12, cy + 0.12, 0.76, 0.76, 0.7, z, 0.12, [c[0], c[0], c[1]], 0); void A; return; }
  const A = tb(g, cx + 0.1, cy + 0.1, 0.8, 0.8, 1.2, z, 0.05, [c[0], c[0], c[1]]);
  const st = '#F6ECD6';
  for (let u = 0.1; u < 0.95; u += 0.25) { qd(g, A.L, u, u + 0.12, 0, 1.2, st, { alpha: 0.85 }); qd(g, A.R, u, u + 0.12, 0, 1.2, st, { alpha: 0.6 }); }
  if (striped) g.poly(quad(cx + 0.15, cy + 0.15, 0.7, 0.7, z + 1.2), st, { alpha: 0.3 });
}

// ---- nature and figures ---------------------------------------------------------------------------------------------------------------------
// A palm at the new bar: a trunk shaded from lit to dark, fronds in two tones with a midrib, dates, a soft contact shadow.
export function palmNew(g, gx, gy, sc = 1) {
  const c = p(gx, gy), s = g.scale;
  g.radial([c[0] + 4 * sc, c[1] + 0.5], 8 * sc, 2.6 * sc, SHADOW, 0.16);
  const t = [c[0] + 3 * sc, c[1] - 21 * sc], c1 = [c[0] - 2.4 * sc, c[1] - 10 * sc];
  const gr = g.ctx.createLinearGradient((c[0] - 2 * sc) * s, 0, (c[0] + 4 * sc) * s, 0);
  gr.addColorStop(0, '#B08A58'); gr.addColorStop(0.5, TRUNK); gr.addColorStop(1, '#5E4630');
  g.path([['M', [c[0] - 1.6 * sc, c[1]]], ['Q', [c1[0] - 0.9 * sc, c1[1]], [t[0] - 1.0 * sc, t[1]]], ['L', [t[0] + 1.0 * sc, t[1]]], ['Q', [c1[0] + 1.0 * sc, c1[1]], [c[0] + 1.7 * sc, c[1]]], ['Z']], gr, { stroke: OUTLINE, strokeWidth: 0.8, strokeAlpha: 0.5 });
  for (let k = 0.1; k < 0.95; k += 0.1) {
    const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, d = k * k;
    const bx = a * c[0] + b * c1[0] + d * t[0], by = a * c[1] + b * c1[1] + d * t[1];
    g.line([bx - 1.2 * sc, by], [bx + 1.3 * sc, by + 0.4 * sc], TRUNK_RING, 0.5 * sc, 0.8);
  }
  const fronds = [[-170, 1], [-135, 1.05], [-100, 0.8], [-62, 0.95], [-22, 1.05], [20, 1], [160, 1], [122, 0.9], [70, 0.7]];
  fronds.forEach(([ang, L], i) => {
    const ca = Math.cos((ang * Math.PI) / 180), sa = Math.sin((ang * Math.PI) / 180), len = 12 * sc * L;
    const e = [t[0] + ca * len, t[1] + sa * len * 0.5 + 4.2 * sc * Math.abs(ca)];
    const m = [t[0] + ca * len * 0.55, t[1] + sa * len * 0.3 - 2.6 * sc];
    const nx = -sa * 1.3 * sc, ny = ca * 2.2 * sc;
    g.path([['M', t], ['Q', [m[0] + nx, m[1] + ny], e], ['Q', [m[0] - nx, m[1] - ny], t], ['Z']], i % 2 ? LEAF : LEAF3, { stroke: '#2C5A1E', strokeWidth: 0.6 * sc, strokeAlpha: 0.5 });
    g.path([['M', t], ['Q', [m[0] + nx, m[1] + ny], e], ['Q', [m[0] + nx * 0.2, m[1] + ny * 0.2 - 0.6 * sc], t], ['Z']], LEAF2, { alpha: 0.8 });   // the lit upper half
    g.stroke([['M', t], ['Q', m, e]], '#2C5A1E', 0.45 * sc, 0.6);
  });
  g.circ([t[0] - 1.0 * sc, t[1] + 1.6 * sc], 1.2 * sc, '#8A5A2A', { outline: true });
  g.circ([t[0] + 1.2 * sc, t[1] + 1.9 * sc], 1.2 * sc, '#6B4A2A', { outline: true });
}

// A street lamp: a post with a small lit lantern.
export function lamp(g, gx, gy, sc = 1) {
  const c = p(gx, gy);
  g.ell([c[0] + 1, c[1] + 0.3], 2.2 * sc, 0.8 * sc, SHADOW, { alpha: 0.2 });
  g.line(c, [c[0], c[1] - 11 * sc], '#5A4A5A', 1 * sc);
  g.line([c[0] - 1.3 * sc, c[1] - 0.3], [c[0] + 1.3 * sc, c[1] - 0.3], '#5A4A5A', 1.6 * sc);
  g.poly([[c[0] - 1.8 * sc, c[1] - 11 * sc], [c[0] + 1.8 * sc, c[1] - 11 * sc], [c[0] + 1.4 * sc, c[1] - 14.4 * sc], [c[0] - 1.4 * sc, c[1] - 14.4 * sc]], '#F6D46A', { outline: true });
  g.poly([[c[0] - 2.2 * sc, c[1] - 14.4 * sc], [c[0] + 2.2 * sc, c[1] - 14.4 * sc], [c[0], c[1] - 16.4 * sc]], '#5A4A5A');
  g.circ([c[0], c[1] - 12.7 * sc], 3.4 * sc, '#FFE9A0', { alpha: 0.22 });
}

// A street tree, rounded and short, for the City's kerbs.
export function streetTree(g, gx, gy, sc = 1) {
  const c = p(gx, gy);
  g.radial([c[0] + 3, c[1] + 0.4], 6 * sc, 2 * sc, SHADOW, 0.16);
  g.line(c, [c[0], c[1] - 8 * sc], TRUNK, 1.3 * sc);
  g.circ([c[0] - 2.4 * sc, c[1] - 10 * sc], 4 * sc, LEAF3, { outline: true });
  g.circ([c[0] + 2.4 * sc, c[1] - 10.4 * sc], 4.2 * sc, LEAF, { outline: true });
  g.circ([c[0], c[1] - 13 * sc], 4.6 * sc, LEAF2, { outline: true });
  g.circ([c[0] - 1.4 * sc, c[1] - 14.4 * sc], 1.8 * sc, '#9CC45A', { alpha: 0.8 });
}

// A figure at the new bar: a shaded robe (lit left, shaded right), a headcloth, a belt, a soft ground shadow and the 1.0 px silhouette round the whole.
export function figNew(g, gx, gy, kind = 'citizen', sc = 1) {
  const c = p(gx, gy), X = c[0], Y = c[1], s = sc, sk = '#A0663F', skS = '#855031', hair = '#1E150E';
  g.radial([X + 0.6 * s, Y + 0.3 * s], 3.8 * s, 1.3 * s, SHADOW, 0.28);
  const robe = { citizen: ['#F7F2E8', '#D8CCD6'], woman: ['#F2E7F0', '#C9B4CC'], water: ['#EFE4D2', '#C8B8B0'] }[kind] || ['#F7F2E8', '#D8CCD6'];
  const long = kind !== 'citizen';
  const hem = long ? 0 : 3.4 * s;
  if (!long) { g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - hem], sk, 1.2 * s); g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - hem], skS, 1.2 * s); }
  const bt = Y - hem - 0.4 * s, tp = Y - 9 * s;
  g.poly([[X - 2.1 * s, bt], [X, bt + 0.3 * s], [X, tp], [X - 1.7 * s, tp]], robe[0], { stroke: OUTLINE, strokeWidth: 0.7, strokeAlpha: 0.55 });
  g.poly([[X, bt + 0.3 * s], [X + 2.1 * s, bt], [X + 1.7 * s, tp], [X, tp]], robe[1], { stroke: OUTLINE, strokeWidth: 0.7, strokeAlpha: 0.55 });
  g.line([X - 1.9 * s, Y - 5.6 * s], [X + 1.9 * s, Y - 5.6 * s], kind === 'woman' ? TEAL : kind === 'water' ? BLUE : GOLD, 0.8 * s);
  g.line([X - 1.8 * s, tp + 0.4 * s], [X - 2.6 * s, Y - 4.6 * s], sk, 0.9 * s);
  g.line([X + 1.8 * s, tp + 0.4 * s], [X + 2.5 * s, Y - 4.4 * s], skS, 0.9 * s);
  g.ell([X, Y - 10.6 * s], 1.7 * s, 1.9 * s, sk, { stroke: OUTLINE, strokeWidth: 0.6, strokeAlpha: 0.5 });
  g.path([['M', [X - 1.9 * s, Y - 10.8 * s]], ['Q', [X - 1.7 * s, Y - 13.4 * s], [X, Y - 13 * s]], ['Q', [X + 1.9 * s, Y - 13 * s], [X + 1.9 * s, Y - 10.4 * s]], ['Q', [X + 0.6 * s, Y - 11.6 * s], [X - 1.9 * s, Y - 10.8 * s]]], kind === 'woman' ? hair : '#3A2E5A');
  if (kind === 'woman') g.ell([X - 1.2 * s, Y - 9.6 * s], 1.1 * s, 2.2 * s, hair);
  if (kind === 'water') {
    g.ell([X + 2.2 * s, Y - 13.4 * s], 2 * s, 2.3 * s, POT, { outline: true });
    g.ell([X + 1.6 * s, Y - 14 * s], 0.6 * s, 0.9 * s, POT_LIGHT, { alpha: 0.8 });
    g.line([X + 1.8 * s, tp + 0.4 * s], [X + 2.2 * s, Y - 12 * s], skS, 0.8 * s);
  }
}

// ---- a patch of ground ---------------------------------------------------------------------------------------------------------------------
const noise = (i, k) => Math.sin(i * 1.9 + k * 2.7) * 0.5 + Math.sin(i * 0.77 + k * 5.1) * 0.5;

// Today's patch: stepped diamonds. A staircase of grass along the back edge, a road of whole tiles, a house standing straight on the sand.
export function groundToday(g, N, drawHouse) {
  const diamond = (i, j, c, o) => g.poly([p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)], c, o);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) diamond(i, j, TERRAIN.sand);
  for (let i = 0; i < N; i++) { const rows = 1 + (((i * 7) % 3) === 0 ? 1 : 0) + (i > 2 ? 0 : 1); for (let j = 0; j < rows; j++) diamond(i, j, TERRAIN.grass); }
  for (let i = 0; i < N; i++) diamond(i, 4, TERRAIN.road, { stroke: TERRAIN.roadEdge, strokeWidth: 0.6 });
  drawHouse(g, 2, 2);
}

// The new patch at the look's bar: a soft uneven grass edge with tufts and a transition band, a road with a frayed (Village, Town) or kerbed and paved
// (City, Capital) edge, and two homes in their trodden yards with a path to the road. N tiles on a side.
export function groundNew(g, N, look, drawHouse) {
  const m = M[look];
  g.poly([p(0, 0), p(N, 0), p(N, N), p(0, N)], TERRAIN.sand);
  // a soft shade of sand blotches, so the ground is not flat
  for (let i = 0; i < 14; i++) g.ell(p(N * hs(i, 3, 1), N * hs(i, 3, 2)), 7 + 5 * hs(i, 5, 3), 3 + 2 * hs(i, 7, 4), TERRAIN.blotches[i % 5], { alpha: 0.5 });
  // the grass edge: a smooth curve below tile size along the back edge
  const edgeAt = (i) => 0.95 + 0.4 * noise(i * 2.3, 1) + 0.12 * noise(i * 7.1, 3);
  const steps = N * 8;
  const edge = (off) => { const pts = []; for (let k = 0; k <= steps; k++) { const i = (k / steps) * N; pts.push(p(i, Math.max(0.2, edgeAt(i) + off))); } return pts; };
  g.poly([p(0, 0), p(N, 0), ...edge(0.34).reverse()], TERRAIN.grassSoft, { alpha: 0.55 });
  g.poly([p(0, 0), p(N, 0), ...edge(0.16).reverse()], TERRAIN.grassSoft, { alpha: 0.7 });
  g.poly([p(0, 0), p(N, 0), ...edge(0).reverse()], TERRAIN.grass);
  for (let k = 0; k < steps; k += 1) {
    const i = (k / steps) * N, q = p(i, edgeAt(i) - 0.04);
    if (hs(k, 11, 1) < 0.55) g.line(q, [q[0] + (hs(k, 3, 2) - 0.5) * 2, q[1] + 1.8 + hs(k, 4, 3) * 1.4], TERRAIN.grassSecond, 0.6, 0.8);
  }
  for (let i = 0; i < 10; i++) { const u = N * (0.05 + 0.9 * hs(i, 21, 1)), q = p(u, edgeAt(u) * 0.55); g.line(q, [q[0] + 0.5, q[1] - 2.6], '#4F8A2E', 0.7, 0.9); g.line(q, [q[0] - 1, q[1] - 2], '#6AA83A', 0.7, 0.9); }
  // the road: along x, a tile wide, drifting a little
  const rj = (i) => 4.1 + 0.12 * noise(i * 1.7, 5);
  const side = (off) => { const a = []; for (let k = 0; k <= steps; k++) { const i = (k / steps) * N; a.push(p(i, rj(i) + off)); } return a; };
  const frayed = look <= 1;
  if (frayed) {
    g.poly([...side(-0.62), ...side(0.62).reverse()], m.ground[1], { alpha: 0.4 });   // dust fraying into the sand
    for (let k = 0; k < steps; k += 2) { const i = (k / steps) * N, off = hs(k, 8, 1) > 0.5 ? 0.62 : -0.62; g.circ(p(i, rj(i) + off * (0.9 + 0.3 * hs(k, 2, 2))), 0.9 + hs(k, 9, 3) * 0.8, TERRAIN.roadEdge, { alpha: 0.3 }); }
    g.poly([...side(-0.5), ...side(0.5).reverse()], look === 0 ? TERRAIN.road : TERRAIN.roadPebbleLight);
    for (let k = 0; k < steps * 0.7; k++) { const i = N * hs(k, 31, 1), q = p(i, rj(i) + (hs(k, 32, 2) - 0.5) * 0.8); g.circ(q, 0.45, look === 0 ? TERRAIN.roadPebble : TERRAIN.pebble, { alpha: 0.6 }); }
    if (look === 0) for (let w = -0.18; w <= 0.18; w += 0.36) g.stroke(side(w).map((q, i) => [i === 0 ? 'M' : 'L', q]), TERRAIN.roadEdge, 0.5, 0.4);   // wheel ruts
    if (look === 1) { g.stroke(side(-0.5).map((q, i) => [i === 0 ? 'M' : 'L', q]), TERRAIN.pebble, 1, 0.85); g.stroke(side(0.5).map((q, i) => [i === 0 ? 'M' : 'L', q]), TERRAIN.pebble, 1, 0.85); }
  } else {
    g.poly([...side(-0.64), ...side(0.64).reverse()], STONE[2], { alpha: 0.5 });   // the kerb stones
    g.poly([...side(-0.56), ...side(0.56).reverse()], STONE[1]);
    g.poly([...side(-0.46), ...side(0.46).reverse()], m.paving);
    for (let k = 0; k < N * 2; k++) { const i = k / 2; g.line(p(i, rj(i) - 0.46), p(i, rj(i) + 0.46), STONE[2], 0.4, 0.35); }
    g.stroke(side(0).map((q, i) => [i === 0 ? 'M' : 'L', q]), look === 3 ? GOLD : STONE[2], look === 3 ? 0.7 : 0.4, 0.5);
    if (look === 2) for (const i of [1.2, 3.6]) streetTree(g, i, rj(i) - 0.82, 0.8);
    if (look === 3) for (const i of [1.2, 2.7, 4.2]) { lamp(g, i, rj(i) - 0.8, 0.8); palmNew(g, i + 0.7, rj(i) + 0.85, 0.5); }
  }
  // two homes in their yards, each with a path to the road
  for (const [hx, hy] of [[1.4, 2.0], [3.6, 2.0]]) {
    yard(g, hx, hy, 1, 1, look);
    const a = p(hx + 0.5, hy + 1.2), b = p(hx + 0.5, rj(hx) - 0.5);
    const w = look <= 1 ? 1.5 : 1.8;
    g.poly([[a[0] - w, a[1]], [a[0] + w, a[1]], [b[0] + w, b[1]], [b[0] - w, b[1]]], m.ground[look <= 1 ? 0 : 1], { alpha: look <= 1 ? 0.95 : 1 });
    if (look <= 1) g.line([a[0] - w, a[1]], [b[0] - w, b[1]], m.ground[1], 0.6, 0.7);
  }
  for (const [hx, hy] of [[1.4, 2.0], [3.6, 2.0]]) drawHouse(g, hx, hy);
  palmNew(g, 5.1, 3.1, 0.6);
}
