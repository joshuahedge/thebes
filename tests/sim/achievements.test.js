import { describe, it, expect } from '../harness.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { achievementProgress, checkAchievements, roadsLaid } from '../../src/sim/achievements.js';
import { advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id);
const progress = (w, id) => achievementProgress(w, byId(id));

describe('sim achievements', () => {
  it('lists 24 achievements with unique ids and measures the sim can count', () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
      'way_in', 'neighbours', 'street', 'busy_streets', 'water_bearer', 'breadbasket', 'plenty', 'market_day',
      'faithful', 'shack_row', 'cottage_lane', 'house_proud', 'hamlet', 'town', 'bustling', 'good_harvests',
      'granary_of_the_river', 'steady_books', 'prosperous', 'no_one_hungry', 'water_for_all', 'busy_hands',
      'on_course', 'day_by_day',
    ]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(24);
    const kinds = ['roads', 'homes', 'buildings', 'tier', 'people', 'tally', 'goals', 'fedAll', 'waterAll', 'jobs'];
    const tallyKeys = Object.keys(makeTestWorld().tally);
    for (const a of ACHIEVEMENTS) {
      expect(kinds).toContain(a.measure.kind);
      if (a.measure.kind === 'buildings') expect(Object.keys(BUILDINGS)).toContain(a.measure.type);
      if (a.measure.kind === 'tally') expect(tallyKeys).toContain(a.measure.key);
    }
    expect(byId('cottage_lane').measure).toEqual({ kind: 'tier', tier: 3, n: 20 });
    expect(byId('no_one_hungry').measure).toEqual({ kind: 'fedAll', people: 100 });
    expect(byId('water_for_all').measure).toEqual({ kind: 'waterAll', homes: 30 });
    expect(byId('busy_hands').measure).toEqual({ kind: 'jobs', people: 150, rate: 0.05 });
  });
  it('counts road tiles laid beyond the start road, clamped to the target', () => {
    const w = makeTestWorld();
    w.startRoad = [[0, 10], [1, 10]];
    setRoad(w, 0, 10, 5, 10);
    expect(roadsLaid(w)).toBe(4);
    expect(progress(w, 'way_in')).toEqual({ n: 4, of: 10 });
    setRoad(w, 0, 10, 31, 10);
    expect(roadsLaid(w)).toBe(30);
    expect(progress(w, 'way_in')).toEqual({ n: 10, of: 10 });
  });
  it('counts homes, buildings of a type and homes at a tier or above', () => {
    const w = makeTestWorld();
    [1, 2, 3, 4, 0].forEach((tier, i) => addRaw(w, 'house', 10 + i, 11, { tier }));
    addRaw(w, 'well', 10, 9);
    addRaw(w, 'well', 12, 9);
    expect(progress(w, 'neighbours')).toEqual({ n: 5, of: 10 });            // empty plots are homes too
    expect(progress(w, 'water_bearer')).toEqual({ n: 2, of: 5 });
    expect(progress(w, 'faithful')).toEqual({ n: 0, of: 2 });
    expect(progress(w, 'shack_row')).toEqual({ n: 3, of: 10 });
    expect(progress(w, 'cottage_lane')).toEqual({ n: 2, of: 20 });
    expect(progress(w, 'house_proud')).toEqual({ n: 1, of: 20 });
  });
  it('counts people as the larger of the peak and the live population', () => {
    const w = makeTestWorld();
    for (let x = 0; x < 6; x++) addRaw(w, 'house', 10 + x, 11, { tier: 1, residents: 5 });   // 30 people
    expect(progress(w, 'hamlet')).toEqual({ n: 30, of: 50 });
    w.tally.peakPeople = 45;
    expect(progress(w, 'hamlet')).toEqual({ n: 45, of: 50 });
    w.tally.peakPeople = 400;
    expect(progress(w, 'bustling')).toEqual({ n: 300, of: 300 });
  });
  it('reads the tallies and the goals completed', () => {
    const w = makeTestWorld();
    w.tally.harvested = 120;
    w.tally.profitMonths = 30;
    w.tally.dailyDone = 3;
    expect(progress(w, 'good_harvests')).toEqual({ n: 120, of: 500 });
    expect(progress(w, 'granary_of_the_river')).toEqual({ n: 120, of: 2000 });
    expect(progress(w, 'prosperous')).toEqual({ n: 24, of: 24 });
    expect(progress(w, 'day_by_day')).toEqual({ n: 3, of: 10 });
    expect(progress(w, 'on_course')).toEqual({ n: 0, of: 9 });
    w.goals.completed.push('road', 'plots');
    expect(progress(w, 'on_course')).toEqual({ n: 2, of: 9 });
  });
  it('judges everyone fed: every Cottage or better fed, 100 people, at least one such home', () => {
    const w = makeTestWorld();
    const homes = [];
    for (let x = 0; x < 10; x++) homes.push(addRaw(w, 'house', 10 + x, 11, { tier: 3, residents: 10, met: { food: true } }));
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 1, of: 1 });
    homes[4].met = { food: false };
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 0, of: 1 });
    homes[4].met = { food: true };
    homes[9].residents = 9;                                                  // 99 people
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 0, of: 1 });
    homes[9].residents = 10;
    for (const h of homes) h.tier = 2;                                       // nobody at Cottage yet
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 0, of: 1 });
  });
  it('judges water for all: every lived-in home reached by a working well, 30 homes or more', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const homes = [];
    for (let x = 1; x <= 30; x++) homes.push(addRaw(w, 'house', x, 11, { tier: 1, residents: 2 }));
    for (const x of [4, 13, 22]) addRaw(w, 'well', x, 9);                   // reach 5: x 0-26 covered
    expect(progress(w, 'water_for_all')).toEqual({ n: 0, of: 1 });
    addRaw(w, 'well', 31, 9);                                                // and now 27-30
    expect(progress(w, 'water_for_all')).toEqual({ n: 1, of: 1 });
    homes[0].residents = 0;                                                  // 29 lived-in homes
    expect(progress(w, 'water_for_all')).toEqual({ n: 0, of: 1 });
  });
  it('judges busy hands: 150 people and unemployment at most 5%', () => {
    const w = makeTestWorld();
    const homes = [];
    for (let x = 0; x < 10; x++) homes.push(addRaw(w, 'house', 10 + x, 11, { tier: 4, residents: 15 }));   // 150 people
    w.labour = { workforce: 60, employed: 57, jobs: 60, shortLevels: [] };  // 3 of 60 out of work: exactly 5%
    expect(progress(w, 'busy_hands')).toEqual({ n: 1, of: 1 });
    w.labour.employed = 56;
    expect(progress(w, 'busy_hands')).toEqual({ n: 0, of: 1 });
    w.labour.employed = 57;
    homes[0].residents = 14;
    expect(progress(w, 'busy_hands')).toEqual({ n: 0, of: 1 });
    homes[0].residents = 15;
    w.labour = { workforce: 0, employed: 0, jobs: 0, shortLevels: [] };
    expect(progress(w, 'busy_hands')).toEqual({ n: 0, of: 1 });
  });
  it('records each new achievement once with an event and no gold', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 9, 10);
    for (let x = 0; x < 10; x++) addRaw(w, 'house', x, 11);
    const gold = w.gold;
    const events = [];
    expect(checkAchievements(w, events)).toEqual(['way_in', 'neighbours']);
    expect(events).toEqual([{ type: 'achievement', id: 'way_in' }, { type: 'achievement', id: 'neighbours' }]);
    expect(w.achievements).toEqual(['way_in', 'neighbours']);
    expect(w.gold).toBe(gold);
    expect(checkAchievements(w, events)).toEqual([]);
    expect(events.length).toBe(2);
  });
  it('marks what is already true silently when the achievements are null (a migrated city)', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 9, 10);
    for (let x = 0; x < 10; x++) addRaw(w, 'house', x, 11);
    w.achievements = null;
    const events = [];
    expect(checkAchievements(w, events)).toEqual([]);
    expect(w.achievements).toEqual(['way_in', 'neighbours']);
    expect(events).toEqual([]);
    for (let x = 0; x < 15; x++) addRaw(w, 'house', x, 12);                // 25 homes
    expect(checkAchievements(w, events)).toEqual(['street']);
    expect(events).toEqual([{ type: 'achievement', id: 'street' }]);
  });
  it('is checked at each month end, before the month event', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 9, 10);                                                // ten tiles: 'way_in'
    const events = [];
    advanceDays(w, 29, events);
    expect(events.filter((e) => e.type === 'achievement')).toEqual([]);
    advanceDays(w, 1, events);
    expect(events.filter((e) => e.type === 'achievement')).toEqual([{ type: 'achievement', id: 'way_in' }]);
    const types = events.map((e) => e.type);
    expect(types.indexOf('achievement')).toBeLessThan(types.indexOf('month'));
    expect(w.achievements).toEqual(['way_in']);
  });
});
