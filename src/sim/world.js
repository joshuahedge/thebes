import { ECONOMY } from '../data/economy.js';
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { generateMap } from './mapgen.js';
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 4;
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends

// The trade state a city starts with (Stage 2): no routes open, no orders, no price drift drawn, no quota used.
export const newTradeState = () => ({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });

// The raid state a city starts with (Stage 3, spec 4.13): no clock (clockDay is the day the city first had
// RAIDS.clockPeople people; it keeps running if people later fall), no raid warned yet (index counts warnings, so the
// next one's index), no warning up and no raid under way, full adaptation, no report. src/sim/raids.js owns the shapes
// of warning, active and last (see the Stage 3 plan's contract).
export const newRaidState = () => ({ clockDay: null, nextWarnDay: null, index: 0, warning: null, active: null, adaptation: 1, last: null });

// Danger the city remembers (Stage 3, spec 4.9, 4.12, 4.13, 4.19): the day of every building burned in the last
// 360 days (oldest first: mood looks back 180 days and Safety 360), the last day a building reached the fire stage,
// the day of the last festival, and whether the city has had its one first-time pause for a fire no firehouse reaches.
export const newDangerState = () => ({ burnDays: [], lastFireDay: null, festivalDay: null, firePaused: false });

// The tallies a city starts with. Stage 1-2's, then Stage 3's (spec 4.12, 4.13): fires started (blazes, by ignition,
// spread or a raid), blazes and fires put out, buildings burned, rubble tiles cleared, raids that arrived, raids beaten
// and lost, tributes paid, raiders stopped by towers and by soldiers, soldiers wounded, gold stolen, festivals held and
// wall tiles drawn.
export const STAGE3_TALLY = ['fires', 'blazesOut', 'firesOut', 'burned', 'rubbleCleared', 'raids', 'raidsBeaten', 'raidsLost', 'tributes',
  'raidersByTowers', 'raidersBySoldiers', 'soldiersWounded', 'goldStolen', 'festivals', 'wallTiles'];
export const newTally = () => ({
  harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0,
  ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])),
});

// difficulty is a DIFFICULTIES key (spec 4.18), fixed for the city's life; anything else starts a Normal city. cityId
// is the id the interface gives a new city for its records (spec 4.19: the sim never reads the clock); null until then.
export function createWorld({ seed = 1, size = 64, map = null, difficulty = 'normal', cityId = null } = {}) {
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
    // Running counts for firsts, achievements, daily goals, feats, the score and the summary; made: units produced, by good.
    tally: newTally(),
    difficulty: Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal',
    trade: newTradeState(),                             // open routes, orders, price drift and quota used this year
    newItems: [],                                       // build items a milestone unlocked and nothing has placed yet ("New")
    // Stage 3 (world version 4).
    wall: new Array(n).fill(0),                         // per tile: 0 none, > 0 a standing wall's hit points, -1 a breach (broken stone)
    wallVersion: 0,                                     // bumped whenever a wall tile appears, goes or breaks (path and bake caches)
    raid: newRaidState(),
    soldiers: [],                                       // every trained soldier: { id, barracks, x, y, hp, hit, task } (src/sim/combat.js)
    nextUnitId: 1,                                      // raiders and soldiers share one id sequence
    danger: newDangerState(),
    splits: {},                                         // milestone id -> the day the city first became it (spec 4.19)
    seals: [],                                          // { day, score, parts, version } per Seal this reign, oldest first
    feats: { earned: [], lost: [], counters: {} },      // feat ids earned and ruled out, and feats.js's running counts
    cityId: typeof cityId === 'string' && cityId ? cityId : null,
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
  // risk: fire risk points (spec 4.12); fire: null, or the blaze or fire burning in it (src/sim/fire.js).
  const b = { id: world.nextId++, type, x, y, w: def.w, d: def.d, staff: 0, paused: false, store: {}, progress: 0, blocked: null, risk: 0, fire: null };
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0 });
  if (type === 'storehouse') b.accepts = {};   // good -> false where the player refused it (setAccept, spec 4.10)
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
