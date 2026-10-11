import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { housesOf, population } from '../../src/sim/world.js';
import { makeTestWorld } from '../helpers/testWorld.js';

function village() {
  const w = makeTestWorld({ gold: 100000 });
  expect(drawRoad(w, 0, 10, 31, 10).ok).toBe(true);
  expect(paintHouses(w, 9, 11, 20, 11).ids.length).toBe(12);
  for (const [type, x, y] of [
    ['well', 10, 9], ['well', 19, 9], ['farm_grain', 2, 8], ['farm_grain', 2, 11],
    ['granary', 5, 8], ['bazaar', 13, 8], ['temple', 16, 8], ['firehouse', 9, 9], ['firehouse', 18, 9],   // from Stage 3 a Town burns where no firehouse reaches
  ]) {
    expect(place(w, type, x, y).ok).toBe(true);
  }
  return w;
}

describe('integration', () => {
  it('grows from huts to houses within two years', () => {
    const w = village();
    advanceDays(w, 30 * 24);
    const tiers = housesOf(w).map((h) => h.tier);
    expect(tiers.filter((t) => t === 4).length).toBeGreaterThanOrEqual(10);
    expect(population(w)).toBeGreaterThanOrEqual(150);
    expect(w.milestone).toBe('town');
  });
});
