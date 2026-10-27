// Version 8.2.1 "Easier ferries" (rulings 1340-1359): the finder, the stubs, the snapping drag and the laying, each set up both ways, on the 7.1 test river
// (tests/v71/f/helpers.js: 32 x 32, a river down x = 12 .. 12 + width - 1, roads along row 10) and on real maps.
import { describe, it, expect } from '../../harness.js';
import { addRaw, setRoad } from '../../helpers/testWorld.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { ferryChoices, previewFerry, judgeCrossing, crossingCost, crossingWater, anyCrossingNearRoads, freeLand } from '../../../src/sim/ferryFind.js';
import { ferrySpot, ferryLinks, landingsOf, previewFerry as previewFromFerries } from '../../../src/sim/ferries.js';
import { buildCrossing, drawFerry } from '../../../src/sim/ferryLay.js';
import { FERRY, FERRY_FIND } from '../../../src/data/ferries.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { undo, undoLast } from '../../../src/sim/undo.js';
import { roadReach } from '../../../src/sim/reach.js';
import { drawRoute } from '../../../src/sim/route.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

const at = (w, x, y) => idx(w.size, x, y);
const FROM = { x: RIVER_X + 3.5, y: ROW + 0.5 };
// A river with a road on the west bank only (to the tile before the landing), so the far bank has none: the 7.1 tool's "backwards" case.
const westOnly = (width = 7) => { const w = ferryWorld(width, { roads: false }); setRoad(w, 4, ROW, RIVER_X - 2, ROW); return w; };
const keyOf = (a, b) => `${a[0]},${a[1]},${b[0]},${b[1]}`;

// A real city whose road reaches the bank: a routed road from the start road's end to two tiles behind the near landing of the crossing ferrySpot finds
// nearest that end. Returns the world and that spot's key.
function cityAtTheBank(variant, seed = 1) {
  const w = createWorld({ seed, mapVariant: variant });
  w.gold = 100000;
  const st = w.startRoad[w.startRoad.length - 1];
  const s = ferrySpot(w, { x: st[0], y: st[1] });
  const d = (t) => Math.abs(t[0] - st[0]) + Math.abs(t[1] - st[1]);
  const [l, o] = d(s.from) <= d(s.to) ? [s.from, s.to] : [s.to, s.from];
  const away = s.vertical ? [0, Math.sign(l[1] - o[1])] : [Math.sign(l[0] - o[0]), 0];
  expect(drawRoute(w, st[0], st[1], l[0] + 2 * away[0], l[1] + 2 * away[1]).ok).toBe(true);
  return w;
}

describe('v821 f sim: the crossings the Ferry tool shows', () => {
  it('finds the known crossings near the roads on fixed seeds of the classic, wide Nile, delta and lake-fed maps', () => {
    const known = { classic: ['9,44,9,54'], 'wide-nile': ['14,58,21,58'], delta: ['45,54,51,54', '44,50,50,50', '45,41,45,51'], 'lake-fed': ['16,50,16,57'] };
    for (const [variant, keys] of Object.entries(known)) {
      const w = cityAtTheBank(variant);
      const shown = ferryChoices(w, w.focus);
      expect([variant, shown.length >= 1 && shown.length <= FERRY_FIND.shown]).toEqual([variant, true]);
      for (const k of keys) expect([variant, k, shown.some((c) => c.key === k), shown.map((c) => c.key)]).toEqual([variant, k, true, shown.map((c) => c.key)]);
      for (const c of shown) {
        expect([c.ok, c.joins, c.water >= FERRY.min && c.water <= FERRY.max]).toEqual([true, true, true]);
        expect(c.landings.every(([x, y]) => freeLand(w, x, y)) && c.roads.every(([x, y]) => freeLand(w, x, y))).toBe(true);
        expect(crossingWater(c).every(([x, y]) => w.terrain[at(w, x, y)] === T.WATER)).toBe(true);
        expect(c.cost).toBe(2 * costOf(w, 'ferry_landing') + c.roads.length * roadCostOf(w));
      }
    }
  });

  it('is the same for the same map every time (deterministic), and finds none where the roads reach no crossing, or on the Oasis', () => {
    const a = JSON.stringify(ferryChoices(cityAtTheBank('delta'), { x: 30, y: 50 }));
    expect(JSON.stringify(ferryChoices(cityAtTheBank('delta'), { x: 30, y: 50 }))).toBe(a);
    const fresh = createWorld({ seed: 1, mapVariant: 'classic' });             // a new city: the start road stops well short of the river
    expect([ferryChoices(fresh, fresh.focus).length, anyCrossingNearRoads(fresh), ferrySpot(fresh, fresh.focus) !== null]).toEqual([0, false, true]);
    const oasis = createWorld({ seed: 1, mapVariant: 'great-oasis' });        // ruling 1333: the Oasis has no ferries, even with a road to the lake's edge
    const s = ferrySpot(oasis, oasis.focus), st = oasis.startRoad[oasis.startRoad.length - 1];
    oasis.gold = 100000;
    drawRoute(oasis, st[0], st[1], s.from[0], s.from[1] + 1);
    expect([s.water >= FERRY.min, ferryChoices(oasis, oasis.focus).length]).toEqual([true, 0]);
  });

  it('is fast on a Huge map, and kept while nothing it reads changes', () => {
    const w = createWorld({ seed: 7, size: 112, mapVariant: 'wide-nile' });
    const t0 = performance.now();
    ferryChoices(w, w.focus);
    const cold = performance.now() - t0;
    const t1 = performance.now();
    for (let k = 0; k < 10; k++) ferryChoices(w, w.focus);
    const warm = (performance.now() - t1) / 10;
    expect([cold < 120, warm < 20]).toEqual([true, true]);
  });

  it('sees a road or a building at once, even one written straight into the map (the memo\'s key covers every input)', () => {
    const w = westOnly();
    expect(ferryChoices(w, FROM).some((c) => c.key === keyOf([RIVER_X - 1, ROW], [RIVER_X + 7, ROW]))).toBe(true);
    addRaw(w, 'house', RIVER_X + 7, ROW);                                      // a plot on the far landing's tile: that crossing goes
    expect(ferryChoices(w, FROM).some((c) => c.key === keyOf([RIVER_X - 1, ROW], [RIVER_X + 7, ROW]))).toBe(false);
    const bare = ferryWorld(7, { roads: false });
    expect(ferryChoices(bare, FROM).length).toBe(0);
    for (let x = 4; x <= RIVER_X - 2; x++) bare.road[at(bare, x, ROW)] = 1;     // no roadVersion bump
    expect(ferryChoices(bare, FROM).length > 0).toBe(true);
  });

  it('ranks the narrowest water first, then the nearest, and shows crossings apart from each other', () => {
    // the 7-wide river, and a 5-wide arm of it across the west bank (rows 20..24) that a road down x = 6 reaches; the start road names the west bank's road the network
    const w = ferryWorld(7);
    w.startRoad = [[4, ROW]];
    setRoad(w, 6, ROW + 1, 6, 18);
    for (let y = 20; y <= 24; y++) for (let x = 0; x < RIVER_X; x++) w.terrain[at(w, x, y)] = T.WATER;
    const shown = ferryChoices(w, FROM);
    expect([shown[0].water, shown[0].vertical, shown.length]).toEqual([5, true, 2]);   // one a bank: the next crossing along each is nearer than FERRY_FIND.apart
    for (let i = 0; i < shown.length; i++) {
      for (let j = i + 1; j < shown.length; j++) expect(Math.max(Math.abs(shown[i].mid[0] - shown[j].mid[0]), Math.abs(shown[i].mid[1] - shown[j].mid[1])) >= FERRY_FIND.apart).toBe(true);
    }
    w.startRoad = [[25, ROW]];                                                 // the east bank's road is the network now: the arm is out of reach
    expect(ferryChoices(w, FROM).every((c) => c.water === 7)).toBe(true);
    // one river with a road all along the west bank: everything else equal, the crossing nearest where the player looks comes first, either way
    const one = westOnly();
    setRoad(one, RIVER_X - 2, 0, RIVER_X - 2, one.size - 1);
    expect(ferryChoices(one, { x: RIVER_X + 3.5, y: 25.5 })[0].landings[0]).toEqual([RIVER_X - 1, 25]);
    expect(ferryChoices(one, { x: RIVER_X + 3.5, y: 4.5 })[0].landings[0]).toEqual([RIVER_X - 1, 4]);
  });
});

describe('v821 f sim: the road a crossing brings', () => {
  it('the far bank needs no road: the far landing gets a stub of road away from the water, priced in', () => {
    const w = westOnly();
    const c = ferryChoices(w, FROM)[0];
    expect(c.landings).toEqual([[RIVER_X - 1, ROW], [RIVER_X + 7, ROW]]);
    expect(c.stubs).toEqual([[], [[RIVER_X + 8, ROW], [RIVER_X + 9, ROW], [RIVER_X + 10, ROW]]]);
    expect(c.cost).toBe(2 * costOf(w, 'ferry_landing') + FERRY_FIND.farStub * roadCostOf(w));
    // with the way on blocked, the stub runs along the bank instead; with no room at all, the crossing is not shown
    addRaw(w, 'house', RIVER_X + 9, ROW);
    const side = ferryChoices(w, FROM).find((k) => k.key === c.key);
    expect(side.stubs[1]).toEqual([[RIVER_X + 7, ROW + 1], [RIVER_X + 7, ROW + 2], [RIVER_X + 7, ROW + 3]]);
    addRaw(w, 'house', RIVER_X + 7, ROW + 1); addRaw(w, 'house', RIVER_X + 7, ROW - 2);
    expect(ferryChoices(w, FROM).some((k) => k.key === c.key)).toBe(false);
    expect(previewFerry(w, dragLine(7)).ok).toBe(true);                       // a drag there snaps to the next row, which has the room
  });

  it('the near landing gets a stub of up to 3 tiles to the network; 4 is too far', () => {
    for (const gap of [1, 2, 3, 4]) {
      const w = ferryWorld(7, { roads: false });
      setRoad(w, 2, ROW, RIVER_X - 2 - gap, ROW);                              // the road stops gap tiles short of the tile beside the landing
      const c = ferryChoices(w, { x: RIVER_X + 3.5, y: ROW + 0.5 }).find((k) => k.landings[0][1] === ROW);
      if (gap <= FERRY_FIND.nearStub) expect([gap, c.stubs[0].length]).toEqual([gap, gap]);
      else expect([gap, c]).toEqual([gap, undefined]);
    }
    expect(FERRY_FIND.nearStub).toBe(3);
  });

  it('a picked crossing builds both landings and its stubs, joins the two banks\' roads once staffed, and undo takes all of it back', () => {
    const w = westOnly();
    addRaw(w, 'house', 2, 12, { tier: 1, residents: 40 });
    const gold = w.gold;
    const c = ferryChoices(w, FROM)[0];
    const r = buildCrossing(w, c);
    expect([r.ok, w.gold]).toEqual([true, gold - c.cost]);                     // the price shown is the gold spent
    expect(landingsOf(w).map((b) => [b.x, b.y])).toEqual(c.landings);
    expect(c.roads.every(([x, y]) => w.road[at(w, x, y)] === 1)).toBe(true);
    settle(w);
    expect(ferryLinks(w).length).toBe(1);
    const store = addRaw(w, 'storehouse', 6, ROW + 1);
    expect(roadReach(w, store, 60).has(at(w, RIVER_X + 10, ROW))).toBe(true);   // the walk goes over the river to the end of the far stub
    expect(undoLast(w).ok).toBe(true);
    expect([landingsOf(w).length, c.roads.some(([x, y]) => w.road[at(w, x, y)]), w.gold]).toEqual([0, false, gold]);
  });

  it('the 7.1 crossing between two roads lays no road and costs its two landings, as before', () => {
    const w = ferryWorld(7);
    const p = previewFerry(w, dragLine(7));
    expect([p.ok, p.roads, p.cost, previewFromFerries === previewFerry]).toEqual([true, [], 160, true]);
    const gold = w.gold;
    drawFerry(w, dragLine(7));
    expect(undo(w).ok && w.gold === gold).toBe(true);
  });
});

describe('v821 f sim: a drag forgives', () => {
  it('a wobbly drag snaps to the straight crossing, and a drag that starts or ends in the water slides its ends to the first dry land', () => {
    const w = westOnly();
    const wobbly = [[RIVER_X - 2, ROW], [RIVER_X - 1, ROW], [RIVER_X, ROW], [RIVER_X + 1, ROW], [RIVER_X + 1, ROW + 1], [RIVER_X + 2, ROW + 1], [RIVER_X + 3, ROW + 1], [RIVER_X + 4, ROW + 1], [RIVER_X + 4, ROW + 2], [RIVER_X + 5, ROW + 2], [RIVER_X + 6, ROW + 2], [RIVER_X + 7, ROW + 2]];
    const p = previewFerry(w, wobbly);
    expect([p.ok, p.water, p.vertical, p.landings[0][0], p.landings[1][0]]).toEqual([true, 7, false, RIVER_X - 1, RIVER_X + 7]);
    const inWater = previewFerry(w, dragLine(7).slice(3, 8));                 // only water tiles
    expect([inWater.ok, inWater.landings]).toEqual([true, [[RIVER_X - 1, ROW], [RIVER_X + 7, ROW]]]);
    const back = previewFerry(w, dragLine(7).slice(3, 8).reverse());
    expect(back.landings).toEqual([[RIVER_X + 7, ROW], [RIVER_X - 1, ROW]]);
    // a landing's tile taken: the drag snaps to the next row that works, and says it snapped
    const taken = westOnly();
    addRaw(taken, 'house', RIVER_X + 7, ROW);
    const s = previewFerry(taken, dragLine(7));
    expect([s.ok, s.snapped, Math.abs(s.landings[0][1] - ROW) <= FERRY_FIND.snap]).toEqual([true, true, true]);
  });

  it('still refuses the impossible: too narrow (a bridge), too wide, no land, no road anywhere near, no gold', () => {
    expect(previewFerry(ferryWorld(4), dragLine(4)).reason).toBe('ferry_bridge');
    expect(previewFerry(ferryWorld(13), dragLine(13)).reason).toBe('ferry_too_wide');
    expect(previewFerry(ferryWorld(7, { roads: false }), dragLine(7)).reason).toBe('ferry_no_road');
    expect(previewFerry(ferryWorld(7), [[3, 3], [4, 3]]).reason).toBe('ferry_no_water');
    const sea = ferryWorld(7);                                                 // 8 tiles of water that run to the map's edge: no far bank
    for (let x = 24; x < sea.size; x++) for (let y = 0; y < sea.size; y++) { sea.terrain[at(sea, x, y)] = T.WATER; sea.road[at(sea, x, y)] = 0; }
    const edge = previewFerry(sea, [[22, ROW], [23, ROW], [24, ROW], [25, ROW]]);
    expect([edge.reason, edge.water]).toEqual(['ferry_no_land', 8]);
    const poor = westOnly();
    poor.gold = -9999;
    const p = previewFerry(poor, dragLine(7));
    expect([p.ok, p.reason, p.cost]).toEqual([false, 'no_gold', crossingCost(poor, p)]);
    expect(judgeCrossing(poor, p).reason).toBe('no_gold');
  });
});
