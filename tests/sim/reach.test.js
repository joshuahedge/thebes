import { describe, it, expect } from '../harness.js';
import { touchesRoad, roadReach, buildingsInReach, adjacentRoadTiles, reachCacheSize } from '../../src/sim/reach.js';
import { homesServedFrom } from '../../src/sim/housing.js';
import { idx } from '../../src/sim/grid.js';
import { makeBuilding, insertBuilding } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

describe('reach', () => {
  it('knows whether a building touches a road', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 20, 4);
    expect(touchesRoad(w, { x: 5, y: 5, w: 1, d: 1 })).toBe(true);
    expect(touchesRoad(w, { x: 5, y: 7, w: 1, d: 1 })).toBe(false);
    expect(adjacentRoadTiles(w, { x: 5, y: 5, w: 1, d: 1 })).toEqual([idx(w.size, 5, 4)]);
  });
  it('measures distance along connected roads only', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 20, 4);
    setRoad(w, 0, 20, 20, 20);
    const well = addRaw(w, 'well', 5, 5);
    const r = roadReach(w, well, 5);
    expect(r.get(idx(w.size, 5, 4))).toBe(1);
    expect(r.get(idx(w.size, 9, 4))).toBe(5);
    expect(r.has(idx(w.size, 10, 4))).toBe(false);
    expect(r.has(idx(w.size, 5, 20))).toBe(false);
  });
  it('lists buildings in reach nearest first, excluding itself', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 25, 4);
    const bz = addRaw(w, 'bazaar', 2, 5);
    const near = addRaw(w, 'granary', 8, 5);
    const far = addRaw(w, 'granary', 14, 5);
    addRaw(w, 'granary', 22, 5);
    const found = buildingsInReach(w, bz, 16, (o) => o.type === 'granary');
    expect(found.map((f) => f.b.id)).toEqual([near.id, far.id]);
    expect(found[0].dist).toBeLessThan(found[1].dist);
  });
  it('recomputes after roads change', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 5, 4);
    const well = addRaw(w, 'well', 1, 5);
    expect(roadReach(w, well, 10).has(idx(w.size, 7, 4))).toBe(false);
    setRoad(w, 6, 4, 8, 4);
    expect(roadReach(w, well, 10).has(idx(w.size, 7, 4))).toBe(true);
  });
  it('sorts by distance then id and never lists itself, whatever the insertion order', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 25, 4);
    const far = addRaw(w, 'granary', 14, 5);
    const self = addRaw(w, 'granary', 2, 5);
    const near = addRaw(w, 'granary', 8, 5);
    // Off the road: its footprint's nearest row is y=19 and y=22, so it is never reachable.
    addRaw(w, 'granary', 2, 20);
    const found = buildingsInReach(w, self, 16, (o) => o.type === 'granary');
    expect(found.map((f) => f.b.id)).toEqual([near.id, far.id]);
    expect(found.some((f) => f.b.id === self.id)).toBe(false);
  });
  it('breaks equal distances by id', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 20, 4);
    const well = addRaw(w, 'well', 10, 5);
    // Road distances from the well's road tile (10,4), along y=4:
    // west granary (7,5): nearest road tile (8,4) is 3 steps away.
    // east granary (12,5): nearest road tile (12,4) is 3 steps away. A tie, so the id decides.
    const west = makeBuilding(w, 'granary', 7, 5);
    const east = makeBuilding(w, 'granary', 12, 5);
    insertBuilding(w, east);
    insertBuilding(w, west);
    const found = buildingsInReach(w, well, 16, (o) => o.type === 'granary');
    expect(found.map((f) => f.dist)).toEqual([3, 3]);
    expect(found.map((f) => f.b.id)).toEqual([west.id, east.id]);
  });
  it('previews a ghost anywhere without growing the reach cache, and gives the same answer as the cached rule', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 12, 9);
    addRaw(w, 'house', 13, 9);
    const well = addRaw(w, 'well', 15, 11);
    roadReach(w, well, 5);                                            // a real building's reach is cached as before
    const size = reachCacheSize(w);
    expect(size).toBe(1);
    const counts = [];
    for (let x = 0; x < 32; x++) for (const y of [9, 11]) counts.push(homesServedFrom(w, 'well', x, y));   // a ghost hovered along the street
    expect(reachCacheSize(w)).toBe(size);
    expect(counts.filter((n) => n === 2).length).toBeGreaterThan(4);
    const cached = roadReach(w, { x: 14, y: 9, w: 1, d: 1 }, 5);
    expect([...roadReach(w, { x: 14, y: 9, w: 1, d: 1 }, 5, { cache: false })]).toEqual([...cached]);
    expect(roadReach(w, { x: 14, y: 9, w: 1, d: 1 }, 5, { cache: false }) === cached).toBe(false);
  });
  it('reaches nothing when maxDist is below 1', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 5, 4);
    const well = addRaw(w, 'well', 1, 5);
    expect(roadReach(w, well, 0).size).toBe(0);
  });
});
