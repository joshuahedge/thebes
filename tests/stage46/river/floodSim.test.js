// The River track's flood tests (rulings 334, 346, 360-362, 368): the calendar, the seeded level, the season's days, the Nilometer's forecast, the
// harvest on the floodplain and off it, the priests' forecast, and that the flood does no harm.
import { describe, it, expect } from '../../harness.js';
import { SEASONS } from '../../../src/data/tips.js';
import { FLOOD, FLOOD_LEVELS, FISHING, floodLevelRow } from '../../../src/data/river.js';
import {
  levelOfYear, seasonDays, forecastDay, floodsOn, ensureYear, floodDay, floodHarvestFactor, onFloodplain, waterAt, floodLook, floodOutlook,
  buyForecast, isFloodSeason, fishFactor, floodFairOrBetter, appliedLevel,
} from '../../../src/sim/flood.js';
import { produceDay } from '../../../src/sim/production.js';
import { population } from '../../../src/sim/world.js';
import { riverWorld, addFarm, addGranary, addRaw, stepRiver, dayOf, MONTH, YEAR } from './riverHelpers.js';

// A world on the first day of a month, a granary and a staffed grain farm on the floodplain and one off it.
function farmsWorld({ month = 1, year = 2, ...rest } = {}) {
  const w = riverWorld(rest);
  const on = addFarm(w, 22, 11), off = addFarm(w, 26, 11);
  addGranary(w, 24, 11);
  w.day = dayOf(year, month);
  return { w, on, off };
}
const monthOf = (w) => Math.floor(w.day / MONTH) % 12 + 1;
const yearOf = (w) => Math.floor(w.day / YEAR) + 1;

describe('s46 river flood: the calendar (ruling 346)', () => {
  it('puts Akhet on months 7-10 (the flood and its draining), Peret on 11-2 and Shemu on 3-6', () => {
    expect(SEASONS.map((s, i) => `${i + 1}:${s}`).join(' ')).toBe('1:peret 2:peret 3:shemu 4:shemu 5:shemu 6:shemu 7:akhet 8:akhet 9:akhet 10:akhet 11:peret 12:peret');
    const akhet = SEASONS.map((s, i) => (s === 'akhet' ? i + 1 : 0)).filter(Boolean);
    expect(akhet).toEqual([...FLOOD.months, ...FLOOD.drainMonths]);                       // the data and the calendar agree
  });
  it('floods in months 7-9: the season is the first day of month 7 to the last of month 9', () => {
    expect(FLOOD.months).toEqual([7, 8, 9]);
    const s = seasonDays(3);
    expect([s.from, s.to]).toEqual([dayOf(3, 7), dayOf(3, 10) - 1]);
    expect(forecastDay(3)).toBe(dayOf(3, 4));                                               // the Nilometer reads it 3 months ahead
  });
});

describe('s46 river flood: the level', () => {
  it('draws the year\'s level from the seed: the same every time, and Low 15%, Fair 35%, Good 35%, High 15% over many years', () => {
    const w = riverWorld({ seed: 7 });
    expect(levelOfYear(w, 5)).toBe(levelOfYear(w, 5));
    const counts = { low: 0, fair: 0, good: 0, high: 0 };
    const N = 8000;
    for (let y = 1; y <= N; y++) counts[levelOfYear(w, y)] += 1;
    for (const l of FLOOD_LEVELS) expect([l.id, Math.abs(counts[l.id] / N - l.chance) < 0.025]).toEqual([l.id, true]);
    const other = riverWorld({ seed: 8 });
    let differs = 0;
    for (let y = 1; y <= 40; y++) if (levelOfYear(w, y) !== levelOfYear(other, y)) differs++;
    expect(differs).toBeGreaterThan(5);                                                      // another city's years differ
  });
  it('has the multipliers 0.6, 1.0, 1.1 and 1.25 for Low, Fair, Good and High', () => {
    expect(FLOOD_LEVELS.map((l) => [l.id, l.harvest])).toEqual([['low', 0.6], ['fair', 1.0], ['good', 1.1], ['high', 1.25]]);
    expect(FLOOD_LEVELS.reduce((s, l) => s + l.chance, 0)).toBeGreaterThan(0.999);
  });
});

describe('s46 river flood: when it comes', () => {
  it('does not flood a village; the first flood is the first season that starts once the city is a Town (ruling 361)', () => {
    const w = riverWorld({ milestone: 'village' });
    w.day = dayOf(1, 1);
    stepRiver(w, YEAR * 2);
    expect([w.flood.year, w.flood.risen, w.tally.floods, floodsOn(w)]).toEqual([null, false, 0, false]);
    w.milestone = 'town';
    w.day = dayOf(3, 8);                                                                     // a Town reached in month 8: the season is under way, so no flood this year
    stepRiver(w, 5);
    expect([w.flood.year, w.tally.floods]).toEqual([null, 0]);
    w.day = dayOf(3, 12);
    stepRiver(w, MONTH * 7 + 1);                                                             // into year 4's season: it floods
    expect([w.flood.year, w.flood.risen, w.tally.floods]).toEqual([4, true, 1]);
  });
  it('rises on the first day of month 7, stands to the last day of month 9, and leaves the harvest level in place until the next flood', () => {
    const w = riverWorld();
    w.day = dayOf(2, 1);
    const events = [];
    stepRiver(w, MONTH * 6 - 1, events);
    expect([w.flood.year, w.flood.risen, isFloodSeason(w), w.flood.level === levelOfYear(w, 2)]).toEqual([2, false, false, true]);
    stepRiver(w, 1, events);                                                                 // the last day of month 6 has run: month 7 begins
    expect(w.flood.risen).toBe(false);
    stepRiver(w, 1, events);                                                                 // the first day of month 7
    expect([w.flood.risen, isFloodSeason(w), w.flood.applied === w.flood.level, w.flood.forecast === w.flood.level, w.tally.floods]).toEqual([true, true, true, true, 1]);
    expect(events.filter((e) => e.type === 'flood_rise').map((e) => e.level)).toEqual([w.flood.level]);
    const level = w.flood.level;
    stepRiver(w, MONTH * 3 - 1);
    expect(isFloodSeason(w)).toBe(false);                                                    // the water has gone past month 9
    expect(w.flood.applied).toBe(level);                                                     // but the harvest keeps the level, through month 6 of the next year
    stepRiver(w, MONTH * 8);
    expect([monthOf(w), yearOf(w), w.flood.applied, w.flood.year]).toEqual([6, 3, level, 3]);   // a new year's record exists; the old level still holds
    stepRiver(w, MONTH + 1);                                                                 // month 7 of year 3 has begun
    expect([w.flood.year, w.flood.applied]).toEqual([3, levelOfYear(w, 3)]);
    expect(w.tally.floods).toBe(2);
  });
  it('does no harm: nothing is removed, no one leaves, and no fire, raid or alert comes of it', () => {
    const { w } = farmsWorld({ month: 5 });
    const before = { buildings: Object.keys(w.buildings).length, people: population(w), gold: w.gold, rubble: Object.values(w.buildings).filter((b) => b.type === 'rubble').length };
    const events = [];
    stepRiver(w, MONTH * 6, events);
    expect(w.flood.risen).toBe(true);
    expect([Object.keys(w.buildings).length, population(w), w.gold, Object.values(w.buildings).filter((b) => b.type === 'rubble').length]).toEqual([before.buildings, before.people, before.gold, before.rubble]);
    expect(events.filter((e) => e.type.startsWith('flood')).every((e) => ['flood_forecast', 'flood_rise'].includes(e.type))).toBe(true);
  });
});

describe('s46 river flood: the Nilometer (ruling 334)', () => {
  it('forecasts the level 3 months before the season, from month 4, only while a Nilometer works', () => {
    const w = riverWorld();
    const n = addRaw(w, 'nilometer', 19, 12);
    n.staff = 2;
    w.day = dayOf(2, 1);
    const events = [];
    stepRiver(w, MONTH * 3 - 1, events);
    expect([w.flood.forecast, events.length]).toEqual([null, 0]);                            // month 3: nothing yet
    stepRiver(w, 1, events);                                                                 // the last day of month 3 has run
    expect([w.flood.forecast, events.length]).toEqual([null, 0]);
    stepRiver(w, 1, events);                                                                 // the first day of month 4
    expect([monthOf(w), w.flood.forecast === levelOfYear(w, 2), w.flood.risen]).toEqual([4, true, false]);
    expect(events).toEqual([{ type: 'flood_forecast', level: levelOfYear(w, 2), how: 'nilometer' }]);
    const look = floodLook(w);
    expect([look.phase, look.known, look.level.id, look.monthsTo]).toEqual(['forecast', true, levelOfYear(w, 2), 3]);
  });
  it('reads nothing when it is unstaffed, paused or not there, and reads the year as soon as it works', () => {
    const w = riverWorld();
    const n = addRaw(w, 'nilometer', 19, 12);
    w.day = dayOf(2, 4);
    n.staff = 0;
    stepRiver(w, MONTH);
    expect(w.flood.forecast).toBe(null);
    n.staff = 2; n.paused = true;
    stepRiver(w, 3);
    expect(w.flood.forecast).toBe(null);
    n.paused = false;
    const events = [];
    stepRiver(w, 1, events);
    expect([w.flood.forecast !== null, events.length]).toEqual([true, 1]);
    const w2 = riverWorld();
    w2.day = dayOf(2, 6);
    stepRiver(w2, MONTH * 2);
    expect([w2.flood.forecast === w2.flood.level, w2.flood.risen]).toEqual([true, true]);    // without one, the level is known when the water rises
  });
});

describe('s46 river flood: the harvest (ruling 334, 360)', () => {
  const monthOutput = (w, farm) => { const g = Object.values(w.buildings).find((b) => b.type === 'granary'); const was = g.store.grain || 0; for (let i = 0; i < MONTH; i++) produceDay(w); return (g.store.grain || 0) - was; };
  it('multiplies a floodplain farm\'s harvest by the level and leaves a farm off the floodplain alone', () => {
    for (const l of FLOOD_LEVELS) {
      const { w, on, off } = farmsWorld({ month: 8 });
      w.flood.applied = l.id;
      expect([onFloodplain(w, on), onFloodplain(w, off)]).toEqual([true, false]);
      expect([floodHarvestFactor(w, on), floodHarvestFactor(w, off)]).toEqual([l.harvest, 1]);
      const plain = farmsWorld({ month: 8 });                                                // the same city with no flood yet
      const base = monthOutput(plain.w);
      const got = monthOutput(w);
      const perFarm = 30;                                                                    // a staffed grain farm makes 30 a month
      expect([l.id, got, base, Math.abs(got - (perFarm * l.harvest + perFarm)) <= 1]).toEqual([l.id, got, base, true]);
      expect(Math.abs(base - perFarm * 2) <= 1).toBe(true);
    }
  });
  it('is 1 before the first flood and for every farm type is the same rule (grain, figs, barley, flax)', () => {
    const { w, on } = farmsWorld();
    expect(floodHarvestFactor(w, on)).toBe(1);
    w.flood.applied = 'low';
    for (const type of ['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax']) {
      const f = addFarm(w, 22, 14 + (['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax'].indexOf(type)) * 3, type);
      expect([type, floodHarvestFactor(w, f)]).toEqual([type, 0.6]);
    }
    expect(floodHarvestFactor(w, addRaw(w, 'potter', 30, 12))).toBe(1);                       // not a farm
  });
  it('counts a farm as on the floodplain when at least half its footprint is', () => {
    const w = riverWorld();
    const edge = addRaw(w, 'farm_grain', 24, 20);                                           // x 24 on the plain, x 25 off: half
    const out = addRaw(w, 'farm_grain', 25, 24);                                            // both columns off
    expect([onFloodplain(w, edge), onFloodplain(w, out)]).toEqual([true, false]);
  });
  it('keeps the level through the growing and harvest seasons and puts the next flood\'s in at its rise', () => {
    const { w, on } = farmsWorld({ month: 5, year: 2 });
    stepRiver(w, MONTH * 2 + 1);                                                             // the rise
    const first = w.flood.applied;
    expect(floodHarvestFactor(w, on)).toBe(floodLevelRow(first).harvest);
    stepRiver(w, MONTH * 8);                                                                 // months 9, 10, 11, 12, 1, 2, 3, 4
    expect(floodHarvestFactor(w, on)).toBe(floodLevelRow(first).harvest);
    stepRiver(w, MONTH * 4 + 1);                                                             // month 7 of year 3 has begun: its level, drawn from the seed
    expect(floodHarvestFactor(w, on)).toBe(floodLevelRow(levelOfYear(w, 3)).harvest);
  });
  it('words the farm\'s forecast from the sim: the outlook is the same farms at this level and at a plain year\'s', () => {
    const { w } = farmsWorld({ month: 8 });
    w.flood.applied = 'high';
    const o = floodOutlook(w);
    expect([o.farms, o.plain, o.now]).toEqual([1, 30, 38]);                                  // 30 x 1.25 = 37.5, rounded
    const coming = floodOutlook(w, floodLevelRow('low'));
    expect([coming.now, coming.plain]).toEqual([18, 30]);
  });
});

describe('s46 river flood: the water\'s spread (ruling 362)', () => {
  it('rises over month 7, stands through month 9 and drains over month 10', () => {
    const w = riverWorld();
    w.flood = { year: 2, level: 'good', forecast: 'good', ...seasonDays(2), applied: 'good', risen: true };
    const { from, to } = w.flood;
    expect([waterAt(w, from - 1), waterAt(w, from), waterAt(w, from + MONTH / 2), waterAt(w, from + MONTH), waterAt(w, from + MONTH * 2)]).toEqual([0, 0, 0.5, 1, 1]);
    expect([waterAt(w, to + 1), waterAt(w, to + 1 + MONTH / 2), waterAt(w, to + 1 + MONTH), waterAt(w, to + 1 + MONTH * 2)]).toEqual([1, 0.5, 0, 0]);
    w.flood.risen = false;
    expect(waterAt(w, from + MONTH)).toBe(0);
  });
  it('is Fair or better for the remarks only in a Town\'s year whose level is not Low (ruling 346)', () => {
    const w = riverWorld();
    w.day = dayOf(2, 3);
    ensureYear(w);
    w.flood.level = 'low';
    expect(floodFairOrBetter(w)).toBe(false);
    w.flood.level = 'fair';
    expect(floodFairOrBetter(w)).toBe(true);
    w.milestone = 'village';
    expect(floodFairOrBetter(w)).toBe(false);
  });
});

describe('s46 river flood: the priests\' forecast buys it once (the Court\'s Flood omen card)', () => {
  it('reads the year\'s level before the water rises, and refuses a second time', () => {
    const w = riverWorld();
    w.day = dayOf(2, 2);
    const first = buyForecast(w);
    expect([first.ok, first.reason, first.level, w.flood.forecast]).toEqual([true, null, levelOfYear(w, 2), levelOfYear(w, 2)]);
    const second = buyForecast(w);
    expect([second.ok, second.reason]).toEqual([false, 'known']);
    expect(w.flood.forecast).toBe(levelOfYear(w, 2));
  });
  it('refuses with the reason when the city is a village, the water is up, the season is over or a Nilometer works', () => {
    const v = riverWorld({ milestone: 'village' });
    expect(buyForecast(v)).toEqual({ ok: false, reason: 'not_yet', level: null });
    const up = riverWorld();
    up.day = dayOf(2, 8);
    ensureYear(up);
    expect(buyForecast(up).ok).toBe(false);                                                  // no record this year: the season is under way
    const late = riverWorld();
    late.day = dayOf(2, 5);
    stepRiver(late, MONTH * 3);                                                              // the water has risen
    expect(buyForecast(late)).toEqual({ ok: false, reason: 'known', level: late.flood.level });
    const n = riverWorld();
    addRaw(n, 'nilometer', 19, 12).staff = 2;
    n.day = dayOf(2, 2);
    expect(buyForecast(n)).toEqual({ ok: false, reason: 'nilometer', level: null });
  });
  it('can be probed on a copy without changing the city', () => {
    const w = riverWorld();
    w.day = dayOf(2, 2);
    const copy = structuredClone(w);
    expect(buyForecast(copy).ok).toBe(true);
    expect(w.flood.forecast).toBe(null);
  });
});

describe('s46 river flood: the fishing wharf in the flood months (ruling 335)', () => {
  it('lands 20 fish a month, and 30 while the water is up', () => {
    const w = riverWorld();
    const wharf = addRaw(w, 'fishing_wharf', 22, 11);                                       // turned: long side on the river's east bank (x 22, water x 21), the road above it
    wharf.rot = 1; wharf.w = 1; wharf.d = 2;
    wharf.staff = 3;
    const granary = addGranary(w, 24, 11);
    w.day = dayOf(2, 3);
    const month = () => { const was = granary.store.fish || 0; for (let i = 0; i < MONTH; i++) produceDay(w); return (granary.store.fish || 0) - was; };
    expect(fishFactor(w)).toBe(1);
    expect(Math.abs(month() - FISHING.perMonth) <= 1).toBe(true);
    w.flood = { year: 2, level: 'fair', forecast: 'fair', ...seasonDays(2), applied: 'fair', risen: true };
    w.day = dayOf(2, 8);
    expect([isFloodSeason(w), fishFactor(w)]).toEqual([true, FISHING.floodPerMonth / FISHING.perMonth]);
    expect(Math.abs(month() - FISHING.floodPerMonth) <= 1).toBe(true);
    expect(Math.abs(w.tally.fished - (FISHING.perMonth + FISHING.floodPerMonth)) <= 1).toBe(true);
  });
});

describe('s46 river flood: a look at it for the words', () => {
  it('says each phase: off, wait, forecast, rising, high, draining, quiet', () => {
    const w = riverWorld({ milestone: 'village' });
    w.day = dayOf(2, 2);
    expect(floodLook(w).phase).toBe('off');
    w.milestone = 'town';
    stepRiver(w, 1);
    expect([floodLook(w).phase, floodLook(w).monthsTo, appliedLevel(w)]).toEqual(['wait', 5, null]);
    buyForecast(w);
    expect(floodLook(w).phase).toBe('forecast');
    w.day = dayOf(2, 7);
    stepRiver(w, 1);
    expect(floodLook(w).phase).toBe('rising');
    w.day = dayOf(2, 8) + 3;
    expect(floodLook(w).phase).toBe('high');
    w.day = dayOf(2, 10) + 3;
    expect(floodLook(w).phase).toBe('draining');
    w.day = dayOf(2, 11) + 3;
    const quiet = floodLook(w);
    expect([quiet.phase, quiet.monthsTo, quiet.factor]).toEqual(['quiet', 8, floodLevelRow(w.flood.level).harvest]);
  });
});
