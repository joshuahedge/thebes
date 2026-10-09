import { describe, it, expect } from '../harness.js';
import { roadPath, previewRoad, drawRoad, previewHouses, paintHouses, previewDemolishArea, demolishArea, place } from '../../src/sim/commands.js';
import { buildingAt, housesOf } from '../../src/sim/world.js';
import { undo } from '../../src/sim/undo.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

describe('commands: roads', () => {
  it('builds an L-shaped path without duplicates', () => {
    expect(roadPath(0, 0, 2, 2)).toEqual([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]);
    expect(roadPath(0, 0, 2, 2, true)).toEqual([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]);
    expect(roadPath(3, 3, 3, 3)).toEqual([[3, 3]]);
  });
  it('previews cost for new tiles only', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 5, 3, 5);
    const p = previewRoad(w, 0, 5, 6, 5);
    expect(p.ok).toBe(true);
    expect(p.tiles.length).toBe(3);
    expect(p.cost).toBe(6);
  });
  it('draws, charges and undoes', () => {
    const w = makeTestWorld({ gold: 100 });
    const r = drawRoad(w, 0, 5, 9, 5);
    expect(r.ok).toBe(true);
    expect(w.gold).toBe(80);
    expect(w.road[idx(w.size, 9, 5)]).toBe(1);
    undo(w);
    expect(w.road[idx(w.size, 9, 5)]).toBe(0);
    expect(w.gold).toBe(100);
  });
  it('refuses paths through buildings or water', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    expect(previewRoad(w, 10, 9, 15, 9).reason).toBe('blocked');
    w.terrain[idx(w.size, 20, 20)] = 3;
    expect(previewRoad(w, 18, 20, 22, 20).reason).toBe('water');
  });
});

describe('commands: area painting', () => {
  it('paints plots on free tiles only, charging once with one undo', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const pv = previewHouses(w, 10, 9, 14, 11);
    expect(pv.positions.length).toBe(10);
    expect(pv.cost).toBe(50);
    const r = paintHouses(w, 14, 11, 10, 9);
    expect(r.ids.length).toBe(10);
    expect(w.gold).toBe(950);
    expect(w.undo.length).toBe(1);
    undo(w);
    expect(housesOf(w).length).toBe(0);
    expect(w.gold).toBe(1000);
  });
  it('reports nothing to place', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(paintHouses(w, 0, 10, 5, 10).reason).toBe('nothing_to_place');
  });
  it('demolishes an area with one undo that restores everything', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    paintHouses(w, 12, 11, 13, 11);
    const pv = previewDemolishArea(w, 12, 9, 13, 11);
    expect(pv.buildingIds.length).toBe(3);
    expect(pv.roadTiles.length).toBe(2);
    expect(pv.refund).toBe(30);
    const goldBefore = w.gold;
    const r = demolishArea(w, 12, 9, 13, 11);
    expect(r.count).toBe(5);
    expect(w.gold).toBe(goldBefore + 30);
    undo(w);
    expect(buildingAt(w, 12, 8).type).toBe('temple');
    expect(w.road[idx(w.size, 12, 10)]).toBe(1);
    expect(w.gold).toBe(goldBefore);
  });
});
