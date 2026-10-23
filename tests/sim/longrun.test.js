import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { ECONOMY } from '../../src/data/economy.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { housesOf, population, allBuildings } from '../../src/sim/world.js';
import { atLeast } from '../../src/sim/progression.js';
import { canBurn, staffedCover } from '../../src/sim/fire.js';
import { touchesRoad } from '../../src/sim/reach.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { noNewDangers } from '../v60/b1/grace.js';

// The raider entries mapgen gives a 48-tile map (the middle of the east edge and of the north edge), so the village
// meets raids where a real one would.
const RAIDER_ENTRIES_48 = [{ x: 47, y: 24 }, { x: 24, y: 0 }];

// A realistic Stage 1 village built from the real starting treasury.
function realVillage() {
  const w = noNewDangers(makeTestWorld({ size: 48, fertile: [[0, 0, 8, 48]], gold: ECONOMY.startGold, raiderEntries: RAIDER_ENTRIES_48 }));   // Version 6.0: this run measures the game before the new dangers (tests/v60/b1/grace.js, ruling 689): a wrecked temple in year 10 ends the unanswered village
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

// Stage 3 (spec 4.11-4.13): what a steady player adds as the village grows, through the same commands, at the first
// month end it is allowed. Fire risk builds from Town, so then two firehouses (and, from Stage 4.5, a physician) whose reach (8 road tiles each) between
// them takes in every building on the street, the farms at its west end included; raids start counting at 250 people,
// which is Market town here, so then three towers by the bazaar and the temple (the raiders' first targets in this
// village): enough for a raid of nine (towers needed = raiders / 3, rounded up). Towers never burn.
const LATER = [
  { milestone: 'town', steps: [['firehouse', 8, 11], ['firehouse', 21, 11], ['physician', 15, 11]] },   // Stage 4.5: and a physician, whose reach takes in the homes
  { milestone: 'market_town', steps: [['tower', 14, 11], ['tower', 22, 11], ['tower', 26, 11], ['police_post', 23, 11]] },   // Stage 4.5: and a police post
];

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

// Runs the village for ten years, month by month, adding LATER's buildings as their milestones come; returns the world
// and each month's spending (wages, upkeep and soldiers' pay) and taxes.
function runVillage() {
  const w = realVillage();
  const later = LATER.map((l) => ({ ...l, done: false }));
  const months = [];
  let lowestGold = w.gold;
  for (let month = 0; month < 120; month++) {
    advanceDays(w, 30);
    checkSane(w);
    lowestGold = Math.min(lowestGold, w.gold);
    const s = w.stats.lastMonth;
    months.push({ spent: s.wages + s.upkeep + s.soldiers, taxes: s.taxes });
    for (const l of later) {
      if (l.done || !atLeast(w, l.milestone)) continue;
      for (const [type, x, y] of l.steps) expect(`${type} ${place(w, type, x, y).ok}`).toBe(`${type} true`);
      l.done = true;
    }
  }
  return { w, months, lowestGold, later };
}

describe('longrun', () => {
  it('stays sane and solvent for ten years from the starting treasury, through fire and raids', () => {
    const started = performance.now();
    const { w, lowestGold, later } = runVillage();
    const elapsed = performance.now() - started;
    expect(later.map((l) => l.done)).toEqual([true, true]);                     // both firehouses and the three towers stand
    expect(lowestGold).toBeGreaterThan(-500);
    // The treasury must grow, but a runaway money loop would also pass a lower bound alone.
    expect(w.gold).toBeGreaterThan(ECONOMY.startGold);
    expect(w.gold).toBeLessThan(60000);
    expect(population(w)).toBeGreaterThanOrEqual(220);
    expect(housesOf(w).filter((h) => h.tier === 4).length).toBeGreaterThanOrEqual(15);
    // Every building that can burn and stands on the street has a staffed firehouse in reach (spec 4.12's coverage).
    const uncovered = allBuildings(w).filter((b) => canBurn(b) && touchesRoad(w, b) && !staffedCover(w, b));
    expect(uncovered.map((b) => `${b.type} ${b.x},${b.y}`)).toEqual([]);
    // Fire and raids leave a defended town standing: a covered blaze goes out, and three towers beat every raid this
    // village meets (measured on the merged branch: 26 blazes, every one put out, nothing burned; three raids, of 3, 5
    // and 6, all beaten). The bounds leave room for retuning.
    expect(w.tally.burned).toBeLessThanOrEqual(6);
    expect(w.tally.raidsLost).toBe(0);
    expect(elapsed).toBeLessThan(3000);
  });

  it('spends 60-70% of its taxes on wages, upkeep and soldiers\' pay as a steady tier-4 town (spec 4.11, ruling 114)', () => {
    const { w, months } = runVillage();
    expect(housesOf(w).filter((h) => h.tier === 4).length).toBeGreaterThanOrEqual(15);
    const year = months.slice(-12);
    const share = year.reduce((n, m) => n + m.spent, 0) / year.reduce((n, m) => n + m.taxes, 0);
    expect(share).toBeGreaterThanOrEqual(0.6);
    expect(share).toBeLessThanOrEqual(0.7);
    // Its firehouses and towers are what bring it into the band: the same town without them spends under 50%.
    const without = year.reduce((n, m) => n + m.spent, 0) - 12 * (2 * 4 + 3 * 8 + 4 + 4 + (5 * 4 + 2) * ECONOMY.wagePerWorker);   // Stage 4.5: and the physician's and the police post's upkeep and one wage each
    expect(without / year.reduce((n, m) => n + m.taxes, 0)).toBeLessThan(0.5);
  });
});
