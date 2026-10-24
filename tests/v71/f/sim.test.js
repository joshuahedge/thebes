// Version 7.1, Track F (rulings 1040-1059): the ferry's rule, both ways for each part (4 vs 5 tiles of water, 12 vs 13, a bent line, no land at the far end, no road at a landing,
// no ferryman), the crossing as a road link for walkers and carts, raiders that ignore it, and the save.
import { describe, it, expect } from '../../harness.js';
import { addRaw } from '../../helpers/testWorld.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from './helpers.js';
import { previewFerry, ferryCost, ferrySpot, landingBlocker, landingsOf, ferryInfo, ferryLinks, crossingTiles, mateOf, syncFerries, FERRY } from '../../../src/sim/ferries.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { BRIDGE_MAX } from '../../../src/sim/bridges.js';
import { costOf } from '../../../src/sim/costs.js';
import { undo } from '../../../src/sim/undo.js';
import { demolishAt, previewRoad } from '../../../src/sim/commands.js';
import { roadReach, reachDistance } from '../../../src/sim/reach.js';
import { roadLen, cartPath } from '../../../src/sim/carts.js';
import { flowField, tileCost } from '../../../src/sim/pathfinding.js';
import { postConnected } from '../../../src/sim/trade.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { serialize, deserialize, validateWorld } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { idx } from '../../../src/sim/grid.js';

const at = (w, x, y) => idx(w.size, x, y);

describe('v71 f sim: the rule', () => {
  it('a ferry crosses 5 to 12 tiles of water: 4 is a bridge\'s, 13 is too wide', () => {
    expect([FERRY.min, FERRY.max, BRIDGE_MAX]).toEqual([5, 12, 4]);
    const verdict = (width) => { const p = previewFerry(ferryWorld(width), dragLine(width)); return [width, p.ok, p.reason, p.water]; };
    expect(verdict(4)).toEqual([4, false, 'ferry_bridge', 4]);
    expect(verdict(5)).toEqual([5, true, null, 5]);
    expect(verdict(8)).toEqual([8, true, null, 8]);
    expect(verdict(12)).toEqual([12, true, null, 12]);
    expect(verdict(13)).toEqual([13, false, 'ferry_too_wide', 13]);
    expect(verdict(20)).toEqual([20, false, 'ferry_too_wide', 20]);
    // the road tool's own verdict on the same water is the mirror: 4 bridges, 5 is too wide
    expect(previewRoad(ferryWorld(4), 10, ROW, 10 + 4 + 3, ROW).ok).toBe(true);
    expect(previewRoad(ferryWorld(5), 10, ROW, 10 + 5 + 3, ROW).reason).toBe('too_wide');
  });

  it('puts a landing on the free dry tile at each end of the water, and prices the two together', () => {
    const w = ferryWorld(7);
    const p = previewFerry(w, dragLine(7));
    expect(p.landings).toEqual([[RIVER_X - 1, ROW], [RIVER_X + 7, ROW]]);
    expect([p.cost, ferryCost(w), 2 * costOf(w, 'ferry_landing')]).toEqual([160, 160, 160]);
    w.difficulty = 'hard';
    expect(ferryCost(w)).toBe(2 * costOf(w, 'ferry_landing'));
    expect(ferryCost(w)).toBeGreaterThan(160);
    // dragged the other way, the same crossing
    const back = previewFerry(ferryWorld(7), dragLine(7).reverse());
    expect([back.ok, back.landings]).toEqual([true, [[RIVER_X + 7, ROW], [RIVER_X - 1, ROW]]]);
  });

  it('refuses a bent line, and a line over more than one stretch of water', () => {
    const w = ferryWorld(7);
    const bent = [...dragLine(7).slice(0, 6), [RIVER_X + 3, ROW + 1], [RIVER_X + 3, ROW + 2]];
    expect(previewFerry(w, bent).reason).toBe('ferry_bent');
    // an L: across on row 10 then down the far bank
    const el = [...dragLine(7), [RIVER_X + 8, ROW + 1], [RIVER_X + 8, ROW + 2]];
    expect(previewFerry(w, el).reason).toBe('ferry_bent');
    // two stretches of water with an island between: not one crossing
    const isle = ferryWorld(12);
    for (let y = 0; y < isle.size; y++) isle.terrain[at(isle, RIVER_X + 6, y)] = T.DESERT;
    expect(previewFerry(isle, dragLine(12)).reason).toBe('ferry_bent');
    // and the same straight line without the island is fine
    expect(previewFerry(ferryWorld(12), dragLine(12)).ok).toBe(true);
    expect(previewFerry(w, [[3, 3], [4, 3], [5, 3]]).reason).toBe('ferry_no_water');
  });

  it('needs free dry land at each end: not in the water, not on a building, a road or a wall', () => {
    const w = ferryWorld(7);
    expect(previewFerry(w, dragLine(7).slice(0, 9)).reason).toBe('ferry_no_land');          // the line stops in the water
    expect(previewFerry(w, dragLine(7).slice(2)).reason).toBe('ferry_no_land');             // and begins in it
    const house = ferryWorld(7);
    addRaw(house, 'house', RIVER_X + 7, ROW);
    expect(previewFerry(house, dragLine(7)).reason).toBe('ferry_no_land');                 // a plot on the far landing's tile
    const road = ferryWorld(7);
    road.road[at(road, RIVER_X - 1, ROW)] = 1;
    expect(previewFerry(road, dragLine(7)).reason).toBe('ferry_no_land');                  // road already there: nothing to land on
    const hills = ferryWorld(7);
    hills.terrain[at(hills, RIVER_X + 7, ROW)] = T.HILLS;
    expect(previewFerry(hills, dragLine(7)).reason).toBe('ferry_no_land');
    const wall = ferryWorld(7);
    wall.wall[at(wall, RIVER_X - 1, ROW)] = 80;
    expect(previewFerry(wall, dragLine(7)).reason).toBe('ferry_no_land');
    expect(previewFerry(ferryWorld(7), dragLine(7)).ok).toBe(true);
  });

  it('needs a road beside each landing, and the drag may go on into the road', () => {
    const none = ferryWorld(7, { roads: false });
    expect(previewFerry(none, dragLine(7)).reason).toBe('ferry_no_road');
    const west = ferryWorld(7, { roads: false });
    for (let x = RIVER_X + 8; x < 26; x++) west.road[at(west, x, ROW)] = 1;               // a road on the east bank only
    const r = previewFerry(west, dragLine(7));
    expect([r.reason, r.at]).toEqual(['ferry_no_road', [RIVER_X - 1, ROW]]);
    // a road beside the landing that is not on the line (a street running along the bank) counts too
    const side = ferryWorld(7, { roads: false });
    for (let x = RIVER_X + 8; x < 26; x++) side.road[at(side, x, ROW)] = 1;
    side.road[at(side, RIVER_X - 1, ROW + 1)] = 1;
    expect(previewFerry(side, dragLine(7)).ok).toBe(true);
    expect(previewFerry(ferryWorld(7), dragLine(7)).ok).toBe(true);
  });

  it('refuses a crossing the treasury cannot pay, keeping what it would cost', () => {
    const w = ferryWorld(7, { gold: ECONOMY.debtFloor + 100 });   // the treasury may go into debt to the floor, no further
    const p = previewFerry(w, dragLine(7));
    expect([p.ok, p.reason, p.cost]).toEqual([false, 'no_gold', 160]);
  });
});

describe('v71 f sim: laying, working and undoing a ferry', () => {
  it('lays two landings linked as one crossing, pays for both, and undo takes both away and refunds', () => {
    const w = ferryWorld(7);
    const gold = w.gold;
    const r = drawFerry(w, dragLine(7));
    expect([r.ok, r.cost, w.gold]).toEqual([true, 160, gold - 160]);
    const [a, b] = r.ids.map((id) => w.buildings[id]);
    expect([a.type, b.type, [a.x, a.y], [b.x, b.y]]).toEqual(['ferry_landing', 'ferry_landing', [RIVER_X - 1, ROW], [RIVER_X + 7, ROW]]);
    expect([a.ferry, b.ferry]).toEqual([{ mate: b.id, water: 7, run: false }, { mate: a.id, water: 7, run: false }]);
    expect([mateOf(w, a).id, mateOf(w, b).id]).toEqual([b.id, a.id]);
    expect(landingsOf(w).length).toBe(2);
    expect(undo(w).ok).toBe(true);
    expect([landingsOf(w).length, w.gold]).toEqual([0, gold]);
    expect(drawFerry(w, [[3, 3], [4, 3]]).ok).toBe(false);
  });

  it('runs only when both landings have a ferryman: staffed, it runs; with nobody to hire it does not', () => {
    const w = ferryWorld(7);
    const [a, b] = drawFerry(w, dragLine(7)).ids.map((id) => w.buildings[id]);
    expect(landingBlocker(w, a)).toBe('no_ferryman');                          // laid, not staffed yet
    settle(w);
    expect([a.staff, b.staff, a.ferry.run, b.ferry.run, landingBlocker(w, a), landingBlocker(w, b)]).toEqual([1, 1, true, true, null, null]);
    expect(ferryLinks(w).length).toBe(1);
    const empty = ferryWorld(7, { people: false });
    const [c, d] = drawFerry(empty, dragLine(7)).ids.map((id) => empty.buildings[id]);
    settle(empty);
    expect([c.staff, d.staff, c.ferry.run, landingBlocker(empty, c), ferryLinks(empty).length]).toEqual([0, 0, false, 'no_ferryman', 0]);
  });

  it('says why it does not run, for each cause: paused, the other landing paused, no road, the other landing gone', () => {
    const w = ferryWorld(7);
    const [a, b] = drawFerry(w, dragLine(7)).ids.map((id) => w.buildings[id]);
    settle(w);
    a.paused = true;
    settle(w);
    expect([landingBlocker(w, a), landingBlocker(w, b), a.ferry.run, b.ferry.run]).toEqual(['paused', 'mate_paused', false, false]);
    a.paused = false;
    settle(w);
    expect([landingBlocker(w, a), a.ferry.run]).toEqual([null, true]);
    for (const t of [[RIVER_X - 2, ROW]]) w.road[at(w, ...t)] = 0;                  // the road beside the west landing
    w.roadVersion++;
    settle(w);
    expect([landingBlocker(w, a), landingBlocker(w, b)]).toEqual(['no_road', 'mate_no_road']);
    w.road[at(w, RIVER_X - 2, ROW)] = 1;
    w.roadVersion++;
    settle(w);
    expect(landingBlocker(w, b)).toBe(null);
    b.fire = { stage: 'fire' };
    expect([landingBlocker(w, a), landingBlocker(w, b)]).toEqual(['mate_burning', 'burning']);
    b.fire = null;
    expect(demolishAt(w, b.x, b.y).ok).toBe(true);
    settle(w);
    expect([landingBlocker(w, a), a.ferry.run, ferryLinks(w).length]).toEqual(['no_mate', false, 0]);
  });

  it('the crossing counts as a few road tiles plus a wait, and describes itself from the sim\'s own numbers', () => {
    expect([5, 7, 12].map(crossingTiles)).toEqual([5, 6, 7]);
    const w = ferryWorld(7);
    const [a] = drawFerry(w, dragLine(7)).ids.map((id) => w.buildings[id]);
    settle(w);
    const info = ferryInfo(w, a);
    expect([info.water, info.tiles, info.runs, info.dx, info.dy]).toEqual([7, crossingTiles(7), true, 8, 0]);
  });

  it('a landing costs its upkeep and its ferryman\'s wage like any workplace, once it works', () => {
    const w = ferryWorld(7);
    const before = monthFigures(w);
    drawFerry(w, dragLine(7));
    settle(w);
    const after = monthFigures(w);
    expect(after.net).toBeLessThan(before.net);
  });
});

describe('v71 f sim: walkers and carts cross, raiders do not', () => {
  const stores = (w) => ({ west: addRaw(w, 'storehouse', 6, ROW + 1), east: addRaw(w, 'storehouse', RIVER_X + 10, ROW + 1) });

  it('a cart\'s road between two stores is cut by the river and joined by a running ferry, as long as the crossing counts for', () => {
    const w = ferryWorld(7);
    const { west, east } = stores(w);
    expect(roadLen(w, west, east)).toBe(Infinity);
    drawFerry(w, dragLine(7));
    expect(roadLen(w, west, east)).toBe(Infinity);                              // laid but not yet staffed: no crossing
    settle(w);
    // west door (7,10) is 1; along the road to (10,10) = 4; the crossing; the east road's first tile (20,10); along to the east store's door (22,10)
    expect(roadLen(w, west, east)).toBe(4 + crossingTiles(7) + 2);
    expect(roadLen(w, east, west)).toBe(roadLen(w, west, east));
    // the cart's path goes over the crossing: from the road tile beside one landing straight to the one beside the other
    const path = cartPath(w, { to: west.id, from: east.id });
    const west10 = at(w, RIVER_X - 2, ROW), east10 = at(w, RIVER_X + 8, ROW);
    expect(path.indexOf(east10) - path.indexOf(west10)).toBe(1);
    // stop a ferryman: the cut is back
    w.buildings[landingsOf(w)[0].id].paused = true;
    settle(w);
    expect(roadLen(w, west, east)).toBe(Infinity);
  });

  it('the road reach of a building goes over the crossing, to the tile count the crossing counts as, and stops at its limit', () => {
    const w = ferryWorld(7);
    const { west } = stores(w);
    drawFerry(w, dragLine(7));
    settle(w);
    const far = at(w, RIVER_X + 8, ROW);
    const reach = roadReach(w, west, Infinity);
    expect(reach.get(far)).toBe(4 + crossingTiles(7));
    expect(roadReach(w, west, 4 + crossingTiles(7) - 1).has(far)).toBe(false);
    expect(roadReach(w, west, 4 + crossingTiles(7)).has(far)).toBe(true);
    expect(reachDistance(roadReach(w, west, 40), w, { x: RIVER_X + 10, y: ROW + 1, w: 2, d: 2 })).toBe(4 + crossingTiles(7) + 2);
  });

  it('a trading post across the river is joined to the trade entry only while the crossing runs', () => {
    const w = ferryWorld(7);
    w.tradeEntry = { x: 28, y: ROW };
    addRaw(w, 'trading_post', 4, ROW + 1);
    expect(postConnected(w)).toBe(false);
    drawFerry(w, dragLine(7));
    settle(w);
    expect(postConnected(w)).toBe(true);
    landingsOf(w)[1].paused = true;
    settle(w);
    expect(postConnected(w)).toBe(false);
  });

  it('raiders never use it: the water stays impassable, and a flow field to the far bank does not reach the near one, running ferry or not', () => {
    const w = ferryWorld(7);
    drawFerry(w, dragLine(7));
    settle(w);
    expect(landingsOf(w).every((b) => b.ferry.run)).toBe(true);
    for (let x = RIVER_X; x < RIVER_X + 7; x++) expect([x, tileCost(w, x, ROW)]).toEqual([x, Infinity]);
    const field = flowField(w, [[RIVER_X + 12, ROW]]);
    expect(field.dist[at(w, RIVER_X - 4, ROW)]).toBe(Infinity);
    expect(field.dist[at(w, RIVER_X + 11, ROW)]).toBeLessThan(Infinity);
    // a bridge, by contrast, is crossed
    const narrow = ferryWorld(3);
    for (let x = RIVER_X; x < RIVER_X + 3; x++) narrow.road[at(narrow, x, ROW)] = 1;
    expect(flowField(narrow, [[RIVER_X + 6, ROW]]).dist[at(narrow, RIVER_X - 4, ROW)]).toBeLessThan(Infinity);
  });
});

describe('v71 f sim: Show me and the save', () => {
  it('finds the nearest place a ferry fits, by the rule\'s own width, and none where the water is bridgeable or too wide', () => {
    const w = ferryWorld(7);
    const s = ferrySpot(w, { x: 5, y: 20.5 });
    expect([s.water, s.vertical, s.from, s.to]).toEqual([7, false, [RIVER_X - 1, 20], [RIVER_X + 7, 20]]);
    expect(ferrySpot(ferryWorld(4), { x: 5, y: 5 })).toBe(null);
    expect(ferrySpot(ferryWorld(13), { x: 5, y: 5 })).toBe(null);
    expect(ferrySpot(ferryWorld(5), { x: 5, y: 5 }).water).toBe(5);
  });

  it('saves and loads the landings and their crossing unchanged, and a city saved before ferries (world version 10) loads as it was', () => {
    const w = ferryWorld(7);
    const ids = drawFerry(w, dragLine(7)).ids;
    settle(w);
    const back = deserialize(serialize(w));
    expect(back.version).toBe(w.version);
    for (const id of ids) expect(back.buildings[id].ferry).toEqual(w.buildings[id].ferry);
    expect(validateWorld(back)).toBe(true);
    expect(mateOf(back, back.buildings[ids[0]]).id).toBe(ids[1]);
    expect(ferryLinks(back).length).toBe(1);
    // a loaded city keeps its flags: syncing does not move the road version
    const v = back.roadVersion;
    syncFerries(back);
    expect(back.roadVersion).toBe(v);
    // a v10 save without a landing, as written before 7.1: loads (same version, no ferry field anywhere)
    const old = createWorld({ seed: 7 });
    const text = serialize(old);
    expect(text.includes('ferry')).toBe(false);
    expect(deserialize(text).version).toBe(old.version);
    // a landing whose ferry record is malformed is a corrupt save
    const bad = JSON.parse(serialize(w));
    bad.buildings[ids[0]].ferry = { mate: 'x', water: 7, run: false };
    expect(validateWorld(bad)).toBe(false);
    const stray = JSON.parse(serialize(w));
    stray.buildings[Object.keys(stray.buildings)[0]].ferry = { mate: 1, water: 7, run: false };
    expect(validateWorld(stray)).toBe(false);
  });
});
