// The monuments' supply buildings (spec 5.7 item 6, ruling 257), in the mock-up's style: the builders' guild's yard with
// a sled, ropes and a stone template; the quarry with cut faces, stacked blocks and men splitting stone; the brickworks
// with rows of drying bricks and a kiln. Each is a 2x2 in the Monuments tint's gold pennant (spec 5.3). A supply
// building nobody works at (an idle one employs nobody: src/sim/labour.js) shows its tools laid down and nobody at work,
// through its own slot (registry.js slotFor: '<type>.idle'). The brickworks' drying rows show how fast it makes bricks
// (its staffing: brickworksStage), one to three rows, so a half-staffed brickworks reads as half at work.
import { box, tb, qd, door, win, parapet, mat, awn, pots, p, U, quad, hs } from './primitives.js';
import { rock } from './nature.js';
import { fig } from './figures.js';
import { pennant } from './services.js';
import { WASH, WASH2, MUD, MUD2, ROCK, STONE, SST, TEAL, TEAL_DARK, RED, GOLD, GREEN, GREEN_DARK, WOOD, SHADOW, POT } from './palette.js';
import { CATEGORY_TINT } from '../../data/ui.js';
import { BUILDINGS } from '../../data/buildings.js';
import { boundsFor } from '../iso.js';

export const SUPPLY_TYPES = ['builders_guild', 'quarry', 'brickworks'];
export const SUPPLY_TINT = CATEGORY_TINT.monuments;        // the Monuments tab's gold, for their pennants
const TIMBER = ['#C9A26A', '#A8814E', '#86705E'];
const CUT = ['#F2E4C4', '#E2CFA6', '#BCA79E'];             // fresh-cut limestone: paler than the weathered rock
const ROPE = '#C8B48A', OCHRE = '#B5562A';

// A wooden sled: two runners and a deck of planks, its front at +x; `load` puts a dressed block on it.
export function sled(g, gx, gy, load = true, z = 0) {
  for (const dy of [0.02, 0.2]) box(g, gx - 0.24, gy + dy, 0.5, 0.04, 1, z, TIMBER, 0);
  box(g, gx - 0.2, gy, 0.42, 0.26, 0.8, z + 1, TIMBER, 0);
  if (load) box(g, gx - 0.15, gy + 0.03, 0.3, 0.2, 4, z + 1.8, STONE);
}

// A coil of rope on the ground at tile point (gx, gy).
function coil(g, gx, gy) {
  const c = p(gx, gy);
  g.ell([c[0], c[1] - 0.6], 3, 1.5, '#A8905E');
  for (const [r, a] of [[2.6, 1], [1.8, 0.9], [1, 0.8]]) g.ell([c[0], c[1] - 0.9], r, r * 0.5, 'none', { stroke: '#E6D4A6', strokeWidth: 0.6, strokeAlpha: a });
}

// A mallet and a chisel laid on the ground (an idle yard's tools).
function toolsDown(g, gx, gy) {
  const c = p(gx, gy);
  g.line([c[0] - 3, c[1] + 0.6], [c[0] + 1.6, c[1] - 1], WOOD, 0.8);
  g.poly([[c[0] + 1, c[1] - 2], [c[0] + 3.6, c[1] - 1.1], [c[0] + 3, c[1] + 0.6], [c[0] + 0.4, c[1] - 0.3]], TIMBER[1], { outline: true });
  g.line([c[0] - 2.6, c[1] + 2], [c[0] + 0.8, c[1] + 2.6], '#8E8A96', 0.7);
}

// A stack of dressed blocks: n across, rows high.
function blocks(g, gx, gy, n, rows, C = STONE) {
  for (let r = 0; r < rows; r++) for (let i = 0; i < n - r; i++) box(g, gx + i * 0.24 + r * 0.12, gy, 0.22, 0.2, 3.6, r * 3.6, C);
}

// Builders' guild: a whitewashed office with a teal band and a roof mat at the back, a yard with a sled carrying a
// block, coiled ropes, a dressed block marked out in red ochre as the masons' template, a stack of blocks, and a mason
// at work. Idle: the sled stands empty, the tools lie on the ground and nobody is there.
export function buildersGuild(g, X, Y, idle = false) {
  g.poly(quad(X + 0.08, Y + 0.08, 1.84, 1.84, 0), '#E3CFA0', { outline: true });                        // the beaten yard
  const W = box(g, X + 0.12, Y + 0.12, 1.0, 0.7, 11, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 1.0, 0.7, 11);
  qd(g, W.L, 0, 1, 9.2, 10, TEAL);
  qd(g, W.R, 0, 1, 9.2, 10, TEAL_DARK);
  qd(g, W.L, 0, 1, 8.6, 9.2, GOLD);
  qd(g, W.R, 0, 1, 8.6, 9.2, '#B98A4A');
  door(g, W, 0.56, 0.74, 6.4);
  win(g, W.L, 0.16, 0.3, 4.4, 6.8);
  win(g, W.R, 0.3, 0.52, 4.4, 6.8);
  mat(g, X + 0.26, Y + 0.24, 0.44, 0.34, 11, RED, GOLD);
  const S = box(g, X + 1.22, Y + 0.14, 0.62, 0.5, 6, 0, WASH2);                                        // the rope store
  qd(g, S.L, 0.3, 0.7, 0, 4.6, '#4A3C4E');
  awn(g, X + 1.2, Y + 0.12, 0.66, 0.54, 6, GREEN, GREEN_DARK);
  blocks(g, X + 0.14, Y + 0.98, 3, 2);
  // the template: a dressed block marked out in red ochre on a low trestle
  box(g, X + 0.98, Y + 0.9, 0.5, 0.36, 1.2, 0, TIMBER, 0);
  const T = box(g, X + 1.02, Y + 0.94, 0.42, 0.28, 3.4, 1.2, CUT);
  const top = (u, v) => U(p(X + 1.02 + 0.42 * u, Y + 0.94 + 0.28 * v), 4.6);
  for (const u of [0.33, 0.66]) g.line(top(u, 0.05), top(u, 0.95), OCHRE, 0.5);
  g.line(top(0.05, 0.5), top(0.95, 0.5), OCHRE, 0.5);
  qd(g, T.L, 0.1, 0.9, 1.6, 1.9, OCHRE, { alpha: 0.7 });
  if (!idle) fig(g, X + 1.1, Y + 1.38, 'citizen', 0, 0.85);                                           // the master mason
  sled(g, X + 0.5, Y + 1.5, !idle);
  coil(g, X + 1.5, Y + 1.66);
  coil(g, X + 1.74, Y + 1.46);
  if (idle) toolsDown(g, X + 1.2, Y + 1.72);
  else {
    fig(g, X + 0.22, Y + 1.72, 'hauler', 0, 0.85);
    g.line(U(p(X + 0.76, Y + 1.6), 1.5), U(p(X + 0.3, Y + 1.74), 4), ROPE, 0.6);                       // the rope to the sled
  }
  pennant(g, U(p(X + 1.88, Y + 0.12), 6), 9, SUPPLY_TINT);
}

// Quarry (on rocky ground): a limestone outcrop cut back in steps, each cut face pale and straight with its
// wedge marks, a split block on the floor, dressed blocks stacked at the front, and two men splitting stone: one
// swinging a mallet onto a wedge, one with a lever. Idle: the blocks stand, the mallet lies by the wedge, nobody works.
export function quarry(g, X, Y, idle = false) {
  g.poly(quad(X + 0.04, Y + 0.04, 1.92, 1.92, 0), '#D9C08E', { outline: true });                       // the quarry floor
  // the outcrop: weathered rock masses, their fronts cut back in straight pale faces, boulders on their tops
  const masses = [[0.06, 0.06, 0.92, 0.66, 15], [0.98, 0.06, 0.94, 0.48, 11], [0.06, 0.72, 0.5, 0.56, 7]];
  masses.forEach(([dx, dy, w, d, h], k) => {
    const F = tb(g, X + dx, Y + dy, w, d, h, 0, 0.03, [ROCK[0], CUT[1], CUT[2]]);
    for (let s = 3; s < h - 1; s += 3.4) {                                                                // the bedding planes
      g.line(F.L(0.02, s), F.L(0.98, s + hs(k, s, 2) - 0.5), '#B39466', 0.45, 0.45);
      g.line(F.R(0.02, s), F.R(0.98, s), '#9C8A86', 0.45, 0.35);
    }
    for (let u = 0.1; u < 0.95; u += 0.14) g.line(F.L(u, h - 0.3), F.L(u, h - 1.8), '#8E7470', 0.5, 0.55);   // wedge marks along the cut edge
    g.poly(quad(X + dx + 0.03, Y + dy + 0.03, w - 0.06, d - 0.06, h), ROCK[1], { alpha: 0.55 });       // the weathered top
    for (let i = 0; i < 2 + (k === 0); i++) rock(g, U(p(X + dx + w * (0.2 + 0.6 * hs(k, i, 3)), Y + dy + d * (0.2 + 0.5 * hs(k, i, 4))), h));
  });
  // a block half split off the low bench, the wedges in its crack
  const B = box(g, X + 0.78, Y + 0.7, 0.4, 0.3, 4.4, 0, CUT);
  g.line(B.L(0.5, 0), B.L(0.5, 4.4), '#8E7470', 0.5);
  for (const u of [0.2, 0.5, 0.8]) box(g, X + 0.78 + 0.4 * u - 0.02, Y + 0.84, 0.04, 0.04, 1.2, 4.4, TIMBER, 0);
  // dressed blocks stacked at the front, ready to go
  blocks(g, X + 1.12, Y + 1.36, 3, idle ? 1 : 2, CUT);
  for (const [u, v] of [[0.3, 1.82], [0.12, 1.5]]) rock(g, p(X + u, Y + v));
  if (idle) toolsDown(g, X + 0.66, Y + 1.24);
  else {
    // the mallet man, his mallet raised over a wedge
    const m = p(X + 0.62, Y + 1.24);
    fig(g, X + 0.62, Y + 1.24, 'citizen', 0, 0.9);
    g.line(U(m, 8.6), [m[0] + 4.6, m[1] - 14], WOOD, 0.7);
    g.poly([[m[0] + 3.4, m[1] - 15.4], [m[0] + 6.2, m[1] - 14.2], [m[0] + 5.6, m[1] - 12.4], [m[0] + 2.8, m[1] - 13.6]], TIMBER[1], { outline: true });
    // the lever man, prising the split block
    const l = p(X + 0.5, Y + 1.0);
    fig(g, X + 0.46, Y + 1.04, 'citizen', 0, 0.9);
    g.line([l[0] + 2, l[1] - 7], [l[0] + 9, l[1] + 1], WOOD, 0.8);
  }
  pennant(g, U(p(X + 1.9, Y + 1.02), 0), 11, SUPPLY_TINT);
}

// How many rows of bricks lie drying at a working brickworks: 1 under half staffed, 2 under fully, 3 fully staffed.
// An idle one (nobody at work) has its own slot.
export function brickworksStage(b) {
  const need = BUILDINGS.brickworks.workers, staff = b.staff || 0;
  if (staff * 2 < need) return 1;
  return staff < need ? 2 : 3;
}

// Brickworks: the moulding floor under a green reed shade with a moulder at work, a clay heap and a water trough,
// rows of fresh bricks drying in the sun (one to three rows: brickworksStage), a stack of fired bricks, and a tall
// tapered kiln glowing at its stoke hole (the ambient layer adds its smoke, spec 5.6). Idle: a few old bricks, the
// kiln cold, the mould on the ground and nobody at work.
export function brickworks(g, X, Y, rows = 3, idle = false) {
  g.poly(quad(X + 0.06, Y + 0.06, 1.88, 1.88, 0), '#E3CFA0', { outline: true });
  // the clay heap and the trough at the back left
  const c = p(X + 0.36, Y + 0.34);
  g.ell([c[0] + 2, c[1] + 0.6], 7, 2.4, SHADOW, { alpha: 0.14 });
  g.path([['M', [c[0] - 7, c[1]]], ['Q', [c[0] - 1, c[1] - 9], [c[0] + 6, c[1] + 0.4]], ['Z']], '#9A6A48', { outline: true });
  g.path([['M', [c[0] - 4, c[1] - 2]], ['Q', [c[0] - 1, c[1] - 7], [c[0] + 2, c[1] - 2.4]]], 'none', { stroke: '#B8865C', strokeWidth: 0.8 });
  const Tr = box(g, X + 0.64, Y + 0.14, 0.5, 0.2, 2, 0, TIMBER, 0);
  g.poly(quad(X + 0.68, Y + 0.17, 0.42, 0.14, 2), '#4FB3B5');
  qd(g, Tr.L, 0, 1, 1.4, 2, '#86705E', { alpha: 0.6 });
  // the kiln: a tall tapered mud drum at the back right
  const K = tb(g, X + 1.26, Y + 0.16, 0.6, 0.6, 14, 0, 0.12, MUD2);
  qd(g, K.L, 0.34, 0.66, 0.4, 4.4, '#3A2420');
  if (!idle) {
    qd(g, K.L, 0.4, 0.6, 0.6, 3, '#E07B39');
    qd(g, K.L, 0.45, 0.55, 0.6, 1.8, GOLD);
  }
  for (const s of [4.2, 8.4, 12.2]) qd(g, K.R, 0, 1, s, s + 0.5, MUD[2], { alpha: 0.7 });
  g.poly(quad(X + 1.46, Y + 0.36, 0.2, 0.2, 14), '#4A3030');
  // the moulding floor under its shade
  awn(g, X + 0.18, Y + 0.62, 0.7, 0.5, 6.4, GREEN, GREEN_DARK, '#E9DFA8');
  box(g, X + 0.3, Y + 0.76, 0.42, 0.22, 1.6, 0, TIMBER, 0);                                            // the moulding bench
  if (idle) box(g, X + 0.62, Y + 1.12, 0.16, 0.1, 0.8, 0, TIMBER, 0);                                   // the mould, set down
  else {
    fig(g, X + 0.52, Y + 1.06, 'citizen', 0, 0.85);
    g.poly(quad(X + 0.36, Y + 0.8, 0.16, 0.1, 1.6), MUD[1]);
  }
  // fired bricks stacked by the kiln
  const fired = idle ? 1 : 3;
  for (let k = 0; k < fired; k++) box(g, X + 1.32, Y + 0.92, 0.42, 0.26, 1.3, k * 1.3, ['#E2A06E', '#C98552', '#A07466'], k === fired - 1 ? undefined : 0);
  // rows of fresh bricks drying in the sun along the front
  const n = idle ? 0 : rows;
  for (let r = 0; r < 3; r++) {
    const v = Y + 1.32 + r * 0.2;
    const shown = r < n ? 7 : (idle && r === 0 ? 3 : 0);
    for (let i = 0; i < shown; i++) box(g, X + 0.16 + i * 0.24, v, 0.15, 0.1, 1.1, 0, MUD, 0);
  }
  if (!idle) fig(g, X + 1.84, Y + 1.36, 'hauler', 0, 0.85);
  pots(g, p(X + 1.62, Y + 1.84), 2);
  pennant(g, U(p(X + 1.9, Y + 0.12), 0), 12, SUPPLY_TINT);
}

const slot = (height, shadows, draw) => ({ w: 2, d: 2, height, bounds: boundsFor(2, 2, height), shadows, draw });
const GUILD_SHADOWS = [[0.12, 0.12, 1.0, 0.7, 11]], QUARRY_SHADOWS = [[0.06, 0.06, 1.86, 0.62, 12]], KILN_SHADOWS = [[1.26, 0.16, 0.6, 0.6, 12]];

export const SUPPLY_ART = {
  builders_guild: slot(20, GUILD_SHADOWS, (g, x, y) => buildersGuild(g, x, y)),
  'builders_guild.idle': slot(20, GUILD_SHADOWS, (g, x, y) => buildersGuild(g, x, y, true)),
  quarry: slot(20, QUARRY_SHADOWS, (g, x, y) => quarry(g, x, y)),
  'quarry.idle': slot(20, QUARRY_SHADOWS, (g, x, y) => quarry(g, x, y, true)),
  brickworks: slot(18, KILN_SHADOWS, (g, x, y) => brickworks(g, x, y, 3)),
  'brickworks.idle': slot(18, KILN_SHADOWS, (g, x, y) => brickworks(g, x, y, 0, true)),
};
for (let r = 1; r <= 3; r++) SUPPLY_ART[`brickworks.s${r}`] = slot(18, KILN_SHADOWS, (g, x, y) => brickworks(g, x, y, r));

// The slot a supply building shows (registry.js slotFor): '<type>.idle' when nobody works there (an idle one employs
// nobody, as does one with no road or no workers to be had), else its type, the brickworks by its drying rows.
export function supplySlot(b) {
  if (!(b.staff > 0) || b.paused) return `${b.type}.idle`;
  return b.type === 'brickworks' ? `brickworks.s${brickworksStage(b)}` : b.type;
}
