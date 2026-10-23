// Stage 4.6, the Armies track's art (rulings 340-341): the archery range (2x2), the stables (2x3), and the unit kinds' figure slots,
// as registry entries (src/render/art/registry.js describes the shape), joined into ART by src/render/art/s46.js. Units are told
// apart by shape, never colour alone (UX rule 4): your soldiers carry a spear and a tall teal shield, your archers a bow and a quiver,
// your chariots are a horse and a two-wheeled car with a teal-painted side; raiders are dark figures in crested helmets: on foot with
// an axe and a round shield (Stage 3's), archers with a bow and no shield, chariots on a dark horse with a crested driver, and boat
// raiders with a long oar and no shield. Units stand UNIT_SCALE times a citizen's size.
import { box, crs, qd, door, parapet, p, U, quad, hs } from './primitives.js';
import { pennant } from './services.js';
import { DEFENCE_EMBLEM, shellSlot } from './defence.js';
import { UNIT_SCALE } from './figures.js';
import { MUD2, STONE, TEAL, TEAL_DARK, GOLD, WOOD, RED, SHADOW, TERRAIN, THATCH } from './palette.js';
import { boundsFor } from '../iso.js';
import { FIGHTERS, POSES, FACES, CHIEF_SCALE, SACK } from '../../data/battle.js';

const SKIN = '#A0663F', HAIR = '#1E150E', KILT = '#FAF6EC';
const RAIDER = { body: '#3E3446', kilt: '#55465A', helm: '#6A5A4E', crest: '#8A2E26', rim: '#B39466' };
const HORSE = '#8A5A36', HORSE_DARK = '#6A4228', MANE = '#2E2018';
const ENEMY_HORSE = '#4A3A3E', ENEMY_HORSE_DARK = '#33282C';
const STRAW = '#E2C27E';

// A bow held upright in front of the figure at (X, Y): a curved stave and a straight string.
function bow(g, X, Y, s, wood = WOOD) {
  g.stroke([['M', [X + 3.2 * s, Y - 13 * s]], ['Q', [X + 6 * s, Y - 8 * s], [X + 3.2 * s, Y - 3 * s]]], wood, 0.8 * s);
  g.line([X + 3.2 * s, Y - 13 * s], [X + 3.2 * s, Y - 3 * s], '#EDE6D2', 0.3 * s, 0.9);
}

// Your archer: a white kilt and teal collar like a soldier, a bow held before him, a quiver of arrows on his back, no shield.
export function archer(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc;
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  g.poly([[X - 3.4 * s, Y - 6 * s], [X - 2 * s, Y - 6.6 * s], [X - 1 * s, Y - 12.6 * s], [X - 2.4 * s, Y - 12.2 * s]], '#8A4A2A', { outline: true });   // the quiver
  for (const k of [0, 0.6, 1.2]) g.line([X - (1.8 - k * 0.4) * s, Y - 12.4 * s], [X - (1.4 - k * 0.4) * s, Y - 14.2 * s], '#F6ECD6', 0.4 * s);     // fletchings
  g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], SKIN, 1.1 * s);
  g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], SKIN, 1.1 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], KILT, { outline: true });
  g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], SKIN);
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], TEAL, 1 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 3.4 * s, Y - 8 * s], SKIN, 0.9 * s);           // the bow arm, held out
  g.line([X - 1.8 * s, Y - 8.4 * s], [X + 1.8 * s, Y - 8.2 * s], SKIN, 0.8 * s);         // the drawing hand at the string
  bow(g, X, Y, s);
  g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, HAIR);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, SKIN);
  g.line([X - 1.6 * s, Y - 11.4 * s], [X + 1.6 * s, Y - 11.4 * s], TEAL, 0.6 * s);       // a teal headband
}

// A horse standing side-on, its feet at (X, Y), facing right: body, four legs, neck and head, a dark mane and tail.
function horse(g, X, Y, s, body, dark, mane, plume = null) {
  g.ell([X, Y], 6.4 * s, 1.4 * s, SHADOW, { alpha: 0.25 });
  for (const [dx, col] of [[-3.6, dark], [-2.2, body], [2.4, dark], [3.6, body]]) g.line([X + dx * s, Y], [X + dx * s, Y - 4.4 * s], col, 1 * s);
  g.ell([X, Y - 6 * s], 4.8 * s, 2.2 * s, body, { outline: true });
  g.poly([[X + 3 * s, Y - 7 * s], [X + 4.6 * s, Y - 7.4 * s], [X + 6.2 * s, Y - 11.4 * s], [X + 4.6 * s, Y - 12 * s]], body, { outline: true });   // the neck
  g.poly([[X + 4.6 * s, Y - 12 * s], [X + 6.4 * s, Y - 11.8 * s], [X + 8.4 * s, Y - 9.8 * s], [X + 7.6 * s, Y - 9 * s], [X + 5.6 * s, Y - 10 * s]], body, { outline: true });   // the head
  g.line([X + 3.6 * s, Y - 7.6 * s], [X + 4.8 * s, Y - 12.2 * s], mane, 0.9 * s);
  g.stroke([['M', [X - 4.6 * s, Y - 6.6 * s]], ['Q', [X - 6.4 * s, Y - 5.6 * s], [X - 6 * s, Y - 2.6 * s]]], mane, 0.9 * s);   // the tail
  if (plume) g.ell([X + 5.2 * s, Y - 13.4 * s], 0.8 * s, 1.4 * s, plume);
}

// A two-wheeled car behind a horse, its wheel's foot at (X, Y): a spoked wheel, a light car box painted on its side, the pole to the horse.
function car(g, X, Y, s, side, rim) {
  g.line([X + 1.6 * s, Y - 4.6 * s], [X + 7.6 * s, Y - 5.6 * s], WOOD, 0.7 * s);          // the pole
  g.poly([[X - 2.6 * s, Y - 4.4 * s], [X + 2.4 * s, Y - 4.4 * s], [X + 2 * s, Y - 8.6 * s], [X - 2.2 * s, Y - 8.2 * s]], side, { outline: true });
  g.line([X - 2.6 * s, Y - 4.4 * s], [X + 2.4 * s, Y - 4.4 * s], rim, 0.6 * s);
  g.circ([X, Y - 2.6 * s], 2.6 * s, null, { stroke: '#5E4636', strokeWidth: 0.8 * s });
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    g.line([X - Math.cos(a) * 2.4 * s, Y - 2.6 * s - Math.sin(a) * 2.4 * s], [X + Math.cos(a) * 2.4 * s, Y - 2.6 * s + Math.sin(a) * 2.4 * s], '#5E4636', 0.4 * s);
  }
}

// Your chariot: a bay horse with a gold plume and a car with a teal-painted side, its driver in white with a teal collar.
export function chariot(g, gx, gy, z = 0, sc = UNIT_SCALE * 0.8) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc;
  horse(g, X + 3 * s, Y, s, HORSE, HORSE_DARK, MANE, GOLD);
  car(g, X - 5 * s, Y + 0.4 * s, s, TEAL, GOLD);
  const dx = X - 5 * s, dy = Y - 8 * s;                                                  // the driver, standing in the car
  g.poly([[dx - 1.4 * s, dy], [dx + 1.4 * s, dy], [dx + 1.6 * s, dy - 3.2 * s], [dx - 1.6 * s, dy - 3.2 * s]], KILT, { outline: true });
  g.line([dx - 1.4 * s, dy - 3 * s], [dx + 1.4 * s, dy - 3 * s], TEAL, 0.9 * s);
  g.line([dx + 1.4 * s, dy - 2.6 * s], [dx + 7 * s, dy + 0.4 * s], '#5E4636', 0.3 * s);   // the reins
  g.circ([dx, dy - 4.8 * s], 1.5 * s, HAIR);
  g.circ([dx + 0.3 * s, dy - 4.4 * s], 1.2 * s, SKIN);
}

// A raider archer: Stage 3's dark crested raider, with a bow in place of the axe and no shield.
export function raiderArcher(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc;
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.3 });
  g.line([X - 0.9 * s, Y], [X - 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.line([X + 0.9 * s, Y], [X + 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], RAIDER.kilt);
  g.poly([[X - 1.6 * s, Y - 5.6 * s], [X + 1.6 * s, Y - 5.6 * s], [X + 1.9 * s, Y - 8.8 * s], [X - 1.9 * s, Y - 8.8 * s]], RAIDER.body);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 3.4 * s, Y - 8 * s], RAIDER.body, 0.9 * s);
  bow(g, X, Y, s, RAIDER.rim);
  g.circ([X + 0.2 * s, Y - 10.4 * s], 1.5 * s, RAIDER.body);
  g.path([['M', [X - 1.7 * s, Y - 10.6 * s]], ['Q', [X + 0.2 * s, Y - 13.6 * s], [X + 1.9 * s, Y - 10.6 * s]], ['Z']], RAIDER.helm);
  g.path([['M', [X - 2 * s, Y - 11 * s]], ['Q', [X - 0.6 * s, Y - 16.2 * s], [X + 2.4 * s, Y - 13.4 * s]], ['Q', [X + 0.4 * s, Y - 13.4 * s], [X - 2 * s, Y - 11 * s]], ['Z']], RAIDER.crest);
}

// The drawing helper mirrored left to right about x = X (a raider's chariot drives the other way to yours).
function mirrored(g, X) {
  const f = (q) => [2 * X - q[0], q[1]];
  const segs = (list) => list.map((sg) => [sg[0], ...sg.slice(1).map(f)]);
  return {
    ...g, poly: (pts, ...r) => g.poly(pts.map(f), ...r), ell: (q, ...r) => g.ell(f(q), ...r), circ: (q, ...r) => g.circ(f(q), ...r),
    line: (a, b, ...r) => g.line(f(a), f(b), ...r), stroke: (sg, ...r) => g.stroke(segs(sg), ...r), path: (sg, ...r) => g.path(segs(sg), ...r),
  };
}

// A raider chariot: a dark horse with a red plume and a dark car, driving the other way to yours, a crested driver with a spear held
// high, a round shield hung on the car's back, and a banner on a pole behind it (Stage 4.6 UX, ruling 406).
export function raiderChariot(gIn, gx, gy, z = 0, sc = UNIT_SCALE * 0.8) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, g = mirrored(gIn, X);
  horse(g, X + 3 * s, Y, s, ENEMY_HORSE, ENEMY_HORSE_DARK, '#1A1216', RAIDER.crest);
  car(g, X - 5 * s, Y + 0.4 * s, s, RAIDER.kilt, RAIDER.rim);
  g.circ([X - 7.4 * s, Y - 5.8 * s], 2.4 * s, '#6E5A3E', { stroke: RAIDER.rim, strokeWidth: 0.5 * s });   // the round shield
  const dx = X - 5 * s, dy = Y - 8 * s;
  g.poly([[dx - 1.4 * s, dy], [dx + 1.4 * s, dy], [dx + 1.6 * s, dy - 3.2 * s], [dx - 1.6 * s, dy - 3.2 * s]], RAIDER.body);
  g.line([dx - 0.6 * s, dy - 2 * s], [dx - 2.6 * s, dy - 17 * s], WOOD, 0.6 * s);         // the spear, held high
  g.poly([[dx - 2.6 * s, dy - 18.6 * s], [dx - 2 * s, dy - 16.4 * s], [dx - 3.2 * s, dy - 16.6 * s]], STONE[2]);
  g.circ([dx, dy - 4.8 * s], 1.4 * s, RAIDER.body);
  g.path([['M', [dx - 1.7 * s, dy - 5 * s]], ['Q', [dx - 0.4 * s, dy - 10 * s], [dx + 2.4 * s, dy - 7.4 * s]], ['Q', [dx + 0.4 * s, dy - 7.6 * s], [dx - 1.7 * s, dy - 5 * s]], ['Z']], RAIDER.crest);
  // Stage 4.6 UX (ruling 406, fix round 1: ruling 408): an addition beside the driver, not in place of him. A tall pole stayed to the car's back,
  // clear of the driver's spear and the shield, with a dark swallow-tailed banner streaming behind it, so an enemy chariot is told from yours
  // by its outline at a distance and not by its darker horse (colour alone): no friendly unit carries a flag on a pole.
  const bx = X - 10.6 * s, by = Y - 2.4 * s, top = by - 18.6 * s;
  g.line([X - 7.4 * s, by], [bx, by], WOOD, 0.6 * s);
  g.line([bx, by], [bx, top], WOOD, 0.7 * s);
  g.poly([[bx, top], [bx - 8.4 * s, top + 1.3 * s], [bx - 5.9 * s, top + 3.6 * s], [bx - 8.4 * s, top + 5.9 * s], [bx, top + 4.8 * s]], RAIDER.body, { outline: true });
  g.line([bx - 0.8 * s, top + 2.5 * s], [bx - 6.4 * s, top + 3 * s], RAIDER.crest, 0.9 * s);
}

// A boat raider, landed: a crested raider with no shield, a long oar held upright beside him, its blade above his head.
export function raiderBoat(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc;
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.3 });
  g.line([X - 0.9 * s, Y], [X - 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.line([X + 0.9 * s, Y], [X + 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], RAIDER.kilt);
  g.poly([[X - 1.6 * s, Y - 5.6 * s], [X + 1.6 * s, Y - 5.6 * s], [X + 1.9 * s, Y - 8.8 * s], [X - 1.9 * s, Y - 8.8 * s]], RAIDER.body);
  g.line([X - 4 * s, Y + 0.4 * s], [X - 5.6 * s, Y - 19 * s], WOOD, 0.8 * s);                  // the oar
  g.poly([[X - 5.2 * s, Y - 17 * s], [X - 4.2 * s, Y - 22.6 * s], [X - 6 * s, Y - 23 * s], [X - 7 * s, Y - 17.4 * s]], '#B08A5A', { outline: true });   // its blade
  g.line([X - 1.8 * s, Y - 8.4 * s], [X - 4.6 * s, Y - 9.6 * s], RAIDER.body, 0.9 * s);   // the hand on the oar
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 2.4 * s, Y - 5 * s], RAIDER.body, 0.9 * s);
  g.circ([X + 0.2 * s, Y - 10.4 * s], 1.5 * s, RAIDER.body);
  g.path([['M', [X - 1.7 * s, Y - 10.6 * s]], ['Q', [X + 0.2 * s, Y - 13.6 * s], [X + 1.9 * s, Y - 10.6 * s]], ['Z']], RAIDER.helm);
  g.path([['M', [X - 2 * s, Y - 11 * s]], ['Q', [X - 0.6 * s, Y - 16.2 * s], [X + 2.4 * s, Y - 13.4 * s]], ['Q', [X + 0.4 * s, Y - 13.4 * s], [X - 2 * s, Y - 11 * s]], ['Z']], RAIDER.crest);
}

// Archery range (2x2): a shaded stand of mudbrick along the back with a bow rack under an awning, a sand range in front with three
// straw targets on posts along the far side, a low wall on two sides, and a pennant in the Defence colour.
export function archeryRange(g, X, Y) {
  g.poly(quad(X + 0.06, Y + 0.06, 1.88, 1.88, 0), '#E8D3A6', { outline: true });  // the sand range
  for (let i = 0; i < 6; i++) g.circ(p(X + 0.3 + hs(i, 3, 7) * 1.4, Y + 0.9 + hs(i, 4, 7) * 0.9), 0.6, TERRAIN.dotDark, { alpha: 0.6 });
  for (const u of [0.35, 0.95, 1.55]) g.line(p(X + u, Y + 1.0), p(X + u, Y + 1.7), '#C9A86C', 0.6, 0.8);   // shooting lanes
  box(g, X + 0.06, Y + 0.06, 0.06, 1.88, 2.6, 0, MUD2);                          // the low wall, back left
  const B = box(g, X + 0.12, Y + 0.12, 1.76, 0.5, 9, 0, MUD2);                  // the stand
  crs(g, B, 9, '#9A7A5A', 3);
  parapet(g, X + 0.12, Y + 0.12, 1.76, 0.5, 9);
  qd(g, B.L, 0, 1, 7.4, 8.4, DEFENCE_EMBLEM);
  door(g, B, 0.12, 0.24, 6);
  for (let k = 0; k < 5; k++) {                                                  // bows hung on the stand's face
    const q = B.L(0.36 + k * 0.12, 3.4);
    g.stroke([['M', [q[0], q[1] - 3.6]], ['Q', [q[0] + 1.4, q[1] - 1.8], [q[0], q[1]]]], WOOD, 0.6);
    g.line([q[0], q[1] - 3.6], q, '#EDE6D2', 0.25, 0.9);
  }
  g.poly([U(p(X + 0.12, Y + 0.62), 6.4), U(p(X + 1.88, Y + 0.62), 6.4), U(p(X + 1.88, Y + 0.9), 5), U(p(X + 0.12, Y + 0.9), 5)], THATCH[0], { outline: true });   // the awning
  for (const [u, v] of [[0.4, 1.78], [1.0, 1.82], [1.6, 1.78]]) {                // the targets, on posts along the front
    const t = p(X + u, Y + v);
    g.line(t, U(t, 6), WOOD, 0.8);
    g.ell(U(t, 7), 2.3, 2.5, STRAW, { outline: true });
    g.ell(U(t, 7), 1.3, 1.4, RED);
    g.ell(U(t, 7), 0.5, 0.55, '#F6ECD6');
  }
  box(g, X + 1.88, Y + 0.06, 0.06, 1.88, 2.6, 0, MUD2);                          // the low wall, right
  pennant(g, U(p(X + 1.82, Y + 0.18), 9), 8, DEFENCE_EMBLEM);
}

// Stables (2x3): a long stable block along the back with dark stall doors and a reed roof, a paddock of packed earth fenced in front
// with a bay horse in it, a chariot parked on the right with a teal-painted side, a hay stack and a water trough, and a pennant.
export function stables(g, X, Y) {
  g.poly(quad(X + 0.06, Y + 0.06, 1.88, 2.88, 0), '#D9BE8A', { outline: true });  // the yard
  for (let i = 0; i < 9; i++) g.circ(p(X + 0.9 + hs(i, 5, 9) * 0.9, Y + 0.3 + hs(i, 6, 9) * 2.4), 0.6, TERRAIN.dotDark, { alpha: 0.55 });
  const B = box(g, X + 0.1, Y + 0.12, 0.7, 2.76, 10, 0, MUD2);                   // the stable block, down the back left
  crs(g, B, 10, '#9A7A5A', 3);
  g.poly(quad(X + 0.04, Y + 0.06, 0.82, 2.88, 10), THATCH[1], { outline: true }); // the reed roof
  g.line(U(p(X + 0.04, Y + 1.5), 10.4), U(p(X + 0.86, Y + 1.5), 10.4), THATCH[2], 0.6, 0.6);
  for (const u of [0.1, 0.36, 0.62, 0.88]) qd(g, B.R, u, u + 0.08, 0, 6, '#3A2A22');   // stall doors along its yard face
  qd(g, B.L, 0, 1, 8.4, 9.4, DEFENCE_EMBLEM);
  box(g, X + 0.95, Y + 0.3, 0.6, 0.18, 2, 0, STONE);                            // the trough
  g.poly(quad(X + 0.99, Y + 0.33, 0.52, 0.12, 2), '#4FB3B5');
  box(g, X + 1.55, Y + 0.25, 0.3, 0.3, 4, 0, THATCH);                            // the hay stack
  horse(g, ...p(X + 1.3, Y + 1.25), 1.15, HORSE, HORSE_DARK, MANE);
  chariot(g, X + 1.45, Y + 2.45, 0, 0.95);                                       // a chariot parked by the gate
  for (const v of [0.9, 1.9]) {                                                  // the paddock fence's posts and rails
    g.line(p(X + 0.9, Y + v), p(X + 1.9, Y + v), WOOD, 0.6, 0.85);
  }
  for (const u of [0.9, 1.4, 1.9]) g.line(p(X + u, Y + 1.9), U(p(X + u, Y + 1.9), 3), WOOD, 0.7);
  pennant(g, U(p(X + 0.5, Y + 0.3), 10.5), 8, DEFENCE_EMBLEM);
}

// ── Version 6.0, Track B2: fighting poses, the chieftain and a raider with a sack ──
// A soldier and a raider on foot, side on, facing the foe (render/units.js picks the slot by who stands beside whom): pose 'a' is the guard
// (spear up, axe raised) and 'b' the blow (spear thrust, axe swung down with a pale slash). Drawn facing right; the left-facing slots are the
// same drawing mirrored about the unit's feet. Shapes tell the sides apart (the soldier's spear and tall teal shield, the raider's axe and
// round shield), never colour alone.
const GOLD_TRIM = '#E2B13C';
const aim = (a, b, len) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d * len, dy / d * len]; };

function soldierPose(g, X, Y, s, pose) {
  const b = pose === 'b', lean = (b ? 1.6 : 0.4) * s, hip = X + lean * 0.5;
  g.ell([X + lean * 0.3, Y], 3.6 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  g.line([X + (b ? 2.6 : 1.4) * s, Y], [hip + 0.6 * s, Y - 3.4 * s], SKIN, 1.1 * s);           // the front foot planted, the back foot braced
  g.line([X - (b ? 2.4 : 1.2) * s, Y], [hip - 0.6 * s, Y - 3.4 * s], SKIN, 1.1 * s);
  g.poly([[hip - 2 * s, Y - 2.6 * s], [hip + 2 * s, Y - 2.6 * s], [hip + 1.5 * s, Y - 5.7 * s], [hip - 1.5 * s, Y - 5.7 * s]], KILT, { outline: true });
  g.poly([[hip - 1.5 * s, Y - 5.6 * s], [hip + 1.5 * s, Y - 5.6 * s], [X + 1.9 * s + lean, Y - 8.7 * s], [X - 1.5 * s + lean, Y - 8.7 * s]], SKIN);
  g.line([X - 1.4 * s + lean, Y - 8.5 * s], [X + 1.6 * s + lean, Y - 8.5 * s], TEAL, 1 * s);
  const hand = [X + 2.6 * s + lean, Y - 7 * s];
  const rear = [hand[0] - (b ? 3.6 : 5.2) * s, hand[1] + (b ? 0.4 : 1.6) * s], tip = [hand[0] + (b ? 10.4 : 7.2) * s, hand[1] - (b ? 0.8 : 2.4) * s];
  g.path([['M', [X + 0.8 * s + lean, Y - 1.2 * s]], ['L', [X + 0.8 * s + lean, Y - 7.4 * s]], ['Q', [X + 2.4 * s + lean, Y - 10.4 * s], [X + 4 * s + lean, Y - 7.4 * s]],
    ['L', [X + 4 * s + lean, Y - 1.2 * s]], ['Z']], TEAL, { stroke: TEAL_DARK, strokeWidth: 0.5 * s });      // the tall shield, held in front
  g.line([X + 2.4 * s + lean, Y - 2.2 * s], [X + 2.4 * s + lean, Y - 8.2 * s], '#F6ECD6', 0.4 * s, 0.7);
  g.line([X + 1.4 * s + lean, Y - 8.4 * s], hand, SKIN, 0.9 * s);                                          // the spear arm
  g.line(rear, tip, WOOD, 0.6 * s);
  const u = aim(rear, tip, 1), n = [-u[1], u[0]];
  g.poly([[tip[0] + u[0] * 2.8 * s, tip[1] + u[1] * 2.8 * s], [tip[0] + n[0] * 0.9 * s, tip[1] + n[1] * 0.9 * s], [tip[0] - n[0] * 0.9 * s, tip[1] - n[1] * 0.9 * s]], GOLD);
  g.circ([X - 0.2 * s + lean, Y - 10.8 * s], 1.75 * s, HAIR);
  g.circ([X + 0.35 * s + lean, Y - 10.3 * s], 1.4 * s, SKIN);
  g.line([X - 1.6 * s + lean, Y - 11.4 * s], [X + 1.6 * s + lean, Y - 11.4 * s], KILT, 0.6 * s);
}

// A raider on foot in one of three poses: 'a' the axe raised to strike, 'b' the blow, 'walk' the axe at his side. chief: the band's leader, a
// head taller crest with a gold band, a gold breastplate and a gold-ringed shield; sack: a sack of what was taken on his shoulder.
function raiderPose(g, X, Y, s, pose, { chief = false, sack = false } = {}) {
  const b = pose === 'b', walk = pose === 'walk', lean = (b ? 1.6 : walk ? 0 : 0.4) * s, hip = X + lean * 0.5;
  g.ell([X + lean * 0.3, Y], 3.6 * s, 1.1 * s, SHADOW, { alpha: 0.3 });
  const stride = walk ? 0.9 : b ? 2.4 : 1.3;
  g.line([X + stride * s, Y], [hip + 0.8 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.line([X - stride * s, Y], [hip - 0.8 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.poly([[hip - 2 * s, Y - 2.6 * s], [hip + 2 * s, Y - 2.6 * s], [hip + 1.5 * s, Y - 5.7 * s], [hip - 1.5 * s, Y - 5.7 * s]], RAIDER.kilt);
  if (chief) g.line([hip - 2 * s, Y - 2.7 * s], [hip + 2 * s, Y - 2.7 * s], GOLD_TRIM, 0.7 * s);
  g.poly([[hip - 1.6 * s, Y - 5.6 * s], [hip + 1.6 * s, Y - 5.6 * s], [X + 1.9 * s + lean, Y - 8.8 * s], [X - 1.9 * s + lean, Y - 8.8 * s]], RAIDER.body);
  if (chief) g.poly([[hip - 1.3 * s, Y - 5.8 * s], [hip + 1.3 * s, Y - 5.8 * s], [X + 1.6 * s + lean, Y - 8.4 * s], [X - 1.6 * s + lean, Y - 8.4 * s]], GOLD_TRIM, { alpha: 0.85 });   // the breastplate
  const shoulder = [X + 1.6 * s + lean, Y - 8.4 * s];
  if (walk) {
    const hand = [X + 3 * s, Y - 6.2 * s];
    g.line(shoulder, hand, RAIDER.body, 0.9 * s);
    g.line(hand, [X + 4.2 * s, Y - 0.8 * s], WOOD, 0.6 * s);                                                // the axe carried low
    g.poly([[X + 3.8 * s, Y - 1.4 * s], [X + 6 * s, Y - 0.4 * s], [X + 4.2 * s, Y + 0.8 * s]], STONE[2]);
  } else if (b) {
    const hand = [X + 3.2 * s + lean, Y - 9.4 * s], end = [X + 9.6 * s + lean, Y - 5 * s];
    g.line(shoulder, hand, RAIDER.body, 0.9 * s);
    g.stroke([['M', [X + 1.4 * s + lean, Y - 16.4 * s]], ['Q', [X + 9 * s + lean, Y - 14 * s], [X + 11.6 * s + lean, Y - 6.2 * s]]], '#F6ECD6', 0.7 * s, 0.75);   // the slash
    g.line(hand, end, WOOD, 0.6 * s);
    g.poly([[end[0] - 0.4 * s, end[1] - 2.8 * s], [end[0] + 2.4 * s, end[1] - 1.2 * s], [end[0] + 1.2 * s, end[1] + 1.4 * s], [end[0] - 0.8 * s, end[1] + 0.2 * s]], STONE[2], { outline: true });
  } else {
    const hand = [X + 2.6 * s + lean, Y - 12.6 * s], top = [X + 0.8 * s + lean, Y - 16.8 * s];
    g.line(shoulder, hand, RAIDER.body, 0.9 * s);
    g.line([X + 3.4 * s + lean, Y - 10.6 * s], top, WOOD, 0.6 * s);
    g.poly([[top[0] - 0.4 * s, top[1] - 0.6 * s], [top[0] + 3.4 * s, top[1] + 0.4 * s], [top[0] + 2.4 * s, top[1] + 2.8 * s], [top[0] - 0.6 * s, top[1] + 1.6 * s]], STONE[2], { outline: true });
  }
  g.circ([X + 0.2 * s + lean, Y - 10.4 * s], 1.5 * s, RAIDER.body);                                         // the head and its crested helmet
  g.path([['M', [X - 1.7 * s + lean, Y - 10.6 * s]], ['Q', [X + 0.2 * s + lean, Y - 13.6 * s], [X + 1.9 * s + lean, Y - 10.6 * s]], ['Z']], RAIDER.helm);
  const crest = chief ? 20 : 16.2;
  g.path([['M', [X - 2 * s + lean, Y - 11 * s]], ['Q', [X - 0.6 * s + lean, Y - crest * s], [X + 2.4 * s + lean, Y - 13.4 * s]], ['Q', [X + 0.4 * s + lean, Y - 13.4 * s], [X - 2 * s + lean, Y - 11 * s]], ['Z']], RAIDER.crest);
  if (chief) g.line([X - 1.9 * s + lean, Y - 11.6 * s], [X + 1.9 * s + lean, Y - 12.4 * s], GOLD_TRIM, 0.7 * s);
  if (sack) {
    const q = [X - 1.8 * s, Y - 11.4 * s];
    g.line([X - 1.2 * s, Y - 8.4 * s], [X - 1.6 * s, Y - 10.6 * s], RAIDER.body, 0.9 * s);
    g.ell([q[0], q[1] - 0.4 * s], 2.8 * s, 2.3 * s, SACK.body, { outline: true });
    g.ell([q[0] + 0.4 * s, q[1] + 0.8 * s], 2.2 * s, 1.2 * s, SACK.shade, { alpha: 0.55 });
    g.line([q[0] - 0.6 * s, q[1] - 2.6 * s], [q[0] + 0.8 * s, q[1] - 3.4 * s], SACK.tie, 0.7 * s);
  } else if (!walk) {
    const sx = b ? 1.8 : 3.2;
    g.circ([X + sx * s + lean, Y - 6.2 * s], 2.6 * s, RAIDER.shield, { stroke: RAIDER.rim, strokeWidth: 0.6 * s });   // the round shield
    g.circ([X + sx * s + lean, Y - 6.2 * s], 0.7 * s, chief ? GOLD_TRIM : RAIDER.rim);
  }
  if (walk && !sack) {
    g.circ([X - 2.4 * s, Y - 6.4 * s], 2.6 * s, RAIDER.shield, { stroke: RAIDER.rim, strokeWidth: 0.6 * s });         // the shield on his back arm
    g.circ([X - 2.4 * s, Y - 6.4 * s], 0.7 * s, chief ? GOLD_TRIM : RAIDER.rim);
  }
}

// A figure in a fighting pose at tile point (gx, gy): who 'soldier' | 'raider' | 'chief', pose 'a' | 'b', face 1 (right on screen) or -1 (left).
export function fightFigure(gIn, gx, gy, who, pose, face = 1, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], g = face > 0 ? gIn : mirrored(gIn, X);
  if (who === 'soldier') soldierPose(g, X, Y, sc, pose);
  else raiderPose(g, X, Y, who === 'chief' ? sc * CHIEF_SCALE : sc, pose, { chief: who === 'chief' });
}
// A raider carrying a sack, and the band's chieftain standing (his banner is drawn live over him, render/units.js).
export function raiderWithSack(g, gx, gy, z = 0, sc = UNIT_SCALE) { const c = U(p(gx, gy), z); raiderPose(g, c[0], c[1], sc, 'walk', { sack: true }); }
export function chieftain(g, gx, gy, z = 0, sc = UNIT_SCALE) { const c = U(p(gx, gy), z); raiderPose(g, c[0], c[1], sc * CHIEF_SCALE, 'walk', { chief: true }); }

const FIGHT_BOUNDS = [-32, -52, 32, 10];
const FIGHT_ART = {};
for (const who of FIGHTERS) for (const pose of POSES) for (const face of FACES) {
  FIGHT_ART[`fig.${who}_${pose}_${face}`] = { w: 0, d: 0, height: 34, bounds: FIGHT_BOUNDS, shadows: [], draw: (g, x, y) => fightFigure(g, x, y, who, pose, face === 'r' ? 1 : -1) };
}
FIGHT_ART['fig.chief'] = { w: 0, d: 0, height: 34, bounds: FIGHT_BOUNDS, shadows: [], draw: (g, x, y) => chieftain(g, x, y) };
FIGHT_ART['fig.raider_sack'] = { w: 0, d: 0, height: 28, bounds: [-24, -46, 24, 10], shadows: [], draw: (g, x, y) => raiderWithSack(g, x, y) };

const UNIT_BOUNDS = [-21, -45, 21, 9];
const CHARIOT_BOUNDS = [-30, -48, 30, 10];
export const ARMY_ART = {
  archery_range: { w: 2, d: 2, height: 17, bounds: boundsFor(2, 2, 17), shadows: [[0.12, 0.12, 1.76, 0.5, 9]], draw: archeryRange },
  stables: { w: 2, d: 3, height: 19, bounds: boundsFor(2, 3, 19), shadows: [[0.1, 0.12, 0.7, 2.76, 10]], draw: stables },
  'fig.archer': { w: 0, d: 0, height: 30, bounds: UNIT_BOUNDS, shadows: [], draw: (g, x, y) => archer(g, x, y) },
  'fig.chariot': { w: 0, d: 0, height: 26, bounds: CHARIOT_BOUNDS, shadows: [], draw: (g, x, y) => chariot(g, x, y) },
  'fig.raider_archer': { w: 0, d: 0, height: 26, bounds: UNIT_BOUNDS, shadows: [], draw: (g, x, y) => raiderArcher(g, x, y) },
  'fig.raider_chariot': { w: 0, d: 0, height: 26, bounds: CHARIOT_BOUNDS, shadows: [], draw: (g, x, y) => raiderChariot(g, x, y) },
  'fig.raider_boat': { w: 0, d: 0, height: 26, bounds: UNIT_BOUNDS, shadows: [], draw: (g, x, y) => raiderBoat(g, x, y) },
  ...FIGHT_ART,                                    // Version 6.0 (Track B2): fighting poses, the chieftain, a raider with a sack
};

// The slot an Armies building shows when it is not just its type, else null. Version 6.0 (Track B2): rubble that remembers what stood there
// (b.was) shows that building's burned-out or wrecked shell (defence.js shellSlot); old rubble keeps its heap.
export const armySlot = (b, world) => (b.type === 'rubble' && b.was ? shellSlot(b) : null);
