import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { ECONOMY } from '../../src/data/economy.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { housesOf, population, allBuildings } from '../../src/sim/world.js';
import { makeTestWorld } from '../helpers/testWorld.js';

// A realistic Stage 1 village built from the real starting treasury.
function realVillage() {
  const w = makeTestWorld({ size: 48, fertile: [[0, 0, 8, 48]], gold: ECONOMY.startGold });
  w.calm = true;                                   // Stage 3 contract: no fire or raids until Track F gives it firehouses
  const steps = [
    () => drawRoad(w, 0, 12, 27, 12),
    () => paintHouses(w, 10, 13, 26, 13),
    () => place(w, 'well', 12, 11),
    () => place(w, 'well', 18, 11),
    () => place(w, 'well', 24, 11),
    () => place(w, 'farm_grain', 0, 10),
    () => place(w, 'farm_grain', 2, 10),
    () => place(w, 'farm_grain', 4, 10),
    () => place(w, 'granary', 6, 10),
    () => place(w, 'bazaar', 16, 10),
    () => place(w, 'temple', 19, 10),
  ];
  for (const s of steps) expect(s().ok).toBe(true);
  return w;
}

function checkSane(w) {
  expect(Number.isFinite(w.gold)).toBe(true);
  expect(w.mood).toBeGreaterThanOrEqual(0);
  expect(w.mood).toBeLessThanOrEqual(100);
  for (const b of allBuildings(w)) {
    for (const v of Object.values(b.store)) expect(v).toBeGreaterThanOrEqual(0);
    if (b.type === 'house') {
      expect(b.residents).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(b.stock)) expect(v).toBeGreaterThanOrEqual(0);
    }
  }
}

describe('longrun', () => {
  it('stays sane and solvent for ten years from the starting treasury', () => {
    const w = realVillage();
    const started = performance.now();
    let lowestGold = w.gold;
    for (let month = 0; month < 120; month++) {
      advanceDays(w, 30);
      checkSane(w);
      lowestGold = Math.min(lowestGold, w.gold);
    }
    const elapsed = performance.now() - started;
    expect(lowestGold).toBeGreaterThan(-500);
    // The treasury must grow, but a runaway money loop would also pass a lower bound alone.
    expect(w.gold).toBeGreaterThan(ECONOMY.startGold);
    expect(w.gold).toBeLessThan(60000);
    expect(population(w)).toBeGreaterThanOrEqual(220);
    expect(housesOf(w).filter((h) => h.tier === 4).length).toBeGreaterThanOrEqual(15);
    expect(elapsed).toBeLessThan(3000);
  });
});
