import { describe, it, expect } from '../harness.js';
import { roadPath, previewRoad, drawRoad, previewHouses, paintHouses, previewDemolishArea, demolishArea, place, rectTiles, previewRoadTiles, drawRoadTiles, previewHouseTiles, paintHouseTiles, previewDemolishTiles, demolishTiles } from '../../src/sim/commands.js';
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
  it('bumps roadVersion on draw and again on undo', () => {
    const w = makeTestWorld({ gold: 100 });
    const v0 = w.roadVersion;
    drawRoad(w, 0, 5, 3, 5);
    const v1 = w.roadVersion;
    expect(v1).toBeGreaterThan(v0);
    undo(w);
    expect(w.roadVersion).toBeGreaterThan(v1);
  });
  it('rejects non-integer and off-map endpoints without hanging', () => {
    const w = makeTestWorld();
    expect(previewRoad(w, 0.5, 5, 3, 5).reason).toBe('out_of_bounds');
    expect(previewRoad(w, 0, 5, 99, 5).reason).toBe('out_of_bounds');
  });
  it('returns no path for non-integer endpoints instead of looping forever', () => {
    expect(roadPath(0.5, 0, 3, 0)).toEqual([]);
    expect(roadPath(0, 0, 3, 0.5)).toEqual([]);
    expect(roadPath(0, 0, 3, 3, true)).toEqual([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3]]);
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
  it('ignores non-integer rectangles and never writes ghost tiles', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(rectTiles(0.5, 6, 2.5, 6)).toEqual([]);
    expect(paintHouses(w, 0.5, 6, 2.5, 6).reason).toBe('nothing_to_place');
    expect(paintHouses(w, 1, 6, 2, 6.5).reason).toBe('nothing_to_place');
    for (const b of Object.values(w.buildings)) {
      expect(Number.isInteger(b.x)).toBe(true);
      expect(Number.isInteger(b.y)).toBe(true);
    }
    expect(Object.keys(w.occ).length).toBe(w.size * w.size);
    expect(w.gold).toBe(1000);
  });
  it('clamps a rectangle to the map so a huge drag cannot run unbounded', () => {
    const w = makeTestWorld({ gold: 100000 });
    expect(rectTiles(-100, -100, 1000, 1000, w.size).length).toBe(w.size * w.size);
    expect(rectTiles(-5, -5, 1, 1, w.size).length).toBe(4);
    expect(rectTiles(-100, -100, -50, -50, w.size)).toEqual([]);
    const pv = previewHouses(w, -100, -100, 1000, 1000);
    expect(pv.positions.length).toBeLessThanOrEqual(w.size * w.size);
    expect(pv.positions.every(([x, y]) => x >= 0 && y >= 0 && x < w.size && y < w.size)).toBe(true);
  });
  it('copes with an absurdly large rectangle straight away', () => {
    const w = makeTestWorld({ gold: 100000 });
    expect(previewHouses(w, -1e9, -1e9, 1e9, 1e9).positions.length).toBe(w.size * w.size);
    expect(previewDemolishArea(w, -1e9, -1e9, 1e9, 1e9).buildingIds).toEqual([]);
    expect(demolishArea(w, -1e9, -1e9, 1e9, 1e9).reason).toBe('nothing_here');
  });
  it('treats a rectangle wholly off the map as nothing to place or demolish', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(previewHouses(w, 100, 100, 120, 120).reason).toBe('nothing_to_place');
    expect(demolishArea(w, 100, 100, 120, 120).reason).toBe('nothing_here');
  });
  it('reports nothing to place', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(paintHouses(w, 0, 10, 5, 10).reason).toBe('nothing_to_place');
  });
  it('warns needs_road when painted plots are away from any road', () => {
    const w = makeTestWorld({ gold: 1000 });
    const r = paintHouses(w, 20, 20, 21, 21);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('needs_road');
  });
  it('paints with no warnings when the rectangle is fully beside a road', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const r = paintHouses(w, 10, 9, 14, 9);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([]);
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

// The touch plan's tile-list cores (placement review P3, P5): a list of tiles in any order, each one undo entry. By default a
// blocked tile refuses the lot, as the mouse's L does; skipBlocked lays what it can and lists the rest as skipped.
describe('commands: tile lists (placement review P3, P5)', () => {
  it('lays road on a list of tiles, strictly by default, skipping blocked tiles in a touch plan', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'well', 13, 11);
    w.terrain[idx(w.size, 15, 11)] = 3;
    const tiles = [[11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [12, 11], [12, 10]];
    const strict = previewRoadTiles(w, tiles);
    expect([strict.ok, strict.reason, strict.tiles, strict.cost]).toEqual([false, 'blocked', [], 0]);
    const p = previewRoadTiles(w, tiles, { skipBlocked: true });
    expect(p.ok).toBe(true);
    expect(p.tiles).toEqual([[11, 11], [12, 11], [14, 11], [16, 11]].map(([x, y]) => idx(w.size, x, y)));   // each once; the road at (12, 10) is there already
    expect(p.cost).toBe(8);
    expect(p.skipped).toEqual([{ x: 13, y: 11, reason: 'blocked' }, { x: 15, y: 11, reason: 'water' }]);
    expect(previewRoadTiles(w, [[40, 3], [1.5, 2]], { skipBlocked: true }).skipped.map((s) => s.reason)).toEqual(['out_of_bounds', 'out_of_bounds']);
    const gold = w.gold;
    const r = drawRoadTiles(w, tiles, { skipBlocked: true });
    expect(r.ok).toBe(true);
    expect(w.road[idx(w.size, 16, 11)]).toBe(1);
    expect(w.road[idx(w.size, 15, 11)]).toBe(0);
    expect(w.gold).toBe(gold - 8);
    expect(w.undo.length).toBe(2);                                  // the well, then the road: one entry for the whole plan
    undo(w);
    expect(w.road[idx(w.size, 11, 11)]).toBe(0);
    expect(w.gold).toBe(gold);
  });
  it('keeps the L functions as they were, on top of the tile-list core', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    expect(previewRoad(w, 10, 9, 15, 9)).toEqual({ ok: false, reason: 'blocked', warnings: [], tiles: [], gates: [], cost: 0 });
    expect(previewRoad(w, 0, 5, 2, 5)).toEqual({ ok: true, warnings: [], tiles: [0, 1, 2].map((x) => idx(w.size, x, 5)), gates: [], cost: 6 });   // Stage 4.5: gates, the wall tiles a road makes gates
    expect(Object.keys(drawRoad(w, 0, 5, 2, 5)).sort()).toEqual(['cost', 'gates', 'ok', 'tiles', 'warnings']);
    expect(Object.keys(previewHouses(w, 20, 20, 21, 20)).sort()).toEqual(['cost', 'ok', 'positions', 'warnings']);
  });
  it('paints plots on a list of tiles and counts the ones it skips', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const p = previewHouseTiles(w, [[12, 9], [12, 10], [13, 9], [12, 9]]);
    expect(p.positions).toEqual([[12, 9], [13, 9]]);
    expect(p.skipped).toEqual([{ x: 12, y: 10, reason: 'occupied' }]);
    expect(p.cost).toBe(10);
    const none = previewHouseTiles(w, [[12, 10]]);
    expect([none.ok, none.reason, none.skipped.length]).toEqual([false, 'nothing_to_place', 1]);
    const r = paintHouseTiles(w, [[12, 9], [12, 10], [13, 9]]);
    expect([r.ok, r.ids.length, w.undo.length]).toEqual([true, 2, 1]);
    undo(w);
    expect(housesOf(w).length).toBe(0);
  });
  it('demolishes a list of tiles with one undo', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    const p = previewDemolishTiles(w, [[12, 8], [13, 9], [20, 10], [20, 10], [25, 25], [-1, 3]]);
    expect([p.buildingIds.length, p.roadTiles, p.refund]).toEqual([1, [idx(w.size, 20, 10)], 30]);
    const gold = w.gold;
    const r = demolishTiles(w, [[12, 8], [20, 10]]);
    expect([r.ok, r.count, w.gold]).toEqual([true, 2, gold + 30]);
    undo(w);
    expect(buildingAt(w, 12, 8).type).toBe('temple');
    expect(w.road[idx(w.size, 20, 10)]).toBe(1);
    expect(demolishTiles(w, [[25, 25]]).reason).toBe('nothing_here');
  });
});
