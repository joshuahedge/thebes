import { describe, it, expect } from '../harness.js';
import { generateMap } from '../../src/sim/mapgen.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

const count = (m, t) => m.terrain.filter((v) => v === t).length;

describe('mapgen', () => {
  it('is deterministic for a seed', () => {
    expect(generateMap(5).terrain).toEqual(generateMap(5).terrain);
  });
  it('differs between seeds', () => {
    expect(JSON.stringify(generateMap(5).terrain) === JSON.stringify(generateMap(6).terrain)).toBe(false);
  });
  it('builds a 64x64 grid by default', () => {
    expect(generateMap(1).terrain.length).toBe(64 * 64);
  });
  it('guarantees a river, fertile land and rocky ground for many seeds', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = generateMap(seed);
      expect(count(m, T.WATER)).toBeGreaterThan(64);
      expect(count(m, T.FERTILE)).toBeGreaterThanOrEqual(200);
      expect(count(m, T.ROCKY)).toBeGreaterThanOrEqual(20);
    }
  });
  it('lays a buildable start road from the south edge', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = generateMap(seed);
      expect(m.startRoad.length).toBe(9);
      expect(m.startRoad[0]).toEqual([m.tradeEntry.x, m.size - 1]);
      for (const [x, y] of m.startRoad) {
        const t = m.terrain[idx(m.size, x, y)];
        expect(t === T.WATER || t === T.ROCKY).toBe(false);
      }
    }
  });
  it('puts the focus point inside the map', () => {
    const m = generateMap(3);
    expect(m.focus.x).toBeGreaterThanOrEqual(0);
    expect(m.focus.x).toBeLessThan(64);
    expect(m.focus.y).toBeGreaterThanOrEqual(0);
    expect(m.focus.y).toBeLessThan(64);
  });
});
