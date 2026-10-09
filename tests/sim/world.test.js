import { describe, it, expect } from '../harness.js';
import { createWorld, buildingAt, population, makeBuilding, insertBuilding, removeBuilding, allBuildings, WORLD_VERSION } from '../../src/sim/world.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

describe('world', () => {
  it('creates a world from a seed with the start road laid', () => {
    const w = createWorld({ seed: 4 });
    expect(w.version).toBe(WORLD_VERSION);
    expect(w.size).toBe(64);
    expect(w.gold).toBe(2000);
    expect(w.day).toBe(0);
    expect(w.speed).toBe(0);
    const [x, y] = [w.tradeEntry.x, w.tradeEntry.y];
    expect(w.road[idx(64, x, y)]).toBe(1);
  });
  it('inserts and removes buildings and tracks occupancy', () => {
    const w = makeTestWorld();
    const b = insertBuilding(w, makeBuilding(w, 'granary', 10, 10));
    expect(buildingAt(w, 11, 11).id).toBe(b.id);
    expect(allBuildings(w).length).toBe(1);
    removeBuilding(w, b.id);
    expect(buildingAt(w, 11, 11)).toBe(null);
  });
  it('gives houses residents and counts population', () => {
    const w = makeTestWorld();
    addRaw(w, 'house', 3, 3, { tier: 1, residents: 5 });
    addRaw(w, 'house', 4, 3, { tier: 2, residents: 7 });
    expect(population(w)).toBe(12);
  });
  it('lays straight roads in the test helper', () => {
    const w = makeTestWorld();
    setRoad(w, 2, 5, 6, 5);
    expect(w.road[idx(w.size, 4, 5)]).toBe(1);
    expect(w.roadVersion).toBe(1);
  });
  it('is JSON-safe', () => {
    const w = createWorld({ seed: 2 });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
});
