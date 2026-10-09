import { describe, it, expect } from '../harness.js';
import { monthlyHousing, houseStatus, wantedNeeds, removeResidents, leaveCap } from '../../src/sim/housing.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y=10; houses sit on y=11 so they touch it.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('housing', () => {
  it('upgrades a hut to a shack once a well covers it', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    expect(h.tier).toBe(2);
  });
  it('needs a month of stocked food before becoming a cottage', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    staffAll(w);
    monthlyHousing(w);
    expect(h.tier).toBe(2);
    expect(h.stock.grain).toBe(2);
    monthlyHousing(w);
    expect(h.tier).toBe(3);
  });
  it('becomes a house when a working temple covers it', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    addRaw(w, 'temple', 15, 8);
    staffAll(w);
    monthlyHousing(w);
    expect(h.tier).toBe(4);
  });
  it('waits a month before dropping a tier when water is lost', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    monthlyHousing(w);
    expect(h.tier).toBe(2);
    expect(houseStatus(w, h).downgradeIn).toBe(1);
    monthlyHousing(w);
    expect(h.tier).toBe(1);
  });
  it('lets stocked food carry a cottage through a missed delivery', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    expect(h.tier).toBe(3);
    expect(h.downTimer).toBe(0);
    monthlyHousing(w);
    expect(h.downTimer).toBe(1);
    monthlyHousing(w);
    expect(h.tier).toBe(2);
  });
  it('covers newcomers for their first month', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 8, stockedFor: 8, stock: { grain: 2 } });
    addRaw(w, 'well', 13, 9);
    h.residents = 12; // arrivals came mid-month
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.tier).toBe(3);
    expect(h.downTimer).toBe(0);
  });
  it('still goes hungry when the stocked amount runs short', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stockedFor: 12, stock: { grain: 2 } });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    expect(h.met.food).toBe(false);
  });
  it('judges a growing house on what it was stocked for', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    staffAll(w);
    monthlyHousing(w);
    expect(h.stockedFor).toBe(12);
    expect(h.met.food).toBe(true);
    h.residents = 16; // arrivals came mid-month, past the tier-3 capacity; the leave cap trims it
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.downTimer).toBe(0);
  });
  it('caps leavers at a quarter of residents per month', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 20, { tier: 1, residents: 5 });
    monthlyHousing(w);
    expect(h.residents).toBe(4);
    expect(h.leftThisMonth).toBe(1);
  });
  it('caps leavers at a quarter of residents but never below one', () => {
    expect(leaveCap({ residents: 3 })).toBe(1);
    expect(leaveCap({ residents: 9 })).toBe(2);
    expect(leaveCap({ residents: 16 })).toBe(4);
  });
  it('sends a roadside hut over capacity down to its size, within the leave cap', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 8 });
    monthlyHousing(w);
    expect(h.residents).toBe(6);
    expect(h.leftThisMonth).toBe(2);
  });
  it('resets the downgrade timer once water returns', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    monthlyHousing(w);
    expect(h.downTimer).toBe(1);
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    expect(h.downTimer).toBe(0);
    expect(h.tier).toBe(2);
  });
  it('clears the timer and ticks of an emptied house', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 2, downTimer: 1, met: { road: true, water: true } });
    removeResidents(h, 2);
    expect(h.downTimer).toBe(0);
    expect(h.met).toEqual({});
  });
  it('shows no downgrade countdown for a hut, which cannot drop a tier', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 20, { tier: 1, residents: 5, downTimer: 1 });
    expect(houseStatus(w, h).downgradeIn).toBe(null);
  });
  it('turns an emptied house back into a plot', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 2, stock: { grain: 1 } });
    removeResidents(h, 2);
    expect(h.tier).toBe(0);
    expect(h.stock).toEqual({});
  });
  it('wants the needs of the next tier as well', () => {
    expect(wantedNeeds({ tier: 2 })).toEqual(['water', 'food']);
  });
  it('explains what the next tier needs', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    const s = houseStatus(w, h);
    expect(s.next).toEqual({ tier: 3, name: 'Cottage' });
    expect(s.checklist).toEqual([{ need: 'road', met: true }, { need: 'water', met: true }, { need: 'food', met: false }]);
    expect(s.missingNow).toEqual([]);
    expect(s.downgradeIn).toBe(null);
  });
  it('shows an empty plot beside a road as road met', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11);
    const s = houseStatus(w, h);
    expect(s.tier).toBe(0);
    expect(s.checklist).toEqual([{ need: 'road', met: true }]);
    expect(s.missingNow).toEqual([]);
  });
  it('judges a hut that has just arrived live, before any monthly tick', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    addRaw(w, 'well', 13, 9);
    expect(h.met).toEqual({});
    const s = houseStatus(w, h);
    expect(s.next).toEqual({ tier: 2, name: 'Shack' });
    expect(s.checklist).toEqual([{ need: 'road', met: true }, { need: 'water', met: true }]);
    expect(s.missingNow).toEqual([]);
  });
  it('shows a house with no road as road not met and missing now', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 20, { tier: 1, residents: 5 });
    const s = houseStatus(w, h);
    expect(s.checklist[0]).toEqual({ need: 'road', met: false });
    expect(s.missingNow).toEqual(['road']);
  });
  it('follows a well built, or a road cut, after the last monthly tick', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    monthlyHousing(w);
    expect(houseStatus(w, h).missingNow).toEqual(['water']);
    addRaw(w, 'well', 13, 9);
    expect(houseStatus(w, h).missingNow).toEqual([]);
    for (let x = 0; x < w.size; x++) w.road[10 * w.size + x] = 0;
    w.roadVersion++;
    expect(houseStatus(w, h).missingNow).toEqual(['road', 'water']);
  });
  it('counts religion only from a working temple in reach', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    const temple = addRaw(w, 'temple', 15, 8);
    const religion = () => houseStatus(w, h).checklist.find((c) => c.need === 'religion').met;
    expect(religion()).toBe(false); // unstaffed
    staffAll(w);
    expect(religion()).toBe(true);
    temple.paused = true;
    expect(religion()).toBe(false);
  });
  it('reads food from the live stock against what the house was stocked for', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stockedFor: 8, stock: { grain: 2 } });
    const food = () => houseStatus(w, h).checklist.find((c) => c.need === 'food').met;
    expect(food()).toBe(true); // two grain feeds the eight it was stocked for
    h.stock.grain = 1;
    expect(food()).toBe(false);
    h.stockedFor = 0; // nothing recorded: judged on all twelve, who need three
    h.stock.grain = 2;
    expect(food()).toBe(false);
    h.stock.grain = 3;
    expect(food()).toBe(true);
  });
  it('never counts food as met for a house with no residents', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 0, stock: { grain: 5 } });
    expect(houseStatus(w, h).checklist.find((c) => c.need === 'food').met).toBe(false);
  });
  it('agrees with the monthly tick about water and religion coverage', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'temple', 15, 8);
    staffAll(w);
    monthlyHousing(w);
    const s = houseStatus(w, h);
    for (const need of ['water', 'religion']) {
      expect(s.checklist.find((c) => c.need === need).met).toBe(h.met[need]);
    }
  });
});
