import { ECONOMY } from '../data/economy.js';
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { generateMap } from './mapgen.js';
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 3;
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends

// The trade state a city starts with (Stage 2): no routes open, no orders, no price drift drawn, no quota used.
export const newTradeState = () => ({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });

// difficulty is a DIFFICULTIES key (spec 4.18), fixed for the city's life; anything else starts a Normal city.
export function createWorld({ seed = 1, size = 64, map = null, difficulty = 'normal' } = {}) {
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
    startRoad: m.startRoad.map(([x, y]) => [x, y]),   // the generator's road in from the trade edge (goals, Show me)
    goals: { completed: [], triggered: [] },            // ids of finished goals, in order; event goals that have fired
    history: [],                                        // { day, people, gold, mood } per month end, newest last
    firsts: [],                                         // ids of firsts already celebrated (null: mark silently, from a v1 save)
    achievements: [],                                   // ids of achievements already earned (null as for firsts)
    daily: null,                                        // today's daily goals: { date, picks, base, done, swapped }
    guide: { on: true, done: false },                   // the guided start: running, and whether it has finished
    // Running counts for firsts, achievements, daily goals and the summary; made: units produced, by good.
    tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 },
    difficulty: Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal',
    trade: newTradeState(),                             // open routes, orders, price drift and quota used this year
    newItems: [],                                       // build items a milestone unlocked and nothing has placed yet ("New")
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
