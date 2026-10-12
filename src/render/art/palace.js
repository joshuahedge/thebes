// The palace in its five styles (spec 4.20, 5.7 item 8, rulings 272-275), each clearly grander than the last at phone
// zoom: a mudbrick courtyard house with a palm; a whitewashed hall with a portico of teal columns; painted pylons with
// flagpoles and banners before the hall; gilded cornices, seated statues and two small obelisks; and a lapis-and-gold
// palace with a pool court. A 3x3 drawn once per style as a cached sprite, like the homes. While the palace is being
// enlarged (b.works), its slot is the old style with timber scaffolding and a few workers round it ('palace.s<n>.w').
import { box, tb, qd, door, win, parapet, mat, rug, pots, col, bed, pool, stairs, statue, p, U, quad, hs } from './primitives.js';
import { palmAt } from './nature.js';
import { fig } from './figures.js';
import { pennant } from './services.js';
import {
  WASH, WASH2, MUD, MUD2, STONE, GOLDC, TEAL, TEAL_DARK, BLUE, RED, RED_DARK, GOLD, PINK, GREEN, GREEN_DARK, WOOD,
  DOOR, PARAPET, SHADOW,
} from './palette.js';
import { PALACE_STYLES } from '../../data/palace.js';
import { boundsFor } from '../iso.js';

const LAPIS = '#2C4F9E', LAPIS_DARK = '#203C7A';
const PLATFORM = ['#F2EADA', '#E2D6C2', '#BEB2C2'];
const BANNERS = [RED, TEAL, GOLD, BLUE];

// The palace's own banner pole: a tall pole with a long pennant.
function flag(g, gx, gy, z, h, color) {
  const q = U(p(gx, gy), z);
  g.line(q, U(q, h), WOOD, 0.8);
  g.poly([U(q, h), [q[0] + 8, q[1] - h + 2.4], [q[0] + 7, q[1] - h + 4.4], U(q, h - 5)], color);
}

// A small obelisk with a gilded tip, standing on tile point (gx, gy) at height z.
export function smallObelisk(g, gx, gy, h, z = 0) {
  box(g, gx - 0.1, gy - 0.1, 0.2, 0.2, 1.6, z, STONE, 0);
  const F = tb(g, gx - 0.065, gy - 0.065, 0.13, 0.13, h, z + 1.6, 0.02, STONE);
  qd(g, F.L, 0.2, 0.8, h * 0.2, h * 0.85, '#E2D6C2', { alpha: 0.6 });
  for (const s of [h * 0.3, h * 0.55]) { qd(g, F.L, 0.15, 0.85, s, s + 0.6, TEAL, { alpha: 0.8 }); qd(g, F.R, 0.15, 0.85, s, s + 0.6, TEAL_DARK, { alpha: 0.7 }); }
  const t = U(p(gx, gy), z + 1.6 + h + 3.4), a = U(p(gx - 0.045, gy + 0.045), z + 1.6 + h), b = U(p(gx + 0.045, gy + 0.045), z + 1.6 + h), c = U(p(gx + 0.045, gy - 0.045), z + 1.6 + h);
  g.poly([a, b, t], GOLD);
  g.poly([b, c, t], GOLDC[2]);
}

// A row of painted columns along x at y = gy, from x0 to x1, standing on z.
function colonnade(g, x0, x1, gy, n, h, z, cap) {
  for (let i = 0; i < n; i++) col(g, x0 + ((x1 - x0) * i) / (n - 1), gy, h, z, cap);
}

// Cornice bands on a block's two faces: [from, to, colour] from the top down.
function bands(g, F, list) {
  for (const [a, b, c, c2] of list) { qd(g, F.L, 0, 1, a, b, c); qd(g, F.R, 0, 1, a, b, c2 || c, { alpha: c2 ? 1 : 0.8 }); }
}

// A pylon: a tapered painted tower; `gilt` gives it a gold cornice, `lapis` lapis panels.
function pylon(g, x, y, w, d, h, z, { gilt = false, lapis = false } = {}) {
  const F = tb(g, x, y, w, d, h, z, 0.08, STONE);
  bands(g, F, [[h - 1.4, h, gilt ? GOLD : TEAL, gilt ? GOLDC[2] : TEAL_DARK], [h - 2.4, h - 1.4, RED, RED_DARK], [h - 3.2, h - 2.4, gilt ? TEAL : GOLD, gilt ? TEAL_DARK : GOLDC[2]]]);
  qd(g, F.L, 0.2, 0.8, 3, h - 5, lapis ? LAPIS : '#F7F1E4');                    // the painted panel
  if (lapis) qd(g, F.L, 0.26, 0.74, 3.6, h - 5.6, LAPIS_DARK, { alpha: 0.5 });
  qd(g, F.L, 0.42, 0.58, 4, h * 0.45, lapis ? GOLD : TEAL);                     // a painted figure
  g.circ(F.L(0.5, h * 0.45 + 1.4), 1.3, lapis ? GOLD : TEAL);
  qd(g, F.L, 0.34, 0.66, h * 0.32, h * 0.32 + 0.8, lapis ? '#F7F1E4' : BLUE);
  qd(g, F.R, 0.25, 0.75, 3, h - 5, lapis ? LAPIS_DARK : '#D9CFC6', { alpha: 0.6 });
  return F;
}

// 0 The courtyard house: mudbrick walls round a courtyard with a palm, a rug and pots; a whitewashed house of two
// storeys at the back with a roof mat; a gate in the front wall.
export function palaceCourtyard(g, X, Y) {
  g.poly(quad(X + 0.1, Y + 0.1, 2.8, 2.8, 0), '#E7D3A6');
  box(g, X + 0.1, Y + 0.1, 2.8, 0.14, 5, 0, MUD2);                             // the back walls
  box(g, X + 0.1, Y + 0.24, 0.14, 2.66, 5, 0, MUD2);
  const H = box(g, X + 0.32, Y + 0.3, 1.6, 1.06, 11, 0, WASH);
  parapet(g, X + 0.32, Y + 0.3, 1.6, 1.06, 11);
  qd(g, H.L, 0, 1, 9.4, 10.2, TEAL); qd(g, H.R, 0, 1, 9.4, 10.2, TEAL_DARK);
  door(g, H, 0.42, 0.56, 6.6);
  win(g, H.L, 0.12, 0.24, 4.4, 6.8); win(g, H.L, 0.72, 0.84, 4.4, 6.8); win(g, H.R, 0.3, 0.5, 4.4, 6.8);
  const U2 = box(g, X + 0.4, Y + 0.36, 0.76, 0.6, 6, 11, WASH2);              // the upper storey
  parapet(g, X + 0.4, Y + 0.36, 0.76, 0.6, 17);
  win(g, U2.L, 0.3, 0.5, 2, 4.2);
  mat(g, X + 1.28, Y + 0.44, 0.5, 0.4, 11, RED, GOLD);
  pennant(g, U(p(X + 0.5, Y + 0.4), 17), 8, PINK);
  rug(g, X + 0.6, Y + 1.7, 0.7, 0.5, 0, RED, '#F2D7A8', GOLD);
  box(g, X + 2.0, Y + 0.4, 0.7, 0.5, 4, 0, MUD, 0);                            // a store
  pots(g, p(X + 2.3, Y + 1.0), 3);
  palmAt(g, X + 2.2, Y + 1.7, 0.95);
  box(g, X + 0.1, Y + 2.76, 1.1, 0.14, 5, 0, MUD2);                            // the front walls and the gate
  box(g, X + 1.7, Y + 2.76, 1.2, 0.14, 5, 0, MUD2);
  box(g, X + 2.76, Y + 0.24, 0.14, 2.52, 5, 0, MUD2);
  for (const u of [1.14, 1.64]) box(g, X + u, Y + 2.72, 0.12, 0.22, 7, 0, WASH, 0);
}

// 1 The columned hall: a whitewashed hall on a platform with a banded cornice, a portico of six teal columns, steps
// down to a court with flower beds and palms.
export function palaceColumned(g, X, Y) {
  box(g, X + 0.06, Y + 0.06, 2.88, 2.88, 2, 0, PLATFORM);
  const H = box(g, X + 0.3, Y + 0.24, 2.4, 1.32, 14, 2, WASH);
  parapet(g, X + 0.3, Y + 0.24, 2.4, 1.32, 16);
  bands(g, H, [[12.6, 14, TEAL, TEAL_DARK], [11.8, 12.6, RED, RED_DARK]]);
  door(g, H, 0.44, 0.56, 8);
  for (const u of [0.12, 0.26, 0.7, 0.84]) win(g, H.L, u, u + 0.07, 5, 8.4);
  for (const u of [0.25, 0.65]) win(g, H.R, u, u + 0.12, 5, 8.4);
  mat(g, X + 0.6, Y + 0.5, 0.9, 0.6, 16, TEAL, GOLD);
  colonnade(g, X + 0.42, X + 2.58, Y + 1.92, 6, 11, 2);
  const R = box(g, X + 0.3, Y + 1.56, 2.4, 0.5, 1.6, 14.6, STONE);              // the portico's roof
  qd(g, R.L, 0, 1, 0, 1.6, TEAL);
  stairs(g, X + 1.2, Y + 2.06, 0.6, 0.3, 2, 2, PLATFORM);
  bed(g, X + 0.24, Y + 2.3, 0.7, 0.5);
  bed(g, X + 2.06, Y + 2.3, 0.7, 0.5);
  palmAt(g, X + 0.5, Y + 2.55, 0.8, 2);
  palmAt(g, X + 2.5, Y + 2.55, 0.8, 2);
}

// The hall behind a gateway (styles 2-4): a long whitewashed hall on the platform, its cornice in the style's colours.
function hall(g, X, Y, { gilt = false, lapis = false } = {}) {
  const H = box(g, X + 0.3, Y + 0.2, 2.4, 1.2, 16, 2, WASH);
  parapet(g, X + 0.3, Y + 0.2, 2.4, 1.2, 18);
  bands(g, H, [[14.4, 16, gilt ? GOLD : TEAL, gilt ? GOLDC[2] : TEAL_DARK], [13.6, 14.4, lapis ? LAPIS : RED, lapis ? LAPIS_DARK : RED_DARK]]);
  for (const u of [0.25, 0.65]) win(g, H.R, u, u + 0.12, 6, 10);
  mat(g, X + 0.5, Y + 0.4, 0.8, 0.6, 18, lapis ? LAPIS : RED, GOLD);
  colonnade(g, X + 1.5, X + 2.5, Y + 0.3, 3, 4, 18, gilt ? GOLDC : undefined);   // a roof pavilion
  box(g, X + 1.44, Y + 0.24, 1.12, 0.14, 1.2, 22, gilt ? GOLDC : STONE, 0);
  return H;
}

// The gateway: two pylons and the gate between, along the front of the platform.
function gateway(g, X, Y, y0, opts) {
  pylon(g, X + 0.32, Y + y0, 0.86, 0.6, 22, 2, opts);
  const G = box(g, X + 1.22, Y + y0 + 0.12, 0.56, 0.4, 14, 2, STONE);
  qd(g, G.L, 0.18, 0.82, 0, 10, DOOR);
  qd(g, G.L, 0, 1, 11.4, 14, opts.gilt ? GOLD : TEAL);
  pylon(g, X + 1.82, Y + y0, 0.86, 0.6, 22, 2, opts);
}

// 2 Pylons and banners: the hall behind a painted pylon gateway, four flagpoles with banners before it.
export function palacePylons(g, X, Y) {
  box(g, X + 0.06, Y + 0.06, 2.88, 2.88, 2, 0, PLATFORM);
  hall(g, X, Y);
  gateway(g, X, Y, 1.5, {});
  for (let i = 0; i < 4; i++) flag(g, X + 0.42 + i * 0.72 + (i > 1 ? 0.06 : 0), Y + 2.2, 2, 34, BANNERS[i]);
  stairs(g, X + 1.2, Y + 2.2, 0.6, 0.5, 2, 3, PLATFORM);
  rug(g, X + 1.28, Y + 2.62, 0.44, 0.24, 0, RED, '#F2D7A8', GOLD);
  for (const u of [0.4, 2.4]) bed(g, X + u, Y + 2.4, 0.4, 0.4);
}

// 3 Gilded: the gateway's cornices and the hall's in gold, seated statues flanking the approach, two small obelisks
// with gilded tips at the front corners.
export function palaceGilded(g, X, Y) {
  box(g, X + 0.06, Y + 0.06, 2.88, 2.88, 2, 0, PLATFORM);
  hall(g, X, Y, { gilt: true });
  gateway(g, X, Y, 1.4, { gilt: true });
  for (let i = 0; i < 4; i++) flag(g, X + 0.42 + i * 0.72 + (i > 1 ? 0.06 : 0), Y + 2.06, 2, 34, BANNERS[i]);
  g.poly(quad(X + 1.2, Y + 2.06, 0.6, 0.88, 2), '#E8DCC4');                     // the processional way
  statue(g, X + 1.0, Y + 2.5);
  statue(g, X + 2.0, Y + 2.5);
  smallObelisk(g, X + 0.4, Y + 2.62, 16, 2);
  smallObelisk(g, X + 2.62, Y + 2.62, 16, 2);
}

// 4 Lapis and gold: lapis-panelled pylons with gold cornices, the hall banded in lapis and gold, a pool court with
// palms in front, the obelisks and the statues, gold on the platform's edge.
export function palaceLapis(g, X, Y) {
  const P = box(g, X + 0.06, Y + 0.06, 2.88, 2.88, 2.4, 0, PLATFORM);
  qd(g, P.L, 0, 1, 0.6, 1.6, LAPIS); qd(g, P.R, 0, 1, 0.6, 1.6, LAPIS_DARK);
  qd(g, P.L, 0, 1, 1.6, 2.4, GOLD); qd(g, P.R, 0, 1, 1.6, 2.4, GOLDC[2]);
  hall(g, X, Y, { gilt: true, lapis: true });
  gateway(g, X, Y, 1.24, { gilt: true, lapis: true });
  for (let i = 0; i < 4; i++) flag(g, X + 0.42 + i * 0.72 + (i > 1 ? 0.06 : 0), Y + 1.9, 2.4, 36, i % 2 ? GOLD : LAPIS);
  g.poly(quad(X + 0.3, Y + 2.0, 2.4, 0.86, 2.4), '#F2E6CC');                    // the pool court
  pool(g, X + 0.52, Y + 2.14, 1.96, 0.56);
  g.poly(quad(X + 0.52, Y + 2.14, 1.96, 0.56, 2.4), 'none', { stroke: GOLD, strokeWidth: 0.7 });
  palmAt(g, X + 0.3, Y + 2.78, 0.8, 2.4);
  palmAt(g, X + 2.72, Y + 2.78, 0.8, 2.4);
  smallObelisk(g, X + 1.0, Y + 2.84, 18, 2.4);
  smallObelisk(g, X + 2.0, Y + 2.84, 18, 2.4);
}

export const PALACE_DRAW = [palaceCourtyard, palaceColumned, palacePylons, palaceGilded, palaceLapis];
export const PALACE_HEIGHT = [26, 24, 40, 40, 42];

// Timber scaffolding round the palace while it is enlarged: poles at the corners and along the front faces, two
// levels of planks, a ladder, and three workers carrying bricks.
export function scaffolding(g, X, Y, h) {
  const top = Math.max(12, h - 6);
  const poles = [[0.2, 2.86], [1.0, 2.86], [2.0, 2.86], [2.86, 2.86], [2.86, 2.0], [2.86, 1.0], [2.86, 0.2]];
  for (const [u, v] of poles) { const q = p(X + u, Y + v); g.line(q, U(q, top + 2), WOOD, 0.8); }
  for (const z of [top * 0.45, top]) {
    g.poly([U(p(X + 0.2, Y + 2.8), z), U(p(X + 2.8, Y + 2.8), z), U(p(X + 2.8, Y + 2.92), z), U(p(X + 0.2, Y + 2.92), z)], '#C9A26A', { outline: true });
    g.poly([U(p(X + 2.8, Y + 0.2), z), U(p(X + 2.92, Y + 0.2), z), U(p(X + 2.92, Y + 2.8), z), U(p(X + 2.8, Y + 2.8), z)], '#A8814E', { outline: true });
  }
  g.line(U(p(X + 0.2, Y + 2.86), top * 0.45 + 1), U(p(X + 2.86, Y + 2.86), top * 0.45 + 1), WOOD, 0.4, 0.8);
  const a = p(X + 1.5, Y + 2.95), b = U(p(X + 1.5, Y + 2.86), top * 0.45);
  for (const dx of [-1.1, 1.1]) g.line([a[0] + dx, a[1]], [b[0] + dx, b[1]], WOOD, 0.6);
  for (let i = 1; i < 5; i++) { const t = i / 5; g.line([a[0] - 1.1 + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + 1.1 + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], WOOD, 0.45); }
  fig(g, X + 0.7, Y + 2.86, 'hauler', top * 0.45, 0.8);
  fig(g, X + 2.86, Y + 1.5, 'hauler', top, 0.8);
  fig(g, X + 2.3, Y + 2.96, 'hauler', 0, 0.85);
}

const slot = (height, draw) => ({ w: 3, d: 3, height, bounds: boundsFor(3, 3, height), shadows: [[0.3, 0.2, 2.4, 1.3, 12]], draw });

export const PALACE_ART = { palace: slot(PALACE_HEIGHT[0], (g, x, y) => palaceCourtyard(g, x, y)) };
PALACE_STYLES.forEach((s, i) => {
  PALACE_ART[`palace.s${i}`] = slot(PALACE_HEIGHT[i], (g, x, y) => PALACE_DRAW[i](g, x, y));
  PALACE_ART[`palace.s${i}.w`] = slot(PALACE_HEIGHT[i], (g, x, y) => { PALACE_DRAW[i](g, x, y); scaffolding(g, x, y, PALACE_HEIGHT[i]); });
});
