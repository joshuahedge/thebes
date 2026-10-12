// The seven monuments (spec 5.1, 5.7; rulings 182, 183, 221, 257), drawn live from their building's site every frame
// (src/render/monuments.js drawMonument), never from the sprite cache. A site is founded as stakes and cords on a paved
// apron with a stockpile corner; its courses rise block by block (a block is BLOCK_UNITS units, so with one full crew at
// 1x a new block shows at least every 5 s); a mudbrick ramp climbs the face towards the viewer as the courses rise on a
// mastaba or a pyramid, timber scaffolding round an obelisk or the colossus. Finished, the ramp, stakes and scaffold go:
// a pyramid stands in smooth white casing with a gold capstone, the large obelisk with a gilded tip, the colossus is
// painted, a mastaba is a stepped whitewashed bench. The apron stays, so a neighbour's drawing never reaches the body
// (spec 5.7, depth sorting). Every function here is a pure function of the building: a reload shows the same scene.
//
// The look of a site is siteLook(b): { type, n, course, frac, blocks, laid, done, stock, crews }. The live draw passes
// it with the moving parts (the newest block's fade and drop) to drawSite; drawFinished draws the finished monument
// (also the card's thumbnail and the fallback sprite). Heights are in art px, places in tiles.
import { box, tb, qd, p, U, quad, groundShadow } from './primitives.js';
import { WASH, WASH2, MUD, MUD2, STONE, GOLDC, TEAL, TEAL_DARK, BLUE, RED, GOLD, WOOD, DOOR, OUTLINE, INK } from './palette.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT } from '../../data/monuments.js';
import { boundsFor } from '../iso.js';

export const BLOCK_UNITS = 5;                               // units of material a block stands for (spec 5.7: a block every 5 s)
export const CORE = ['#EFDDB0', '#DCC493', '#B4A29E'];      // the pyramids' limestone core blocks, warm under the casing
const CORE2 = ['#ECD8A8', '#D7BE8C', '#AE9C98'];            // every other course a shade deeper, so the courses read
export const CASING = ['#FBF7EE', '#F1E9DC', '#CBC0D2'];    // the white casing: brighter than whitewash
export const SANDSTONE = ['#E8CC94', '#D2AE72', '#A88E7E'];
const APRON = '#E9DCC0', APRON_EDGE = '#CDBB98', JOINT = '#9C8A76', CORD = '#7A5E44';
const TIMBER = ['#C9A26A', '#A8814E', '#86705E'];
const RAMP = ['#E6C690', '#D6B07A', '#AC9080'];

// Each kind's look: its family, finished height (art px), and the apron's width round the body (tiles).
export const MONUMENT_LOOK = {
  obelisk_small: { family: 'obelisk', height: 40, margin: 0.18, shaft: 30, base: 0.2 },
  obelisk_large: { family: 'obelisk', height: 62, margin: 0.14, shaft: 48, base: 0.24 },
  colossus: { family: 'colossus', height: 46, margin: 0.2 },
  mastaba_small: { family: 'mastaba', height: 18, margin: 0.3 },
  mastaba_large: { family: 'mastaba', height: 24, margin: 0.34 },
  pyramid_small: { family: 'pyramid', height: 54, margin: 0.34 },
  pyramid_great: { family: 'pyramid', height: 100, margin: 0.38 },
};

// The blocks of course i of a kind: one per BLOCK_UNITS units of its recipe.
export function blocksIn(type, i) {
  const c = MONUMENTS[type].courses[Math.min(i, MONUMENTS[type].courses.length - 1)];
  return Math.max(1, Math.ceil((c.stone + c.bricks) / BLOCK_UNITS));
}

// What the scene shows, from the building alone: courses done, the share of the course under way and its blocks laid,
// finished or not, the stockpile and the crews. A building with no site (a card) is finished.
export function siteLook(b) {
  const m = MONUMENTS[b.type], n = m.courses.length, s = b.site;
  if (!s) return { type: b.type, n, course: n, frac: 0, blocks: 1, laid: 0, done: true, stock: { stone: 0, bricks: 0 }, crews: 0 };
  const done = s.done !== null && s.done !== undefined;
  const course = done ? n : Math.min(n, s.course || 0);
  let frac = 0;
  if (course < n) {
    const c = m.courses[course], need = c.stone + c.bricks, laid = ((s.laid && s.laid.stone) || 0) + ((s.laid && s.laid.bricks) || 0);
    frac = need > 0 ? Math.min(1, Math.max(0, laid / need)) : 0;
  }
  const blocks = blocksIn(b.type, course);
  return {
    type: b.type, n, course, frac, blocks, laid: Math.floor(frac * blocks + 1e-9), done,
    stock: { stone: (s.stock && s.stock.stone) || 0, bricks: (s.stock && s.stock.bricks) || 0 }, crews: (s.crews || []).length,
  };
}

// The body's rectangle inside the footprint (the apron round it), in tiles from the footprint's origin.
export function bodyOf(type, w, d) {
  const m = MONUMENT_LOOK[type].margin;
  return { x: m, y: m, w: w - 2 * m, d: d - 2 * m };
}

// The height a site stands to now (art px): the courses laid, the scaffold over an obelisk or the colossus; finished,
// the kind's full height. The markers stand their stems on it and the see-through fade measures it.
export function builtHeight(type, look) {
  const L = MONUMENT_LOOK[type];
  if (look.done) return L.height;
  const share = (look.course + look.laid / look.blocks) / look.n;
  if (L.family === 'obelisk') return 4 + L.shaft * share + 4;
  if (L.family === 'pyramid') return L.height * 0.9 * share;
  if (L.family === 'mastaba') return L.height * Math.min(1, share * look.n / Math.max(1, look.n - 1));
  return L.height * share + 4;
}

// ── shared pieces ──
//
// The frame budget (spec 5.7: three sites within 1 ms) rules out per-face gradients and an outline stroke per face: the
// faces here are plain fills, and their edges and joints are gathered in an `ink` and stroked once a layer (inkFor,
// flush). A layer is a part of the scene no later part of it overlaps on screen, so the deferred lines never cross a
// nearer face: the body's courses (each inset behind the one below), then the ramp, then the stockpile.

const inkFor = () => ({ joint: [], light: [], dark: [] });
function flush(g, ink) {
  if (ink.joint.length) g.stroke(ink.joint, JOINT, 0.45, 0.45);
  if (ink.dark.length) g.stroke(ink.dark, OUTLINE, 0.6, 0.35);
  if (ink.light.length) g.stroke(ink.light, '#FFFFFF', 0.6, 0.55);
  ink.joint.length = 0; ink.dark.length = 0; ink.light.length = 0;
}

// A block with plain faces (tapered by i at the top), its top edges and front corner gathered into the ink.
function slab(g, x, y, w, d, h, z, i, C, ink) {
  const F = tb(g, x, y, w, d, h, z, i, C, 0);
  ink.light.push(['M', F.L(0, h)], ['L', F.L(1, h)], ['L', F.R(0, h)]);
  ink.dark.push(['M', F.L(1, 0)], ['L', F.L(1, h)]);
  return F;
}

// A block drawn at an alpha (the newest block fading in): three plain faces.
function alphaBox(g, x, y, w, d, h, z, C, alpha) {
  if (alpha <= 0) return;
  g.poly([U(p(x, y + d), z), U(p(x + w, y + d), z), U(p(x + w, y + d), z + h), U(p(x, y + d), z + h)], C[1], { alpha });
  g.poly([U(p(x + w, y), z), U(p(x + w, y + d), z), U(p(x + w, y + d), z + h), U(p(x + w, y), z + h)], C[2], { alpha });
  g.poly(quad(x, y, w, d, z + h), C[0], { alpha });
}

// Block joints on a block's two faces: vertical joints every `cell` tiles (offset by half a block on odd courses).
function joints(ink, F, w, d, h, cell, odd) {
  for (const [face, len] of [[F.L, w], [F.R, d]]) {
    const n = Math.max(1, Math.round(len / cell)), step = 1 / n;
    for (let k = odd ? 0.5 : 1; k < n; k++) ink.joint.push(['M', face(k * step, 0)], ['L', face(k * step, h)]);
  }
}

// The paved apron over the whole footprint: an edge, the paving, and its joints a tile apart.
function apron(g, x, y, w, d) {
  g.poly(quad(x + 0.01, y + 0.01, w - 0.02, d - 0.02, 0), APRON_EDGE);
  g.poly(quad(x + 0.05, y + 0.05, w - 0.1, d - 0.1, 0), APRON);
  const segs = [];
  for (let u = 1; u < w - 0.1; u += 1) segs.push(['M', p(x + u, y + 0.05)], ['L', p(x + u, y + d - 0.05)]);
  for (let v = 1; v < d - 0.1; v += 1) segs.push(['M', p(x + 0.05, y + v)], ['L', p(x + w - 0.05, y + v)]);
  if (segs.length) g.stroke(segs, APRON_EDGE, 0.4, 0.6);
}

// Surveyor's stakes and cords round the body, while nothing is laid: `front` false draws the two back sides (before the
// body), true the two front sides (after it, so the cords lie over the apron in front of the body).
function stakes(g, x, y, B, front) {
  const e = 0.07, x0 = x + B.x - e, y0 = y + B.y - e, x1 = x + B.x + B.w + e, y1 = y + B.y + B.d + e, z = 2.4;
  const corners = front ? [[x1, y1], [x0, y1], [x1, y0]] : [[x0, y0]];
  const sides = front ? [[[x0, y1], [x1, y1]], [[x1, y0], [x1, y1]]] : [[[x0, y0], [x1, y0]], [[x0, y0], [x0, y1]]];
  const segs = [];
  for (const [a, b] of sides) segs.push(['M', U(p(a[0], a[1]), z)], ['L', U(p(b[0], b[1]), z)]);
  g.stroke(segs, CORD, 0.45, 0.85);
  const posts = [];
  for (const [cx, cy] of corners) { const q = p(cx, cy); posts.push(['M', q], ['L', U(q, 4)]); }
  g.stroke(posts, WOOD, 0.8, 1);
}

// The stockpile in four steps of each material (none, under a third of the site's room, under two thirds, more):
// dressed blocks and stacks of bricks on the apron, at (sx, sy) and along +y.
export function stockStep(amount, room) {
  if (!(amount > 0)) return 0;
  const f = amount / room;
  return f < 1 / 3 ? 1 : f < 2 / 3 ? 2 : 3;
}
const STOCK_STONE = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1]];   // [u, v, layer], in blocks
function stockpile(g, sx, sy, look, size) {
  const room = MONUMENT.stockPerCrew * MONUMENTS[look.type].crews;
  const st = stockStep(look.stock.stone, room), br = stockStep(look.stock.bricks, room);
  const b = 0.2 * size, h = 3.4 * size, ink = inkFor();
  for (const [u, v, k] of STOCK_STONE.slice(0, [0, 2, 4, 6][st])) slab(g, sx + u * b, sy + v * b, b * 0.92, b * 0.92, h, k * h, 0, CORE, ink);
  for (let i = 0; i < br; i++) {
    const F = slab(g, sx + 0.02, sy + 2.2 * b + i * 0.16 * size, 0.24 * size, 0.13 * size, 3 * size, 0, 0, MUD, ink);
    for (const s of [1, 2]) ink.joint.push(['M', F.L(0, s * size)], ['L', F.L(1, s * size)], ['L', F.R(0, s * size)]);
  }
  flush(g, ink);
}

// A course under way: its blocks laid back to front, row by row (rows along x, advancing towards +y): the settled
// blocks as at most two blocks and their joints, then the newest block on its own, fading in and settling (`newest`
// { alpha, drop } or null when it has settled). (cx, cy, cw, cd) is the course's rectangle, z its base, h its height.
function courseUnderWay(g, cx, cy, cw, cd, z, h, look, newest, C, ink) {
  const N = look.blocks;
  const cols = Math.max(1, Math.round(Math.sqrt((N * cw) / Math.max(0.01, cd)))), rows = Math.ceil(N / cols);
  const bw = cw / cols, bd = cd / rows;
  const settled = newest ? Math.max(0, look.laid - 1) : look.laid;
  const full = Math.min(rows, Math.floor(settled / cols)), rem = settled - full * cols;
  const big = bw >= 0.12 && bd >= 0.12;
  if (full > 0) {
    const F = slab(g, cx, cy, cw, full * bd, h, z, 0, C, ink);
    if (big) {
      joints(ink, F, cw, full * bd, h, bw, look.course % 2);
      for (let r = 1; r < full; r++) ink.joint.push(['M', U(p(cx, cy + r * bd), z + h)], ['L', U(p(cx + cw, cy + r * bd), z + h)]);
    }
  }
  if (rem > 0) {
    const F = slab(g, cx, cy + full * bd, rem * bw, bd, h, z, 0, C, ink);
    if (big) joints(ink, F, rem * bw, bd, h, bw, 0);
  }
  if (newest && look.laid > 0) {
    flush(g, ink);                                                          // the fading block lies over its neighbours' edges
    const i = look.laid - 1, r = Math.floor(i / cols), c = i - r * cols;
    alphaBox(g, cx + c * bw, cy + r * bd, bw, bd, h, z + newest.drop, C, newest.alpha);
  }
}

// A mudbrick ramp along the +y face (the side towards the viewer, spec 5.7): a causeway `wide` tiles across with its
// outer edge at yo, its foot on the apron at xf and its top at xt (further along +x) at z1 art px, and at the top a
// landing back to the face it serves (at y = yi). Three faces show: the sloping top, the outer side and the high end;
// then the landing's top and front. Returns its geometry, for the gangs.
function ramp(g, xf, xt, yo, wide, yi, z1) {
  if (z1 <= 0.5) return null;
  const yr = yo - wide;
  g.poly([U(p(xf, yr), 0), U(p(xt, yr), z1), U(p(xt, yo), z1), U(p(xf, yo), 0)], RAMP[0]);
  g.poly([U(p(xf, yo), 0), U(p(xt, yo), 0), U(p(xt, yo), z1)], RAMP[1]);
  g.poly([U(p(xt, yr), 0), U(p(xt, yo), 0), U(p(xt, yo), z1), U(p(xt, yr), z1)], RAMP[2]);
  const segs = [];
  for (let s = 2.5; s < z1; s += 2.5) segs.push(['M', U(p(xf + (xt - xf) * (s / z1), yo), s)], ['L', U(p(xt, yo), s)], ['L', U(p(xt, yr), s)]);
  g.stroke(segs, MUD[2], 0.4, 0.4);
  g.stroke([['M', U(p(xf, yo), 0)], ['L', U(p(xt, yo), z1)], ['L', U(p(xt, yr), z1)]], '#F3DDB4', 0.6, 0.8);   // the lit edges of its top
  if (yi < yr - 0.02) {                                                     // the landing: a brick slab back to the face
    const ink = inkFor();
    slab(g, xt - 0.34, yi, 0.34, yr - yi + 0.02, 2.4, z1 - 2.4, 0, RAMP, ink);
    flush(g, ink);
  }
  return { xf, xt, yo, yr, z1, landing: yi };
}

// Timber scaffolding round a tall narrow body (an obelisk, the colossus): poles to `top`, planks every 8 px; the back
// pole and planks (before the body) or the three front poles and planks (after it).
function scaffold(g, x0, y0, w, d, top, back) {
  const e = 0.06, xs = [x0 - e, x0 + w + e], ys = [y0 - e, y0 + d + e];
  const poles = back ? [[xs[0], ys[0]]] : [[xs[1], ys[0]], [xs[0], ys[1]], [xs[1], ys[1]]];
  const segs = [];
  for (const [px, py] of poles) { const q = p(px, py); segs.push(['M', q], ['L', U(q, top)]); }
  g.stroke(segs, WOOD, 0.8, 1);
  const planks = [];
  for (let z = 8; z < top - 1; z += 8) {
    if (back) planks.push(['M', U(p(xs[0], ys[0]), z)], ['L', U(p(xs[1], ys[0]), z)], ['M', U(p(xs[0], ys[0]), z)], ['L', U(p(xs[0], ys[1]), z)]);
    else planks.push(['M', U(p(xs[0], ys[1]), z)], ['L', U(p(xs[1], ys[1]), z)], ['L', U(p(xs[1], ys[0]), z)]);
  }
  if (planks.length) g.stroke(planks, TIMBER[back ? 2 : 1], 1, 1);
}

// A triangular face of a finished monument, shaded as the mock-ups' gradient would be (lighter towards its top, a shade
// along its foot) from flat fills: the face, three faint pale bands over its upper part, two faint shades along its foot.
function shadedFace(g, foot0, foot1, top, C) {
  g.poly([foot0, foot1, top], C);
  const at = (q, f) => [q[0] + (top[0] - q[0]) * f, q[1] + (top[1] - q[1]) * f];
  for (const f of [0.35, 0.6, 0.8]) g.poly([at(foot0, f), at(foot1, f), top], '#FFFFFF', { alpha: 0.06 });
  for (const f of [0.08, 0.18]) g.poly([foot0, foot1, at(foot1, f), at(foot0, f)], INK, { alpha: 0.035 });
}

// ── pyramids ──

function pyramidGeom(type, x, y, w) {
  const L = MONUMENT_LOOK[type], B = bodyOf(type, w, w), n = MONUMENTS[type].courses.length;
  const core = L.height * 0.9, ch = core / n, step = (B.w / 2) * 0.9 / n;
  return { L, B, n, ch, step, bx: x + B.x, by: y + B.y, side: B.w };
}

function pyramidSite(g, x, y, w, look, newest) {
  const { n, ch, step, bx, by, side } = pyramidGeom(look.type, x, y, w);
  const ink = inkFor();
  for (let i = 0; i < Math.min(look.course, n); i++) {
    const k = i * step, F = slab(g, bx + k, by + k, side - 2 * k, side - 2 * k, ch, i * ch, 0, i % 2 ? CORE2 : CORE, ink);
    joints(ink, F, side - 2 * k, side - 2 * k, ch, 0.45, i % 2);
  }
  if (look.course < n && look.laid > 0) {
    const k = look.course * step;
    courseUnderWay(g, bx + k, by + k, side - 2 * k, side - 2 * k, look.course * ch, ch, look, newest, look.course % 2 ? CORE2 : CORE, ink);
  }
  flush(g, ink);
  // the ramp up the +y face from the left of the apron to the top of the courses laid, landing on the course under way
  const z1 = look.course * ch, k = Math.min(look.course, n - 1) * step;
  return ramp(g, x + 0.1, bx + side - k - (side - 2 * k) * 0.25, by + side + 0.26, 0.36, by + side - k, z1);
}

export function pyramidFinished(g, x, y, w, type) {
  const { L, bx, by, side } = pyramidGeom(type, x, y, w);
  const apex = U(p(bx + side / 2, by + side / 2), L.height);
  const A = p(bx, by + side), Bp = p(bx + side, by + side), C = p(bx + side, by);
  shadedFace(g, A, Bp, apex, CASING[1]);
  shadedFace(g, Bp, C, apex, CASING[2]);
  const segs = [];                                                           // the casing's courses, barely there
  for (let k = 1; k < 10; k++) {
    const f = k / 10, at = (q) => [q[0] + (apex[0] - q[0]) * f, q[1] + (apex[1] - q[1]) * f];
    segs.push(['M', at(A)], ['L', at(Bp)], ['L', at(C)]);
  }
  g.stroke(segs, '#B8AAB8', 0.4, 0.22);
  g.stroke([['M', A], ['L', apex], ['L', C]], OUTLINE, 0.6, 0.32);
  g.line(Bp, apex, '#FFFFFF', 0.8, 0.7);                                     // the lit edge
  // the gold capstone: the top eighth
  const t = 0.125, cap = (q) => [apex[0] + (q[0] - apex[0]) * t, apex[1] + (q[1] - apex[1]) * t];
  g.poly([cap(A), cap(Bp), apex], GOLDC[1]);
  g.poly([cap(Bp), cap(C), apex], GOLDC[2]);
  g.line(cap(Bp), apex, '#FFF4C8', 0.6, 0.9);
  return { apex, cap: [cap(A), cap(Bp), cap(C)] };
}

// ── mastabas ──

function mastabaGeom(type, x, y, w, d) {
  const L = MONUMENT_LOOK[type], B = bodyOf(type, w, d), n = MONUMENTS[type].courses.length;
  const tiers = n - 1, ch = L.height / tiers, step = 0.1;
  return { L, B, n, tiers, ch, step, bx: x + B.x, by: y + B.y };
}
// Tier i of a mastaba (0 at the bottom): its rectangle; its walls are battered, narrowing a little to the top.
function tier(G, i) { const k = i * G.step; return [G.bx + k, G.by + k, G.B.w - 2 * k, G.B.d - 2 * k]; }

// The core rises in mudbrick tiers, then the last course, the stone facing, goes on from the ground up in whitewash.
function mastabaSite(g, x, y, w, d, look, newest) {
  const G = mastabaGeom(look.type, x, y, w, d), ink = inkFor();
  const facing = look.course >= G.tiers;
  const Zf = facing ? G.L.height * (look.laid / look.blocks) : 0;
  for (let i = 0; i < Math.min(look.course, G.tiers); i++) {
    const [tx, ty, tw, td] = tier(G, i);
    const F = slab(g, tx, ty, tw, td, G.ch, i * G.ch, 0.04, MUD2, ink);
    joints(ink, F, tw, td, G.ch, 0.3, i % 2);
    const hf = Math.min(G.ch, Zf - i * G.ch);
    if (hf > 0.2) slab(g, tx, ty, tw, td, hf, i * G.ch, 0.04 * (hf / G.ch), WASH, ink);
  }
  if (!facing && look.laid > 0) {
    const [tx, ty, tw, td] = tier(G, look.course);
    courseUnderWay(g, tx, ty, tw, td, look.course * G.ch, G.ch, look, newest, MUD2, ink);
  }
  flush(g, ink);
  const c = Math.min(look.course, G.tiers), z1 = c * G.ch, k = Math.min(c, G.tiers - 1) * G.step;
  return ramp(g, x + 0.1, G.bx + G.B.w - k - 0.35, G.by + G.B.d + 0.22, 0.3, G.by + G.B.d - k, z1);
}

export function mastabaFinished(g, x, y, w, d, type) {
  const G = mastabaGeom(type, x, y, w, d), ink = inkFor();
  let F0 = null;
  for (let i = 0; i < G.tiers; i++) {
    const [tx, ty, tw, td] = tier(G, i);
    const F = slab(g, tx, ty, tw, td, G.ch, i * G.ch, 0.04, i % 2 ? WASH2 : WASH, ink);
    if (i === 0) F0 = F;
  }
  flush(g, ink);
  qd(g, F0.L, 0.62, 0.74, 0, G.ch - 1.6, DOOR);                             // the false door and its lintel
  qd(g, F0.L, 0.58, 0.78, G.ch - 1.6, G.ch - 0.8, RED, { alpha: 0.8 });
  qd(g, F0.L, 0.2, 0.3, 0, G.ch * 0.6, '#E2D6C2');                           // the offering niche
  const [tx, ty, tw, td] = tier(G, G.tiers - 1);
  g.line(U(p(tx, ty + td), G.L.height), U(p(tx + tw, ty + td), G.L.height), TEAL, 0.9);   // a teal line along the cornice
  box(g, G.bx + G.B.w * 0.55, G.by + G.B.d + 0.06, 0.24, 0.14, 2, 0, STONE, 0);   // the offering table
}

// ── obelisks ──

function obeliskGeom(type, x, y) {
  const L = MONUMENT_LOOK[type], n = MONUMENTS[type].courses.length, ped = 4;
  return { L, n, cx: x + 0.5, cy: y + 0.5, ped, seg: L.shaft / n, base: L.base, topW: L.base * 0.66 };
}
const shaftW = (G, z) => G.base + (G.topW - G.base) * (z / G.L.shaft);

// A piece of the shaft from z0, h tall, tapering with the whole shaft.
function obeliskShaft(g, G, z0, h, C, ink, newest = null) {
  const w0 = shaftW(G, z0), w1 = shaftW(G, z0 + h);
  if (newest) return alphaBox(g, G.cx - w0 / 2, G.cy - w0 / 2, w0, w0, h, G.ped + z0 + newest.drop, C, newest.alpha);
  return slab(g, G.cx - w0 / 2, G.cy - w0 / 2, w0, w0, h, G.ped + z0, (w0 - w1) / 2, C, ink);
}

function obeliskSite(g, x, y, look, newest) {
  const G = obeliskGeom(look.type, x, y), ink = inkFor();
  slab(g, G.cx - 0.24, G.cy - 0.24, 0.48, 0.48, G.ped, 0, 0, STONE, ink);
  flush(g, ink);
  const built = (look.course + look.laid / look.blocks) * G.seg;
  scaffold(g, G.cx - G.base / 2, G.cy - G.base / 2, G.base, G.base, G.ped + built + 6, true);
  for (let i = 0; i < Math.min(look.course, G.n); i++) obeliskShaft(g, G, i * G.seg, G.seg, STONE, ink);
  if (look.course < G.n && look.laid > 0) {
    const per = G.seg / look.blocks, settled = newest ? look.laid - 1 : look.laid;
    if (settled > 0) obeliskShaft(g, G, look.course * G.seg, settled * per, STONE, ink);
    flush(g, ink);
    if (newest) obeliskShaft(g, G, look.course * G.seg + settled * per, per, STONE, ink, newest);
  }
  flush(g, ink);
  scaffold(g, G.cx - G.base / 2, G.cy - G.base / 2, G.base, G.base, G.ped + built + 6, false);
  return null;
}

export function obeliskFinished(g, x, y, type) {
  const G = obeliskGeom(type, x, y), ink = inkFor();
  const P = slab(g, G.cx - 0.24, G.cy - 0.24, 0.48, 0.48, G.ped, 0, 0, STONE, ink);
  flush(g, ink);
  qd(g, P.L, 0, 1, 1.2, 2.2, TEAL); qd(g, P.R, 0, 1, 1.2, 2.2, TEAL_DARK);
  const F = obeliskShaft(g, G, 0, G.L.shaft, STONE, ink);
  flush(g, ink);
  for (const s of [G.L.shaft * 0.62, G.L.shaft * 0.84]) {                  // painted bands
    qd(g, F.L, 0, 1, s, s + 1, TEAL); qd(g, F.R, 0, 1, s, s + 1, TEAL_DARK);
  }
  qd(g, F.L, 0, 1, G.L.shaft * 0.84 + 1, G.L.shaft * 0.84 + 1.8, RED); qd(g, F.R, 0, 1, G.L.shaft * 0.84 + 1, G.L.shaft * 0.84 + 1.8, RED, { alpha: 0.75 });
  const glyphs = [];
  for (let s = 4; s < G.L.shaft * 0.58; s += 3.2) glyphs.push(['M', F.L(0.35, s)], ['L', F.L(0.65, s + 0.6)]);
  g.stroke(glyphs, '#9C8C9E', 0.5, 0.55);                                    // a column of carved signs
  const top = G.ped + G.L.shaft, hw = G.topW / 2, tipH = G.L.height - top;
  const a = U(p(G.cx - hw, G.cy + hw), top), b = U(p(G.cx + hw, G.cy + hw), top), c = U(p(G.cx + hw, G.cy - hw), top), t = U(p(G.cx, G.cy), top + tipH);
  const gilded = MONUMENTS[type].extra && MONUMENTS[type].extra.kind === 'gilding';
  g.poly([a, b, t], gilded ? GOLDC[1] : STONE[1]);
  g.poly([b, c, t], gilded ? GOLDC[2] : STONE[2]);
  g.line(b, t, gilded ? '#FFF4C8' : '#FFFFFF', 0.6, 0.9);
  return { apex: t, cap: gilded ? [a, b, c] : null };
}

// ── the colossus: a seated king facing +y, built of blocks so a site shows it rising course by course ──

// Each part: [x, y, w, d, z, h], in a 2x2 footprint's tiles and art px, back to front.
const COLOSSUS = [
  [0.22, 0.2, 1.56, 1.6, 0, 9],         // 0 the plinth
  [0.6, 0.5, 0.8, 0.32, 9, 23],         // 1 the throne's back
  [0.72, 0.82, 0.56, 0.6, 9, 11],       // 2 the lap and shins
  [0.76, 0.66, 0.48, 0.3, 20, 15],      // 3 the body
  [0.64, 0.86, 0.12, 0.5, 20, 3.4],     // 4 the left forearm on the knee
  [1.24, 0.86, 0.12, 0.5, 20, 3.4],     // 5 the right forearm
  [0.76, 0.62, 0.48, 0.36, 33, 10],     // 6 the head in its headcloth
  [0.95, 0.98, 0.1, 0.08, 30, 5],       // 7 the beard
  [0.84, 0.68, 0.32, 0.24, 43, 2.6],    // 8 the gold band of the crown
];
const colossusZ = (type, look) => MONUMENT_LOOK[type].height * (look.course + look.laid / look.blocks) / look.n;

// The parts overlap on screen, so each part's edges are stroked as it is drawn.
function colossusSite(g, x, y, look, newest) {
  const H = MONUMENT_LOOK[look.type].height, Z = colossusZ(look.type, look), per = H / look.n / look.blocks;
  const Zs = newest ? Math.max(0, Z - per) : Z;                              // the newest block's slab fades in on top
  const ink = inkFor();
  scaffold(g, x + 0.5, y + 0.42, 1.0, 1.0, Math.min(H, Z) + 6, true);
  for (const [px, py, pw, pd, z, h] of COLOSSUS) {
    if (z < Zs) {
      const hh = Math.min(h, Zs - z), F = slab(g, x + px, y + py, pw, pd, hh, z, 0, SANDSTONE, ink);
      if (hh > 8) ink.joint.push(['M', F.L(0, 8)], ['L', F.L(1, 8)]);
      flush(g, ink);
    }
    const lo = Math.max(z, Zs), hi = Math.min(z + h, Z);
    if (newest && hi > lo) alphaBox(g, x + px, y + py, pw, pd, hi - lo, lo + newest.drop, SANDSTONE, newest.alpha);
  }
  scaffold(g, x + 0.5, y + 0.42, 1.0, 1.0, Math.min(H, Z) + 6, false);
  return null;
}

export function colossusFinished(g, x, y) {
  const ink = inkFor();
  const parts = COLOSSUS.map(([px, py, pw, pd, z, h], i) => {
    const F = slab(g, x + px, y + py, pw, pd, h, z, i === 6 ? -0.02 : 0, i === 0 ? STONE : i === 8 ? GOLDC : SANDSTONE, ink);
    flush(g, ink);
    return F;
  });
  const [P, Th, , Tr, , , Hc] = parts;
  qd(g, P.L, 0, 1, 2.6, 4.4, TEAL); qd(g, P.R, 0, 1, 2.6, 4.4, TEAL_DARK);
  qd(g, P.L, 0, 1, 7.8, 9, GOLD); qd(g, P.R, 0, 1, 7.8, 9, GOLDC[2]);
  qd(g, P.L, 0.36, 0.64, 5, 7, BLUE, { alpha: 0.75 });                       // the king's name on the plinth
  qd(g, Th.R, 0, 1, 15, 17.4, BLUE, { alpha: 0.8 });
  qd(g, Tr.L, 0, 1, 11.4, 15, GOLD);                                         // the gold collar
  for (let s = 1; s < 11; s += 2.4) {                                        // the headcloth's blue stripes
    qd(g, Hc.L, 0, 0.24, s, s + 1.1, BLUE); qd(g, Hc.L, 0.76, 1, s, s + 1.1, BLUE);
    qd(g, Hc.R, 0, 1, s, s + 1.1, BLUE, { alpha: 0.85 });
  }
  qd(g, Hc.L, 0.3, 0.7, 1.2, 8.6, SANDSTONE[1]);                             // the face
  qd(g, Hc.L, 0.36, 0.46, 5.4, 6.4, DOOR); qd(g, Hc.L, 0.54, 0.64, 5.4, 6.4, DOOR);
  qd(g, Hc.L, 0.44, 0.56, 2.4, 3, RED, { alpha: 0.7 });
  return { apex: U(p(x + 1, y + 0.8), 45), cap: null };
}

// ── the scene ──

// The ground shadow, as tall as what stands now (at most 12 px, so it never reaches far over a neighbour).
function shadow(g, x, y, type, w, d, h) {
  const B = bodyOf(type, w, d);
  if (h > 0.5) groundShadow(g, x + B.x, y + B.y, B.w, B.d, Math.min(12, h));
}

// A site under way at (x, y), w x d (the building's own, rotation applied). `newest` is the newest block's
// { alpha, drop } while it fades in, or null. Returns the ramp's geometry (for the gangs), or null.
export function drawSite(g, x, y, w, d, look, newest = null) {
  const type = look.type, fam = MONUMENT_LOOK[type].family, B = bodyOf(type, w, d);
  apron(g, x, y, w, d);
  if (look.course > 0) shadow(g, x, y, type, w, d, builtHeight(type, look));   // once a whole course stands on the body
  const founded = look.course === 0;                                        // the stakes stand until the first course is laid
  if (founded) stakes(g, x, y, B, false);
  let r = null;
  if (fam === 'pyramid') r = pyramidSite(g, x, y, w, look, newest);
  else if (fam === 'mastaba') r = mastabaSite(g, x, y, w, d, look, newest);
  else if (fam === 'obelisk') r = obeliskSite(g, x, y, look, newest);
  else r = colossusSite(g, x, y, look, newest);
  if (founded) stakes(g, x, y, B, true);
  if (fam === 'obelisk') stockpile(g, x + 0.76, y + 0.36, look, 0.5);
  else if (fam === 'colossus') stockpile(g, x + 1.74, y + 0.36, look, 0.6);
  else stockpile(g, x + B.x + B.w + 0.05, y + d * 0.45, look, Math.min(1, B.x / 0.3));
  return r;
}

// The finished monument at (x, y), w x d. Returns { apex, cap } (art px): where the gold's shine and sparkle go
// (cap null: no gold to shine on).
export function drawFinished(g, x, y, w, d, type) {
  const fam = MONUMENT_LOOK[type].family;
  apron(g, x, y, w, d);
  shadow(g, x, y, type, w, d, MONUMENT_LOOK[type].height);
  if (fam === 'pyramid') return pyramidFinished(g, x, y, w, type);
  if (fam === 'mastaba') { mastabaFinished(g, x, y, w, d, type); return { apex: null, cap: null }; }
  if (fam === 'obelisk') return obeliskFinished(g, x, y, type);
  return colossusFinished(g, x, y);
}

// The art slots (contract: the renderer draws these live through opts.live and never caches them; `draw` is the card's
// thumbnail and the fallback for a bare renderFrame: the finished monument). Ground shadows are drawn by the scene.
export const MONUMENT_ART = {};
for (const k of MONUMENT_KINDS) {
  const m = MONUMENTS[k], h = MONUMENT_LOOK[k].height;
  MONUMENT_ART[k] = { w: m.w, d: m.d, height: h, bounds: boundsFor(m.w, m.d, h), shadows: [], live: true, draw: (g, x, y) => drawFinished(g, x, y, m.w, m.d, k) };
}
