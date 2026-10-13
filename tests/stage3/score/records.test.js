import { describe, it, expect } from '../../harness.js';
import { createRecords, emptyRecords, mergeRecords, normalizeRecords } from '../../../src/save/records.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { createWorld } from '../../../src/sim/world.js';

// A storage that keeps what is written, as localStorage does.
function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const parts = (n) => ({ people: n, prosperity: n, culture: n, safety: n });
// A city with month-end rows of these scores (each row's parts are a quarter of its score, so on Normal the medal follows).
function city({ seed = 11, difficulty = 'normal', id = 'a', scores = [], splits = {} } = {}) {
  const w = createWorld({ seed, difficulty, cityId: id });
  w.history = scores.map((score, i) => ({ day: (i + 1) * 30, people: 0, gold: 0, mood: 60, score, parts: parts(score / 4) }));
  w.splits = splits;
  return w;
}

describe('s3 score records', () => {
  it('reads nothing, garbage and blocked storage as empty records, and never throws on a failed write', () => {
    expect(createRecords({ storage: memory() }).load()).toEqual(emptyRecords());
    const junk = { getItem: () => '{not json', setItem: () => {} };
    expect(createRecords({ storage: junk }).load()).toEqual(emptyRecords());
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    const r = createRecords({ storage: blocked });
    expect(r.load()).toEqual(emptyRecords());
    r.noteCity(city({ scores: [100] }), 5);
    r.addSeal(city(), { day: 1, score: 1, parts: parts(0), medal: null, version: 1 }, 5);
    expect(r.bests()).toEqual([]);
    expect(createRecords({ storage: null }).load()).toEqual(emptyRecords());
  });
  it('notes a city row on every save: seed, level, version, the best month-end score with its medal, and the splits', () => {
    const storage = memory();
    const r = createRecords({ storage });
    const w = city({ scores: [100, 240, 200], splits: { town: 300 } });
    r.noteCity(w, 1000);
    // The rows carry no version, so they are score v1 rows (Stage 4): the best keeps v1 and v1's medal (240 of 400 is silver).
    expect(r.load().cities).toEqual([{ id: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', scoreVersion: 1, best: 240, bestDay: 60, medal: 'silver', splits: { town: 300 }, updated: 1000 }]);
    w.history = [{ day: 400, people: 0, gold: 0, mood: 60, score: 150, parts: parts(37.5) }];   // the 240 has left the 12 rows
    w.splits.market_town = 500;
    r.noteCity(w, 2000);
    expect(r.load().cities[0]).toEqual({ id: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', scoreVersion: 1, best: 240, bestDay: 60, medal: 'silver', splits: { town: 300, market_town: 500 }, updated: 2000 });
    r.noteCity(city({ id: 'b', scores: [] }), 3000);                       // no month end yet: a row, but no best
    expect(r.load().cities[1].best).toBe(null);
    r.noteCity({ ...w, cityId: null }, 4000);                             // no id: nothing
    expect(r.load().cities.length).toBe(2);
    expect(JSON.parse(storage.data[RECORDS_KEY]).version).toBe(1);
  });
  it('lists the highest bests, one per seed and level, and labels a best made under an older score version', () => {
    const r = createRecords({ storage: memory({ version: 1, cities: [
      { id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 312, bestDay: 900, medal: 'gold', splits: {}, updated: 1 },
      { id: 'b', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 200, bestDay: 900, medal: 'bronze', splits: {}, updated: 2 },
      { id: 'c', seed: 11, difficulty: 'hard', scoreVersion: 2, best: 250, bestDay: 900, medal: 'bronze', splits: {}, updated: 3 },
      { id: 'd', seed: 7, difficulty: 'relaxed', scoreVersion: 0, best: 280, bestDay: 900, medal: 'gold', splits: {}, updated: 4 },
      { id: 'e', seed: 8, difficulty: 'normal', scoreVersion: 2, best: 100, bestDay: 900, medal: null, splits: {}, updated: 5 },
      { id: 'f', seed: 9, difficulty: 'normal', scoreVersion: 2, best: null, splits: {}, updated: 6 },
    ], chronicle: [] }) });
    expect(r.bests()).toEqual([
      { seed: 11, difficulty: 'normal', score: 312, medal: 'gold', version: 2, older: false },
      { seed: 7, difficulty: 'relaxed', score: 280, medal: 'gold', version: 0, older: true },
      { seed: 11, difficulty: 'hard', score: 250, medal: 'bronze', version: 2, older: false },
    ]);
    expect(r.bests(10).length).toBe(4);
    expect(r.bestFor(11, 'normal', { except: 'a' })).toEqual({ score: 200, splits: {} });
    expect(r.bestFor(11, 'peaceful')).toBe(null);
  });
  it('gives the best splits on a seed and level from the other cities, the earliest day of each milestone', () => {
    const r = createRecords({ storage: memory() });
    r.noteCity(city({ id: 'a', scores: [120], splits: { town: 400, market_town: 900 } }), 1);
    r.noteCity(city({ id: 'b', scores: [90], splits: { town: 500, market_town: 700 } }), 2);
    r.noteCity(city({ id: 'c', scores: [300], splits: { town: 100 } }), 3);
    expect(r.bestFor(11, 'normal', { except: 'c', version: 1 })).toEqual({ score: 120, splits: { town: 400, market_town: 700 } });   // Stage 4: v1 rows, a v1 best
  });
  it('adds a chronicle entry for each seal, with the city\'s splits, feats and the device\'s date, newest first as stamps', () => {
    const r = createRecords({ storage: memory() });
    const w = city({ splits: { town: 300 } });
    w.feats.earned = ['swift_town'];
    w.seals.push({ day: 800, score: 247, parts: { people: 72, prosperity: 65, culture: 58, safety: 52 }, medal: 'silver', version: 1 });
    const e = r.addSeal(w, w.seals[0], 5000);
    expect(e).toEqual({ id: 'a:1:800', cityId: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', day: 800, score: 247, parts: { people: 72, prosperity: 65, culture: 58, safety: 52 },   // a v1 seal keeps v1's four parts
      splits: { town: 300 }, medal: 'silver', feats: ['swift_town'], version: 1, date: 5000 });
    w.seals.push({ day: 900, score: 250, parts: parts(62.5), medal: 'silver', version: 1 });
    r.addSeal(w, w.seals[1], 6000);
    expect(r.stamps().map((x) => x.id)).toEqual(['a:2:900', 'a:1:800']);
    expect(r.load().chronicle.length).toBe(2);
  });
  it('merges an imported file by id: the better best, the earlier splits, each entry once, and drops what is not a record', () => {
    const mine = { version: 1, cities: [{ id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 1, best: 200, bestDay: 60, medal: 'bronze', splits: { town: 400 }, updated: 10 }],
      chronicle: [{ id: 'a:1:60', cityId: 'a', seed: 11, difficulty: 'normal', day: 60, score: 200, parts: parts(50), splits: {}, medal: 'bronze', feats: [], version: 1, date: 10 }] };
    const theirs = { version: 1, cities: [
      { id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 1, best: 260, bestDay: 90, medal: 'silver', splits: { town: 450, market_town: 800 }, updated: 5 },
      { id: 'z', seed: 3, difficulty: 'hard', scoreVersion: 1, best: 50, bestDay: 30, medal: null, splits: {}, updated: 1 },
      { id: 'bad', seed: 'eleven', difficulty: 'normal' }, 'nonsense',
    ], chronicle: [mine.chronicle[0], { id: 'z:1:30', cityId: 'z', seed: 3, difficulty: 'hard', day: 30, score: 50, parts: parts(10), splits: {}, medal: null, feats: [], version: 1, date: 1 }, { id: 'x' }] };
    const m = mergeRecords(mine, theirs);
    expect(m.cities.map((c) => c.id)).toEqual(['a', 'z']);
    expect(m.cities[0]).toEqual({ id: 'a', seed: 11, difficulty: 'normal', mapVariant: 'classic', scoreVersion: 1, best: 260, bestDay: 90, medal: 'silver', splits: { town: 400, market_town: 800 }, updated: 10 });
    expect(m.chronicle.map((e) => e.id)).toEqual(['a:1:60', 'z:1:30']);
    const storage = memory(mine);
    createRecords({ storage }).merge(theirs);
    expect(createRecords({ storage }).load()).toEqual(m);
    expect(normalizeRecords('junk')).toEqual(emptyRecords());
  });
  it('keeps at most the cap in each list, dropping the oldest first but never a best', () => {
    const storage = memory();
    const r = createRecords({ storage, max: 3 });
    r.noteCity(city({ id: 'old-best', scores: [300], splits: { town: 200 } }), 1);   // the oldest, but the best score and the earliest Town
    for (let i = 0; i < 4; i++) r.noteCity(city({ id: `c${i}`, scores: [100 + i], splits: { town: 900 + i } }), 10 + i);
    expect(r.load().cities.map((c) => c.id)).toEqual(['old-best', 'c2', 'c3']);
    const w = city({ id: 'x' });
    for (let i = 0; i < 5; i++) {
      w.seals.push({ day: i, score: i === 0 ? 400 : 10 + i, parts: parts(i), medal: null, version: 1 });
      r.addSeal(w, w.seals[i], 100 + i);
    }
    expect(r.load().chronicle.map((e) => e.score)).toEqual([400, 13, 14]);
  });
});
