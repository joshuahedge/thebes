// Version 9.3 Track K (ruling 1989): Sea Peoples' boats come in a decree run. Boats wait for the raid's stage (ENEMY_TYPES.boat.fromRaid 5, stage 4, years
// after a six-year run ends), so the decree's boatsFrom 1 lets every raid after the first land by boat where the river allows; without a decree the gate is as before.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { mayCome, enemyMayCome } from '../../../src/sim/armies.js';
import { ENEMY_KINDS } from '../../../src/data/armies.js';
import { DEFAULT_MAP_SIZE } from '../../../src/data/map.js';
import { variantFor } from '../../../src/sim/mapgen.js';
import { weeklySeed, decreesOfWeek } from '../../../src/ui/week.js';
import { DECREE } from '../../../src/data/decrees.js';

const WEEK = '2027-06';   // a Sea Peoples week on a river map (wide-bends); 2026-47, the first, is a Great oasis week and has no river
const dec = (w, ids) => { w.decree = { week: WEEK, ids, endDay: DECREE.endDay, ended: false }; return w; };

// The first raid with boats in its warning, or null, over a decree run's six years: the week's own map, the sample city laid on it.
function firstBoatRaid(ids) {
  const seed = weeklySeed(WEEK);
  const w = createWorld({ seed, size: DEFAULT_MAP_SIZE, mapVariant: 'auto', decree: ids ? { week: WEEK, ids } : null });
  buildSampleCity(w);
  while (w.day < DECREE.endDay) {
    advanceDays(w, 1);
    const r = w.raid.warning || w.raid.active;
    if (r && r.mix && r.mix.boat > 0) return { index: r.index, boats: r.mix.boat, day: w.day };
  }
  return null;
}

describe('v93 k boats', () => {
  it('the week map is a river week of Sea Peoples', () => {
    expect(decreesOfWeek(WEEK)).toEqual(['sea_peoples']);
    expect(variantFor(weeklySeed(WEEK))).toBe('wide-bends');
  });
  it('without a decree, or under another, every kind comes from its own raid as before', () => {
    for (const w of [createWorld({ seed: 3 }), dec(createWorld({ seed: 3 }), ['fire_season'])]) {
      for (const k of ENEMY_KINDS) for (let stage = 0; stage < 8; stage++) expect(mayCome(w, k, stage)).toBe(enemyMayCome(k, stage));
    }
  });
  it('under Sea Peoples boats may come from stage 0, and nothing else moves', () => {
    const w = dec(createWorld({ seed: 3 }), ['sea_peoples']);
    expect(mayCome(w, 'boat', 0)).toBe(true);
    for (const k of ENEMY_KINDS.filter((x) => x !== 'boat')) for (let stage = 0; stage < 8; stage++) expect(mayCome(w, k, stage)).toBe(enemyMayCome(k, stage));
  });
  it('a Sea Peoples run on a river week sees a raid by boat within the six years, and the same city without the decree none', () => {
    const sea = firstBoatRaid(['sea_peoples']);
    expect(sea !== null).toBe(true);
    expect(sea.index > 0).toBe(true);
    expect(firstBoatRaid(null)).toBe(null);
  });
});
