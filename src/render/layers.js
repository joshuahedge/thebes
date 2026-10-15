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
import { LAYER_HUE, JOBLESS_BANDS } from '../data/layers.js';
import { homeProgress, goodSupply, workersState } from '../sim/layers.js';
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
    const x = (Math.max(d.x0, r.x0) + Math.min(d.x1, r.x1) + 1) / 2, y = (Math.max(d.y0, r.y0) + Math.min(d.y1, r.y1) + 1) / 2;
    const c = p(x, y);
    stamp(g, labelSprite(g, R, String(d.jobless), { hue, person: true, outline: true }), c[0], c[1]);
  }
  for (const m of shorts) {
    const c = spot(m);
    stamp(g, labelSprite(g, R, `−${m.short}`, { hue, person: true }), c[0], c[1] - LIFT - R);
  }
}
