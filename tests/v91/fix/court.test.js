// Version 9.1 fix wave: ruling 1713's gap, pinned so it is visible. The court's outputPerMonth does not read the flood (reading it would change every city's asks, the
// Steady's too), so in a Low-flood year it still counts a floodplain farm at its plain rate (times the heir's) while the farm really makes less. The yearly quota reads
// what the city made, so only the monthly figure is high. This test pins today's behaviour; it changes none.
import { describe, it, expect } from '../../harness.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { outputPerMonth } from '../../../src/sim/court.js';
import { heirRate, produceDay } from '../../../src/sim/production.js';
import { floodHarvestFactor } from '../../../src/sim/flood.js';
import { riverWorld, addFarm, addGranary, dayOf } from '../../stage46/river/riverHelpers.js';

function farmTown(heir, applied) {
  const w = riverWorld();
  w.heir = heir;
  const farm = addFarm(w, 22, 11);
  addGranary(w, 24, 11);
  w.day = dayOf(2, 8);
  w.flood.applied = applied;
  return { w, farm };
}

describe('v91 fix court: the court\'s output in a Low flood (ruling 1713)', () => {
  it('outputPerMonth is the same in a Low flood as in a plain year, for the Steady and the Bountiful, though the farm\'s harvest is smaller', () => {
    for (const heir of ['steady', 'bountiful']) {
      const low = farmTown(heir, 'low'), fair = farmTown(heir, 'fair');
      const plain = BUILDINGS.farm_grain.produces.perMonth * (low.farm.staff / BUILDINGS.farm_grain.workers) * heirRate(low.w, low.farm);
      expect([heir, floodHarvestFactor(low.w, low.farm) < 1, floodHarvestFactor(fair.w, fair.farm)]).toEqual([heir, true, 1]);   // the flood does shrink the farm's crop
      expect([heir, outputPerMonth(low.w, 'grain'), outputPerMonth(fair.w, 'grain')]).toEqual([heir, plain, plain]);          // ...and the court does not see it
      const granary = Object.values(low.w.buildings).find((b) => b.type === 'granary');
      for (let i = 0; i < 30; i++) produceDay(low.w);
      expect([heir, (granary.store.grain || 0) < outputPerMonth(low.w, 'grain') - 1]).toEqual([heir, true]);                   // the gap: the court's figure is above what the farm made
    }
  });
});
