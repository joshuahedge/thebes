// Monuments drawn live (spec 5.7, rulings 182, 183, 209, 221, 246): sites course by course (blocks fading in, the ramp,
// sleds and gangs on game time, the stockpile, stakes and cords), finished monuments (casing, the gilded tip, the gold
// capstone and its one slow shine under Full), the course-done dust or still outline, and the see-through fade. Stage 4
// contract: Track 0 fixed the name and the renderer hook; Track B implements it and owns this file.
//
// The renderer (src/render/renderer.js) never caches a slot whose art entry has live: true (the seven monument kinds,
// src/render/art/monuments.js). In its depth-sorted pass it calls opts.live(g, o) for such an object, in art px with the
// art origin set (as opts.fire is), where o is { key, id, slot, def, x, y, b } and b the building. createUI passes
//   live: (g, o) => drawMonument(g, world, o.b, { now, timeDays, motion, ghost, selectedId })
// now: the frame's real-clock ms; timeDays: the sim's day plus the fraction since the last tick (gangs move on game time);
// motion: settings.motionLevel(); ghost: the placing ghost { type, x, y, w, d } or null; selectedId: the selected
// building's id or null (the monument fades to MONUMENT_PLACING.fadeBehind when either lies behind it). Everything is
// drawn from `b` itself: the world is read only for the selected building behind it, so a record that is not in the
// world (Track C's placing silhouette, drawn with { motion: 'still' }) draws as any other.
// Budget: three sites within 1 ms a frame on the stress city (spec 5.7).
//
// What moves, by Motion level (spec 5.4): the newest block fades in and settles 3 px over 400 ms under Full, fades in place
// over 200 ms under Gentle, and appears at once under Still. A course laid on screen raises a short dust puff along it under
// Full and a still outline for a moment under Gentle and Still; a monument finished on screen gets one slow shine across
// its gold and a short sparkle under Full, and a still outline for a moment under Gentle and Still. The gangs (one sled
// and four haulers a crew, up the ramp or along the apron, and two masons at the course under way) are walkers: they move
// under every level, on game time (timeDays), so they hold still while the game is paused, and stand idle by their sleds
// at the ramp's foot while the site does no work (stalled, or its crews gone; a paused site has none). The scene
// itself is a pure function of the building (src/render/art/monuments.js); the only state kept here is what the draw saw
// last of each site (its blocks and course, and when they changed), outside the world, so a reload shows the same scene
// with nothing fading.
import { ART } from './art/registry.js';
import { makeDraw } from './art/ctx.js';
import { siteLook, drawSite, drawFinished, builtHeight, bodyOf, courseTop, workSpots, MONUMENT_LOOK, CASING, CORE } from './art/monuments.js';
import { gang } from './art/figures.js';
import { box } from './art/primitives.js';
import { GOLD, GOLDC, UI, STONE } from './art/palette.js';
import { p, U, depthKey } from './iso.js';
import { MONUMENT_PLACING } from '../data/monuments.js';
import { BUILDINGS } from '../data/buildings.js';

export const FADE_MS = { full: 400, gentle: 200 };   // the newest block's fade, by Motion level (Still: none)
export const SETTLE_PX = 3;                          // how far a new block settles under Full
export const SHINE_MS = 2400;                        // the one slow shine across the gold, Full only
export const SPARKLE_MS = 1500;
export const OUTLINE_MS = 1500;                      // the still outline for a moment, Gentle and Still
export const DUST_MS = 1200;                         // the course-done dust, Full only
export const GANG = {
  haulers: 4,            // a crew's gang hauling its sled (spec 5.7: four or five)
  tripDays: 6,           // game days a sled takes up and back (6 s at 1x): up loaded for upShare of it, down empty
  upShare: 0.6,
  spacing: 0.16,         // tiles between the haulers in a file, and from the sled to the first pair
  scale: 0.7,            // the figures' size: a little smaller than a walker, so a gang fits the ramp
};

const HAULED = [CORE[1], '#E0D2B4', CORE[2]];   // the block on a sled: the core's limestone, its top a shade down from the kilts' white
const seen = new WeakMap();  // building -> { blocks, course, done, blockAt, courseAt, doneAt, lastCourse }

// What the draw saw of a site last frame, updated with what it shows now: when its newest block, its last course and its
// finish appeared (real ms; -Infinity for what was already there when the draw first met it). Kept by the building record
// itself, never looked up by id: a loaded city has new records (so nothing fades after a reload), and a record that is not
// in the world at all (Track C's placing silhouette: id -1, every course laid) is drawn from itself alone.
export function siteMemo(world, b, look, now) {
  const blocks = look.course * 100000 + look.laid;
  let m = seen.get(b);
  if (!m) {
    m = { blocks, course: look.course, done: look.done, blockAt: -Infinity, courseAt: -Infinity, doneAt: -Infinity, lastCourse: -1 };
    seen.set(b, m);
    return m;
  }
  if (blocks > m.blocks && look.laid > 0) m.blockAt = now;
  if (look.course > m.course && !look.done) { m.courseAt = now; m.lastCourse = look.course - 1; }
  if (look.done && !m.done) m.doneAt = now;
  m.blocks = blocks; m.course = look.course; m.done = look.done;
  return m;
}

// The newest block's fade, or null once it has settled (or at once under Still).
export function newestBlock(m, now, motion) {
  const dur = FADE_MS[motion];
  if (!dur) return null;
  const age = now - m.blockAt;
  if (!(age >= 0 && age < dur)) return null;
  const t = age / dur;
  return { alpha: t, drop: motion === 'full' ? SETTLE_PX * (1 - t) * (1 - t) : 0 };
}

// The monument's box on the map in art px [left, top, right, bottom], tall enough for what stands now and its marks.
export function monumentBounds(b, look = siteLook(b)) {
  const h = builtHeight(b.type, look);
  return [p(b.x, b.y + b.d)[0] - 12, p(b.x + b.w / 2, b.y + b.d / 2)[1] - h - 30, p(b.x + b.w, b.y)[0] + 12, p(b.x + b.w, b.y + b.d)[1] + 6];
}

// The roof a problem marker's stem stands on: the top of what stands now, over the footprint's middle (art px).
export function monumentTop(b) {
  return U(p(b.x + b.w / 2, b.y + b.d / 2), builtHeight(b.type, siteLook(b)));
}

// Whether a building or ghost { type, x, y, w, d } lies behind the monument: drawn before it (a smaller depth key) and
// overlapping it on screen.
export function liesBehind(o, b, look = siteLook(b)) {
  if (!o || depthKey(o.x, o.y, o.w, o.d) >= depthKey(b.x, b.y, b.w, b.d)) return false;
  const def = ART[o.type] || null, oh = MONUMENT_LOOK[o.type] ? MONUMENT_LOOK[o.type].height : def ? def.height : 20;
  const ol = p(o.x, o.y + o.d)[0], or = p(o.x + o.w, o.y)[0], ot = p(o.x, o.y)[1] - oh, ob = p(o.x + o.w, o.y + o.d)[1];
  const [ml, mt, mr, mb] = monumentBounds(b, look);
  return ol < mr && or > ml && ot < mb && ob > mt;
}

// Whether the monument fades: the ghost or the selected building lies behind it.
export function fadesBehind(world, b, ghost, selectedId, look = siteLook(b)) {
  if (ghost && liesBehind(ghost, b, look)) return true;
  if (selectedId === null || selectedId === undefined || selectedId === b.id) return false;
  const s = world.buildings[selectedId];
  return Boolean(s) && liesBehind(s, b, look);
}

let layer = null;   // one scratch canvas for the see-through fade, reused

// Draws `draw(g)` through a layer at `alpha`, so the faded monument's own faces never show through one another.
function throughLayer(g, alpha, bounds, draw) {
  const s = g.scale, [l, t, r, bt] = bounds;
  const W = Math.ceil((r - l) * s) + 2, H = Math.ceil((bt - t) * s) + 2;
  if (typeof document === 'undefined' || W <= 0 || H <= 0 || W * H > 16e6) { draw(g); return; }
  if (!layer) layer = document.createElement('canvas');
  if (layer.width < W) layer.width = W;
  if (layer.height < H) layer.height = H;
  const lc = layer.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  lc.setTransform(1, 0, 0, 1, 1 - l * s, 1 - t * s);
  draw(makeDraw(lc, s, g.cssScale));
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer, 0, 0, W, H, l * s - 1, t * s - 1, W, H);
  ctx.restore();
}

// The one slow shine: a pale band crossing the gold from left to right over SHINE_MS (t 0..1).
function shine(g, mark, t) {
  if (!mark || !mark.cap) return;
  const [a, b2, c] = mark.cap, apex = mark.apex;
  const xs = [a[0], c[0], apex[0]], left = Math.min(...xs) - 3, right = Math.max(...xs) + 3;
  const x = left + (right - left) * t, top = apex[1] - 2, bottom = Math.max(a[1], b2[1], c[1]) + 2;
  g.save();
  g.clip([a, b2, c, apex]);
  g.poly([[x - 2.4, bottom], [x + 0.4, bottom], [x + 2.4, top], [x - 0.4, top]], '#FFFDF2', { alpha: 0.75 * Math.sin(Math.PI * t) });
  g.restore();
}

// A short sparkle round the top: four-pointed glints, gold-edged, growing and fading once (t 0..1).
function sparkle(g, apex, t) {
  const k = Math.sin(Math.PI * t);
  for (const [dx, dy, r] of [[-9, 2, 3.2], [8, -4, 4], [-3, -10, 2.8], [10, 7, 2.4]]) {
    const c = [apex[0] + dx, apex[1] + dy], R = r * k;
    const star = [[c[0], c[1] - R * 1.6], [c[0] + R * 0.35, c[1] - R * 0.35], [c[0] + R * 1.6, c[1]], [c[0] + R * 0.35, c[1] + R * 0.35],
      [c[0], c[1] + R * 1.6], [c[0] - R * 0.35, c[1] + R * 0.35], [c[0] - R * 1.6, c[1]], [c[0] - R * 0.35, c[1] - R * 0.35]];
    g.poly(star, '#FFF8DC', { alpha: k, stroke: GOLD, strokeWidth: 0.4, strokeAlpha: k });
  }
}

// The still outline for a moment: the monument's silhouette in white over gold, held still (Gentle and Still).
export function silhouette(b) {
  const look = siteLook(b), B = bodyOf(b.type, b.w, b.d), h = builtHeight(b.type, look);
  const x0 = b.x + B.x, y0 = b.y + B.y, x1 = x0 + B.w, y1 = y0 + B.d;
  if (MONUMENT_LOOK[b.type].family === 'pyramid' && look.done) {
    const apex = U(p((x0 + x1) / 2, (y0 + y1) / 2), h);
    return [p(x0, y1), p(x1, y1), p(x1, y0), apex];
  }
  return [p(x0, y1), p(x1, y1), p(x1, y0), U(p(x1, y0), h), U(p(x0, y0), h), U(p(x0, y1), h)];
}
function outline(g, pts) {
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2, strokeAlpha: 0.9 });
  g.poly(pts, 'none', { stroke: GOLD, strokeWidth: 0.9, strokeAlpha: 1 });
}
// The still outline of a course just laid: its two top front edges (left, front, right corner) as an open line, white
// over gold. Not closed: a closed path would draw a chord from the right corner back across the course's top face.
function outlineEdge(g, [a, f, c]) {
  const segs = [['M', a], ['L', f], ['L', c]];
  g.stroke(segs, UI.halo, 2, 0.9);
  g.stroke(segs, GOLD, 0.9, 1);
}

// Whether a site's crews are at work today: crews on it, not paused, not finished, and its last day was a working day
// (site.reason is null after a day of work, src/sim/monuments.js monumentDay).
export function isWorking(b, look = siteLook(b)) {
  return look.crews > 0 && !b.paused && !look.done && (b.site.reason === null || b.site.reason === undefined);
}

// The gangs: one sled and GANG.haulers haulers a crew, up the ramp (or along the apron before there is one) and back on
// game time, crews out of step; two masons a crew (at most four) at the course under way, swinging their mallets. A site
// that does no work keeps its sleds parked at the ramp's foot, its haulers standing by (and its masons at rest); with no
// crews, one empty sled stands there.
export function gangLayout(b, look, ramp, timeDays) {
  const spots = workSpots(b.type, b.x, b.y, b.w, b.d, look), working = isWorking(b, look);
  const way = ramp ? { x0: ramp.xf, x1: ramp.xt, y: (ramp.yo + ramp.yr) / 2, z0: 0, z1: ramp.z1 } : { ...spots.path, z0: 0, z1: 0 };
  const at = (t, side = 0) => U(p(way.x0 + (way.x1 - way.x0) * t, way.y + side), way.z0 + (way.z1 - way.z0) * t);
  const run = Math.max(0.05, Math.abs(way.x1 - way.x0)), dt = GANG.spacing / run;
  const sleds = [], people = [];
  const crews = look.crews, n = Math.max(1, crews);
  for (let j = 0; j < n; j++) {
    if (!working) {
      const t = Math.min(0.9, j * 0.12);                                      // parked at the foot, one behind another
      sleds.push({ q: [way.x0 + (way.x1 - way.x0) * t, way.y], z: way.z0 + (way.z1 - way.z0) * t, loaded: false });
      if (j < crews) for (let k = 0; k < GANG.haulers; k++) people.push({ q: at(Math.min(1, t + dt * (1 + (k >> 1))), (k % 2 ? 0.1 : -0.1) + 0.04), s: GANG.scale, pose: 'rest' });
      continue;
    }
    const phase = (((timeDays / GANG.tripDays + j / n) % 1) + 1) % 1, up = phase < GANG.upShare;
    const t = up ? phase / GANG.upShare : 1 - (phase - GANG.upShare) / (1 - GANG.upShare);
    const ahead = up ? 1 : -1, span = dt * (1 + GANG.haulers / 2);
    const ts = up ? Math.min(t, 1 - span) : Math.max(t, span);                // the sled, its haulers on the ramp ahead of it
    sleds.push({ q: [way.x0 + (way.x1 - way.x0) * ts, way.y], z: way.z0 + (way.z1 - way.z0) * ts, loaded: up });
    for (let k = 0; k < GANG.haulers; k++) {
      const tk = ts + ahead * dt * (1 + (k >> 1)), bob = Math.abs(Math.sin((timeDays * 3 + k * 0.37 + j * 0.21) * Math.PI)) * 0.8;
      const q = at(tk, k % 2 ? 0.08 : -0.08);
      people.push({ q: [q[0], q[1] - bob], s: GANG.scale, pose: 'pull' });
    }
  }
  const masons = [];
  if (!look.done && crews > 0) {
    for (let j = 0; j < Math.min(2, crews); j++) {
      const [mx, my, mz] = spots.masons[j];
      const swing = working ? Math.abs(Math.sin((timeDays * 2 + j * 0.5) * Math.PI)) : 0.2;
      masons.push({ q: U(p(mx, my), mz), s: GANG.scale, pose: working ? 'mallet' : 'rest', swing });
    }
  }
  return { working, sleds, people, masons };
}

// Draws the gangs of gangLayout: the masons (on the course, further back) first, then the sleds and their haulers.
function drawGangs(g, layout) {
  gang(g, layout.masons);
  for (const s of layout.sleds) {
    box(g, s.q[0] - 0.13, s.q[1] - 0.08, 0.26, 0.16, 1, s.z, ['#C9A26A', '#A8814E', '#86705E'], 0);
    if (s.loaded) {                                                          // a dressed limestone block, not a sack: a dark top edge
      const x = s.q[0] - 0.09, y = s.q[1] - 0.06, z = s.z + 1, h = 3.2;
      box(g, x, y, 0.18, 0.12, h, z, HAULED, 0);
      g.stroke([['M', U(p(x, y + 0.12), z + h)], ['L', U(p(x + 0.18, y + 0.12), z + h)], ['L', U(p(x + 0.18, y), z + h)]], '#6E5E58', 0.6, 0.85);
    }
  }
  gang(g, [...layout.people].sort((a, b) => a.q[1] - b.q[1]));
}

// The course-done dust (Full, t 0..1): soft puffs rising a little and fading along the course's top edges, a warm
// sand-grey darker than the casing and the sand round it (so it reads on a phone) with a pale core.
const DUST = '#D9C79C', DUST_CORE = '#F4EAD2';
function dust(g, edge, t) {
  const [a, f, c] = edge, k = 1 - t;
  for (let i = 0; i <= 8; i++) {
    const u = i / 8, q = u <= 0.5 ? [a[0] + (f[0] - a[0]) * u * 2, a[1] + (f[1] - a[1]) * u * 2] : [f[0] + (c[0] - f[0]) * (u - 0.5) * 2, f[1] + (c[1] - f[1]) * (u - 0.5) * 2];
    const r = 3 + 4 * t, at = [q[0], q[1] - 1 - 4 * t];
    g.ell(at, r, r * 0.6, DUST, { alpha: 0.7 * k });
    g.ell([at[0], at[1] - r * 0.1], r * 0.5, r * 0.3, DUST_CORE, { alpha: 0.6 * k });
  }
}

// The scene of one monument, without the see-through fade.
function drawScene(g, world, b, look, { now, timeDays, motion }) {
  const m = siteMemo(world, b, look, now);
  if (look.done) {
    const mark = drawFinished(g, b.x, b.y, b.w, b.d, b.type, look.style);
    const age = now - m.doneAt;
    if (motion === 'full') {
      if (age >= 0 && age < SHINE_MS) shine(g, mark, age / SHINE_MS);
      if (age >= 0 && age < SPARKLE_MS && mark && mark.apex) sparkle(g, mark.apex, age / SPARKLE_MS);
    } else if (age >= 0 && age < OUTLINE_MS) outline(g, silhouette(b));
    return { look, memo: m, ramp: null };
  }
  const ramp = drawSite(g, b.x, b.y, b.w, b.d, look, newestBlock(m, now, motion));
  const age = now - m.courseAt;
  if (m.lastCourse >= 0 && age >= 0) {                                       // a course laid while on screen
    const edge = courseTop(b.type, b.x, b.y, b.w, b.d, m.lastCourse);
    if (motion === 'full' && age < DUST_MS) dust(g, edge, age / DUST_MS);
    else if (motion !== 'full' && age < OUTLINE_MS) outlineEdge(g, edge);
  }
  drawGangs(g, gangLayout(b, look, ramp, timeDays));
  return { look, memo: m, ramp };
}

export function drawMonument(g, world, b, { now = 0, timeDays = 0, motion = 'full', ghost = null, selectedId = null } = {}) {
  if (!b || !b.site && !MONUMENT_LOOK[b.type]) return;
  const look = siteLook(b);
  const opts = { now, timeDays, motion };
  if (fadesBehind(world, b, ghost, selectedId, look)) throughLayer(g, MONUMENT_PLACING.fadeBehind, monumentBounds(b, look), (lg) => drawScene(lg, world, b, look, opts));
  else drawScene(g, world, b, look, opts);
}

// ── the minimap glyph (spec 5.7 item 2: "A minimap glyph marks each"); Track C's minimap calls it for a monument ──

// Draws a monument's glyph on the minimap's context, at the building's place, `scale` device px a tile: a pyramid's
// white triangle with a gold tip, an obelisk's tall bar, a mastaba's bench, the colossus's seated block; a site under way
// in sandstone with a dark edge. At least 5 device px across, centred on the footprint.
export function minimapGlyph(ctx, b, scale, dpr = 1) {
  const fam = MONUMENT_LOOK[b.type] ? MONUMENT_LOOK[b.type].family : null;
  if (!fam) return;
  const done = siteLook(b).done, min = 5 * dpr;
  const w = Math.max(min, b.w * scale), d = Math.max(min, b.d * scale);
  const cx = (b.x + b.w / 2) * scale, cy = (b.y + b.d / 2) * scale, x0 = cx - w / 2, y0 = cy - d / 2;
  const fill = done ? CASING[0] : CORE[1], edge = done ? '#6E5E70' : '#7A5E44';
  ctx.save();
  ctx.lineWidth = Math.max(1, dpr);
  ctx.strokeStyle = edge;
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (fam === 'pyramid') { ctx.moveTo(x0, y0 + d); ctx.lineTo(x0 + w, y0 + d); ctx.lineTo(cx, y0); ctx.closePath(); }
  else if (fam === 'obelisk') { const bw = Math.max(3 * dpr, w * 0.4); ctx.rect(cx - bw / 2, y0 - d * 0.3, bw, d * 1.3); }
  else if (fam === 'mastaba' || fam === 'step') { ctx.rect(x0, y0 + d * 0.3, w, d * 0.7); ctx.rect(x0 + w * 0.2, y0, w * 0.6, d * 0.3); }   // Stage 4.6: the step pyramid's stepped glyph
  else { ctx.rect(x0 + w * 0.15, y0 + d * 0.35, w * 0.7, d * 0.65); ctx.rect(cx - w * 0.15, y0, w * 0.3, d * 0.35); }
  ctx.stroke();
  ctx.fill();                                              // over the stroke's inner half, so a small glyph keeps its colour
  if (done && (fam === 'pyramid' || b.type === 'obelisk_large')) {
    ctx.fillStyle = GOLDC[0];
    ctx.beginPath();
    if (fam === 'pyramid') { ctx.moveTo(cx - w * 0.14, y0 + d * 0.28); ctx.lineTo(cx + w * 0.14, y0 + d * 0.28); ctx.lineTo(cx, y0); }
    else { const bw = Math.max(3 * dpr, w * 0.4); ctx.moveTo(cx - bw / 2, y0 - d * 0.3); ctx.lineTo(cx + bw / 2, y0 - d * 0.3); ctx.lineTo(cx, y0 - d * 0.6); }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Whether a building type is a monument drawn live (its art slot has live: true).
export const isLiveMonument = (type) => Boolean(ART[type] && ART[type].live && BUILDINGS[type] && BUILDINGS[type].monument);
