// Stage 1 service buildings, ported from the approved mock-up (well, granary, bazaar, temple, fieldTile).
// The grain farm is new: a fenced 2x2 field of grain rows with a small farmhouse in the near corner.
// Each service carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
import { box, tb, qd, crs, door, fence, pots, awn, col, tile, p, U, quad, hs } from './primitives.js';
import {
  WASH, MUD2, STONE, THATCH, TEAL, TEAL_DARK, BLUE, RED, GOLD, PINK, GREEN, GREEN_DARK, LEAF2, WOOD, DOOR,
  TERRAIN,
} from './palette.js';
import { boundsFor } from '../iso.js';

export const SERVICE_EMBLEM = { well: BLUE, farm_grain: LEAF2, granary: GREEN, bazaar: RED, temple: GOLD };

export function pennant(g, q, h, color) {
  g.line(q, U(q, h), WOOD, 0.7);
  g.poly([U(q, h), [q[0] + 6, q[1] - h + 1.5], U(q, h - 3)], color);
}

// A field tile: crop colour with straight rows of stalks. Only 'grain' is used in Stage 1.
export function fieldTile(g, x, y, k) {
  tile(g, x, y, { grain: TERRAIN.field, barley: '#D7BF62', flax: '#80AA52' }[k], { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 });
  for (let v = 0.14; v < 0.95; v += 0.18) {
    for (let u = 0.08; u < 0.98; u += 0.11) {
      const q = p(x + u, y + v), hh = 2.2 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
      if (k === 'grain') {
        g.line(q, [q[0] - 0.3, q[1] - hh], '#4F7A2C', 0.7);
        g.line(q, [q[0] + 0.6, q[1] - hh * 0.8], '#A6CC5E', 0.6);
      } else if (k === 'barley') {
        g.line(q, [q[0] + 0.2, q[1] - hh], '#A88E3A', 0.7);
        g.circ([q[0] + 0.2, q[1] - hh], 0.55, '#F2DE90');
      } else {
        g.line(q, [q[0], q[1] - hh], '#4F7A2C', 0.6);
        if (hs(x + u, y + v, 4) > 0.45) g.circ([q[0], q[1] - hh], 0.6, '#8DB8EE');
      }
    }
  }
}

// Well: a stone drum of water with a wooden frame, a rope and a bucket, and a blue pennant.
export function well(g, x, y) {
  const gx = x + 0.5, gy = y + 0.5;
  const F = box(g, gx - 0.22, gy - 0.22, 0.44, 0.44, 4, 0, STONE);
  crs(g, F, 4, '#A89AA8', 1.6);
  g.poly(quad(gx - 0.15, gy - 0.15, 0.3, 0.3, 4), TERRAIN.water);
  const a = U(p(gx - 0.2, gy), 4), b = U(p(gx + 0.2, gy), 4);
  g.line(a, U(a, 8), WOOD, 0.9);
  g.line(b, U(b, 8), WOOD, 0.9);
  g.line(U(a, 8), U(b, 8), WOOD, 0.9);
  const m = U(p(gx, gy), 12);
  g.line(m, U(m, 4.6), '#8C7B5C', 0.4);
  g.ell(U(p(gx, gy), 6.8), 1, 1.2, '#7A5530');
  pennant(g, U(b, 8), 6, SERVICE_EMBLEM.well);
}

// Granary: a whitewashed block with a teal band, four domed silos and grain sacks by the door.
export function granary(g, X, Y) {
  const F = box(g, X + 0.1, Y + 0.1, 1.8, 1.8, 9, 0, WASH);
  door(g, F, 0.42, 0.58, 6);
  qd(g, F.L, 0, 1, 7.4, 8.4, TEAL);
  qd(g, F.R, 0, 1, 7.4, 8.4, TEAL_DARK);
  for (const [u, v] of [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4], [1.4, 1.4]]) {
    const c = U(p(X + u, Y + v), 9);
    g.dome(c, 8, 8.5, 4, { outline: true });
    g.circ([c[0], c[1] - 8.2], 1.3, '#5A4A5A');
  }
  [0.42, 0.52, 0.62].forEach((u, i) => g.ell(U(p(X + u + 0.1, Y + 2.08), 1.2), 1.7, 1.3, i % 2 ? '#E2C990' : '#EED6A0', { outline: true }));
  pennant(g, U(p(X + 1.85, Y + 0.15), 9), 7, SERVICE_EMBLEM.granary);
}

// Bazaar: four stalls, each a counter of goods under a striped awning in its own colour.
export function bazaar(g, X, Y) {
  const cs = [[RED, '#933E2B'], [GOLD, '#B08436'], [BLUE, '#245A88'], [GREEN, GREEN_DARK]];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => {
    const x = X + i, y = Y + j;
    box(g, x + 0.24, y + 0.3, 0.52, 0.4, 3.2, 0, ['#D9B47A', '#C49E66', '#A08478']);
    for (const [u, c] of [[0.3, '#C9552F'], [0.55, GOLD], [0.8, '#6E9E3A']]) g.ell(U(p(x + 0.24 + 0.52 * u, y + 0.55), 3.4), 1.4, 0.9, c, { outline: true });
    g.ell(U(p(x + 0.88, y + 0.5), 1), 1.6, 1, '#D9B060', { outline: true });
    awn(g, x + 0.1, y + 0.1, 0.8, 0.8, 7.5, cs[k][0], cs[k][1]);
  });
  pennant(g, U(p(X + 1.9, Y + 0.1), 8.7), 7, SERVICE_EMBLEM.bazaar);
}

// Temple: a stone platform, a hall with painted columns on both faces, two pylons with banded cornices
// and painted figures, a gold-topped gateway between teal columns, and flags (one in the emblem gold).
export function temple(g, X, Y) {
  box(g, X + 0.05, Y + 0.05, 1.9, 1.9, 2, 0, STONE);
  const Hh = box(g, X + 0.25, Y + 0.2, 1.5, 1, 13, 2, STONE);
  qd(g, Hh.R, 0, 1, 1, 11.5, '#9A8CA0');
  qd(g, Hh.L, 0, 1, 1, 11.5, '#A99AA6');
  for (let i = 0; i < 6; i++) {
    const u = 0.05 + i * 0.17;
    qd(g, Hh.R, u, u + 0.08, 1, 10, '#F4EDDF');
    qd(g, Hh.R, u, u + 0.08, 4, 5, TEAL);
    qd(g, Hh.R, u - 0.015, u + 0.095, 10, 11.5, GREEN);
  }
  for (let i = 0; i < 7; i++) {
    const u = 0.04 + i * 0.14;
    qd(g, Hh.L, u, u + 0.07, 1, 10, '#F4EDDF');
    qd(g, Hh.L, u, u + 0.07, 4, 5, TEAL);
    qd(g, Hh.L, u - 0.015, u + 0.085, 10, 11.5, GREEN);
  }
  box(g, X + 0.2, Y + 0.15, 1.6, 1.1, 1.6, 15, STONE);
  const pyl = (px) => {
    const F = tb(g, px, Y + 1.2, 0.75, 0.7, 21, 2, 0.1, STONE);
    for (const [a, b, c] of [[18.6, 19.8, TEAL], [17.6, 18.6, RED], [16.8, 17.6, GOLD]]) {
      qd(g, F.L, 0, 1, a, b, c);
      qd(g, F.R, 0, 1, a, b, c, { alpha: 0.8 });
    }
    qd(g, F.L, 0.22, 0.78, 4, 15, '#F7F1E4');
    qd(g, F.L, 0.42, 0.58, 5, 11, TEAL);
    g.circ(F.L(0.5, 12.6), 1.6, TEAL);
    qd(g, F.L, 0.36, 0.64, 9.5, 10.4, BLUE);
    g.circ(F.L(0.5, 14.3), 1, GOLD);
    qd(g, F.L, 0.26, 0.3, 5, 14, BLUE, { alpha: 0.7 });
    qd(g, F.L, 0.7, 0.74, 5, 14, BLUE, { alpha: 0.7 });
    for (let s = 3.5; s < 15; s += 2.2) if (hs(px, s, 3) > 0.3) qd(g, F.R, 0.2, 0.8, s, s + 0.7, '#9A8CA0', { alpha: 0.5 });
    box(g, px + 0.08, Y + 1.28, 0.59, 0.54, 1.4, 23, ['#F3EBDA', '#E2D7C4', '#C0B4C2']);
    const fp = U(p(px + 0.4, Y + 1.97), 2);
    g.line(fp, U(fp, 31), WOOD, 0.8);
    g.poly([U(fp, 31), [fp[0] + 9, fp[1] - 29], U(fp, 27)], px < X + 0.5 ? PINK : SERVICE_EMBLEM.temple);
  };
  pyl(X + 0.1);
  const G = box(g, X + 0.85, Y + 1.35, 0.3, 0.45, 12, 2, STONE);
  qd(g, G.L, 0.12, 0.88, 0, 9, DOOR);
  qd(g, G.L, 0, 1, 10, 12, GOLD);
  col(g, X + 0.86, Y + 1.86, 10, 2);
  col(g, X + 1.14, Y + 1.86, 10, 2);
  pyl(X + 1.15);
}

// Grain farm: four field tiles with straight rows, a reed fence round the edge that stops at the
// farmhouse, and a small thatched farmhouse in the near corner with pots and a green pennant.
export function farmGrain(g, X, Y) {
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) fieldTile(g, X + i, Y + j, 'grain');
  fence(g, X + 0.02, Y + 0.02, 1.96, 0.06);
  fence(g, X + 0.02, Y + 0.02, 0.06, 1.96);
  fence(g, X + 0.02, Y + 1.92, 1.3, 0.06);
  fence(g, X + 1.92, Y + 0.02, 0.06, 1.3);
  const a = X + 1.4, b = Y + 1.4, w = 0.52;
  const F = box(g, a, b, w, w, 5, 0, MUD2);
  crs(g, F, 5, '#9C7A54', 2.2);
  door(g, F, 0.34, 0.6, 3.6);
  tb(g, a - 0.06, b - 0.06, w + 0.12, w + 0.12, 4.5, 5, 0.3, THATCH);
  pots(g, p(X + 1.2, Y + 1.78), 2);
  pennant(g, U(p(a + w, b + 0.06), 0), 9, SERVICE_EMBLEM.farm_grain);
}

export const SERVICE_ART = {
  well: { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.28, 0.28, 0.44, 0.44, 6]], draw: well },
  farm_grain: { w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12), shadows: [[1.4, 1.4, 0.52, 0.52, 9]], draw: farmGrain },
  granary: { w: 2, d: 2, height: 22, bounds: boundsFor(2, 2, 22), shadows: [[0.1, 0.1, 1.8, 1.8, 16]], draw: granary },
  bazaar: {
    w: 2, d: 2, height: 16, bounds: boundsFor(2, 2, 16),
    shadows: [[0.12, 0.12, 0.76, 0.76, 9], [1.12, 0.12, 0.76, 0.76, 9], [0.12, 1.12, 0.76, 0.76, 9], [1.12, 1.12, 0.76, 0.76, 9]],
    draw: bazaar,
  },
  temple: { w: 2, d: 2, height: 40, bounds: boundsFor(2, 2, 40), shadows: [[0.25, 0.2, 1.5, 1, 15], [0.1, 1.2, 1.8, 0.7, 23]], draw: temple },
};
