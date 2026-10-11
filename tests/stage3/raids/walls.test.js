import { describe, it, expect } from '../../harness.js';
import { previewWall, drawWall, isGate, wallHpFor, fullWallHp, healWalls } from '../../../src/sim/defence.js';
import { flowField, tileCost, flowCacheSize } from '../../../src/sim/pathfinding.js';
import { undo } from '../../../src/sim/undo.js';
import { roadReach } from '../../../src/sim/reach.js';
import { costOf } from '../../../src/sim/costs.js';
import { idx } from '../../../src/sim/grid.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// Road along y = 10 in a 32x32 test world, at Market town so the defences are unlocked.
function street(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'market_town';
  return w;
}
const at = (w, x, y) => idx(w.size, x, y);

describe('s3 raids walls', () => {
  it('previews wall along the road tool\'s L, a gate where it crosses a road, priced at the city\'s level', () => {
    const w = street();
    const p = previewWall(w, 5, 8, 5, 12);
    expect(p).toEqual({ ok: true, reason: null, warnings: [], tiles: [8, 9, 10, 11, 12].map((y) => at(w, 5, y)), gates: [at(w, 5, 10)], cost: 4 * costOf(w, 'wall') + costOf(w, 'gate') });
    expect(p.cost).toBe(4 * 8 + 20);
    expect(previewWall(w, 1, 1, 3, 3).tiles).toEqual([[1, 1], [2, 1], [3, 1], [3, 2], [3, 3]].map(([x, y]) => at(w, x, y)));
    expect(previewWall(w, 1, 1, 3, 3, true).tiles).toEqual([[1, 1], [1, 2], [1, 3], [2, 3], [3, 3]].map(([x, y]) => at(w, x, y)));
    w.difficulty = 'hard';
    expect(previewWall(w, 5, 8, 5, 12).cost).toBe(4 * costOf(w, 'wall') + costOf(w, 'gate'));
    expect([costOf(w, 'wall'), costOf(w, 'gate')]).toEqual([10, 25]);
    w.difficulty = 'normal';
    w.wall[at(w, 5, 9)] = 40;                                                          // standing wall is skipped ...
    w.wall[at(w, 5, 11)] = -1;                                                         // ... a breach is drawn again at the normal price
    const q = previewWall(w, 5, 8, 5, 12);
    expect([q.tiles, q.cost]).toEqual([[8, 10, 11, 12].map((y) => at(w, 5, y)), 3 * 8 + 20]);
  });
  it('refuses with the reasons the bar words, keeping the tiles and cost when short of gold', () => {
    const w = street();
    w.milestone = 'town';
    expect(previewWall(w, 1, 1, 4, 1)).toEqual({ ok: false, reason: 'locked', warnings: [], tiles: [], gates: [], cost: 0 });
    w.milestone = 'market_town';
    expect(previewWall(w, 1, 1, 40, 1).reason).toBe('out_of_bounds');
    expect(previewWall(w, 1, 1, 2.5, 1).reason).toBe('out_of_bounds');
    w.terrain[at(w, 3, 1)] = TERRAIN.WATER;
    expect(previewWall(w, 1, 1, 4, 1).reason).toBe('water');
    addRaw(w, 'well', 3, 4);
    expect(previewWall(w, 1, 4, 4, 4).reason).toBe('blocked');
    w.raid.active = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: 1, target: 'building', day: 0, raiders: [{ id: 1, x: 7.6, y: 6.4, hp: 10, hit: false }], phase: 'attack', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [] };
    expect(previewWall(w, 5, 6, 9, 6).reason).toBe('blocked');                          // not under a raider's feet
    w.raid.active = null;
    w.wall[at(w, 1, 7)] = 40; w.wall[at(w, 2, 7)] = 40;
    expect(previewWall(w, 1, 7, 2, 7)).toEqual({ ok: false, reason: 'nothing_to_place', warnings: [], tiles: [], gates: [], cost: 0 });
    w.gold = -490;
    expect(previewWall(w, 10, 1, 11, 1)).toEqual({ ok: false, reason: 'no_gold', warnings: [], tiles: [at(w, 10, 1), at(w, 11, 1)], gates: [], cost: 16 });
    expect(previewWall(w, 10, 1, 10, 1).ok).toBe(true);                                // -490 - 8 is above the -500 floor
  });
  it('draws at full hit points, charges, counts the tiles, clears the card\'s New, and undoes to the tiles before', () => {
    const w = street(500);
    w.newItems = ['wall', 'tower'];
    w.wall[at(w, 5, 11)] = -1;
    const v = w.wallVersion;
    const r = drawWall(w, 5, 8, 5, 12);
    expect(r.ok).toBe(true);
    expect([8, 9, 10, 11, 12].map((y) => w.wall[at(w, 5, y)])).toEqual([DEFENCE.wallHp, DEFENCE.wallHp, DEFENCE.gateHp, DEFENCE.wallHp, DEFENCE.wallHp]);
    expect([w.gold, w.wallVersion, w.tally.wallTiles, w.newItems]).toEqual([500 - r.cost, v + 1, 5, ['tower']]);
    expect(w.undo[w.undo.length - 1]).toEqual({ kind: 'wall', tiles: r.tiles, before: [0, 0, 0, -1, 0], cost: r.cost });
    expect(isGate(w, at(w, 5, 10))).toBe(true);
    expect(w.road[at(w, 5, 10)]).toBe(1);                                               // a gate is still road
    expect(undo(w)).toEqual({ ok: true, kind: 'wall' });
    expect([8, 9, 10, 11, 12].map((y) => w.wall[at(w, 5, y)])).toEqual([0, 0, 0, -1, 0]);
    expect([w.gold, w.tally.wallTiles]).toEqual([500, 0]);
    const before = JSON.stringify(w);
    expect(drawWall(w, 1, 1, 40, 1).ok).toBe(false);
    expect(JSON.stringify(w)).toBe(before);                                            // a refusal changes nothing
  });
  it('lets road reach through a gate and makes raiders break it like wall', () => {
    const w = street();
    const well = addRaw(w, 'well', 2, 11);
    drawWall(w, 6, 9, 6, 11);
    const gate = at(w, 6, 10);
    expect(roadReach(w, well, 10).has(at(w, 9, 10))).toBe(true);                       // reach walks on through the gate
    expect(tileCost(w, 6, 10)).toBe(1 + wallHpFor(w, gate) / 2);
    expect(wallHpFor(w, gate)).toBe(DEFENCE.gateHp);
  });
  it('gives a tower on a wall its own hit points, and heals standing tiles but not breaches', () => {
    const w = street();
    drawWall(w, 12, 5, 16, 5);
    addRaw(w, 'tower', 14, 5);
    expect([fullWallHp(w, at(w, 14, 5)), fullWallHp(w, at(w, 13, 5)), fullWallHp(w, at(w, 5, 10))]).toEqual([DEFENCE.towerOnWallHp, DEFENCE.wallHp, DEFENCE.gateHp]);
    w.wall[at(w, 12, 5)] = 6; w.wall[at(w, 13, 5)] = -1;
    const v = w.wallVersion;
    healWalls(w);
    expect([12, 13, 14, 15, 16].map((x) => w.wall[at(w, x, 5)])).toEqual([40, -1, 80, 40, 40]);
    expect(w.wallVersion).toBe(v);                                                      // healing is not a change of shape
  });
});

describe('s3 raids flow field', () => {
  it('measures the cheapest way to the goals and steps towards them, around buildings and water', () => {
    const w = makeTestWorld();
    const f = flowField(w, [[10, 10]]);
    expect([f.dist[at(w, 10, 10)], f.dist[at(w, 13, 10)], f.dist[at(w, 10, 6)], f.dist[at(w, 12, 13)]]).toEqual([0, 3, 4, 5]);
    expect([f.next(13, 10), f.next(10, 6), f.next(10, 10)]).toEqual([[12, 10], [10, 7], null]);
    for (let y = 0; y < 32; y++) if (y !== 20) w.terrain[at(w, 15, y)] = TERRAIN.WATER;   // a river with one ford at y = 20
    addRaw(w, 'granary', 5, 9);
    const g = flowField(w, [[10, 10]]);
    expect(g.dist[at(w, 20, 10)]).toBe(5 + 10 + 5 + 10);                                // by the ford: 5 west and 10 down to it, 5 west and 10 up
    expect(g.next(16, 20)).toEqual([15, 20]);
    expect(g.dist[at(w, 4, 10)]).toBe(6 + 2);                                           // round the granary (5..6, 9..10)
    expect(flowField(w, [[5, 9]]).dist.every((d) => d === Infinity)).toBe(true);        // a goal under a building is left out
    expect(flowField(w, [[15, 3]]).dist.every((d) => d === Infinity)).toBe(true);        // and one in the water
  });
  it('charges a wall 1 + its hit points / 2 and a breach 1, so a closed ring is breached where it is cheapest', () => {
    const w = makeTestWorld();
    for (let x = 8; x <= 12; x++) { w.wall[at(w, x, 8)] = 40; w.wall[at(w, x, 12)] = 40; }
    for (let y = 9; y <= 11; y++) { w.wall[at(w, 8, y)] = 40; w.wall[at(w, 12, y)] = 40; }
    w.wall[at(w, 12, 10)] = 10;                                                         // a weak tile on the east side
    w.wallVersion++;
    const f = flowField(w, [[10, 10]]);
    expect(f.dist[at(w, 14, 10)]).toBe(1 + (1 + 10 / 2) + 1 + 1);                       // into 13, the weak tile, 11 and the goal
    expect(f.next(13, 10)).toEqual([12, 10]);
    expect(f.dist[at(w, 10, 7)]).toBe(3 + 3 + f.dist[at(w, 13, 10)]);                   // round to the weak tile (14), not through the north wall (23)
    expect(f.next(10, 7)).toEqual([11, 7]);
    expect(f.dist[at(w, 10, 5)]).toBe(f.dist[at(w, 10, 7)] + 2);
    w.wall[at(w, 10, 8)] = -1;                                                          // a breach in the north wall
    const g = flowField(w, [[10, 10]]);
    expect(g.dist[at(w, 10, 7)]).toBe(3);
    expect(g.next(10, 7)).toEqual([10, 8]);
  });
  it('keeps a field until a tile\'s cost changes, a wall\'s hit points included', () => {
    const w = makeTestWorld();
    w.wall[at(w, 10, 5)] = 40;
    const f = flowField(w, [[10, 10]]);
    expect(flowField(w, [[10, 10]])).toBe(f);
    flowField(w, [[3, 3]]);
    expect(flowCacheSize(w)).toBe(2);
    w.wall[at(w, 10, 5)] = 20;                                                          // a hit: no wallVersion bump, a new field all the same
    const g = flowField(w, [[10, 10]]);
    expect(g === f).toBe(false);
    expect(flowCacheSize(w)).toBe(1);
    expect(g.dist[at(w, 10, 4)]).toBe(f.dist[at(w, 10, 4)]);                            // the way round is still cheaper here
  });
});
