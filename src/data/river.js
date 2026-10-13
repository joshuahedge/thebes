// Stage 4.6, River track (rulings 334-335): the Nile's yearly flood, wildlife, hunting and fishing. Track 0 laid out the shapes and
// the plan's decided numbers; the River track owns this file and tunes it (recording any change as a ruling).
//
// This is a leaf data file: it may import other data files that do not import src/data/s46.js (raids.js, economy.js, map.js), never
// goods.js, buildings.js, progression.js, firsts.js, achievements.js, tips.js or ui.js (they import s46.js, which imports this).

// ── The flood (ruling 334) ──
// months: the game months (1-12) the river is up; forecastMonths: how far ahead a working Nilometer knows the level; reach: the
// floodplain is the fertile land within this many tiles of water (src/sim/flood.js floodplainOf).
export const FLOOD = { months: [7, 8, 9], forecastMonths: 3, reach: 3 };
// The year's level, drawn once a year: chance (they sum to 1, in this order) and the floodplain harvest multiplier.
export const FLOOD_LEVELS = [
  { id: 'low', chance: 0.15, harvest: 0.6 },
  { id: 'fair', chance: 0.35, harvest: 0.9 },
  { id: 'good', chance: 0.35, harvest: 1.1 },
  { id: 'high', chance: 0.15, harvest: 1.25 },
];
export const FLOOD_LEVEL_IDS = FLOOD_LEVELS.map((l) => l.id);

// world.flood: this year's flood. year: the game year (1, 2, ...) the record is for, or null before the first draw; level: a
// FLOOD_LEVEL_IDS id once drawn (null before); forecast: the level as the city knows it ahead of the water (a Nilometer, or the Flood
// omen card), else null; from, to: the season's first and last day (world.day), or null. The River track may add fields inside;
// createWorld and the v6 -> v7 migration both start from this function, so new and old cities agree.
export const newFloodState = () => ({ year: null, level: null, forecast: null, from: null, to: null });
const isDay = (v) => v === null || Number.isInteger(v);
const isLevel = (v) => v === null || FLOOD_LEVEL_IDS.includes(v);
export const isFloodState = (f) => Boolean(f) && typeof f === 'object' && !Array.isArray(f) && (f.year === null || Number.isInteger(f.year))
  && isLevel(f.level) && isLevel(f.forecast) && isDay(f.from) && isDay(f.to);

// ── Wildlife (ruling 335) ──
// Herd kinds: the ground a herd lives on (TERRAIN_BY_NAME names, plus 'desert'), and its size range.
export const HERD_KINDS = {
  gazelle: { ground: ['desert', 'rocky'], min: 4, max: 8 },
  ostrich: { ground: ['desert'], min: 4, max: 8 },
};
export const HERD_KIND_IDS = Object.keys(HERD_KINDS);
// homeRange: tiles a herd wanders from its centre; regrowMonths: a herd regrows 1 every this many months, up to its size (max);
// ambientCap: the most animals (herds' and ambient alike) drawn at once; crocReach: a building this close to a crocodile spot may
// be scared (once a month at most, never on Peaceful).
export const WILDLIFE = { homeRange: 6, regrowMonths: 2, ambientCap: 40, crocReach: 2, scareDays: 1 };
// The hunting lodge's hunters and the fishing wharf's boat.
export const HUNTING = { reach: 12, perHerdMonth: 6, maxMonth: 24 };
export const FISHING = { reach: 8, perMonth: 20, floodPerMonth: 30 };

// world.wildlife: herds: [{ id, kind, x, y, size, max, regrow }] in id order (x, y: the herd's centre tile; size: animals now;
// max: the size it regrows to; regrow: the day it next regrows 1, or null while full); nextId: the next herd's id. A herd at 0 is
// removed. The hunted tally is tally.hunted (RIVER_TALLY). Birds, fish, hippos and crocodiles are render-only, and crocodile spots
// are derived from the seed and the terrain (src/sim/wildlife.js crocSpots), so neither is saved.
export const newWildlifeState = () => ({ herds: [], nextId: 1 });
const isHerd = (h) => Boolean(h) && typeof h === 'object' && Number.isInteger(h.id) && HERD_KIND_IDS.includes(h.kind)
  && Number.isFinite(h.x) && Number.isFinite(h.y) && Number.isInteger(h.size) && h.size >= 0;
export const isWildlifeState = (s) => Boolean(s) && typeof s === 'object' && Array.isArray(s.herds) && s.herds.every(isHerd)
  && Number.isInteger(s.nextId) && s.nextId >= 1;

// ── The River track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// RIVER_GOODS: game and fish, as GOODS rows ({ name, kind: 'food', perResidentPerMonth }); FOOD_SLOTS (src/data/goods.js) is the order
// foods are listed in. RIVER_BUILDINGS: the nilometer, hunting lodge and fishing wharf, as BUILDINGS rows; a building that must touch
// water says so with water: 'touch' or 'longSide' (src/sim/fit.js). RIVER_UNLOCKS: milestone id -> the types it unlocks. RIVER_DOCK:
// build category id -> the items it adds to the dock, in order.
export const RIVER_GOODS = {};
export const RIVER_BUILDINGS = {};
export const RIVER_UNLOCKS = {};
export const RIVER_DOCK = {};
// Tallies (world.tally): animals hunted, fish landed, floods seen, crocodile scares. Add a key here and new and migrated cities both
// get it (at 0).
export const RIVER_TALLY = ['hunted', 'fished', 'floods', 'crocScares'];
export const RIVER_FIRSTS = [];
export const RIVER_ACHIEVEMENTS = [];
export const RIVER_TIPS = [];

// Salts for hash2(a, b, (world.seed + RIVER_SALT.x) | 0): a = a herd's or building's id, or the year; b = the day or month. Registered
// by Track 0 (unique across the game: tests/stage46/contract/salts.test.js). ambient is render-only (src/render/wildlife.js).
export const RIVER_SALT = {
  floodLevel: 4621, herdSpawn: 4622, herdWander: 4623, herdKind: 4624, herdSize: 4625, herdMove: 4626,
  crocSpot: 4627, crocScare: 4628, hunt: 4629, fishBoat: 4630, ambient: 4631, lostHerd: 4632, spare1: 4633, spare2: 4634,
};
