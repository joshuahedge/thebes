import { describe, it, expect } from '../harness.js';
import { updateMood } from '../../src/sim/mood.js';
import { vacancies, monthlyArrivals, arrivalsBatch, departures } from '../../src/sim/immigration.js';
import { population } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('mood', () => {
  it('rises when nobody needs food yet and falls with hunger', () => {
    const w = street();
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 5 });
    expect(updateMood(w)).toBe(80);
    const h = addRaw(w, 'house', 3, 11, { tier: 3, residents: 12, met: { food: false } });
    updateMood(w);
    expect(w.moodBreakdown.food).toBeLessThan(0);
    h.met = { food: true };
    updateMood(w);
    expect(w.moodBreakdown.food).toBe(20);
  });
  it('ignores unemployment before Town and counts it after', () => {
    const w = street();
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 5 });
    w.labour = { workforce: 100, employed: 50, jobs: 50, shortLevels: [] };
    updateMood(w);
    expect(w.moodBreakdown.jobs).toBe(0);
    w.milestone = 'town';
    updateMood(w);
    expect(w.moodBreakdown.jobs).toBe(-35);
  });
  it('drops with debt, capped at 20', () => {
    const w = street();
    w.gold = -250;
    updateMood(w);
    expect(w.moodBreakdown.debt).toBe(-10);
    w.gold = -5000;
    updateMood(w);
    expect(w.moodBreakdown.debt).toBe(-20);
  });
});

describe('immigration', () => {
  it('only offers road-connected homes', () => {
    const w = street();
    addRaw(w, 'house', 2, 11);
    addRaw(w, 'house', 2, 20);
    expect(vacancies(w).length).toBe(1);
    expect(vacancies(w)[0].free).toBe(5);
  });
  it('fills empty plots in batches and turns them into huts', () => {
    const w = street();
    for (let x = 2; x < 8; x++) addRaw(w, 'house', x, 11);
    w.mood = 80;
    expect(monthlyArrivals(w)).toBe(40);
    const n = arrivalsBatch(w);
    expect(n).toBe(14);
    expect(population(w)).toBe(14);
    expect(w.buildings[1].tier).toBe(1);
    expect(w.buildings[1].residents).toBe(5);
  });
  it('stops arrivals when mood is low', () => {
    const w = street();
    addRaw(w, 'house', 2, 11);
    w.mood = 20;
    expect(arrivalsBatch(w)).toBe(0);
  });
  it('sends people away from the lowest tiers when mood is low', () => {
    const w = street();
    const low = addRaw(w, 'house', 2, 11, { tier: 1, residents: 5 });
    const high = addRaw(w, 'house', 3, 11, { tier: 4, residents: 16 });
    for (let x = 4; x < 13; x++) addRaw(w, 'house', x, 11, { tier: 4, residents: 16 }); // population 165, so 4 leave
    w.mood = 10;
    const left = departures(w);
    expect(left).toBe(4);
    expect(low.residents).toBe(4);
    expect(high.residents).toBe(13);
  });
});
