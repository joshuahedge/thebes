// Version 6.0, Track B1 (rulings 687-688): drought and the low Nile, locusts and blight. The state is world.hazards.drought and
// world.hazards.locusts, each { warning, active, nextDay, last } (src/data/hazards.js):
//   drought.warning  null, or { day, strikes (the day the water would rise), year (the flood's year) }: the Nile reading warns months ahead of a
//                    low flood, and that year's flood is Low (src/sim/flood.js levelOfYear reads it)
//   drought.active   null, or { day, year, until, factor }: from the rise until `until` every farm yields factor of its crop (1 - cut x severity)
//   locusts.warning  null, or { day, strikes, kind ('locusts' | 'blight'), farms (ids), centre { x, y }, early (ids harvested early, as they happen) }
//   locusts.active   null, or { day, kind, farms, until, factor, early }: the band's farms yield factor of their crop until `until`
//   last             the last one's report { day, end, ... }
// The harvest multiplier a farm is given (src/sim/production.js produceDay) is min(the flood's, droughtFactor) x cropFactor. Nothing here reads
// the clock or Math.random: every draw is hash2(a, b, (world.seed + HAZARD_SALT.x) | 0).
import { DROUGHT, CROPS, CROP_KINDS } from '../data/hazards.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { floodsOn, seasonDays } from './flood.js';
import { dangerDraws, hazardDraw, gapDays, yearOf, otherWarned, slowToOne } from './draws.js';
import { DAYS_PER_MONTH } from './time.js';

export const isFarm = (type) => type.startsWith('farm_');
export const farmsOf = (world) => allBuildings(world).filter((b) => isFarm(b.type));

// ── The yield a farm is given ──
// The drought's share of a farm's crop: 1 outside a drought and for anything that is not a farm.
export function droughtFactor(world, b) {
  const a = world.hazards.drought.active;
  return a && world.day < a.until && isFarm(b.type) ? a.factor : 1;
}
// Locusts' or blight's share of a farm's crop: the band's factor while one is under way over it, else 1.
export function cropFactor(world, b) {
  const a = world.hazards.locusts.active;
  return a && world.day < a.until && a.farms.includes(b.id) ? a.factor : 1;
}
// The band a farm is named in while locusts or blight are warned, or null.
export function warnedBand(world, id) {
  const w = world.hazards.locusts.warning;
  return w && w.farms.includes(id) ? w : null;
}
// Why a farm yields less than its full crop now, or null: 'drought', 'locusts' or 'blight' (the crop's own kind).
export function yieldCause(world, b) {
  if (!isFarm(b.type)) return null;
  const c = world.hazards.locusts.active;
  if (cropFactor(world, b) < 1) return c.kind;
  return droughtFactor(world, b) < 1 ? 'drought' : null;
}

// ── Drought ──
const droughtYears = (world, year) => {
  const d = world.hazards.drought;
  return Boolean((d.warning && d.warning.year === year) || (d.active && d.active.year === year));
};
export const droughtYear = droughtYears;

// The month's draw: once a drought is due (DROUGHT.gap, the level's chance) and the city has its flood (a Town), the warning names the next rise
// at least DROUGHT.leadMonths[0] months away (the next year's when this year's is too near), and that year's flood is made Low: a flood already
// drawn for it, and a forecast already read, become Low.
export function droughtMonth(world, events = null) {
  const h = world.hazards.drought, d = dangerDraws(world);
  if (h.warning || h.active || !d.drought || !floodsOn(world)) return;
  if (h.nextDay === null) { h.nextDay = world.day + gapDays(world, DROUGHT.first, 'droughtDraw', 0); return; }
  if (world.day < h.nextDay) return;
  if (otherWarned(world, 'drought')) { h.nextDay = world.day + DAYS_PER_MONTH; return; }
  let year = yearOf(world.day), from = seasonDays(year).from;
  if (from - world.day < DROUGHT.leadMonths[0] * DAYS_PER_MONTH) { year += 1; from = seasonDays(year).from; }
  if (from - world.day > DROUGHT.leadMonths[1] * DAYS_PER_MONTH) { h.nextDay = world.day + DAYS_PER_MONTH; return; }
  h.warning = { day: world.day, strikes: from, year };
  const f = world.flood;
  if (f.year === year && !f.risen) { f.level = 'low'; if (f.forecast) f.forecast = 'low'; }
  slowToOne(world);
  if (events) events.push({ type: 'drought_warning', strikes: from, year });
}

export function droughtDay(world, events = null) {
  const h = world.hazards.drought;
  if (h.warning && !h.active && world.day >= h.warning.strikes) {
    const w = h.warning, sev = dangerDraws(world).severity;
    h.active = { day: world.day, year: w.year, until: world.day + DROUGHT.months * DAYS_PER_MONTH, factor: Math.max(DROUGHT.floor, 1 - DROUGHT.cut * sev) };
    h.warning = null;
    world.tally.droughts += 1;
    if (events) events.push({ type: 'drought_start', until: h.active.until, factor: h.active.factor });
  }
  if (h.active && world.day >= h.active.until) {
    h.last = { day: h.active.day, end: world.day, year: h.active.year, factor: h.active.factor };
    h.active = null;
    h.nextDay = world.day + gapDays(world, DROUGHT.gap, 'droughtDraw', 1);
    if (events) events.push({ type: 'drought_end' });
  }
}

// What the food stores say about a lean year, from last month's goods record (stats.lastMonth): the food the city holds (stores and bazaar stalls),
// what homes ate a month and what the farms made, and, at the drought's share of the crop, what is short each month and over the whole
// drought. { held, used, made, factor, short (a month), need (over DROUGHT.months), carries (the stores last it), monthsHeld (how many months
// they feed the city alone, at what is used less what is still made; Infinity when the farms still keep up) }.
export function foodOutlook(world, factor = null) {
  const last = world.stats.lastMonth || {};
  const f = factor !== null ? factor : (world.hazards.drought.active ? world.hazards.drought.active.factor : Math.max(DROUGHT.floor, 1 - DROUGHT.cut * dangerDraws(world).severity));
  let held = 0;
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.stores || def.sells) for (const g of FOOD_GOODS) held += b.store[g] || 0;
  }
  const used = FOOD_GOODS.reduce((s, g) => s + ((last.used || {})[g] || 0), 0), made = FOOD_GOODS.reduce((s, g) => s + ((last.made || {})[g] || 0), 0);
  const short = Math.max(0, Math.round(used - made * f));
  const need = short * DROUGHT.months;
  return { held, used, made, factor: f, short, need, carries: held >= need, monthsHeld: short > 0 ? Math.floor(held / short) : Infinity };
}

// ── Locusts and blight ──
// The band of farms a swarm would fall on now: the centre farm drawn by the seed, the farms within CROPS.radius tiles of it (the nearest
// CROPS.maxFarms), or, when fewer than CROPS.minFarms are that close, the nearest CROPS.minFarms of all. null when the city has fewer farms.
export function pickBand(world) {
  const farms = farmsOf(world);
  if (farms.length < CROPS.minFarms) return null;
  const centre = farms[Math.floor(hazardDraw(world, world.day, farms.length, 'locustBand') * farms.length)];
  const cx = centre.x + centre.w / 2, cy = centre.y + centre.d / 2;
  const near = farms.map((f) => ({ f, d: Math.hypot(f.x + f.w / 2 - cx, f.y + f.d / 2 - cy) })).sort((p, q) => p.d - q.d || p.f.id - q.f.id);
  let band = near.filter((e) => e.d <= CROPS.radius).slice(0, CROPS.maxFarms);
  if (band.length < CROPS.minFarms) band = near.slice(0, CROPS.minFarms);
  return { centre: { x: cx, y: cy }, farms: band.map((e) => e.f.id) };
}

export function locustsMonth(world, events = null) {
  const h = world.hazards.locusts, d = dangerDraws(world);
  if (h.warning || h.active || !d.locusts) return;
  if (h.nextDay === null) { h.nextDay = world.day + gapDays(world, CROPS.first, 'locustGap', 0); return; }
  if (world.day < h.nextDay) return;
  const band = otherWarned(world, 'locusts') ? null : pickBand(world);
  if (!band) { h.nextDay = world.day + DAYS_PER_MONTH; return; }
  const kind = hazardDraw(world, world.day, 1, 'blightKind') < CROPS.blightShare ? 'blight' : 'locusts';
  h.warning = { day: world.day, strikes: world.day + CROPS.warnDays, kind, farms: band.farms, centre: band.centre, early: [] };
  slowToOne(world);
  if (events) events.push({ type: 'locusts_warning', kind, farms: band.farms.slice(), strikes: h.warning.strikes });
}

export function locustsDay(world, events = null) {
  const h = world.hazards.locusts;
  if (h.warning && !h.active && world.day >= h.warning.strikes) {
    const w = h.warning, sev = dangerDraws(world).severity, row = CROPS[w.kind];
    const farms = w.farms.filter((id) => world.buildings[id] && isFarm(world.buildings[id].type));
    h.active = { day: world.day, kind: w.kind, farms, until: world.day + row.days, factor: Math.max(0, 1 - row.loss * sev), early: (w.early || []).slice() };
    h.warning = null;
    world.tally[w.kind === 'blight' ? 'blights' : 'swarms'] += 1;
    if (events) events.push({ type: 'locusts_strike', kind: w.kind, farms: farms.slice(), until: h.active.until, factor: h.active.factor });
  }
  if (h.active && world.day >= h.active.until) {
    const a = h.active;
    h.last = { day: a.day, end: world.day, kind: a.kind, farms: a.farms.length, early: a.early.length, factor: a.factor };
    h.active = null;
    h.nextDay = world.day + gapDays(world, CROPS.gap, 'locustGap', 1);
    if (events) events.push({ type: 'locusts_end', kind: a.kind });
  }
}

export const isCropKind = (k) => CROP_KINDS.includes(k);
