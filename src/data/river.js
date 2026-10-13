// Stage 4.6, River track (rulings 334-335, 360-369): the Nile's yearly flood, wildlife, hunting and fishing. Track 0 laid out the shapes and
// the plan's decided numbers; the River track owns this file and tunes it (recording any change as a ruling).
//
// This is a leaf data file: it may import other data files that do not import src/data/s46.js (raids.js, economy.js, map.js), never
// goods.js, buildings.js, progression.js, firsts.js, achievements.js, tips.js or ui.js (they import s46.js, which imports this).

// ── The flood (ruling 334, 360-362) ──
// months: the game months (1-12) the river is up (the rise starts on the first day of the first month and the season ends on the last
// day of the last); drainMonths: the months after, when the water drains off the fields (render only, so Akhet, the flood season of
// SEASONS in src/data/tips.js, is months + drainMonths: 7-10, ruling 346); forecastMonths: how far ahead a working Nilometer knows the
// level; reach: the floodplain is the fertile land within this many tiles of water (src/sim/flood.js floodplainOf); share: a farm is on
// the floodplain when at least this share of its footprint is (ruling 360); from: the milestone a city must have reached for the
// river to flood at all (ruling 361: nothing new in the first minutes, Track UX rule 5; the Nilometer, lodge and wharf come with it).
export const FLOOD = { months: [7, 8, 9], drainMonths: [10], forecastMonths: 3, reach: 3, share: 0.5, from: 'town' };
// The year's level, drawn once a year: chance (they sum to 1, in this order), the floodplain harvest multiplier, and how far the
// water spreads over the floodplain (tiles from the river; render only: the whole floodplain is 3 tiles wide).
export const FLOOD_LEVELS = [
  { id: 'low', chance: 0.15, harvest: 0.6, spread: 1 },
  { id: 'fair', chance: 0.35, harvest: 0.9, spread: 2 },
  { id: 'good', chance: 0.35, harvest: 1.1, spread: 3 },
  { id: 'high', chance: 0.15, harvest: 1.25, spread: 3 },
];
export const FLOOD_LEVEL_IDS = FLOOD_LEVELS.map((l) => l.id);
export const floodLevelRow = (id) => FLOOD_LEVELS.find((l) => l.id === id) || null;

// world.flood: this year's flood. year: the game year (1, 2, ...) the record is for, or null before the first draw; level: a
// FLOOD_LEVEL_IDS id once drawn (null before); forecast: the level as the city knows it ahead of the water (a Nilometer, or the Flood
// omen card), else null, and from the rise on the level itself; from, to: the season's first and last day (world.day), or null.
// Added by the River track (ruling 360): risen: whether the water has risen this year; applied: the level now scaling the floodplain
// farms' harvest (the last flood that rose: it holds from the rise until the next one, a flood year), or null before the first.
// createWorld and the v6 -> v7 migration both start from this function, so new and old cities agree.
export const newFloodState = () => ({ year: null, level: null, forecast: null, from: null, to: null, applied: null, risen: false });
const isDay = (v) => v === null || Number.isInteger(v);
const isLevel = (v) => v === null || FLOOD_LEVEL_IDS.includes(v);
export const isFloodState = (f) => Boolean(f) && typeof f === 'object' && !Array.isArray(f) && (f.year === null || Number.isInteger(f.year))
  && isLevel(f.level) && isLevel(f.forecast) && isDay(f.from) && isDay(f.to)
  && (f.applied === undefined || isLevel(f.applied)) && (f.risen === undefined || typeof f.risen === 'boolean');

// ── Wildlife (ruling 335, 363-367) ──
// Herd kinds: the ground a herd lives on (TERRAIN_BY_NAME names, plus 'desert'), and its size range.
export const HERD_KINDS = {
  gazelle: { ground: ['desert', 'rocky'], min: 4, max: 8 },
  ostrich: { ground: ['desert'], min: 4, max: 8 },
};
export const HERD_KIND_IDS = Object.keys(HERD_KINDS);
// homeRange: tiles a herd wanders from its home; regrowMonths: a herd regrows 1 every this many months, up to its size (max);
// ambientCap: the most animals (herds' and ambient alike) drawn at once; crocReach: a building this close to a crocodile spot may
// be scared (once a month at most, never on Peaceful); scareDays: how long it pauses; scareChance: the chance in a month that a
// scare happens at all, when a building stands near a crocodile spot.
// Added (ruling 364): from: the milestone from which herds exist (as the flood); startHerds: herds at the start on a Normal map (area
// scales it), at least minHerds; maxHerds: the most on a Normal map (area scales it); moveEvery: a herd steps one tile every this many
// days; awayFrom: tiles a herd keeps from buildings (it moves off when one comes nearer); apart: tiles between two herds at the start;
// crocs: crocodile spots on a Normal map (area scales it), crocApart: tiles between two spots.
export const WILDLIFE = {
  homeRange: 6, regrowMonths: 2, ambientCap: 40, crocReach: 2, scareDays: 1, scareChance: 0.5,
  from: 'town', startHerds: 6, minHerds: 3, maxHerds: 12, moveEvery: 3, awayFrom: 3, apart: 8, crocs: 5, crocApart: 6,
};
// The hunting lodge's hunters and the fishing wharf's boat. HUNTING.reach: tiles from the lodge's middle to a herd's centre.
export const HUNTING = { reach: 12, perHerdMonth: 6, maxMonth: 24 };
export const FISHING = { perMonth: 20, floodPerMonth: 30 };   // ruling 422: no reach; the boat fishes the water its pier stands on (fit: water longSide)

// world.wildlife: herds: [{ id, kind, x, y, size, max, regrow }] in id order (x, y: the herd's centre tile; size: animals now;
// max: the size it regrows to; regrow: the day it next regrows 1, or null while full); nextId: the next herd's id. A herd at 0 is
// removed. The hunted tally is tally.hunted (RIVER_TALLY). Birds, fish, hippos and crocodiles are render-only, and crocodile spots
// are derived from the seed and the terrain (src/sim/wildlife.js crocSpots), so neither is saved.
// Added by the River track: each herd also has hx, hy (its home tile), px, py and moved (where it stood before its last step, and the
// day it stepped, so the render can walk it between the two), hunted (animals taken this month) and dir (-1 or 1, the way it last
// stepped on screen); the record has seeded (the first herds are placed), scares ([{ id, until }]: buildings a crocodile paused, and
// the day they work again), scareMonth (the month index of the last scare) and arrived (the game year a herd last wandered in by itself).
export const newWildlifeState = () => ({ herds: [], nextId: 1, seeded: false, scares: [], scareMonth: -1, arrived: 0 });
const isHerd = (h) => Boolean(h) && typeof h === 'object' && Number.isInteger(h.id) && HERD_KIND_IDS.includes(h.kind)
  && Number.isFinite(h.x) && Number.isFinite(h.y) && Number.isInteger(h.size) && h.size >= 0;
export const isWildlifeState = (s) => Boolean(s) && typeof s === 'object' && Array.isArray(s.herds) && s.herds.every(isHerd)
  && Number.isInteger(s.nextId) && s.nextId >= 1 && (s.scares === undefined || Array.isArray(s.scares));

// ── The River track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// RIVER_GOODS: game and fish, as GOODS rows ({ name, kind: 'food', perResidentPerMonth }); FOOD_SLOTS (src/data/goods.js) is the order
// foods are listed in. RIVER_BUILDINGS: the nilometer, hunting lodge and fishing wharf, as BUILDINGS rows; a building that must touch
// water says so with water: 'touch' or 'longSide' (src/sim/fit.js). RIVER_UNLOCKS: milestone id -> the types it unlocks. RIVER_DOCK:
// build category id -> the items it adds to the dock, in order.
// A producer row with hunts (the lodge: its hunters take a unit from a herd within HUNTING.reach, so it makes game only while a herd
// is in reach, at most perHerdMonth a herd and perMonth in all) or fishes (the wharf: its boat takes fish from the water, more in
// the flood season: FISHING) is worked by src/sim/production.js with src/sim/wildlife.js and flood.js.
export const RIVER_GOODS = {
  game: { name: 'Game', kind: 'food', perResidentPerMonth: 0.25 },
  fish: { name: 'Fish', kind: 'food', perResidentPerMonth: 0.25 },
};
export const RIVER_BUILDINGS = {
  nilometer: {
    name: 'Nilometer', w: 1, d: 1, cost: 80, upkeep: 3, workers: 2, priority: 'services', category: 'services',
    needsRoad: true, water: 'touch', desirability: [1],
  },
  hunting_lodge: {
    // Ruling 434: 2 hunters (was 3): the herds in reach are hunted out within months (ruling 437), so the lodge is a small side food.
    name: 'Hunting lodge', w: 2, d: 2, cost: 70, upkeep: 4, workers: 2, priority: 'essential', category: 'food',
    needsRoad: true, produces: { good: 'game', perMonth: HUNTING.maxMonth }, producerReach: 12, hunts: true, desirability: [-2, -1],
  },
  fishing_wharf: {
    name: 'Fishing wharf', w: 2, d: 1, cost: 80, upkeep: 4, workers: 3, priority: 'essential', category: 'food',
    needsRoad: true, water: 'longSide', rotates: true, produces: { good: 'fish', perMonth: FISHING.perMonth }, producerReach: 12, fishes: true, desirability: [-1],
  },
};
// Ruling 361: the three come with the Town, not the Village the plan named (the Village is the first minutes; UX rule 5).
export const RIVER_UNLOCKS = { town: ['nilometer', 'hunting_lodge', 'fishing_wharf'] };
export const RIVER_DOCK = { food: ['hunting_lodge', 'fishing_wharf'], services: ['nilometer'] };
// Tallies (world.tally): animals hunted, fish landed, floods seen, crocodile scares. Add a key here and new and migrated cities both
// get it (at 0).
export const RIVER_TALLY = ['hunted', 'fished', 'floods', 'crocScares'];
export const RIVER_FIRSTS = [
  { id: 'first_nilometer', check: { kind: 'building', type: 'nilometer' } },
  { id: 'first_hunting_lodge', check: { kind: 'building', type: 'hunting_lodge' } },
  { id: 'first_fishing_wharf', check: { kind: 'building', type: 'fishing_wharf' } },
  { id: 'first_flood', check: { kind: 'tally', key: 'floods', n: 1 } },
  { id: 'first_game', check: { kind: 'made', good: 'game', n: 1 } },
  { id: 'first_fish', check: { kind: 'made', good: 'fish', n: 1 } },
];
export const RIVER_ACHIEVEMENTS = [];
// One tip each (progressive disclosure, UX rule 5), fired by the River seam (src/ui/s46/river.js): when the building is placed, and
// when the water first rises.
export const RIVER_TIPS = [
  { id: 'nilometer_forecast', trigger: 'nilometerPlaced', priority: false },      // a Nilometer placed
  { id: 'hunters_range', trigger: 'huntingLodgePlaced', priority: false },        // a hunting lodge placed
  { id: 'wharf_floods', trigger: 'fishingWharfPlaced', priority: false },         // a fishing wharf placed
  { id: 'flood_rhythm', trigger: 'floodRose', priority: false },                  // the water rose for the first time
];

// Salts for hash2(a, b, (world.seed + RIVER_SALT.x) | 0): a = a herd's or building's id, or the year; b = the day or month. Registered
// by Track 0 (unique across the game: tests/stage46/contract/salts.test.js). ambient is render-only (src/render/wildlife.js).
export const RIVER_SALT = {
  floodLevel: 4621, herdSpawn: 4622, herdWander: 4623, herdKind: 4624, herdSize: 4625, herdMove: 4626,
  crocSpot: 4627, crocScare: 4628, hunt: 4629, fishBoat: 4630, ambient: 4631, lostHerd: 4632, spare1: 4633, spare2: 4634,
};
