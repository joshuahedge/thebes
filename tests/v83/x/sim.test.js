// Version 8.3 "Lines", Track X (rulings 1390-1409): the road tool lays a bridge or a ferry. Each water width from 1 to 13, straight and bent, with land and
// without at the ends; a busy bank; one undo for the whole stroke; a road-laid ferry is the Ferry tool's pair (it runs, staffs and carries walkers and carts
// the same); raiders never use it; old saves and undo entries load. On the 7.1 test river (tests/v71/f/helpers.js: 32 x 32, a river down x = 12 .. 12 +
// width - 1, roads along row 10 up to the tile before each bank).
import { describe, it, expect } from '../../harness.js';
import { addRaw, setRoad } from '../../helpers/testWorld.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { previewRoadTiles, drawRoadTiles, previewRoad, demolishAt } from '../../../src/sim/commands.js';
import { crossingRuns, BRIDGE_MAX, crossMax } from '../../../src/sim/bridges.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { landingsOf, ferryLinks, ferryEdges, crossingTiles, mateOf, FERRY } from '../../../src/sim/ferries.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { undo, undoLast } from '../../../src/sim/undo.js';
import { roadLen } from '../../../src/sim/carts.js';
import { roadReach } from '../../../src/sim/reach.js';
import { flowField, tileCost } from '../../../src/sim/pathfinding.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';

const at = (w, x, y) => idx(w.size, x, y);
const landing = () => costOf(ferryWorld(7), 'ferry_landing');
const west = () => [RIVER_X - 1, ROW];
const east = (width) => [RIVER_X + width, ROW];

describe('v83 x sim: the road judges each run of water', () => {
  it('lays a bridge over 1 to 4 tiles, a ferry over 5 to 12 (its banks become landings, with no road on them or the water), and refuses 13 with the count', () => {
    expect([BRIDGE_MAX, FERRY.min, FERRY.max, crossMax(ferryWorld(7))]).toEqual([4, 5, 12, 12]);
    for (let width = 1; width <= 13; width++) {
      const w = ferryWorld(width);
      const p = previewRoadTiles(w, dragLine(width));
      if (width <= 4) {
        expect([width, p.ok, p.bridges.length, p.ferries.length, p.cost]).toEqual([width, true, width, 0, 2 * roadCostOf(w) + width * costOf(w, 'bridge')]);
      } else if (width <= 12) {
        expect([width, p.ok, p.bridges.length, p.ferries, p.tiles.length, p.cost, p.ferryCost]).toEqual([width, true, 0, [{ landings: [west(), east(width)], water: width }], 0, 2 * landing(), 2 * landing()]);
      } else {
        expect([width, p.ok, p.reason, p.water]).toEqual([width, false, 'too_wide', 13]);
      }
    }
  });

  it('carries the road on from the far landing: the stroke\'s land tiles get road, the landings and the water none', () => {
    const w = ferryWorld(7, { roads: false });
    setRoad(w, 4, ROW, RIVER_X - 4, ROW);                                       // the road stops 3 tiles short of the bank; the stroke runs on past the far bank
    const line = [];
    for (let x = RIVER_X - 3; x <= RIVER_X + 9; x++) line.push([x, ROW]);
    const p = previewRoadTiles(w, line);
    const laid = p.tiles.map((t) => [t % w.size, Math.floor(t / w.size)]);
    expect(laid).toEqual([[RIVER_X - 3, ROW], [RIVER_X - 2, ROW], [RIVER_X + 8, ROW], [RIVER_X + 9, ROW]]);
    expect(p.cost).toBe(4 * roadCostOf(w) + 2 * landing());
  });

  it('refuses a bent run, a line that starts in the water, and one that runs down the river; a line ending in the water says what lies ahead', () => {
    const w = ferryWorld(7);
    const bent = [[RIVER_X - 2, ROW], [RIVER_X - 1, ROW], [RIVER_X, ROW], [RIVER_X + 1, ROW], [RIVER_X + 1, ROW + 1], [RIVER_X + 2, ROW + 1]];
    expect(previewRoadTiles(w, bent).reason).toBe('bridge_shape');
    expect(previewRoad(w, RIVER_X + 1, ROW, RIVER_X + 9, ROW).reason).toBe('bridge_shape');                  // starts in the water
    const into = previewRoad(w, RIVER_X - 2, ROW, RIVER_X + 2, ROW);                                         // on its way across
    expect([into.ok, into.reason, into.open]).toEqual([false, 'bridge_shape', { ahead: 7, kind: 'ferry', edge: false }]);
    expect(previewRoad(ferryWorld(3), RIVER_X - 2, ROW, RIVER_X, ROW).open).toEqual({ ahead: 3, kind: 'bridge', edge: false });
    expect(previewRoad(ferryWorld(13), RIVER_X - 2, ROW, RIVER_X + 3, ROW).open).toEqual({ ahead: 13, kind: null, edge: false });
    const sea = ferryWorld(20, { roads: false });                               // the water runs on to the map's edge: no far bank
    expect(previewRoad(sea, RIVER_X - 2, ROW, RIVER_X + 2, ROW).open).toEqual({ ahead: 20, kind: null, edge: true });
    // the ends must be in line with the water for a ferry; a bridge may still be come at from the side
    const side = [[RIVER_X - 1, ROW - 1], [RIVER_X - 1, ROW], ...dragLine(7).slice(2)];
    expect(crossingRuns(w, side).map((r) => [r.kind, r.reason])).toEqual([['ferry', null]]);
    const crooked = [[RIVER_X - 1, ROW - 1], [RIVER_X, ROW - 1], [RIVER_X, ROW], [RIVER_X + 1, ROW]];
    expect(crossingRuns(w, crooked)[0].reason).toBe('bridge_shape');
  });

  it('a map with no river keeps every run past 4 tiles too wide (ruling 1333): no ferry there', () => {
    const w = ferryWorld(7);
    w.mapVariant = 'great-oasis';
    const p = previewRoadTiles(w, dragLine(7));
    expect([p.ok, p.reason, p.water, crossMax(w)]).toEqual([false, 'too_wide', 7, 4]);
  });
});

describe('v83 x sim: a busy bank', () => {
  it('a bank tile with a building, a wall or a gate on it cannot take a landing: refused with why and where; a free one can', () => {
    const built = ferryWorld(7);
    addRaw(built, 'well', RIVER_X + 7, ROW);
    const b = previewRoadTiles(built, dragLine(7));
    expect([b.ok, b.reason, b.block, b.at]).toEqual([false, 'landing_taken', 'built', east(7)]);
    const wall = ferryWorld(7);
    wall.wall[at(wall, RIVER_X - 1, ROW)] = 100;
    expect(previewRoadTiles(wall, dragLine(7)).block).toBe('wall');
    const gate = ferryWorld(7);                                                 // a gate: a road through a wall
    gate.wall[at(gate, RIVER_X - 1, ROW)] = 100;
    setRoad(gate, RIVER_X - 1, ROW, RIVER_X - 1, ROW);
    expect([previewRoadTiles(gate, dragLine(7)).reason, previewRoadTiles(gate, dragLine(7)).block]).toEqual(['landing_taken', 'wall']);
    expect(previewRoadTiles(ferryWorld(7), dragLine(7)).ok).toBe(true);
    // a touch plan lays the rest and skips the crossing's tiles, with the reason
    const plan = previewRoadTiles(built, dragLine(7), { skipBlocked: true });
    expect([plan.ok, plan.ferries.length, [...new Set(plan.skipped.map((s) => s.reason))]]).toEqual([true, 0, ['landing_taken']]);
  });

  it('a landing needs a road beside it once the stroke is laid: a stroke from bank to bank with no road near refuses, one that carries on is laid', () => {
    const w = ferryWorld(7, { roads: false });
    const bankToBank = [];
    for (let x = RIVER_X - 1; x <= RIVER_X + 7; x++) bankToBank.push([x, ROW]);
    const p = previewRoadTiles(w, bankToBank);
    expect([p.ok, p.reason, p.at, p.water]).toEqual([false, 'landing_no_road', west(), 7]);
    expect(previewRoadTiles(w, dragLine(7)).ok).toBe(true);
    const plan = previewRoadTiles(w, bankToBank, { skipBlocked: true });
    expect([plan.ferries.length, plan.skipped.length, plan.skipped[0].reason]).toEqual([0, 9, 'landing_no_road']);
    // a road already beside the landing will do
    setRoad(w, RIVER_X - 1, ROW + 1, RIVER_X - 1, ROW + 1);
    setRoad(w, RIVER_X + 7, ROW + 1, RIVER_X + 7, ROW + 1);
    expect(previewRoadTiles(w, bankToBank).ferries.length).toBe(1);
  });

  it('a strip of land one tile wide between two stretches of water cannot hold a landing: neither ferry is laid there, and a bridge beyond keeps its road', () => {
    const w = ferryWorld(5, { roads: false });
    for (let y = 0; y < w.size; y++) for (let x = RIVER_X + 6; x < RIVER_X + 11; x++) w.terrain[at(w, x, y)] = T.WATER;   // a second river of 5 beyond a 1-tile strip
    const line = [];
    for (let x = RIVER_X - 2; x <= RIVER_X + 12; x++) line.push([x, ROW]);
    expect(crossingRuns(w, line).map((r) => [r.kind, r.reason, r.block])).toEqual([[null, 'landing_taken', 'taken'], [null, 'landing_taken', 'taken']]);
    const b = ferryWorld(5, { roads: false });
    for (let y = 0; y < b.size; y++) for (let x = RIVER_X + 6; x < RIVER_X + 8; x++) b.terrain[at(b, x, y)] = T.WATER;   // a stream of 2 beyond the strip: a bridge
    const both = [];
    for (let x = RIVER_X - 2; x <= RIVER_X + 9; x++) both.push([x, ROW]);
    expect(crossingRuns(b, both).map((r) => [r.kind, r.reason])).toEqual([[null, 'landing_taken'], ['bridge', null]]);
  });
});

describe('v83 x sim: a road already at the water\'s edge (ruling 1406)', () => {
  it('a plain road on the bank tile becomes the landing: its tile is taken up, the road behind it reaches the landing, and one Undo puts it all back', () => {
    const w = ferryWorld(7);
    setRoad(w, RIVER_X - 1, ROW, RIVER_X - 1, ROW);                             // the road already runs to the water's edge
    const bank = at(w, RIVER_X - 1, ROW);
    const p = previewRoadTiles(w, dragLine(7));
    expect([p.ok, p.ferries.length, p.lifted, p.cost]).toEqual([true, 1, [bank], 2 * landing()]);
    const gold = w.gold;
    const r = drawRoadTiles(w, dragLine(7));
    expect([r.ok, w.road[bank], w.occ[bank] === r.ids[0], w.undo[w.undo.length - 1].lifted]).toEqual([true, 0, true, [bank]]);
    settle(w);
    expect(landingsOf(w).every((l) => l.ferry.run)).toBe(true);                 // the road behind it (x = RIVER_X - 2) brings its ferryman
    expect(undoLast(w).ok).toBe(true);
    expect([landingsOf(w).length, w.road[bank], w.gold]).toEqual([0, 1, gold]);
  });

  it('the road behind the landing must reach it: a road that only ran onto the bank tile itself leaves the landing with none', () => {
    const w = ferryWorld(7, { roads: false });
    setRoad(w, RIVER_X - 1, ROW - 3, RIVER_X - 1, ROW);                         // a road down the bank, ending on the landing's tile
    setRoad(w, RIVER_X + 8, ROW, RIVER_X + 10, ROW);
    const line = [];
    for (let x = RIVER_X - 1; x <= RIVER_X + 8; x++) line.push([x, ROW]);
    expect(previewRoadTiles(w, line).ok).toBe(true);                             // (RIVER_X - 1, ROW - 1) is still road beside it
    w.road[at(w, RIVER_X - 1, ROW - 1)] = 0;
    w.road[at(w, RIVER_X - 1, ROW - 2)] = 0;
    w.road[at(w, RIVER_X - 1, ROW - 3)] = 0;
    const p = previewRoadTiles(w, line);
    expect([p.ok, p.reason, p.at]).toEqual([false, 'landing_no_road', west()]);   // its own tile, taken up, is no road beside it
  });
});

describe('v83 x sim: one undo for the whole stroke', () => {
  it('lays the road and the landings, charges once, and one Undo takes road and landings away and refunds all of it', () => {
    const w = ferryWorld(7, { roads: false });
    setRoad(w, 4, ROW, RIVER_X - 4, ROW);
    const line = [];
    for (let x = RIVER_X - 3; x <= RIVER_X + 9; x++) line.push([x, ROW]);
    const gold = w.gold, undos = w.undo.length;
    const r = drawRoadTiles(w, line);
    expect([r.ok, r.ids.length, gold - w.gold, w.undo.length - undos]).toEqual([true, 2, r.cost, 1]);
    const e = w.undo[w.undo.length - 1];
    expect([e.kind, e.ids, e.landingCost, e.cost]).toEqual(['road', r.ids, 2 * landing(), r.cost]);
    const [a, b] = r.ids.map((id) => w.buildings[id]);
    expect([[a.x, a.y], [b.x, b.y], a.ferry, b.ferry]).toEqual([west(), east(7), { mate: b.id, water: 7, run: false }, { mate: a.id, water: 7, run: false }]);
    expect([w.road[at(w, RIVER_X - 3, ROW)], w.road[at(w, RIVER_X + 9, ROW)], w.road[at(w, RIVER_X + 3, ROW)], w.road[at(w, RIVER_X - 1, ROW)]]).toEqual([1, 1, 0, 0]);
    expect(undoLast(w).ok).toBe(true);
    expect([landingsOf(w).length, w.gold, w.road[at(w, RIVER_X - 3, ROW)], w.road[at(w, RIVER_X + 9, ROW)]]).toEqual([0, gold, 0, 0]);
  });

  it('refunds only the landings that still stand, and the road whole', () => {
    const w = ferryWorld(7);
    const r = drawRoadTiles(w, dragLine(7));
    expect(r.cost).toBe(2 * landing());                                         // the roads either side were there: the landings are the whole price
    const e = w.undo.pop();
    demolishAt(w, RIVER_X + 7, ROW);                                            // the far landing goes (its refund is the demolish's)
    w.undo = [e];
    const before = w.gold;
    expect(undo(w).ok).toBe(true);
    expect([landingsOf(w).length, w.gold - before]).toEqual([0, landing()]);
  });

  it('an undo entry from before 8.3 (a road with no ids) still refunds its cost and takes its road off', () => {
    const w = ferryWorld(3);
    const gold = w.gold;
    const r = drawRoadTiles(w, dragLine(3));
    const e = w.undo[w.undo.length - 1];
    expect([e.ids, e.landingCost]).toEqual([undefined, undefined]);
    expect(undo(w).ok).toBe(true);
    expect([w.gold, w.road[at(w, RIVER_X + 1, ROW)], r.bridges.length]).toEqual([gold, 0, 3]);
  });
});

describe('v83 x sim: a road-laid ferry is the Ferry tool\'s', () => {
  const stores = (w) => ({ w1: addRaw(w, 'storehouse', 6, ROW + 1), e1: addRaw(w, 'storehouse', RIVER_X + 10, ROW + 1) });

  it('the same two landings, staffed the same, a link of the same length for carts and road reach', () => {
    const byRoad = ferryWorld(7), byTool = ferryWorld(7);
    const a = stores(byRoad), b = stores(byTool);
    const r = drawRoadTiles(byRoad, dragLine(7)), f = drawFerry(byTool, dragLine(7));
    const shape = (w, ids) => ids.map((id) => { const l = w.buildings[id]; return [l.type, l.x, l.y, l.ferry.water, mateOf(w, l).id === ids.find((o) => o !== id)]; });
    expect(shape(byRoad, r.ids)).toEqual(shape(byTool, f.ids));
    expect(r.cost).toBe(f.cost);
    settle(byRoad); settle(byTool);
    expect([ferryLinks(byRoad).length, landingsOf(byRoad).every((l) => l.ferry.run && l.staff === 1)]).toEqual([1, true]);
    expect(ferryEdges(byRoad)).toEqual(ferryEdges(byTool));
    expect(roadLen(byRoad, a.w1, a.e1)).toBe(4 + crossingTiles(7) + 2);
    expect(roadLen(byRoad, a.w1, a.e1)).toBe(roadLen(byTool, b.w1, b.e1));
    expect(roadReach(byRoad, a.w1, Infinity).get(at(byRoad, RIVER_X + 8, ROW))).toBe(4 + crossingTiles(7));
  });

  it('raiders never use it: the water stays impassable to them, running ferry or not', () => {
    const w = ferryWorld(7);
    drawRoadTiles(w, dragLine(7));
    settle(w);
    expect(landingsOf(w).every((b) => b.ferry.run)).toBe(true);
    for (let x = RIVER_X; x < RIVER_X + 7; x++) expect([x, tileCost(w, x, ROW)]).toEqual([x, Infinity]);
    expect(flowField(w, [[RIVER_X + 12, ROW]]).dist[at(w, RIVER_X - 4, ROW)]).toBe(Infinity);
  });

  it('saves and loads with its landings and its undo entry, and Undo after the load takes it away', () => {
    const w = ferryWorld(7);
    const gold = w.gold;
    drawRoadTiles(w, dragLine(7));
    const back = deserialize(serialize(w));
    expect([landingsOf(back).length, back.undo[back.undo.length - 1].ids.length]).toEqual([2, 2]);
    expect(undo(back).ok).toBe(true);
    expect([landingsOf(back).length, back.gold]).toEqual([0, gold]);
  });

  it('a real map\'s river: a straight road across its water, bank to bank and a tile on, lays a ferry and its road', () => {
    const w = createWorld({ seed: 1, mapVariant: 'wide-nile' });
    w.gold = 100000;
    let found = null;
    for (let y = 4; y < w.size - 4 && !found; y++) {
      const row = [];
      for (let x = 0; x < w.size; x++) row.push([x, y]);
      for (const run of crossingRuns(w, row).filter((r) => r.kind === 'ferry')) {
        const line = [];
        for (let x = run.landings[0][0] - 1; x <= run.landings[1][0] + 1; x++) line.push([x, y]);
        const p = previewRoadTiles(w, line);
        if (p.ok) { found = { run, line, p }; break; }
      }
    }
    expect(Boolean(found)).toBe(true);
    const { run, line, p } = found;
    expect([p.ferries.length, p.ferries[0].water, p.ferries[0].landings]).toEqual([1, run.water, run.landings]);
    const r = drawRoadTiles(w, line);
    expect([r.ok, landingsOf(w).length, w.road[at(w, line[0][0], line[0][1])]]).toEqual([true, 2, 1]);
  });
});
