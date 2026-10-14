// Stage 4.7 Task 1 (ruling 461), step 2: the guarantee. Every map holds, within reach of the start area's centre (20 tiles at Normal, scaled
// linearly with the size), 2 clay-pit fits, 1 gem-mine fit on rocky ground and 6 grain-farm fits on fertile ground; a draw that misses is
// mended in the generator (src/sim/resources.js repairResources), never rejected. Classic at Normal keeps every seed that already held them.
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { resourceReach, RESOURCES, S47_SALT } from '../../../src/data/s47.js';
import { MAP } from '../../../src/data/map.js';
import { repairResources, resourceCounts, spotsFor, packed } from '../../../src/sim/resources.js';
import { createWorld } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { mapPrint } from '../../stage46/contract/mapSizes.test.js';
import { SEEDS, SIZES, LAYOUTS, sweep } from './sweep.js';

const none = { clay: 0, mine: 0, farm: 0 };
const sum = (r) => r.clay + r.mine + r.farm;

describe('s47 resources guarantee', () => {
  it('holds 2 clay-pit fits, 1 mine fit and 6 farm fits within reach of the start area on 200 seeds of every size and layout', () => {
    const bad = [];
    for (const size of SIZES) {
      for (const variant of LAYOUTS) {
        for (const r of sweep(size, variant, SEEDS)) {
          if (!r.ok) bad.push(`${variant} ${size} #${r.seed}: clay ${r.c.clay.near} mine ${r.c.mine.near} farm ${r.c.farm.near}`);
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('counts the same fits on a world made from the map (createWorld keeps the terrain)', () => {
    for (const [seed, size, mapVariant] of [[4, 64, 'oasis'], [21, 48, 'island'], [33, 80, 'middle']]) {
      const w = createWorld({ seed, mapVariant, size });
      const c = resourceCounts({ size: w.size, terrain: w.terrain, focus: w.focus, startRoad: w.startRoad }, resourceReach(size));
      expect([seed, c.clay.near >= RESOURCES.clay, c.mine.near >= RESOURCES.mine, c.farm.near >= RESOURCES.farm]).toEqual([seed, true, true, true]);
    }
  });

  it('is deterministic: a map and its repair are a function of (seed, size, layout) alone, and mending a mended map changes nothing', () => {
    for (const size of SIZES) for (const variant of LAYOUTS) {
      const a = generateMap(9, size, variant), b = generateMap(9, size, variant);
      expect([size, variant, JSON.stringify(a)]).toEqual([size, variant, JSON.stringify(b)]);
      const before = [...a.terrain];
      expect(repairResources(a, 9)).toEqual(none);
      expect(a.terrain).toEqual(before);
    }
  });

  it('draws the repair from the resources salt, never the generator stream: a different seed repairs differently, the salt is registered', () => {
    expect(S47_SALT.resources).toBe(4708);
    const a = generateMap(1, 64, 'classic'), b = generateMap(3, 64, 'classic');
    expect(a.repaired.mine > 0 && b.repaired.mine > 0).toBe(true);
    const rockOf = (m) => m.terrain.map((t, i) => (t === T.ROCKY ? i : -1)).filter((i) => i >= 0).join(',');
    expect(rockOf(a) === rockOf(b)).toBe(false);
  });

  it('keeps what the generator promises while mending: rock off the water and clear of the start area, nothing on the start road or in the water', () => {
    const bad = [];
    for (const size of SIZES) for (const variant of LAYOUTS) for (let seed = 1; seed <= 40; seed++) {
      const m = generateMap(seed, size, variant), tag = `${variant} ${size} #${seed}`, N = m.size;
      for (let i = 0; i < m.terrain.length; i++) {
        if (m.terrain[i] !== T.ROCKY) continue;
        const x = i % N, y = (i - x) / N;
        if (Math.hypot(x - m.focus.x, y - m.focus.y) < 5) bad.push(`${tag}: rock ${x},${y} on the start area`);
      }
      for (const [x, y] of m.startRoad) if ([T.WATER, T.ROCKY].includes(m.terrain[idx(N, x, y)])) bad.push(`${tag}: start road tile ${x},${y} is water or rock`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('mends a map that lacks each resource: clay widened along the bank, a rocky patch beside the rock, the fertile band widened', () => {
    const base = generateMap(12, 64, 'classic'), reach = resourceReach(64);
    const strip = (from, to) => {
      const t = [...base.terrain];
      for (let i = 0; i < t.length; i++) if (t[i] === from && Math.hypot((i % 64) - base.focus.x, Math.floor(i / 64) - base.focus.y) <= reach + 6) t[i] = to;
      return { ...base, terrain: t };
    };
    const count = (m, key, type) => packed(spotsFor(m, type), reach) >= RESOURCES[key];
    const noClay = strip(T.CLAY, T.BANK), noRock = strip(T.ROCKY, T.DESERT), noFarm = strip(T.FERTILE, T.DESERT);
    expect([count(noClay, 'clay', 'clay_pit'), count(noRock, 'mine', 'gem_mine'), count(noFarm, 'farm', 'farm_grain')]).toEqual([false, false, false]);
    const c = repairResources(noClay, 12), r = repairResources(noRock, 12), f = repairResources(noFarm, 12);
    expect([c.clay > 0, r.mine > 0, f.farm > 0]).toEqual([true, true, true]);
    expect([count(noClay, 'clay', 'clay_pit'), count(noRock, 'mine', 'gem_mine'), count(noFarm, 'farm', 'farm_grain')]).toEqual([true, true, true]);
    // each mended in place and in the same way twice
    const again = strip(T.CLAY, T.BANK);
    repairResources(again, 12);
    expect(again.terrain).toEqual(noClay.terrain);
  });

  it('leaves Classic at Normal as it was on every seed that already held the resources, and lists the 33 of 200 that did', () => {
    // Taken with the repair switched off (Stage 4.6's generator) on classic at 64, seeds 1-200: these 33 held 2 clay pits, a mine and 6 farms
    // near the start already, so the generator leaves them alone; the other 167 (163 lacked a mine, 7 clay (3 of them both), none farms) were repaired.
    const KEPT = [9, 10, 12, 16, 37, 38, 40, 41, 44, 53, 65, 66, 68, 72, 81, 96, 103, 104, 106, 116, 118, 130, 131, 136, 140, 146, 168, 170, 176, 183, 191, 195, 198];
    const PRINTS = { 9: 'b37ff0e2', 10: '4cf83901', 12: '5b59ff54', 16: '83cd78ef', 37: '8c96244a', 38: '7409b351', 40: '26f6caf3', 41: 'a2392074' };   // mapPrint taken from the Stage 4.6 generator (repair off)
    const kept = [], repaired = [];
    for (let seed = 1; seed <= 200; seed++) (sum(generateMap(seed, 64, 'classic').repaired) === 0 ? kept : repaired).push(seed);
    expect(kept).toEqual(KEPT);
    expect(repaired.length).toBe(167);
    for (const [seed, print] of Object.entries(PRINTS)) expect([seed, mapPrint(generateMap(Number(seed), 64, 'classic'))]).toEqual([seed, print]);
    expect(MAP.size).toBe(64);
  });
});
