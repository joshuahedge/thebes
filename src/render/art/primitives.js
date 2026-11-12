// Canvas ports of the approved mock-up's drawing primitives. Positions and sizes are in tile units, heights
// in art px. Every function takes the drawing helper `g` (see ctx.js) first; otherwise the parameter lists
// are the mock-up's, so the two can be compared line by line.
import { p, U, quad, hs, tileDiamond } from '../iso.js';
import {
  SHADOW, INK, WINDOW, DOOR, PARAPET, POT, POT_LIGHT, WOOD, STONE, TEAL, TEAL_DARK, GREEN, GREEN_DARK,
  RED, GOLD, PURP, PINK, GOLDC, OUTLINE, TERRAIN,
} from './palette.js';

export { p, U, quad, hs };

export const tile = (g, x, y, c, o) => g.poly(tileDiamond(x, y), c, o);

// Two soft ground-shadow layers for a block of footprint w x d and height h at tile (x, y), offset to the
// right by h x 0.45 at 12% and h x 0.85 at 8%.
export function groundShadow(g, x, y, w, d, h) {
  const A = p(x, y), B = p(x + w, y), C = p(x + w, y + d), D = p(x, y + d);
  for (const [m, a] of [[0.45, 0.12], [0.85, 0.08]]) {
    const dx = h * m;
    g.poly([A, [A[0] + dx, A[1]], [B[0] + dx, B[1]], [C[0] + dx, C[1]], C, D], SHADOW, { alpha: a });
  }
}

// A tapered block: footprint w x d at (x, y), height h, raised by z, inset i at the top (0 = straight
// sides). C = [top, lit, shaded]. fx === 0 draws plain faces: no outline, gradient or edge lines.
// Returns the face mappers: L(u, s) / R(u, s) give the art point at fraction u along the lit (+y) or
// shaded (+x) face and height s up it. Details (doors, windows, bands) are placed through them.
export function tb(g, x, y, w, d, h, z, i, C, fx) {
  const L = (u, s) => { const k = (i * s) / h; return U(p(x + k + (w - 2 * k) * u, y + d - k), z + s); };
  const R = (u, s) => { const k = (i * s) / h; return U(p(x + w - k, y + k + (d - 2 * k) * u), z + s); };
  const ol = fx !== 0;
  const lf = [L(0, 0), L(1, 0), L(1, h), L(0, h)];
  const rf = [R(0, 0), R(1, 0), R(1, h), R(0, h)];
  g.poly(lf, C[1], { outline: ol });
  if (ol) g.faceGrad(lf);
  g.poly(rf, C[2], { outline: ol });
  if (ol) g.faceGrad(rf);
  if (w - 2 * i > 0.001 && d - 2 * i > 0.001) {
    g.poly([U(p(x + i, y + i), z + h), U(p(x + w - i, y + i), z + h), U(p(x + w - i, y + d - i), z + h), U(p(x + i, y + d - i), z + h)], C[0], { outline: ol });
  }
  if (ol) {
    if (z === 0) {
      g.line(L(0, 0), L(1, 0), INK, 1.1, 0.25);
      g.line(R(0, 0), R(1, 0), INK, 1.1, 0.25);
    }
    g.line(L(0, h), L(1, h), '#FFFFFF', 0.7, 0.6);
    g.line(R(0, h), R(1, h), '#FFFFFF', 0.6, 0.3);
  }
  return { L, R };
}

export const box = (g, x, y, w, d, h, z, C, fx) => tb(g, x, y, w, d, h, z, 0, C, fx);

export const qd = (g, F, u0, u1, s0, s1, c, o) => g.poly([F(u0, s0), F(u1, s0), F(u1, s1), F(u0, s1)], c, o);

// Horizontal mud-brick courses on both faces.
export function crs(g, F, h, c, st = 3) {
  for (let s = st; s < h - 0.5; s += st) {
    g.line(F.L(0, s), F.L(1, s), c, 0.45, 0.3);
    g.line(F.R(0, s), F.R(1, s), c, 0.45, 0.3);
  }
}

export function door(g, F, u0, u1, h) {
  qd(g, F.L, u0 - 0.05, u1 + 0.05, h, h + 1, '#FFFFFF', { alpha: 0.6 });
  qd(g, F.L, u0, u1, 0, h, DOOR);
}

export function win(g, S, u0, u1, s0, s1) {
  qd(g, S, u0, u1, s0, s1, WINDOW);
  g.line(S(u0 - 0.02, s0), S(u1 + 0.02, s0), '#FFFFFF', 0.6, 0.7);
}

export const parapet = (g, a, b, w, d, h) => g.poly(quad(a + 0.06, b + 0.06, w - 0.12, d - 0.12, h), PARAPET);

export function mat(g, x, y, w, d, z, c1, c2) {
  g.poly(quad(x, y, w, d, z), c1);
  if (c2) g.poly(quad(x + w * 0.3, y + d * 0.3, w * 0.4, d * 0.4, z), c2);
}

export function rug(g, x, y, w, d, z, c1, c2, c3) {
  g.poly(quad(x, y, w, d, z), c1, { stroke: c2, strokeWidth: 0.8 });
  for (const [v, c] of [[0.3, c2], [0.5, c3], [0.7, c2]]) {
    g.line(U(p(x + 0.04, y + d * v), z), U(p(x + w - 0.04, y + d * v), z), c, 0.8);
  }
}

export function pots(g, q, n) {
  for (let i = 0; i < n; i++) {
    const c = [q[0] + i * 2.8 - (n - 1) * 1.4, q[1] + (i % 2) * 0.8];
    g.ell(U(c, 1.5), 1.6, 1.6, POT, { outline: true });
    g.ell(U([c[0] - 0.5, c[1]], 2.1), 0.45, 0.55, POT_LIGHT, { alpha: 0.75 });
  }
}

export function fence(g, x, y, w, d) {
  const F = box(g, x, y, w, d, 3, 0, ['#DDB872', '#CCA463', '#A48474'], 0);
  for (let u = 0.06; u < 1; u += 0.1) {
    g.line(F.L(u, 0), F.L(u, 3), '#9C7A3A', 0.35);
    g.line(F.R(u, 0), F.R(u, 3), '#8A6A4A', 0.35);
  }
}

export function stairs(g, x, y, len, dep, hT, n, C) {
  for (let i = 0; i < n; i++) box(g, x + (i * len) / n, y, len / n, dep, (hT * (i + 1)) / n, 0, C, 0);
}

export function ladder(g, a, b) {
  g.line([a[0] - 1.1, a[1]], [b[0] - 1.1, b[1]], WOOD, 0.6);
  g.line([a[0] + 1.1, a[1]], [b[0] + 1.1, b[1]], WOOD, 0.6);
  const n = Math.max(2, Math.floor(Math.abs(a[1] - b[1]) / 2));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    g.line([a[0] - 1.1 + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + 1.1 + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], WOOD, 0.45);
  }
}

export function post(g, gx, gy, z, h) {
  const q = U(p(gx, gy), z);
  g.line(q, U(q, h), WOOD, 0.7);
}

// A striped reed awning on three posts; st is the stripe colour.
export function awn(g, x, y, w, d, z, c1, c2, st) {
  for (const [a, b] of [[x + 0.04, y + d - 0.04], [x + w - 0.04, y + d - 0.04], [x + w - 0.04, y + 0.04]]) post(g, a, b, z - 4.2, 4.2);
  const A = tb(g, x, y, w, d, 1.2, z, 0.05, [c1, c2, c2], 0);
  const stripe = st || '#F6ECD6';
  for (let u = 0.1; u < 0.95; u += 0.25) {
    qd(g, A.L, u, u + 0.12, 0, 1.2, stripe, { alpha: 0.85 });
    qd(g, A.R, u, u + 0.12, 0, 1.2, stripe, { alpha: 0.6 });
  }
  g.poly(quad(x + 0.05, y + 0.05, w - 0.1, d - 0.1, z + 1.2), stripe, { alpha: 0.25 });
}

// A painted column with teal bands and a leafy capital.
export function col(g, gx, gy, h, z, cap) {
  const F = box(g, gx - 0.05, gy - 0.05, 0.1, 0.1, h, z, STONE, 0);
  for (const [a, b] of [[h * 0.25, h * 0.32], [h - 2.4, h - 1.7]]) {
    qd(g, F.L, 0, 1, a, b, TEAL);
    qd(g, F.R, 0, 1, a, b, TEAL_DARK);
  }
  tb(g, gx - 0.06, gy - 0.06, 0.12, 0.12, 1.6, z + h, -0.035, cap || ['#8FC07A', GREEN, GREEN_DARK], 0);
}

export function bed(g, x, y, w, d) {
  g.poly(quad(x, y, w, d, 0), '#6FA243', { stroke: '#C9B48A', strokeWidth: 1.1 });
  const flowers = [RED, GOLD, '#FFFFFF', PURP, PINK];
  for (let i = 0; i < 7; i++) {
    const q = p(x + w * (0.15 + 0.7 * hs(x, i, 1)), y + d * (0.15 + 0.7 * hs(y, i, 2)));
    g.circ(U(q, 1.4), 1.6, '#4F8A2E');
    g.circ(U(q, 2.5), 0.75, flowers[i % 5]);
  }
}

export function pool(g, x, y, w, d) {
  g.poly(quad(x - 0.05, y - 0.05, w + 0.1, d + 0.1, 0), '#F2E6CC');
  g.poly(quad(x, y, w, d, 0), '#4FB3B5');
  g.poly(quad(x + 0.04, y + 0.04, w - 0.08, d * 0.35, 0), '#7FD0CC', { alpha: 0.6 });
  g.line(p(x + w * 0.25, y + d * 0.6), p(x + w * 0.6, y + d * 0.6), '#D7F0EE', 0.7);
}

export function statue(g, gx, gy) {
  box(g, gx - 0.09, gy - 0.09, 0.18, 0.18, 3.2, 0, STONE, 0);
  box(g, gx - 0.035, gy - 0.035, 0.07, 0.07, 5.5, 3.2, GOLDC, 0);
  g.circ(U(p(gx, gy), 9.8), 1.15, GOLD);
}

// ---- Version 9.3 (spec section 6, ruling 1888): the primitives of the new bar --------------------------------------------------------------
// Every drawing reaches the bar through these rather than by hand: a soft shade down a wall, a dark contact line where it meets the ground,
// openings set in with an inner shadow and a lintel, stepped parapets, awnings, cornices, painted bands, porches and gilded caps. A face is a
// mapper F(u, s) as tb() returns (F.L is the lit face, F.R the shaded one); `at` is { F, u, s }, a place on a face. Outlines: the silhouette is
// 1.0 px and inner lines stay at 0.6 px and 32% (palette OUTLINE). Flat and illustrated: shade and light, no textures.
const outward = (F, dist) => (F(1, 0)[0] > F(0, 0)[0] ? [-16 * dist, 8 * dist] : [16 * dist, 8 * dist]);   // the way a face points, for `dist` tiles

// Version 9.3 Track P (ruling 1938): the bar's test hook. The three primitives of the bar count their calls here, so the contract test
// (tests/v93/p/bar.test.js) can draw each slot once and list any that called none. A sprite is drawn once per bucket, so the count costs nothing a frame.
export const PRIMITIVE_CALLS = { shadeWall: 0, contactLine: 0, insetOpening: 0 };

// A soft shade from the top of a wall face toward its base (a warm lift at the very top, cool lavender at the foot). h is the wall's height in
// art px: a tall wall takes more.
export function shadeWall(g, face, h = 10) {
  PRIMITIVE_CALLS.shadeWall++;
  let top = Infinity, bottom = -Infinity;
  for (const q of face) { top = Math.min(top, q[1]); bottom = Math.max(bottom, q[1]); }
  if (bottom - top < 1e-6) return;
  const k = Math.min(1, h / 16), s = g.scale;
  const gr = g.ctx.createLinearGradient(0, top * s, 0, bottom * s);
  gr.addColorStop(0, `rgba(255,246,226,${0.16 * k})`);
  gr.addColorStop(0.4, 'rgba(255,246,226,0)');
  gr.addColorStop(0.75, `rgba(90,74,106,${0.07 * k})`);
  gr.addColorStop(1, `rgba(62,50,96,${0.12 + 0.12 * k})`);
  g.poly(face, gr);
}

// The silhouette of a block: a 1.0 px line round its outer six points, heavier than the 0.6 px inner outlines.
export function silhouette(g, x, y, w, d, h, z = 0, alpha = 0.55) {
  const pts = [U(p(x, y + d), z), U(p(x + w, y + d), z), U(p(x + w, y), z), U(p(x + w, y), z + h), U(p(x, y), z + h), U(p(x, y + d), z + h)];
  g.poly(pts, 'none', { stroke: OUTLINE, strokeWidth: 1.0, strokeAlpha: alpha });
}

// The dark line where walls meet the ground, with a faint shadow band on the ground in front of it. footprint is [x, y, w, d] in tiles.
export function contactLine(g, footprint) {
  PRIMITIVE_CALLS.contactLine++;
  const [x, y, w, d] = footprint;
  const a = p(x, y + d), b = p(x + w, y + d), c = p(x + w, y);
  g.line([a[0], a[1] + 0.9], [b[0], b[1] + 0.9], SHADOW, 2.4, 0.1);
  g.line([b[0], b[1] + 0.9], [c[0], c[1] + 0.9], SHADOW, 2.4, 0.1);
  g.line(a, b, INK, 1.1, 0.5);
  g.line(b, c, INK, 1.1, 0.5);
}

// A door or a window set into a wall: the opening, an inner shadow down its lit-side jamb and under its lintel, a lintel above and a pale sill
// below. at = { F, u, s } is the bottom-left corner on the face; w is a fraction of the face, h art px up it.
// opts: { fill (the opening's colour, DOOR), lintel (its colour), sill (true), lit (a warm lit doorway) }.
export function insetOpening(g, at, w, h, { lintel = '#FFFFFF', fill = DOOR, sill = true, lit = false } = {}) {
  PRIMITIVE_CALLS.insetOpening++;
  const { F, u, s } = at;
  qd(g, F, u - 0.035, u + w + 0.035, s + h, s + h + 1.1, lintel, { alpha: lintel === '#FFFFFF' ? 0.7 : 1 });
  qd(g, F, u, u + w, s, s + h, lit ? '#F6D46A' : fill);
  if (lit) qd(g, F, u + w * 0.35, u + w, s, s + h * 0.8, '#FFF3C4', { alpha: 0.55 });
  qd(g, F, u, u + w * 0.3, s, s + h, INK, { alpha: lit ? 0.3 : 0.4 });
  qd(g, F, u, u + w, s + h - Math.min(1.2, h * 0.3), s + h, INK, { alpha: lit ? 0.3 : 0.4 });
  if (sill) g.line(F(u - 0.04, s), F(u + w + 0.04, s), '#FFFFFF', 0.7, 0.65);
}

// A stepped parapet round a roof edge: n small blocks along the lit and shaded edges, alternately high and low. top = { x, y, w, d, z, C }.
export function parapetSteps(g, top, n = 4, h = 1.3) {
  const { x, y, w, d, z, C = ['#F4EDDF', '#ECE2D2', '#C6BACB'] } = top;
  const step = w / n, stepD = d / n;
  for (let i = 0; i < n; i++) {
    const hh = i % 2 ? h * 0.55 : h;
    box(g, x + step * i + step * 0.07, y + d - 0.09, step * 0.86, 0.09, hh, z, C, 0);
  }
  for (let i = 0; i < n - 1; i++) {
    const hh = i % 2 ? h : h * 0.55;
    box(g, x + w - 0.09, y + stepD * i + stepD * 0.07, 0.09, stepD * 0.86, hh, z, C, 0);
  }
}

// A striped reed awning over a door or window, sloping down and out from the wall. at = { F, u, s } is the top-left of the wall line it hangs from;
// w is a fraction of the face; colour its main colour (the stripe is cream).
export function awning(g, at, w, colour) {
  const { F, u, s } = at;
  const a0 = F(u, s), a1 = F(u + w, s), o = outward(F, 0.17);
  const b0 = [a0[0] + o[0], a0[1] + o[1] + 2.6], b1 = [a1[0] + o[0], a1[1] + o[1] + 2.6];
  g.poly([a0, a1, b1, b0], colour, { outline: true });
  const n = Math.max(2, Math.round(w * 9));
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n, t1 = (i + 1) / n;
    const q = (t, r) => [a0[0] + (a1[0] - a0[0]) * t + (b0[0] - a0[0]) * r, a0[1] + (a1[1] - a0[1]) * t + (b0[1] - a0[1]) * r];
    g.poly([q(t0, 0), q(t1, 0), q(t1, 1), q(t0, 1)], '#F6ECD6', { alpha: 0.9 });
  }
  g.line(b0, b1, SHADOW, 0.9, 0.25);
}

// A projecting top course round a block: a band 1.4 art px high that stands 0.05 tile proud of the walls, its top at z. top = { x, y, w, d, z, C }.
export function cornice(g, top, colour) {
  const { x, y, w, d, z } = top;
  const C = colour || top.C || STONE;
  box(g, x - 0.05, y - 0.05, w + 0.1, d + 0.1, 1.4, z - 1.4, Array.isArray(C) ? C : [C, C, C], undefined);
}

// A painted band across a block's faces at height s (art px), th high; the shaded face takes a dusk of the same colour.
export function band(g, F, s, colour, th = 1) {
  qd(g, F.L, 0, 1, s, s + th, colour);
  qd(g, F.R, 0, 1, s, s + th, colour);
  qd(g, F.R, 0, 1, s, s + th, INK, { alpha: 0.2 });
}

// A small porch: two pillars and a flat slab roof standing out from a lit face. at is the art point on the ground at the porch's left pillar;
// w is its width along the face, h its pillar height (art px).
export function porch(g, at, w, h, C = ['#F4EDDF', '#E7DDCC', '#C3B8C6']) {
  const dir = [0.894, 0.447], out = [-0.894, 0.447], dp = 4;
  const base = [at[0] + out[0] * dp, at[1] + out[1] * dp];
  const pil = (q) => g.poly([[q[0] - 0.8, q[1]], [q[0] + 0.8, q[1]], [q[0] + 0.8, q[1] - h], [q[0] - 0.8, q[1] - h]], C[1], { outline: true });
  const r = [base[0] + dir[0] * w, base[1] + dir[1] * w];
  g.line([base[0], base[1] + 0.6], [r[0], r[1] + 0.6], SHADOW, 2.2, 0.12);
  pil(base); pil(r);
  const A = [at[0], at[1] - h], B = [at[0] + dir[0] * w, at[1] + dir[1] * w - h];
  const A2 = [base[0], base[1] - h], B2 = [r[0], r[1] - h];
  g.poly([A, B, B2, A2], C[0], { outline: true });
  g.poly([A2, B2, [B2[0], B2[1] + 1.3], [A2[0], A2[1] + 1.3]], C[1], { outline: true });
}

// A gilded cap on a landmark: a gold dome with a lit shoulder and a small finial. at is the art point at the dome's base centre; r its half width.
// Version 10.0 (Track Q, ruling 2142): what a hull casts on the water, the water's own foot shadow: a darker ellipse under it (alpha 0.25, the deep water's colour), at (x, y) the keel's middle,
// rx the half length of the hull. The raider boat and the fishing boat stand in it.
export function waterShadow(g, x, y, rx = 8, ry = rx * 0.28) {
  g.ell([x + rx * 0.12, y + 0.8], rx, ry, TERRAIN.waterDeep, { alpha: 0.25 });
}

export function gildedCap(g, at, r) {
  const [x, y] = at;
  g.ell([x, y], r, r * 0.35, GOLDC[2]);
  g.path([['M', [x - r, y]], ['Q', [x - r, y - r * 1.7], [x, y - r * 1.7]], ['Q', [x + r, y - r * 1.7], [x + r, y]], ['Z']], GOLDC[1], { outline: true });
  g.path([['M', [x - r * 0.75, y - r * 0.2]], ['Q', [x - r * 0.75, y - r * 1.3], [x - r * 0.15, y - r * 1.45]], ['Q', [x - r * 0.4, y - r * 0.9], [x - r * 0.45, y - r * 0.2]], ['Z']], GOLDC[0], { alpha: 0.85 });
  g.line([x, y - r * 1.7], [x, y - r * 2.3], GOLDC[2], 0.7);
  g.circ([x, y - r * 2.4], 0.7, GOLDC[0]);
}
