import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { footprint, idx, inBounds } from './grid.js';
import { T, TERRAIN_BY_NAME } from './terrain.js';
import { makeBuilding, insertBuilding, removeBuilding, buildingAt } from './world.js';
import { touchesRoad, buildingsInReach } from './reach.js';
import { canAfford, spend, refund } from './money.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });
const storesAny = (o, goods) => (BUILDINGS[o.type].stores || []).some((g) => goods.includes(g));

export function checkTiles(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return 'unknown';
  if (!isUnlocked(world, type)) return 'locked';
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
  if (!def.needsRoad && !touchesRoad(world, probe)) warnings.push('needs_road');
  if (def.produces && !buildingsInReach(world, probe, def.producerReach, (o) => storesAny(o, [def.produces.good])).length) {
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
  if (!canAfford(world, BUILDINGS[type].cost)) return fail('no_gold');
  return { ok: true, warnings: placementWarnings(world, type, x, y) };
}

export function place(world, type, x, y) {
  const check = canPlace(world, type, x, y);
  if (!check.ok) return check;
  const cost = BUILDINGS[type].cost;
  const b = insertBuilding(world, makeBuilding(world, type, x, y));
  spend(world, cost);
  pushUndo(world, { kind: 'place', ids: [b.id], cost });
  return { ok: true, id: b.id, warnings: check.warnings };
}

export const demolishRefundFor = (b) => (b.type === 'house' ? 0 : Math.floor(BUILDINGS[b.type].cost * ECONOMY.demolishRefund));

export function demolishAt(world, x, y) {
  if (!inBounds(world.size, x, y)) return fail('out_of_bounds', { refund: 0 });
  const b = buildingAt(world, x, y);
  if (b) {
    const snap = JSON.parse(JSON.stringify(b));
    removeBuilding(world, b.id);
    const amount = demolishRefundFor(b);
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
  b.paused = Boolean(paused);
  if (b.paused) b.staff = 0;
  return { ok: true, warnings: [] };
}

export function setSpeed(world, speed) {
  if (![0, 1, 2, 3].includes(speed)) return fail('bad_speed');
  world.speed = speed;
  return { ok: true, warnings: [] };
}
