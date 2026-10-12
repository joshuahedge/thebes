import { describe, it, expect } from '../../harness.js';
import { raidDay, raidWealth } from '../../../src/sim/raids.js';
import { canBurn, igniteBuilding } from '../../../src/sim/fire.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { RAIDS } from '../../../src/data/raids.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const EAST = { x: 31, y: 16 };

// A Capital raided from the east (31, 16) only, with a road along y = 13 (as Stage 3's raid tests).
function city(gold = 0) {
  const w = makeTestWorld({ gold, raiderEntries: [EAST] });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'capital';
  return w;
}

describe('s4 sim monuments and the palace are safe from danger', () => {
  it('leaves monuments, sites and the palace out of the city\'s wealth', () => {
    const w = city(0);
    addRaw(w, 'colossus', 20, 15);
    const done = addRaw(w, 'obelisk_small', 24, 15);
    Object.assign(done.site, { course: 3, done: 4 });
    addRaw(w, 'palace', 26, 15, { style: 3 });
    expect(raidWealth(w)).toBe(0);
    addRaw(w, 'well', 10, 14);
    expect(raidWealth(w)).toBe(BUILDINGS.well.cost);
  });

  it('never sends raiders for a monument, a site or the palace, even the nearest buildings to their entry', () => {
    const w = city(1000);
    addRaw(w, 'colossus', 28, 15);                                                // right by the entry
    const done = addRaw(w, 'obelisk_large', 29, 18);
    Object.assign(done.site, { course: 4, done: 4, extraPaid: true });
    addRaw(w, 'palace', 24, 15);
    const well = addRaw(w, 'well', 8, 14);
    w.raid.index = 1;
    w.raid.warning = { index: 0, entry: { ...EAST }, dir: 'east', size: RAIDS.firstSize, tribute: null, target: 'building', day: 1000 - RAIDS.warningDays, arrives: 1000, first: true };
    w.day = 1000;
    const events = [];
    raidDay(w, events);
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    expect(events.filter((e) => e.type === 'raid_strike').map((e) => e.id)).toEqual([well.id]);
  });

  it('never burns a monument, a site or the palace', () => {
    const w = city();
    const s = addRaw(w, 'pyramid_small', 12, 15), pal = addRaw(w, 'palace', 20, 15);
    expect([canBurn(s), canBurn(pal), igniteBuilding(w, s.id), igniteBuilding(w, pal.id), s.fire, pal.fire]).toEqual([false, false, false, false, null, null]);
  });
});
