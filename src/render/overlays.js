// Overlays (spec 6.3): filled dot = has it, hollow ring = missing, one hue per overlay. Plus the reach
// highlight for a selected building and the placement ghost's three states (spec 6.5).
import { BUILDINGS } from '../data/buildings.js';
import { housesOf, allBuildings } from '../sim/world.js';
import { houseStatus } from '../sim/housing.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { p, U, tileDiamond, quad } from './iso.js';
import { UI } from './art/palette.js';

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

const inRange = (b, r) => !r || (b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0);

export function overlayMarks(world, kind, range = null) {
  const out = [];
  for (const h of housesOf(world)) {
    if (!inRange(h, range)) continue;
    const m = houseMark(world, h, kind);
    if (m) out.push({ id: h.id, x: h.x + h.w / 2, y: h.y + h.d / 2, has: m.has, need: m.need });
  }
  return out;
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
    g.circ(c, 4.2, UI.halo, { alpha: 0.9 });
    g.circ(c, 3, color);
  } else {
    g.circ(c, 3.6, 'none', { stroke: UI.halo, strokeWidth: 3.2, strokeAlpha: 0.9 });
    g.circ(c, 3.6, 'none', { stroke: color, strokeWidth: 1.6 });
  }
}

export function drawOverlay(g, world, kind, range) {
  const color = OVERLAY_HUE[kind];
  for (const b of allBuildings(world)) {
    if (!SERVICE_TYPES[kind].includes(b.type) || !isWorking(world, b)) continue;
    tintTiles(g, world, reachTiles(world, b), color, 0.16);
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
  if (state === 'bad') {
    g.save();
    g.clip(pts);
    g.poly(pts, UI.bad, { alpha: 0.18 });
    const left = p(x, y + d)[0], right = p(x + w, y)[0], top = p(x, y)[1], bottom = p(x + w, y + d)[1];
    for (let k = left - (bottom - top); k < right; k += 4) g.line([k, bottom], [k + (bottom - top), top], UI.bad, 1, 0.8);
    g.restore();
    g.poly(pts, 'none', { stroke: UI.bad, strokeWidth: 1.4 });
    g.text(centre, '✕', { size: 9, color: UI.bad });
    return;
  }
  const color = state === 'warn' ? UI.warn : UI.ok;
  g.poly(pts, color, { alpha: 0.15 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: 0.8 });
  g.poly(pts, 'none', { stroke: color, strokeWidth: 1.4 });
  g.text(centre, state === 'warn' ? '!' : '✓', { size: 9, color });
}
