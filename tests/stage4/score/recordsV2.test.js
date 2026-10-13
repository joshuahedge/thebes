import { describe, it, expect } from '../../harness.js';
import { createRecords, mergeRecords, normalizeRecords } from '../../../src/save/records.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { createWorld } from '../../../src/sim/world.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
// Month-end rows: a v1 row has four parts and no version (MIGRATIONS[4] marks them 1; a missing one reads as 1); a v2 row
// five parts and version 2. Each part is the score's share, so the medal follows the score on its own scale.
const v1 = (day, score) => ({ day, people: 0, gold: 0, mood: 60, score, parts: { people: score / 4, prosperity: score / 4, culture: score / 4, safety: score / 4 } });
const v2 = (day, score) => ({ day, people: 0, gold: 0, mood: 60, score, parts: { people: score / 5, prosperity: score / 5, culture: score / 5, safety: score / 5, monuments: score / 5 }, version: 2 });
function city(history, { id = 'a', seed = 11 } = {}) {
  const w = createWorld({ seed, difficulty: 'normal', cityId: id });
  w.history = history;
  return w;
}

describe('s4 score records', () => {
  it('keeps a city\'s v1 best as older scoring beside its first v2 best, each with its own medal, never one against the other', () => {
    const storage = memory();
    const r = createRecords({ storage });
    r.noteCity(city([v1(30, 300), v1(60, 250)]), 1);                  // a Stage 3 city, before any v2 month end
    expect(r.load().cities[0]).toEqual({ id: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', scoreVersion: 1, best: 300, bestDay: 30, medal: 'silver', splits: {}, updated: 1 });   // 300 of 400: v1's silver
    r.noteCity(city([v1(60, 250), v2(90, 250)]), 2);                  // its first v2 month: 250 is bronze under v2
    expect(r.load().cities[0]).toEqual({ id: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', scoreVersion: 2, best: 250, bestDay: 90, medal: 'bronze', splits: {}, updated: 2,
      older: { best: 300, bestDay: 30, medal: 'silver', scoreVersion: 1 } });
    r.noteCity(city([v2(120, 280)]), 3);                              // the v1 rows have left the 12 rows: the older best stays
    expect([r.load().cities[0].best, r.load().cities[0].older]).toEqual([280, { best: 300, bestDay: 30, medal: 'silver', scoreVersion: 1 }]);
    expect(r.bests()).toEqual([
      { seed: 11, difficulty: 'normal', score: 300, medal: 'silver', version: 1, older: true },
      { seed: 11, difficulty: 'normal', score: 280, medal: 'bronze', version: 2, older: false },
    ]);
    expect([r.bestFor(11, 'normal').score, r.bestFor(11, 'normal', { version: 1 }).score, r.bestFor(11, 'normal', { except: 'a' })]).toEqual([280, 300, null]);
  });
  it('merges an imported Stage 3 row into a Stage 4 one by version, and drops an older best that is not older', () => {
    const stage3 = { version: 1, cities: [{ id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 1, best: 320, bestDay: 60, medal: 'gold', splits: { town: 300 }, updated: 1 }], chronicle: [] };
    const stage4 = { version: 1, cities: [{ id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 210, bestDay: 900, medal: 'bronze', splits: { town: 400, city: 800 }, updated: 2 }], chronicle: [] };
    const m = mergeRecords(stage3, stage4);
    expect(m.cities).toEqual([{ id: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', scoreVersion: 2, best: 210, bestDay: 900, medal: 'bronze', splits: { town: 300, city: 800 }, updated: 2,
      older: { best: 320, bestDay: 60, medal: 'gold', scoreVersion: 1 } }]);
    const odd = normalizeRecords({ cities: [{ ...stage4.cities[0], older: { best: 400, bestDay: 1, medal: 'gold', scoreVersion: 2 } }] });
    expect(odd.cities[0].older).toBe(undefined);
  });
  it('keeps a v1 seal\'s four parts, and lists each finished mastaba and pyramid for the stamp', () => {
    const r = createRecords({ storage: memory() });
    const w = makeTestWorld();
    w.cityId = 'a';
    for (const [type, x, done] of [['pyramid_small', 2, 900], ['mastaba_small', 8, 300], ['mastaba_small', 12, null], ['colossus', 16, 200], ['mastaba_small', 20, 500]]) {
      Object.assign(addRaw(w, type, x, 20).site, { done });
    }
    w.seals.push({ day: 1000, score: 330, parts: { people: 70, prosperity: 70, culture: 70, safety: 70, monuments: 50 }, medal: 'silver', version: 2 });
    const e = r.addSeal(w, w.seals[0], 5);
    expect([e.parts, e.built]).toEqual([{ people: 70, prosperity: 70, culture: 70, safety: 70, monuments: 50 }, ['mastaba_small', 'mastaba_small', 'pyramid_small']]);
    w.seals.push({ day: 1, score: 200, parts: { people: 50, prosperity: 50, culture: 50, safety: 50 }, medal: 'bronze', version: 1 });
    const old = normalizeRecords({ chronicle: [{ ...e, id: 'old', ...w.seals[1] }] }).chronicle[0];
    expect([old.parts, old.version]).toEqual([{ people: 50, prosperity: 50, culture: 50, safety: 50 }, 1]);
    expect(normalizeRecords({ chronicle: [{ ...e, built: ['colossus', 'nonsense'] }] }).chronicle[0].built).toBe(undefined);   // only mastabas and pyramids
  });
});
