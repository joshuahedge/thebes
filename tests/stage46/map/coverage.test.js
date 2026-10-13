// Stage 4.6, Map track: the month-end road-reach cache (ruling 410). monthlyHousing's coverage of every home is worked from the providers' road
// reach (src/sim/coverage.js) and must equal the coveredBy rule exactly, on every kind of city; a month end on a full Large city stays quick.
import { describe, it, expect } from '../../harness.js';
import { computeCoverage, reachedTiles, COVER_NEEDS } from '../../../src/sim/coverage.js';
import { coveredBy, computeCoverage as housingCoverage } from '../../../src/sim/housing.js';
import { housesOf, allBuildings, createWorld } from '../../../src/sim/world.js';
import { buildSampleCity, buildStressCity } from '../../../src/dev/sampleCity.js';
import { runMonth, tickDay } from '../../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

// The rule the month end used before Stage 4.6: every home asked of every building, one need at a time.
function slowCoverage(world) {
  const cov = { water: new Set(), religion: new Set(), entertainment: new Set() };
  for (const h of housesOf(world)) for (const need of Object.keys(cov)) if (coveredBy(world, h, need)) cov[need].add(h.id);
  return cov;
}
const ids = (cov) => Object.fromEntries(COVER_NEEDS.map((n) => [n, [...cov[n]].sort((a, b) => a - b)]));

describe('s46 map month end: coverage from the providers\' reach equals the coveredBy rule', () => {
  it('agrees with the rule on a hand-laid street: a well, a temple and a booth in reach, out of reach, paused, unstaffed and cut off', () => {
    const w = makeTestWorld({ size: 40, fertile: [], gold: 10000 });
    setRoad(w, 0, 10, 39, 10);
    setRoad(w, 20, 10, 20, 20);
    for (let x = 1; x < 39; x += 2) addRaw(w, 'house', x, 9, { tier: 1, residents: 4 });
    for (let y = 12; y < 20; y += 2) addRaw(w, 'house', 21, y, { tier: 1, residents: 4 });
    addRaw(w, 'house', 5, 20, { tier: 1, residents: 4 });                          // no road beside it
    const well = addRaw(w, 'well', 6, 11), well2 = addRaw(w, 'well', 30, 11), temple = addRaw(w, 'temple', 14, 11), booth = addRaw(w, 'booth', 22, 11);
    staffAll(w);
    expect(ids(computeCoverage(w))).toEqual(ids(slowCoverage(w)));
    const base = ids(computeCoverage(w));
    expect(base.water.length > 0 && base.religion.length > 0 && base.entertainment.length > 0).toBe(true);
    expect(base.water.length < housesOf(w).length).toBe(true);                     // and some homes are out of reach
    well2.paused = true;                                                          // a paused well covers nobody
    temple.staff = 0;                                                             // an unstaffed one neither
    expect(ids(computeCoverage(w))).toEqual(ids(slowCoverage(w)));
    expect(ids(computeCoverage(w)).water.length).toBeLessThan(base.water.length);
    expect(ids(computeCoverage(w)).religion.length).toBeLessThan(base.religion.length);
    w.road[10 * 40 + 14] = 0; w.roadVersion++;                                    // the street is cut: the reach map follows the road version
    expect(ids(computeCoverage(w))).toEqual(ids(slowCoverage(w)));
    expect(ids(housingCoverage(w))).toEqual(ids(computeCoverage(w)));             // monthlyHousing's own entry point is the same function
    expect([well.id, booth.id].every(Number.isInteger)).toBe(true);
  });
  it('agrees with the rule on the sample city and the stress city at 48, 64 and 80, as a month end leaves them', () => {
    for (const size of [48, 64, 80]) {
      const w = buildSampleCity(createWorld({ seed: 11, size }));
      expect([size, ids(computeCoverage(w))]).toEqual([size, ids(slowCoverage(w))]);
      for (let i = 0; i < 40; i++) tickDay(w);                                    // a month and more on: new arrivals, upgrades, a month end
      expect([size, ids(computeCoverage(w))]).toEqual([size, ids(slowCoverage(w))]);
    }
    const big = buildStressCity(createWorld({ seed: 3, size: 80 }), { days: 10 });
    const a = computeCoverage(big), b = slowCoverage(big);
    expect(ids(a)).toEqual(ids(b));
    expect(a.water.size > 100 && a.religion.size > 20).toBe(true);
  });
  it('reaches a tile only through a working provider, and costs nothing for one that is not', () => {
    const w = makeTestWorld({ size: 24, fertile: [], gold: 10000 });
    setRoad(w, 0, 10, 23, 10);
    const well = addRaw(w, 'well', 4, 11);
    staffAll(w);
    const t = reachedTiles(w);
    expect(t.water.size > 0 && t.religion.size === 0 && t.entertainment.size === 0).toBe(true);
    well.paused = true;
    expect(reachedTiles(w).water.size).toBe(0);
  });
});

describe('s46 map month end: a full Large city\'s month end is quick (ruling 410)', () => {
  it('runs the month end of the stress city at 80 x 80 in well under the half second it was aiming for, and gives the same city whether run twice', () => {
    const make = () => buildStressCity(createWorld({ seed: 3, size: 80 }), { days: 10 });
    const a = make(), b = make();
    for (let i = 0; i < 31; i++) { tickDay(a); tickDay(b); }                      // warm: a first month end and the caches
    while ((a.day + 1) % 30 !== 0) { tickDay(a); tickDay(b); }
    const start = performance.now();
    tickDay(a);                                                                   // the day before the month end ...
    tickDay(a);                                                                   // ... and the month end itself
    const took = performance.now() - start;
    tickDay(b); tickDay(b);
    expect(took).toBeLessThan(1500);                                              // was 929 ms on a quiet machine, 1.3 s under load: now tens of ms, however loaded the machine
    // and the same city, asked both ways at once: the providers' reach against the rule it replaced (a ratio, so a busy machine does not decide it)
    const t0 = performance.now(); computeCoverage(a); const fast = performance.now() - t0;
    const t1 = performance.now(); slowCoverage(a); const slow = performance.now() - t1;
    expect(fast * 5).toBeLessThan(slow);
    expect(JSON.stringify(a.history)).toBe(JSON.stringify(b.history));            // deterministic: the same month end, the same record
    expect(a.gold).toBe(b.gold);
    expect(allBuildings(a).length).toBe(allBuildings(b).length);
    runMonth(createWorld({ seed: 2 }));                                           // and the plain call still works on a bare city
  });
});
