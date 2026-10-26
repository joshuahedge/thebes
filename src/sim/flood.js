// The Nile's yearly flood (Stage 4.6, River track, rulings 334, 360-362, 368). Track 0 wrote the floodplain mask and the stubs every other
// file calls; the River track owns this file. No damage and no deaths: the flood is a rhythm, not a disaster.
//
// World state: world.flood (src/data/river.js newFloodState) and world.floodplain, one 0 or 1 per tile (floodplainOf). Draws are
// hash2(year, 0, (world.seed + RIVER_SALT.floodLevel) | 0). Do not import world.js here: world.js imports this file for floodplainOf.
//
// The rhythm (ruling 360): each year, once the city is a Town (ruling 361), the river floods across months 7-9 at a seeded level (Low 15%,
// Fair 35%, Good 35%, High 15%); the water drains in month 10 (Akhet, ruling 346). The year's level is drawn when the year begins and
// is known to the city only from the water's rise, unless a working Nilometer reads it 3 months ahead (month 4) or the priests are
// paid (buyForecast, the Court's Flood omen card). From the rise until the next flood the floodplain farms' harvest follows the level
// (FLOOD_LEVELS[..].harvest): the flood leaves its silt for the growing and harvest seasons after it. Farms off the floodplain are
// unaffected.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { FLOOD, FLOOD_LEVELS, FISHING, floodLevelRow, preparedHarvest, RIVER_SALT } from '../data/river.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';
import { hash2 } from './rng.js';
import { idx } from './grid.js';
import { MILESTONES } from '../data/progression.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { T } from './terrain.js';

// progression.js's atLeast and labour.js's isWorking and staffRatio, written out here: both import world.js, and world.js imports this
// file (the contract's import rule).
const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);
const atLeast = (world, id) => milestoneIndex(world.milestone) >= milestoneIndex(id);
const staffRatio = (b) => (BUILDINGS[b.type].workers ? b.staff / BUILDINGS[b.type].workers : b.paused ? 0 : 1);
const isWorking = (b) => !b.paused && !(b.fire && b.fire.stage === 'fire') && staffRatio(b) >= MIN_STAFF_RATIO;

// The floodplain (ruling 334): 1 for each fertile tile with water within FLOOD.reach tiles (in each direction, a square), else 0. Built
// from the terrain when a city is made and when an older city is migrated, and saved (world.floodplain); the terrain under it never
// changes in play.
export function floodplainOf(terrain, size) {
  const r = FLOOD.reach;
  const out = new Array(size * size).fill(0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (terrain[y * size + x] !== T.FERTILE) continue;
      let wet = false;
      for (let dy = -r; dy <= r && !wet; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= size) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < size && terrain[ny * size + nx] === T.WATER) { wet = true; break; }
        }
      }
      if (wet) out[y * size + x] = 1;
    }
  }
  return out;
}

// ── Time ──
const monthIndexOf = (day) => Math.floor(day / DAYS_PER_MONTH);
const partsOf = (day) => { const m = monthIndexOf(day); return { year: Math.floor(m / MONTHS_PER_YEAR) + 1, month: (m % MONTHS_PER_YEAR) + 1 }; };
// The first and last day of a year's flood season (FLOOD.months).
export function seasonDays(year) {
  const from = ((year - 1) * MONTHS_PER_YEAR + (FLOOD.months[0] - 1)) * DAYS_PER_MONTH;
  return { from, to: from + FLOOD.months.length * DAYS_PER_MONTH - 1 };
}
// The first day of the month the Nilometer's forecast is known from (forecastMonths before the rise).
export const forecastDay = (year) => seasonDays(year).from - FLOOD.forecastMonths * DAYS_PER_MONTH;

// Whether the river floods in this city at all (ruling 361): from the Town on.
export const floodsOn = (world) => atLeast(world, FLOOD.from);

// The level of a year's flood: the seeded draw (FLOOD_LEVELS' chances in order), the same whenever it is asked.
export function levelOfYear(world, year) {
  // Version 6.0 (Track B1, ruling 687): a year the Nile reading warned a drought for (src/sim/crops.js) has a Low flood; read straight off the
  // world's record (this file may not import the world or the dangers).
  const drought = world.hazards && world.hazards.drought;
  if (drought && ((drought.warning && drought.warning.year === year) || (drought.active && drought.active.year === year))) return 'low';
  const r = hash2(year, 0, (world.seed + RIVER_SALT.floodLevel) | 0);
  let acc = 0;
  for (const l of FLOOD_LEVELS) { acc += l.chance; if (r < acc) return l.id; }
  return FLOOD_LEVELS[FLOOD_LEVELS.length - 1].id;
}

// Makes the flood record for the year the world is in, once a Town, before the season begins (a city that becomes a Town after the
// rise has its first flood next year). Keeps `applied`. Returns whether the world has a record for this year.
export function ensureYear(world) {
  const f = world.flood;
  const { year, month } = partsOf(world.day);
  if (f.year === year) return true;
  if (!floodsOn(world) || month >= FLOOD.months[0]) return false;
  const s = seasonDays(year);
  Object.assign(f, { year, level: levelOfYear(world, year), forecast: null, from: s.from, to: s.to, risen: false });
  return true;
}

// Whether a working Nilometer stands (isWorking: staffed to a quarter, unpaused, not on fire).
export const nilometerWorking = (world) => Object.values(world.buildings).some((b) => b.type === 'nilometer' && isWorking(b));

// One day of the flood: this year's draw, the Nilometer's forecast, the water's rise.
export function floodDay(world, events = null) {
  if (!floodsOn(world)) return;
  if (!ensureYear(world)) return;
  const f = world.flood, { year } = partsOf(world.day);
  if (f.year !== year) return;
  if (f.forecast === null && !f.risen && world.day >= forecastDay(year) && world.day < f.from && nilometerWorking(world)) {
    f.forecast = f.level;
    if (events) events.push({ type: 'flood_forecast', level: f.level, how: 'nilometer' });
  }
  if (!f.risen && world.day >= f.from && world.day <= f.to) {
    f.risen = true;
    f.applied = f.level;
    f.forecast = f.level;
    world.tally.floods += 1;
    if (events) events.push({ type: 'flood_rise', level: f.level });
  }
}

// The month's flood work: nothing is left for a month end (the days do it all).
export function floodMonth(world, events = null) {}

// ── What the flood does ──

// Whether a building stands on the floodplain: at least FLOOD.share of its footprint's tiles are floodplain.
export function onFloodplain(world, b) {
  if (!world.floodplain) return false;
  let n = 0;
  for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) if (world.floodplain[idx(world.size, x, y)] === 1) n++;
  return n >= Math.ceil(b.w * b.d * FLOOD.share);
}
// Whether a building is a farm the flood works on: a producer bound to fertile ground (grain, figs, barley, flax).
export const isFloodFarm = (type) => Boolean(BUILDINGS[type] && BUILDINGS[type].terrain === 'fertile' && BUILDINGS[type].produces);

// Whether this year's flood (drawn when the year began) is Fair or better: false before the river floods in the city (ruling 346: the remarks
// that speak of the river rising are heard only in such a year).
export function floodFairOrBetter(world) {
  const f = world.flood;
  return floodsOn(world) && f.year === partsOf(world.day).year && f.level !== null && f.level !== 'low';
}

// The level now scaling the floodplain harvest (the last flood that rose), or null before the first.
export const appliedLevel = (world) => (world.flood.applied ? floodLevelRow(world.flood.applied) : null);

// Version 8.1 (Track B, ruling 1221): a level's harvest as this city's floodplain farms get it now: a loss (Low) is cut by NILOMETER.lossCut while a working
// Nilometer stands (the farms were warned and prepared); any other level is its own. The Nilometer is asked only for a loss, so a plain year costs nothing.
export const levelHarvest = (world, l) => (l ? preparedHarvest(l.harvest, l.harvest < 1 && nilometerWorking(world)) : 1);
// Whether the farms are prepared for this level now: a loss and a working Nilometer.
export const preparedFor = (world, l) => Boolean(l) && l.harvest < 1 && nilometerWorking(world);

// The harvest multiplier for a farm now: the applied level's on a floodplain farm (prepared, ruling 1221), else 1.
export function floodHarvestFactor(world, b) {
  const l = appliedLevel(world);
  if (!l || !isFloodFarm(b.type) || !onFloodplain(world, b)) return 1;
  return levelHarvest(world, l);
}

// Whether the water is up today (the flood season: months 7-9 of a year that has had its rise).
export const isFloodSeason = (world) => Boolean(world.flood.risen) && world.day >= world.flood.from && world.day <= world.flood.to;

// The wharf's catch factor today: the flood months' rate over the plain rate (FISHING), else 1.
export const fishFactor = (world) => (isFloodSeason(world) ? FISHING.floodPerMonth / FISHING.perMonth : 1);

// The level the city knows now: this year's once the water rises (or a forecast reads it), else null. The words say "known".
export const knownLevel = (world) => {
  const f = world.flood;
  return f.forecast ? floodLevelRow(f.forecast) : null;
};

// How far the water has spread over the floodplain at game time t (days, may be fractional): 0 (dry) to 1 (the whole spread of the
// level), rising over the first month of the season, full to its end, draining over FLOOD.drainMonths (render only, but pure).
export function waterAt(world, t) {
  const f = world.flood;
  if (!f.risen || f.from === null || t < f.from) return 0;
  const rise = DAYS_PER_MONTH, drain = FLOOD.drainMonths.length * DAYS_PER_MONTH;
  if (t <= f.to + 1) return Math.min(1, (t - f.from) / rise);
  return Math.max(0, 1 - (t - (f.to + 1)) / drain);
}

// A look at the flood for the words: { on, phase, level, known, applied, factor, monthsTo }
//   phase: 'off' (not a Town yet), 'wait' (before the season, the level not known), 'forecast' (before the season, known), 'rising'
//   (the first month of the season), 'high' (the rest of it), 'draining' (after it), 'quiet' (the rest of the year)
//   level: the known level's row (null when not known); applied: the row scaling the harvest now (null before a first flood); factor: its harvest
//   monthsTo: whole months until the rise (a year with no record yet: until month 7 of this or the next year)
export function floodLook(world) {
  const f = world.flood;
  if (!floodsOn(world)) return { on: false, phase: 'off', level: null, applied: null, factor: 1, monthsTo: null, known: false };
  const { year, month } = partsOf(world.day);
  const applied = appliedLevel(world);
  const record = f.year === year;
  let phase = 'quiet', monthsTo = null;
  if (record && !f.risen) {
    phase = f.forecast ? 'forecast' : 'wait';
    monthsTo = Math.max(0, FLOOD.months[0] - month);
  } else if (record && f.risen) {
    const { from, to } = f;
    phase = world.day <= to ? (world.day < from + DAYS_PER_MONTH ? 'rising' : 'high') : 'draining';
    if (world.day > to + FLOOD.drainMonths.length * DAYS_PER_MONTH) phase = 'quiet';
  } else if (month < FLOOD.months[0]) {
    phase = 'wait'; monthsTo = FLOOD.months[0] - month;
  } else {
    monthsTo = MONTHS_PER_YEAR - month + FLOOD.months[0];
  }
  if (monthsTo === null && phase === 'quiet') monthsTo = month < FLOOD.months[0] ? FLOOD.months[0] - month : MONTHS_PER_YEAR - month + FLOOD.months[0];
  const level = record && f.forecast ? floodLevelRow(f.forecast) : null;
  // Version 8.1 (ruling 1221): factor is what the floodplain farms grow now, prepared; prepared says the Nilometer cut the applied level's loss.
  return { on: true, phase, level, known: Boolean(level), applied, factor: levelHarvest(world, applied), prepared: preparedFor(world, applied), levelPrepared: preparedFor(world, level), monthsTo };
}

// Version 8.1 (Track B, ruling 1222): the next flood as the top bar's flood icon shows it, all year. With a working Nilometer the level of the next rise
// is read at once (this year's before its rise, next year's after it: levelOfYear, which a Nile reading's drought warning turns Low as it does a forecast);
// without one only what the city already knows (a forecast bought from the priests, or this year's own level once the water is up) shows.
// { on, year, level (a FLOOD_LEVELS row, or null when not known), monthsTo, nilometer (a working one stands), harvest (what the floodplain farms would
// grow at that level now, prepared), prepared }. on is false before the river floods in the city (a Town).
export function nextFlood(world) {
  if (!floodsOn(world)) return { on: false, year: null, level: null, monthsTo: null, nilometer: false, harvest: 1, prepared: false };
  const f = world.flood, { year, month } = partsOf(world.day);
  const thisYear = f.year === year ? !f.risen : month < FLOOD.months[0];
  const target = thisYear ? year : year + 1;
  const monthsTo = thisYear ? Math.max(0, FLOOD.months[0] - month) : MONTHS_PER_YEAR - month + FLOOD.months[0];
  const nilometer = nilometerWorking(world);
  let id = null;
  if (nilometer) id = f.year === target && f.level ? f.level : levelOfYear(world, target);
  else if (f.year === target && f.forecast) id = f.forecast;
  const level = id ? floodLevelRow(id) : null;
  const prepared = Boolean(level) && nilometer && level.harvest < 1;
  return { on: true, year: target, level, monthsTo, nilometer, harvest: level ? preparedHarvest(level.harvest, prepared) : 1, prepared };
}

// The floodplain farms' monthly food, for the summary's forecast: working farms of food (grain, figs: FOOD_GOODS) on the floodplain (barley
// and flax are raw goods, not food, and are left out), what they make a month at full staff as they stand ({ now }) and at a plain year's
// level ({ plain }), so the difference is the flood's.
export function floodOutlook(world, level = null) {
  const l = level || appliedLevel(world);
  const harvest = levelHarvest(world, l);   // Version 8.1 (ruling 1221): as the farms grow it, prepared
  let farms = 0, now = 0, plain = 0;
  for (const b of Object.values(world.buildings)) {
    const def = BUILDINGS[b.type];
    if (!isFloodFarm(b.type) || !FOOD_GOODS.includes(def.produces.good) || !onFloodplain(world, b)) continue;
    if (!isWorking(b)) continue;
    const monthly = def.produces.perMonth * staffRatio(b);
    farms += 1;
    plain += monthly;
    now += monthly * harvest;
  }
  return { farms, plain: Math.round(plain), now: Math.round(now), level: l };
}

// ── The Flood omen (the Court's card) ──
// Pays the priests for this year's level before the water rises: { ok, reason, level } (level: the forecast now known). It does the buying
// exactly once: it refuses with 'known' when the level is already known (a Nilometer read it, the priests were paid, or the water is
// up), 'nilometer' while a working Nilometer stands (it reads the flood for free from month 4), 'not_yet' before the river floods in this
// city and 'late' once the season is over for the year. The Court takes the gold itself.
export function buyForecast(world) {
  if (!floodsOn(world)) return { ok: false, reason: 'not_yet', level: null };
  if (!ensureYear(world)) return { ok: false, reason: 'late', level: null };
  const f = world.flood;
  if (f.risen || f.forecast) return { ok: false, reason: 'known', level: f.forecast || f.level };
  if (nilometerWorking(world)) return { ok: false, reason: 'nilometer', level: null };
  f.forecast = f.level;
  return { ok: true, reason: null, level: f.level };
}

// The flood speaks through captions, not alerts (ruling 334).
export const floodAlerts = (world) => [];
