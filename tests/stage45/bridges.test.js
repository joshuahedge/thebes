// Task 3c (ruling 314): a road may cross water where the crossing is a straight run of at most 4 tiles of water; each bridge
// tile costs the bridge price; raiders, walkers and the flow field use it like a road; demolish removes a tile for no refund;
// undo works as for roads; the bar's words are the sim's own run length and price.
import { describe, it, expect } from '../harness.js';
import { previewRoad, drawRoad, previewRoadTiles, drawRoadTiles, demolishAt, canPlace } from '../../src/sim/commands.js';
import { bridgeRuns, bridgeVerdicts, runReason, BRIDGE_MAX } from '../../src/sim/bridges.js';
import { undo } from '../../src/sim/undo.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';
import { flowField, tileCost } from '../../src/sim/pathfinding.js';
import { roadReach } from '../../src/sim/reach.js';
import { createWorld } from '../../src/sim/world.js';
import { MAP_VARIANTS_70 as MAP_VARIANTS } from '../../src/data/map.js';   // Version 7.1: the 7.0 layouts (a wide Nile has no bridge spot by design)
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
import { toolPreview, ghostsFor } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { S45_TEXT, reasonText } from '../../src/ui/text.js';
import { CROSSING_TEXT } from '../../src/ui/v71/ferryText.js';
import { isBridgeTile, bridgeTiles } from '../../src/render/terrainBridges.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

// Whether a straight line of tiles along one row or column has a bridgeable run of at most `most` tiles of water (the narrow
// spots of a map). Only this test reads it: the rule itself is bridgeRuns and bridgeVerdicts.
function hasBridgeSpot(world, most = BRIDGE_MAX) {
  const n = world.size;
  for (let a = 0; a < n; a++) {
    for (const vertical of [false, true]) {
      const line = [];
      for (let b = 0; b < n; b++) line.push(vertical ? [a, b] : [b, a]);
      if (bridgeRuns(world, line).some((r) => r.n <= most && r.straight && r.bounded)) return true;
    }
  }
  return false;
}

// A 32 x 32 test world with a river of `width` water tiles down x = 10 .. 10 + width - 1, and gold to spare.
function rivered(width = 3, difficulty = 'normal') {
  const w = makeTestWorld({ gold: 100000 });
  w.difficulty = difficulty;
  for (let y = 0; y < w.size; y++) for (let x = 10; x < 10 + width; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
  return w;
}
const at = (w, x, y) => idx(w.size, x, y);

describe('s45 bridges (the rule)', () => {
  it('lets a road cross up to 4 tiles of water in a straight line, charging the bridge price a tile', () => {
    expect(BRIDGE_MAX).toBe(4);
    for (const width of [1, 2, 3, 4]) {
      const w = rivered(width);
      const last = 10 + width + 3;
      const p = previewRoad(w, 7, 8, last, 8);
      const tiles = last - 7 + 1;
      expect([width, p.ok, p.bridges.length, p.tiles.length]).toEqual([width, true, width, tiles]);
      expect(p.cost).toBe((tiles - width) * roadCostOf(w) + width * costOf(w, 'bridge'));
      expect(costOf(w, 'bridge')).toBe(25);
    }
  });
  it('lays the road on the water tiles (terrain stays water), pays for them, and undo takes them off and refunds', () => {
    const w = rivered(3);
    const gold = w.gold;
    const r = drawRoad(w, 8, 8, 14, 8);
    expect([r.ok, r.bridges.length, r.cost]).toEqual([true, 3, 4 * roadCostOf(w) + 3 * costOf(w, 'bridge')]);
    expect(w.gold).toBe(gold - r.cost);
    for (const x of [10, 11, 12]) expect([x, w.road[at(w, x, 8)], w.terrain[at(w, x, 8)]]).toEqual([x, 1, T.WATER]);
    expect(isBridgeTile(w, 11, 8)).toBe(true);
    expect(isBridgeTile(w, 9, 8)).toBe(false);                            // land road
    expect(bridgeTiles(w, { x0: 0, y0: 0, x1: 31, y1: 31 })).toEqual([[10, 8], [11, 8], [12, 8]]);
    expect(undo(w).ok).toBe(true);
    for (const x of [10, 11, 12]) expect(w.road[at(w, x, 8)]).toBe(0);
    expect(w.gold).toBe(gold);
  });
  it('refuses a crossing of 5 or more tiles of water with the count, and lays nothing', () => {
    for (const width of [13, 14, 18]) {                                       // Version 8.3 (Track X): 5 to 12 is a ferry now; past FERRY.max it is too wide
      const w = rivered(width);
      const gold = w.gold;
      const p = previewRoad(w, 7, 8, 10 + width + 2, 8);
      expect([width, p.ok, p.reason, p.water, p.tiles.length, p.cost]).toEqual([width, false, 'too_wide', width, 0, 0]);
      const d = drawRoad(w, 7, 8, 10 + width + 2, 8);
      expect([d.ok, d.reason, w.gold, w.undo.length]).toEqual([false, 'too_wide', gold, 0]);
      expect(w.road.some((v) => v)).toBe(false);
    }
  });
  it('wants a straight crossing with land at both ends: a bend in the water, a start in the water or an end in it is refused', () => {
    const w = rivered(3);
    const bent = previewRoad(w, 8, 8, 11, 9);                               // along the row into the water, then down it
    expect([bent.ok, bent.reason]).toEqual([false, 'bridge_shape']);
    expect(previewRoad(w, 11, 8, 15, 8).reason).toBe('bridge_shape');       // starts in the water
    expect(previewRoad(w, 7, 8, 11, 8).reason).toBe('bridge_shape');        // ends in the water
    expect(previewRoad(w, 11, 6, 11, 8).reason).toBe('bridge_shape');       // runs down the river, never crossing it
    expect(previewRoad(w, 9, 6, 9, 10).ok).toBe(true);                      // along the bank is plain road
    expect(reasonText('bridge_shape')).toBe('A bridge runs straight across, with land at both ends');
    expect(reasonText('too_wide')).toBe('Too wide for a bridge');
  });
  it('crosses a column of water as well as a row, and two rivers in one line each count on their own', () => {
    const w = rivered(2);
    for (let x = 0; x < w.size; x++) for (let y = 16; y < 19; y++) w.terrain[at(w, x, y)] = T.WATER;   // a second river across, 3 wide
    expect(previewRoad(w, 20, 12, 20, 22).bridges.length).toBe(3);
    const both = previewRoadTiles(w, [[8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3]]);
    expect([both.ok, both.bridges.length]).toEqual([true, 2]);
    const along = [];
    for (let x = 5; x <= 20; x++) along.push([x, 20]);
    for (let y = 21; y <= 24; y++) along.push([20, y]);
    expect(bridgeRuns(w, along)).toEqual([{ from: 5, to: 6, n: 2, straight: true, bounded: true }]);   // the river's two tiles; the rest is dry
  });
  it('charges the difficulty\'s price for a bridge tile, and a tile that already holds road (a standing bridge) costs nothing', () => {
    const w = rivered(3, 'hard');
    expect(costOf(w, 'bridge')).toBe(Math.max(1, Math.round(25 * 1.25)));
    const p = previewRoad(w, 9, 8, 13, 8);
    expect(p.cost).toBe(2 * roadCostOf(w) + 3 * costOf(w, 'bridge'));
    expect(drawRoad(w, 9, 8, 13, 8).ok).toBe(true);
    const again = previewRoad(w, 8, 8, 14, 8);
    expect([again.ok, again.tiles.length, again.bridges.length]).toEqual([true, 2, 0]);    // only the two new land tiles
    const more = previewRoad(w, 9, 8, 13, 8);
    expect([more.ok, more.tiles.length, more.cost]).toEqual([true, 0, 0]);
  });
  it('treats a bridge as a road tile for the rest: no house on it, walkers\' reach and raiders cross it, demolish takes it for no refund', () => {
    const w = rivered(3);
    expect(canPlace(w, 'house', 11, 8).reason).toBe('water');
    const home = addRaw(w, 'house', 6, 8, { tier: 1, residents: 4 });
    expect(drawRoad(w, 5, 9, 17, 9).ok).toBe(true);
    const reach = roadReach(w, home, 20);
    expect([reach.has(at(w, 11, 9)), reach.has(at(w, 17, 9))]).toEqual([true, true]);   // across the river, along the bridge
    expect(tileCost(w, 11, 9)).toBe(1);
    expect(tileCost(w, 11, 10)).toBe(Infinity);                              // water with no bridge
    const field = flowField(w, [[17, 9]]);
    expect(Number.isFinite(field.dist[at(w, 6, 9)])).toBe(true);
    expect(field.next(9, 9)).toEqual([10, 9]);                               // a raider steps onto the deck
    const dry = rivered(3);
    expect(Number.isFinite(flowField(dry, [[17, 9]]).dist[at(dry, 6, 9)])).toBe(false);
    const gold = w.gold;
    const d = demolishAt(w, 11, 9);
    expect([d.ok, d.refund, w.gold, w.road[at(w, 11, 9)]]).toEqual([true, 0, gold, 0]);
    expect(Number.isFinite(flowField(w, [[17, 9]]).dist[at(w, 6, 9)])).toBe(false);   // the gap cuts it
    expect(undo(w).ok).toBe(true);
    expect(w.road[at(w, 11, 9)]).toBe(1);
  });
  it('lays what a touch plan can and skips a stroke too wide to cross, saying why', () => {
    const w = rivered(3);
    for (let x = 15; x < 28; x++) for (let y = 0; y < 3; y++) w.terrain[at(w, x, y)] = T.WATER;   // a 13-wide pond in the corner (Version 8.3: 5 to 12 is a ferry's)
    const ok = previewRoadTiles(w, [[8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8]], { skipBlocked: true });
    expect([ok.ok, ok.bridges.length, ok.skipped.length]).toEqual([true, 3, 0]);
    const wideLine = [];
    for (let x = 13; x <= 29; x++) wideLine.push([x, 1]);
    const wide = previewRoadTiles(w, wideLine, { skipBlocked: true });
    expect(wide.bridges.length).toBe(0);
    expect(wide.skipped.map((s) => s.reason)).toEqual(Array(13).fill('too_wide'));
    expect(wide.tiles.length).toBe(4);
    const laid = drawRoadTiles(w, [[8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8]], { skipBlocked: true });
    expect([laid.ok, w.road[at(w, 11, 8)]]).toEqual([true, 1]);
  });
  it('refuses water in gate mode, and a bridge never takes a wall or a building', () => {
    const w = rivered(3);
    expect(previewRoad(w, 10, 8, 12, 8, false, { gateOnly: true }).reason).toBe('water');   // the Gate card never bridges
    expect(runReason({ n: 4, straight: true, bounded: true })).toBe(null);
    expect(runReason({ n: 5, straight: true, bounded: true })).toBe('too_wide');
    expect(runReason({ n: 3, straight: false, bounded: true })).toBe('bridge_shape');
    expect(bridgeVerdicts(w, [[9, 8], [10, 8], [11, 8], [12, 8], [13, 8]]).map((v) => v && v.reason)).toEqual([null, null, null, null, null]);
  });
});

describe('s45 bridges (the map)', () => {
  it('gives every river variant but classic a bridgeable spot of 3 tiles or fewer, by the rule\'s own function, for 30 seeds', () => {
    for (const v of MAP_VARIANTS.filter((m) => m !== 'classic')) {
      for (let seed = 1; seed <= 30; seed++) expect([v, seed, hasBridgeSpot(createWorld({ seed, mapVariant: v }), 3)]).toEqual([v, seed, true]);
    }
    expect(hasBridgeSpot(rivered(5), 4)).toBe(false);
    expect(hasBridgeSpot(rivered(4), 4)).toBe(true);
  });
});

describe('s45 bridges (the words)', () => {
  const store = (tool, extra = {}) => createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool, ...extra });
  const line = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, flip: false });

  it('says "Bridge: 4 tiles, 100 gold" from the bridge price, with the road tiles beside it, at every level', () => {
    const w = rivered(4);
    const p = toolPreview(w, store({ kind: 'road' }, { line: line(8, 8, 17, 8) }).get());
    expect(p.state).toBe('ok');
    // Version 8.3 (Track X, ruling 1395): the crossing leads ("Bridge: 4 tiles of water"), then the road tiles; the price is the cost line's
    expect(p.text).toBe(`${CROSSING_TEXT.bridge(4)} · ${CROSSING_TEXT.roadTiles(6)}`);
    expect(p.text).toBe('Bridge: 4 tiles of water · 6 road tiles');
    expect(p.cost).toBe(6 * roadCostOf(w) + 4 * costOf(w, 'bridge'));
    expect(p.bridges.length).toBe(4);
    const alone = toolPreview(w, store({ kind: 'road' }, { line: line(9, 8, 14, 8) }).get());
    expect(alone.text).toBe('Bridge: 4 tiles of water · 2 road tiles');
    w.difficulty = 'hard';
    expect(toolPreview(w, store({ kind: 'road' }, { line: line(8, 8, 17, 8) }).get()).cost).toBe(6 * roadCostOf(w) + 4 * costOf(w, 'bridge'));
    expect(costOf(w, 'bridge')).toBe(31);
    w.difficulty = 'relaxed';
    expect(toolPreview(w, store({ kind: 'road' }, { line: line(9, 8, 14, 8) }).get()).cost).toBe(2 * roadCostOf(w) + 4 * costOf(w, 'bridge'));
    const dry = toolPreview(w, store({ kind: 'road' }, { line: line(1, 1, 4, 1) }).get());
    expect(dry.text).toBe('4 tiles');                                         // no water crossed: no bridge note
  });
  it('refuses with "Too wide for a bridge (6 tiles of water): lay a ferry", the run counted by the sim, for any width past the limit', () => {
    for (const width of [13, 14, 18]) {                                       // Version 8.3 (Track X): past a ferry's width; both limits named
      const w = rivered(width);
      const p = toolPreview(w, store({ kind: 'road' }, { line: line(7, 8, 10 + width + 2, 8) }).get());
      expect([width, p.state, p.reason]).toEqual([width, 'bad', 'too_wide']);
      expect(p.text).toBe(`Too wide: ${width} tiles (a bridge crosses up to 4, a ferry up to 12)`);
      expect(p.text).toBe(CROSSING_TEXT.tooWide(previewRoad(w, 7, 8, 10 + width + 2, 8).water));
    }
    const w = rivered(4);
    expect(toolPreview(w, store({ kind: 'road' }, { line: line(7, 8, 16, 8) }).get()).state).toBe('ok');   // 4 is the most
    const bend = toolPreview(w, store({ kind: 'road' }, { line: line(8, 8, 11, 9) }).get());
    expect([bend.state, bend.text]).toEqual(['bad', CROSSING_TEXT.bent]);
  });
  it('words a touch plan\'s skipped bridge, and marks the toast for a road that made a bridge', () => {
    const w = rivered(13);                                                    // Version 8.3: past a ferry's width; the crossing's own words, with Show me
    const tiles = [];
    for (let x = 8; x <= 24; x++) tiles.push([x, 8]);
    const plan = toolPreview(w, store({ kind: 'road' }, { plan: { tiles } }).get());
    expect(plan.state).toBe('ok');
    expect(plan.skipped.length).toBe(13);
    expect([plan.text.includes(CROSSING_TEXT.tooWide(13)), plan.showFit]).toEqual([true, true]);
    expect(S45_TEXT.roadLaidBridge(3)).toBe('Road laid · bridge, 3 tiles');
    expect(ghostsFor(w, store({ kind: 'road' }, { line: line(7, 8, 19, 8) }).get()).length).toBeGreaterThan(0);
  });
});
