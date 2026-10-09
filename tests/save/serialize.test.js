import { describe, it, expect } from '../harness.js';
import { serialize, deserialize } from '../../src/save/serialize.js';
import { migrate, CURRENT_VERSION } from '../../src/save/migrate.js';
import { createWorld } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';

function scriptedWorld(seed) {
  const w = createWorld({ seed });
  const { x, y } = w.focus;
  drawRoad(w, x - 6, y, x + 6, y);
  paintHouses(w, x - 5, y + 1, x + 5, y + 1);
  place(w, 'well', x, y - 1);
  return w;
}

describe('save', () => {
  it('round-trips a world exactly', () => {
    const w = scriptedWorld(7);
    advanceDays(w, 75);
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
