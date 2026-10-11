import { describe, it, expect } from '../../harness.js';
import { buildSampleCity, buildStressCity } from '../../../src/dev/sampleCity.js';
import { createWorld, allBuildings, buildingAt } from '../../../src/sim/world.js';
import { canBurn, staffedCover } from '../../../src/sim/fire.js';
import { touchesRoad } from '../../../src/sim/reach.js';
import { TITLE_SEED } from '../../../src/data/ui.js';

const count = (w, type) => allBuildings(w).filter((b) => b.type === type).length;
const uncovered = (w) => allBuildings(w).filter((b) => canBurn(b) && touchesRoad(w, b) && !staffedCover(w, b)).map((b) => `${b.type} ${b.x},${b.y}`);
// The sample city's four streets (src/dev/sampleCity.js): rows size - 14, - 20, - 26 and - 32, from the north road.
const streetRows = (w) => [4, 10, 16, 22].map((d) => w.size - 10 - d);

describe('s3 balance cities', () => {
  it('builds the sample city\'s firehouses the day it becomes a Town, keeping their spots free until then', () => {
    const village = buildSampleCity(createWorld({ seed: 1 }), { days: 30, stageTwoDays: 0 });
    expect([village.milestone, count(village, 'firehouse')]).toEqual(['village', 0]);
    const ex = village.tradeEntry.x;
    for (const y of streetRows(village)) expect([y, buildingAt(village, ex - 4, y + 1), buildingAt(village, ex + 4, y + 1)]).toEqual([y, null, null]);
    const town = buildSampleCity(createWorld({ seed: 1 }), { stageTwoDays: 0 });
    expect(town.splits.town).toBeLessThan(360);
    for (const y of streetRows(town)) {
      expect([y, ...[ex - 4, ex + 4].map((x) => (buildingAt(town, x, y + 1) || {}).type)]).toEqual([y, 'firehouse', 'firehouse']);
    }
  });

  it('gives every sample city a staffed firehouse reaching each building on its roads, and a solvent Market town its defences', () => {
    for (const seed of [TITLE_SEED, 1, 7]) {
      const w = buildSampleCity(createWorld({ seed }));
      expect([seed, 'calm' in w]).toEqual([seed, false]);                       // the test-only switch is gone (Track F)
      expect([seed, uncovered(w)]).toEqual([seed, []]);
      expect([seed, count(w, 'firehouse') >= 8]).toEqual([seed, true]);
      // Fire and raids never reach it in 600 days: covered homes build risk at a fifth of the rate, and the first raid
      // warning comes 720 days after the raid clock starts at 250 people. (Measured with Tracks A and B: no blaze.)
      expect([seed, w.tally.burned, w.raid.warning, w.raid.active]).toEqual([seed, 0, null, null]);
    }
    for (const seed of [TITLE_SEED, 1]) {
      const w = buildSampleCity(createWorld({ seed }));
      expect([seed, count(w, 'tower'), count(w, 'barracks')]).toEqual([seed, 1, 1]);
    }
    const poor = buildSampleCity(createWorld({ seed: 7 }));                     // in debt at day 360: no defences yet
    expect([count(poor, 'tower'), count(poor, 'barracks')]).toEqual([0, 0]);
  });

  it('builds the title backdrop well inside a second (about 70 ms on a laptop; a phone takes a few times longer)', () => {
    const started = performance.now();
    buildSampleCity(createWorld({ seed: TITLE_SEED }));
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('puts firehouses, towers and barracks in the stress city, which no longer carries the calm switch', () => {
    const w = buildStressCity(createWorld({ seed: 2 }));
    expect('calm' in w).toBe(false);
    for (const type of ['firehouse', 'tower', 'barracks']) expect([type, count(w, type) > 0]).toEqual([type, true]);
  });

  it('runs fire and raids every day: the clock no longer reads a calm switch', async () => {
    const src = await (await fetch('/src/sim/clock.js')).text();
    expect(src.includes('calm')).toBe(false);
    expect(/\n {2}fireDay\(world, events\);[^\n]*\n {2}raidDay\(world, events\);/.test(src)).toBe(true);
  });
});
