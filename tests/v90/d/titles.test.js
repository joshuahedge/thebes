// Version 9.0 Track D (design section 3, rulings 1565, 1566, 1574): the titles. Each title's rule at its bar, either side of it; ties go to the table's order;
// the runner-up; Peaceful never earns the Unconquered; and the month-end counts the share titles read.
import { describe, it, expect } from '../../harness.js';
import { TITLES } from '../../../src/data/dynasty.js';
import { titleOf, titleMeasures, countDynastyMonth } from '../../../src/sim/dynasty.js';
import { createWorld } from '../../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { setTaxRate } from '../../../src/sim/palace.js';
import { monthlyEconomy } from '../../../src/sim/economy.js';

// A city at `milestone` with the tallies given (every other count 0).
function city({ milestone = 'city', difficulty = 'normal', ...tally } = {}) {
  const w = createWorld({ seed: 5 });
  w.milestone = milestone;
  w.difficulty = difficulty;
  Object.assign(w.tally, tally);
  return w;
}

describe('v90 d titles: the data', () => {
  it('has the design\'s five titles in their order, with the first bars (ruling 1566)', () => {
    expect(TITLES).toEqual([
      { id: 'unconquered', bar: 3 },
      { id: 'builder', bar: 2000 },
      { id: 'merchant', bar: 0.40 },
      { id: 'bountiful', bar: 0.90, months: 24 },
      { id: 'generous', bar: 0.50, months: 24, highMax: 0.1 },
    ]);
  });
  it('names a new city the Steady, with no runner-up', () => {
    const t = titleOf(createWorld({ seed: 2 }));
    expect([t.id, t.fit, t.measure, t.runnerUp]).toEqual(['steady', 0, 0, null]);
    expect(t.rows.map((r) => r.id)).toEqual(['unconquered', 'builder', 'merchant', 'bountiful', 'generous']);
  });
});

describe('v90 d titles: each rule at its bar and either side', () => {
  it('the Unconquered: 3 raids beaten, none lost and no tribute paid', () => {
    expect(titleOf(city({ raidsBeaten: 2 })).id).toBe('steady');
    expect(titleOf(city({ raidsBeaten: 3 })).id).toBe('unconquered');
    expect(titleOf(city({ raidsBeaten: 4 })).fit).toBe(4 / 3);
    expect(titleOf(city({ raidsBeaten: 5, raidsLost: 1 })).id).toBe('steady');
    expect(titleOf(city({ raidsBeaten: 5, tributes: 1 })).id).toBe('steady');
  });
  it('never the Unconquered on Peaceful (no raids), whatever the counts say', () => {
    const w = city({ raidsBeaten: 9, difficulty: 'peaceful' });
    const row = titleMeasures(w).find((r) => r.id === 'unconquered');
    expect([titleOf(w).id, row.ok, row.raids, row.fit]).toEqual(['steady', false, false, 0]);
  });
  it('the Builder: 2,000 monument units, stone and bricks together', () => {
    expect(titleOf(city({ stoneLaid: 1000, bricksLaid: 999 })).id).toBe('steady');
    expect(titleOf(city({ stoneLaid: 1000, bricksLaid: 1000 })).id).toBe('builder');
    expect(titleOf(city({ stoneLaid: 3000 })).measure).toBe(3000);
  });
  it('the Merchant: trade income over the bills, 0.40', () => {
    expect(titleOf(city({ tradeGold: 399, billsPaid: 1000 })).id).toBe('steady');
    expect(titleOf(city({ tradeGold: 400, billsPaid: 1000 })).id).toBe('merchant');
    expect(titleOf(city({ tradeGold: 500, billsPaid: 0 })).id).toBe('steady');   // no bills counted: nothing to measure against
  });
  it('the Bountiful: fed at 0.90 of month ends from Town, from the 24th of them', () => {
    expect(titleOf(city({ fedMonths: 23, townMonths: 23 })).id).toBe('steady');   // all fed, but too few counted
    expect(titleOf(city({ fedMonths: 27, townMonths: 30 })).id).toBe('bountiful');
    expect(titleOf(city({ fedMonths: 26, townMonths: 30 })).id).toBe('steady');   // 0.867
  });
  it('the Generous: Low at 0.50 of month ends from Town, from the 24th, with High at most a tenth', () => {
    expect(titleOf(city({ lowMonths: 12, townMonths: 24 })).id).toBe('generous');
    expect(titleOf(city({ lowMonths: 11, townMonths: 24 })).id).toBe('steady');
    expect(titleOf(city({ lowMonths: 20, townMonths: 20 })).id).toBe('steady');                 // too few counted
    expect(titleOf(city({ lowMonths: 15, highMonths: 3, townMonths: 30 })).id).toBe('generous');   // 3 of 30: a tenth
    expect(titleOf(city({ lowMonths: 15, highMonths: 4, townMonths: 30 })).id).toBe('steady');
  });
  it('reads only the Low month ends counted from Town, never 8.4\'s count from the first month (ruling 1584)', () => {
    const row = titleMeasures(city({ taxLowMonths: 80, townMonths: 24 })).find((r) => r.id === 'generous');
    expect([row.low, row.measure, row.fit]).toEqual([0, 0, 0]);
    // A city at Low before Town (the palace's rate set early), then Normal from Town: Low counted for 8.4's tally only.
    const w = makeTestWorld({ size: 32, gold: 50000 });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 10, 11, { tier: 3, residents: 10 });
    const p = addRaw(w, 'palace', 14, 11, { style: 0, works: null });
    setTaxRate(w, p.id, 'low');
    w.milestone = 'village';
    for (let k = 0; k < 6; k++) { monthlyEconomy(w); countDynastyMonth(w); }
    setTaxRate(w, p.id, 'normal');
    w.milestone = 'town';
    for (let k = 0; k < 24; k++) { monthlyEconomy(w); countDynastyMonth(w); }
    expect([w.tally.taxLowMonths, w.tally.lowMonths, w.tally.highMonths, w.tally.townMonths, titleOf(w).id]).toEqual([6, 0, 0, 24, 'steady']);
    setTaxRate(w, p.id, 'high');
    monthlyEconomy(w); countDynastyMonth(w);
    setTaxRate(w, p.id, 'low');
    for (let k = 0; k < 25; k++) { monthlyEconomy(w); countDynastyMonth(w); }
    expect([w.tally.lowMonths, w.tally.highMonths, w.tally.townMonths, titleOf(w).id]).toEqual([25, 1, 50, 'generous']);   // 25 of 50 at Low, 1 at High
  });
});

describe('v90 d titles: the highest fit, ties and the runner-up', () => {
  it('takes the highest fit among the titles met', () => {
    const t = titleOf(city({ raidsBeaten: 3, stoneLaid: 3000 }));   // 1 and 1.5
    expect([t.id, t.fit, t.runnerUp]).toEqual(['builder', 1.5, 'unconquered']);
  });
  it('breaks a tie by the table\'s order', () => {
    expect(titleOf(city({ raidsBeaten: 3, stoneLaid: 2000 })).id).toBe('unconquered');
    expect(titleOf(city({ stoneLaid: 2000, tradeGold: 400, billsPaid: 1000 })).id).toBe('builder');
    expect(titleOf(city({ tradeGold: 450, billsPaid: 1000, fedMonths: 24, townMonths: 24, lowMonths: 12 })).id).toBe('merchant');   // 1.125 beats 1.111 and 1
  });
  it('names the closest title as the runner-up even when none is met, and leaves out one that may not be earned', () => {
    const t = titleOf(city({ stoneLaid: 1500, tradeGold: 100, billsPaid: 1000 }));
    expect([t.id, t.runnerUp]).toEqual(['steady', 'builder']);   // 0.75 beats 0.25
    expect(titleOf(city({ raidsBeaten: 2, raidsLost: 1 })).runnerUp).toBe(null);
  });
});

describe('v90 d titles: the month-end counts', () => {
  it('counts nothing below Town, Town months and fed months from Town, and trade and the bills from Market town', () => {
    const w = makeTestWorld({ size: 32 });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 10, 11, { tier: 3, residents: 10, met: { food: true, water: true } });
    w.stats.lastMonth = { taxes: 20, wages: 30, upkeep: 12, soldiers: 8, net: -30, tradeIncome: 50 };
    w.milestone = 'village';
    countDynastyMonth(w);
    expect([w.tally.townMonths, w.tally.fedMonths, w.tally.tradeGold, w.tally.billsPaid]).toEqual([0, 0, 0, 0]);
    w.milestone = 'town';
    countDynastyMonth(w);
    expect([w.tally.townMonths, w.tally.fedMonths, w.tally.tradeGold, w.tally.billsPaid]).toEqual([1, 1, 0, 0]);
    w.milestone = 'market_town';
    Object.values(w.buildings)[0].met.food = false;   // a home went hungry this month
    countDynastyMonth(w);
    expect([w.tally.townMonths, w.tally.fedMonths, w.tally.tradeGold, w.tally.billsPaid]).toEqual([2, 1, 50, 50]);
  });
});
