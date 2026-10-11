import { describe, it, expect } from '../../harness.js';
import { difficultyHint } from '../../../src/ui/text.js';
import { DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { createWorld } from '../../../src/sim/world.js';
import { raidsOn } from '../../../src/sim/costs.js';
import { dailyRiskOf } from '../../../src/sim/fire.js';
import { raidSize } from '../../../src/sim/raids.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

// A Town with a potter (risk 1 a day before the level) and 375 people with a fat treasury, so a later raid's size
// before the level is exactly 1 + 375 / 125 + 4 = 8 (spec 4.13), at the given level.
function cityAt(level) {
  const w = makeTestWorld({ gold: 100000 });
  w.difficulty = level;
  w.milestone = 'town';
  addRaw(w, 'house', 20, 20, { tier: 4, residents: 375 });
  const potter = addRaw(w, 'potter', 10, 10);
  return { w, potter };
}

describe('s3 balance difficulty hint', () => {
  it('names each level\'s danger first, then its prices (spec 4.18)', () => {
    expect(DIFFICULTY_ORDER.map(difficultyHint)).toEqual([
      'No raids. Fire risk builds 50% slower.\nBuildings and trade routes cost about 20% less.\nRoads: 2 gold a tile.',
      'Later raids about 50% smaller. Fire risk builds 50% slower.\nBuildings and trade routes cost about 20% less.\nRoads: 2 gold a tile.',
      'Raids and fire risk as usual.\nBuildings and trade routes at their usual cost.\nRoads: 2 gold a tile.',
      'Later raids about 50% bigger. Fire risk builds 50% faster.\nBuildings and trade routes cost about 25% more.\nRoads: 3 gold a tile.',
    ]);
  });

  it('says only what the sim does: no raid clock without raids, the first raid the same everywhere, later raids and fire risk scaled', () => {
    const normal = cityAt('normal');
    const base = { risk: dailyRiskOf(normal.w, normal.potter), size: (normal.w.raid.index = 1, raidSize(normal.w)) };
    expect(base).toEqual({ risk: 1, size: 8 });
    for (const level of DIFFICULTY_ORDER) {
      const hint = difficultyHint(level);
      expect([level, hint.startsWith('No raids.')]).toEqual([level, !raidsOn(createWorld({ seed: 1, difficulty: level }))]);
      const { w, potter } = cityAt(level);
      const firePct = /Fire risk builds (\d+)% (slower|faster)\./.exec(hint);
      const fireFactor = firePct ? 1 + (Number(firePct[1]) / 100) * (firePct[2] === 'slower' ? -1 : 1) : 1;
      expect([level, dailyRiskOf(w, potter)]).toEqual([level, base.risk * fireFactor]);
      expect([level, raidSize(w)]).toEqual([level, 3]);                                    // the first raid: 3 at every level
      w.raid.index = 1;
      const raidPct = /Later raids about (\d+)% (smaller|bigger)\./.exec(hint);
      if (!raidsOn(w)) continue;                                                            // Peaceful: no raid ever comes
      const raidFactor = raidPct ? 1 + (Number(raidPct[1]) / 100) * (raidPct[2] === 'smaller' ? -1 : 1) : 1;
      expect([level, raidSize(w)]).toEqual([level, base.size * raidFactor]);
    }
  });
});
