import { ECONOMY } from '../data/economy.js';
import { BUILDINGS } from '../data/buildings.js';
import { generateMap } from './mapgen.js';
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 1;

export function createWorld({ seed = 1, size = 64, map = null } = {}) {
  const m = map || generateMap(seed, size);
  const n = m.size * m.size;
  const world = {
    version: WORLD_VERSION,
    seed,
    size: m.size,
    day: 0,
    speed: 0,
    gold: ECONOMY.startGold,
    terrain: m.terrain.slice(),
    road: new Array(n).fill(0),
    occ: new Array(n).fill(0),
    buildings: {},
    nextId: 1,
    mood: 60,
    moodBreakdown: {},
    milestone: 'village',
    labour: { workforce: 0, employed: 0, jobs: 0, shortLevels: [] },
    alerts: [],
    undo: [],
    roadVersion: 0,
    tradeEntry: { ...m.tradeEntry },
    raiderEntries: m.raiderEntries.map((e) => ({ ...e })),
    focus: { ...m.focus },
    stats: { lastMonth: null },
  };
  for (const [x, y] of m.startRoad) world.road[idx(world.size, x, y)] = 1;
  return world;
}

export const getBuilding = (world, id) => world.buildings[id] || null;

export function buildingAt(world, x, y) {
  const id = world.occ[idx(world.size, x, y)];
  return id ? world.buildings[id] : null;
}

// Integer-like keys iterate in ascending numeric order, so this is ascending id order.
export const allBuildings = (world) => Object.values(world.buildings);

export const housesOf = (world) => allBuildings(world).filter((b) => b.type === 'house');

export function population(world) {
  let p = 0;
  for (const h of housesOf(world)) p += h.residents;
  return p;
}

export function makeBuilding(world, type, x, y) {
  const def = BUILDINGS[type];
  const b = { id: world.nextId++, type, x, y, w: def.w, d: def.d, staff: 0, paused: false, store: {}, progress: 0, blocked: null };
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0 });
  return b;
}

export function insertBuilding(world, b) {
  world.buildings[b.id] = b;
  for (const [x, y] of footprint(b.x, b.y, b.w, b.d)) world.occ[idx(world.size, x, y)] = b.id;
  return b;
}

export function removeBuilding(world, id) {
  const b = world.buildings[id];
  if (!b) return null;
  for (const [x, y] of footprint(b.x, b.y, b.w, b.d)) world.occ[idx(world.size, x, y)] = 0;
  delete world.buildings[id];
  return b;
}
