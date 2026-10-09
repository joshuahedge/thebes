import { describe, it, expect } from '../harness.js';
import { serialize, deserialize } from '../../src/save/serialize.js';
import { migrate, CURRENT_VERSION } from '../../src/save/migrate.js';
import { createWorld, population } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';

// Returns the error message thrown by fn, or null if fn did not throw.
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

function scriptedWorld(seed) {
  const w = createWorld({ seed });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  return w;
}

describe('save', () => {
  it('round-trips a world exactly', () => {
    const w = scriptedWorld(7);
    advanceDays(w, 75);
    expect(population(w)).toBeGreaterThan(0);
    expect(deserialize(serialize(w))).toEqual(w);
  });
  it('rejects corrupt and future saves', () => {
    expect(() => deserialize('{not json')).toThrow();
    expect(() => deserialize(JSON.stringify({ version: 1 }))).toThrow();
    expect(() => migrate({ version: CURRENT_VERSION + 1 })).toThrow();
    expect(() => migrate({})).toThrow();
  });
  it('passes current saves through migrate unchanged', () => {
    const w = createWorld({ seed: 3 });
    expect(migrate(JSON.parse(serialize(w)))).toEqual(w);
  });
  it('reports corrupt_save for text that is not JSON', () => {
    expect(code(() => deserialize('{not json'))).toBe('corrupt_save');
  });
  it('reports newer_version before checking shape', () => {
    expect(code(() => deserialize(JSON.stringify({ version: CURRENT_VERSION + 1, totally: 'different' })))).toBe('newer_version');
  });
  it('reports corrupt_save for a current-version save with missing fields', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 1 })))).toBe('corrupt_save');
  });
  it('reports corrupt_save for a terrain length mismatch', () => {
    const bad = JSON.parse(serialize(createWorld({ seed: 3 })));
    bad.terrain.pop();
    expect(code(() => deserialize(JSON.stringify(bad)))).toBe('corrupt_save');
  });
});

describe('migrate', () => {
  it('reports not_a_save when there is no integer version', () => {
    expect(code(() => migrate({}))).toBe('not_a_save');
    expect(code(() => migrate({ version: NaN }))).toBe('not_a_save');
  });
  it('reports no_migration for a version with no step', () => {
    expect(code(() => migrate({ version: 0 }))).toBe('no_migration_0');
  });
  it('chains steps in order up to the target', () => {
    const table = { 1: (w) => ({ ...w, version: 2, b: w.a + 1 }), 2: (w) => ({ ...w, version: 3, c: w.b * 2 }) };
    expect(migrate({ version: 1, a: 1 }, table, 3)).toEqual({ version: 3, a: 1, b: 2, c: 4 });
  });
  it('reports a gap in the chain', () => {
    expect(code(() => migrate({ version: 1 }, { 1: (w) => ({ ...w, version: 2 }) }, 3))).toBe('no_migration_2');
  });
  it('reports a migration that does not bump the version', () => {
    expect(code(() => migrate({ version: 1 }, { 1: (w) => w }, 2))).toBe('bad_migration_1');
  });
});

describe('determinism', () => {
  it('gives identical worlds for the same seed and commands', () => {
    const a = scriptedWorld(11), b = scriptedWorld(11);
    advanceDays(a, 200);
    advanceDays(b, 200);
    expect(serialize(a)).toBe(serialize(b));
  });
  it('continues identically after a save and load', () => {
    const straight = scriptedWorld(12);
    advanceDays(straight, 150);
    const interrupted = scriptedWorld(12);
    advanceDays(interrupted, 70);
    const reloaded = deserialize(serialize(interrupted));
    advanceDays(reloaded, 80);
    expect(serialize(reloaded)).toBe(serialize(straight));
  });
});
