// Version 6.0, Track C (rulings 700-719): the Large plot's rules in the sim, each set up both ways: the card's unlock, the placing rule, the lot's
// "Opens when" list against the rule that lets people move in, a Manor that climbs and falls in place and never splits, a Townhouse that stops, and a home
// merged under the old rule that keeps working.
import { describe, it, expect } from '../../harness.js';
import { TIERS } from '../../../src/data/housing.js';
import { LARGE_PLOT } from '../../../src/data/largePlots.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { monthlyHousing, houseStatus, needCause, lotReady, stockLot, desirabilityTargetFor, removeResidents, capacityOf } from '../../../src/sim/housing.js';
import { mergeSquare, mergeHouses, splitHouse } from '../../../src/sim/merge.js';
import { arrivalsBatch, vacancies, departures } from '../../../src/sim/immigration.js';
import { isLargePlot, isMergedHome, isLot, isSmallTop, largePlotUnlocked, canPlaceLargePlot, noteLargePlotUnlock } from '../../../src/sim/largePlots.js';
import { canPlace, place, demolishAt, conditionsFor } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { costOf } from '../../../src/sim/costs.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { housesOf, buildingAt, removeBuilding, touchBuildings } from '../../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

// A street along y = 10 where a lot at (12, 11) has every need of a Manor met: a well, a temple and a booth in reach, a bazaar whose stall holds grain and
// pottery, and two statues beside it (the street's desirability is at least the Manor's "to rise"). A Townhouse elsewhere has unlocked the card.
function served() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 28, 11, { tier: 5, residents: 10, stockedFor: 10, stock: { grain: 3, pottery: 1 } });   // the first Townhouse
  const parts = {
    well: addRaw(w, 'well', 12, 9),
    temple: addRaw(w, 'temple', 15, 8),
    booth: addRaw(w, 'booth', 14, 9),
    bazaar: addRaw(w, 'bazaar', 9, 11),
    statue1: addRaw(w, 'statue', 11, 11),
    statue2: addRaw(w, 'statue', 11, 12),
  };
  parts.bazaar.store.grain = 200;
  parts.bazaar.store.pottery = 100;
  staffAll(w);
  noteLargePlotUnlock(w);
  w.mood = 80;
  return { w, parts };
}
const lotAt = (w, x = 12, y = 11) => { const r = place(w, LARGE_PLOT.type, x, y, { roadLater: true }); return r.ok ? w.buildings[r.id] : r; };
const metOf = (w, h) => Object.fromEntries(houseStatus(w, h).checklist.map((c) => [c.need, c.met]));

describe('v60 c large plot unlock and placing', () => {
  it('has its data from the Townhouse and the Manor, and a card of the price of the four plots it stands in for', () => {
    expect(TIERS[LARGE_PLOT.unlockTier].name).toBe('Townhouse');
    expect(TIERS[LARGE_PLOT.opensTier].size).toBe(LARGE_PLOT.size);
    expect(TIERS[LARGE_PLOT.unlockTier].size).toBe(1);
    expect(BUILDINGS[LARGE_PLOT.type].w * BUILDINGS[LARGE_PLOT.type].d).toBe(4);
    expect(BUILDINGS[LARGE_PLOT.type].cost).toBe(4 * BUILDINGS.house.cost);
  });
  it('is locked until the city has a Townhouse, then unlocked, and stays so', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const hut = addRaw(w, 'house', 5, 11, { tier: 4, residents: 10 });
    expect([largePlotUnlocked(w), canPlace(w, LARGE_PLOT.type, 12, 11).reason, canPlaceLargePlot(w, 12, 11)]).toEqual([false, 'locked', { ok: false, reason: 'locked', warnings: [] }]);
    expect(place(w, LARGE_PLOT.type, 12, 11).reason).toBe('locked');
    hut.tier = 5;
    expect(largePlotUnlocked(w)).toBe(true);                 // the home is a Townhouse now: the card is there before the month's check notes it
    expect(w.tally.largeUnlocked).toBe(0);
    monthlyHousing(w);
    expect([w.tally.largeUnlocked, w.newItems.includes(LARGE_PLOT.type)]).toEqual([1, true]);   // noted, and a "New" card until one is laid
    hut.tier = 2;                                            // the Townhouse falls away: the card stays
    expect(largePlotUnlocked(w)).toBe(true);
    expect(canPlaceLargePlot(w, 12, 11).ok).toBe(true);
  });
  it('lays a 2x2 house carrying large: true, empty, for 20 gold, and a tally and the New card are used up', () => {
    const { w } = served();
    expect(w.newItems.includes(LARGE_PLOT.type)).toBe(true);
    const gold = w.gold;
    const r = place(w, LARGE_PLOT.type, 20, 11, { roadLater: true });
    expect([r.ok, r.warnings]).toEqual([true, []]);
    const b = w.buildings[r.id];
    expect([b.type, b.x, b.y, b.w, b.d, b.large, b.tier, b.residents]).toEqual(['house', 20, 11, 2, 2, true, 0, 0]);
    expect([isLargePlot(b), isMergedHome(b), isLot(b), isSmallTop(b)]).toEqual([true, false, true, false]);
    expect([gold - w.gold, costOf(w, LARGE_PLOT.type), w.tally.largePlots, w.newItems.includes(LARGE_PLOT.type)]).toEqual([20, 20, 1, false]);
    for (const [x, y] of [[20, 11], [21, 11], [20, 12], [21, 12]]) expect(buildingAt(w, x, y)).toBe(b);
  });
  it('refuses with canPlace\'s own reasons, and warns of a missing road as a plot does', () => {
    const { w } = served();
    expect(canPlaceLargePlot(w, 20, 11)).toEqual({ ok: true, warnings: [] });
    expect(canPlaceLargePlot(w, 20, 2).warnings).toEqual(['needs_road']);              // let through, and the card says no road touches it yet
    expect(canPlaceLargePlot(w, 11, 11).reason).toBe('occupied');                      // a statue is on one of its tiles
    expect(canPlaceLargePlot(w, 12, 10).reason).toBe('occupied');                      // so is the road
    expect(canPlaceLargePlot(w, 31, 11).reason).toBe('out_of_bounds');                 // half off the map
    expect(canPlaceLargePlot(w, 20.5, 11).reason).toBe('out_of_bounds');
    w.gold = -490;                                                                     // the debt floor is -500, so 20 more would cross it
    expect(canPlaceLargePlot(w, 20, 11).reason).toBe('no_gold');
    expect(conditionsFor(w, LARGE_PLOT.type, 20, 11, { roadLater: true }).conditions.map((c) => [c.key, c.state])).toEqual([['ground', 'met'], ['road', 'met'], ['gold', 'cant']]);
  });
  it('is taken back by one undo, and a demolished lot gives nothing back as a plot does', () => {
    const { w } = served();
    const before = w.gold;
    const b = lotAt(w, 20, 11);
    expect(undo(w).ok).toBe(true);
    expect([w.gold, w.buildings[b.id], buildingAt(w, 20, 11)]).toEqual([before, undefined, null]);
    const c = lotAt(w, 20, 11);
    const gold = w.gold;
    expect(demolishAt(w, 21, 12).ok).toBe(true);
    expect([w.gold, w.buildings[c.id]]).toEqual([gold, undefined]);
  });
});

describe('v60 c the lot opens when its Opens-when list is met', () => {
  it('lists the Manor\'s needs and the street it asks for, from the data, and agrees with lotReady', () => {
    const { w } = served();
    const lot = lotAt(w);
    const s = houseStatus(w, lot);
    expect([s.lot, s.large, s.tier, s.name, s.next, s.capacity, s.merge]).toEqual([true, true, 0, 'Large plot', { tier: 6, name: 'Manor' }, TIERS[6].capacity, { needed: false, ready: false }]);
    expect(s.checklist.map((c) => c.need)).toEqual(['road', ...TIERS[6].needs, 'desirability']);
    expect(s.checklist.every((c) => c.met)).toBe(true);
    const d = s.checklist.find((c) => c.need === 'desirability');
    expect([d.target, d.value >= d.target, desirabilityTargetFor(lot)]).toEqual([TIERS[6].desirability.rise, true, TIERS[6].desirability.rise]);
    expect(lotReady(w, lot)).toBe(true);
    expect([s.missingNow, s.downgradeIn]).toEqual([[], null]);
  });
  it('each need, taken away, closes the lot and names its cause; put back, it opens again', () => {
    const cases = [
      ['water', (p) => { p.well.paused = true; }, (p) => { p.well.paused = false; }, 'well_idle'],
      ['religion', (p) => { p.temple.paused = true; }, (p) => { p.temple.paused = false; }, 'temple_idle'],
      ['entertainment', (p) => { p.booth.paused = true; }, (p) => { p.booth.paused = false; }, 'booth_idle'],
      ['food', (p) => { p.bazaar.store.grain = 0; }, (p) => { p.bazaar.store.grain = 200; }, 'bazaar_empty'],
      ['pottery', (p) => { p.bazaar.store.pottery = 0; }, (p) => { p.bazaar.store.pottery = 100; }, 'no_good'],
    ];
    for (const [need, off, on, code] of cases) {
      const { w, parts } = served();
      const lot = lotAt(w);
      expect([need, lotReady(w, lot)]).toEqual([need, true]);
      off(parts); touchBuildings(w);                                  // a direct change to a building says so, as a pause through the sheet does (lotReady keeps its answer for a day while the buildings stand as they are)
      expect([need, lotReady(w, lot), metOf(w, lot)[need]]).toEqual([need, false, false]);
      expect([need, needCause(w, lot, need).code]).toEqual([need, code]);
      on(parts); touchBuildings(w);
      expect([need, lotReady(w, lot), needCause(w, lot, need)]).toEqual([need, true, null]);
    }
  });
  it('a road is a need too, and a plain street is the last: take the statues away and the lot is held by desirability', () => {
    const { w, parts } = served();
    const lot = lotAt(w);
    removeBuilding(w, parts.statue1.id);
    removeBuilding(w, parts.statue2.id);
    const d = houseStatus(w, lot).checklist.find((c) => c.need === 'desirability');
    expect([lotReady(w, lot), d.met, d.value < d.target]).toEqual([false, false, true]);
    expect(needCause(w, lot, 'desirability').code).toBe('low_desirability');
    const away = lotAt(w, 20, 3);
    expect([lotReady(w, away), metOf(w, away).road, needCause(w, away, 'road').code]).toEqual([false, false, 'no_road']);
  });
  it('is never moved into as a Hut: arrivals wait while a need is missing, then open it as a stocked Manor', () => {
    const { w, parts } = served();
    const lot = lotAt(w);
    parts.bazaar.store.pottery = 0; touchBuildings(w);
    expect(vacancies(w).map((v) => v.h.id).includes(lot.id)).toBe(false);   // the vacancy list leaves it out, however much room it has
    arrivalsBatch(w);                                               // whoever arrives goes to the Townhouse with room, not into the lot
    expect([lot.tier, lot.residents]).toEqual([0, 0]);
    parts.bazaar.store.pottery = 100; touchBuildings(w);
    const entry = vacancies(w).find((v) => v.h.id === lot.id);
    expect(entry.free).toBe(TIERS[6].capacity);
    const townhouse = housesOf(w).find((h) => h.tier === 5);
    townhouse.residents = TIERS[5].capacity;                          // no room anywhere else now
    const n = arrivalsBatch(w);
    expect(n).toBeGreaterThan(0);
    const homes = housesOf(w).filter((h) => h.id !== lot.id && h.residents > 0).length;
    expect([lot.tier, lot.residents > 0, lot.stockedFor, (lot.stock.grain || 0) > 0, (lot.stock.pottery || 0) > 0]).toEqual([6, true, lot.residents, true, true]);
    expect([lot.w, lot.d, isLargePlot(lot), homes]).toEqual([2, 2, true, 1]);
  });
  it('a new Manor keeps its tier through its first month end: it was stocked as it opened', () => {
    const { w } = served();
    const lot = lotAt(w);
    arrivalsBatch(w);
    expect(lot.tier).toBe(6);
    monthlyHousing(w);
    expect([lot.tier, lot.downTimer, houseStatus(w, lot).downgradeIn]).toEqual([6, 0, null]);
  });
});

describe('v60 c a Large plot never splits', () => {
  it('climbs in place: the same id and the same four tiles, a tier at the month end while its needs and its street are met', () => {
    const { w, parts } = served();
    for (const [x, y] of [[14, 11], [14, 12], [12, 13], [13, 13]]) addRaw(w, 'statue', x, y);   // a street pleasant enough for a Fine manor
    parts.bazaar.store.beer = 100;
    parts.bazaar.store.figs = 100;                       // the Fine manor's beer and a second kind of food are at the bazaar when the lot opens
    const lot = lotAt(w);
    const id = lot.id;
    expect(houseDesirability(w, lot)).toBeGreaterThanOrEqual(TIERS[7].desirability.rise);
    arrivalsBatch(w);
    expect(lot.tier).toBe(6);
    lot.residents = 40;                                   // a household big enough to stock two kinds of food: the arrivals' first batch is a handful
    stockLot(w, lot);
    expect(metOf(w, lot).twoFoods).toBe(true);
    const events = [];
    monthlyHousing(w, events);
    expect(events.filter((e) => e.type === 'upgrade')).toEqual([{ type: 'upgrade', id, from: 6, to: 7 }]);
    expect(events.some((e) => e.type === 'merge' || e.type === 'split')).toBe(false);
    expect([w.buildings[id] === lot, lot.tier, lot.x, lot.y, lot.w, lot.d, isLargePlot(lot), w.tally.upgrades]).toEqual([true, 7, 12, 11, 2, 2, true, 1]);
    expect(housesOf(w).filter((h) => h.large).length).toBe(1);
  });
  it('falls a tier at a time in place when a need goes, keeping its lot and its people up to each tier\'s room, and empties back to a lot', () => {
    const { w, parts } = served();
    const lot = lotAt(w);
    arrivalsBatch(w);
    monthlyHousing(w);
    expect(lot.tier).toBe(6);
    parts.well.paused = true;                                  // water is a need of every tier from the Shack: it fails every month now
    const ids = new Set();
    for (let i = 0; i < 4; i++) { monthlyHousing(w); ids.add(housesOf(w).filter((h) => h.large).map((h) => h.id).join()); }
    expect([ids.size, lot.tier, lot.w, lot.d, w.buildings[lot.id] === lot]).toEqual([1, 4, 2, 2, true]);   // 6 to 5 to 4 in two months each, never four Townhouses
    expect(housesOf(w).length).toBe(2);                         // the other Townhouse and this lot
    removeResidents(lot, lot.residents);
    expect([lot.tier, lot.residents, lot.w, isLot(lot), splitHouse(w, lot)]).toEqual([0, 0, 2, true, [lot]]);
    expect(buildingAt(w, 13, 12)).toBe(lot);
  });
  it('keeps its people as the four plots it stands in for would: a Manor that falls back holds four Townhouses\' worth, not one\'s', () => {
    const { w, parts } = served();
    const lot = lotAt(w);
    expect([capacityOf(lot), houseStatus(w, lot).capacity]).toEqual([TIERS[6].capacity, TIERS[6].capacity]);   // an empty lot is judged at the Manor it opens as
    arrivalsBatch(w);
    Object.assign(lot, { residents: 100, stockedFor: 100, stock: { grain: 40, pottery: 10 } });
    parts.well.paused = true;                                  // water fails the Manor: two months to a Townhouse
    monthlyHousing(w);
    monthlyHousing(w);
    const four = 4 * TIERS[5].capacity;
    expect([lot.tier, capacityOf(lot), houseStatus(w, lot).capacity]).toEqual([5, four, four]);
    expect(lot.residents).toBeGreaterThan(TIERS[5].capacity);   // not cut to one plot's room: the people stay as they did when a Manor split into four
    expect(lot.residents).toBeLessThanOrEqual(four);
    const plot = addRaw(w, 'house', 3, 11, { tier: 5, residents: 5 });
    expect(capacityOf(plot)).toBe(TIERS[5].capacity);            // a small plot holds a small plot's
    expect(capacityOf(addRaw(w, 'house', 4, 11))).toBe(TIERS[1].capacity);
  });
  it('departures that empty a Large plot leave a lot, not four plots', () => {
    const { w } = served();
    const lot = lotAt(w);
    arrivalsBatch(w);
    w.mood = 0;
    for (let i = 0; i < 60 && lot.residents > 0; i++) { departures(w); lot.leftThisMonth = 0; }
    expect([lot.residents, isLot(lot), lot.w, w.buildings[lot.id] === lot]).toEqual([0, true, 2, true]);
    expect(housesOf(w).filter((h) => h.w === 1).length).toBe(1);   // only the Townhouse far away
  });
});

describe('v60 c small plots stop at Townhouse; merged homes keep working', () => {
  const cluster = (w) => {
    const plots = [[12, 11], [13, 11], [12, 12], [13, 12]].map(([x, y]) => addRaw(w, 'house', x, y, { tier: 5, residents: 20, stockedFor: 20, stock: { grain: 5, pottery: 1 } }));
    return plots;
  };
  it('a Townhouse beside three more with everything met stays a Townhouse: no next tier, no merge', () => {
    const { w } = served();
    const [a] = cluster(w);
    expect(mergeSquare(w, a) !== null).toBe(true);             // the old rule's square is there ...
    const events = [];
    monthlyHousing(w, events);
    expect(events.filter((e) => e.type === 'merge' || e.type === 'upgrade')).toEqual([]);   // ... and nothing joins it
    expect([a.w, a.tier, housesOf(w).length]).toEqual([1, 5, 5]);
    const s = houseStatus(w, a);
    expect([isSmallTop(a), s.next, s.merge, s.checklist.some((c) => c.need === 'desirability' || c.need === 'merge')]).toEqual([true, null, { needed: false, ready: false }, false]);
    expect(s.checklist.map((c) => c.need)).toEqual(['road', ...TIERS[5].needs]);
    expect(desirabilityTargetFor(a)).toBe(null);
  });
  it('a Townhouse does not wait on a street it does not need, and does not leave for one', () => {
    const { w, parts } = served();
    const [a] = cluster(w);
    removeBuilding(w, parts.statue1.id);
    removeBuilding(w, parts.statue2.id);
    monthlyHousing(w);
    monthlyHousing(w);
    monthlyHousing(w);
    expect([a.tier, a.downTimer]).toEqual([5, 0]);
  });
  it('a home merged under the old rule keeps its place, its people and its tiers: it rises and falls as before, and splits when it drops below a Manor', () => {
    const { w, parts } = served();
    const plots = cluster(w);
    const merged = mergeHouses(w, plots[0], mergeSquare(w, plots[0]));
    expect([isMergedHome(merged), isLargePlot(merged), merged.tier, merged.w]).toEqual([true, false, 6, 2]);
    // It keeps being a Manor while its needs are met (it was never a lot) ...
    Object.assign(merged, { stock: { grain: 60, pottery: 20 }, stockedFor: merged.residents });
    monthlyHousing(w);
    expect([merged.tier, merged.w, w.buildings[merged.id] === merged]).toEqual([6, 2, true]);
    // ... and drops back to four Townhouses when it falls below one, as it always did.
    parts.temple.paused = true;
    const events = [];
    for (let i = 0; i < 2; i++) monthlyHousing(w, events);
    expect(events.filter((e) => e.id === merged.id).map((e) => e.type).filter((t) => t === 'downgrade' || t === 'split')).toEqual(['downgrade', 'split']);
    expect(housesOf(w).filter((h) => h.w === 1).length).toBe(1 + 4);
    expect(w.buildings[merged.id].w).toBe(1);
  });
});
