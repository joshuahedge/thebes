import { describe, it, expect } from '../../harness.js';
import { monumentDay, monumentMonth } from '../../../src/sim/monuments.js';
import { workGoldPerUnit, extraGoldOf } from '../../../src/sim/costs.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { canPlace } from '../../../src/sim/commands.js';
import { monthlyEconomy } from '../../../src/sim/economy.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Capital with a road along y = 10 in the 32x32 test world (fertile land is x < 8; addRaw places anywhere).
function city(gold = 100000, difficulty = 'normal') {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  w.difficulty = difficulty;
  return w;
}
const guild = (w, x, extra = {}) => addRaw(w, 'builders_guild', x, 11, { staff: 16, ...extra });
const near = (a, b) => Math.abs(a - b) < 1e-6;
function run(w, days, events = null) {
  for (let i = 0; i < days; i++) { monumentDay(w, events); w.day += 1; }
}

describe('s4 sim work gold', () => {
  it('pays the work gold a unit laid, times the difficulty\'s cost, daily in whole gold with the fraction carried: exact over a month', () => {
    for (const [difficulty, cost] of [['normal', 1], ['hard', 1.25], ['relaxed', 0.8]]) {
      const w = city(1000, difficulty);
      guild(w, 16);
      const s = addRaw(w, 'obelisk_large', 20, 9);
      s.site.stock.stone = 80;
      const rate = MONUMENT.goldPerUnit * cost, day = (2 / 3) * rate, month = 20 * rate;   // 6.4 a unit (Track F): 128, 160 and 102.4 a crew-month
      expect(workGoldPerUnit(w)).toBe(rate);
      run(w, 1);
      expect([w.gold, near(s.site.carry, day % 1)]).toEqual([1000 - Math.floor(day), true]);
      run(w, 29);                                                                 // a month: 20 units
      expect([w.gold, s.site.month.gold, near(s.site.carry, month % 1), near(s.site.laid.stone, 20)]).toEqual([1000 - Math.floor(month), Math.floor(month), true, true]);
      w.stats.lastMonth = { taxes: 0, wages: 0, upkeep: 0, soldiers: 0, net: 0, monuments: 0 };
      monumentMonth(w);
      expect([w.stats.lastMonth.monuments, s.site.last]).toEqual([Math.floor(month), { units: 20, gold: Math.floor(month), crews: 1 }]);
    }
  });

  it('pays crews in the order their sites were founded, and a crew whose day would take the treasury below 0 does not work', () => {
    const day = (2 / 3) * MONUMENT.goldPerUnit;                                  // a full crew's day: 4 1/4 gold at 6.4 a unit
    const w = city(Math.floor(day) + 1);
    guild(w, 16); guild(w, 22);
    const older = addRaw(w, 'obelisk_small', 20, 9), newer = addRaw(w, 'obelisk_small', 24, 9);
    older.site.stock.stone = 20; newer.site.stock.stone = 20;
    run(w, 1);                                                                    // the older site's crew is paid its 4; 1 left
    expect([w.gold, near(older.site.laid.stone, 2 / 3), newer.site.laid.stone, newer.site.reason, newer.site.idle]).toEqual([1, true, 0, 'no_gold', 1]);
    run(w, 1);                                                                    // the older crew now owes 4 (with its third)
    expect([w.gold, older.site.reason, newer.site.reason, near(older.site.carry, day % 1)]).toEqual([1, 'no_gold', 'no_gold', true]);
    w.gold = 0;                                                                   // at 0 neither crew's 4 can be paid
    run(w, 1);
    expect([w.gold, older.site.idle, newer.site.idle]).toEqual([0, 2, 3]);
    w.gold = -50;                                                                 // debt from elsewhere: no crew works
    run(w, 1);
    expect([w.gold, older.site.reason]).toEqual([-50, 'no_gold']);
  });

  it('never founds a monument below 0', () => {
    const w = city(599);
    expect(canPlace(w, 'colossus', 20, 8).reason).toBe('no_gold');
    w.gold = 600;
    expect(canPlace(w, 'colossus', 20, 8).ok).toBe(true);
  });
});

describe('s4 sim the gilding and the capstone', () => {
  it('pays the large obelisk\'s gilding as its last course begins, and that course waits until it keeps the treasury at 0 or above', () => {
    const w = city(500);
    guild(w, 16);
    const s = addRaw(w, 'obelisk_large', 20, 9);
    Object.assign(s.site, { course: 2, laid: { stone: 89.9, bricks: 0 }, stock: { stone: 50, bricks: 0 } });
    expect(extraGoldOf(w, 'obelisk_large')).toBe(1000);
    run(w, 1);                                                                    // the crew finishes the third course, then stops
    expect([s.site.course, s.site.laid.stone, s.site.extraPaid, s.site.reason, w.gold]).toEqual([3, 0, false, null, 500]);
    run(w, 1);
    expect([s.site.reason, s.site.idle, s.site.laid.stone, w.gold]).toEqual(['waiting_gilding', 1, 0, 500]);
    w.gold = 1005;
    run(w, 1);                                                                    // 1,000, then the crew's 4 (a carried fraction + 4 1/4)
    expect([s.site.extraPaid, w.gold, s.site.reason, near(s.site.laid.stone, 2 / 3), s.site.month.gold]).toEqual([true, 1, null, true, 1004]);
    w.gold = 1000;
    run(w, 1);
    expect(w.gold).toBe(995);                                                     // paid once: now only the crew's 5 (the carried fractions add up to a whole)
  });

  it('pays the great pyramid\'s capstone the same way, scaled by the difficulty, and names no gold first when crews cannot be paid', () => {
    const w = city(0, 'hard');
    guild(w, 16);
    const s = addRaw(w, 'pyramid_great', 12, 3);                                   // 7x7: rows 3-9, on the road at y = 10
    Object.assign(s.site, { course: 11, stock: { stone: 100, bricks: 20 } });
    expect(extraGoldOf(w, 'pyramid_great')).toBe(6250);
    run(w, 1);
    expect(s.site.reason).toBe('no_gold');                                        // nothing to pay the crew with comes first
    w.gold = 6000;
    run(w, 1);
    expect([s.site.reason, w.gold, s.site.extraPaid]).toEqual(['waiting_capstone', 6000, false]);
    w.gold = 6300;
    run(w, 1);
    expect([s.site.extraPaid, s.site.reason, w.gold]).toEqual([true, null, 6300 - 6250 - 5]);   // 2/3 x 8 = 5.33: 5 now
  });
});

describe('s4 sim monument gold in the books', () => {
  it('puts the month\'s work and gilding gold in last month\'s monuments, outside net', () => {
    const w = city(5000);
    guild(w, 16);
    const s = addRaw(w, 'obelisk_large', 20, 9);
    Object.assign(s.site, { course: 3, stock: { stone: 90, bricks: 0 } });
    run(w, 30);
    monthlyEconomy(w);
    monumentMonth(w);
    expect([w.stats.lastMonth.monuments, w.stats.lastMonth.net]).toEqual([1128, -74]);   // 1,000 gilding and 20 units at 6.4; net: the guild's 64 wages and 10 upkeep
    expect(w.gold).toBe(5000 - 1128 - 74);
  });
});
