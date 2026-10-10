import { describe, it, expect } from '../harness.js';
import { createWorld, population, removeBuilding, WORLD_VERSION } from '../../src/sim/world.js';
import { produceDay } from '../../src/sim/production.js';
import { monthlyEconomy } from '../../src/sim/economy.js';
import { monthlyHousing } from '../../src/sim/housing.js';
import { tickDay, advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10; a farm on fertile land (x < 8) and a granary beside it, both touching the road.
function farmWorld() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const farm = addRaw(w, 'farm_grain', 2, 8);
  const granary = addRaw(w, 'granary', 5, 8);
  return { w, farm, granary };
}

describe('world v2', () => {
  it('creates a version 2 world with the new fields at their starting values', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(2);
    expect(w.version).toBe(2);
    expect(w.firsts).toEqual([]);
    expect(w.achievements).toEqual([]);
    expect(w.daily).toBe(null);
    expect(w.guide).toEqual({ on: true, done: false });
    expect(w.tally).toEqual({ harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 });
    expect(w.goals).toEqual({ completed: [], triggered: [] });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
  it('counts every unit of food a farm stores, and nothing when the farm is stopped', () => {
    const { w, farm, granary } = farmWorld();
    staffAll(w);
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(granary.store.grain).toBe(10);
    expect(w.tally.harvested).toBe(10);
    farm.staff = 2;                                   // under a quarter of 10 workers: the farm stops
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(farm.blocked).toBe('understaffed');
    expect(w.tally.harvested).toBe(10);
    farm.staff = 5;                                   // half staffed: half a unit a day
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(granary.store.grain).toBe(15);
    expect(w.tally.harvested).toBe(15);
  });
  it('counts the harvest through the daily tick when homes staff the farm', () => {
    const { w, granary } = farmWorld();
    for (let x = 10; x < 20; x++) addRaw(w, 'house', x, 11, { tier: 1, residents: 5 });   // 50 people: 20 workers for 16 jobs
    advanceDays(w, 30);
    expect(granary.store.grain).toBe(30);
    expect(w.tally.harvested).toBe(30);
  });
  it('counts a month in profit and not a month at a loss', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 2, 11, { tier: 2, residents: 8 });
    addRaw(w, 'house', 3, 11, { tier: 4, residents: 16 });
    const temple = addRaw(w, 'temple', 12, 8, { staff: 6 });
    addRaw(w, 'well', 20, 9);
    monthlyEconomy(w);                                // taxes 40, wages 24, upkeep 13: net +3
    expect(w.stats.lastMonth.net).toBe(3);
    expect(w.tally.profitMonths).toBe(1);
    temple.staff = 0;
    addRaw(w, 'granary', 14, 8, { staff: 6 });        // wages 24, upkeep 19 against taxes 40: net -3
    monthlyEconomy(w);
    expect(w.stats.lastMonth.net).toBe(-3);
    expect(w.tally.profitMonths).toBe(1);
  });
  it('counts each upgrade and never a downgrade', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const a = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    const b = addRaw(w, 'house', 14, 11, { tier: 1, residents: 5 });
    const well = addRaw(w, 'well', 13, 9);
    monthlyHousing(w);                                // no events array: still counted
    expect([a.tier, b.tier]).toEqual([2, 2]);
    expect(w.tally.upgrades).toBe(2);
    removeBuilding(w, well.id);
    monthlyHousing(w);
    monthlyHousing(w);                                // two dry months: both drop back to huts
    expect([a.tier, b.tier]).toEqual([1, 1]);
    expect(w.tally.upgrades).toBe(2);
  });
  it('keeps the peak population through the daily tick', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = addRaw(w, 'house', 5, 11);
    advanceDays(w, 9);
    expect(w.tally.peakPeople).toBe(0);
    advanceDays(w, 1);                                // the first arrivals come on day 10
    expect(population(w)).toBe(5);
    expect(w.tally.peakPeople).toBe(5);
    h.residents = 1;
    tickDay(w);
    expect(population(w)).toBe(1);
    expect(w.tally.peakPeople).toBe(5);
  });
});
