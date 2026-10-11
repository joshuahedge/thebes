import { describe, it, expect } from '../harness.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
import {
  canPlace, place, drawRoad, previewRoad, paintHouses, previewHouses, demolishAt, demolishArea, previewDemolishArea, demolishRefundFor,
} from '../../src/sim/commands.js';
import { undo } from '../../src/sim/undo.js';
import { buildingAt } from '../../src/sim/world.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

// Road along y = 10, at the given difficulty.
function cityAt(difficulty, gold = 1000) {
  const w = makeTestWorld({ gold });
  w.difficulty = difficulty;
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const byLevel = (fn) => DIFFICULTY_ORDER.map((d) => fn(cityAt(d)));

describe('costs', () => {
  it('scales building costs by the difficulty, rounded to whole gold', () => {
    expect(byLevel((w) => costOf(w, 'well'))).toEqual([24, 30, 38]);         // 37.5 rounds up
    expect(byLevel((w) => costOf(w, 'temple'))).toEqual([96, 120, 150]);
    expect(byLevel((w) => costOf(w, 'granary'))).toEqual([64, 80, 100]);
    expect(byLevel((w) => costOf(w, 'house'))).toEqual([4, 5, 6]);           // 6.25 rounds down
  });
  it('leaves every Normal cost exactly as the data says', () => {
    const w = cityAt('normal');
    for (const type of Object.keys(BUILDINGS)) expect([type, costOf(w, type)]).toEqual([type, BUILDINGS[type].cost]);
    expect(roadCostOf(w)).toBe(ECONOMY.roadCost);
  });
  it('scales road tiles too, and never charges less than 1 gold', () => {
    expect(byLevel((w) => roadCostOf(w))).toEqual([2, 2, 3]);                 // 1.6 rounds to 2, 2.5 to 3
    const saved = BUILDINGS.house.cost;
    BUILDINGS.house.cost = 0.4;                                                // 0.32, 0.4 and 0.5 would round to 0, 0 and 1
    try {
      expect(byLevel((w) => costOf(w, 'house'))).toEqual([1, 1, 1]);
    } finally { BUILDINGS.house.cost = saved; }
  });
  it('charges the scaled cost when placing, drawing roads and painting plots, and records it for undo', () => {
    const w = cityAt('hard');
    expect(place(w, 'well', 12, 9).ok).toBe(true);
    expect(w.gold).toBe(1000 - 38);
    expect(w.undo[w.undo.length - 1].cost).toBe(38);
    const road = drawRoad(w, 12, 14, 16, 14);                                  // five new tiles
    expect(road.cost).toBe(15);
    expect(w.gold).toBe(1000 - 38 - 15);
    const plots = paintHouses(w, 12, 15, 14, 15);                              // three plots
    expect(plots.cost).toBe(18);
    expect(w.gold).toBe(1000 - 38 - 15 - 18);
    expect(previewRoad(cityAt('relaxed'), 12, 14, 16, 14).cost).toBe(10);
    expect(previewHouses(cityAt('relaxed'), 12, 15, 14, 15).cost).toBe(12);
  });
  it('judges the debt floor against the scaled cost', () => {
    const gold = ECONOMY.debtFloor + 37;                                      // enough for a well on Normal or Relaxed, not on Hard
    for (const [d, ok] of [['relaxed', true], ['normal', true], ['hard', false]]) {
      const w = cityAt(d, gold);
      const r = canPlace(w, 'well', 12, 9);
      expect([d, r.ok, r.reason || null]).toEqual([d, ok, ok ? null : 'no_gold']);
    }
    expect(previewRoad(cityAt('hard', ECONOMY.debtFloor + 5), 12, 14, 13, 14).reason).toBe('no_gold');   // two tiles at 3 gold
    expect(previewRoad(cityAt('normal', ECONOMY.debtFloor + 5), 12, 14, 13, 14).ok).toBe(true);
  });
  it('refunds a quarter of the scaled cost on demolish, and nothing for plots', () => {
    const refunds = byLevel((w) => {
      place(w, 'temple', 12, 8);
      const b = buildingAt(w, 12, 8);
      const before = w.gold;
      const expected = demolishRefundFor(w, b);
      expect(previewDemolishArea(w, 12, 8, 13, 9).refund).toBe(expected);
      const r = demolishAt(w, 12, 8);
      expect(r.refund).toBe(expected);
      expect(w.gold).toBe(before + expected);
      return expected;
    });
    expect(refunds).toEqual([24, 30, 37]);                                     // 37.5 rounds down
    const w = cityAt('hard');
    place(w, 'house', 20, 20);
    expect(demolishRefundFor(w, buildingAt(w, 20, 20))).toBe(0);
    place(w, 'well', 12, 9);
    expect(demolishArea(w, 12, 9, 20, 20).refund).toBe(9);                     // the well's floor(38 / 4); the plot gives nothing
  });
  it('undoes every action with exactly what it charged or refunded', () => {
    for (const d of DIFFICULTY_ORDER) {
      const w = cityAt(d);
      place(w, 'temple', 12, 8);
      drawRoad(w, 12, 14, 16, 14);
      paintHouses(w, 12, 15, 14, 15);
      const spent = w.gold;
      demolishAt(w, 12, 8);
      undo(w);                                                                 // the demolish: its refund is taken back
      expect([d, w.gold]).toEqual([d, spent]);
      undo(w); undo(w); undo(w);
      expect([d, w.gold]).toEqual([d, 1000]);
    }
  });
  it('refunds the recorded cost on undo, not the cost as it stands now', () => {
    const w = cityAt('hard');
    place(w, 'well', 12, 9);
    w.difficulty = 'relaxed';                                                  // never happens in play: proves undo reads its record
    undo(w);
    expect(w.gold).toBe(1000);
  });
});
