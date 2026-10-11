// Overlays (spec 6.3): filled dot = has it, hollow ring = missing, one hue per overlay. Plus the reach
// highlight for a selected building and the placement ghost's three states (spec 6.5).
import { BUILDINGS } from '../data/buildings.js';
import { housesOf, allBuildings } from '../sim/world.js';
import { houseStatus } from '../sim/housing.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { p, U, tileDiamond, quad } from './iso.js';
import { UI, INK, TEAL_DARK } from './art/palette.js';
import { ART, slotFor } from './art/registry.js';
import { GUIDE_PULSE_MS } from '../data/ui.js';

export const OVERLAYS = ['water', 'food', 'religion', 'housing'];
export const OVERLAY_HUE = { water: UI.water, food: UI.food, religion: UI.religion, housing: UI.housing };
export const SERVICE_TYPES = { water: ['well'], food: ['bazaar'], religion: ['temple'], housing: [] };

export function houseMark(world, house, kind) {
  const s = houseStatus(world, house);
  if (kind === 'housing') {
    const blocking = s.checklist.find((c) => !c.met);
    return { has: !blocking, need: blocking ? blocking.need : null };
  }
  const item = s.checklist.find((c) => c.need === kind);
  return item ? { has: item.met, need: kind } : null;
}

const markCache = new WeakMap(); // world -> { key, marks }

// Cheap per-frame signature of what can change a mark between days: which buildings exist and their
// staff, paused and tier. O(n) over buildings; the expensive part (houseStatus per house) stays memoised.
function buildingSignature(world) {
  let sig = 0, n = 0;
  for (const b of allBuildings(world)) { n++; sig = (sig * 31 + b.id * 13 + (b.staff || 0) * 3 + (b.paused ? 7 : 0) + (b.tier || 0) * 11) | 0; }
  return `${n}:${sig}`;
}

function allMarks(world, kind) {
  const key = `${kind}|${world.day}|${world.roadVersion}|${world.nextId}|${buildingSignature(world)}`;
  const c = markCache.get(world);
  if (c && c.key === key) return c.marks;
  const marks = [];
  for (const h of housesOf(world)) {
    const m = houseMark(world, h, kind);
    if (m) marks.push({ id: h.id, x: h.x + h.w / 2, y: h.y + h.d / 2, has: m.has, need: m.need });
  }
  markCache.set(world, { key, marks });
  return marks;
}

// Memoised per tick: marks only change when the world does. The same array comes back until then.
export function overlayMarks(world, kind, range = null) {
  const marks = allMarks(world, kind);
  if (!range) return marks;
  return marks.filter((m) => m.x >= range.x0 && m.x <= range.x1 + 1 && m.y >= range.y0 && m.y <= range.y1 + 1);
}

const reachOf = (def) => def.reach || def.supplyReach || def.producerReach || 0;

export function reachTiles(world, b) {
  const dist = reachOf(BUILDINGS[b.type]);
  return dist ? [...roadReach(world, b, dist).keys()] : [];
}

function tintTiles(g, world, tiles, color, alpha) {
  for (const t of tiles) {
    const x = t % world.size, y = (t - x) / world.size;
    g.poly(tileDiamond(x, y), color, { alpha });
  }
}

function mark(g, m, color) {
  const c = U(p(m.x, m.y), 6);
  if (m.has) {
    g.circ(c, 4.8, INK, { alpha: 0.6 });
    g.circ(c, 4.2, UI.halo, { alpha: 0.9 });
    g.circ(c, 3, color);
  } else {
    g.circ(c, 4.4, 'none', { stroke: INK, strokeWidth: 1, strokeAlpha: 0.6 });
    g.circ(c, 3.6, 'none', { stroke: UI.halo, strokeWidth: 3.2, strokeAlpha: 0.9 });
    g.circ(c, 3.6, 'none', { stroke: color, strokeWidth: 1.6 });
  }
}

export function drawOverlay(g, world, kind, range) {
  if (!SERVICE_TYPES[kind]) return;
  const color = OVERLAY_HUE[kind];
  const tiles = new Set();
  for (const b of allBuildings(world)) {
    if (!SERVICE_TYPES[kind].includes(b.type) || !isWorking(world, b)) continue;
    for (const t of reachTiles(world, b)) tiles.add(t);
  }
  for (const t of tiles) {
    const x = t % world.size, y = (t - x) / world.size;
    if (range && (x < range.x0 || x > range.x1 || y < range.y0 || y > range.y1)) continue;
    g.poly(tileDiamond(x, y), color, { alpha: 0.16 });
  }
  for (const m of overlayMarks(world, kind, range)) mark(g, m, color);
}

export function drawReachHighlight(g, world, b) {
  tintTiles(g, world, reachTiles(world, b), UI.housing, 0.22);
  g.poly(quad(b.x, b.y, b.w, b.d, 0), 'none', { stroke: UI.halo, strokeWidth: 2.2, strokeAlpha: 0.9 });
  g.poly(quad(b.x, b.y, b.w, b.d, 0), 'none', { stroke: UI.housing, strokeWidth: 1.2 });
}

// ghost = { x, y, w, d, state: 'ok' | 'warn' | 'bad' }
export function drawGhost(g, ghost) {
  const { x, y, w, d, state } = ghost;
  const pts = quad(x, y, w, d, 0);
  const centre = p(x + w / 2, y + d / 2);
  if (state === 'bad' || state === 'demolish') {
    g.save();
    g.clip(pts);
    g.poly(pts, UI.bad, { alpha: 0.18 });
    const left = p(x, y + d)[0], right = p(x + w, y)[0], top = p(x, y)[1], bottom = p(x + w, y + d)[1];
    for (let k = left - (bottom - top); k < right; k += 4) g.line([k, bottom], [k + (bottom - top), top], UI.bad, 1, 0.8);
    g.restore();
    g.poly(pts, 'none', { stroke: UI.bad, strokeWidth: 1.4 });
    if (state === 'bad') g.text(centre, '✕', { size: 9, color: UI.bad });
    return;
  }
  const color = state === 'warn' ? UI.warn : UI.ok;
  g.poly(pts, color, { alpha: 0.15 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: 0.8 });
  g.poly(pts, 'none', { stroke: color, strokeWidth: 1.4 });
  g.text(centre, state === 'warn' ? '!' : '✓', { size: 9, color });
}

// Problem markers (early-game pass 2.8): a coral "!" badge over a building with an alert, an amber "↓" over a
// home counting down to lose a tier. One per building, drawn in the overlay pass, never animated. The list is a
// pure function the draw and the tests share. `lift` is art px from the footprint centre up to the badge's
// centre: the sprite's top (its height above the back corner, plus the back corner's 4 * (w + d) above the
// centre), then the badge radius and a pixel.
const BADGE_R = 5;

export function problemMarkers(world, alerts, range = null) {
  const flagged = new Set();
  for (const a of alerts || []) if (a.id !== undefined && a.id !== null) flagged.add(a.id);
  const out = [];
  for (const b of allBuildings(world)) {
    const kind = b.type === 'house' ? (b.tier > 1 && b.downTimer > 0 ? 'down' : null) : (flagged.has(b.id) ? 'problem' : null);
    if (!kind) continue;
    const x = b.x + b.w / 2, y = b.y + b.d / 2;
    if (range && (x < range.x0 || x > range.x1 + 1 || y < range.y0 || y > range.y1 + 1)) continue;
    const art = ART[slotFor(b)];
    out.push({ id: b.id, x, y, lift: (art ? art.height + 4 * (b.w + b.d) : 30) + BADGE_R + 1, kind });
  }
  return out;
}

export function drawProblemMarkers(g, world, alerts, range) {
  for (const m of problemMarkers(world, alerts, range)) {
    const c = U(p(m.x, m.y), m.lift);
    const down = m.kind === 'down';
    g.circ(c, BADGE_R + 1.2, UI.halo, { alpha: 0.9 });
    g.circ(c, BADGE_R, down ? UI.warn : UI.problem, { stroke: INK, strokeWidth: 0.6, strokeAlpha: 0.5 });
    g.text(c, down ? '↓' : '!', { size: 7.5, weight: '700', color: down ? UI.label : UI.halo });   // the glyph, not the colour, says which
  }
}

// The guided start's ring on the ground at a step's target (early-game pass 3.2): teal on a white halo.
// Pulsing, it grows and fades once per GUIDE_PULSE_MS; at rest it is drawn still (always so under reduced
// motion, which the caller decides).
export function drawGuideMarker(g, x, y, pulsing = false, now = 0) {
  const k = pulsing ? (now % GUIDE_PULSE_MS) / GUIDE_PULSE_MS : 0;
  const r = 0.8 + k * 0.6;
  const fade = 1 - k * 0.7;
  const pts = quad(x - r, y - r, 2 * r, 2 * r, 0);
  g.poly(pts, TEAL_DARK, { alpha: 0.12 * fade });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 3.4, strokeAlpha: 0.85 * fade });
  g.poly(pts, 'none', { stroke: TEAL_DARK, strokeWidth: 2, strokeAlpha: fade });
}
