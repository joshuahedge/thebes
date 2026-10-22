// Version 6.0 Track B1 (rulings 687-688): drought and the low Nile, locusts and blight, Harvest now. A low flood is warned months ahead (the
// year's flood is Low) and for a year every farm yields about half; full granaries carry the city. Locusts or blight are warned a month ahead
// over a band of farms; a farm can Harvest now (part of a month's crop at once, then it rests). None in the first three game years.
import { describe, it, expect } from '../../harness.js';
import { droughtMonth, droughtDay, locustsMonth, locustsDay, pickBand, droughtFactor, cropFactor, foodOutlook, warnedBand } from '../../../src/sim/crops.js';
import { hazardAlerts, hazardItems } from '../../../src/sim/hazards.js';
import { produceDay, harvestQuote, harvestNow, harvestFactor } from '../../../src/sim/production.js';
import { levelOfYear, ensureYear, seasonDays } from '../../../src/sim/flood.js';
import { DROUGHT, CROPS, HARVEST_NOW, GRACE_DAYS } from '../../../src/data/hazards.js';
import { FLOOD } from '../../../src/data/river.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const OPEN = GRACE_DAYS + 30;     // day 1110: game year 4, month 1

// A Town with roads along y = 13 and y = 19 joined at x = 9, a granary on the first, and `n` staffed grain farms on the fertile land (x < 8) beside
// the roads: four along y = 14 and then two along y = 17 (each within the farms' road reach of the granary).
const FARM_SPOTS = [[0, 14], [2, 14], [4, 14], [6, 14], [4, 17], [6, 17]];
function farmland({ n = 5, day = OPEN, difficulty = 'normal' } = {}) {
  const w = makeTestWorld();
  w.difficulty = difficulty;
  setRoad(w, 0, 13, 31, 13);
  setRoad(w, 0, 19, 9, 19);
  setRoad(w, 9, 13, 9, 19);
  w.milestone = 'town';
  w.day = day;
  const granary = addRaw(w, 'granary', 10, 11, { store: { grain: 100 } });
  granary.staff = BUILDINGS.granary.workers;
  const farms = FARM_SPOTS.slice(0, n).map(([x, y]) => addRaw(w, 'farm_grain', x, y, { staff: BUILDINGS.farm_grain.workers }));
  return { w, granary, farms };
}

describe('v60 b1 crops drought', () => {
  it('draws nothing in the grace; once open it fixes a day, then warns the next flood at least three months ahead and makes that flood Low', () => {
    const { w } = farmland({ day: GRACE_DAYS - 30 });
    droughtMonth(w, []);
    expect([w.hazards.drought.nextDay, w.hazards.drought.warning]).toEqual([null, null]);
    w.day = OPEN;
    droughtMonth(w, []);
    const due = w.hazards.drought.nextDay;
    expect([due > OPEN, due <= OPEN + DROUGHT.first[1]]).toEqual([true, true]);
    w.day = due;
    ensureYear(w);                                                                      // a Town: this year's flood is drawn
    const events = [];
    droughtMonth(w, events);
    const warn = w.hazards.drought.warning;
    expect(warn.strikes - w.day).toBeGreaterThanOrEqual(DROUGHT.leadMonths[0] * 30);
    expect(warn.strikes - w.day).toBeLessThanOrEqual(DROUGHT.leadMonths[1] * 30);
    expect(warn.strikes).toBe(seasonDays(warn.year).from);
    expect(levelOfYear(w, warn.year)).toBe('low');
    expect(events).toEqual([{ type: 'drought_warning', strikes: warn.strikes, year: warn.year }]);
    expect(hazardAlerts(w)).toEqual([{ code: 'drought_warning', arrives: warn.strikes }]);
  });

  it('sets the year\'s flood Low (and a forecast already read) when the warning falls in the year of the water', () => {
    const { w } = farmland({ day: 360 * 3 + 30 });                                      // year 4, month 2: the flood is months away
    w.hazards.graceUntil = 0;
    ensureYear(w);
    w.flood.level = 'high';
    w.flood.forecast = 'high';
    w.hazards.drought.nextDay = w.day;
    droughtMonth(w, []);
    expect([w.hazards.drought.warning.year, w.flood.year, w.flood.level, w.flood.forecast]).toEqual([4, 4, 'low', 'low']);
    const next = farmland({ day: 360 * 3 + 6 * 30 + 15 });                              // too near this year's rise: next year's
    next.w.hazards.graceUntil = 0;
    ensureYear(next.w);
    next.w.hazards.drought.nextDay = next.w.day;
    droughtMonth(next.w, []);
    expect([next.w.hazards.drought.warning.year, levelOfYear(next.w, 5)]).toEqual([5, 'low']);
  });

  it('strikes at the rise: every farm yields 1 - cut x severity for the months it lasts, then ends with a report and the next draw', () => {
    const { w, farms } = farmland();
    const year = 4, from = seasonDays(year).from;
    w.day = from;
    w.hazards.drought.warning = { day: from - 120, strikes: from, year };
    const events = [];
    droughtDay(w, events);
    const a = w.hazards.drought.active;
    expect([a.year, a.until, a.factor, w.tally.droughts]).toEqual([year, from + DROUGHT.months * 30, 1 - DROUGHT.cut, 1]);
    expect(events).toEqual([{ type: 'drought_start', until: a.until, factor: a.factor }]);
    expect([droughtFactor(w, farms[0]), droughtFactor(w, w.buildings[Object.keys(w.buildings).find((id) => w.buildings[id].type === 'granary')])]).toEqual([0.5, 1]);
    expect(harvestFactor(w, farms[0])).toBe(0.5);
    const month = () => { const before = w.tally.made.grain || 0; for (let k = 0; k < 30; k++) produceDay(w); return (w.tally.made.grain || 0) - before; };
    for (const f of farms.slice(1)) f.staff = 0;                                        // one farm, to count its crop
    const lean = month();
    w.hazards.drought.active = null;
    expect([lean, month()]).toEqual([15, 30]);                                          // half the crop in a drought year
    w.hazards.drought.active = a;
    w.day = a.until;
    droughtDay(w, []);
    expect([w.hazards.drought.active, w.hazards.drought.last.factor, w.hazards.drought.nextDay > w.day]).toEqual([null, 0.5, true]);
    const relaxed = farmland({ difficulty: 'relaxed' });
    relaxed.w.day = from;
    relaxed.w.hazards.drought.warning = { day: from - 120, strikes: from, year };
    droughtDay(relaxed.w, []);
    expect(relaxed.w.hazards.drought.active.factor).toBe(1 - DROUGHT.cut * 0.5);
  });

  it('counts a low flood in a drought year once: the lower of the two for a floodplain farm, never the product', () => {
    const { w, farms } = farmland();
    w.flood = { year: 4, level: 'low', forecast: 'low', from: 0, to: 0, applied: 'low', risen: true };
    w.floodplain = new Array(w.size * w.size).fill(1);
    expect(harvestFactor(w, farms[0])).toBe(0.6);                                       // the Low flood alone (FLOOD_LEVELS)
    w.hazards.drought.active = { day: w.day, year: 4, until: w.day + 360, factor: 0.5 };
    expect(harvestFactor(w, farms[0])).toBe(0.5);
    w.hazards.drought.active = null;
    w.flood.applied = 'good';
    expect(harvestFactor(w, farms[0])).toBe(1.1);                                       // with no drought a good flood still feeds the farm in full
    w.hazards.drought.active = { day: w.day, year: 4, until: w.day + 360, factor: 0.5 };
    expect(harvestFactor(w, farms[0])).toBe(0.5);                                       // and in a drought year the lean crop rules
    expect(FLOOD.from).toBe('town');
  });

  it('says whether the stores carry the city: what is held against what homes eat and the farms still make at the drought\'s share', () => {
    const { w } = farmland();
    w.stats.lastMonth = { used: { grain: 100 }, made: { grain: 80 } };
    const o = foodOutlook(w);
    expect([o.held, o.used, o.made, o.factor, o.short, o.need, o.carries]).toEqual([100, 100, 80, 0.5, 60, 60 * DROUGHT.months, false]);
    expect(o.monthsHeld).toBe(1);
    w.buildings[Object.keys(w.buildings).find((id) => w.buildings[id].type === 'granary')].store.grain = 800;
    expect(foodOutlook(w).carries).toBe(true);
    w.stats.lastMonth = { used: { grain: 100 }, made: { grain: 200 } };
    expect([foodOutlook(w).short, foodOutlook(w).monthsHeld]).toEqual([0, Infinity]);
  });
});

describe('v60 b1 crops locusts and blight', () => {
  it('warns a month ahead over a band of nearby farms (the nearest few when they are far apart), never in the grace', () => {
    const { w, farms } = farmland({ n: 6, day: GRACE_DAYS - 30 });
    locustsMonth(w, []);
    expect([w.hazards.locusts.nextDay, w.hazards.locusts.warning]).toEqual([null, null]);
    w.day = OPEN;
    locustsMonth(w, []);
    w.day = w.hazards.locusts.nextDay;
    const events = [];
    locustsMonth(w, events);
    const warn = w.hazards.locusts.warning;
    expect([warn.strikes - warn.day, ['locusts', 'blight'].includes(warn.kind), warn.farms.length >= CROPS.minFarms, warn.farms.length <= CROPS.maxFarms]).toEqual([CROPS.warnDays, true, true, true]);
    for (const id of warn.farms) expect(farms.some((f) => f.id === id)).toBe(true);
    expect(events).toEqual([{ type: 'locusts_warning', kind: warn.kind, farms: warn.farms, strikes: warn.strikes }]);
    expect(hazardAlerts(w)).toEqual([{ code: 'locusts_warning', id: warn.farms[0], ids: warn.farms, kind: warn.kind, arrives: warn.strikes }]);
    expect(pickBand(farmland({ n: 2 }).w)).toBe(null);                                 // too few farms for a band
  });

  it('strikes on the day: locusts leave the band\'s farms nothing for a month, blight part of the crop for three, Relaxed and Hard to scale', () => {
    const { w, farms } = farmland();
    w.hazards.locusts.warning = { day: w.day, strikes: w.day + 30, kind: 'locusts', farms: farms.slice(0, 3).map((f) => f.id), centre: { x: 3, y: 17 }, early: [] };
    w.day += 30;
    const events = [];
    locustsDay(w, events);
    const a = w.hazards.locusts.active;
    expect([a.kind, a.farms, a.until, a.factor, w.tally.swarms, w.tally.blights]).toEqual(['locusts', farms.slice(0, 3).map((f) => f.id), w.day + CROPS.locusts.days, 0, 1, 0]);
    expect([cropFactor(w, farms[0]), cropFactor(w, farms[4])]).toEqual([0, 1]);
    produceDay(w);
    expect([farms[0].blocked, farms[4].blocked]).toEqual(['locusts', farms[4].blocked]);
    expect(farms[0].progress).toBe(0);
    w.day = a.until;
    locustsDay(w, []);
    expect([w.hazards.locusts.active, w.hazards.locusts.last.kind, w.hazards.locusts.last.farms]).toEqual([null, 'locusts', 3]);
    const blight = farmland({ difficulty: 'hard' });
    blight.w.hazards.locusts.warning = { day: 0, strikes: blight.w.day, kind: 'blight', farms: blight.farms.map((f) => f.id), centre: { x: 3, y: 17 }, early: [] };
    locustsDay(blight.w, []);
    expect([blight.w.hazards.locusts.active.factor, blight.w.tally.blights]).toEqual([Math.max(0, 1 - CROPS.blight.loss * 1.25), 1]);
    const mild = farmland({ difficulty: 'relaxed' });
    mild.w.hazards.locusts.warning = { day: 0, strikes: mild.w.day, kind: 'blight', farms: mild.farms.map((f) => f.id), centre: { x: 3, y: 17 }, early: [] };
    locustsDay(mild.w, []);
    expect(mild.w.hazards.locusts.active.factor).toBe(1 - CROPS.blight.loss * 0.5);
  });
});

describe('v60 b1 crops harvest now', () => {
  function warned() {
    const t = farmland();
    t.w.hazards.locusts.warning = { day: t.w.day, strikes: t.w.day + 30, kind: 'locusts', farms: t.farms.slice(0, 3).map((f) => f.id), centre: { x: 3, y: 17 }, early: [] };
    return t;
  }

  it('quotes a share of a month\'s crop and the days the farm rests, only for a farm in a warned band', () => {
    const { w, farms, granary } = warned();
    const q = harvestQuote(w, farms[0]);
    const want = Math.round(BUILDINGS.farm_grain.produces.perMonth * HARVEST_NOW.share);
    expect([q.ok, q.good, q.units, q.want, q.restDays, q.kind, q.strikes]).toEqual([true, 'grain', want, want, HARVEST_NOW.restDays, 'locusts', w.hazards.locusts.warning.strikes]);
    expect(harvestQuote(w, farms[4]).reason).toBe('not_warned');
    expect(harvestQuote(w, granary).reason).toBe('not_warned');
    farms[1].staff = 0;
    expect(harvestQuote(w, farms[1]).reason).toBe('idle');
  });

  it('puts the crop in the stores at once, rests the farm, and counts it once per warning', () => {
    const { w, farms, granary } = warned();
    const q = harvestQuote(w, farms[0]);
    const before = granary.store.grain;
    const r = harvestNow(w, farms[0].id);
    expect([r.ok, r.units, granary.store.grain - before, farms[0].restUntil, w.tally.harvestsEarly, w.hazards.locusts.warning.early]).toEqual([true, q.units, q.units, w.day + HARVEST_NOW.restDays, 1, [farms[0].id]]);
    expect(harvestQuote(w, farms[0]).reason).toBe('done');
    expect(harvestNow(w, farms[0].id).ok).toBe(false);
    produceDay(w);
    expect(farms[0].blocked).toBe('resting');
    w.day += HARVEST_NOW.restDays;
    produceDay(w);
    expect(farms[0].blocked === 'resting').toBe(false);
    expect(warnedBand(w, farms[0].id)).toBeTruthy();
  });

  it('keeps what was harvested early in the swarm\'s record, and refuses when no store has room', () => {
    const { w, farms, granary } = warned();
    harvestNow(w, farms[0].id);
    w.day += 30;
    locustsDay(w, []);
    expect(w.hazards.locusts.active.early).toEqual([farms[0].id]);
    const full = warned();
    full.granary.store.grain = BUILDINGS.granary.capacity;
    expect(harvestQuote(full.w, full.farms[0]).reason).toBe('no_room');
    expect(granary.id > 0).toBe(true);
  });

  it('shows in the advice while warned, naming the band\'s farms and its first farm to harvest, and in the alerts', () => {
    const { w, farms } = warned();
    const out = [];
    hazardItems(w, [], out);
    const a = out.find((i) => i.kind === 'locusts');
    expect([a.key, a.count, a.id, a.fix.select, a.data.kind, a.data.days]).toEqual(['locusts:warned', 3, farms[0].id, farms[0].id, 'locusts', 30]);
    harvestNow(w, farms[0].id);
    const again = [];
    hazardItems(w, [], again);
    expect(again.find((i) => i.kind === 'locusts').id).toBe(farms[1].id);
  });
});
