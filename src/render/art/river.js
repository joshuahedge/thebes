// Stage 4.6, the River track's art (rulings 334-335, 360-369): the nilometer, the hunting lodge and the fishing wharf, and the animals' and
// boat's figure slots (fig.gazelle, fig.ostrich, fig.ibis, fig.heron, fig.hippo, fig.croc, fig.leap, fig.splash0..2, fig.hunter,
// fig.boat), as registry entries (src/render/art/registry.js describes the shape). Joined into ART by src/render/art/s46.js.
//
// The house style: white-washed stone with teal accents and lavender shadows; mud-brick and thatch for the lodge, weathered planks for
// the wharf. Animals are told apart by shape (a gazelle's horns, an ostrich's long neck and white tail, an ibis's curved bill, a
// heron's long legs, a hippo's back and ears showing above the water, a crocodile's long ridged back), never by colour alone.
// Figures face right; `_l` slots face left (the same drawing mirrored), so a herd that steps the other way turns.
import { box, crs, qd, door, p, U, quad, hs, shadeWall, contactLine, silhouette, waterShadow } from './primitives.js';
import { contactShadow } from './nature.js';
import { pennant } from './services.js';
import { fig, footShadow } from './figures.js';

// Version 9.3 (Track N, ruling 1925): the river's buildings and animals at the bar: a soft shade down a wall's two faces.
const wallShade = (g, F, h) => {
  shadeWall(g, [F.L(0, 0), F.L(1, 0), F.L(1, h), F.L(0, h)], h);
  shadeWall(g, [F.R(0, 0), F.R(1, 0), F.R(1, h), F.R(0, h)], h);
};
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
  wallShade(g, P, 3); contactLine(g, [X + 0.12, Y + 0.12, 0.76, 0.62]);      // Version 9.3 (Track N): shaded walls, and the line where they meet the ground
  const C = box(g, gx - 0.1, gy - 0.1, 0.2, 0.2, 17, 3, STONE);
  wallShade(g, C, 17);
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
  wallShade(g, B, 7); silhouette(g, X + 0.1, Y + 0.1, 1.3, 0.95, 7); contactLine(g, [X + 0.1, Y + 0.1, 1.3, 0.95]);
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
  contactShadow(g, pt(0.46, 0.62), 9, 2.4, 5);                                          // Version 10.0 (Track Q, ruling 2142): the shed meets the bank in a contact shadow, and the pier's posts darken the water under them
  waterShadow(g, ...pt(1.4, 1.2), 9.5, 2.6);
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
// Version 10.0.1 (Track A, A.2, ruling 2377): `pose` is 'stand' (the drawing above), a walk frame 0-3 (the legs swing in diagonal pairs, a foot lifting as
// it comes forward, the body bobbing a touch; one cycle of four frames is WALK_CYCLE.gazelle tiles of ground, so the feet do not slide) or 'graze'
// (the head down at the grass, the horns swept forward). Each pose is its own sprite, baked once (fig.gazelle_w0 ... fig.gazelle_g, and _l).
export const WALK_CYCLE = { gazelle: 0.5, ostrich: 0.7 };   // tiles of ground one four-frame walk cycle covers
export function gazelle(g0, gx, gy, left = false, pose = 'stand') {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  const walk = typeof pose === 'number', graze = pose === 'graze', bob = walk && pose % 2 === 0 ? -0.35 : 0;   // the body rises a touch on the passing steps
  footShadow(g, X, Y, 1, 4.2, 0.2);
  // Version 10.0.1 (ruling 2388): the gazelle in profile. Legs thin and tapering, two under the chest and two under the haunch (not at the corners of a slab),
  // about 1.2 times as long as the torso is deep; the far pair lighter, a diagonal gait.
  const legs = [[-3.2, '#A87C48', 0], [-2.2, '#6E4A22', 0.5], [3.4, '#A87C48', 0.5], [2.5, '#6E4A22', 0]];
  for (const [dx, c, off] of legs) {
    const ph = walk ? ((pose / 4 + off) % 1) * Math.PI * 2 : 0, swing = walk ? Math.cos(ph) * 1.7 : 0, lift = walk ? Math.max(0, Math.sin(ph)) * 1.2 : 0;
    const hip = [X + dx, Y - 5.1 + bob], knee = [X + dx + 0.5 + swing * 0.45, Y - 2.7 - lift * 0.6], foot = [X + dx + swing, Y - 0.2 - lift];   // a thigh, a slimmer shank, the bend at the hock
    g.line(hip, knee, c, 0.95); g.line(knee, foot, c, 0.5);
  }
  const nb = (walk ? (pose % 2 === 0 ? -0.3 : 0.2) : 0) - 1.6;                              // the head nods with the stride
  // the neck first, rising in a curve from the top front of the torso (the torso's outline then closes over its foot)
  if (graze) g.path([['M', [X + 3, Y - 8.4 + bob]], ['Q', [X + 6.2, Y - 7.6], [X + 6.9, Y - 3.6]], ['L', [X + 5.7, Y - 2.9]], ['Q', [X + 4.8, Y - 6], [X + 2.6, Y - 6.6 + bob]], ['Z']], '#C99A5E', { outline: true });
  else g.path([['M', [X + 2.4, Y - 8.7 + bob]], ['Q', [X + 5, Y - 9.4], [X + 6.1, Y - 11 + nb]], ['L', [X + 4, Y - 11.2 + nb]], ['Q', [X + 3.7, Y - 8.4], [X + 4.2, Y - 6.2 + bob]], ['Z']], '#C99A5E', { outline: true });
  // the torso: one rounded bean, higher and deeper at the chest, tapering to the rump, every edge a curve; a tan back, a darker flank band, a white underside
  // and rump patch, and a short dark tail flick
  const body = [['M', [X - 4.4, Y - 6.4 + bob]], ['Q', [X - 4.6, Y - 8.4 + bob], [X - 1.6, Y - 8.7 + bob]], ['Q', [X + 1.8, Y - 9.1 + bob], [X + 3.6, Y - 8.4 + bob]], ['Q', [X + 5.3, Y - 7.5 + bob], [X + 4.4, Y - 5.7 + bob]],
    ['Q', [X + 3.8, Y - 4.5 + bob], [X + 2, Y - 4.8 + bob]], ['Q', [X - 0.4, Y - 5.7 + bob], [X - 2.6, Y - 4.7 + bob]], ['Q', [X - 4.7, Y - 4.5 + bob], [X - 4.4, Y - 6.4 + bob]], ['Z']];
  g.path(body, '#C99A5E', { outline: true });
  g.path([['M', [X + 4.3, Y - 5.8 + bob]], ['Q', [X + 3.8, Y - 4.5 + bob], [X + 2, Y - 4.8 + bob]], ['Q', [X - 0.4, Y - 5.7 + bob], [X - 2.6, Y - 4.7 + bob]], ['Q', [X - 4.2, Y - 4.6 + bob], [X - 4.5, Y - 5.6 + bob]], ['Q', [X - 0.2, Y - 6.2 + bob], [X + 4.3, Y - 5.8 + bob]], ['Z']], '#F6EFE0');   // the white underside
  g.stroke([['M', [X - 3.4, Y - 6.6 + bob]], ['Q', [X, Y - 7.3 + bob], [X + 3.6, Y - 6.6 + bob]]], '#7A4E28', 0.9, 0.85);   // the darker flank band
  g.ell([X - 4.1, Y - 6.9 + bob], 0.9, 1.1, '#F6EFE0');                                      // the white rump patch
  g.stroke([['M', [X - 4.6, Y - 7.6 + bob]], ['Q', [X - 6, Y - 7.2 + bob], [X - 6, Y - 6.2 + bob]]], '#3A2A1E', 0.6);   // the dark tail flick
  if (graze) {
    g.ell([X + 6.9, Y - 2.4], 1.5, 1, '#C99A5E', { outline: true });
    g.circ([X + 7.1, Y - 2.8], 0.3, '#2A1E16');
    g.stroke([['M', [X + 6.3, Y - 3.3]], ['Q', [X + 5.6, Y - 5.8], [X + 4.4, Y - 5.6]]], '#4A3A2E', 0.55);   // the horns swept back over the neck
    return;
  }
  g.ell([X + 5.2, Y - 10.8 + nb], 1.5, 1, '#C99A5E', { outline: true });                    // the head
  g.circ([X + 5.6, Y - 11 + nb], 0.3, '#2A1E16');
  g.stroke([['M', [X + 4.6, Y - 11.4 + nb]], ['Q', [X + 4, Y - 14.2 + nb], [X + 5.4, Y - 14.6 + nb]]], '#4A3A2E', 0.55);   // horns
  g.stroke([['M', [X + 5, Y - 11.5 + nb]], ['Q', [X + 4.6, Y - 14.2 + nb], [X + 6, Y - 14.4 + nb]]], '#4A3A2E', 0.55);
}

// An ostrich: a dark round body with a fan of white tail plumes, long pinkish legs, a very long pale neck and a small head with a yellow beak.
export function ostrich(g0, gx, gy, left = false, pose = 'stand') {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  const walk = typeof pose === 'number', graze = pose === 'graze', bob = walk && pose % 2 === 0 ? -0.5 : 0;
  footShadow(g, X, Y, 1, 4.6, 0.2);
  for (const [hx, c, off] of [[-1.2, '#C9A58E', 0], [1.4, '#B58F78', 0.5]]) {                // the long legs: a stride in each, the far one half a cycle on
    if (!walk) { g.line([X + hx, Y], [X + hx + 0.4, Y - 7.2], c, 0.8); continue; }
    const ph = ((pose / 4 + off) % 1) * Math.PI * 2, swing = Math.cos(ph) * 2.6, lift = Math.max(0, Math.sin(ph)) * 1.8;
    g.line([X + hx + 0.4, Y - 7.2 + bob], [X + hx + swing, Y - lift], c, 0.8);
  }
  g.ell([X, Y - 9.4 + bob], 4.2, 3.1, '#3B3340', { outline: true });
  g.poly([[X - 3.6, Y - 10.8 + bob], [X - 6.4, Y - 12.6 + bob], [X - 6.2, Y - 8.6 + bob], [X - 3.4, Y - 8.4 + bob]], '#F4EEDD', { outline: true });   // the white tail plumes
  g.line([X - 4, Y - 9.8 + bob], [X - 5.8, Y - 10.6 + bob], '#D8CFB8', 0.35);
  if (graze) {                                                                               // pecking at the ground: the neck swung down and forward
    g.poly([[X + 2.2, Y - 11 + bob], [X + 3.4, Y - 11.4 + bob], [X + 7.4, Y - 4.6], [X + 6.2, Y - 4.2]], '#E6BFA8', { outline: true });
    g.ell([X + 7.6, Y - 3.6], 1.5, 1.1, '#E6BFA8', { outline: true });
    g.poly([[X + 8.6, Y - 3.9], [X + 10.2, Y - 3], [X + 8.6, Y - 2.8]], '#D9A640');
    g.circ([X + 7.9, Y - 4], 0.35, '#2A1E16');
    return;
  }
  const nb = walk ? (pose % 2 === 0 ? -0.3 : 0.3) : 0;
  g.poly([[X + 2.2, Y - 11.2 + bob], [X + 3.4, Y - 11.6 + bob], [X + 4.4, Y - 18.6 + nb], [X + 3.4, Y - 18.6 + nb]], '#E6BFA8', { outline: true });   // the neck
  g.ell([X + 4.2, Y - 19 + nb], 1.5, 1.1, '#E6BFA8', { outline: true });
  g.poly([[X + 5.4, Y - 19.2 + nb], [X + 7.2, Y - 18.8 + nb], [X + 5.4, Y - 18.4 + nb]], '#D9A640');
  g.circ([X + 4.6, Y - 19.3 + nb], 0.35, '#2A1E16');
}

// An ibis (stage 0) or one with its head down feeding (stage 1): white with a black head and a long curved black bill, dark legs.
export function ibis(g0, gx, gy, left = false, down = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  footShadow(g, X, Y, 1, 2.4, 0.2);                                                         // Version 10.0 (Track Q, ruling 2142): the foot shadow, with its contact patch
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
  footShadow(g, X, Y, 1, 2.6, 0.2);                                                         // Version 10.0 (Track Q, ruling 2142): the foot shadow, with its contact patch
  g.line([X - 0.5, Y], [X - 0.4, Y - 5.8], '#B8A27A', 0.5); g.line([X + 0.6, Y], [X + 0.5, Y - 5.8], '#B8A27A', 0.5);
  g.ell([X, Y - 7.4], 2.7, 1.8, '#8FA3B8', { outline: true });
  g.poly([[X - 2.4, Y - 7.4], [X - 4.4, Y - 6.2], [X - 2.2, Y - 6]], '#6F8296');            // the folded wing tip
  g.stroke([['M', [X + 1.8, Y - 8.2]], ['Q', [X + 3.8, Y - 10.2], [X + 1.8, Y - 11.4]], ['Q', [X + 1, Y - 12.4], [X + 2.4, Y - 13.8]]], '#C9D3DD', 1);   // the S neck
  g.circ([X + 2.6, Y - 14.2], 0.9, '#C9D3DD');
  g.line([X + 2, Y - 14.8], [X - 0.6, Y - 16], '#2A2230', 0.4);                               // the crest
  g.poly([[X + 3.4, Y - 14.4], [X + 6.6, Y - 14], [X + 3.4, Y - 13.8]], GOLD);
}

// Version 10.0.1 (Track A, A.2, ruling 2378): a bird's take-off and landing, one sprite a frame, baked once. mode: 'o' the wings opened on the ground (the
// last thing before it lifts, and the first on landing), 'u' a flap's top (wings up, the feet trailing, the neck drawn in), 'd' a flap's bottom (wings
// down), 'f' the wings coming in (a landing's fold, the tip still out). The flight frames carry no foot shadow (the sprite is lifted off the ground).
const wing = (g, pts, col, tip) => {                                                          // a rounded wing: the leading edge curved out to the tip, the trailing edge back in
  const [a, b, c, d, e] = pts;
  g.path(e ? [['M', a], ['Q', b, c], ['Q', d, e], ['Z']] : [['M', a], ['Q', b, c], ['L', d], ['Z']], col, { outline: true });
  g.line(c, e || d, tip, 0.55, 0.9);                                                          // the long flight feathers along the wing's end
  if (e) g.line([(c[0] + e[0]) / 2, (c[1] + e[1]) / 2 - 0.3], [(d[0] + a[0]) / 2, (d[1] + a[1]) / 2], tip, 0.35, 0.55);
};
export function heronFly(g0, gx, gy, left = false, mode = 'o') {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left), flying = mode === 'u' || mode === 'd';
  if (!flying) footShadow(g, X, Y, 1, 2.6, 0.2);
  const S = [X - 0.3, Y - 8.2];
  const far = { o: [[X + 0.2, Y - 8.4], [X + 1.6, Y - 14.6], [X + 4.8, Y - 13.4], [X + 3.2, Y - 8.8]], f: [[X + 0.2, Y - 8.4], [X + 1.4, Y - 11.4], [X + 3.6, Y - 10.6], [X + 2.6, Y - 8.4]],
    u: [[X + 0.4, Y - 8.4], [X + 2.2, Y - 17.4], [X + 5.2, Y - 15.6], [X + 3.6, Y - 9]], d: [[X + 0.4, Y - 8], [X + 2.2, Y - 2.2], [X + 5.6, Y - 3.8], [X + 3.4, Y - 8]] }[mode];
  const near = { o: [S, [X - 1.4, Y - 14.6], [X - 6.6, Y - 13.4], [X - 7.4, Y - 9.8], [X - 3.6, Y - 6.8]], f: [S, [X - 2.4, Y - 11.6], [X - 6.8, Y - 10.2], [X - 6.6, Y - 6.8], [X - 3, Y - 6.2]],
    u: [S, [X - 0.8, Y - 17.8], [X - 5.4, Y - 16.8], [X - 7.8, Y - 11.4], [X - 3.4, Y - 7.4]], d: [S, [X - 1.2, Y - 1.4], [X - 6.2, Y - 3.4], [X - 8, Y - 7.6], [X - 3.2, Y - 7.6]] }[mode];
  if (flying) {                                                                               // the long legs trail behind
    g.line([X - 1.6, Y - 6.6], [X - 8.2, Y - 5.8], '#B8A27A', 0.5); g.line([X - 1.2, Y - 6.2], [X - 8, Y - 5.2], '#B8A27A', 0.5);
  } else {
    g.line([X - 0.5, Y], [X - 0.4, Y - 5.8], '#B8A27A', 0.5); g.line([X + 0.6, Y], [X + 0.5, Y - 5.8], '#B8A27A', 0.5);
  }
  wing(g, far, '#A7B5C4', '#7C8EA2');
  g.ell([X, Y - 7.4], 2.7, 1.8, '#8FA3B8', { outline: true });
  if (flying) {                                                                               // the neck folded back on itself, the dagger bill forward
    g.stroke([['M', [X + 1.8, Y - 8]], ['Q', [X + 3.4, Y - 9.2], [X + 3, Y - 10.6]]], '#C9D3DD', 1);
    g.circ([X + 3.4, Y - 11], 0.9, '#C9D3DD');
    g.poly([[X + 4.2, Y - 11.2], [X + 7.6, Y - 10.8], [X + 4.2, Y - 10.4]], GOLD);
  } else {
    g.stroke([['M', [X + 1.8, Y - 8.2]], ['Q', [X + 3.8, Y - 10.2], [X + 1.8, Y - 11.4]], ['Q', [X + 1, Y - 12.4], [X + 2.4, Y - 13.8]]], '#C9D3DD', 1);
    g.circ([X + 2.6, Y - 14.2], 0.9, '#C9D3DD');
    g.line([X + 2, Y - 14.8], [X - 0.6, Y - 16], '#2A2230', 0.4);
    g.poly([[X + 3.4, Y - 14.4], [X + 6.6, Y - 14], [X + 3.4, Y - 13.8]], GOLD);
  }
  wing(g, near, '#8FA3B8', '#5E7288');
}
export function ibisFly(g0, gx, gy, left = false, mode = 'o') {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left), flying = mode === 'u' || mode === 'd';
  if (!flying) footShadow(g, X, Y, 1, 2.4, 0.2);
  const S = [X - 0.2, Y - 4.6];
  const far = { o: [[X + 0.2, Y - 4.8], [X + 1, Y - 8.8], [X + 3, Y - 8], [X + 2, Y - 5]], f: [[X + 0.2, Y - 4.8], [X + 0.8, Y - 7], [X + 2.2, Y - 6.4], [X + 1.6, Y - 4.8]],
    u: [[X + 0.3, Y - 4.8], [X + 1.4, Y - 10.4], [X + 3.4, Y - 9.2], [X + 2.2, Y - 5.2]], d: [[X + 0.3, Y - 4.6], [X + 1.4, Y - 0.4], [X + 3.6, Y - 1.6], [X + 2.2, Y - 4.6]] }[mode];
  const near = { o: [S, [X - 0.8, Y - 8.8], [X - 4, Y - 8], [X - 4.6, Y - 5.6], [X - 2.2, Y - 3.8]], f: [S, [X - 1.4, Y - 6.8], [X - 4.2, Y - 6], [X - 4, Y - 4], [X - 1.8, Y - 3.6]],
    u: [S, [X - 0.6, Y - 10.6], [X - 3.4, Y - 9.8], [X - 4.8, Y - 6.6], [X - 2.2, Y - 4.2]], d: [S, [X - 0.8, Y - 0.2], [X - 3.8, Y - 1.6], [X - 4.8, Y - 4.4], [X - 2, Y - 4.4]] }[mode];
  if (flying) { g.line([X - 1, Y - 3.4], [X - 4.6, Y - 3], '#3A2E3A', 0.4); g.line([X - 0.6, Y - 3], [X - 4.4, Y - 2.4], '#3A2E3A', 0.4); }
  else { g.line([X - 0.4, Y], [X - 0.4, Y - 2.6], '#3A2E3A', 0.4); g.line([X + 0.5, Y], [X + 0.5, Y - 2.6], '#3A2E3A', 0.4); }
  wing(g, far, '#E4DFD2', '#4A4252');
  g.ell([X, Y - 3.8], 2.5, 1.5, '#FAF6EC', { outline: true });
  g.poly([[X - 2.2, Y - 4.4], [X - 3.4, Y - 4.8], [X - 2.4, Y - 3.4]], '#2A2230');
  g.poly([[X + 1.4, Y - 4.4], [X + 2.2, Y - 4.6], [X + 2.2, Y - 5.8], [X + 1.4, Y - 5.8]], '#FAF6EC');   // the neck, out and level in flight, up on the ground
  g.circ([X + 2.4, Y - 6], 0.85, '#2A2230');
  g.stroke([['M', [X + 3, Y - 6]], ['Q', [X + 4.8, Y - 5.9], [X + 5, Y - 4.4]]], '#2A2230', 0.5);
  wing(g, near, '#FAF6EC', '#2A2230');
}

// A hippo in the water: its back and head above a ring of ripples, small ears, two eyes and a pair of nostrils, the rest below. `flick` (Version 10.0.1,
// Track A, A.2, ruling 2379): the ears folded back and a puff of spray at the nostrils, the other frame of a surfaced hippo's flick.
export function hippo(g0, gx, gy, left = false, flick = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  waterShadow(g, X, Y, 7.4, 2.2);                                                           // Version 10.0 (Track Q, ruling 2142): the dark of the water under the animal, under its ring of foam
  g.ell([X, Y], 8, 2.4, TERRAIN.foam, { alpha: 0.35 });
  g.ell([X, Y], 6.2, 1.6, TERRAIN.waterLight, { alpha: 0.4 });
  g.ell([X - 1.4, Y - 1.4], 5.4, 2.6, '#8C7E92', { outline: true });                        // the back
  g.ell([X - 1.4, Y - 2.8], 3.6, 0.9, '#A99BAE', { alpha: 0.7 });
  g.ell([X + 4.8, Y - 1.4], 2.8, 2, '#8C7E92', { outline: true });                          // the head
  g.ell([X + 6.4, Y - 0.8], 1.9, 1.2, '#A99BAE', { outline: true });                        // the muzzle
  g.circ([X + 7, Y - 1.1], 0.3, '#3A2E3A'); g.circ([X + 6.2, Y - 1.1], 0.3, '#3A2E3A');
  if (flick) {
    g.ell([X + 4.1, Y - 3.1], 1.1, 0.5, '#8C7E92'); g.ell([X + 3.1, Y - 3], 1, 0.45, '#8C7E92');   // the ears laid back
    for (const [dx, dy, r] of [[7.6, -3, 0.5], [8.7, -3.9, 0.4], [9.4, -2.6, 0.35], [8.2, -2.2, 0.3]]) g.circ([X + dx, Y + dy], r, TERRAIN.foam, { alpha: 0.9 });   // the puff of spray
  } else { g.circ([X + 4.6, Y - 3.4], 0.8, '#8C7E92'); g.circ([X + 3.6, Y - 3.2], 0.7, '#8C7E92'); }   // the ears
  g.circ([X + 4.4, Y - 2.6], 0.4, '#2A2230');                                               // the eye
}

// A crocodile on the bank: a long low dark-green body with a ridge of bumps, a pale belly line, a long snout and a tapering tail.
// Version 10.0.1 (Track A, A.2, ruling 2379): `tail` -1, 0 or 1 swings the tail's tip down, along or up (a basking crocodile's slow sway: 0, 1, 0, -1).
export function croc(g0, gx, gy, left = false, tail = 0) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  footShadow(g, X, Y, 1, 7.4, 0.22);
  g.path([['M', [X - 8 + 0.4 * Math.abs(tail), Y - 0.6 - 1.5 * tail]], ['Q', [X - 4, Y - 2.8 - 0.4 * tail], [X + 1, Y - 2.4]], ['L', [X + 7.6, Y - 1.6]], ['L', [X + 8.4, Y - 0.8]], ['L', [X + 2, Y]], ['Q', [X - 4, Y + 0.4 - 0.5 * tail], [X - 8 + 0.4 * Math.abs(tail), Y - 0.6 - 1.5 * tail]], ['Z']], '#4E6B3A', { outline: true });
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
  waterShadow(g, X, Y + 0.6, 8.6);                                                          // Version 10.0 (Track Q, ruling 2142): the dark of the water under the hull
  g.ell([X, Y + 0.4], 8.6, 2.4, TERRAIN.foam, { alpha: 0.3 });
  g.path([['M', [X - 8.4, Y - 3]], ['Q', [X - 5, Y + 1.2], [X, Y + 1.2]], ['Q', [X + 5, Y + 1.2], [X + 8.4, Y - 3.4]], ['Q', [X + 4, Y - 1], [X, Y - 1]], ['Q', [X - 4, Y - 1], [X - 8.4, Y - 3]], ['Z']], '#C9A36B', { outline: true });
  g.path([['M', [X - 8, Y - 2.4]], ['Q', [X - 5, Y + 1], [X, Y + 1]], ['Q', [X + 5, Y + 1], [X + 8.2, Y - 2.6]], ['Q', [X + 4, Y - 0.2], [X, Y - 0.2]], ['Q', [X - 4, Y - 0.2], [X - 8, Y - 2.4]], ['Z']], '#8D6A44', { alpha: 0.55 });   // Version 9.3 (Track N): the hull's shaded strake, its lit gunwale and the dark water under it
  g.stroke([['M', [X - 8.2, Y - 3]], ['Q', [X - 4, Y - 1.2], [X, Y - 1.2]], ['Q', [X + 4, Y - 1.2], [X + 8.4, Y - 3.4]]], '#F3DDB0', 0.5, 0.8);
  g.stroke([['M', [X - 7, Y + 1.8]], ['Q', [X, Y + 3], [X + 7, Y + 1.8]]], '#1E6A7C', 1, 0.35);
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

// Version 10.0.1 (Track A, A.2, ruling 2380): river life's crocodile (the one on the bank in Shemu, riverLife.js), drawn as figures.js's crocodile is but with the
// tail swinging (tail -1, 0 or 1) and the slide in three stages: 1 the snout in a ring of water, 2 the forebody sinking, 3 only the back, the eye and the
// tail's tip above the water. Left-facing copies are drawn mirrored here (the kinds have no walk slots to mirror).
const CROC = ['#6E7A44', '#525C32', '#8E9A5A'];
export function crocLife(g0, gx, gy, left = false, tail = 0, slide = 0) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left), sink = slide >= 2 ? (slide - 1) * 0.9 : 0;
  footShadow(g, X, Y, 1, 6.2, slide ? 0.1 : 0.16);
  if (slide < 3) for (const lx of [-2.6, 2.4]) {
    g.line([X + lx, Y - 0.8], [X + lx - 0.8, Y + 0.4], CROC[1], 0.8);
    g.line([X + lx + 0.6, Y - 0.8], [X + lx + 1.4, Y + 0.3], CROC[0], 0.8);
  }
  const tip = [X - 9 + 0.4 * Math.abs(tail), Y - 0.6 - 1.6 * tail], head = slide ? 0.4 - sink : 0;
  g.poly([tip, [X - 4, Y - 2.2], [X + 2, Y - 2.4 + sink * 0.5], [X + 5, Y - 1.8 + sink], [X + 9, Y - 1 + head + sink], [X + 9, Y - 0.3 + head + sink], [X + 4, Y - 0.4], [X - 4, Y - 0.4]], CROC[0], { outline: true });
  g.poly([[X - 6, Y - 0.5], [X + 5, Y - 0.5], [X + 5, Y - 1], [X - 6, Y - 1.1]], CROC[1], { alpha: 0.7 });
  g.line([X - 6, Y - 1.6], [X + 4, Y - 2 + sink * 0.5], CROC[2], 0.6, 0.9);
  for (let i = 0; i < 4; i++) g.line([X - 5 + 2.2 * i, Y - 2], [X - 4.4 + 2.2 * i, Y - 2.6], CROC[1], 0.5);
  g.circ([X + 5.6, Y - 2.1 + sink], 0.5, CROC[2], { outline: true });
  if (slide) {                                                                                // the water closing over it, further each stage
    const cx = [7.4, 6, 2.6][slide - 1], rx = [3.4, 5.6, 9][slide - 1], ry = [1.1, 1.5, 2.2][slide - 1];
    g.ell([X + cx, Y - 0.4], rx, ry, '#7FC6D8', { alpha: slide === 3 ? 0.82 : 0.75 });
    g.stroke([['M', [X + cx - rx + 0.4, Y + 0.2]], ['Q', [X + cx, Y + 0.2 + ry * 1.4], [X + cx + rx - 0.4, Y + 0.2]]], '#E6F4F7', 0.5, 0.9);
    if (slide === 3) { g.circ([X + 5.6, Y - 2.1 + sink], 0.5, CROC[2], { outline: true }); g.line([X - 5, Y - 2.2], [X + 0.4, Y - 2.4], CROC[1], 0.7); }
  }
}

// ── The registry ──
const UNIT = (h = 16) => ({ w: 0, d: 0, height: h, bounds: [-14, -h - 12, 14, 8], shadows: [] });
const both = (name, draw, h) => ({ [`fig.${name}`]: { ...UNIT(h), draw: (g, x, y) => draw(g, x, y, false) }, [`fig.${name}_l`]: { ...UNIT(h), draw: (g, x, y) => draw(g, x, y, true) } });
// The poses of one animal: fig.<name>_<key> and fig.<name>_<key>_l for each key of `table` (key -> the pose argument its drawing takes).
const poses = (name, draw, h, table) => Object.assign({}, ...Object.entries(table).map(([key, arg]) => both(`${name}_${key}`, (g, x, y, left) => draw(g, x, y, left, arg), h)));
const croc2 = (name, tail, slide) => both(name, (g, x, y, left) => crocLife(g, x, y, left, tail, slide), 8);
const SIDE_ART = (side) => {
  const S = SIDES[side];
  return { w: S.w, d: S.d, height: 14, bounds: boundsFor(S.w, S.d, 14, 26), shadows: [[0.12, 0.08, 0.8, 0.5, 7]], draw: (g, x, y) => fishingWharf(g, x, y, side) };
};
// Version 10.0.1 (ruling 2384): the registry is built from PARTS, so a test can prove no slot is defined twice (a later part used to overwrite an earlier one
// silently: the flap frames' ibis_d replaced the feeding ibis).
export const RIVER_ART_PARTS = [{
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
}, {
  // Version 10.0.1 (Track A, A.2, rulings 2377-2380): the walk, graze, take-off, flick, sway and slide frames, each a sprite baked once on first sight.
  ...poses('gazelle', gazelle, 16, { w0: 0, w1: 1, w2: 2, w3: 3, g: 'graze' }),
}, poses('ostrich', ostrich, 24, { w0: 0, w1: 1, w2: 2, w3: 3, g: 'graze' }),
poses('heron', heronFly, 20, { o: 'o', fu: 'u', fd: 'd', f: 'f' }), poses('ibis', ibisFly, 12, { o: 'o', fu: 'u', fd: 'd', f: 'f' }),   // fu, fd: the flap frames (not u, d: ibis_d is the feeding ibis)
poses('hippo', hippo, 10, { e: true }), poses('croc', croc, 8, { t1: 1, t2: -1 }),
croc2('crocodile_t1', 1, 0), croc2('crocodile_t2', -1, 0), croc2('crocodile_slide2', 0, 2), croc2('crocodile_slide3', 0, 3),
];
export const RIVER_ART = Object.assign({}, ...RIVER_ART_PARTS);

// The slot a River building shows when it is not just its type: a wharf facing its water, a lodge with game hung while it works, else null.
export function riverSlot(b, world) {
  if (b.type === 'fishing_wharf') return world ? `fishing_wharf.${wharfSide(world, b)}` : null;
  if (b.type === 'hunting_lodge') return world && b.staff > 0 && !b.paused && !b.blocked ? 'hunting_lodge.g1' : null;
  return null;
}
