import { describe, it, expect } from '../harness.js';
import { runMonth } from '../../src/sim/clock.js';
import { goodsMonthStart, homeGoodsHeld, recordGoodsMonth } from '../../src/sim/goodsMonth.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

describe('sim goods month', () => {
  it("records each good made and used in the month, and the month's trade income", () => {
    const w = makeTestWorld();
    w.stats.lastMonth = { taxes: 0, wages: 0, upkeep: 0, net: 0, madeTotal: { pottery: 10, clay: 50 } };
    w.tally.made = { pottery: 40, clay: 90, grain: 30 };
    w.tally.tradeIncome = 500;
    const start = goodsMonthStart(w);
    expect(start).toEqual({ made: { pottery: 10, clay: 50 }, tradeIncome: 500 });
    w.tally.tradeIncome = 740;
    recordGoodsMonth(w, start, { grain: 20, figs: 0, pottery: 9, beer: 0, linen: 0, jewellery: 0 }, { grain: 14, figs: 0, pottery: 9, beer: 0, linen: 0, jewellery: 0 });
    const m = w.stats.lastMonth;
    expect(m.made).toEqual({ pottery: 30, clay: 40, grain: 30 });
    expect(m.used).toEqual({ grain: 6, clay: 30 });                   // homes ate 6 grain; potters turned 30 clay into their 30 pots
    expect(m.madeTotal).toEqual({ pottery: 40, clay: 90, grain: 30 });
    expect(m.tradeIncome).toBe(240);
    expect(m.taxes).toBe(0);                                          // the money record is kept
  });
  it('counts what homes and bazaars hold, and the monthly run records the month through the housing check', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 3, residents: 12, stock: { grain: 3, pottery: 1 } });
    addRaw(w, 'bazaar', 9, 11, { store: { grain: 40 } });
    staffAll(w);
    expect(homeGoodsHeld(w)).toEqual({ grain: 43, figs: 0, pottery: 1, beer: 0, linen: 0, jewellery: 0 });
    runMonth(w);
    const m = w.stats.lastMonth;
    expect(m.used.grain).toBe(3);                                     // 12 residents eat 3 grain a month
    expect(home.stock.grain).toBe(3);                                 // and the bazaar topped them up for the next
    expect(Object.keys(m.made)).toEqual([]);
    expect(m.tradeIncome).toBe(0);
    runMonth(w);
    expect(w.stats.lastMonth.used.grain).toBe(3);
  });
});
