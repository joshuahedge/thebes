import { describe, it, expect } from '../harness.js';
import { produceDay, storeTotal } from '../../src/sim/production.js';
import { restockBazaars, bazaarsByHouse, topUpHouse, monthlyNeed } from '../../src/sim/distribution.js';
import { DAYS_PER_MONTH } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

function farmWorld() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const farm = addRaw(w, 'farm_grain', 2, 8);
  return { w, farm };
}

describe('production', () => {
  it('fills nearby storage at the monthly rate when fully staffed', () => {
    const { w, farm } = farmWorld();
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w);
    expect(granary.store.grain).toBe(30);
    expect(farm.blocked).toBe(null);
  });
  it('halves output at half staffing', () => {
    const { w, farm } = farmWorld();
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    farm.staff = 5;
    for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w);
    expect(granary.store.grain).toBe(15);
  });
  it('stops with no storage in reach', () => {
    const { w, farm } = farmWorld();
    addRaw(w, 'granary', 5, 20);
    staffAll(w);
    produceDay(w);
    expect(farm.blocked).toBe('no_storage');
    expect(farm.progress).toBe(0);
  });
  it('stops when understaffed', () => {
    const { w, farm } = farmWorld();
    addRaw(w, 'granary', 5, 8);
    staffAll(w);
    farm.staff = 2;
    produceDay(w);
    expect(farm.blocked).toBe('understaffed');
  });
});

describe('distribution', () => {
  it('restocks bazaars only from storage within supply reach', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const near = addRaw(w, 'granary', 5, 8, { store: { grain: 100 } });
    const far = addRaw(w, 'granary', 28, 8, { store: { grain: 100 } });
    const bz = addRaw(w, 'bazaar', 9, 8);
    staffAll(w);
    restockBazaars(w);
    expect(bz.store.grain).toBe(100);
    expect(near.store.grain).toBe(0);
    expect(far.store.grain).toBe(100);
  });
  it('tops houses up to one month of need from the nearest bazaar', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 50 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    staffAll(w);
    const list = bazaarsByHouse(w).get(h.id);
    expect(list[0].b.id).toBe(bz.id);
    topUpHouse(w, h, ['grain'], list);
    expect(monthlyNeed(h, 'grain')).toBe(3);
    expect(h.stock.grain).toBe(3);
    expect(bz.store.grain).toBe(47);
    topUpHouse(w, h, ['grain'], list);
    expect(h.stock.grain).toBe(3);
    expect(storeTotal(bz)).toBe(47);
  });
});
