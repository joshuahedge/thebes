// Task 1 (ruling 461): the sweep behind the resource diagnostic and the guarantee tests. For every map size and layout it generates the
// maps of seeds 1..SEEDS and measures what lies near the start area (src/sim/resources.js), so one pass feeds both.
import { generateMap } from '../../../src/sim/mapgen.js';
import { MAP_VARIANTS, MAP_SIZES } from '../../../src/data/map.js';
import { RESOURCES, resourceReach } from '../../../src/data/s47.js';
import { resourceCounts, spotsFor, packed } from '../../../src/sim/resources.js';

export const SEEDS = 200;
export const SIZES = Object.values(MAP_SIZES);
export const LAYOUTS = MAP_VARIANTS;

// Why a map has too little clay near the start: 'none' (no clay-pit spot anywhere on the map: a generator gap), 'far' (spots exist, but
// fewer than the guarantee lie within reach), 'thin' (the nearest is within reach but the packed spots there are too few), or null.
export function clayWhy(c, reach) {
  if (c.near >= RESOURCES.clay) return null;
  if (c.all === 0) return 'none';
  return c.nearest > reach ? 'far' : 'thin';
}

// One map's row: the counts, the guarantee's verdict and the clay cause.
export function measure(seed, size, variant) {
  const m = generateMap(seed, size, variant);
  const reach = resourceReach(size);
  const c = resourceCounts(m, reach);
  const strict = packed(spotsFor(m, 'clay_pit', 4), reach);   // the Stage 4.5 rule: all four tiles of the pit on clay
  const ok = c.clay.near >= RESOURCES.clay && c.mine.near >= RESOURCES.mine && c.farm.near >= RESOURCES.farm;
  return { seed, size, variant, reach, c, strict, ok, why: clayWhy(c.clay, reach) };
}

// Every seed of one size and layout.
export const sweep = (size, variant, seeds = SEEDS) => Array.from({ length: seeds }, (_, i) => measure(i + 1, size, variant));

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// A summary line for a sweep: min, median and worst seed of each measure (the worst is the seed with the lowest count, or for a
// distance the farthest).
export function summarize(rows) {
  const pick = (f, worstHigh) => {
    const vals = rows.map(f);
    const w = rows.reduce((b, r, i) => ((worstHigh ? vals[i] > vals[b] : vals[i] < vals[b]) ? i : b), 0);
    return { min: Math.min(...vals), med: median(vals), max: Math.max(...vals), worst: rows[w].seed };
  };
  const dist = (r, k) => (r.c[k].nearest === null ? 999 : Math.round(r.c[k].nearest * 10) / 10);
  return {
    clayNear: pick((r) => r.c.clay.near), clayDist: pick((r) => dist(r, 'clay'), true), clayAll: pick((r) => r.c.clay.all),
    mineNear: pick((r) => r.c.mine.near), mineDist: pick((r) => dist(r, 'mine'), true), farmNear: pick((r) => r.c.farm.near),
    strictNear: pick((r) => r.strict),
    fail: rows.filter((r) => !r.ok).length,
    failClay: rows.filter((r) => r.c.clay.near < RESOURCES.clay).length,
    failMine: rows.filter((r) => r.c.mine.near < RESOURCES.mine).length,
    failFarm: rows.filter((r) => r.c.farm.near < RESOURCES.farm).length,
    why: { none: rows.filter((r) => r.why === 'none').length, far: rows.filter((r) => r.why === 'far').length, thin: rows.filter((r) => r.why === 'thin').length },
  };
}

// The compact table the report quotes: one line per size x layout.
export function table(sizes = SIZES, layouts = LAYOUTS, seeds = SEEDS) {
  const lines = ['size layout fail(any/clay/mine/farm) | clay near min/med(worst seed) | clay dist med/max(worst) | mine near min/med | mine dist med/max(worst) | farm near min/med(worst) | clay why none/far/thin | strict4 min/med'];
  for (const size of sizes) {
    for (const v of layouts) {
      const s = summarize(sweep(size, v, seeds));
      lines.push(`${size} ${v} ${s.fail}/${s.failClay}/${s.failMine}/${s.failFarm} | ${s.clayNear.min}/${s.clayNear.med}(${s.clayNear.worst}) | ${s.clayDist.med}/${s.clayDist.max}(${s.clayDist.worst}) | ${s.mineNear.min}/${s.mineNear.med} | ${s.mineDist.med}/${s.mineDist.max}(${s.mineDist.worst}) | ${s.farmNear.min}/${s.farmNear.med}(${s.farmNear.worst}) | ${s.why.none}/${s.why.far}/${s.why.thin} | ${s.strictNear.min}/${s.strictNear.med}`);
    }
  }
  return lines.join('\n');
}
