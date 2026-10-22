import { describe, it, expect } from '../../harness.js';
import { MONUMENTS, MONUMENT_KINDS } from '../../../src/data/monuments.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { monumentDay } from '../../../src/sim/monuments.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { place } from '../../../src/sim/commands.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { TERRAIN_BY_NAME } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// The days a kind takes with `crews` full crews and full supply (a storehouse holding plenty within supply reach): the
// site's bottom row sits on y = 9, beside the road along y = 10, and the guilds sit 4-10 road tiles to its west.
function buildDays(kind, crews) {
  const w = makeTestWorld({ gold: 1e7 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  const site = addRaw(w, kind, 12, 10 - MONUMENTS[kind].d);
  for (let i = 0; i < crews; i++) addRaw(w, 'builders_guild', 2 + 2 * i, 11, { staff: 16 });
  addRaw(w, 'storehouse', 24, 11, { store: { stone: 1e6, bricks: 1e6, clay: 1e6, linen: 1e6, flax: 1e6 } });
  addRaw(w, 'granary', 27, 11, { store: { grain: 1e6 } });   // Version 6.0 (Track A): the great temple's offerings, so it waits for none
  const limit = 2 * 12 * DAYS_PER_MONTH * 30;
  while (site.site.done === null && w.day < limit) { monumentDay(w); w.day += 1; }
  return site.site.done + 1;
}

describe('s4 sim each kind\'s time', () => {
  it('builds each kind in its crew-months over its most crews (spec 4.16), within a day', () => {
    const got = MONUMENT_KINDS.map((k) => buildDays(k, MONUMENTS[k].crews));
    const want = MONUMENT_KINDS.map((k) => (MONUMENTS[k].crewMonths / MONUMENTS[k].crews) * DAYS_PER_MONTH);
    expect(want).toEqual([90, 270, 540, 720, 1080, 1800, 2250, 2880, 4050, 5400, 2250]);   // 3 and 9 months; 2, 3, 5, 8 and 15 years (and Stage 4.6's 18 months, 75 and 135)
    got.forEach((d, i) => {
      expect(d).toBeGreaterThanOrEqual(want[i]);
      expect(d).toBeLessThanOrEqual(want[i] + 1);
    });
  });

  it('takes longer in proportion with fewer crews: two on the great pyramid take 30 years', () => {
    const d = buildDays('pyramid_great', 2);
    expect(d).toBeGreaterThanOrEqual(30 * 12 * DAYS_PER_MONTH);
    expect(d).toBeLessThanOrEqual(30 * 12 * DAYS_PER_MONTH + 1);
  });
});

// A Capital that builds through the tick: houses for workers, a guild for each site, a quarry on rocky ground and a
// brickworks with clay in store, a small obelisk and a turned small mastaba.
function monumentCity() {
  const w = makeTestWorld({ gold: 50000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  for (const [x, y] of [[20, 11], [21, 11], [20, 12], [21, 12]]) w.terrain[idx(w.size, x, y)] = TERRAIN_BY_NAME.rocky;
  addRaw(w, 'house', 2, 12, { tier: 1, residents: 300 });
  addRaw(w, 'storehouse', 26, 11, { staff: 6, store: { clay: 400 } });
  for (const [type, x, y, rot] of [['builders_guild', 12, 11], ['builders_guild', 14, 11], ['builders_guild', 16, 11], ['quarry', 20, 11],
    ['brickworks', 23, 11], ['obelisk_small', 18, 9], ['mastaba_small', 12, 7, 1]]) {
    expect(place(w, type, x, y, { rot }).ok).toBe(true);
  }
  return w;
}

describe('s4 sim determinism and saving mid-course', () => {
  it('gives the same world from the same city and commands, with monuments under way', () => {
    const a = monumentCity(), b = monumentCity();
    advanceDays(a, 120);
    advanceDays(b, 120);
    expect(serialize(a)).toBe(serialize(b));
    const m = Object.values(a.buildings).find((o) => o.type === 'mastaba_small');
    expect([a.tally.stoneLaid > 0, a.tally.bricksLaid > 0, m.w, m.d, m.rot]).toEqual([true, true, 2, 3, 1]);
  });

  it('changes nothing by saving and loading mid-course', () => {
    const a = monumentCity();
    advanceDays(a, 44);
    const o = Object.values(a.buildings).find((x) => x.type === 'obelisk_small');
    expect(o.site.laid.stone + o.site.course > 0 && o.site.carry > 0).toBe(true);   // mid-course, gold carried
    const b = deserialize(serialize(a));
    advanceDays(a, 76);
    advanceDays(b, 76);
    expect(serialize(b)).toBe(serialize(a));
  });
});
