import { describe, it, expect } from '../harness.js';
import { touchesRoad, roadReach, buildingsInReach, adjacentRoadTiles } from '../../src/sim/reach.js';
import { idx } from '../../src/sim/grid.js';
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
});
