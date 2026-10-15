import { ECONOMY } from '../data/economy.js';
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { PRESTIGE_UNLOCKS } from '../data/monuments.js';
import { MAP_VARIANTS, DEFAULT_MAP_SIZE } from '../data/map.js';
import { S46_TALLY } from '../data/s46.js';
import { newFloodState, newWildlifeState } from '../data/river.js';
import { newCourtState } from '../data/court.js';
import { newArmyState } from '../data/armies.js';
import { MONUMENT_STYLE_IDS, MONUMENT_STYLE_DEFAULT } from '../data/wonders.js';
import { S47_TALLY } from '../data/s47.js';
import { generateMap, variantFor } from './mapgen.js';
import { floodplainOf } from './flood.js';
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 8;
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
// the day of the last festival, whether the city has had its one first-time pause for a fire no firehouse reaches, and (Stage 4.5)
// the day of every theft in the last 90 days (src/sim/crime.js).
export const newDangerState = () => ({ burnDays: [], lastFireDay: null, festivalDay: null, firePaused: false, theftDays: [] });

// The tallies a city starts with. Stage 1-2's, then Stage 3's (spec 4.12, 4.13): fires started (blazes, by ignition,
// spread or a raid), blazes and fires put out, buildings burned, rubble tiles cleared, raids that arrived, raids beaten
// and lost, tributes paid, raiders stopped by towers and by soldiers, soldiers wounded, gold stolen, festivals held and
// wall tiles drawn.
export const STAGE3_TALLY = ['fires', 'blazesOut', 'firesOut', 'burned', 'rubbleCleared', 'raids', 'raidsBeaten', 'raidsLost', 'tributes',
  'raidersByTowers', 'raidersBySoldiers', 'soldiersWounded', 'goldStolen', 'festivals', 'wallTiles'];
// Stage 4's (spec 4.16, 4.19, 4.20): stone and bricks laid on monuments, stone and bricks delivered to sites (by a quarry,
// a brickworks or a site's draw from a storehouse), courses finished, monuments finished and palace enlargements paid for.
export const STAGE4_TALLY = ['stoneLaid', 'bricksLaid', 'stoneDelivered', 'bricksDelivered', 'courses', 'monumentsDone', 'enlargements'];
// Stage 4.5's (world version 6; src/sim/health.js and crime.js count them): illnesses begun and cured, thefts and the gold they took.
export const STAGE45_TALLY = ['illnesses', 'illnessesCured', 'thefts', 'theftGold'];
// Stage 4.6's (world version 7): every track's, joined in src/data/s46.js from each track's own list (RIVER_TALLY and the rest), so a
// track adds a key in its own data file and new and migrated cities both start it at 0.
export const STAGE46_TALLY = S46_TALLY;
// Stage 4.7's (world version 8): src/data/s47.js S47_TALLY (an oasis's first, the carts, the yearly quota).
export const STAGE47_TALLY = S47_TALLY;
export const newTally = () => ({
  harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0,
  ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])),
  ...Object.fromEntries(STAGE4_TALLY.map((k) => [k, 0])),
  ...Object.fromEntries(STAGE45_TALLY.map((k) => [k, 0])),
  ...Object.fromEntries(STAGE46_TALLY.map((k) => [k, 0])),
  ...Object.fromEntries(STAGE47_TALLY.map((k) => [k, 0])),
});

// The prestige unlocks a city has reached (Stage 4, spec 4.14, ruling 243): monument type -> the day the city first had
// its milestone and prestige together, or null. Once set it stays, as a milestone does.
export const newPrestigeUnlocks = () => Object.fromEntries(PRESTIGE_UNLOCKS.map((k) => [k, null]));

// A monument site's state (Stage 4, spec 4.16, 7.3), on its building as b.site, so saving and loading mid-course changes
// nothing. Track A (src/sim/monuments.js) writes it; everything else reads it.
//   course    courses finished (0 .. the kind's courses)
//   laid      { stone, bricks }: units of each laid on the course under way (fractions allowed: a crew lays 2/3 a day)
//   stock     { stone, bricks }: units on site (the stockpile; fractions allowed)
//   carry     work gold owed but not yet paid, 0 <= carry < 1 (paid in whole gold, ruling 240)
//   extraPaid whether the gilding or the capstone (MONUMENTS[..].extra) has been paid; false for a kind with none
//   crews     the builders' guild ids whose crews worked it today, in the order they took it
//   idle      days in a row with no work while unpaused, unfinished and on a road (stalled at MONUMENT.stallDays)
//   reason    the cause of the last day without work (siteStatus's reason codes), or null after a day of work
//   month     this month so far: { units laid, gold paid (work, gilding, capstone), crews (the most at work on one day),
//             crewDays worked, starvedDays (days a crew stood idle for lack of material) }
//   last      last month's { units, gold, crews (the most at work on a day) }, or null before the site's first month end
//   starved   whether any month of its build had a crew stand idle for lack of material (the Steady hands feat)
//   done      the day it was finished, or null
export const newSite = () => ({
  course: 0, laid: { stone: 0, bricks: 0 }, stock: { stone: 0, bricks: 0 }, carry: 0, extraPaid: false, crews: [], idle: 0, reason: null,
  month: { units: 0, gold: 0, crews: 0, crewDays: 0, starvedDays: 0 }, last: null, starved: false, done: null,
});

// size (Stage 4.6, ruling 333): the map's tiles a side, one of MAP_SIZES (48, 64 or 80; DEFAULT_MAP_SIZE when not given); ignored when
// a map is passed, whose own size is kept (the tests' small maps).
// mapVariant (Stage 4.5, ruling 313) is one of MAP_VARIANTS, or 'auto' to let the seed pick (variantFor); it is ignored when a
// map is passed, whose own variant (map.variant, else 'classic') is kept.
// difficulty is a DIFFICULTIES key (spec 4.18), fixed for the city's life; anything else starts a Normal city. cityId
// is the id the interface gives a new city for its records (spec 4.19: the sim never reads the clock); null until then.
export function createWorld({ seed = 1, size = DEFAULT_MAP_SIZE, map = null, difficulty = 'normal', cityId = null, mapVariant = 'classic' } = {}) {
  const variant = mapVariant === 'auto' ? variantFor(seed) : MAP_VARIANTS.includes(mapVariant) ? mapVariant : 'classic';
  const m = map || generateMap(seed, Number.isInteger(size) && size > 0 ? size : DEFAULT_MAP_SIZE, variant);
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
    splits: {},                                         // split id (SPLITS) -> the day the city first reached it (spec 4.19)
    seals: [],                                          // { day, score, parts, version } per Seal this reign, oldest first
    feats: { earned: [], lost: [], counters: {} },      // feat ids earned and ruled out, and feats.js's running counts
    cityId: typeof cityId === 'string' && cityId ? cityId : null,
    // Stage 4 (world version 5).
    prestigeUnlocks: newPrestigeUnlocks(),              // monument type -> the day its prestige unlock was first reached, or null
    // Stage 4.5 (world version 6).
    mapVariant: m.variant || 'classic',                 // the river layout (MAP_VARIANTS); 'classic' for a city from before it
    // Stage 4.6 (world version 7). Each track's record starts from its own data file's function, as the v6 -> v7 migration's does.
    mapSize: m.size,                                    // the map's size (MAP_SIZES; always equal to size), what links and bests carry
    mapParams: { ...(m.params || {}) },                 // the generator's seeded shape choices (Map track, ruling 332); {} for a classic map
    flood: newFloodState(),                             // this year's flood (River track, src/data/river.js)
    floodplain: floodplainOf(m.terrain, m.size),        // 1 per fertile tile within the flood's reach of water, else 0 (src/sim/flood.js)
    wildlife: newWildlifeState(),                       // the herds (River track)
    court: newCourtState(),                             // favour, the letters, the active request, the card history (Court track)
    army: newArmyState(),                               // units away at the capital (Armies track); units at home are world.soldiers
    // Stage 4.7 (world version 8; src/data/s47.js has the shapes). New land (hills, oases, the grass band) is in terrain and mapParams.
    oases: (m.oases || []).map((o) => ({ ...o })),      // [{ x, y, r }]: the generator's oases (Task 2), for display and herds
    carts: [],                                          // the stores' carts on the road (Task 5): src/data/s47.js isCart
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

// rot (Stage 4, ruling 234): 0, or 1 for a type that rotates (the mastabas), which swaps w and d; any other type keeps 0.
// style (Stage 4.6, Wonders track): a monument's style (src/data/wonders.js MONUMENT_STYLE_IDS; MONUMENT_STYLE_DEFAULT when not one);
// ignored by every other type.
export function makeBuilding(world, type, x, y, rot = 0, { style = null } = {}) {
  const def = BUILDINGS[type];
  const dims = dimsOf(type, rot);
  // risk: fire risk points (spec 4.12); fire: null, or the blaze or fire burning in it (src/sim/fire.js).
  const b = { id: world.nextId++, type, x, y, w: dims.w, d: dims.d, rot: dims.rot, staff: 0, paused: false, store: {}, progress: 0, blocked: null, risk: 0, fire: null };
  // Stage 4.5 (world version 6): a home's disease and crime risk points (health, crime; src/sim/health.js and crime.js build them) and its illness (null, or the illness it has).
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0, health: 0, crime: 0, illness: null });
  if (type === 'storehouse') b.accepts = {};   // good -> false where the player refused it (setAccept, spec 4.10)
  if (def.stores) b.orders = {};                 // Stage 4.7 (Task 5): good -> { fetch } for each good the store fetches (src/data/s47.js isOrders)
  if (def.monument) b.site = newSite();          // Stage 4: a monument is founded as a site (spec 4.16)
  if (def.monument) b.style = MONUMENT_STYLE_IDS.includes(style) ? style : MONUMENT_STYLE_DEFAULT;   // Stage 4.6 (ruling 343)
  if (def.palace) Object.assign(b, { style: 0, works: null });   // Stage 4: PALACE_STYLES index; works: null or { style, left } (spec 4.20)
  return b;
}

// Stage 4 (spec 4.16): a monument building, a site (one not finished) and a finished monument.
export const isMonument = (b) => Boolean(b && BUILDINGS[b.type] && BUILDINGS[b.type].monument);
export const isSite = (b) => isMonument(b) && Boolean(b.site) && b.site.done === null;
export const isFinished = (b) => isMonument(b) && Boolean(b.site) && b.site.done !== null;

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
