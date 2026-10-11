import { describe, it, expect } from '../harness.js';
import { TIERS } from '../../src/data/housing.js';
import { monthlyHousing, houseStatus, needCause, desirabilityTarget, removeResidents } from '../../src/sim/housing.js';
import { mergeSquare, mergeHouses, splitHouse, MERGE_TIER } from '../../src/sim/merge.js';
import { houseDesirability } from '../../src/sim/desirability.js';
import { departures } from '../../src/sim/immigration.js';
import { updateMood } from '../../src/sim/mood.js';
import { buildingAt, housesOf, removeBuilding } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10. The providers sit where they reach homes at x 12-13 along the road but are too far away to
// change their desirability: a well (reach 5, desirability only when touching), a booth (reach 8, desirability
// out to 3 tiles) and a temple (reach 10, out to 6 tiles). So in these streets only gardens, statues and homes
// make a home pleasant. Empty plots add nothing (spec 4.7 lists homes from the Hut up).
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'well', 16, 9);
  addRaw(w, 'booth', 17, 9);
  addRaw(w, 'temple', 20, 8);
  staffAll(w);
  return w;
}

// A month of food and pottery for n people, stocked for them.
const stocked = (n, months = 1) => ({ residents: n, stockedFor: n, stock: { grain: Math.ceil(n * 0.25) * months, pottery: Math.ceil(n * 0.05) * months } });
const townhouse = (w, x, y, n = 20, months = 1) => addRaw(w, 'house', x, y, { tier: 5, ...stocked(n, months) });
const manor = (w, x, y, n = 90, months = 3) => addRaw(w, 'house', x, y, { tier: 6, w: 2, d: 2, ...stocked(n, months) });
const plot = (w, x, y) => addRaw(w, 'house', x, y);
const rows = (w, h) => houseStatus(w, h).checklist;

describe('sim upper tiers and merges', () => {
  it('turns a square of four Townhouses on a pleasant street with a booth into one Manor with everyone in it', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const a = townhouse(w, 12, 11, 20), b = townhouse(w, 13, 11, 21), c = townhouse(w, 12, 12, 22), d = townhouse(w, 13, 12, 19);
    addRaw(w, 'well', 12, 9);
    addRaw(w, 'temple', 15, 8);
    addRaw(w, 'booth', 14, 9);
    addRaw(w, 'statue', 11, 11);
    addRaw(w, 'statue', 11, 12);
    staffAll(w);
    expect(houseDesirability(w, a)).toBeGreaterThanOrEqual(TIERS[6].desirability.rise);
    const taxBefore = [a, b, c, d].reduce((n, h) => n + h.residents * TIERS[h.tier].tax, 0);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'merge', id: a.id }, { type: 'upgrade', id: a.id, from: 5, to: 6 }]);
    const m = w.buildings[a.id];
    expect([m.x, m.y, m.w, m.d, m.tier, m.residents]).toEqual([12, 11, 2, 2, 6, 82]);
    for (const other of [b, c, d]) expect(w.buildings[other.id]).toBe(undefined);
    for (const [x, y] of [[12, 11], [13, 11], [12, 12], [13, 12]]) expect(buildingAt(w, x, y)).toBe(m);
    expect(housesOf(w).length).toBe(1);
    expect([m.stock.grain, m.stock.pottery]).toEqual([17, 5]);              // the others' food and pottery came along (the first ate its own)
    expect(w.tally.upgrades).toBe(1);
    expect(m.residents * TIERS[6].tax).toBeGreaterThan(taxBefore);         // the same people pay more as a Manor
    expect(TIERS[6].capacity / 4).toBeGreaterThanOrEqual(TIERS[5].capacity);   // and no tile holds fewer
  });
  it('picks the square to the north-west first, then clockwise', () => {
    const w = makeTestWorld();
    for (let y = 11; y <= 13; y++) for (let x = 11; x <= 13; x++) if (x !== 12 || y !== 12) plot(w, x, y);
    const h = townhouse(w, 12, 12, 10);
    expect(mergeSquare(w, h)).toEqual({ x: 11, y: 11 });                   // north-west
    Object.assign(buildingAt(w, 11, 11), { tier: 4, residents: 12 });
    expect(mergeSquare(w, h)).toEqual({ x: 12, y: 11 });                   // north-east
    Object.assign(buildingAt(w, 13, 11), { tier: 3, residents: 8 });
    expect(mergeSquare(w, h)).toEqual({ x: 12, y: 12 });                   // south-east
    removeBuilding(w, buildingAt(w, 13, 13).id);
    addRaw(w, 'garden', 13, 13);
    expect(mergeSquare(w, h)).toEqual({ x: 11, y: 12 });                   // south-west
    Object.assign(buildingAt(w, 11, 13), { tier: 2, residents: 3 });
    expect(mergeSquare(w, h)).toBe(null);
  });
  it('merges only with 1x1 plots at Townhouse or better, or plots nobody lives in yet', () => {
    const w = makeTestWorld();
    const h = townhouse(w, 12, 12, 10);
    townhouse(w, 13, 12, 10);
    plot(w, 12, 13);
    const house = addRaw(w, 'house', 13, 13, { tier: 4, residents: 12 });
    expect(mergeSquare(w, h)).toBe(null);                                  // a lived-in House cannot join
    removeResidents(house, 12);
    expect(house.tier).toBe(0);
    expect(mergeSquare(w, h)).toEqual({ x: 12, y: 12 });                   // once it is empty it can
    removeBuilding(w, house.id);
    addRaw(w, 'house', 13, 13, { tier: 6, w: 2, d: 2, residents: 50 });   // part of a Manor is not a plot
    expect(mergeSquare(w, h)).toBe(null);
    const low = makeTestWorld();
    for (const [x, y] of [[13, 12], [12, 13], [13, 13]]) plot(low, x, y);
    expect(mergeSquare(low, addRaw(low, 'house', 12, 12, { tier: 4, residents: 12 }))).toBe(null);   // only a Townhouse merges
    expect(mergeHouses(low, null, { x: 30, y: 30 })).toBe(null);          // no square there
    expect(MERGE_TIER).toBe(6);
  });
  it('keeps a Townhouse that is ready to grow but has no square to join, without a countdown', () => {
    const w = street();
    const h = townhouse(w, 12, 11, 20);
    addRaw(w, 'statue', 11, 12);
    addRaw(w, 'statue', 13, 12);
    addRaw(w, 'statue', 12, 12);
    expect(houseDesirability(w, h)).toBeGreaterThanOrEqual(20);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([]);
    expect([h.tier, h.downTimer]).toEqual([5, 0]);
    expect(houseStatus(w, h).merge).toEqual({ needed: true, ready: false });
    expect(needCause(w, h, 'merge')).toEqual({ code: 'no_square', id: null });
  });
  it('splits a Manor that drops below tier 6 back into four Townhouses, sharing out its residents', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const m = manor(w, 12, 11, 90);                                        // no water, temple or booth: needs unmet
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([]);
    expect(houseStatus(w, m).downgradeIn).toBe(1);
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'downgrade', id: m.id, from: 6, to: 5 }, { type: 'split', id: m.id }]);
    const parts = [[12, 11], [13, 11], [12, 12], [13, 12]].map(([x, y]) => buildingAt(w, x, y));
    expect(parts[0]).toBe(m);                                              // the north-west plot keeps the id
    expect(parts.map((p) => [p.w, p.d, p.tier])).toEqual([[1, 1, 5], [1, 1, 5], [1, 1, 5], [1, 1, 5]]);
    expect(parts.map((p) => p.residents)).toEqual([23, 23, 22, 22]);
    expect(new Set(parts.map((p) => p.id)).size).toBe(4);
    const split = splitHouse(w, Object.assign(mergeHouses(w, parts[0], { x: 12, y: 11 }), { residents: 3, stock: { grain: 5 } }));
    expect(split.map((p) => [p.tier, p.residents])).toEqual([[5, 1], [5, 1], [5, 1], [0, 0]]);   // nobody left for the fourth
    expect(split.map((p) => p.stock.grain || 0)).toEqual([2, 2, 1, 0]);    // stock goes to the plots with people
  });
  it('keeps the month\'s fed record on the plots of a split Manor, so the mood does not fall for people who just ate', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const m = manor(w, 12, 11, 90);                                        // fed from its own stock, but no water, temple or booth
    monthlyHousing(w);
    expect(m.met.food).toBe(true);
    const before = updateMood(w);
    const events = [];
    monthlyHousing(w, events);
    expect(events.map((e) => e.type)).toEqual(['downgrade', 'split']);
    const parts = [[12, 11], [13, 11], [12, 12], [13, 12]].map(([x, y]) => buildingAt(w, x, y));
    expect(updateMood(w)).toBe(before);                                    // the same people, still fed
    expect(parts.map((p) => p.met.food)).toEqual([true, true, true, true]);
    expect(new Set(parts.map((p) => p.met)).size).toBe(4);                 // each plot has its own record
    const v = makeTestWorld();
    const split = splitHouse(v, Object.assign(manor(v, 12, 11, 3), { met: { food: true } }));
    expect(split.map((p) => p.met)).toEqual([{ food: true }, { food: true }, { food: true }, {}]);   // nobody left for the fourth
  });
  it('holds a Manor between the two desirability values, and drops it after a month below "to keep", with the countdown', () => {
    const w = street();
    const m = manor(w, 12, 11, 90, 5);
    addRaw(w, 'statue', 12, 13);
    const second = addRaw(w, 'statue', 11, 13);
    expect(houseDesirability(w, m)).toBe(16);                              // 15 to keep a Manor, 35 to rise to a Fine manor
    monthlyHousing(w);
    monthlyHousing(w);
    expect([m.tier, m.downTimer]).toEqual([6, 0]);
    const s = houseStatus(w, m);
    expect(s.checklist.find((c) => c.need === 'desirability')).toEqual({ need: 'desirability', met: false, value: 16, target: 35, keep: 15 });
    expect(s.missingNow).toEqual([]);
    removeBuilding(w, second.id);
    expect(houseDesirability(w, m)).toBe(8);
    const events = [];
    monthlyHousing(w, events);
    expect([m.tier, m.downTimer, events.length]).toEqual([6, 1, 0]);
    const warn = houseStatus(w, m);
    expect(warn.downgradeIn).toBe(1);
    expect(warn.missingNow).toEqual(['desirability']);
    expect(needCause(w, m, 'desirability')).toEqual({ code: 'low_desirability', id: null, value: 8, target: 35 });
    monthlyHousing(w, events);
    expect(events.map((e) => e.type)).toEqual(['downgrade', 'split']);
  });
  it('grows a Townhouse into a Manor only once the street reaches "to rise"', () => {
    const w = street();
    const h = townhouse(w, 12, 11, 20, 2);
    for (const [x, y] of [[13, 11], [12, 12], [13, 12]]) plot(w, x, y);
    addRaw(w, 'statue', 11, 12);
    addRaw(w, 'statue', 11, 13);
    addRaw(w, 'garden', 14, 12);
    expect(houseDesirability(w, h)).toBe(16);
    expect(rows(w, h).every((c) => c.met || c.need === 'desirability')).toBe(true);
    monthlyHousing(w);
    expect([h.tier, h.w, h.downTimer]).toEqual([5, 1, 0]);                 // below 20: it neither grows nor drops
    addRaw(w, 'statue', 14, 13);
    expect(houseDesirability(w, h)).toBe(22);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'merge', id: h.id }, { type: 'upgrade', id: h.id, from: 5, to: 6 }]);
    expect([h.tier, h.w, h.d, h.residents]).toEqual([6, 2, 2, 20]);        // the empty plots add no one
  });
  it('turns a 2x2 home that empties into four empty plots, whether people leave or move out', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    manor(w, 12, 11, 1);
    w.mood = 10;                                                           // low mood: people leave
    departures(w);
    expect(housesOf(w).map((p) => [p.w, p.tier, p.residents])).toEqual([[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]);
    const v = makeTestWorld();
    manor(v, 12, 20, 1);                                                   // no road: everyone moves out
    monthlyHousing(v);
    expect(housesOf(v).map((p) => [p.w, p.tier, p.residents])).toEqual([[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]);
  });
  it('lists the next tier\'s needs, the desirability row and the merge line on the house sheet', () => {
    const w = street();
    const h = townhouse(w, 12, 11, 20);
    for (const [x, y] of [[13, 11], [12, 12], [13, 12]]) plot(w, x, y);
    const s = houseStatus(w, h);
    expect(s.checklist.map((c) => c.need)).toEqual(['road', ...TIERS[6].needs, 'desirability']);
    expect(s.checklist[s.checklist.length - 1]).toEqual({ need: 'desirability', met: false, value: 0, target: 20, keep: null });
    expect(s.merge).toEqual({ needed: true, ready: true });
    expect(needCause(w, h, 'merge')).toBe(null);
    const house = addRaw(w, 'house', 2, 11, { tier: 4, residents: 16 });
    expect(rows(w, house).map((c) => c.need)).toEqual(['road', ...TIERS[5].needs]);   // no desirability before the Manor
    expect(houseStatus(w, house).merge).toEqual({ needed: false, ready: false });
    const estate = addRaw(w, 'house', 24, 11, { tier: 9, w: 2, d: 2, residents: 100 });
    expect(rows(w, estate).find((c) => c.need === 'desirability').target).toBe(TIERS[9].desirability.keep);   // the top tier keeps
    expect([desirabilityTarget(4), desirabilityTarget(5), desirabilityTarget(6), desirabilityTarget(8), desirabilityTarget(9)]).toEqual([null, 20, 35, 65, 57]);
  });
  it('names the booth codes for entertainment', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = townhouse(w, 12, 11, 20);
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'no_booth', id: null });
    const roadless = addRaw(w, 'booth', 12, 13);                           // two tiles below the home, no road
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'booth_no_road', id: roadless.id });
    const booth = addRaw(w, 'booth', 16, 9);                               // on the road, unstaffed
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'booth_idle', id: booth.id });
    staffAll(w);
    expect(needCause(w, h, 'entertainment')).toBe(null);
    booth.paused = true;
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'booth_idle', id: booth.id });
  });
  it('traces a missing household good from the bazaar back to whether anything makes it', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stockedFor: 16, stock: { grain: 4 } });
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'no_bazaar', id: null });
    const bazaar = addRaw(w, 'bazaar', 9, 8);
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'bazaar_idle', id: bazaar.id });
    staffAll(w);
    bazaar.store.grain = 50;                                               // grain is no help with pottery
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'no_good', good: 'pottery', id: bazaar.id });   // no store for pottery in reach
    const store = addRaw(w, 'storehouse', 4, 8);                           // a store for pottery in its supply reach, empty
    staffAll(w);
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'good_unmade', good: 'pottery', id: bazaar.id });
    store.store.clay = 30;                                                 // clay is not pottery
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'good_unmade', good: 'pottery', id: bazaar.id });
    store.store.pottery = 12;                                              // in store: the bazaar restocks at the month's end
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'next_delivery', id: bazaar.id, good: 'pottery' });
    store.store.pottery = 0;
    bazaar.store.pottery = 6;                                              // at the bazaar: the home tops up at the month's end
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'next_delivery', id: bazaar.id, good: 'pottery' });
    h.stock.pottery = 1;                                                   // a month for 16 people
    expect(needCause(w, h, 'pottery')).toBe(null);
    expect(needCause(w, h, 'food')).toEqual(null);
    const granary = addRaw(w, 'granary', 20, 8);                           // food causes look only at food stores
    staffAll(w);
    h.stock.grain = 0;
    bazaar.store.grain = 0;
    expect(needCause(w, h, 'food')).toEqual({ code: 'granary_empty', id: granary.id });
  });
  it('traces two kinds of food through the food the home has none of', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = addRaw(w, 'house', 12, 11, { tier: 6, w: 2, d: 2, residents: 20, stockedFor: 20, stock: { grain: 5 } });
    const bazaar = addRaw(w, 'bazaar', 9, 8, { store: { grain: 40 } });
    staffAll(w);
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'no_good', good: 'figs', id: bazaar.id });      // no granary in reach
    const granary = addRaw(w, 'granary', 4, 8, { store: { grain: 100 } });
    staffAll(w);
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'good_unmade', good: 'figs', id: bazaar.id });   // a granary, but no figs in it
    granary.store.figs = 20;
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'next_delivery', id: bazaar.id, good: 'figs' });
    granary.store.figs = 0;
    bazaar.store.figs = 8;
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'next_delivery', id: bazaar.id, good: 'figs' });
    h.stock.figs = 1;
    expect(needCause(w, h, 'twoFoods')).toBe(null);
  });
  it('blames a missing road for needs that come along roads, but not for desirability or a square', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 12, 20, { tier: 5, residents: 20 });   // nothing in stock
    for (const need of ['road', 'entertainment', 'pottery', 'twoFoods']) expect(needCause(w, h, need)).toEqual({ code: 'no_road', id: null });
    expect(needCause(w, h, 'desirability').code).toBe('low_desirability');
    expect(needCause(w, h, 'merge')).toEqual({ code: 'no_square', id: null });
  });
  it('agrees with the checklist: no cause exactly when a row is met, for every need of tiers 5 to 9, through every state', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const homes = [
      townhouse(w, 12, 11, 20),
      addRaw(w, 'house', 2, 11, { tier: 7, w: 2, d: 2, residents: 100 }),  // a Fine manor: the next tier wants linen
      addRaw(w, 'house', 22, 11, { tier: 9, w: 2, d: 2, residents: 120 }), // an Estate: the top tier
      addRaw(w, 'house', 12, 20, { tier: 5, residents: 10 }),               // touches no road
    ];
    let bazaar, store, granary, booth;
    const steps = [
      () => {},
      () => { addRaw(w, 'well', 14, 9); addRaw(w, 'well', 4, 9); addRaw(w, 'well', 25, 9); },
      () => { booth = addRaw(w, 'booth', 16, 9); },                         // unstaffed
      () => { staffAll(w); },
      () => { bazaar = addRaw(w, 'bazaar', 9, 8); staffAll(w); },          // empty
      () => { store = addRaw(w, 'storehouse', 17, 8); granary = addRaw(w, 'granary', 6, 8); staffAll(w); },
      () => { store.store.pottery = 50; store.store.beer = 20; },
      () => { store.store.linen = 20; store.store.jewellery = 20; granary.store.grain = 80; },
      () => { granary.store.figs = 30; bazaar.store.figs = 10; },
      () => { for (const h of homes) Object.assign(h, { stockedFor: h.residents, stock: { grain: 40, figs: 40, pottery: 10, beer: 10, linen: 10, jewellery: 10 } }); },
      () => { addRaw(w, 'temple', 18, 11); staffAll(w); },
      () => { for (const [x, y] of [[11, 12], [12, 12], [13, 12]]) addRaw(w, 'statue', x, y); },
      () => { for (const [x, y] of [[2, 13], [3, 13], [4, 12], [1, 13]]) addRaw(w, 'statue', x, y); },
      () => { booth.paused = true; },
      () => { homes[1].stock.figs = 0; homes[2].stock.jewellery = 0; },
      () => { removeBuilding(w, buildingAt(w, 12, 12).id); plot(w, 12, 12); plot(w, 13, 11); },
    ];
    for (const step of steps) {
      step();
      for (const h of homes) {
        const s = houseStatus(w, h);
        for (const row of s.checklist) expect([h.id, row.need, needCause(w, h, row.need) === null]).toEqual([h.id, row.need, row.met]);
        expect([h.id, needCause(w, h, 'merge') === null]).toEqual([h.id, !s.merge.needed || s.merge.ready]);
      }
    }
  });
});
