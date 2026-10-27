// Version 5.0 (Task 3, rulings 540-549): the three new layers on the map, drawn in the overlay layer through src/render/overlays.js drawOverlay (kinds 'progress',
// 'supply', 'workers'). The sim decides what is shown (src/sim/layers.js: lists kept until the buildings, roads or day change); this only paints, and reads
// without colour: a wash against hatching, an icon, a tick or a ring, and numbers.
//   Home progress  each home's footprint washed by how close it is to its next tier: every need met (a strong wash and a tick), one missing (a lighter wash and the
//                  missing need's icon) and two or more (the lightest wash, hatching, the first missing need's icon and how many are missing).
//   Goods supply   the picked good: a home that asks for it has a dot (it has it) or a hollow ring on a hatched footprint (it lacks it); a store or bazaar that holds
//                  some wears a label with the amount.
//   Workers        a workplace short of staff: a wash (hatched when it is below the staff it needs to work at all) and a label with how many workers it lacks; and the
//                  city's jobless, shared out over the districts, as a wash by band (hatched on the last) with the number in each.
// Badges are stamped from small sprites kept per canvas context and size (a screenful costs a screenful of drawImage calls) and left off when the map is too
// small to hold them (the washes still say it).
import { p, quad } from './iso.js';
import { UI, INK } from './art/palette.js';
import { makeDraw } from './art/ctx.js';
import { LAYER_HUE, JOBLESS_BANDS, LINES } from '../data/layers.js';
import { homeProgress as simProgress, goodSupply as simSupply, workersState, statusWork, supplyLines } from '../sim/layers.js';
import { cartPath } from '../sim/carts.js';
import { buildingsVersion, buildingAt } from '../sim/world.js';
import { layersVersion } from '../sim/layerVersion.js';
import { T as TILE } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { tilePolys, mark } from './overlays.js';

// How strongly each state is washed (the legend swatches use these too).
export const PROGRESS_ALPHA = { ready: 0.5, one: 0.32, many: 0.18 };
export const SUPPLY_ALPHA = { lacks: 0.14, holds: 0.3 };
export const WORKERS_ALPHA = { stopped: 0.42, short: 0.2 };
export const JOBLESS_ALPHA = [0.16, 0.28, 0.4];

const inRange = (list, range, pad = 1) => (range ? list.filter((m) => m.x >= range.x0 - pad && m.x <= range.x1 + 1 + pad && m.y >= range.y0 - pad && m.y <= range.y1 + 1 + pad) : list);

// ── Icons: ten-unit boxes, as src/render/spots.js's, one per need (the shape is the cue; the fill is a hint) ──

const circle = (cx, cy, r) => [['M', [cx, cy - r]], ['Q', [cx + r, cy - r], [cx + r, cy]], ['Q', [cx + r, cy + r], [cx, cy + r]], ['Q', [cx - r, cy + r], [cx - r, cy]], ['Q', [cx - r, cy - r], [cx, cy - r]], ['Z']];
const box = (x0, y0, x1, y1) => [['M', [x0, y0]], ['L', [x1, y0]], ['L', [x1, y1]], ['L', [x0, y1]], ['Z']];
const star = (cx, cy, ro, ri) => {
  const segs = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro;
    segs.push([i ? 'L' : 'M', [cx + r * Math.cos(a), cy + r * Math.sin(a)]]);
  }
  return [...segs, ['Z']];
};
const BOWL = [['M', [0.8, 4.4]], ['L', [9.2, 4.4]], ['Q', [9, 9.4], [5, 9.7]], ['Q', [1, 9.4], [0.8, 4.4]], ['Z']];
export const NEED_ICONS = {
  road: { segs: [...box(0.4, 2.6, 9.6, 4.4), ...box(0.4, 5.8, 9.6, 7.6)], fill: '#7A5200' },
  water: { segs: [['M', [5, 0.4]], ['Q', [9, 5], [8.3, 7]], ['Q', [7.6, 9.7], [5, 9.7]], ['Q', [2.4, 9.7], [1.7, 7]], ['Q', [1, 5], [5, 0.4]], ['Z']], fill: UI.water },   // the drop src/render/spots.js draws too
  food: { segs: [...BOWL, ['M', [2.2, 4.4]], ['Q', [5, 0.2], [7.8, 4.4]], ['Z']], fill: UI.food },
  twoFoods: { segs: [...BOWL, ...circle(3.4, 2.4, 1.7), ...circle(6.6, 2.4, 1.7)], fill: UI.food },
  threeFoods: { segs: [...BOWL, ...circle(2.4, 2.8, 1.5), ...circle(5, 1.9, 1.5), ...circle(7.6, 2.8, 1.5)], fill: UI.food },
  religion: { segs: [['M', [0.4, 3.8]], ['L', [5, 0.4]], ['L', [9.6, 3.8]], ['Z'], ...box(1.3, 4.6, 2.9, 8.4), ...box(4.2, 4.6, 5.8, 8.4), ...box(7.1, 4.6, 8.7, 8.4), ...box(0.4, 8.8, 9.6, 9.8)], fill: UI.religion },
  pottery: { segs: [['M', [3, 0.8]], ['L', [7, 0.8]], ['L', [7, 2.4]], ['Q', [10, 4], [9, 7]], ['Q', [8.5, 9.7], [5, 9.7]], ['Q', [1.5, 9.7], [1, 7]], ['Q', [0, 4], [3, 2.4]], ['Z']], fill: UI.goods },
  entertainment: { segs: star(5, 5.4, 4.9, 2), fill: UI.entertainment },
  beer: { segs: [...box(1.2, 2.4, 7, 9.5), ['M', [7, 3.8]], ['Q', [9.9, 3.8], [9.9, 6]], ['Q', [9.9, 8.2], [7, 8.2]], ['L', [7, 7]], ['Q', [8.4, 7], [8.4, 6]], ['Q', [8.4, 5], [7, 5]], ['Z'], ['M', [1.2, 2.4]], ['Q', [2.6, 0.2], [4.1, 1.4]], ['Q', [5.6, 0.2], [7, 2.4]], ['Z']], fill: '#C98A1B' },
  linen: { segs: [['M', [0.8, 1]], ['L', [9.2, 1]], ['L', [9.2, 9.6]], ['L', [5, 7.4]], ['L', [0.8, 9.6]], ['Z']], fill: '#7FA7C9' },
  jewellery: { segs: [['M', [2.4, 0.9]], ['L', [7.6, 0.9]], ['L', [9.7, 3.9]], ['L', [5, 9.7]], ['L', [0.3, 3.9]], ['Z']], fill: '#2E9E8F' },
  desirability: { segs: [['M', [5, 0.4]], ['Q', [9.6, 0.4], [9.6, 4.2]], ['Q', [9.6, 7.2], [5.6, 7.2]], ['L', [5.6, 9.6]], ['L', [4.4, 9.6]], ['L', [4.4, 7.2]], ['Q', [0.4, 7.2], [0.4, 4.2]], ['Q', [0.4, 0.4], [5, 0.4]], ['Z']], fill: UI.desirability },
  merge: { segs: [...box(0.6, 0.6, 4.6, 4.6), ...box(5.4, 0.6, 9.4, 4.6), ...box(0.6, 5.4, 4.6, 9.4), ...box(5.4, 5.4, 9.4, 9.4)], fill: '#6B5B45' },
};
// The icon a need gets (an unknown need falls back to a plain dot, never to nothing).
export const needIcon = (need) => NEED_ICONS[need] || { segs: circle(5, 5, 3.6), fill: UI.label };

const place = (segs, cx, cy, sc) => segs.map((s) => (s[0] === 'Z' ? s : [s[0], ...s.slice(1).map(([x, y]) => [cx + (x - 5) * sc, cy + (y - 5) * sc])]));

// ── Sprites ──

const spriteMemo = new WeakMap();   // ctx -> Map key -> { cv, w, h }
function sprite(g, key, w, h, paint) {
  const k = `${key}|${g.scale}`;
  let m = spriteMemo.get(g.ctx);
  if (!m) spriteMemo.set(g.ctx, (m = new Map()));
  let sp = m.get(k);
  if (sp) return sp;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * g.scale)); cv.height = Math.max(1, Math.ceil(h * g.scale));
  paint(makeDraw(cv.getContext('2d'), g.scale, g.cssScale), w, h);
  if (m.size >= 96) m.clear();
  sp = { cv, w, h };
  m.set(k, sp);
  return sp;
}
// A sprite is drawn at its own size (device px, no resampling), centred on (cx, cy) in art px.
const stamp = (g, sp, cx, cy) => g.ctx.drawImage(sp.cv, Math.round(cx * g.scale - sp.cv.width / 2), Math.round(cy * g.scale - sp.cv.height / 2));

// The badges stay about as big on the screen as they were at the phone's default zoom (radius 8 CSS px), in steps of half an art px so a pinch zoom reuses a few sprites,
// and are left off below BADGE_MIN_CSS (a tile is then too small to hold one; the washes and hatching still show).
export const BADGE_MIN_CSS = 0.7;
export const STRIPES_MIN_CSS = 1.2;
export const badgeRadius = (css) => Math.round(Math.min(9, Math.max(4.5, 8 / css)) * 2) / 2;
const cssOf = (g) => g.cssScale || g.scale;
const LIFT = 6;   // art px from a footprint's centre up to a badge's centre, as the other layers' marks

// A disc on a white halo; the need's icon in it, a tick when ready; `count` puts how many needs are missing in a small dark disc at its foot.
function discSprite(g, R, { need = null, tick = false, count = 0, hue, heavy = false }) {
  const pad = 2, size = 2 * (R + pad);
  return sprite(g, `disc|${R}|${need}|${tick}|${count}|${hue}|${heavy}`, size, size, (d) => {
    const c = [size / 2, size / 2];
    d.circ(c, R + 1.4, UI.halo, { alpha: 0.95 });
    d.circ(c, R, tick ? hue : UI.halo, { stroke: hue, strokeWidth: heavy ? 2.6 : 1.8 });
    if (tick) {
      d.stroke([['M', [c[0] - 0.46 * R, c[1] + 0.04 * R]], ['L', [c[0] - 0.1 * R, c[1] + 0.4 * R]], ['L', [c[0] + 0.5 * R, c[1] - 0.38 * R]]], UI.halo, Math.max(1.3, 0.3 * R));
    } else if (need) {
      const ic = needIcon(need), sc = (1.35 * R) / 10;
      d.path(place(ic.segs, c[0], c[1], sc), ic.fill, { stroke: INK, strokeWidth: 0.8, strokeAlpha: 0.85 });
    }
    if (count > 1) {
      const q = [c[0] + 0.78 * R, c[1] + 0.78 * R];
      d.circ(q, 0.5 * R, INK, { stroke: UI.halo, strokeWidth: 0.9 });
      d.text(q, String(count), { size: 0.78 * R, color: UI.halo, weight: '700' });
    }
  });
}

// A rounded label on a white halo with a word or a number in it, optionally led by a person (a head and shoulders): the amount a store holds, the workers a
// workplace lacks, the jobless a district holds. fill is the label's colour (white text) or null for a white label with `hue` text and rim.
function labelSprite(g, R, text, { hue, person = false, outline = false }) {
  const H = 1.7 * R, pad = 2, chars = text.length, tw = 0.62 * H * 0.78 * chars, lead = person ? 0.95 * H : 0;
  const w = tw + lead + 1.0 * H + 2 * pad, h = H + 2 * pad;
  return sprite(g, `label|${R}|${text}|${hue}|${person}|${outline}`, w, h, (d) => {
    const x0 = pad, y0 = pad, rr = H / 2;
    const pill = (inset, fill, o = {}) => {
      const a = x0 - inset, b = y0 - inset, c = x0 + w - 2 * pad + inset, e = y0 + H + inset, r = rr + inset;
      d.path([['M', [a + r, b]], ['L', [c - r, b]], ['Q', [c, b], [c, b + r]], ['L', [c, e - r]], ['Q', [c, e], [c - r, e]], ['L', [a + r, e]], ['Q', [a, e], [a, e - r]], ['L', [a, b + r]], ['Q', [a, b], [a + r, b]], ['Z']], fill, o);
    };
    pill(1.2, UI.halo, { alpha: 0.95 });
    pill(0, outline ? UI.halo : hue, { stroke: outline ? hue : INK, strokeWidth: outline ? 1.6 : 0.7, strokeAlpha: outline ? 1 : 0.7 });
    const ink = outline ? hue : UI.halo;
    if (person) {
      const cx = x0 + 0.62 * H, cy = y0 + H / 2;
      d.circ([cx, cy - 0.2 * H], 0.15 * H, ink);
      d.path([['M', [cx - 0.27 * H, cy + 0.34 * H]], ['Q', [cx - 0.27 * H, cy + 0.02 * H], [cx, cy + 0.02 * H]], ['Q', [cx + 0.27 * H, cy + 0.02 * H], [cx + 0.27 * H, cy + 0.34 * H]], ['Z']], ink);
    }
    d.text([x0 + lead + (w - 2 * pad - lead) / 2, y0 + H / 2 + 0.03 * H], text, { size: 0.62 * H, color: ink, weight: '700' });
  });
}

// ── Footprints ──

// An entry of a sim list keeps its footprint polygon on itself (the lists are cached by src/sim/layers.js, so each is worked out once per change, not once per frame).
const footOf = (m) => m.foot || (m.foot = quad(m.b.x, m.b.y, m.b.w, m.b.d, 0));

const spot = (m) => m.q || (m.q = p(m.x, m.y));   // the entry's centre in art px, kept on it

// ── Slicing the homes' status ──

// Home progress and Goods supply need every home's houseStatus, about half a millisecond a home on a desktop and several times that on a phone, and they are worked out
// again each game day. A frame never does it all: each draw asks the sim (src/sim/layers.js statuses) for a slice of homes, sized from how long the last slice took per
// home so one slice stays near SLICE_MS whatever the device; the layer keeps drawing the list last completed (the first time, the homes worked out so far) until the new
// one is whole. The clock lives here, in the render; the sim is only told how many homes.
export const SLICE_MS = 6, SLICE_MIN = 2, SLICE_MAX = 64;
export const sliceFor = (msPerHome) => Math.max(SLICE_MIN, Math.min(SLICE_MAX, Math.floor(SLICE_MS / Math.max(msPerHome, 0.01))));
let slice = 8, perHome = 0, pinned = null;   // homes a frame; the smoothed ms a home took (0: not yet measured); pinned: a fixed slice, for the tests
export const pinSlice = (n) => { pinned = n; };
function sliced(run) {
  const t0 = performance.now(), n0 = statusWork.calls;
  const out = run(pinned || slice);
  const n = statusWork.calls - n0;
  if (n > 0) {
    const each = (performance.now() - t0) / n;
    perHome = perHome ? 0.5 * perHome + 0.5 * each : each;
    slice = sliceFor(perHome);
  }
  return out;
}
const homeProgress = (world) => sliced((budget) => simProgress(world, budget));
const goodSupply = (world, good) => sliced((budget) => simSupply(world, good, budget));

// ── Home progress ──

export function drawProgress(g, world, range) {
  const hue = LAYER_HUE.progress;
  const marks = inRange(homeProgress(world), range);
  if (!marks.length) return;
  const by = { ready: [], one: [], many: [] };
  for (const m of marks) by[m.state].push(footOf(m));
  g.polys(by.ready, hue, { alpha: PROGRESS_ALPHA.ready, stroke: hue, strokeWidth: 1.3, strokeAlpha: 0.95 });
  g.polys(by.one, hue, { alpha: PROGRESS_ALPHA.one });
  const css = cssOf(g);
  // The wash and the stripes in one fill. Zoomed right out (css < STRIPES_MIN_CSS) a pattern fill over every home on a Large map costs more than it shows, and the number
  // on each badge says it as well: a plain wash there.
  if (css >= STRIPES_MIN_CSS) g.hatchPolys(by.many, hue, { fill: PROGRESS_ALPHA.many, line: 0.85, gap: 4 });
  else g.polys(by.many, hue, { alpha: PROGRESS_ALPHA.many });
  if (css < BADGE_MIN_CSS) return;
  const R = badgeRadius(css), sprites = new Map();   // one sprite per look, found once a frame (a screenful of homes has a handful of looks)
  for (const m of marks) {
    const look = m.look || (m.look = m.state === 'ready' ? 'ready' : `${m.first}|${m.state === 'many' ? m.n : 0}`);
    let sp = sprites.get(look);
    if (!sp) sprites.set(look, (sp = discSprite(g, R, m.state === 'ready' ? { tick: true, hue } : { need: m.first, count: m.state === 'many' ? m.n : 0, hue, heavy: m.state === 'many' })));
    const c = spot(m);
    stamp(g, sp, c[0], c[1] - LIFT);
  }
}

// ── Goods supply ──

export function drawSupply(g, world, range, good) {
  const hue = LAYER_HUE.supply;
  const s = goodSupply(world, good);
  const homes = inRange(s.homes, range), holders = inRange(s.holders, range);
  const lacking = homes.filter((m) => !m.has);
  const held = holders.map(footOf);
  g.hatchPolys(lacking.map(footOf), hue, { fill: SUPPLY_ALPHA.lacks, line: 0.8, gap: 5 });
  g.polys(held, hue, { alpha: SUPPLY_ALPHA.holds, stroke: hue, strokeWidth: 1.2, strokeAlpha: 0.9 });
  for (const m of homes) mark(g, m, hue);   // a filled dot has it, a hollow ring lacks it: the other layers' key
  const css = cssOf(g);
  if (css < BADGE_MIN_CSS) return;
  const R = badgeRadius(css);
  for (const m of holders) {
    const c = spot(m);
    stamp(g, labelSprite(g, R, String(m.amount), { hue }), c[0], c[1] - LIFT - R);
  }
}

// ── Workers ──

export function drawWorkers(g, world, range) {
  const hue = LAYER_HUE.workers;
  const w = workersState(world);
  // The districts first, under the workplaces: each district's land (not water) in range, washed by band.
  const bands = JOBLESS_BANDS.map(() => []);
  const r = range || { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
  const shown = [];
  for (const d of w.districts) {
    if (d.x1 < r.x0 || d.x0 > r.x1 || d.y1 < r.y0 || d.y0 > r.y1) continue;
    shown.push(d);
    for (let y = Math.max(d.y0, r.y0, 0); y <= Math.min(d.y1, r.y1, world.size - 1); y++) {
      for (let x = Math.max(d.x0, r.x0, 0); x <= Math.min(d.x1, r.x1, world.size - 1); x++) {
        if (world.terrain[idx(world.size, x, y)] !== TILE.WATER) bands[d.band].push([x, y]);
      }
    }
  }
  bands.forEach((tiles, k) => g.polys(tilePolys(tiles), hue, { alpha: JOBLESS_ALPHA[k] }));
  g.hatchPolys(tilePolys(bands[bands.length - 1]), hue, { fill: 0, line: 0.55, gap: 6 });
  const shorts = inRange(w.shorts, range);
  const stopped = shorts.filter((m) => m.stopped), running = shorts.filter((m) => !m.stopped);
  g.polys(running.map(footOf), hue, { alpha: WORKERS_ALPHA.short, stroke: hue, strokeWidth: 1.2, strokeAlpha: 0.9 });
  g.hatchPolys(stopped.map(footOf), hue, { fill: WORKERS_ALPHA.stopped, line: 0.9, gap: 4 });
  g.polys(stopped.map(footOf), 'none', { stroke: hue, strokeWidth: 1.2, strokeAlpha: 0.9 });
  const css = cssOf(g);
  if (css < BADGE_MIN_CSS) return;
  const R = badgeRadius(css);
  for (const d of shown) {
    const c = p((d.x0 + d.x1 + 1) / 2, (d.y0 + d.y1 + 1) / 2);   // the district's own centre, so the number stays put as the map is panned
    stamp(g, labelSprite(g, R, String(d.jobless), { hue, person: true, outline: true }), c[0], c[1]);
  }
  for (const m of shorts) {
    const c = spot(m);
    stamp(g, labelSprite(g, R, `−${m.short}`, { hue, person: true }), c[0], c[1] - LIFT - R);
  }
}

// ── Supply lines (Version 8.3, Track K, rulings 1416-1418) ──
// Every Keep stocked order as a line along its road route (src/sim/layers.js supplyLines), drawn source to store so its dashes move the way the goods go;
// thicker for more brought last month (LINES); amber with long dashes that stand still when the order is stuck (dry, or no source), and a dashed amber
// ring round a store whose order has no source to draw a line from. A chevron at the store's end says which way the goods go when nothing moves (Still).
// The list is worked out once for a frame signature (the day, the roads, the buildings, a pause or resume, every order and every cart), not every frame.
export const STUCK_HUE = UI.warn;
const STUCK = new Set(['dry', 'none']);
const lineMemo = new WeakMap();   // world -> { key, lines }
function lineSignature(world) {
  let sig = 0;
  for (const b of Object.values(world.buildings)) {
    if (!b.orders) continue;
    for (const [good, o] of Object.entries(b.orders)) {
      for (const ch of good) sig = (sig * 31 + ch.charCodeAt(0)) | 0;
      sig = (sig * 31 + b.id * 7 + (o.fetch | 0) * 3 + (Number.isInteger(o.from) ? o.from * 11 + 1 : 0) + (o.lastMonth | 0) * 5 + Math.round((b.store[good] || 0))) | 0;
    }
  }
  for (const c of world.carts) sig = (sig * 31 + c.id * 13 + c.from * 17 + c.due + c.state.length) | 0;
  return `${world.day}|${world.roadVersion}|${buildingsVersion(world)}|${layersVersion(world)}|${sig}`;
}
// The lines with their points in art px (source first), kept for the frame signature.
export function linesFor(world) {
  const key = lineSignature(world), m = lineMemo.get(world);
  if (m && m.key === key) return m.lines;
  // Lines of one store's orders run side by side, not over each other: the k-th of a store's n lines is moved LINE_SPACING art px to one side per step from the middle.
  const list = supplyLines(world), count = new Map(), seen = new Map();
  for (const l of list) if (l.path) count.set(l.home, (count.get(l.home) || 0) + 1);
  const lines = list.map((l) => {
    const k = seen.get(l.home) || 0;
    if (l.path) seen.set(l.home, k + 1);
    const shift = l.path ? (k - ((count.get(l.home) || 1) - 1) / 2) * LINE_SPACING : 0;
    const pts = l.path ? beside([...l.path].reverse().map((t) => { const x = t % world.size; return p(x + 0.5, (t - x) / world.size + 0.5); }), shift) : null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of l.path || []) { const x = t % world.size, y = (t - x) / world.size; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const home = world.buildings[l.home];
    return { ...l, pts, box: { x0, y0, x1, y1 }, homeB: home, width: lineWidth(l.lastMonth), stuck: STUCK.has(l.state) };
  });
  lineMemo.set(world, { key, lines });
  return lines;
}
export const lineWidth = (lastMonth) => Math.min(LINES.thick, LINES.thin + Math.sqrt(Math.max(0, lastMonth) / LINES.per));
const LINE_SPACING = 4;   // art px between two lines of one store laid side by side
// A polyline moved `d` art px to its left (each point along the mean of its two segments' normals); 0 leaves it as it is.
function beside(pts, d) {
  if (!d || pts.length < 2) return pts;
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; return [-dy / n, dx / n]; };
  return pts.map((q, i) => {
    const n1 = unit(pts[Math.max(0, i - 1)], pts[Math.max(1, i)]), n2 = unit(pts[Math.min(pts.length - 2, i)], pts[Math.min(pts.length - 1, i + 1)]);
    const nx = n1[0] + n2[0], ny = n1[1] + n2[1], n = Math.hypot(nx, ny) || 1;
    return [q[0] + (nx / n) * d, q[1] + (ny / n) * d];
  });
}

const traceLine = (g, pts) => {
  const ctx = g.ctx, s = g.scale;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * s, pts[i][1] * s);
};
function strokeLine(g, pts, color, width, dash, offset, alpha = 1) {
  const ctx = g.ctx;
  traceLine(g, pts);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * g.scale;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash ? dash.map((v) => v * g.scale) : []);
  ctx.lineDashOffset = offset * g.scale;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = 1;
}
// A chevron at the line's last point, pointing along its last step (the way the goods go).
function chevron(g, pts, color, width) {
  const n = pts.length;
  if (n < 2) return;
  const [ax, ay] = pts[n - 2], [bx, by] = pts[n - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len, k = 3 + width;
  const tip = [bx, by], l = [bx - ux * k - uy * k * 0.7, by - uy * k + ux * k * 0.7], r = [bx - ux * k + uy * k * 0.7, by - uy * k - ux * k * 0.7];
  g.path([['M', l], ['L', tip], ['L', r]], 'none', { stroke: UI.halo, strokeWidth: width + 2.2, strokeAlpha: 0.9 });
  g.path([['M', l], ['L', tip], ['L', r]], 'none', { stroke: color, strokeWidth: width + 0.4 });
}
const visible = (box, range, pad = 2) => !range || !(box.x1 < range.x0 - pad || box.x0 > range.x1 + pad || box.y1 < range.y0 - pad || box.y0 > range.y1 + pad);

// now: the frame's clock in ms (dashes travel with it); still: true under the Still motion level (the dashes stand, the chevrons say the way).
export function drawSupplyLines(g, world, range, now = 0, still = false) {
  const hue = LAYER_HUE.lines;
  const lines = linesFor(world);
  const travel = still ? 0 : -((now / 1000) * LINES.speed) % (LINES.dash + LINES.gap);
  for (const l of lines) {
    if (!l.pts) continue;
    if (!visible(l.box, range)) continue;
    const color = l.stuck ? STUCK_HUE : hue;
    strokeLine(g, l.pts, UI.halo, l.width + 2, null, 0, 0.75);   // a white halo under every line, so it reads on any ground
    if (l.stuck) strokeLine(g, l.pts, color, l.width, [LINES.stuckDash, LINES.stuckGap], 0);
    else strokeLine(g, l.pts, color, l.width, [LINES.dash, LINES.gap], travel);
    chevron(g, l.pts, color, Math.max(1.2, l.width * 0.6));
  }
  // A store whose order has no source has no line: a dashed amber ring round its footprint says it waits.
  const ringed = new Set();
  for (const l of lines) {
    if (l.pts || !l.homeB || ringed.has(l.home)) continue;
    const b = l.homeB;
    if (range && (b.x + b.w < range.x0 - 1 || b.x > range.x1 + 1 || b.y + b.d < range.y0 - 1 || b.y > range.y1 + 1)) continue;
    ringed.add(l.home);
    const q = quad(b.x - 0.25, b.y - 0.25, b.w + 0.5, b.d + 0.5, 0);
    strokeLine(g, [...q, q[0]], UI.halo, 3, null, 0, 0.8);
    strokeLine(g, [...q, q[0]], STUCK_HUE, 1.8, [LINES.stuckDash, LINES.stuckGap], 0);
  }
}

// The line under a point on the map (fractional tile coordinates), or null: the nearest line within `reach` tiles of the point, measured to its route's
// segments. Tapping a line opens its home store's sheet (createUI). Lines without a route are their store's ring: the store itself takes the tap.
export function supplyLineAt(world, tx, ty, reach = 0.75) {
  const fx = Math.floor(tx), fy = Math.floor(ty);
  if (fx >= 0 && fy >= 0 && fx < world.size && fy < world.size && buildingAt(world, fx, fy)) return null;   // a building's own footprint is that building's tap, not a line's
  let best = null, bestD = reach;
  for (const l of linesFor(world)) {
    if (!l.path) continue;
    if (tx < l.box.x0 - 1 || tx > l.box.x1 + 2 || ty < l.box.y0 - 1 || ty > l.box.y1 + 2) continue;
    const pt = (t) => { const x = t % world.size; return [x + 0.5, (t - x) / world.size + 0.5]; };
    for (let i = 0; i < l.path.length; i++) {
      const a = pt(l.path[i]), b = i + 1 < l.path.length ? pt(l.path[i + 1]) : a;
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 1.01) continue;   // a ferry's hop over the water is not a tappable stretch
      const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      const u = L ? Math.max(0, Math.min(1, ((tx - a[0]) * dx + (ty - a[1]) * dy) / L)) : 0;
      const d = Math.hypot(tx - (a[0] + u * dx), ty - (a[1] + u * dy));
      if (d < bestD) { bestD = d; best = l; }
    }
  }
  return best;
}

// ── The pick of a source (Version 8.3, ruling 1413): src/ui/s47/sourcePick.js ──
// Every store that can hold the good (sourceChoices): lit with a wash and a label of what it can spare, or dimmed (hatched grey) with the reason in a word;
// the road route from the order's store to each linked one drawn dashed; the order's own store outlined in ink. label(c): the words on a store's label
// (the UI's, so the render says nothing of its own); focus: the store the bar's focused button names, outlined heavier; homeLabel: the words on the order's
// own store, the destination, lit in ink (the bar's head names it too).
export function drawPickChoices(g, world, home, choices, label, focus = null, homeLabel = null) {
  const hue = LAYER_HUE.lines, grey = '#6B6257';
  const h = world.buildings[home];
  if (!h) return;
  for (const c of choices) {
    if (!Number.isFinite(c.len)) continue;
    const path = cartPath(world, { to: home, from: c.id });
    if (!path || path.length < 2) continue;
    const pts = path.map((t) => { const x = t % world.size; return p(x + 0.5, (t - x) / world.size + 0.5); });
    strokeLine(g, pts, UI.halo, 3.6, null, 0, 0.7);
    strokeLine(g, pts, c.why ? grey : hue, c.id === focus ? 2.4 : 1.6, [3, 3], 0, c.why ? 0.7 : 0.95);
  }
  for (const c of choices) {
    const b = world.buildings[c.id];
    if (!b) continue;
    const foot = quad(b.x, b.y, b.w, b.d, 0);
    if (c.why) g.hatchPolys([foot], grey, { fill: 0.18, line: 0.7, gap: 4 });
    else g.poly(foot, hue, { alpha: 0.22, stroke: hue, strokeWidth: c.id === focus ? 2.6 : 1.4, strokeAlpha: 0.95 });
    if (c.id === focus) g.poly(foot, 'none', { stroke: INK, strokeWidth: 2.2, strokeAlpha: 0.9 });
  }
  g.poly(quad(h.x - 0.15, h.y - 0.15, h.w + 0.3, h.d + 0.3, 0), INK, { alpha: 0.16, stroke: INK, strokeWidth: 2, strokeAlpha: 0.95 });
  const R = badgeRadius(cssOf(g));
  if (homeLabel) { const at = p(h.x + h.w / 2, h.y + h.d / 2); stamp(g, labelSprite(g, R, homeLabel, { hue: INK }), at[0], at[1] - LIFT - R); }
  for (const c of choices) {
    const b = world.buildings[c.id];
    if (!b) continue;
    const at = p(b.x + b.w / 2, b.y + b.d / 2);
    stamp(g, labelSprite(g, R, label(c), { hue: c.why ? grey : hue, outline: Boolean(c.why) }), at[0], at[1] - LIFT - R);
  }
}
