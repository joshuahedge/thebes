// Stage 3 art (spec 5.3, 5.4): the firehouse with its red emblem, rubble (a heap of broken mudbrick, unlike the bare pad
// of an empty plot), the tower, the barracks, and the wall pieces. Walls are a tile layer (world.wall): the map draws
// them as a continuous mudbrick band from wallPiece, gatePiece and breachPiece (src/render/terrainWalls.js), and the
// 'wall' and 'gate' slots are what their card and the gate's picture show, built from the same pieces.
import { box, tb, qd, crs, door, win, parapet, pots, awn, p, U, quad, hs } from './primitives.js';
import { pennant } from './services.js';
import {
  WASH, WASH2, MUD, MUD2, STONE, RED, RED_DARK, TEAL, GOLD, WOOD, DOOR, INK, SHADOW, TERRAIN,
} from './palette.js';
import { boundsFor } from '../iso.js';

export const FIREHOUSE_EMBLEM = RED;      // spec 5.3: the firehouse's emblem matches its card (red)
export const DEFENCE_EMBLEM = RED_DARK;   // the Defence category's tint (CATEGORY_TINT.defence in data/ui.js)
const BUCKET = '#8A4A2A';
const SHIELD = TEAL, SHIELD_BOSS = GOLD;
const TIMBER = ['#8C6A4E', '#7A5A42', '#5E4636'];

// Firehouse (1x1): a whitewashed station with a red band under its parapet, a wide door with leather buckets hung beside
// it, a lookout on the roof under a red awning, water jars and a trough, and a red pennant.
export function firehouse(g, x, y) {
  g.poly(quad(x + 0.08, y + 0.74, 0.7, 0.2, 0), '#E9D9B4');                  // the swept apron in front of the door
  const F = box(g, x + 0.12, y + 0.12, 0.66, 0.6, 11, 0, WASH);
  parapet(g, x + 0.12, y + 0.12, 0.66, 0.6, 11);
  qd(g, F.L, 0, 1, 8.6, 9.8, RED);
  qd(g, F.R, 0, 1, 8.6, 9.8, RED_DARK);
  door(g, F, 0.24, 0.58, 6.6);                                                  // the wide door the crew runs out of
  win(g, F.R, 0.36, 0.64, 4.6, 6.8);
  for (const u of [0.7, 0.86]) {                                                // leather buckets on pegs beside the door
    const q = F.L(u, 6.6);
    g.line(q, [q[0], q[1] + 1], WOOD, 0.4);
    g.poly([[q[0] - 1.1, q[1] + 1], [q[0] + 1.1, q[1] + 1], [q[0] + 0.8, q[1] + 3.4], [q[0] - 0.8, q[1] + 3.4]], BUCKET, { outline: true });
  }
  const Lk = box(g, x + 0.2, y + 0.18, 0.26, 0.26, 2.6, 11, WASH2);            // the lookout on the roof
  qd(g, Lk.L, 0.3, 0.7, 0.6, 2.2, DOOR);
  awn(g, x + 0.17, y + 0.15, 0.32, 0.32, 17.4, RED, RED_DARK, '#F6ECD6');
  const T = box(g, x + 0.82, y + 0.2, 0.12, 0.46, 2.2, 0, STONE, 0);            // the trough, full
  g.poly(quad(x + 0.84, y + 0.23, 0.08, 0.4, 2.2), TERRAIN.water);
  qd(g, T.L, 0, 1, 1.4, 1.8, '#A89AA8', { alpha: 0.6 });
  pots(g, p(x + 0.38, y + 0.86), 3);                                            // water jars ready by the door
  pennant(g, U(p(x + 0.76, y + 0.14), 11), 7, FIREHOUSE_EMBLEM);
}

// Rubble: a burned building's broken mudbrick (spec 4.12, 5.4): a soot stain, a jagged stub of wall at the back, a low
// heap of broken brick with chunks on it, loose bricks and a charred beam. An empty plot is a bare pad; rubble is a
// raised heap. Three variants (by id, registry.js), the second mirrored and the third shifted, so a burned 2x2 does not
// show four copies of one heap.
const BRICK = ['#D9B27C', '#C49A62', '#9C8070'];
const HEAP = ['#D2AA74', '#BE965F', '#A2805E'];
const BURNT = '#4A3A36';

export function rubble(g, x, y, v = 0) {
  const flip = v === 1, shift = v === 2 ? 0.08 : 0;
  const at = (u, w2) => (flip ? [x + w2, y + u] : [x + u + shift, y + w2 - shift]);
  const P = (u, w2, z = 0) => { const [a, b] = at(u, w2); return U(p(a, b), z); };
  const bx = (u, w2, w, d, h, z, C) => { const [a, b] = at(u, w2); box(g, a, b, flip ? d : w, flip ? w : d, h, z, C, 0); };
  const c = P(0.5, 0.52);
  g.radial([c[0] + 1, c[1] + 0.6], 13, 6, '#7E6A5E', 0.3);                       // soot and dust on the ground
  const steps = [[0.14, 4.8], [0.3, 3.2], [0.42, 4.2], [0.56, 2.2]];              // the stub of the old wall, broken in steps
  for (const [u, h] of steps) bx(u, 0.18, 0.14, 0.14, h + (v === 2 ? -0.8 : 0), 0, MUD2);
  g.line(P(0.15, 0.32, 2.6), P(0.66, 0.32, 1.4), BURNT, 0.6, 0.55);                 // scorch along its foot
  const ring = [[0.2, 0.66], [0.3, 0.44], [0.52, 0.38], [0.74, 0.46], [0.84, 0.66], [0.66, 0.86], [0.38, 0.84]];
  g.poly(ring.map(([u, w2]) => P(u, w2, 0)), HEAP[2], { outline: true });          // the heap's footing in shade
  g.poly(ring.map(([u, w2]) => { const d = Math.hypot(u - 0.52, w2 - 0.64); return P(u + (0.52 - u) * 0.2, w2 + (0.64 - w2) * 0.2, 2.6 - d * 3); }), HEAP[1]);
  g.poly([P(0.36, 0.56, 3.2), P(0.52, 0.5, 3.8), P(0.66, 0.58, 3.2), P(0.52, 0.7, 2.6)], HEAP[0]);
  const chunks = [[0.32, 0.6, 0.14, 0.1, 1.4, 2.2], [0.5, 0.52, 0.12, 0.12, 1.6, 2.8], [0.62, 0.66, 0.1, 0.14, 1.2, 1.8], [0.42, 0.72, 0.12, 0.08, 1, 1.4]];
  for (const [u, w2, w, d, h, z] of chunks) bx(u, w2, w, d, h, z, BRICK);
  g.line(P(0.24, 0.78, 1), P(0.72, 0.5, 3.8), BURNT, 1.1);                       // a charred roof beam across the heap
  g.line(P(0.25, 0.78, 1.4), P(0.71, 0.5, 4.2), '#7A6058', 0.4, 0.8);
  const loose = [[0.1, 0.8, 0.09, 0.11], [0.84, 0.8, 0.12, 0.08], [0.86, 0.3, 0.09, 0.12], [0.62, 0.16, 0.12, 0.08]];
  loose.forEach(([u, w2, w, d], i) => { const j = (hs(v, i, 3) - 0.5) * 0.08; bx(u + j, w2 - j, w, d, 1.3, 0, BRICK); });
}

// Tower (1x1): a tapering mudbrick tower with arrow slits, a teal shield on its lit face, a fighting platform with
// merlons, and a pennant in the Defence colour.
export function tower(g, x, y) {
  const F = tb(g, x + 0.2, y + 0.2, 0.6, 0.6, 22, 0, 0.05, MUD2);
  crs(g, F, 22, '#9A7A5A', 3);
  door(g, F, 0.38, 0.62, 5.2);
  qd(g, F.L, 0.46, 0.54, 13, 17, DOOR);
  qd(g, F.R, 0.46, 0.54, 13, 17, DOOR);
  const s = F.L(0.5, 9.6);                                                       // the shield painted on the lit face
  g.ell(s, 2.4, 2.6, SHIELD, { outline: true });
  g.circ(s, 0.8, SHIELD_BOSS);
  box(g, x + 0.2, y + 0.2, 0.6, 0.6, 1.6, 22, MUD);                              // the platform's ledge
  const z = 23.6, m = 0.12, at = [0, 0.24, 0.48];
  for (const u of at) box(g, x + 0.2 + u, y + 0.2, m, m, 2.6, z, MUD2);          // merlons, back row first
  for (const u of at.slice(1)) box(g, x + 0.2, y + 0.2 + u, m, m, 2.6, z, MUD2);
  pennant(g, U(p(x + 0.42, y + 0.42), z), 7, DEFENCE_EMBLEM);
  for (const u of at.slice(1)) box(g, x + 0.68, y + 0.2 + u, m, m, 2.6, z, MUD2);
  for (const u of at) box(g, x + 0.2 + u, y + 0.68, m, m, 2.6, z, MUD2);
}

// Barracks (2x2): a mudbrick barrack block along the back with shields hung on its lit face, an armoury at the side, a
// drill yard of packed sand in front with a spear rack and a straw target, a low enclosure wall with an opening, and a
// pennant in the Defence colour. Soldiers waiting at the barracks stand in the yard (render/units.js).
export function barracks(g, X, Y) {
  g.poly(quad(X + 0.06, Y + 0.06, 1.88, 1.88, 0), '#E8D3A6', { outline: true });  // the drill yard
  for (let i = 0; i < 6; i++) g.circ(p(X + 0.3 + hs(i, 1, 5) * 1.4, Y + 0.9 + hs(i, 2, 5) * 0.9), 0.6, TERRAIN.dotDark, { alpha: 0.6 });
  box(g, X + 0.06, Y + 0.06, 0.06, 1.88, 2.6, 0, MUD2);                          // the enclosure's back left side
  const B = box(g, X + 0.12, Y + 0.12, 1.76, 0.66, 11, 0, MUD2);                 // the barrack block
  crs(g, B, 11, '#9A7A5A', 3);
  parapet(g, X + 0.12, Y + 0.12, 1.76, 0.66, 11);
  qd(g, B.L, 0, 1, 9, 10.2, DEFENCE_EMBLEM);
  qd(g, B.R, 0, 1, 9, 10.2, '#7A2E26');
  door(g, B, 0.46, 0.56, 6.6);
  for (const u of [0.12, 0.3, 0.7, 0.88]) qd(g, B.L, u, u + 0.03, 4.6, 7.6, DOOR);
  for (const u of [0.21, 0.38, 0.63, 0.8]) {                                     // shields hung between the slits
    const q = B.L(u, 6.4);
    g.ell(q, 1.6, 1.8, SHIELD, { outline: true });
    g.circ(q, 0.55, SHIELD_BOSS);
  }
  const A = box(g, X + 1.34, Y + 0.78, 0.54, 0.5, 7, 0, MUD2);                    // the armoury
  parapet(g, X + 1.34, Y + 0.78, 0.54, 0.5, 7);
  door(g, A, 0.36, 0.64, 4.6);
  for (let i = 0; i < 4; i++) {                                                  // the spear rack
    const q = p(X + 0.3 + i * 0.1, Y + 0.95);
    g.line(q, U(q, 12), WOOD, 0.5);
    g.poly([U(q, 12), [q[0] - 0.6, q[1] - 10.6], [q[0] + 0.6, q[1] - 10.6]], STONE[2]);
  }
  box(g, X + 0.24, Y + 0.92, 0.46, 0.06, 0.6, 5, TIMBER, 0);                     // the rack's crossbar
  const t = p(X + 1.0, Y + 1.12);                                                // the straw target on its post
  g.line(t, U(t, 7), WOOD, 0.8);
  g.ell(U(t, 7.6), 2.4, 2.6, '#E2C27E', { outline: true });
  g.ell(U(t, 7.6), 1.4, 1.5, RED);
  g.ell(U(t, 7.6), 0.5, 0.55, '#F6ECD6');
  box(g, X + 1.88, Y + 0.06, 0.06, 1.88, 2.6, 0, MUD2);                          // the enclosure's right side
  box(g, X + 0.06, Y + 1.88, 0.7, 0.06, 2.6, 0, MUD2);                           // the front, with an opening
  box(g, X + 1.24, Y + 1.88, 0.7, 0.06, 2.6, 0, MUD2);
  pennant(g, U(p(X + 1.84, Y + 0.16), 11), 8, DEFENCE_EMBLEM);
}

// Wall pieces. A piece stands on its tile's centre line, WALL.t tiles thick: a post at the centre and an arm to each
// side that links to wall, plain-faced so neighbouring arms meet in one unbroken band, with mudbrick courses, a coping,
// merlons and a dark line at the foot. links: { n, e, s, w }, each 0 (nothing), 1 (standing wall, a gate, or a tower on
// a wall) or 2 (a breach: the arm ends in a broken stub).
export const WALL = { h: 6, t: 0.3, cap: 1.2, merlon: 1.6, gateH: 10.5 };
const CAP = ['#EBCB96', '#D8B17A', '#AE9080'];
const BROKEN = ['#D6B07E', '#BF9762', '#957A6A'];

function band(g, x, y, w, d, h) {
  const F = tb(g, x, y, w, d, h, 0, 0, MUD2, 0);
  for (let s = 2; s < h - 0.5; s += 2) {
    g.line(F.L(0, s), F.L(1, s), '#9A7A5A', 0.4, 0.28);
    g.line(F.R(0, s), F.R(1, s), '#7E6A5E', 0.4, 0.28);
  }
  g.line(F.L(0, 0), F.L(1, 0), INK, 0.9, 0.22);
  g.line(F.R(0, 0), F.R(1, 0), INK, 0.9, 0.22);
  return F;
}

function arm(g, x, y, w, d, full) {
  const h = full ? WALL.h : WALL.h * 0.55;
  band(g, x, y, w, d, h);
  if (!full) return;
  const C = tb(g, x - (d > w ? 0.03 : 0), y - (w > d ? 0.03 : 0), w + (d > w ? 0.06 : 0), d + (w > d ? 0.06 : 0), WALL.cap, h, 0, CAP, 0);
  g.line(C.L(0, WALL.cap), C.L(1, WALL.cap), '#FFFFFF', 0.5, 0.45);
  const cx = x + w / 2 - 0.05, cy = y + d / 2 - 0.05;
  box(g, cx, cy, 0.1, 0.1, WALL.merlon, h + WALL.cap, CAP, 0);
}

export function wallPiece(g, x, y, links = {}) {
  const t = WALL.t, a = 0.5 - t / 2, half = 0.5;
  const L = { n: links.n || 0, e: links.e || 0, s: links.s || 0, w: links.w || 0 };
  const stub = 0.32;
  if (L.n) arm(g, x + a, L.n === 1 ? y : y + half - stub, t, L.n === 1 ? half : stub, L.n === 1);
  if (L.w) arm(g, L.w === 1 ? x : x + half - stub, y + a, L.w === 1 ? half : stub, t, L.w === 1);
  const lone = !L.n && !L.e && !L.s && !L.w;
  if (lone) arm(g, x + 0.2, y + a, 0.6, t, true);                                // a single tile: a short block
  else arm(g, x + a, y + a, t, t, true);                                         // the post where the arms meet
  if (L.e) arm(g, x + half, y + a, L.e === 1 ? half : stub, t, L.e === 1);
  if (L.s) arm(g, x + a, y + half, t, L.s === 1 ? half : stub, L.s === 1);
}

// A gate: the wall drawn over a road (spec 4.13). Two tall piers at the tile's ends along the wall, joined by a painted
// lintel high enough for the road to pass under. alongX: the wall runs along x (the road crosses along y).
export function gatePiece(g, x, y, alongX = true) {
  const t = WALL.t + 0.06, a = 0.5 - t / 2, H = WALL.gateH, pier = 0.26;
  const pierAt = (u) => (alongX ? band(g, x + u, y + a, pier, t, H) : band(g, x + a, y + u, t, pier, H));
  const capAt = (u) => (alongX ? box(g, x + u - 0.02, y + a - 0.03, pier + 0.04, t + 0.06, 1.2, H, CAP, 0) : box(g, x + a - 0.03, y + u - 0.02, t + 0.06, pier + 0.04, 1.2, H, CAP, 0));
  pierAt(0); capAt(0);
  const Lt = alongX ? box(g, x + pier, y + a, 1 - 2 * pier, t, 2.6, H - 2.6, MUD2, 0) : box(g, x + a, y + pier, t, 1 - 2 * pier, 2.6, H - 2.6, MUD2, 0);
  const F = alongX ? Lt.L : Lt.R;                                                // the lintel's face toward the viewer
  g.path([['M', F(0, 0)], ['L', F(0, -2.4)], ['Q', F(0.06, 0), F(0.5, 0)], ['Q', F(0.94, 0), F(1, -2.4)], ['L', F(1, 0)], ['Z']], MUD2[1]);   // the arch
  g.stroke([['M', F(0, -2.4)], ['Q', F(0.06, 0), F(0.5, 0)], ['Q', F(0.94, 0), F(1, -2.4)]], INK, 0.5, 0.4);
  qd(g, F, 0, 1, 0.3, 0.9, RED);
  qd(g, F, 0, 1, 0.9, 1.6, TEAL);
  qd(g, F, 0, 1, 1.6, 2.2, GOLD);
  g.line(F(0, 0), F(1, 0), INK, 0.6, 0.35);
  pierAt(1 - pier); capAt(1 - pier);
}

// A breach (spec 4.13): broken stone where a wall tile was knocked down: low ragged stumps along the line and fallen
// bricks, until the player draws wall over it again.
export function breachPiece(g, x, y, alongX = true) {
  const c = p(x + 0.5, y + 0.5);
  g.radial([c[0], c[1] + 0.5], 11, 5, '#8C7A6A', 0.22);
  const t = WALL.t, a = 0.5 - t / 2;
  const chunk = (u, len, h) => (alongX ? box(g, x + u, y + a, len, t, h, 0, BROKEN, 0) : box(g, x + a, y + u, t, len, h, 0, BROKEN, 0));
  chunk(0, 0.2, 2.8);
  chunk(0.26, 0.16, 1.2);
  chunk(0.58, 0.14, 1.6);
  chunk(0.82, 0.18, 2.4);
  for (const [u, v, w, d] of [[0.3, 0.16, 0.12, 0.08], [0.6, 0.74, 0.1, 0.12], [0.16, 0.7, 0.12, 0.09], [0.74, 0.2, 0.09, 0.12]]) box(g, x + u, y + v, w, d, 1.2, 0, BRICK, 0);
}

// The 'wall' slot (the Wall card): a short run of three linked pieces. The 'gate' slot: a gate on a strip of road
// between two wall pieces.
export function wallRun(g, x, y) {
  wallPiece(g, x - 1, y, { e: 1 });
  wallPiece(g, x, y, { w: 1, e: 1 });
  wallPiece(g, x + 1, y, { w: 1 });
}
export function gateRun(g, x, y) {
  const road = [['M', p(x + 0.5, y - 0.4)], ['L', p(x + 0.5, y + 1.4)]];
  for (const [col, w, a] of [[SHADOW, 15, 0.12], [TERRAIN.roadEdge, 12, 1], [TERRAIN.road, 10, 1]]) g.stroke(road, col, w, a);
  wallPiece(g, x - 1, y, { e: 1 });
  gatePiece(g, x, y, true);
  wallPiece(g, x + 1, y, { w: 1 });
}

export const RUBBLE_VARIANTS = 3;
const RUBBLE_SLOT = { w: 1, d: 1, height: 5, bounds: boundsFor(1, 1, 5), shadows: [] };
export const DEFENCE_ART = {
  firehouse: { w: 1, d: 1, height: 19, bounds: boundsFor(1, 1, 19), shadows: [[0.12, 0.12, 0.66, 0.6, 11]], draw: firehouse },
  tower: { w: 1, d: 1, height: 31, bounds: boundsFor(1, 1, 31), shadows: [[0.2, 0.2, 0.6, 0.6, 24]], draw: tower },
  barracks: { w: 2, d: 2, height: 19, bounds: boundsFor(2, 2, 19), shadows: [[0.12, 0.12, 1.76, 0.66, 11], [1.34, 0.78, 0.54, 0.5, 7]], draw: barracks },
  wall: { w: 1, d: 1, height: 9, bounds: [-32, -20, 32, 28], shadows: [], draw: wallRun },
  gate: { w: 1, d: 1, height: 12, bounds: [-32, -22, 32, 30], shadows: [], draw: gateRun },
  rubble: { ...RUBBLE_SLOT, draw: (g, x, y) => rubble(g, x, y, 0) },
};
for (let v = 0; v < RUBBLE_VARIANTS; v++) DEFENCE_ART[`rubble.v${v}`] = { ...RUBBLE_SLOT, draw: (g, x, y) => rubble(g, x, y, v) };
