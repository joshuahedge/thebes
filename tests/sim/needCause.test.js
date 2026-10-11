import { describe, it, expect } from '../harness.js';
import { needCause, houseStatus } from '../../src/sim/housing.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10. The home at (12, 9) sits on it at (12, 10); as a Shack (tier 2) it wants water and food next.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', 12, 9, { tier: 2, residents: 8 });
  return { w, home };
}

describe('sim need cause', () => {
  it('is null for a need the home has, and for a need it does not know', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'road')).toBe(null);
    expect(needCause(w, home, 'music')).toBe(null);
  });
  it('blames a missing road for every need of a home that touches none', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'well', 15, 11);
    const away = addRaw(w, 'house', 12, 5, { tier: 2, residents: 8 });
    for (const need of ['road', 'water', 'food', 'religion']) expect(needCause(w, away, need)).toEqual({ code: 'no_road', id: null });
  });
  it('water: no working well within reach until one is built; a paused well does not count', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'water')).toEqual({ code: 'no_well', id: null });
    addRaw(w, 'well', 25, 11);                                     // 14 road tiles along: out of a well's reach of 5
    expect(needCause(w, home, 'water')).toEqual({ code: 'no_well', id: null });
    const well = addRaw(w, 'well', 15, 11);
    expect(needCause(w, home, 'water')).toBe(null);
    well.paused = true;
    expect(needCause(w, home, 'water')).toEqual({ code: 'well_idle', id: well.id });   // in reach, so it needs resuming, not another well
    well.paused = false;
    expect(needCause(w, home, 'water')).toBe(null);
  });
  it('food: no working bazaar, then an empty one, then grain on its way, then fed', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'food')).toEqual({ code: 'no_bazaar', id: null });
    const bazaar = addRaw(w, 'bazaar', 9, 11);                      // no staff yet: in reach, but not working
    expect(needCause(w, home, 'food')).toEqual({ code: 'bazaar_idle', id: bazaar.id });
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'bazaar_empty', id: bazaar.id });
    bazaar.store.grain = 40;
    expect(needCause(w, home, 'food')).toEqual({ code: 'next_delivery', id: bazaar.id });
    home.stock.grain = 2;                                           // a month of food for 8 people
    expect(needCause(w, home, 'food')).toBe(null);
    expect(houseStatus(w, home).checklist.find((c) => c.need === 'food').met).toBe(true);   // the checklist's own rule agrees
  });
  it('food: names the nearest empty bazaar, or the nearest one that has grain', () => {
    const { w, home } = street();
    const near = addRaw(w, 'bazaar', 9, 11);                        // 3 road tiles from the home
    const far = addRaw(w, 'bazaar', 17, 11);                        // 6 road tiles from the home
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'bazaar_empty', id: near.id });
    far.store.grain = 10;
    expect(needCause(w, home, 'food')).toEqual({ code: 'next_delivery', id: far.id });
  });
  it('religion: no working temple within reach until a staffed one is', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'religion')).toEqual({ code: 'no_temple', id: null });
    const temple = addRaw(w, 'temple', 17, 11);
    expect(needCause(w, home, 'religion')).toEqual({ code: 'temple_idle', id: temple.id });   // unstaffed
    staffAll(w);
    expect(needCause(w, home, 'religion')).toBe(null);
    temple.paused = true;
    expect(needCause(w, home, 'religion')).toEqual({ code: 'temple_idle', id: temple.id });
  });
  it('keeps no_well, no_bazaar and no_temple for a home no such building reaches, paused or not', () => {
    const { w, home } = street();
    const far = addRaw(w, 'well', 25, 11);                          // 14 road tiles along: out of a well's reach of 5
    far.paused = true;
    addRaw(w, 'bazaar', 28, 11);                                    // unstaffed and out of a bazaar's reach of 10
    addRaw(w, 'temple', 28, 8);
    expect(needCause(w, home, 'water')).toEqual({ code: 'no_well', id: null });
    expect(needCause(w, home, 'food')).toEqual({ code: 'no_bazaar', id: null });
    expect(needCause(w, home, 'religion')).toEqual({ code: 'no_temple', id: null });
  });
  it('food: an empty bazaar with no granary in its supply reach wants a granary; with an empty granary there, grain from farms', () => {
    const { w, home } = street();
    const bazaar = addRaw(w, 'bazaar', 9, 11);
    addRaw(w, 'granary', 30, 11);                                   // 21 road tiles along: out of the bazaar's supply reach of 16
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'bazaar_empty', id: bazaar.id });
    const granary = addRaw(w, 'granary', 4, 11);                    // within its supply reach but holding nothing
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'granary_empty', id: granary.id });
    granary.store.grain = 50;                                       // food in a granary the bazaar can draw on: restocked at month end
    expect(needCause(w, home, 'food')).toEqual({ code: 'next_delivery', id: bazaar.id });
  });
  it('agrees with the checklist: no cause exactly when the row is met, for all four needs, through every state', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 3, residents: 8 });     // a Cottage: the next tier wants water, food and a temple
    const away = addRaw(w, 'house', 12, 5, { tier: 3, residents: 8 });     // touches no road
    let well, bazaar, granary, temple;
    const steps = [
      () => {},
      () => { well = addRaw(w, 'well', 25, 11); },                         // out of reach
      () => { well = addRaw(w, 'well', 15, 11); },
      () => { well.paused = true; },
      () => { well.paused = false; },
      () => { bazaar = addRaw(w, 'bazaar', 9, 11); },                      // unstaffed
      () => { granary = addRaw(w, 'granary', 4, 11); staffAll(w); },       // bazaar working, granary empty
      () => { granary.store.grain = 50; },
      () => { bazaar.store.grain = 40; },
      () => { home.stock.grain = 2; },                                      // fed
      () => { home.stock.grain = 0; bazaar.paused = true; },
      () => { bazaar.paused = false; temple = addRaw(w, 'temple', 17, 11); },
      () => { staffAll(w); },
      () => { temple.paused = true; },
    ];
    for (const step of steps) {
      step();
      for (const h of [home, away]) {
        const rows = houseStatus(w, h).checklist;
        expect(rows.map((c) => c.need)).toEqual(['road', 'water', 'food', 'religion']);
        for (const row of rows) expect(needCause(w, h, row.need) === null).toBe(row.met);
      }
    }
  });
});
