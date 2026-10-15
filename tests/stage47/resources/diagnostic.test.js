// Stage 4.7 Task 1 (ruling 461), step 1: measure. The sweep (sweep.js) generates 200 seeds of every size and layout and records what lies
// near the start area: the nearest clay-pit fit, the nearest mine fit on rocky ground, the packed farm fits on fertile ground, and the
// clay-pit fits on the whole map. It is cheap (a few seconds for all 3,600 maps) so the suite runs it every time. To read the table, make
// a throwaway test that throws `table()` (tests/stage47/resources/sweep.js): the harness prints a failure's message.
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { resourceReach, RESOURCES } from '../../../src/data/s47.js';
import { spotsFor, packed, resourceCounts, RESOURCE_TYPES } from '../../../src/sim/resources.js';
import { fitOf } from '../../../src/sim/fit.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { SEEDS, SIZES, LAYOUTS, sweep, summarize, measure } from './sweep.js';

describe('s47 resources diagnostic', () => {
  it('scales the reach with the map: 20 tiles at Normal, 15 at Small, 25 at Large', () => {
    expect(SIZES.map(resourceReach)).toEqual([15, 20, 25]);
    expect(RESOURCES).toEqual({ reach: 20, clay: 2, mine: 1, farm: 6 });
  });

  it('counts spots exactly as the placing rule does: spotsFor agrees with fitOf at every position of sample maps', () => {
    for (const [seed, size, variant] of [[3, 64, 'classic'], [9, 48, 'oasis'], [14, 80, 'island'], [5, 64, 'wide-bends']]) {
      const m = generateMap(seed, size, variant), fake = { size, terrain: m.terrain };
      const road = new Set(m.startRoad.map(([x, y]) => idx(size, x, y)));
      for (const type of Object.values(RESOURCE_TYPES)) {
        const brute = [];
        for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
          const tiles = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([tx, ty]) => idx(size, tx, ty));
          if (tiles.some((i) => m.terrain[i] === T.WATER || road.has(i))) continue;
          if (fitOf(fake, type, x, y).ok) brute.push(`${x},${y}`);
        }
        expect([seed, size, variant, type, spotsFor(m, type).map((s) => `${s.x},${s.y}`).sort()]).toEqual([seed, size, variant, type, brute.sort()]);
      }
    }
  });

  it('packs spots so no two footprints overlap, nearest first', () => {
    const spots = [{ x: 5, y: 5, dist: 1 }, { x: 6, y: 5, dist: 2 }, { x: 7, y: 5, dist: 3 }, { x: 5, y: 7, dist: 4 }, { x: 9, y: 9, dist: 30 }];
    expect(packed(spots)).toBe(4);          // (6,5) overlaps (5,5); (7,5), (5,7) and (9,9) stand clear
    expect(packed(spots, 10)).toBe(3);      // the far one is out of reach
    expect(packed([])).toBe(0);
  });

  it('sweeps 200 seeds of every size and layout within a minute, and every map holds clay somewhere (the gap is the distance, never the map)', () => {
    const t0 = Date.now();
    const none = [];
    for (const size of SIZES) {
      for (const variant of LAYOUTS) {
        const rows = sweep(size, variant);
        expect(rows.length).toBe(SEEDS);
        for (const r of rows) if (r.c.clay.all === 0) none.push(`${variant} ${size} #${r.seed}`);
        const s = summarize(rows);
        expect(s.why.none).toBe(0);
        expect(s.clayAll.min).toBeGreaterThan(0);
      }
    }
    expect(none).toEqual([]);
    expect(Date.now() - t0).toBeLessThan(60000);
  });

  it('measures a map the same way twice', () => {
    expect(measure(17, 64, 'island')).toEqual(measure(17, 64, 'island'));
    const m = generateMap(17, 64, 'island');
    expect(resourceCounts(m, 20)).toEqual(resourceCounts(m, 20));
  });
});
