// Canvas ports of the approved mock-up's drawing primitives. Positions and sizes are in tile units, heights
// in art px. Every function takes the drawing helper `g` (see ctx.js) first; otherwise the parameter lists
// are the mock-up's, so the two can be compared line by line.
import { p, U, quad, hs, tileDiamond } from '../iso.js';
import {
  SHADOW, INK, WINDOW, DOOR, PARAPET, POT, POT_LIGHT, WOOD, STONE, TEAL, TEAL_DARK, GREEN, GREEN_DARK,
  RED, GOLD, PURP, PINK, GOLDC,
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
