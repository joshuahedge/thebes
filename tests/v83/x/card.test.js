// Version 8.3 "Lines", Track X (rulings 1396-1400): the Crossing card. It shows bridges and ferries, ranked by 8.2.1's rule (narrowest water first, then
// nearness in bands, at most 3, at least 4 tiles apart, none beside one laid); a bridge plan is laid by drawRoadTiles (one 'road' undo entry), a ferry plan
// as 8.2.1 lays it; its drag lays a bridge over narrow water. On a river 3 tiles wide for rows 0-3 and 7 wide below, with a road down the west bank.
import { describe, it, expect } from '../../harness.js';
import { setRoad } from '../../helpers/testWorld.js';
import { ferryWorld, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { crossingChoices, ferryChoices, previewCrossing, previewFerry, crossingCost, crossingWater } from '../../../src/sim/ferryFind.js';
import { buildCrossing } from '../../../src/sim/ferryLay.js';
import { previewRoadTiles } from '../../../src/sim/commands.js';
import { landingsOf } from '../../../src/sim/ferries.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { undoLast } from '../../../src/sim/undo.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

const at = (w, x, y) => idx(w.size, x, y);
export const FROM = { x: RIVER_X + 1.5, y: ROW + 0.5 };
// The river is 3 tiles wide on rows 0-3 (a bridge's) and 7 below (a ferry's); a road runs down the west bank (x = RIVER_X - 2) and along row 10 to it.
export function mixedWorld() {
  const w = ferryWorld(7, { roads: false });
  for (let y = 0; y < 4; y++) for (let x = RIVER_X + 3; x < RIVER_X + 7; x++) w.terrain[at(w, x, y)] = T.DESERT;
  setRoad(w, 4, ROW, RIVER_X - 2, ROW);
  setRoad(w, RIVER_X - 2, 0, RIVER_X - 2, w.size - 1);
  return w;
}

describe('v83 x card: the crossings it shows', () => {
  it('shows a bridge where the water allows one and ferries where it does not, ranked narrowest water first, each at least 4 tiles apart', () => {
    const w = mixedWorld();
    const shown = crossingChoices(w, FROM);
    expect(shown.map((c) => [c.kind, c.water])).toEqual([['bridge', 3], ['ferry', 7], ['ferry', 7]]);
    const [b] = shown;
    expect([b.key, b.ends, b.ok, b.landings]).toEqual(['bridge:11,3,15,3', [[RIVER_X - 1, 3], [RIVER_X + 3, 3]], true, undefined]);
    for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
      expect(Math.max(Math.abs(shown[i].mid[0] - shown[j].mid[0]), Math.abs(shown[i].mid[1] - shown[j].mid[1]))).toBeGreaterThanOrEqual(4);
    }
    // the 8.2.1 finder still shows ferries only
    expect(ferryChoices(w, FROM).every((c) => c.kind === 'ferry')).toBe(true);
  });

  it('a bridge\'s price is what drawRoadTiles charges for its line: its dry tiles at the road price and its water at the bridge price', () => {
    const w = mixedWorld();
    const b = crossingChoices(w, FROM)[0];
    const p = previewRoadTiles(w, b.tiles);
    expect([p.ok, p.bridges.length, p.cost, b.cost]).toEqual([true, 3, b.cost, b.roads.length * roadCostOf(w) + 3 * costOf(w, 'bridge')]);
    expect(crossingCost(w, b)).toBe(b.cost);
    expect(crossingWater(b)).toEqual([[RIVER_X, 3], [RIVER_X + 1, 3], [RIVER_X + 2, 3]]);
    // the near bank is beside the road down the bank: no stub there; the far bank gets a 3-tile stub on from it
    expect(b.stubs.map((s) => s.length).sort()).toEqual([0, 3]);
  });

  it('builds a bridge as a road (one Undo takes it back), and then shows no other bridge beside it', () => {
    const w = mixedWorld();
    const b = crossingChoices(w, FROM)[0];
    const gold = w.gold;
    const r = buildCrossing(w, b);
    expect([r.ok, r.kind, gold - w.gold, w.undo[w.undo.length - 1].kind]).toEqual([true, 'bridge', b.cost, 'road']);
    expect(b.tiles.every(([x, y]) => w.road[at(w, x, y)] === 1)).toBe(true);
    expect(crossingChoices(w, FROM).filter((c) => c.kind === 'bridge')).toEqual([]);    // the narrow rows are within 4 of the one standing
    expect(undoLast(w).ok).toBe(true);
    expect([w.gold, b.tiles.some(([x, y]) => w.road[at(w, x, y)] && x >= RIVER_X && x < RIVER_X + 3)]).toEqual([gold, false]);
    expect(crossingChoices(w, FROM)[0].key).toBe(b.key);
  });

  it('builds a ferry as 8.2.1 does, its two landings and its stub', () => {
    const w = mixedWorld();
    const f = crossingChoices(w, FROM).find((c) => c.kind === 'ferry');
    const r = buildCrossing(w, f);
    expect([r.ok, landingsOf(w).map((l) => [l.x, l.y]), w.undo[w.undo.length - 1].kind]).toEqual([true, f.landings, 'place']);
  });

  it('a drag in the Crossing card lays a bridge over narrow water and a ferry over wide', () => {
    const w = mixedWorld();
    const line = (y) => { const out = []; for (let x = RIVER_X - 2; x <= RIVER_X + 8; x++) out.push([x, y]); return out; };
    const narrow = previewCrossing(w, line(1));
    expect([narrow.ok, narrow.kind, narrow.ends, narrow.water]).toEqual([true, 'bridge', [[RIVER_X - 1, 1], [RIVER_X + 3, 1]], 3]);
    const wide = previewCrossing(w, line(20));
    expect([wide.ok, wide.kind, wide.landings, wide.water]).toEqual([true, 'ferry', [[RIVER_X - 1, 20], [RIVER_X + 7, 20]], 7]);
    // the 8.2.1 Ferry drag still refuses narrow water as a bridge's
    expect(previewFerry(w, line(1)).reason).toBe('ferry_bridge');
  });

  it('is the same every time for the same map, and shows nothing on a map with no river', () => {
    const a = JSON.stringify(crossingChoices(mixedWorld(), FROM));
    expect(JSON.stringify(crossingChoices(mixedWorld(), FROM))).toBe(a);
    const oasis = createWorld({ seed: 1, mapVariant: 'great-oasis' });
    expect(crossingChoices(oasis, oasis.focus)).toEqual([]);
  });
});
