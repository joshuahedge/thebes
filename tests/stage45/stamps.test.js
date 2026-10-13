// Task 3 review: a score stamp draws the map its city really had (the record's mapVariant), and a record from before
// Stage 4.5 (no mapVariant) is a classic one.
import { describe, it, expect } from '../harness.js';
import { generateMap, variantFor } from '../../src/sim/mapgen.js';
import { stampMap } from '../../src/ui/scoreUi.js';
import { createRecords, normalizeRecords } from '../../src/save/records.js';
import { createWorld } from '../../src/sim/world.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
// A seed whose own layout is not the classic one.
const SEED = Array.from({ length: 40 }, (_, k) => k + 1).find((s) => variantFor(s) !== 'classic');
const same = (a, b) => a.size === b.size && a.terrain.every((t, i) => t === b.terrain[i]);

describe('s45 stamps (the map a stamp draws)', () => {
  it('a classic stamp on a seed whose own layout is another is the classic map, and a variant stamp is that variant', () => {
    expect(SEED !== undefined).toBe(true);
    expect(same(stampMap(SEED, 'classic'), generateMap(SEED, undefined, 'classic'))).toBe(true);
    expect(same(stampMap(SEED, 'classic'), generateMap(SEED, undefined, variantFor(SEED)))).toBe(false);
    expect(same(stampMap(SEED, variantFor(SEED)), generateMap(SEED, undefined, variantFor(SEED)))).toBe(true);
  });
  it('a stamp with no variant is classic', () => {
    expect(same(stampMap(SEED), generateMap(SEED, undefined, 'classic'))).toBe(true);
  });
  it('records keep the city\'s mapVariant on its row and on each seal, and read a missing or unknown one as classic', () => {
    const records = createRecords({ storage: memory() });
    const w = createWorld({ seed: SEED, cityId: 'c1', mapVariant: 'island' });
    records.noteCity(w, 1);
    w.seals = [];
    w.feats = { earned: [] };
    const entry = records.addSeal(w, { day: 5, score: 100, parts: {}, medal: null, version: 2 }, 2);
    expect(records.stamps()[0].mapVariant).toBe('island');
    expect(entry.mapVariant).toBe('island');
    const raw = { cities: [{ id: 'old', seed: 4, difficulty: 'normal' }, { id: 'odd', seed: 4, difficulty: 'normal', mapVariant: 'swamp' }],
      chronicle: [{ id: 'e1', cityId: 'old', seed: 4, difficulty: 'normal', score: 10 }] };
    const n = normalizeRecords(raw);
    expect([n.cities[0].mapVariant, n.cities[1].mapVariant, n.chronicle[0].mapVariant]).toEqual(['classic', 'classic', 'classic']);
    expect(normalizeRecords({ cities: [{ id: 'x', seed: 4, difficulty: 'normal', mapVariant: 'oasis' }] }).cities[0].mapVariant).toBe('oasis');
  });
});
