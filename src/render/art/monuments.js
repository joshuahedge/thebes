// The monuments (spec 5.1, 5.7; rulings 182, 183, 221, 257; from Stage 4.6 ten kinds and four styles), drawn live from their building's site every frame
// (src/render/monuments.js drawMonument), never from the sprite cache. A site is founded as stakes and cords on a paved
// apron with a stockpile corner; its courses rise block by block (a block is BLOCK_UNITS units, so with one full crew at
// 1x a new block shows at least every 5 s: 3 units at 2/3 a second); a mudbrick ramp climbs the face towards the viewer as the courses rise on a
// mastaba or a pyramid, timber scaffolding round an obelisk or the colossus. Finished, the ramp, stakes and scaffold go:
// a pyramid stands in smooth white casing with a gold capstone, the large obelisk with a gilded tip, the colossus is
// painted, a mastaba is a stepped whitewashed bench. The apron stays, so a neighbour's drawing never reaches the body
// (spec 5.7, depth sorting). Every function here is a pure function of the building: a reload shows the same scene.
//
// The look of a site is siteLook(b): { type, n, course, frac, blocks, laid, done, stock, crews }. The live draw passes
// it with the moving parts (the newest block's fade and drop) to drawSite; drawFinished draws the finished monument
// (also the card's thumbnail and the fallback sprite). Heights are in art px, places in tiles.
import { box, tb, qd, p, U, quad, groundShadow } from './primitives.js';
import { WASH, WASH2, MUD, MUD2, STONE, GOLDC, TEAL, TEAL_DARK, BLUE, RED, RED_DARK, GOLD, WOOD, DOOR, OUTLINE, INK } from './palette.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT } from '../../data/monuments.js';
import { MONUMENT_STYLE_IDS } from '../../data/wonders.js';
import { boundsFor } from '../iso.js';

export const BLOCK_UNITS = 3;                               // units of material a block stands for (spec 5.7: a block at least every 5 s at 1x; a full crew lays 2/3 of a unit a second)
// The pyramids' quarried limestone: paler and greyer than the sand it stands on, its shaded face a cool lavender-grey
// (spec 5.1), so a site is the brightest, heaviest thing in the view rather than a darker patch of desert.
export const CORE = ['#F8F0DE', '#EEE3CA', '#B9ACB6'];
const CORE2 = ['#F1E7D1', '#E4D7BC', '#ADA0AD'];            // every other course a shade deeper, so the courses read
export const CASING = ['#FBF7EE', '#F1E9DC', '#CBC0D2'];    // the white casing: brighter than whitewash
export const SANDSTONE = ['#E8CC94', '#D2AE72', '#A88E7E'];
const APRON = '#E3D3B2', APRON_EDGE = '#C7B28C', JOINT = '#9C8A76', CORD = '#7A5E44';
const TIMBER = ['#C9A26A', '#A8814E', '#86705E'];
const RAMP = ['#E6C690', '#D6B07A', '#AC9080'];
const RAMP_SIDE = '#B9957A', RAMP_BRICK = '#8E7060';       // the ramp's outer side, a lavender-brown, and its brick courses
// The rose granite of an obelisk's shaft (Pharaoh's obelisks stand warm pink-grey against the white houses).
const ROSE = ['#E9CFC4', '#D8B6A8', '#A98A94'];

// Each kind's look: its family, finished height (art px), and the apron's width round the body (tiles).
export const MONUMENT_LOOK = {
  obelisk_small: { family: 'obelisk', height: 40, margin: 0.18, shaft: 30, base: 0.2 },
  obelisk_large: { family: 'obelisk', height: 62, margin: 0.14, shaft: 48, base: 0.24 },
  colossus: { family: 'colossus', height: 46, margin: 0.2 },
  mastaba_small: { family: 'mastaba', height: 18, margin: 0.3 },
  mastaba_large: { family: 'mastaba', height: 24, margin: 0.34 },
  pyramid_small: { family: 'pyramid', height: 54, margin: 0.34 },
  pyramid_great: { family: 'pyramid', height: 100, margin: 0.38 },
  // Stage 4.6 (ruling 390-392): the great sphinx (a lion lying along x, built like the colossus from parts), the sun temple (a platform, two
  // pylons and a tall sun pillar crowned by a disc, from parts) and the step pyramid (five tiers of two courses, no casing).
  great_sphinx: { family: 'sphinx', height: 34, margin: 0.14 },
  sun_temple: { family: 'temple', height: 50, margin: 0.2 },
  step_pyramid: { family: 'step', height: 70, margin: 0.34 },
  // Version 6.0 (Track A, ruling 652): the great temple, five broad terraces (a stage each) and the shrine on top: the step family, lower and wider.
  great_temple: { family: 'step', height: 58, margin: 0.3 },
};

// ── the styles (Stage 4.6, ruling 343) ──
// A monument is founded in Whitewashed, Painted or Gilded (src/data/wonders.js MONUMENT_STYLES), or is 'classic': every monument from before
// Stage 4.6, which draws exactly as it did (its tones below are the old colours). TONES gives the colours a finished body and its accents are
// painted in; each family's drawing reads them, so a style is one set of colours, never a second drawing. Under every motion level they are
// still colours (nothing here moves). stone: the sandstone of a seated or lying figure; wall, wall2: whitewashed tiers (alternate courses);
// shaft: an obelisk's shaft; ped: its pedestal; a1, a2: the main and second band pairs (lit, shaded); r: the thin red band's pair; a3: a
// figure's name and stripes; collar: a figure's collar; stripe: a headcloth's stripes; door: a door's lintel; cap: a capstone's, a crown's or a
// disc's metal [top, lit, shaded] (a pyramid's capstone stays gold where it was paid for); gold: whether `cap` is gold (it shines).
const OCHRE = ['#EFC384', '#DCA45F', '#B38670'];
const OCHRE_PALE = ['#F6E2B8', '#E7CB96', '#BDA79A'];
const ORANGE_PAIR = ['#E07B39', '#B85F2A'];
export const TONES = {
  classic: { stone: SANDSTONE, wall: WASH, wall2: WASH2, shaft: ROSE, ped: STONE, a1: [TEAL, TEAL_DARK], a2: [GOLD, GOLDC[2]], r: [RED, RED_DARK], a3: BLUE, collar: GOLD, stripe: BLUE, door: RED, cap: GOLDC, gold: true },
  whitewashed: { stone: ['#F4ECDA', '#E8DCC4', '#BDB0BE'], wall: WASH, wall2: WASH2, shaft: ['#FBF6EA', '#F0E8DA', '#CDC1CF'], ped: STONE, a1: ['#C9BDD0', '#A99DB4'], a2: ['#DDD4C4', '#C2B8A8'], r: ['#C9BDD0', '#A99DB4'], a3: '#A59DB2', collar: '#E2D8C6', stripe: '#B7AAC6', door: '#8A7F94', cap: ['#FFFFFF', '#F3EBDD', '#CFC4D4'], gold: false },
  painted: { stone: OCHRE, wall: OCHRE_PALE, wall2: OCHRE, shaft: OCHRE, ped: OCHRE_PALE, a1: [TEAL, TEAL_DARK], a2: ORANGE_PAIR, r: ORANGE_PAIR, a3: TEAL, collar: '#E6A23C', stripe: TEAL, door: TEAL, cap: ['#E9A74B', '#D9892F', '#A9692C'], gold: true },
  gilded: { stone: SANDSTONE, wall: WASH, wall2: WASH2, shaft: ROSE, ped: STONE, a1: [GOLD, GOLDC[2]], a2: [GOLDC[0], GOLDC[1]], r: [GOLDC[0], GOLDC[1]], a3: GOLD, collar: GOLD, stripe: GOLD, door: GOLD, cap: GOLDC, gold: true },
};
// A style the art knows, else classic (a ghost, a card or a hand-made record may carry none).
export const styleOf = (style) => (MONUMENT_STYLE_IDS.includes(style) ? style : 'classic');

// The blocks of course i of a kind: one per BLOCK_UNITS units of its recipe.
export function blocksIn(type, i) {
  const c = MONUMENTS[type].courses[Math.min(i, MONUMENTS[type].courses.length - 1)];
  return Math.max(1, Math.ceil((c.stone + c.bricks) / BLOCK_UNITS));
}

// What the scene shows, from the building alone: courses done, the share of the course under way and its blocks laid,
// finished or not, the stockpile and the crews. A building with no site (a card) is finished.
export function siteLook(b) {
  const m = MONUMENTS[b.type], n = m.courses.length, s = b.site;
  const style = styleOf(b.style);
  if (!s) return { type: b.type, n, course: n, frac: 0, blocks: 1, laid: 0, done: true, stock: { stone: 0, bricks: 0 }, crews: 0, style };
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
    stock: { stone: (s.stock && s.stock.stone) || 0, bricks: (s.stock && s.stock.bricks) || 0 }, crews: (s.crews || []).length, style,
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
  if (L.family === 'step') return L.height * STEP_CORE * share;
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
  const yr = yo - wide, ym = yo - wide / 2;
  // the sloping top as a visible band: its near half pale, its far half a step darker, so it reads as a surface
  g.poly([U(p(xf, ym), 0), U(p(xt, ym), z1), U(p(xt, yo), z1), U(p(xf, yo), 0)], RAMP[0]);
  g.poly([U(p(xf, yr), 0), U(p(xt, yr), z1), U(p(xt, ym), z1), U(p(xf, ym), 0)], RAMP[1]);
  g.poly([U(p(xf, yo), 0), U(p(xt, yo), 0), U(p(xt, yo), z1)], RAMP_SIDE);    // the outer side, in shade
  g.poly([U(p(xt, yr), 0), U(p(xt, yo), 0), U(p(xt, yo), z1), U(p(xt, yr), z1)], RAMP[2]);
  // its mudbrick: a few courses along the side and the end, and the bricks' head joints staggered course by course
  const segs = [], heads = [], step = Math.max(2.6, z1 / 6), run = xt - xf;
  for (let s = step; s < z1 - 0.8; s += step) segs.push(['M', U(p(xf + run * (s / z1), yo), s)], ['L', U(p(xt, yo), s)], ['L', U(p(xt, yr), s)]);
  for (let s = 0, row = 0; s < z1 - step * 0.5; s += step, row++) {
    const top = Math.min(z1, s + step);
    for (let u = row % 2 ? 0.3 : 0.6; u < run; u += 0.6) if (z1 * (u / run) > top) heads.push(['M', U(p(xf + u, yo), s)], ['L', U(p(xf + u, yo), top)]);
  }
  g.stroke(segs, RAMP_BRICK, 0.45, 0.45);
  if (heads.length) g.stroke(heads, RAMP_BRICK, 0.4, 0.3);
  g.line(U(p(xf, ym), 0), U(p(xt, ym), z1), '#C9A26A', 0.4, 0.5);             // the line between the halves of its top
  g.stroke([['M', U(p(xf, yo), 0)], ['L', U(p(xt, yo), z1)], ['L', U(p(xt, yr), z1)]], '#F8E6C2', 0.8, 0.9);   // the lit edges of its top
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
// `lit` gives the sunlit face its warm-to-pale gradient: stronger pale bands towards the apex and a shade at its foot.
function shadedFace(g, foot0, foot1, top, C, lit = false) {
  g.poly([foot0, foot1, top], C);
  const at = (q, f) => [q[0] + (top[0] - q[0]) * f, q[1] + (top[1] - q[1]) * f];
  for (const f of lit ? [0.3, 0.5, 0.7] : [0.35, 0.6, 0.8]) g.poly([at(foot0, f), at(foot1, f), top], '#FFFFFF', { alpha: lit ? 0.12 : 0.06 });
  for (const f of lit ? [0.06, 0.14] : [0.08, 0.18]) g.poly([foot0, foot1, at(foot1, f), at(foot0, f)], INK, { alpha: lit ? 0.06 : 0.035 });
}

// The darker line where a body meets the ground (spec 5.1), along its two front feet: left corner, front, right corner.
function foot(g, a, f, c) {
  g.stroke([['M', a], ['L', f], ['L', c]], INK, 0.8, 0.45);
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
  if (look.course > 0) foot(g, p(bx, by + side), p(bx + side, by + side), p(bx + side, by));
  // the ramp up the +y face from the left of the apron to the top of the courses laid, landing on the course under way
  const z1 = look.course * ch, k = Math.min(look.course, n - 1) * step;
  return ramp(g, x + 0.1, bx + side - k - (side - 2 * k) * 0.25, by + side + 0.26, 0.36, by + side - k, z1);
}

// A band across both faces of a finished pyramid between the fractions f0 and f1 of the way from the foot to the apex: `lit` on the sunlit face,
// `dark` on the shaded one.
function pyramidBand(g, A, Bp, C, apex, f0, f1, lit, dark) {
  const at = (q, f) => [q[0] + (apex[0] - q[0]) * f, q[1] + (apex[1] - q[1]) * f];
  g.poly([at(A, f0), at(Bp, f0), at(Bp, f1), at(A, f1)], lit);
  g.poly([at(Bp, f0), at(C, f0), at(C, f1), at(Bp, f1)], dark);
}
// The bands a style paints round a pyramid, [from, to, band]: whitewashed one pale line; painted teal, orange and teal again; gilded gold, a gold line, gold.
const PYRAMID_BANDS = {
  whitewashed: [[0.04, 0.07, 'a1']],                                          // a thin lavender line at the foot: the casing is otherwise plain, so it differs from classic's
  painted: [[0.05, 0.12, 'a1'], [0.15, 0.19, 'a2'], [0.22, 0.25, 'a1']],
  gilded: [[0.05, 0.11, 'a1'], [0.15, 0.17, 'a2'], [0.2, 0.22, 'a1']],
};

export function pyramidFinished(g, x, y, w, type, style = 'classic') {
  const T = TONES[style], { L, bx, by, side } = pyramidGeom(type, x, y, w);
  // The capstone is gold in the classic look and for the great pyramid, whose capstone is paid for (MONUMENTS.pyramid_great.extra); a
  // Whitewashed or Painted small pyramid wears its own style's stone.
  const paid = Boolean(MONUMENTS[type].extra && MONUMENTS[type].extra.kind === 'capstone');
  const cap3 = paid ? GOLDC : T.cap, goldCap = paid || T.gold;
  const apex = U(p(bx + side / 2, by + side / 2), L.height);
  const A = p(bx, by + side), Bp = p(bx + side, by + side), C = p(bx + side, by);
  shadedFace(g, A, Bp, apex, CASING[1], true);
  shadedFace(g, Bp, C, apex, CASING[2]);
  const segs = [];                                                           // the casing's courses
  for (let k = 1; k < 16; k++) {
    const f = k / 16, at = (q) => [q[0] + (apex[0] - q[0]) * f, q[1] + (apex[1] - q[1]) * f];
    segs.push(['M', at(A)], ['L', at(Bp)], ['L', at(C)]);
  }
  g.stroke(segs, '#B8AAB8', 0.45, 0.4);
  for (const [f0, f1, k] of PYRAMID_BANDS[style] || []) pyramidBand(g, A, Bp, C, apex, f0, f1, T[k][0], T[k][1]);
  g.stroke([['M', A], ['L', apex], ['L', C]], OUTLINE, 0.6, 0.4);
  foot(g, A, Bp, C);
  g.line(Bp, apex, '#FFFFFF', 1.2, 0.85);                                    // the lit edge
  // the gold capstone: the top sixth, a separate stone with a dark gold joint under it
  const t = 1 / 6, cap = (q) => [apex[0] + (q[0] - apex[0]) * t, apex[1] + (q[1] - apex[1]) * t];
  g.poly([cap(A), cap(Bp), apex], cap3[1]);
  g.poly([cap(Bp), cap(C), apex], cap3[2]);
  g.stroke([['M', cap(A)], ['L', cap(Bp)], ['L', cap(C)]], goldCap ? '#7E5A22' : '#8E809A', 0.8, 0.95);
  g.line(cap(Bp), apex, goldCap ? '#FFF4C8' : '#FFFFFF', 0.8, 0.95);
  return { apex, cap: goldCap ? [cap(A), cap(Bp), cap(C)] : null };
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

export function mastabaFinished(g, x, y, w, d, type, style = 'classic') {
  const T = TONES[style], G = mastabaGeom(type, x, y, w, d), ink = inkFor();
  const banded = style === 'painted' || style === 'gilded';                   // Stage 4.6: a painted or gilded mastaba wears a band on every tier
  let F0 = null;
  for (let i = 0; i < G.tiers; i++) {
    const [tx, ty, tw, td] = tier(G, i);
    const F = slab(g, tx, ty, tw, td, G.ch, i * G.ch, 0.04, i % 2 ? T.wall2 : T.wall, ink);
    if (i === 0) F0 = F;
    if (banded) { flush(g, ink); qd(g, F.L, 0, 1, G.ch * 0.5, G.ch * 0.5 + 2, T.a1[0]); qd(g, F.R, 0, 1, G.ch * 0.5, G.ch * 0.5 + 2, T.a1[1]); }
  }
  flush(g, ink);
  qd(g, F0.L, 0.62, 0.74, 0, G.ch - 1.6, DOOR);                             // the false door and its lintel
  qd(g, F0.L, 0.58, 0.78, G.ch - 1.6, G.ch - 0.8, T.door, { alpha: 0.8 });
  qd(g, F0.L, 0.2, 0.3, 0, G.ch * 0.6, '#E2D6C2');                           // the offering niche
  const [tx, ty, tw, td] = tier(G, G.tiers - 1);
  g.line(U(p(tx, ty + td), G.L.height), U(p(tx + tw, ty + td), G.L.height), T.a1[0], 0.9);   // a teal line along the cornice (its style's colour)
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
  for (let i = 0; i < Math.min(look.course, G.n); i++) obeliskShaft(g, G, i * G.seg, G.seg, ROSE, ink);
  if (look.course < G.n && look.laid > 0) {
    const per = G.seg / look.blocks, settled = newest ? look.laid - 1 : look.laid;
    if (settled > 0) obeliskShaft(g, G, look.course * G.seg, settled * per, ROSE, ink);
    flush(g, ink);
    if (newest) obeliskShaft(g, G, look.course * G.seg + settled * per, per, ROSE, ink, newest);
  }
  flush(g, ink);
  scaffold(g, G.cx - G.base / 2, G.cy - G.base / 2, G.base, G.base, G.ped + built + 6, false);
  return null;
}

export function obeliskFinished(g, x, y, type, style = 'classic') {
  const T = TONES[style], G = obeliskGeom(type, x, y), ink = inkFor();
  const P = slab(g, G.cx - 0.24, G.cy - 0.24, 0.48, 0.48, G.ped, 0, 0, T.ped, ink);
  flush(g, ink);
  qd(g, P.L, 0, 1, 1.2, 2.2, T.a1[0]); qd(g, P.R, 0, 1, 1.2, 2.2, T.a1[1]);
  const F = obeliskShaft(g, G, 0, G.L.shaft, T.shaft, ink);
  flush(g, ink);
  for (const s of style === 'painted' ? [G.L.shaft * 0.34, G.L.shaft * 0.6, G.L.shaft * 0.82] : [G.L.shaft * 0.6, G.L.shaft * 0.82]) {   // painted bands, 2 px (a painted one has a third)
    qd(g, F.L, 0, 1, s, s + 2, T.a1[0]); qd(g, F.R, 0, 1, s, s + 2, T.a1[1]);
  }
  const r0 = G.L.shaft * 0.82 + 2, r1 = r0 + 1.4;
  qd(g, F.L, 0, 1, r0, r1, T.r[0]); qd(g, F.R, 0, 1, r0, r1, T.r[1]);
  qd(g, F.L, 0.3, 0.7, 3, G.L.shaft * 0.55, '#C9A396', { alpha: 0.8 });     // the carved column, a shade darker
  const glyphs = [];
  for (let s = 4.4; s < G.L.shaft * 0.53; s += 3.2) glyphs.push(['M', F.L(0.38, s)], ['L', F.L(0.62, s + 0.6)]);
  g.stroke(glyphs, '#7E5F6A', 0.55, 0.7);                                    // its carved signs
  g.line(F.L(1, 0), F.L(1, G.L.shaft), '#F6E6DE', 0.6, 0.7);                 // the lit edge
  foot(g, P.L(0, 0), P.L(1, 0), P.R(0, 0));
  const top = G.ped + G.L.shaft, hw = G.topW / 2, tipH = G.L.height - top;
  const a = U(p(G.cx - hw, G.cy + hw), top), b = U(p(G.cx + hw, G.cy + hw), top), c = U(p(G.cx + hw, G.cy - hw), top), t = U(p(G.cx, G.cy), top + tipH);
  // the tip is gold where it was paid for (MONUMENTS.obelisk_large.extra) and in the Gilded style; a Painted one's is teal; else polished pale stone
  const gilded = (MONUMENTS[type].extra && MONUMENTS[type].extra.kind === 'gilding') || style === 'gilded', tinted = style === 'painted' && !gilded;
  // the pyramidion: gilded on the large obelisk (its paid extra, MONUMENTS.obelisk_large.extra); the small one's is
  // polished pale, so its rose shaft still ends in a bright point without taking the gilding's meaning
  g.poly([a, b, t], gilded ? GOLDC[1] : tinted ? TEAL : STONE[0]);
  g.poly([b, c, t], gilded ? GOLDC[2] : tinted ? TEAL_DARK : STONE[2]);
  g.line(b, t, gilded ? '#FFF4C8' : '#FFFFFF', 0.8, 0.95);
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

// A figure built of parts rises with the course under way (Stage 4.6: the colossus, the great sphinx and the sun temple share it): parts
// [x, y, w, d, z, h] (tiles and art px, back to front) grow as the height Z = H x (courses done + the share of the one under way) / n passes
// them, the newest block's slab fading in on top, scaffolding round `scaf` ([x, y, w, d] in tiles) while it rises. `extra(g, Z)` draws what is
// not a box (the temple's disc) once Z reaches it. The parts overlap on screen, so each part's edges are stroked as it is drawn.
function partsSite(g, x, y, look, newest, parts, scaf, extra = null) {
  const H = MONUMENT_LOOK[look.type].height, Z = colossusZ(look.type, look), per = H / look.n / look.blocks;
  const Zs = newest ? Math.max(0, Z - per) : Z;                              // the newest block's slab fades in on top
  const ink = inkFor();
  const top = Math.min(H, Z) + 6, [sx, sy, sw, sd] = scaf;
  scaffold(g, x + sx, y + sy, sw, sd, top, true);
  for (const [px, py, pw, pd, z, h] of parts) {
    if (z < Zs) {
      const hh = Math.min(h, Zs - z), F = slab(g, x + px, y + py, pw, pd, hh, z, 0, SANDSTONE, ink);
      if (hh > 8) ink.joint.push(['M', F.L(0, 8)], ['L', F.L(1, 8)]);
      flush(g, ink);
    }
    const lo = Math.max(z, Zs), hi = Math.min(z + h, Z);
    if (newest && hi > lo) alphaBox(g, x + px, y + py, pw, pd, hi - lo, lo + newest.drop, SANDSTONE, newest.alpha);
  }
  if (extra) extra(g, Zs);
  scaffold(g, x + sx, y + sy, sw, sd, top, false);
  return null;
}
const colossusSite = (g, x, y, look, newest) => partsSite(g, x, y, look, newest, COLOSSUS, [0.5, 0.42, 1.0, 1.0]);

export function colossusFinished(g, x, y, style = 'classic') {
  const T = TONES[style], ink = inkFor();
  const parts = COLOSSUS.map(([px, py, pw, pd, z, h], i) => {
    const F = slab(g, x + px, y + py, pw, pd, h, z, i === 6 ? -0.02 : 0, i === 0 ? T.ped : i === 8 ? T.cap : T.stone, ink);
    flush(g, ink);
    return F;
  });
  const [P, Th, , Tr, , , Hc] = parts;
  qd(g, P.L, 0, 1, 2.6, 4.4, T.a1[0]); qd(g, P.R, 0, 1, 2.6, 4.4, T.a1[1]);
  qd(g, P.L, 0, 1, 7.8, 9, T.a2[0]); qd(g, P.R, 0, 1, 7.8, 9, T.a2[1]);
  qd(g, P.L, 0.36, 0.64, 5, 7, T.a3, { alpha: 0.75 });                       // the king's name on the plinth
  qd(g, Th.R, 0, 1, 15, 17.4, T.a3, { alpha: 0.8 });
  qd(g, Tr.L, 0, 1, 11.4, 15, T.collar);                                     // the gold collar
  for (let s = 1; s < 11; s += 2.4) {                                        // the headcloth's blue stripes
    qd(g, Hc.L, 0, 0.24, s, s + 1.1, T.stripe); qd(g, Hc.L, 0.76, 1, s, s + 1.1, T.stripe);
    qd(g, Hc.R, 0, 1, s, s + 1.1, T.stripe, { alpha: 0.85 });
  }
  qd(g, Hc.L, 0.3, 0.7, 1.2, 8.6, T.stone[1]);                               // the face
  qd(g, Hc.L, 0.36, 0.46, 5.4, 6.4, DOOR); qd(g, Hc.L, 0.54, 0.64, 5.4, 6.4, DOOR);
  qd(g, Hc.L, 0.44, 0.56, 2.4, 3, RED, { alpha: 0.7 });
  return { apex: U(p(x + 1, y + 0.8), 45), cap: null };
}

// ── the great sphinx (Stage 4.6, ruling 390): a lion lying along +x, its head to the +x end, built of parts like the colossus ──

// Each part: [x, y, w, d, z, h], in the 3x2 footprint's tiles and art px, back to front.
const SPHINX = [
  [0.14, 0.2, 2.55, 1.6, 0, 5],         // 0 the plinth
  [0.35, 0.6, 0.95, 0.8, 5, 9],         // 1 the haunches
  [1.3, 0.66, 0.62, 0.68, 5, 7.5],      // 2 the back
  [1.92, 0.54, 0.7, 0.2, 5, 3.6],       // 3 the far forepaw
  [1.92, 0.74, 0.38, 0.52, 5, 12],      // 4 the chest
  [1.92, 1.26, 0.7, 0.2, 5, 3.6],       // 5 the near forepaw
  [1.96, 0.7, 0.48, 0.6, 17, 14],       // 6 the head in its headcloth
  [2.0, 0.74, 0.4, 0.52, 31, 2.4],      // 7 the crown band
];

export function sphinxFinished(g, x, y, style = 'classic') {
  const T = TONES[style], ink = inkFor();
  const parts = SPHINX.map(([px, py, pw, pd, z, h], i) => {
    const F = slab(g, x + px, y + py, pw, pd, h, z, i === 6 ? -0.02 : 0, i === 0 ? T.ped : i === 7 ? T.cap : T.stone, ink);
    flush(g, ink);
    return F;
  });
  const [P, Ha, Bk, , Ch, , Hd] = parts;
  qd(g, P.L, 0, 1, 1.4, 2.6, T.a1[0]); qd(g, P.R, 0, 1, 1.4, 2.6, T.a1[1]);       // the plinth's two painted bands
  qd(g, P.L, 0, 1, 3.5, 4.5, T.a2[0]); qd(g, P.R, 0, 1, 3.5, 4.5, T.a2[1]);
  qd(g, P.L, 0.4, 0.6, 2.9, 3.4, T.a3, { alpha: 0.7 });                            // the king's name
  qd(g, Bk.L, 0, 1, 4.6, 5.8, T.a1[0]); qd(g, Ha.L, 0, 1, 6, 7.2, T.a1[0]);        // a painted band along the flank
  g.stroke([['M', Ha.L(0.3, 0.6)], ['L', Ha.L(0.36, 5)], ['L', Ha.L(0.66, 8)]], T.stone[2], 0.7, 0.8);   // the haunch
  qd(g, Ch.L, 0, 1, 7, 11, T.collar); qd(g, Ch.R, 0, 1, 7, 11, T.collar, { alpha: 0.85 });   // the broad collar
  for (let s = 1; s < 11; s += 2.4) {                                              // the headcloth's stripes
    qd(g, Hd.L, 0, 0.3, s, s + 1.1, T.stripe); qd(g, Hd.R, 0, 0.16, s, s + 1.1, T.stripe, { alpha: 0.85 }); qd(g, Hd.R, 0.84, 1, s, s + 1.1, T.stripe, { alpha: 0.85 });
  }
  qd(g, Hd.R, 0.2, 0.8, 1.2, 9.6, T.stone[1]);                                     // the face looks along the body's line, to +x
  qd(g, Hd.R, 0.3, 0.42, 5.8, 6.8, DOOR); qd(g, Hd.R, 0.58, 0.7, 5.8, 6.8, DOOR);
  qd(g, Hd.R, 0.46, 0.54, 3.2, 5.4, T.stone[2], { alpha: 0.8 });
  qd(g, Hd.R, 0.4, 0.6, 1.8, 2.5, T.r[0], { alpha: 0.7 });
  return { apex: U(p(x + 2.2, y + 1.0), 34), cap: null };
}

// ── the sun temple (ruling 391): a platform and court, two pylons with masts, and a tall sun pillar crowned by a disc ──

const TEMPLE = [
  [0.2, 0.2, 2.6, 2.6, 0, 5],           // 0 the platform
  [0.5, 0.5, 2.0, 2.0, 5, 4],           // 1 the court
  [1.1, 0.75, 0.8, 0.8, 9, 24],         // 2 the sun pillar
  [0.62, 1.85, 0.72, 0.55, 9, 17],      // 3 the left pylon
  [1.66, 1.85, 0.72, 0.55, 9, 17],      // 4 the right pylon
  [1.34, 1.9, 0.32, 0.45, 20, 6],       // 5 the lintel over the gate
  [1.3, 0.95, 0.4, 0.4, 33, 3.5],       // 6 the disc's stand
];
const TEMPLE_DISC = { x: 1.5, y: 1.15, z: 41, r: 7 };   // the sun disc over the pillar: its middle in tiles and art px, and its radius in art px

// The disc: a ring, a face, and twelve short rays; `g` draws it upright (a circle on screen).
function sunDisc(g, x, y, T) {
  const c = U(p(x + TEMPLE_DISC.x, y + TEMPLE_DISC.y), TEMPLE_DISC.z), r = TEMPLE_DISC.r;
  const rays = [];
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; rays.push(['M', [c[0] + Math.cos(a) * (r + 1.2), c[1] + Math.sin(a) * (r + 1.2)]], ['L', [c[0] + Math.cos(a) * (r + 3.4), c[1] + Math.sin(a) * (r + 3.4)]]); }
  g.stroke(rays, T.a2[1], 0.9, 0.95);
  g.ell(c, r, r, T.a1[0], { outline: true });
  g.ell(c, r * 0.74, r * 0.74, T.cap[0]);
  g.ell([c[0] - r * 0.22, c[1] - r * 0.22], r * 0.3, r * 0.3, '#FFFFFF', { alpha: 0.55 });
  return { apex: [c[0], c[1] - r - 3], cap: T.gold ? [[c[0] - r, c[1]], [c[0], c[1] + r], [c[0] + r, c[1]]] : null };
}

export function templeFinished(g, x, y, style = 'classic') {
  const T = TONES[style], ink = inkFor();
  const parts = TEMPLE.map(([px, py, pw, pd, z, h], i) => {
    const F = slab(g, x + px, y + py, pw, pd, h, z, i === 2 ? 0.1 : i === 3 || i === 4 ? 0.05 : 0, i === 6 ? T.cap : i === 1 || i === 5 ? T.wall2 : T.wall, ink);
    flush(g, ink);
    return F;
  });
  const [P, Co, Pi, Pl, Pr, Li] = parts;
  qd(g, P.L, 0, 1, 1.4, 2.6, T.a1[0]); qd(g, P.R, 0, 1, 1.4, 2.6, T.a1[1]);       // the platform's painted band
  qd(g, Co.L, 0, 1, 1.6, 2.4, T.a2[0]); qd(g, Co.R, 0, 1, 1.6, 2.4, T.a2[1]);
  qd(g, Pi.L, 0, 1, 16, 18.6, T.a1[0]); qd(g, Pi.R, 0, 1, 16, 18.6, T.a1[1]);     // the pillar's band, and a thin one below its top
  qd(g, Pi.L, 0, 1, 21.4, 22.6, T.a2[0]); qd(g, Pi.R, 0, 1, 21.4, 22.6, T.a2[1]);
  for (const Py of [Pl, Pr]) {
    qd(g, Py.L, 0, 1, 12.6, 15, T.a1[0]); qd(g, Py.R, 0, 1, 12.6, 15, T.a1[1]);   // each pylon's band under its cornice
    qd(g, Py.L, 0.16, 0.26, 2, 12, '#8E8296', { alpha: 0.45 }); qd(g, Py.L, 0.74, 0.84, 2, 12, '#8E8296', { alpha: 0.45 });   // the mast slots
  }
  qd(g, Li.L, 0, 1, 1.6, 4.2, T.door);                                             // the lintel's painted face
  for (const [mx, my] of [[0.98, 2.12], [2.02, 2.12]]) {                           // a mast on each pylon, a pennant at its top
    const base = U(p(x + mx, y + my), 26), top = U(base, 12);
    g.line(base, top, WOOD, 0.8);
    g.poly([top, [top[0] + 6, top[1] + 1.8], [top[0], top[1] + 4.2]], T.a1[0], { outline: true });
  }
  return sunDisc(g, x, y, T);
}

// The sun temple's disc and masts are drawn on the site once the pillar is up (Z reaches the disc's stand).
function templeSite(g, x, y, look, newest) {
  return partsSite(g, x, y, look, newest, TEMPLE, [0.95, 0.6, 1.1, 1.1], (gg, Z) => { if (Z >= TEMPLE_DISC.z - 1.5) sunDisc(gg, x, y, TONES.classic); });
}
const sphinxSite = (g, x, y, look, newest) => partsSite(g, x, y, look, newest, SPHINX, [0.4, 0.5, 2.1, 1.0]);

// ── the step pyramid (ruling 392): five tiers of two courses, no casing; a small chapel and a pyramidion crown it ──

const STEP_TIERS = 5, STEP_CORE = 0.92;
function stepGeom(type, x, y, w) {
  const L = MONUMENT_LOOK[type], B = bodyOf(type, w, w), n = MONUMENTS[type].courses.length;
  return { L, B, n, per: n / STEP_TIERS, ch: (L.height * STEP_CORE) / n, set: ((B.w / 2) * 0.72) / (STEP_TIERS - 1), bx: x + B.x, by: y + B.y, side: B.w };
}
// The rectangle of the tier course i lies in: [x, y, w, d].
function stepTier(G, i) {
  const k = Math.min(STEP_TIERS - 1, Math.floor(i / G.per)) * G.set;
  return [G.bx + k, G.by + k, G.side - 2 * k, G.side - 2 * k];
}

function stepSite(g, x, y, w, look, newest) {
  const G = stepGeom(look.type, x, y, w), ink = inkFor();
  for (let i = 0; i < Math.min(look.course, G.n); i++) {
    const [tx, ty, tw, td] = stepTier(G, i);
    const F = slab(g, tx, ty, tw, td, G.ch, i * G.ch, 0, i % 2 ? CORE2 : CORE, ink);
    joints(ink, F, tw, td, G.ch, 0.45, i % 2);
  }
  if (look.course < G.n && look.laid > 0) {
    const [tx, ty, tw, td] = stepTier(G, look.course);
    courseUnderWay(g, tx, ty, tw, td, look.course * G.ch, G.ch, look, newest, look.course % 2 ? CORE2 : CORE, ink);
  }
  flush(g, ink);
  if (look.course > 0) foot(g, p(G.bx, G.by + G.side), p(G.bx + G.side, G.by + G.side), p(G.bx + G.side, G.by));
  const [tx, ty, tw, td] = stepTier(G, Math.min(look.course, G.n - 1));
  return ramp(g, x + 0.1, tx + tw * 0.75, G.by + G.side + 0.26, 0.36, ty + td, look.course * G.ch);
}

export function stepFinished(g, x, y, w, type, style = 'classic') {
  const T = TONES[style], G = stepGeom(type, x, y, w), ink = inkFor(), h = G.ch * G.per, top = h * STEP_TIERS;
  for (let t = 0; t < STEP_TIERS; t++) {
    const [tx, ty, tw, td] = stepTier(G, t * G.per);
    const F = slab(g, tx, ty, tw, td, h, t * h, 0.05, t % 2 ? T.wall2 : T.wall, ink);
    flush(g, ink);
    if (style === 'painted' || style === 'gilded' || style === 'classic') {      // a painted band round the middle of each tier; Whitewashed stays plain
      qd(g, F.L, 0, 1, h * 0.5, h * 0.5 + 2.4, t % 2 ? T.a2[0] : T.a1[0]); qd(g, F.R, 0, 1, h * 0.5, h * 0.5 + 2.4, t % 2 ? T.a2[1] : T.a1[1]);
    } else g.line(F.L(0, h - 0.8), F.L(1, h - 0.8), T.a1[0], 0.8, 0.8);          // Whitewashed: a thin lavender line under each cornice
  }
  const [tx, ty, tw, td] = stepTier(G, G.n - 1), cx = tx + tw / 2, cy = ty + td / 2, c = 0.27;
  const Ch = slab(g, cx - c, cy - c, c * 2, c * 2, 6, top, 0.02, T.wall, ink);   // the chapel on the top tier
  flush(g, ink);
  qd(g, Ch.L, 0.34, 0.66, 0, 4, DOOR);
  qd(g, Ch.L, 0, 1, 4.4, 5.6, T.door); qd(g, Ch.R, 0, 1, 4.4, 5.6, T.a1[1]);
  const a = U(p(cx - c, cy + c), top + 6), b = U(p(cx + c, cy + c), top + 6), cc = U(p(cx + c, cy - c), top + 6), apex = U(p(cx, cy), top + 12);
  g.poly([a, b, apex], T.cap[1]);
  g.poly([b, cc, apex], T.cap[2]);
  g.line(b, apex, T.gold ? '#FFF4C8' : '#FFFFFF', 0.7, 0.9);
  return { apex, cap: T.gold ? [a, b, cc] : null };
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
  else if (fam === 'step') r = stepSite(g, x, y, w, look, newest);
  else if (fam === 'sphinx') r = sphinxSite(g, x, y, look, newest);
  else if (fam === 'temple') r = templeSite(g, x, y, look, newest);
  else r = colossusSite(g, x, y, look, newest);
  if (founded) stakes(g, x, y, B, true);
  if (fam === 'obelisk') stockpile(g, x + 0.76, y + 0.36, look, 0.5);
  else if (fam === 'colossus') stockpile(g, x + 1.74, y + 0.36, look, 0.6);
  else if (fam === 'sphinx') stockpile(g, x + 2.74, y + 0.26, look, 0.4);
  else if (fam === 'temple') stockpile(g, x + 2.62, y + 0.34, look, 0.45);
  else stockpile(g, x + B.x + B.w + 0.05, y + d * 0.45, look, Math.min(1, B.x / 0.3));
  if (look.style !== 'classic') pennant(g, x, y, w, d, look.style);
  return r;
}

// A site founded in a style flies that style's colour from a pole at the apron's right corner (Stage 4.6, ruling 343), so the choice shows from
// the first stake: a white flag for Whitewashed, teal for Painted, gold for Gilded. Still: it does not flutter under any motion level.
function pennant(g, x, y, w, d, style) {
  const T = TONES[style], base = U(p(x + w - 0.16, y + 0.16), 0), top = U(base, 13), c = style === 'whitewashed' ? T.cap[0] : T.a1[0];
  g.line(base, top, WOOD, 0.8);
  g.poly([top, [top[0] + 7, top[1] + 2], [top[0], top[1] + 5]], c, { outline: true });
  if (style === 'painted') g.poly([[top[0], top[1] + 3.2], [top[0] + 5, top[1] + 2.6], [top[0], top[1] + 5]], T.a2[0]);
}

// The finished monument at (x, y), w x d. Returns { apex, cap } (art px): where the gold's shine and sparkle go
// (cap null: no gold to shine on).
export function drawFinished(g, x, y, w, d, type, style = 'classic') {
  const fam = MONUMENT_LOOK[type].family;
  style = styleOf(style);
  apron(g, x, y, w, d);
  shadow(g, x, y, type, w, d, MONUMENT_LOOK[type].height);
  if (fam === 'pyramid') return pyramidFinished(g, x, y, w, type, style);
  if (fam === 'mastaba') { mastabaFinished(g, x, y, w, d, type, style); return { apex: null, cap: null }; }
  if (fam === 'obelisk') return obeliskFinished(g, x, y, type, style);
  if (fam === 'step') return stepFinished(g, x, y, w, type, style);
  if (fam === 'sphinx') return sphinxFinished(g, x, y, style);
  if (fam === 'temple') return templeFinished(g, x, y, style);
  return colossusFinished(g, x, y, style);
}

// ── where the work happens (Task B3: the gangs, the masons, the course-done dust) ──

// The top front edges of course i (left corner, front corner, right corner, art px): where its dust rises and its still
// outline runs. For a mastaba's facing course, the top tier's; for an obelisk, the shaft at that height; for the colossus,
// the plinth up to its top and the throne and lap above it.
export function courseTop(type, x, y, w, d, i) {
  const fam = MONUMENT_LOOK[type].family;
  let x0, y0, x1, y1, z;
  if (fam === 'pyramid') {
    const G = pyramidGeom(type, x, y, w), k = i * G.step;
    [x0, y0, x1, y1, z] = [G.bx + k, G.by + k, G.bx + G.side - k, G.by + G.side - k, (i + 1) * G.ch];
  } else if (fam === 'mastaba') {
    const G = mastabaGeom(type, x, y, w, d), t = Math.min(i, G.tiers - 1), [tx, ty, tw, td] = tier(G, t);
    [x0, y0, x1, y1, z] = [tx + 0.04, ty + 0.04, tx + tw - 0.04, ty + td - 0.04, (t + 1) * G.ch];
  } else if (fam === 'obelisk') {
    const G = obeliskGeom(type, x, y), zz = (i + 1) * G.seg, hw = shaftW(G, zz) / 2;
    [x0, y0, x1, y1, z] = [G.cx - hw, G.cy - hw, G.cx + hw, G.cy + hw, G.ped + zz];
  } else if (fam === 'step') {
    const G = stepGeom(type, x, y, w), [tx, ty, tw, td] = stepTier(G, i);
    [x0, y0, x1, y1, z] = [tx, ty, tx + tw, ty + td, (i + 1) * G.ch];
  } else {
    const H = MONUMENT_LOOK[type].height, zz = (i + 1) * H / MONUMENTS[type].courses.length;
    if (fam === 'sphinx') [x0, y0, x1, y1] = zz <= SPHINX[0][5] ? [x + 0.14, y + 0.2, x + 2.69, y + 1.8] : [x + 0.35, y + 0.6, x + 2.44, y + 1.4];
    else if (fam === 'temple') [x0, y0, x1, y1] = zz <= TEMPLE[0][5] ? [x + 0.2, y + 0.2, x + 2.8, y + 2.8] : [x + 0.62, y + 0.75, x + 2.38, y + 2.4];
    else [x0, y0, x1, y1] = zz <= COLOSSUS[0][5] ? [x + 0.22, y + 0.2, x + 1.78, y + 1.8] : [x + 0.6, y + 0.5, x + 1.4, y + 1.42];
    z = zz;
  }
  return [U(p(x0, y1), z), U(p(x1, y1), z), U(p(x1, y0), z)];
}

// Where a site's people work (tiles and art px): `masons` the spots where two masons stand at the course under way (by
// the edge of the blocks laid, on the course below; on the scaffold's top for an obelisk or the colossus), and `path`, the
// way the sleds go when there is no ramp yet (or never one): along the apron in front, { x0, x1, y, z }.
export function workSpots(type, x, y, w, d, look) {
  const fam = MONUMENT_LOOK[type].family;
  if (fam === 'obelisk' || fam === 'colossus' || fam === 'sphinx' || fam === 'temple') {
    const z = builtHeight(type, look) - 4, c = fam === 'obelisk' ? [x + 0.5, y + 0.5] : fam === 'sphinx' ? [x + 1.4, y + 1] : fam === 'temple' ? [x + 1.5, y + 1.5] : [x + 1, y + 1];
    return { masons: [[c[0] + 0.16, c[1] + 0.3, z], [c[0] + 0.32, c[1] + 0.1, z]], path: { x0: x + 0.1, x1: x + w * 0.62, y: y + d - 0.1, z: 0 } };
  }
  const path = { x0: x + 0.12, x1: x + w * 0.6, y: y + d - 0.14, z: 0 };
  let rect, z;
  if (fam === 'pyramid') {
    const G = pyramidGeom(type, x, y, w), c = Math.min(look.course, G.n - 1), k = c * G.step;
    rect = [G.bx + k, G.by + k, G.side - 2 * k, G.side - 2 * k]; z = c * G.ch;
  } else if (fam === 'step') {
    const G = stepGeom(type, x, y, w), c = Math.min(look.course, G.n - 1);
    rect = stepTier(G, c); z = c * G.ch;
  } else {
    const G = mastabaGeom(type, x, y, w, d), c = Math.min(look.course, G.tiers - 1);
    rect = tier(G, c); z = c * G.ch;
    if (look.course >= G.tiers) z = G.L.height;                               // the facing: on the top
  }
  const [cx, cy, cw, cd] = rect, N = look.blocks;
  const cols = Math.max(1, Math.round(Math.sqrt((N * cw) / Math.max(0.01, cd)))), rows = Math.ceil(N / cols);
  const full = Math.floor(look.laid / cols), rem = look.laid - full * cols;
  const fx = cx + Math.min(cw - 0.1, Math.max(0.15, (rem + 0.5) * (cw / cols))), fy = cy + Math.min(cd - 0.08, (full + 1.4) * (cd / rows));
  return { masons: [[fx, fy, z], [Math.max(cx + 0.1, fx - 0.34), Math.min(cy + cd - 0.08, fy + 0.12), z]], path };
}

// The art slots (contract: the renderer draws these live through opts.live and never caches them; `draw` is the card's
// thumbnail and the fallback for a bare renderFrame: the finished monument). Ground shadows are drawn by the scene.
export const MONUMENT_ART = {};
for (const k of MONUMENT_KINDS) {
  const m = MONUMENTS[k], h = MONUMENT_LOOK[k].height;
  MONUMENT_ART[k] = { w: m.w, d: m.d, height: h, bounds: boundsFor(m.w, m.d, h), shadows: [], live: true, draw: (g, x, y) => drawFinished(g, x, y, m.w, m.d, k) };
}
