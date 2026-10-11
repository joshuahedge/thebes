import { describe, it, expect } from '../harness.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { firstMet, checkFirsts } from '../../src/sim/firsts.js';
import { settle } from '../../src/sim/settle.js';
import { advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const first = (id) => FIRSTS.find((f) => f.id === id);

// Road along y = 10 (32 tiles, none of them start road: makeTestWorld's start road is empty).
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('sim firsts', () => {
  it('lists the Stage 1 firsts in order, each paying 10 gold', () => {
    expect(FIRST_REWARD).toBe(10);
    expect(FIRSTS.map((f) => f.id)).toEqual([
      'first_family', 'first_full_home', 'first_harvest', 'first_shack', 'first_cottage', 'first_house', 'first_profit', 'people_100',
    ]);
    expect(first('first_full_home').check).toEqual({ kind: 'fullHome' });
    expect(first('first_harvest').check).toEqual({ kind: 'tally', key: 'harvested', n: 1 });
    expect(first('first_cottage').check).toEqual({ kind: 'tier', tier: 3 });
    expect(first('people_100').check).toEqual({ kind: 'people', n: 100 });
  });
  it('places people and full homes at the first home that shows them', () => {
    const w = street();
    expect(firstMet(w, first('first_family'))).toBe(null);
    addRaw(w, 'house', 12, 11);                                              // an empty plot is no family
    expect(firstMet(w, first('first_family'))).toBe(null);
    addRaw(w, 'house', 13, 11, { tier: 1, residents: 3 });
    addRaw(w, 'house', 14, 11, { tier: 1, residents: 5 });                  // a hut holds 5
    expect(firstMet(w, first('first_family'))).toEqual({ x: 13.5, y: 11.5 });
    expect(firstMet(w, first('first_full_home'))).toEqual({ x: 14.5, y: 11.5 });
    expect(firstMet(w, first('people_100'))).toBe(null);
    for (let x = 0; x < 23; x++) addRaw(w, 'house', x, 12, { tier: 1, residents: 4 });   // 8 + 92 = 100 people
    expect(firstMet(w, first('people_100'))).toEqual({ x: 13.5, y: 11.5 });
  });
  it('places a tier at the first home at exactly that tier, else the first above it', () => {
    const w = street();
    addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    addRaw(w, 'house', 13, 11, { tier: 2, residents: 8 });
    expect(firstMet(w, first('first_shack'))).toEqual({ x: 13.5, y: 11.5 });   // the shack, not the cottage
    expect(firstMet(w, first('first_cottage'))).toEqual({ x: 12.5, y: 11.5 });
    expect(firstMet(w, first('first_house'))).toBe(null);
    const v = street();
    addRaw(v, 'house', 5, 11, { tier: 4, residents: 16 });
    expect(firstMet(v, first('first_shack'))).toEqual({ x: 5.5, y: 11.5 });
  });
  it('places the harvest at the first granary holding food, and profit nowhere', () => {
    const w = street();
    expect(firstMet(w, first('first_harvest'))).toBe(null);
    w.tally.harvested = 1;
    expect(firstMet(w, first('first_harvest'))).toEqual({ x: null, y: null });  // the grain has already gone on
    addRaw(w, 'granary', 20, 11);
    addRaw(w, 'granary', 24, 11, { store: { grain: 3 } });
    expect(firstMet(w, first('first_harvest'))).toEqual({ x: 25, y: 12 });
    expect(firstMet(w, first('first_profit'))).toBe(null);
    w.tally.profitMonths = 1;
    expect(firstMet(w, first('first_profit'))).toEqual({ x: null, y: null });
    expect(firstMet(w, { id: 'nope', check: { kind: 'nope' } })).toBe(null);
  });
  it('records each first once, pays 10 gold and reports it with its place', () => {
    const w = street();
    const events = [];
    expect(checkFirsts(w, events)).toEqual([]);
    expect(events).toEqual([]);
    expect(w.firsts).toEqual([]);
    addRaw(w, 'house', 12, 11, { tier: 2, residents: 3 });
    w.tally.profitMonths = 1;
    const gold = w.gold;
    expect(checkFirsts(w, events)).toEqual(['first_family', 'first_shack', 'first_profit']);
    expect(w.gold).toBe(gold + 3 * FIRST_REWARD);
    expect(w.firsts).toEqual(['first_family', 'first_shack', 'first_profit']);
    expect(events).toEqual([
      { type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 11.5 },
      { type: 'first', id: 'first_shack', reward: 10, x: 12.5, y: 11.5 },
      { type: 'first', id: 'first_profit', reward: 10, x: null, y: null },
    ]);
    expect(checkFirsts(w, events)).toEqual([]);                              // once per city
    expect(events.length).toBe(3);
    expect(w.gold).toBe(gold + 30);
    const quiet = street();
    addRaw(quiet, 'house', 12, 11, { tier: 1, residents: 1 });
    const before = quiet.gold;
    checkFirsts(quiet);                                                      // no events array: still recorded and paid
    expect(quiet.firsts).toEqual(['first_family']);
    expect(quiet.gold).toBe(before + 10);
  });
  it('marks what is already true silently when the firsts are null (a migrated city)', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    w.firsts = null;
    const gold = w.gold;
    const events = [];
    expect(checkFirsts(w, events)).toEqual([]);
    expect(w.firsts).toEqual(['first_family', 'first_full_home']);
    expect(events).toEqual([]);
    expect(w.gold).toBe(gold);
    h.tier = 2;                                                              // later firsts celebrate as usual
    expect(checkFirsts(w, events)).toEqual(['first_shack']);
    expect(events).toEqual([{ type: 'first', id: 'first_shack', reward: 10, x: 12.5, y: 11.5 }]);
    expect(w.gold).toBe(gold + 10);
  });
  it('is checked every day by the clock: the first family moves in on day 10', () => {
    const w = street();
    addRaw(w, 'house', 5, 11);
    const events = [];
    advanceDays(w, 9, events);
    expect(events.filter((e) => e.type === 'first')).toEqual([]);
    const gold = w.gold;
    advanceDays(w, 1, events);
    expect(events.filter((e) => e.type === 'first')).toEqual([
      { type: 'first', id: 'first_family', reward: 10, x: 5.5, y: 11.5 },
      { type: 'first', id: 'first_full_home', reward: 10, x: 5.5, y: 11.5 },  // five arrive and a hut holds five
    ]);
    expect(w.gold).toBe(gold + 20);
  });
  it('settles goals, then firsts, then achievements, without a game day', () => {
    const w = street();                                                      // 32 road tiles: the road goal and 'way_in'
    addRaw(w, 'house', 12, 11, { tier: 1, residents: 3 });
    const gold = w.gold;
    const events = [];
    expect(settle(w, events)).toBe(events);
    expect(events).toEqual([
      { type: 'goal', id: 'road', reward: 25 },
      { type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 11.5 },
      { type: 'achievement', id: 'way_in' },
    ]);
    expect(w.gold).toBe(gold + 35);
    expect(w.day).toBe(0);
    expect(settle(w, [])).toEqual([]);                                       // nothing twice
  });
});
