import { describe, it, expect } from '../harness.js';
import { restockBazaars, bazaarsByHouse, topUpHouse, monthlyNeed } from '../../src/sim/distribution.js';
import { monthlyHousing, wantedGoods, needCause } from '../../src/sim/housing.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10. Stores and the bazaar (2x2) sit at y = 8 above it; homes sit at y = 11 below it. The bazaar at
// x = 9 draws on stores up to 16 road tiles away (a 2x2 store at x = 25 is the last in reach) and serves the homes
// on this stretch of road.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const sorted = (list) => list.slice().sort();
const manor = (w, extra = {}) => addRaw(w, 'house', 14, 11, { tier: 6, residents: 100, w: 2, d: 2, ...extra });   // wants two foods next

describe('distribution of many goods', () => {
  it('restocks each good a bazaar sells up to its own stock level, from the stores that hold it', () => {
    const w = street();
    const granary = addRaw(w, 'granary', 2, 8, { store: { grain: 500, figs: 500 } });
    const store = addRaw(w, 'storehouse', 5, 8, { store: { pottery: 150, beer: 30, clay: 40 } });
    const bz = addRaw(w, 'bazaar', 9, 8);
    staffAll(w);
    restockBazaars(w);
    const stock = BUILDINGS.bazaar.stock;
    expect(bz.store.grain).toBe(stock.grain);
    expect(bz.store.figs).toBe(stock.figs);
    expect(bz.store.pottery).toBe(stock.pottery);
    expect(bz.store.beer).toBe(30);
    expect(bz.store.clay).toBe(undefined);                 // a raw good is never sold
    expect(granary.store.grain).toBe(500 - stock.grain);
    expect(granary.store.figs).toBe(500 - stock.figs);
    expect(store.store.pottery).toBe(150 - stock.pottery);
    expect(store.store.beer).toBe(0);
    expect(store.store.clay).toBe(40);
  });
  it('tops a good up to its level, nearest store first, and never from a store out of supply reach', () => {
    const w = street();
    const far = addRaw(w, 'storehouse', 27, 8, { store: { pottery: 100 } });   // 18 road tiles away
    const next = addRaw(w, 'storehouse', 22, 8, { store: { pottery: 100 } });
    const near = addRaw(w, 'storehouse', 2, 8, { store: { pottery: 30 } });
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { pottery: 40 } });
    staffAll(w);
    restockBazaars(w);
    const level = BUILDINGS.bazaar.stock.pottery;
    expect(bz.store.pottery).toBe(level);
    expect(near.store.pottery).toBe(0);
    expect(next.store.pottery).toBe(100 - (level - 40 - 30));
    expect(far.store.pottery).toBe(100);
  });
  it('leaves an idle bazaar empty', () => {
    const w = street();
    addRaw(w, 'storehouse', 5, 8, { store: { pottery: 100 } });
    const bz = addRaw(w, 'bazaar', 9, 8);
    restockBazaars(w);                                     // nobody works there
    expect(bz.store.pottery).toBe(undefined);
  });
  it('wants the foods and every household good of the current or next tier', () => {
    const w = street();
    const at = (tier) => sorted(wantedGoods(addRaw(w, 'house', 2 * tier, 20, { tier, residents: 5 })));
    expect(at(0)).toEqual([]);
    expect(at(1)).toEqual([]);
    expect(at(2)).toEqual(sorted(['grain', 'figs', 'game', 'fish']));   // Stage 4.6: game and fish are foods too
    expect(at(3)).toEqual(sorted(['grain', 'figs', 'game', 'fish']));
    expect(at(4)).toEqual(sorted(['grain', 'figs', 'game', 'fish', 'pottery']));
    expect(at(5)).toEqual(sorted(['grain', 'figs', 'game', 'fish', 'pottery']));
    expect(at(6)).toEqual(sorted(['grain', 'figs', 'game', 'fish', 'pottery', 'beer']));
    expect(at(7)).toEqual(sorted(['grain', 'figs', 'game', 'fish', 'pottery', 'beer', 'linen']));
    expect(at(8)).toEqual(sorted(['grain', 'figs', 'game', 'fish', 'pottery', 'beer', 'linen', 'jewellery']));
    expect(at(9)).toEqual(sorted(['grain', 'figs', 'game', 'fish', 'pottery', 'beer', 'linen', 'jewellery']));
  });
  it('tops a home up to one month of each household good it wants, rounded up, and no more', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 50, pottery: 50, beer: 50 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16 });
    staffAll(w);
    const list = bazaarsByHouse(w).get(h.id);
    topUpHouse(w, h, wantedGoods(h), list);
    expect(monthlyNeed(h, 'pottery')).toBe(1);             // 16 x 0.05 = 0.8, rounded up per home
    expect(h.stock.pottery).toBe(1);
    expect(h.stock.grain).toBe(4);
    expect(h.stock.beer).toBe(undefined);                  // a House does not want beer yet
    topUpHouse(w, h, wantedGoods(h), list);
    expect(h.stock.pottery).toBe(1);
    expect(bz.store.pottery).toBe(49);
  });
  it('fills a home that wants one food from the food its bazaar holds most of, then from the other when it runs short', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 2, figs: 1 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id));
    expect(h.stock.grain).toBe(2);
    expect(h.stock.figs).toBe(1);
    expect(bz.store.grain).toBe(0);
    expect(bz.store.figs).toBe(0);
  });
  it('takes a one-food home\'s food from figs first when its bazaar holds more figs than grain', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 10, figs: 40 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 40 });
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id));
    expect(monthlyNeed(h, 'grain')).toBe(10);
    expect(h.stock.figs).toBe(10);
    expect(h.stock.grain || 0).toBe(0);
    expect(bz.store.figs).toBe(30);
    expect(bz.store.grain).toBe(10);
  });
  it('gives a home that wants two foods half of its need from each', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, figs: 100 } });
    const h = manor(w);
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(monthlyNeed(h, 'grain')).toBe(25);
    expect(h.stock.grain).toBe(13);                        // half of 25, rounded up
    expect(h.stock.figs).toBe(12);                         // the rest of the month's need
  });
  it('fills the gap from whichever food is there when one runs short', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, figs: 5 } });
    const h = manor(w);
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(h.stock.figs).toBe(5);
    expect(h.stock.grain).toBe(20);
    bz.store.figs = 0;
    h.stock = {};
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(h.stock.grain).toBe(25);
    expect(h.stock.figs || 0).toBe(0);
  });
  it('never takes food past a month of need, whatever the mix on hand', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, figs: 100 } });
    const h = manor(w, { stock: { figs: 25 } });
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(h.stock.grain || 0).toBe(0);
    expect(bz.store.grain).toBe(100);
  });
  it('counts two foods only when grain and figs were both in stock before the month\'s eating', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 200, figs: 200 } });
    const h = manor(w, { stock: { grain: 25 } });           // only grain: still fed, but not two foods
    staffAll(w);
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.met.twoFoods).toBe(false);
    expect(h.stock.grain).toBe(13);                        // restocked half and half for next month
    expect(h.stock.figs).toBe(12);
    h.downTimer = 0;                                       // this test is about food: never let the home drop a tier
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.met.twoFoods).toBe(true);
  });
  it('keeps a home that wants two foods fed on grain alone', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 200 } });
    const h = manor(w, { stock: { grain: 25 } });
    staffAll(w);
    monthlyHousing(w);
    h.downTimer = 0;                                       // this test is about food: never let the home drop a tier
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.met.twoFoods).toBe(false);
    expect(h.stock.grain).toBe(25);
  });
  it('feeds a home on figs alone', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { figs: 3 } });
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.stock.figs).toBe(0);
  });
  it('meets a household good when the stock covers the month\'s use at the monthly check, then uses it', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { pottery: 10 } });
    const stocked = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stock: { pottery: 1 } });
    const bare = addRaw(w, 'house', 13, 11, { tier: 4, residents: 16 });
    const cottage = addRaw(w, 'house', 14, 11, { tier: 3, residents: 12 });   // wants no pottery yet
    staffAll(w);
    monthlyHousing(w);
    expect(stocked.met.pottery).toBe(true);
    expect(bare.met.pottery).toBe(false);
    expect(stocked.stock.pottery).toBe(1);                 // used, then topped up for next month
    expect(bare.stock.pottery).toBe(1);
    expect(cottage.stock.pottery).toBe(undefined);
    expect(bz.store.pottery).toBe(8);
  });
  it('judges a household good on the residents it was stocked for, as it does food', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stockedFor: 16, stock: { pottery: 1 } });
    h.residents = 25;                                      // newcomers since the last delivery: they need 2
    monthlyHousing(w);
    expect(h.met.pottery).toBe(true);
    expect(h.stock.pottery).toBe(0);
  });
  it('grows a House with water, food, a temple and a month of pottery into a Townhouse', () => {
    const w = street();
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, pottery: 20 } });
    addRaw(w, 'temple', 15, 8);
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stock: { grain: 4 } });
    staffAll(w);
    monthlyHousing(w);
    expect(h.tier).toBe(4);                                // no pottery on hand at this check
    monthlyHousing(w);
    expect(h.tier).toBe(5);
  });
  it('blames the empty granary for missing food, never a storehouse the bazaar also draws on', () => {
    const w = street();
    const granary = addRaw(w, 'granary', 2, 8);
    addRaw(w, 'storehouse', 5, 8, { store: { pottery: 50 } });   // nearer the bazaar, and holds no food
    addRaw(w, 'bazaar', 9, 8);
    const home = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'granary_empty', id: granary.id });
  });
});
