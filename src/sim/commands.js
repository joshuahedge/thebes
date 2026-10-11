import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { footprint, idx, inBounds } from './grid.js';
import { T, TERRAIN_BY_NAME } from './terrain.js';
import { makeBuilding, insertBuilding, removeBuilding, buildingAt } from './world.js';
import { touchesRoad, buildingsInReach } from './reach.js';
import { canAfford, spend, refund } from './money.js';
import { costOf, roadCostOf } from './costs.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';
import { storeAccepts } from './production.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });
const storesAny = (o, goods) => (BUILDINGS[o.type].stores || []).some((g) => goods.includes(g));

const isTile = (x, y) => Number.isInteger(x) && Number.isInteger(y);

export function checkTiles(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return 'unknown';
  if (!isUnlocked(world, type)) return 'locked';
  // A fractional tile would index between cells and leave ghost entries in occ and the save.
  if (!isTile(x, y)) return 'out_of_bounds';
  for (const [tx, ty] of footprint(x, y, def.w, def.d)) {
    if (!inBounds(world.size, tx, ty)) return 'out_of_bounds';
    const i = idx(world.size, tx, ty);
    if (world.terrain[i] === T.WATER) return 'water';
    if (world.occ[i] || world.road[i]) return 'occupied';
    if (def.terrain && world.terrain[i] !== TERRAIN_BY_NAME[def.terrain]) return 'needs_' + def.terrain;
  }
  if (def.needsRoad && !touchesRoad(world, { x, y, w: def.w, d: def.d })) return 'needs_road';
  return null;
}

function placementWarnings(world, type, x, y) {
  const def = BUILDINGS[type];
  const probe = { id: -1, x, y, w: def.w, d: def.d };
  const warnings = [];
  // A plot can be placed off the road but no one moves in until one touches it; gardens and statues need none.
  if (type === 'house' && !touchesRoad(world, probe)) warnings.push('needs_road');
  if (def.produces && !buildingsInReach(world, probe, def.producerReach, (o) => storeAccepts(o, def.produces.good)).length) {
    warnings.push('no_storage');
  }
  if (def.sells && !buildingsInReach(world, probe, def.supplyReach, (o) => storesAny(o, def.sells)).length) {
    warnings.push('no_supply');
  }
  return warnings;
}

export function canPlace(world, type, x, y) {
  const reason = checkTiles(world, type, x, y);
  if (reason) return fail(reason);
  if (!canAfford(world, costOf(world, type))) return fail('no_gold');
  return { ok: true, warnings: placementWarnings(world, type, x, y) };
}

export function place(world, type, x, y) {
  const check = canPlace(world, type, x, y);
  if (!check.ok) return check;
  const cost = costOf(world, type);
  const b = insertBuilding(world, makeBuilding(world, type, x, y));
  spend(world, cost);
  pushUndo(world, { kind: 'place', ids: [b.id], cost });
  return { ok: true, id: b.id, warnings: check.warnings };
}

// A quarter of what the building costs in this city (difficulty included); plots refund nothing (spec 4.11).
export const demolishRefundFor = (world, b) => (b.type === 'house' ? 0 : Math.floor(costOf(world, b.type) * ECONOMY.demolishRefund));

export function demolishAt(world, x, y) {
  if (!isTile(x, y) || !inBounds(world.size, x, y)) return fail('out_of_bounds', { refund: 0 });
  const b = buildingAt(world, x, y);
  if (b) {
    const snap = JSON.parse(JSON.stringify(b));
    removeBuilding(world, b.id);
    const amount = demolishRefundFor(world, b);
    refund(world, amount);
    pushUndo(world, { kind: 'demolish', buildings: [snap], roads: [], refund: amount });
    return { ok: true, refund: amount, warnings: [] };
  }
  const i = idx(world.size, x, y);
  if (world.road[i]) {
    world.road[i] = 0;
    world.roadVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [i], refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
  return fail('nothing_here', { refund: 0 });
}

export function setPaused(world, id, paused) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  // Pausing stops staffing and upkeep, so a building with neither (a housing plot) has nothing to pause.
  const def = BUILDINGS[b.type];
  if (!def.workers && !def.upkeep) return fail('not_pausable');
  b.paused = Boolean(paused);
  if (b.paused) b.staff = 0;
  return { ok: true, warnings: [] };
}

export function setSpeed(world, speed) {
  if (![0, 1, 2, 3].includes(speed)) return fail('bad_speed');
  world.speed = speed;
  return { ok: true, warnings: [] };
}

// The guided start (early-game pass 3.2): Skip guide turns it off, Resume guide turns it back on.
export function setGuide(world, on) {
  world.guide.on = Boolean(on);
  return { ok: true, warnings: [] };
}

// A storehouse's switch for one good (spec 4.10). Refused, producers send the good to other stores or stop with
// no_storage; what the storehouse already holds stays and can still be drawn on. Only a storehouse has the switches,
// and only for the goods it stores. Accepting deletes the entry, so a storehouse that takes everything has accepts {}.
export function setAccept(world, id, good, accept) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  if (b.type !== 'storehouse' || !(BUILDINGS[b.type].stores || []).includes(good)) return fail('not_storage');
  if (!b.accepts) b.accepts = {};
  if (accept) delete b.accepts[good];
  else b.accepts[good] = false;
  return { ok: true, warnings: [] };
}

function lineInto(ax, ay, bx, by, out) {
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
  let x = ax, y = ay;
  for (;;) {
    if (!out.some((p) => p[0] === x && p[1] === y)) out.push([x, y]);
    if (x === bx && y === by) break;
    x += dx; y += dy;
  }
}

export function roadPath(x0, y0, x1, y1, flip = false) {
  const out = [];
  // lineInto steps by whole tiles, so a fractional or NaN endpoint would never be reached.
  if (![x0, y0, x1, y1].every(Number.isInteger)) return out;
  if (!flip) { lineInto(x0, y0, x1, y0, out); lineInto(x1, y0, x1, y1, out); }
  else { lineInto(x0, y0, x0, y1, out); lineInto(x0, y1, x1, y1, out); }
  return out;
}

export function previewRoad(world, x0, y0, x1, y1, flip = false) {
  // Non-integer or NaN endpoints would make lineInto never reach its end, so reject them first.
  const integers = [x0, y0, x1, y1].every(Number.isInteger);
  if (!integers || !inBounds(world.size, x0, y0) || !inBounds(world.size, x1, y1)) {
    return fail('out_of_bounds', { tiles: [], cost: 0 });
  }
  const tiles = [];
  for (const [x, y] of roadPath(x0, y0, x1, y1, flip)) {
    if (!inBounds(world.size, x, y)) return fail('out_of_bounds', { tiles: [], cost: 0 });
    const i = idx(world.size, x, y);
    if (world.terrain[i] === T.WATER) return fail('water', { tiles: [], cost: 0 });
    if (world.occ[i]) return fail('blocked', { tiles: [], cost: 0 });
    if (!world.road[i]) tiles.push(i);
  }
  const cost = tiles.length * roadCostOf(world);
  if (!canAfford(world, cost)) return fail('no_gold', { tiles, cost });
  return { ok: true, warnings: [], tiles, cost };
}

export function drawRoad(world, x0, y0, x1, y1, flip = false) {
  const p = previewRoad(world, x0, y0, x1, y1, flip);
  if (!p.ok || p.tiles.length === 0) return p;
  for (const t of p.tiles) world.road[t] = 1;
  world.roadVersion++;
  spend(world, p.cost);
  pushUndo(world, { kind: 'road', tiles: p.tiles.slice(), cost: p.cost });
  return p;
}

// Tiles of the rectangle between two corners. Non-integer corners give no tiles. With a map size the
// rectangle is clamped to the map first, so a huge drag costs at most size * size steps.
export function rectTiles(x0, y0, x1, y1, size = Infinity) {
  const out = [];
  if (![x0, y0, x1, y1].every(Number.isInteger)) return out;
  const last = size - 1;
  const ax = Math.max(0, Math.min(x0, x1)), bx = Math.min(last, Math.max(x0, x1));
  const ay = Math.max(0, Math.min(y0, y1)), by = Math.min(last, Math.max(y0, y1));
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) out.push([x, y]);
  return out;
}

export function previewHouses(world, x0, y0, x1, y1) {
  const positions = rectTiles(x0, y0, x1, y1, world.size).filter(([x, y]) => checkTiles(world, 'house', x, y) === null);
  const cost = positions.length * costOf(world, 'house');
  if (!positions.length) return fail('nothing_to_place', { positions, cost: 0 });
  const warnings = positions.some(([x, y]) => !touchesRoad(world, { x, y, w: 1, d: 1 })) ? ['needs_road'] : [];
  if (!canAfford(world, cost)) return fail('no_gold', { positions, cost, warnings });
  return { ok: true, warnings, positions, cost };
}

export function paintHouses(world, x0, y0, x1, y1) {
  const p = previewHouses(world, x0, y0, x1, y1);
  if (!p.ok) return { ...p, ids: [] };
  const ids = p.positions.map(([x, y]) => insertBuilding(world, makeBuilding(world, 'house', x, y)).id);
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids, cost: p.cost });
  return { ok: true, warnings: p.warnings, ids, cost: p.cost };
}

export function previewDemolishArea(world, x0, y0, x1, y1) {
  const buildingIds = [];
  const roadTiles = [];
  for (const [x, y] of rectTiles(x0, y0, x1, y1, world.size)) {
    if (!inBounds(world.size, x, y)) continue;
    const i = idx(world.size, x, y);
    if (world.occ[i] && !buildingIds.includes(world.occ[i])) buildingIds.push(world.occ[i]);
    if (world.road[i]) roadTiles.push(i);
  }
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world, world.buildings[id]), 0);
  return { buildingIds, roadTiles, refund: refundTotal };
}

export function demolishArea(world, x0, y0, x1, y1) {
  const p = previewDemolishArea(world, x0, y0, x1, y1);
  const count = p.buildingIds.length + p.roadTiles.length;
  if (!count) return fail('nothing_here', { count: 0, refund: 0 });
  const snaps = p.buildingIds.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of p.buildingIds) removeBuilding(world, id);
  for (const t of p.roadTiles) world.road[t] = 0;
  if (p.roadTiles.length) world.roadVersion++;
  refund(world, p.refund);
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: p.roadTiles, refund: p.refund });
  return { ok: true, warnings: [], count, refund: p.refund };
}
