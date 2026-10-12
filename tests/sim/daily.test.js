import { describe, it, expect } from '../harness.js';
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER } from '../../src/data/daily.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { MILESTONES } from '../../src/data/progression.js';
import {
  dailyAvailable, dailyMeasure, hashKey, dailyOrder, pickDaily, startDaily, dailyProgress, checkDaily, swapDaily,
} from '../../src/sim/daily.js';
import { settle } from '../../src/sim/settle.js';
import { advanceDays } from '../../src/sim/clock.js';
import { removeBuilding } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const DAY = '2026-10-11';
const def = (id) => DAILY_POOL.find((d) => d.id === id);

// A city past the opening chain (so daily goals are open) with the guide already finished.
function readyCity(seed = 1) {
  const w = makeTestWorld();
  w.seed = seed;
  w.goals.completed.push('road', 'plots', 'well', 'food', 'temple');
  w.guide = { on: false, done: true };
  return w;
}

// Today's goals set by hand, with their snapshots taken now.
function dayWith(w, picks) {
  const base = {};
  for (const id of picks) base[id] = dailyMeasure(w, def(id));
  w.daily = { date: DAY, picks: picks.slice(), base, done: [], swapped: false };
  return w.daily;
}

describe('sim daily goals', () => {
  it('offers eighteen small goals, three a day, 25 gold each, once the temple goal is done', () => {
    expect(DAILY_COUNT).toBe(3);
    expect(DAILY_REWARD).toBe(25);
    expect(DAILY_AFTER).toBe('temple');
    expect(DAILY_POOL.map((d) => d.id)).toEqual([
      'plots4', 'roads10', 'upgrades3', 'well1', 'bazaar1', 'temple1', 'farm1', 'people20', 'profit1', 'harvest100',
      'pottery30', 'gardens3', 'sell20', 'statue1', 'booth1', 'firehouse1', 'wall10', 'tower1',
      'course1', 'quarry1', 'stone100',                                   // Stage 4 (tests/stage4/score)
    ]);
    const tallyKeys = Object.keys(makeTestWorld().tally);
    for (const d of DAILY_POOL) {
      expect(['homes', 'roads', 'buildings', 'people', 'tally', 'made']).toContain(d.measure.kind);
      if (d.measure.kind === 'buildings') expect(Object.keys(BUILDINGS)).toContain(d.measure.type);
      if (d.measure.kind === 'tally') expect(tallyKeys).toContain(d.measure.key);
      expect(d.n).toBeGreaterThan(0);
    }
    expect(def('upgrades3')).toEqual({ id: 'upgrades3', measure: { kind: 'tally', key: 'upgrades' }, n: 3 });
  });
  it('opens only once the temple goal is complete', () => {
    const w = makeTestWorld();
    expect(dailyAvailable(w)).toBe(false);
    w.goals.completed.push('road', 'plots', 'well', 'food');
    expect(dailyAvailable(w)).toBe(false);
    expect(startDaily(w, DAY)).toBe(false);
    expect(w.daily).toBe(null);
    w.goals.completed.push('temple');
    expect(dailyAvailable(w)).toBe(true);
    expect(startDaily(w, DAY)).toBe(true);
    expect(w.daily.date).toBe(DAY);
  });
  it('measures plots, laid road, buildings, people and tallies', () => {
    const w = makeTestWorld();
    w.startRoad = [[0, 10]];
    setRoad(w, 0, 10, 9, 10);                                                // 10 tiles, one of them start road
    addRaw(w, 'house', 1, 11, { tier: 1, residents: 5 });
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 2 });
    addRaw(w, 'house', 3, 11);
    addRaw(w, 'well', 1, 9);
    addRaw(w, 'well', 2, 9);
    Object.assign(w.tally, { upgrades: 4, profitMonths: 2, harvested: 150 });
    const m = (id) => dailyMeasure(w, def(id));
    expect(m('plots4')).toBe(3);
    expect(m('roads10')).toBe(9);
    expect(m('well1')).toBe(2);
    expect(m('temple1')).toBe(0);
    expect(m('people20')).toBe(7);
    expect(m('upgrades3')).toBe(4);
    expect(m('profit1')).toBe(2);
    expect(m('harvest100')).toBe(150);
  });
  it('draws the same three for the same date and city, and others for another date or seed', () => {
    expect(hashKey('')).toBe(0x811c9dc5);                                    // FNV-1a test vectors
    expect(hashKey('a')).toBe(0xe40c292c);
    expect(hashKey('foobar')).toBe(0xbf9cf968);
    const a = readyCity(1);
    const b = readyCity(1);
    expect(pickDaily(a, DAY)).toEqual(['plots4', 'well1', 'temple1']);
    expect(pickDaily(b, DAY)).toEqual(pickDaily(a, DAY));
    expect(pickDaily(a, '2026-10-12')).toEqual(['temple1', 'roads10', 'plots4']);
    expect(pickDaily(readyCity(2), DAY)).toEqual(['people20', 'bazaar1', 'plots4']);
    const order = dailyOrder(a, DAY);
    expect(order.slice(0, DAILY_COUNT)).toEqual(pickDaily(a, DAY));
    expect(order.slice().sort()).toEqual(DAILY_POOL.slice(0, 10).map((d) => d.id).sort());   // the ten a village can do: Stage 2's wait for Town
    addRaw(a, 'house', 3, 3, { tier: 1, residents: 5 });                     // the city's state does not move the draw
    a.tally.harvested = 99;
    const before = JSON.stringify(a);
    expect(pickDaily(a, DAY)).toEqual(['plots4', 'well1', 'temple1']);
    expect(JSON.stringify(a)).toBe(before);                                  // and drawing changes nothing
  });
  it('only draws goals whose building is unlocked', () => {
    const village = MILESTONES[0];
    const saved = village.unlocks;
    village.unlocks = saved.filter((t) => t !== 'temple' && t !== 'bazaar');
    try {
      const w = readyCity();
      const order = dailyOrder(w, DAY);
      expect(order.length).toBe(8);
      expect(order.includes('temple1') || order.includes('bazaar1')).toBe(false);
      for (let d = 10; d <= 28; d++) {
        const picks = pickDaily(w, `2026-10-${d}`);
        expect(picks.length).toBe(3);
        expect(picks.includes('temple1') || picks.includes('bazaar1')).toBe(false);
      }
    } finally {
      village.unlocks = saved;
    }
    expect(dailyOrder(readyCity(), DAY).length).toBe(10);
  });
  it('draws once per date with a snapshot of each measure, and redraws on a new date', () => {
    const w = readyCity();
    setRoad(w, 0, 10, 4, 10);                                                // 5 road tiles
    addRaw(w, 'house', 1, 11, { tier: 1, residents: 5 });
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 3 });
    addRaw(w, 'well', 3, 9);
    Object.assign(w.tally, { upgrades: 7, harvested: 40, profitMonths: 2 });
    expect(startDaily(w, DAY)).toBe(true);
    expect(w.daily).toEqual({ date: DAY, picks: ['plots4', 'well1', 'temple1'], base: { plots4: 2, well1: 1, temple1: 0 }, done: [], swapped: false });
    const drawn = w.daily;
    expect(startDaily(w, DAY)).toBe(false);                                  // safe to call on every check
    expect(w.daily).toBe(drawn);
    w.daily.done.push('plots4');
    w.daily.swapped = true;
    expect(startDaily(w, '2026-10-12')).toBe(true);                          // yesterday's goals give way
    expect(w.daily).toEqual({ date: '2026-10-12', picks: ['temple1', 'roads10', 'plots4'], base: { temple1: 0, roads10: 5, plots4: 2 }, done: [], swapped: false });
    expect(startDaily(w, '')).toBe(false);
    expect(startDaily(w, null)).toBe(false);
    expect(w.daily.date).toBe('2026-10-12');
  });
  it('counts progress from the snapshot, clamped to 0..n', () => {
    const w = readyCity();
    const first = addRaw(w, 'house', 0, 11, { tier: 1, residents: 5 });   // 5 people before the day starts
    dayWith(w, ['plots4', 'roads10', 'people20']);
    expect(dailyProgress(w, 'plots4')).toEqual({ n: 0, of: 4 });
    addRaw(w, 'house', 1, 11);
    addRaw(w, 'house', 2, 11);
    expect(dailyProgress(w, 'plots4')).toEqual({ n: 2, of: 4 });
    setRoad(w, 0, 10, 11, 10);                                               // 12 tiles
    expect(dailyProgress(w, 'roads10')).toEqual({ n: 10, of: 10 });
    first.residents = 0;                                                     // fewer people than at the snapshot
    expect(dailyProgress(w, 'people20')).toEqual({ n: 0, of: 20 });
    first.residents = 5;
    addRaw(w, 'house', 3, 11, { tier: 1, residents: 5 });
    expect(dailyProgress(w, 'people20')).toEqual({ n: 5, of: 20 });
    expect(dailyProgress(w, 'well1')).toBe(null);                            // not one of today's
    expect(dailyProgress(w, 'nope')).toBe(null);
    w.daily = null;
    expect(dailyProgress(w, 'plots4')).toBe(null);
  });
  it('pays each finished goal once and counts it for the city', () => {
    const w = readyCity();
    dayWith(w, ['plots4', 'well1', 'profit1']);
    const gold = w.gold;
    const events = [];
    expect(checkDaily(w, events)).toEqual([]);
    const homes = [0, 1, 2, 3].map((x) => addRaw(w, 'house', x, 11));
    addRaw(w, 'well', 5, 9);
    setRoad(w, 5, 10, 5, 10);                                                // a well counts once a road touches it (P11)
    expect(checkDaily(w, events)).toEqual(['plots4', 'well1']);
    expect(events).toEqual([{ type: 'daily', id: 'plots4', reward: 25 }, { type: 'daily', id: 'well1', reward: 25 }]);
    expect(w.gold).toBe(gold + 2 * DAILY_REWARD);
    expect(w.tally.dailyDone).toBe(2);
    expect(w.daily.done).toEqual(['plots4', 'well1']);
    expect(checkDaily(w, events)).toEqual([]);
    expect(w.gold).toBe(gold + 50);
    removeBuilding(w, homes[0].id);                                          // a finished goal stays finished
    expect(dailyProgress(w, 'plots4')).toEqual({ n: 4, of: 4 });
    expect(checkDaily(w, events)).toEqual([]);
    w.tally.profitMonths += 1;
    checkDaily(w);                                                           // no events array: still recorded and paid
    expect(w.daily.done).toEqual(['plots4', 'well1', 'profit1']);
    expect(w.tally.dailyDone).toBe(3);
    expect(w.gold).toBe(gold + 75);
    expect(events.length).toBe(2);
    w.daily = null;
    expect(checkDaily(w, events)).toEqual([]);
  });
  it('is checked by the clock every day and by settle after a command', () => {
    const w = readyCity();
    dayWith(w, ['upgrades3', 'plots4', 'roads10']);
    w.tally.upgrades += 3;
    const gold = w.gold;
    const events = [];
    advanceDays(w, 1, events);
    expect(events.filter((e) => e.type === 'daily')).toEqual([{ type: 'daily', id: 'upgrades3', reward: 25 }]);
    expect(w.gold).toBe(gold + 25);
    const v = readyCity();
    dayWith(v, ['well1', 'plots4', 'roads10']);
    addRaw(v, 'well', 5, 9);
    setRoad(v, 5, 10, 5, 10);
    const settled = [];
    settle(v, settled);
    expect(settled).toEqual([{ type: 'daily', id: 'well1', reward: 25 }]);
    expect(v.day).toBe(0);
  });
  it('swaps one unfinished goal a day for the next in the day\'s order', () => {
    const w = readyCity();
    expect(swapDaily(w, 0)).toEqual({ ok: false, reason: 'no_swap' });      // no day drawn yet
    startDaily(w, DAY);
    expect(w.daily.picks).toEqual(['plots4', 'well1', 'temple1']);
    for (let x = 0; x < 3; x++) addRaw(w, 'house', x, 11, { tier: 1, residents: 4 });   // 12 people by the swap
    expect(swapDaily(w, 1)).toEqual({ ok: true, id: 'people20' });
    expect(w.daily.picks).toEqual(['plots4', 'people20', 'temple1']);
    expect(w.daily.base).toEqual({ plots4: 0, people20: 12, temple1: 0 });  // the new goal counts from the swap
    expect(w.daily.swapped).toBe(true);
    expect(swapDaily(w, 0)).toEqual({ ok: false, reason: 'no_swap' });      // one swap a day
    expect(startDaily(w, '2026-10-12')).toBe(true);
    expect(w.daily.picks).toEqual(['temple1', 'roads10', 'plots4']);
    addRaw(w, 'temple', 20, 20);
    expect(checkDaily(w)).toEqual([]);                                       // no road touches it yet: it counts for nothing (P11)
    setRoad(w, 19, 20, 19, 20);
    expect(checkDaily(w)).toEqual(['temple1']);
    expect(swapDaily(w, 0)).toEqual({ ok: false, reason: 'no_swap' });      // not a finished goal
    for (const bad of [3, -1, 1.5]) expect(swapDaily(w, bad)).toEqual({ ok: false, reason: 'no_swap' });
    expect(swapDaily(w, 2)).toEqual({ ok: true, id: 'people20' });
    expect(w.daily.picks).toEqual(['temple1', 'roads10', 'people20']);
    expect(new Set(w.daily.picks).size).toBe(3);
    expect(w.daily.done).toEqual(['temple1']);
  });
});
