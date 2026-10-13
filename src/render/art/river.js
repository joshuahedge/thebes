// Stage 4.6, the River track's art (rulings 334-335, 360-369): the nilometer, the hunting lodge and the fishing wharf, and the animals' and
// boat's figure slots (fig.gazelle, fig.ostrich, fig.ibis, fig.heron, fig.hippo, fig.croc, fig.leap, fig.splash0..2, fig.hunter,
// fig.boat), as registry entries (src/render/art/registry.js describes the shape). Joined into ART by src/render/art/s46.js.
//
// The house style: white-washed stone with teal accents and lavender shadows; mud-brick and thatch for the lodge, weathered planks for
// the wharf. Animals are told apart by shape (a gazelle's horns, an ostrich's long neck and white tail, an ibis's curved bill, a
// heron's long legs, a hippo's back and ears showing above the water, a crocodile's long ridged back), never by colour alone.
// Figures face right; `_l` slots face left (the same drawing mirrored), so a herd that steps the other way turns.
import { box, crs, qd, door, p, U, quad, hs } from './primitives.js';
import { pennant } from './services.js';
import { fig } from './figures.js';
import { STONE, MUD2, GOLDC, THATCH, TEAL, TEAL_DARK, WOOD, LEAF2, SHADOW, TERRAIN, BLUE, GOLD } from './palette.js';
import { boundsFor } from '../iso.js';
import { T } from '../../sim/terrain.js';
import { idx, inBounds } from '../../sim/grid.js';

const PLANK = ['#C9A36B', '#B58A56', '#8D6A44'];
const HIDE = '#D7B98A', HIDE_DARK = '#9A7448';

// ── The nilometer (1x1) ──
// A white-washed stone plinth by the water with a tall graduated column, a teal band for each cubit and a gilded cap, and a short stair
// going down toward the river on its lit side; a blue pennant (the Services colour).
export function nilometer(g, X, Y) {
  const gx = X + 0.5, gy = Y + 0.5;
  g.poly(quad(X + 0.04, Y + 0.04, 0.92, 0.92, 0), '#E9DDBF', { outline: true });
  for (let k = 0; k < 3; k++) box(g, X + 0.22 + k * 0.1, Y + 0.76 + 0.0, 0.1, 0.2, 1.2 + k * 0.0, 0, STONE, 0);   // the stair's steps, lowest in front
  const P = box(g, X + 0.12, Y + 0.12, 0.76, 0.62, 3, 0, STONE);
  crs(g, P, 3, '#A89AA8', 1.5);
  const C = box(g, gx - 0.1, gy - 0.1, 0.2, 0.2, 17, 3, STONE);
  for (let k = 0; k < 5; k++) {                                     // the cubits marked up the column
    const a = 1.2 + k * 3.2, b = a + 1.2;
    qd(g, C.L, 0, 1, a, b, k % 2 ? TEAL_DARK : TEAL);
    qd(g, C.R, 0, 1, a, b, TEAL_DARK);
  }
  box(g, gx - 0.15, gy - 0.15, 0.3, 0.3, 2, 20, GOLDC);              // the gilded cap
  g.circ(U(p(gx, gy), 23.6), 1.1, GOLD);
  pennant(g, U(p(X + 0.84, Y + 0.18), 3), 11, BLUE);
}

// ── The hunting lodge (2x2) ──
// A mud-brick hall under a thatched roof along the back with horns over its door, a frame of stretched hides beside it, a spear rack, and
// a drying rack at the right: bare when nobody hunts (stage 0), hung with game while the lodge is working (stage 1).
function gameHung(g, q, s = 1) {          // a small carcass hanging by the hind legs from a bar at q
  g.line(q, [q[0], q[1] + 1.4 * s], WOOD, 0.4);
  g.ell([q[0], q[1] + 3.2 * s], 1.3 * s, 2 * s, '#C99A5E', { outline: true });
  g.ell([q[0], q[1] + 4.2 * s], 0.8 * s, 1 * s, '#F1E2C2');
}
export function huntingLodge(g, X, Y, stage = 0) {
  g.poly(quad(X + 0.06, Y + 0.06, 1.88, 1.88, 0), '#DFC595', { outline: true });
  for (let i = 0; i < 7; i++) g.circ(p(X + 0.2 + hs(i, 3, 5) * 1.6, Y + 0.9 + hs(i, 4, 5) * 0.95), 0.6, TERRAIN.dotDark, { alpha: 0.55 });
  const B = box(g, X + 0.1, Y + 0.1, 1.3, 0.95, 7, 0, MUD2);          // the hall
  crs(g, B, 7, '#9A7A5A', 2.4);
  box(g, X + 0.02, Y + 0.02, 1.46, 1.11, 3.4, 7, THATCH, 0);           // the thatched roof, a low block
  for (let k = 0; k < 5; k++) g.line(U(p(X + 0.02 + k * 0.3, Y + 1.13), 7), U(p(X + 0.02 + k * 0.3, Y + 1.13), 10.4), '#AC9070', 0.4, 0.5);
  door(g, B, 0.34, 0.62, 5);
  const m = B.L(0.48, 6.6);                                            // horns over the door
  g.stroke([['M', [m[0] - 0.4, m[1]]], ['Q', [m[0] - 3, m[1] - 1.4], [m[0] - 2.4, m[1] - 3.8]]], '#4A3A2E', 0.7);
  g.stroke([['M', [m[0] + 0.4, m[1]]], ['Q', [m[0] + 3, m[1] - 1.4], [m[0] + 2.4, m[1] - 3.8]]], '#4A3A2E', 0.7);
  // the hide frame: two posts and a stretched hide, in front on the left
  const f0 = p(X + 0.15, Y + 1.5), f1 = p(X + 0.75, Y + 1.5);
  g.line(f0, U(f0, 7), WOOD, 0.8); g.line(f1, U(f1, 7), WOOD, 0.8);
  g.poly([U(f0, 6.4), U(f1, 6.4), U(f1, 1.6), U(f0, 1.6)], HIDE, { outline: true });
  g.line(U(f0, 4), U(f1, 4), HIDE_DARK, 0.5, 0.7);
  // the spear rack: three spears leaning on a bar
  const r0 = p(X + 1.05, Y + 1.55);
  for (let k = 0; k < 3; k++) { g.line(U(r0, 0), [r0[0] + (k - 1) * 1.6, r0[1] - 12 - k * 0.6], WOOD, 0.5); g.poly([[r0[0] + (k - 1) * 1.6, r0[1] - 14 - k * 0.6], [r0[0] + (k - 1) * 1.6 + 0.9, r0[1] - 12 - k * 0.6], [r0[0] + (k - 1) * 1.6 - 0.9, r0[1] - 12 - k * 0.6]], '#C3B8C6'); }
  // the drying rack at the right: two posts, a bar, and the game
  const d0 = p(X + 1.62, Y + 0.95), d1 = p(X + 1.62, Y + 1.75);
  g.line(d0, U(d0, 8.4), WOOD, 0.8); g.line(d1, U(d1, 8.4), WOOD, 0.8);
  g.line(U(d0, 8.4), U(d1, 8.4), WOOD, 0.9);
  if (stage > 0) for (const t of [0.22, 0.5, 0.78]) gameHung(g, [d0[0] + (d1[0] - d0[0]) * t, d0[1] + (d1[1] - d0[1]) * t - 8.4]);
  pennant(g, U(p(X + 0.2, Y + 0.2), 11), 7, LEAF2);
}

// ── The fishing wharf (2x1, or 1x2 turned) ──
// Drawn in a frame of its own: u along the shore (0-2), v across it (0-1 is the footprint, on land; the pier runs on over the water to
// 1.9). side says where the water lies: 's' (south, +y: the base slot), 'n', 'e' or 'w'; each maps (u, v) to tiles.
const SIDES = {
  s: { w: 2, d: 1, at: (X, Y, u, v) => [X + u, Y + v] },
  n: { w: 2, d: 1, at: (X, Y, u, v) => [X + u, Y + 1 - v] },
  e: { w: 1, d: 2, at: (X, Y, u, v) => [X + v, Y + u] },
  w: { w: 1, d: 2, at: (X, Y, u, v) => [X + 1 - v, Y + u] },
};
export function fishingWharf(g, X, Y, side = 's') {
  const S = SIDES[side];
  const pt = (u, v) => p(...S.at(X, Y, u, v));
  const rect = (u0, v0, du, dv) => {                                   // the tile rectangle a (u, v) rectangle covers
    const a = S.at(X, Y, u0, v0), b = S.at(X, Y, u0 + du, v0 + dv);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
  };
  const bx = (u0, v0, du, dv, h, z, C, fx) => box(g, ...rect(u0, v0, du, dv), h, z, C, fx);
  const flat = (u0, v0, du, dv, z, c, o) => g.poly(quad(...rect(u0, v0, du, dv), z), c, o);
  flat(0.03, 0.03, 1.94, 0.94, 0, '#D9BE8A', { outline: true });                        // the packed bank
  // the net shed: a small reed hut on the land side, toward one end
  const H = bx(0.12, 0.08, 0.7, 0.5, 5.4, 0, MUD2);
  crs(g, H, 5.4, '#9A7A5A', 2);
  bx(0.06, 0.02, 0.82, 0.62, 2.6, 5.4, THATCH, 0);
  // the pier: planks out over the water, on posts, with a low rail of rope at its end
  bx(1.12, 0.3, 0.5, 1.5, 1.2, 1.6, PLANK, 0);
  for (const [u, v] of [[1.14, 0.5], [1.6, 0.5], [1.14, 1.15], [1.6, 1.15], [1.14, 1.76], [1.6, 1.76]]) g.line(pt(u, v), U(pt(u, v), 3.4), WOOD, 0.8);
  for (let k = 0; k < 6; k++) { const v = 0.4 + k * 0.24; g.line(U(pt(1.12, v), 2.8), U(pt(1.62, v), 2.8), '#8D6A44', 0.35, 0.7); }   // the plank joints
  // a drying net on two poles in front of the shed, and a basket of fish on the pier
  const n0 = pt(0.16, 0.78), n1 = pt(0.96, 0.78);
  g.line(n0, U(n0, 8), WOOD, 0.8); g.line(n1, U(n1, 8), WOOD, 0.8);
  g.poly([U(n0, 7.6), U(n1, 7.6), U(n1, 2.2), U(n0, 2.2)], '#EDE6D2', { alpha: 0.35, stroke: '#8C7B5C', strokeWidth: 0.3, strokeAlpha: 0.7 });
  for (let k = 1; k < 4; k++) g.line(U(n0, 7.6 - k * 1.35), U(n1, 7.6 - k * 1.35), '#8C7B5C', 0.25, 0.6);
  const b = U(pt(1.37, 0.82), 2.8);
  g.ell(b, 2, 1.2, '#B08350', { outline: true });
  for (const dx of [-0.8, 0.6]) g.ell([b[0] + dx, b[1] - 0.7], 0.9, 0.35, '#CFE6EA');
  pennant(g, U(pt(0.1, 0.1), 8), 7, LEAF2);
}

// The side a wharf has its water on (the long side with more water along it): 's', 'n', 'e' or 'w'.
export function wharfSide(world, b) {
  const wet = (x, y) => inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.WATER;
  let a = 0, c = 0;
  if (b.w > b.d) { for (let x = b.x; x < b.x + b.w; x++) { if (wet(x, b.y + b.d)) a++; if (wet(x, b.y - 1)) c++; } return a >= c ? 's' : 'n'; }
  for (let y = b.y; y < b.y + b.d; y++) { if (wet(b.x + b.w, y)) a++; if (wet(b.x - 1, y)) c++; }
  return a >= c ? 'e' : 'w';
}

// ── Figures ──
// Mirrors a drawing about x = X (the left-facing slots).
function facing(g, X, left) {
  if (!left) return g;
  const f = (q) => [2 * X - q[0], q[1]];
  const segs = (list) => list.map((sg) => [sg[0], ...sg.slice(1).map(f)]);
  return {
    ...g, poly: (pts, ...r) => g.poly(pts.map(f), ...r), ell: (q, ...r) => g.ell(f(q), ...r), circ: (q, ...r) => g.circ(f(q), ...r),
    line: (a, b, ...r) => g.line(f(a), f(b), ...r), stroke: (sg, ...r) => g.stroke(segs(sg), ...r), path: (sg, ...r) => g.path(segs(sg), ...r),
  };
}
const at = (gx, gy) => { const c = p(gx, gy); return [c[0], c[1]]; };

// A gazelle: a tawny body with a pale belly and a dark flank stripe, four thin legs, a raised neck and head, and two curved horns.
export function gazelle(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y], 4.2, 1.1, SHADOW, { alpha: 0.25 });
  for (const [dx, c] of [[-2.8, '#A6753F'], [-1.6, '#B9884F'], [1.7, '#A6753F'], [2.9, '#B9884F']]) g.line([X + dx, Y - 0.2], [X + dx, Y - 3.8], c, 0.7);
  g.ell([X, Y - 5.2], 4.3, 1.9, '#C99A5E', { outline: true });
  g.ell([X, Y - 4.3], 3.4, 0.8, '#F1E2C2');
  g.line([X - 3.6, Y - 5.4], [X + 3.2, Y - 5.4], '#6B4A2E', 0.55, 0.85);                   // the flank stripe
  g.poly([[X + 3.2, Y - 6.4], [X + 4.4, Y - 7], [X + 5.4, Y - 10.4], [X + 4.2, Y - 10.6]], '#C99A5E', { outline: true });   // the neck
  g.ell([X + 5.2, Y - 10.8], 1.5, 1, '#C99A5E', { outline: true });                        // the head
  g.circ([X + 5.6, Y - 11], 0.3, '#2A1E16');
  g.stroke([['M', [X + 4.6, Y - 11.4]], ['Q', [X + 4, Y - 14.2], [X + 5.4, Y - 14.6]]], '#4A3A2E', 0.55);   // horns
  g.stroke([['M', [X + 5, Y - 11.5]], ['Q', [X + 4.6, Y - 14.2], [X + 6, Y - 14.4]]], '#4A3A2E', 0.55);
  g.poly([[X - 4.1, Y - 6.2], [X - 5, Y - 6.8], [X - 4.6, Y - 5.2]], '#F6EFE0');           // the white rump and tail
}

// An ostrich: a dark round body with a fan of white tail plumes, long pinkish legs, a very long pale neck and a small head with a yellow beak.
export function ostrich(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y], 4.6, 1.2, SHADOW, { alpha: 0.25 });
  g.line([X - 1.2, Y], [X - 0.8, Y - 7.2], '#C9A58E', 0.8);
  g.line([X + 1.4, Y], [X + 1.1, Y - 7.2], '#B58F78', 0.8);
  g.ell([X, Y - 9.4], 4.2, 3.1, '#3B3340', { outline: true });
  g.poly([[X - 3.6, Y - 10.8], [X - 6.4, Y - 12.6], [X - 6.2, Y - 8.6], [X - 3.4, Y - 8.4]], '#F4EEDD', { outline: true });   // the white tail plumes
  g.line([X - 4, Y - 9.8], [X - 5.8, Y - 10.6], '#D8CFB8', 0.35);
  g.poly([[X + 2.2, Y - 11.2], [X + 3.4, Y - 11.6], [X + 4.4, Y - 18.6], [X + 3.4, Y - 18.6]], '#E6BFA8', { outline: true });   // the neck
  g.ell([X + 4.2, Y - 19], 1.5, 1.1, '#E6BFA8', { outline: true });
  g.poly([[X + 5.4, Y - 19.2], [X + 7.2, Y - 18.8], [X + 5.4, Y - 18.4]], '#D9A640');
  g.circ([X + 4.6, Y - 19.3], 0.35, '#2A1E16');
}

// An ibis (stage 0) or one with its head down feeding (stage 1): white with a black head and a long curved black bill, dark legs.
export function ibis(g0, gx, gy, left = false, down = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y], 2.4, 0.7, SHADOW, { alpha: 0.2 });
  g.line([X - 0.4, Y], [X - 0.4, Y - 2.6], '#3A2E3A', 0.4); g.line([X + 0.5, Y], [X + 0.5, Y - 2.6], '#3A2E3A', 0.4);
  g.ell([X, Y - 3.8], 2.5, 1.5, '#FAF6EC', { outline: true });
  g.poly([[X - 2.2, Y - 4.4], [X - 3.4, Y - 4.8], [X - 2.4, Y - 3.4]], '#2A2230');         // black tail tips
  if (!down) {
    g.poly([[X + 1.4, Y - 4.6], [X + 2.2, Y - 4.8], [X + 2.2, Y - 6.8], [X + 1.4, Y - 6.8]], '#FAF6EC');
    g.circ([X + 2, Y - 7.2], 0.85, '#2A2230');
    g.stroke([['M', [X + 2.6, Y - 7.2]], ['Q', [X + 4.6, Y - 7.2], [X + 4.8, Y - 5.4]]], '#2A2230', 0.5);
  } else {
    g.poly([[X + 1.4, Y - 4.4], [X + 2.4, Y - 4.6], [X + 3, Y - 2.6], [X + 2.2, Y - 2.6]], '#FAF6EC');
    g.circ([X + 2.8, Y - 2.2], 0.8, '#2A2230');
    g.stroke([['M', [X + 3.4, Y - 2]], ['Q', [X + 5, Y - 1.4], [X + 5.2, Y - 0.2]]], '#2A2230', 0.5);
  }
}

// A heron: a tall grey-blue bird on long legs with an S-curved neck, a dark crest and a yellow dagger bill.
export function heron(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y], 2.6, 0.7, SHADOW, { alpha: 0.2 });
  g.line([X - 0.5, Y], [X - 0.4, Y - 5.8], '#B8A27A', 0.5); g.line([X + 0.6, Y], [X + 0.5, Y - 5.8], '#B8A27A', 0.5);
  g.ell([X, Y - 7.4], 2.7, 1.8, '#8FA3B8', { outline: true });
  g.poly([[X - 2.4, Y - 7.4], [X - 4.4, Y - 6.2], [X - 2.2, Y - 6]], '#6F8296');            // the folded wing tip
  g.stroke([['M', [X + 1.8, Y - 8.2]], ['Q', [X + 3.8, Y - 10.2], [X + 1.8, Y - 11.4]], ['Q', [X + 1, Y - 12.4], [X + 2.4, Y - 13.8]]], '#C9D3DD', 1);   // the S neck
  g.circ([X + 2.6, Y - 14.2], 0.9, '#C9D3DD');
  g.line([X + 2, Y - 14.8], [X - 0.6, Y - 16], '#2A2230', 0.4);                               // the crest
  g.poly([[X + 3.4, Y - 14.4], [X + 6.6, Y - 14], [X + 3.4, Y - 13.8]], GOLD);
}

// A hippo in the water: its back and head above a ring of ripples, small ears, two eyes and a pair of nostrils, the rest below.
export function hippo(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y], 8, 2.4, TERRAIN.foam, { alpha: 0.35 });
  g.ell([X, Y], 6.2, 1.6, TERRAIN.waterLight, { alpha: 0.4 });
  g.ell([X - 1.4, Y - 1.4], 5.4, 2.6, '#8C7E92', { outline: true });                        // the back
  g.ell([X - 1.4, Y - 2.8], 3.6, 0.9, '#A99BAE', { alpha: 0.7 });
  g.ell([X + 4.8, Y - 1.4], 2.8, 2, '#8C7E92', { outline: true });                          // the head
  g.ell([X + 6.4, Y - 0.8], 1.9, 1.2, '#A99BAE', { outline: true });                        // the muzzle
  g.circ([X + 7, Y - 1.1], 0.3, '#3A2E3A'); g.circ([X + 6.2, Y - 1.1], 0.3, '#3A2E3A');
  g.circ([X + 4.6, Y - 3.4], 0.8, '#8C7E92'); g.circ([X + 3.6, Y - 3.2], 0.7, '#8C7E92');  // the ears
  g.circ([X + 4.4, Y - 2.6], 0.4, '#2A2230');                                               // the eye
}

// A crocodile on the bank: a long low dark-green body with a ridge of bumps, a pale belly line, a long snout and a tapering tail.
export function croc(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y], 7.4, 1.4, SHADOW, { alpha: 0.25 });
  g.path([['M', [X - 8, Y - 0.6]], ['Q', [X - 4, Y - 2.8], [X + 1, Y - 2.4]], ['L', [X + 7.6, Y - 1.6]], ['L', [X + 8.4, Y - 0.8]], ['L', [X + 2, Y]], ['Q', [X - 4, Y + 0.4], [X - 8, Y - 0.6]], ['Z']], '#4E6B3A', { outline: true });
  for (let k = 0; k < 6; k++) g.circ([X - 5.4 + k * 1.8, Y - 2.2 - (k % 2) * 0.2], 0.5, '#3A5230');
  g.line([X - 4, Y - 0.5], [X + 5, Y - 0.2], '#B7C58A', 0.4, 0.8);
  g.circ([X + 5.4, Y - 2.3], 0.5, '#E2B13C'); g.circ([X + 5.4, Y - 2.3], 0.2, '#2A2230');   // the eye
  for (const dx of [-1.5, 2.4]) g.line([X + dx, Y - 0.6], [X + dx + 0.8, Y + 0.6], '#3A5230', 0.7);   // short legs
}

// A fish leaping (frame 0 rising, 1 at the top): a small silver fish with a tail fin over a ring of splash.
export function leap(g, gx, gy, frame = 0) {
  const [X, Y] = at(gx, gy), h = frame ? 5.4 : 3.2;
  g.ell([X, Y], 3.4, 1, TERRAIN.foam, { alpha: 0.7 });
  g.ell([X, Y], 2, 0.55, TERRAIN.waterLight, { alpha: 0.8 });
  g.ell([X, Y - h], 1.9, 0.8, '#CFE6EA', { outline: true });
  g.poly([[X - 1.7, Y - h], [X - 3, Y - h - 0.9], [X - 3, Y - h + 0.9]], '#B8D6DC');
  g.circ([X + 1.1, Y - h - 0.1], 0.25, '#2A2230');
}
// A ring of ripples spreading in place (the Gentle motion of a leap, and its splash): step 0-2, from small and strong to wide and faint.
export function splash(g, gx, gy, step = 0) {
  const [X, Y] = at(gx, gy), r = 2 + step * 1.8;
  g.ell([X, Y], r + 1.4, (r + 1.4) * 0.45, TERRAIN.foam, { alpha: 0.5 - step * 0.14 });
  g.ell([X, Y], r, r * 0.45, 'none', { stroke: TERRAIN.foam, strokeWidth: 0.7, strokeAlpha: 0.9 - step * 0.25 });
}

// A hunter: a walker in a white kilt and a teal collar with a long spear over his shoulder and a leather quiver, going out to the herds.
export function hunter(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy);
  const g = facing(g0, X, left);
  fig(left ? g : g0, gx, gy, 'citizen');                                // citizens carry nothing; the spear and the quiver are added
  g.line([X + 2.6, Y + 0.6], [X + 3.4, Y - 17], WOOD, 0.6);
  g.poly([[X + 3.4, Y - 19.2], [X + 4.2, Y - 16.6], [X + 2.6, Y - 16.6]], '#C3B8C6', { outline: true });
  g.poly([[X - 3.2, Y - 6], [X - 1.8, Y - 6.6], [X - 1, Y - 11.4], [X - 2.4, Y - 11]], '#8A4A2A', { outline: true });
}

// A reed skiff with a fisher standing in it, a pole and a line over the side: a curved hull with rising ends, bundles of reed along its sides.
export function boat(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y + 0.4], 8.6, 2.4, TERRAIN.foam, { alpha: 0.3 });
  g.path([['M', [X - 8.4, Y - 3]], ['Q', [X - 5, Y + 1.2], [X, Y + 1.2]], ['Q', [X + 5, Y + 1.2], [X + 8.4, Y - 3.4]], ['Q', [X + 4, Y - 1], [X, Y - 1]], ['Q', [X - 4, Y - 1], [X - 8.4, Y - 3]], ['Z']], '#C9A36B', { outline: true });
  g.line([X - 7.6, Y - 2.6], [X + 7.6, Y - 3], '#8D6A44', 0.5, 0.8);
  for (const dx of [-4, -1.5, 1.2, 3.8]) g.line([X + dx, Y + 0.4], [X + dx + 0.2, Y - 1.2], '#E2C27E', 0.5);    // reed lashings
  // the fisher, standing amidships
  g.line([X - 0.7, Y - 1], [X - 0.7, Y - 4.2], '#A0663F', 1); g.line([X + 0.7, Y - 1], [X + 0.7, Y - 4.2], '#A0663F', 1);
  g.poly([[X - 1.9, Y - 3.6], [X + 1.9, Y - 3.6], [X + 1.5, Y - 6.4], [X - 1.5, Y - 6.4]], '#F7F2E8', { outline: true });
  g.poly([[X - 1.5, Y - 6.3], [X + 1.5, Y - 6.3], [X + 1.7, Y - 9.2], [X - 1.7, Y - 9.2]], '#A0663F');
  g.line([X - 1.5, Y - 9], [X + 1.5, Y - 9], TEAL, 0.9);
  g.circ([X - 0.1, Y - 11], 1.7, '#1E150E'); g.circ([X + 0.3, Y - 10.6], 1.35, '#A0663F');
  g.line([X + 1.6, Y - 8.6], [X + 7.4, Y - 15], WOOD, 0.5);                                  // the pole
  g.line([X + 7.4, Y - 15], [X + 9.4, Y - 0.6], '#EDE6D2', 0.25);                            // the line
}

// ── The registry ──
const UNIT = (h = 16) => ({ w: 0, d: 0, height: h, bounds: [-14, -h - 12, 14, 8], shadows: [] });
const both = (name, draw, h) => ({ [`fig.${name}`]: { ...UNIT(h), draw: (g, x, y) => draw(g, x, y, false) }, [`fig.${name}_l`]: { ...UNIT(h), draw: (g, x, y) => draw(g, x, y, true) } });
const SIDE_ART = (side) => {
  const S = SIDES[side];
  return { w: S.w, d: S.d, height: 14, bounds: boundsFor(S.w, S.d, 14, 26), shadows: [[0.12, 0.08, 0.8, 0.5, 7]], draw: (g, x, y) => fishingWharf(g, x, y, side) };
};
export const RIVER_ART = {
  nilometer: { w: 1, d: 1, height: 28, bounds: boundsFor(1, 1, 28), shadows: [[0.12, 0.12, 0.76, 0.62, 3], [0.4, 0.4, 0.2, 0.2, 17]], draw: nilometer },
  hunting_lodge: { w: 2, d: 2, height: 17, bounds: boundsFor(2, 2, 17), shadows: [[0.1, 0.1, 1.3, 0.95, 10]], draw: (g, x, y) => huntingLodge(g, x, y, 0) },
  'hunting_lodge.g1': { w: 2, d: 2, height: 17, bounds: boundsFor(2, 2, 17), shadows: [[0.1, 0.1, 1.3, 0.95, 10]], draw: (g, x, y) => huntingLodge(g, x, y, 1) },
  fishing_wharf: SIDE_ART('s'),
  'fishing_wharf.s': SIDE_ART('s'), 'fishing_wharf.n': SIDE_ART('n'), 'fishing_wharf.e': SIDE_ART('e'), 'fishing_wharf.w': SIDE_ART('w'),
  ...both('gazelle', gazelle, 16), ...both('ostrich', ostrich, 24), ...both('ibis', ibis, 12), ...both('heron', heron, 20),
  ...both('hippo', hippo, 10), ...both('croc', croc, 8), ...both('hunter', hunter, 26), ...both('boat', boat, 20),
  'fig.ibis_d': { ...UNIT(12), draw: (g, x, y) => ibis(g, x, y, false, true) }, 'fig.ibis_dl': { ...UNIT(12), draw: (g, x, y) => ibis(g, x, y, true, true) },
  'fig.leap0': { ...UNIT(10), draw: (g, x, y) => leap(g, x, y, 0) }, 'fig.leap1': { ...UNIT(10), draw: (g, x, y) => leap(g, x, y, 1) },
  'fig.splash0': { ...UNIT(4), draw: (g, x, y) => splash(g, x, y, 0) }, 'fig.splash1': { ...UNIT(4), draw: (g, x, y) => splash(g, x, y, 1) },
  'fig.splash2': { ...UNIT(4), draw: (g, x, y) => splash(g, x, y, 2) },
};

// The slot a River building shows when it is not just its type: a wharf facing its water, a lodge with game hung while it works, else null.
export function riverSlot(b, world) {
  if (b.type === 'fishing_wharf') return world ? `fishing_wharf.${wharfSide(world, b)}` : null;
  if (b.type === 'hunting_lodge') return world && b.staff > 0 && !b.paused && !b.blocked ? 'hunting_lodge.g1' : null;
  return null;
}
