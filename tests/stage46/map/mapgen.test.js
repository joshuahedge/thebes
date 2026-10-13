// Stage 4.6, Map track: the generator's seeded shape choices (ruling 332) and sizes (ruling 333), and the clay it lays (ruling 331).
// Every layout at every size holds its invariants over 50 seeds, so a layout that breaks one fails by name (layout, size, seed).
import { describe, it, expect } from '../../harness.js';
import { generateMap, addClay } from '../../../src/sim/mapgen.js';
import { MAP, MAP_SIZES, MAP_VARIANTS, MAP_SALT, areaScale } from '../../../src/data/map.js';
import { T } from '../../../src/sim/terrain.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { bridgeSpot } from '../../../src/sim/bridges.js';
import { createWorld } from '../../../src/sim/world.js';
import { riverPools, riverSpans } from '../../../src/render/terrainWater.js';
import { shapeLayer } from '../../../src/render/terrainBaker.js';
import { canPlace } from '../../../src/sim/commands.js';

const SIZES = Object.values(MAP_SIZES);
const SEEDS = Array.from({ length: 50 }, (_, k) => k + 1);
const count = (m, t) => m.terrain.filter((v) => v === t).length;
const at = (m, x, y) => m.terrain[idx(m.size, x, y)];

// Chebyshev distance of each tile to the nearest water tile, out to r (r + 1 when farther).
function waterDist(m, r) {
  const n = m.size, d = new Uint8Array(n * n).fill(r + 1), q = [];
  for (let i = 0; i < n * n; i++) if (m.terrain[i] === T.WATER) { d[i] = 0; q.push(i); }
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    if (d[i] >= r) continue;
    const x = i % n, y = (i - x) / n;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!inBounds(n, x + dx, y + dy)) continue;
      const j = idx(n, x + dx, y + dy);
      if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); }
    }
  }
  return d;
}
function landReaches(m, from, to) {
  const n = m.size, seen = new Uint8Array(n * n), q = [idx(n, from.x, from.y)];
  seen[q[0]] = 1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % n, y = (i - x) / n;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!inBounds(n, x + dx, y + dy)) continue;
      const j = idx(n, x + dx, y + dy);
      if (!seen[j] && m.terrain[j] !== T.WATER) { seen[j] = 1; q.push(j); }
    }
  }
  return seen[idx(n, to.x, to.y)] === 1;
}
// Every origin where a 2 x 2 clay pit fits on the bare map: no water under it and at least 2 of its 4 tiles clay (ruling 331).
function pitPlaces(m) {
  const out = [];
  for (let y = 0; y < m.size - 1; y++) {
    for (let x = 0; x < m.size - 1; x++) {
      let clay = 0, wet = false;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const t = at(m, x + dx, y + dy); if (t === T.WATER) wet = true; if (t === T.CLAY) clay++; }
      if (!wet && clay >= 2) out.push([x, y]);
    }
  }
  return out;
}
const disjointPits = (places) => {
  const used = new Set(), n = 1000;
  let k = 0;
  for (const [x, y] of places) {
    const tiles = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([a, b]) => b * n + a);
    if (tiles.some((t) => used.has(t))) continue;
    for (const t of tiles) used.add(t);
    k++;
  }
  return k;
};
const dunes0 = (p) => (p.dunes || []).length;
const bare = (m) => ({ size: m.size, terrain: m.terrain, occ: new Array(m.size * m.size).fill(0), road: new Array(m.size * m.size).fill(0) });

describe('s46 map generator (ruling 332, 333): every layout at every size keeps its invariants', () => {
  it('keeps a river, fertile banks, rock off the river, land entries, a buildable start and a bridge spot, 50 seeds per size and layout', () => {
    const bad = [];
    for (const size of SIZES) {
      const area = areaScale(size);
      for (const v of MAP_VARIANTS) {
        for (const seed of SEEDS) {
          const m = generateMap(seed, size, v), tag = `${v} ${size} seed ${seed}`;
          const fail = (what) => bad.push(`${tag}: ${what}`);
          const rock = count(m, T.ROCKY), target = Math.round(MAP.rockTarget * area), classicNormal = v === 'classic' && size === 64;
          if (classicNormal ? rock < 40 || rock > 180 : rock < target || rock > target + 30) fail(`rock ${rock} (want ${target}+)`);
          if (count(m, T.WATER) <= size) fail('no river');
          if (count(m, T.FERTILE) < 250 * area) fail(`fertile ${count(m, T.FERTILE)}`);
          const wd = waterDist(m, 8);
          let nearFertile = 0, minRock = 99;
          for (let i = 0; i < m.terrain.length; i++) {
            if (m.terrain[i] === T.FERTILE && wd[i] <= 4) nearFertile++;
            if (m.terrain[i] === T.ROCKY) minRock = Math.min(minRock, wd[i]);
          }
          if (nearFertile < 100 * area) fail(`fertile by the water ${nearFertile}`);
          if (minRock <= 4) fail(`rock ${minRock} tiles from water`);
          const entries = size === 80 ? 3 : 2;
          if (m.raiderEntries.length !== entries) fail(`${m.raiderEntries.length} entries`);
          for (const e of m.raiderEntries) {
            const edge = e.x === 0 || e.y === 0 || e.x === size - 1 || e.y === size - 1;
            if (!edge || at(m, e.x, e.y) === T.WATER || !landReaches(m, e, m.focus)) fail(`entry ${e.x},${e.y}`);
          }
          let free = 0;
          for (let y = m.focus.y - 3; y <= m.focus.y + 3; y++) for (let x = m.focus.x - 3; x <= m.focus.x + 3; x++) if (![T.WATER, T.ROCKY].includes(at(m, x, y))) free++;
          if (free !== 49) fail(`start area ${free} of 49 free`);
          if (waterDist(m, 24)[idx(size, m.focus.x, m.focus.y)] > 24) fail('start far from the water');
          for (const [x, y] of m.startRoad) if (at(m, x, y) === T.WATER) fail('start road on water');
          if (m.startRoad[0][0] !== m.tradeEntry.x || m.startRoad[0][1] !== size - 1) fail('start road');
          if (v !== 'classic' && !bridgeSpot(bare(m), m.focus)) fail('no bridge spot');
          const clay = count(m, T.CLAY), lo = Math.round(MAP.clay.targetMin * area), hi = lo + Math.round(MAP.clay.targetExtra * area) + MAP.shapes.clay.cap;
          if (clay < lo - 1 || clay > hi) fail(`clay ${clay} (want ${lo}-${hi})`);
          for (let i = 0; i < m.terrain.length; i++) if (m.terrain[i] === T.CLAY && wd[i] > 4) { fail(`clay ${wd[i]} tiles from water`); break; }
          const places = pitPlaces(m);
          if (places.length < 8 || disjointPits(places) < 4) fail(`only ${places.length} places (${disjointPits(places)} apart) for a clay pit`);
        }
      }
    }
    expect(bad.slice(0, 12)).toEqual([]);
  });
  it('lays every map the same from (seed, size, layout) alone, and a size or a seed changes it', () => {
    for (const size of SIZES) for (const v of MAP_VARIANTS) {
      const a = generateMap(7, size, v), b = generateMap(7, size, v);
      expect([size, v, JSON.stringify(a)]).toEqual([size, v, JSON.stringify(b)]);
      expect(JSON.stringify(generateMap(8, size, v).terrain) === JSON.stringify(a.terrain)).toBe(false);
    }
    expect(generateMap(7, 48, 'island').terrain.length).toBe(48 * 48);
    expect(generateMap(7, 80, 'island').size).toBe(80);
  });
});

describe('s46 map generator: the seeded shape choices (ruling 332)', () => {
  it('leaves classic at Normal as it was (no choices drawn) and draws them for every other layout and size', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      expect(generateMap(seed, 64, 'classic').params).toEqual({});
      for (const [size, v] of [[48, 'classic'], [80, 'classic'], [64, 'east'], [64, 'island'], [48, 'oasis'], [80, 'wide-bends']]) {
        const p = generateMap(seed, size, v).params;
        expect([seed, size, v, typeof p.meander, typeof p.outcrops]).toEqual([seed, size, v, 'object', 'number']);
      }
    }
  });
  it('draws each choice inside its range, over 50 seeds of every layout and size', () => {
    const S = MAP.shapes, bad = [];
    const seen = { pools: 0, none: 0, wadis: 0, channels: 0, oxbows: 0, clusters: 0, groves: 0, dunes: 0 };
    for (const size of SIZES) for (const v of MAP_VARIANTS) for (const seed of SEEDS) {
      if (v === 'classic' && size === 64) continue;
      const m = generateMap(seed, size, v), p = m.params, tag = `${v} ${size} ${seed}`;
      const w = createWorld({ seed, size, mapVariant: v });
      if (!(p.meander.strength >= S.meander.strength[0] && p.meander.strength <= S.meander.strength[1] && p.meander.length >= S.meander.length[0] && p.meander.length <= S.meander.length[1])) bad.push(`${tag} meander`);
      if (!(p.outcrops >= 1 && p.outcrops <= 5)) bad.push(`${tag} outcrops ${p.outcrops}`);
      if (p.outcrops >= 2) seen.clusters++;
      const pools = p.pools || [];
      if (pools.length > S.pools.max) bad.push(`${tag} pools ${pools.length}`);
      for (const pool of pools) { seen.pools++; seen[pool.kind === 'channel' ? 'channels' : 'oxbows']++; }
      if (!pools.length) seen.none++;
      const groves = p.groves || [];
      if (groves.length) seen.groves++;
      if (dunes0(p) > 3 || groves.length > 3 || groves.some((g) => g.r < S.groves.rMin || g.r > S.groves.rMin + S.groves.rExtra)) bad.push(`${tag} groves`);
      const dunes = p.dunes || [];
      if (dunes.length) seen.dunes++;
      if (dunes.length > 3) bad.push(`${tag} dunes ${dunes.length}`);
      const wadis = p.wadis || [];
      if (wadis.length > S.wadis.max) bad.push(`${tag} wadis ${wadis.length}`);
      if (wadis.length) seen.wadis++;
      for (const wd of wadis) if (wd.tiles.length < S.wadis.minLen || wd.tiles.length > S.wadis.maxLen || wd.tiles.some((i) => m.terrain[i] !== T.DESERT)) bad.push(`${tag} wadi`);
      // The river is still the one piece of water that runs the length of the map; a side channel or an oxbow is a pool of its own.
      if (!riverSpans(w).every(Boolean)) bad.push(`${tag} river broken`);
      if ((riverPools(w).length > 0) !== (pools.length > 0 || v === 'oasis')) bad.push(`${tag} pools ${riverPools(w).length}`);
    }
    expect(bad.slice(0, 12)).toEqual([]);
    expect(seen.channels > 20 && seen.oxbows > 20 && seen.none > 20 && seen.wadis > 20 && seen.groves > 500 && seen.dunes > 500 && seen.clusters > 500).toBe(true);   // all of them occur
  });
  it('keeps dune fields, wadis and groves on buildable ground: a house goes up on them, and the baker reads them from the params', () => {
    let wadiTiles = 0, duneTiles = 0;
    for (const seed of [3, 5, 9, 12]) {
      const w = createWorld({ seed, size: 64, mapVariant: 'middle' });
      w.gold = 100000;
      const layer = shapeLayer(w);
      for (let i = 0; i < layer.length; i++) {
        if (!layer[i]) continue;
        if (layer[i] & 2) expect([seed, i, w.terrain[i]]).toEqual([seed, i, T.DESERT]);   // a wadi is laid on desert only; a dune field's ellipse may take in other ground, which the baker leaves alone (decor is drawn on desert)
        if (w.terrain[i] !== T.DESERT) continue;
        if (layer[i] & 2) wadiTiles++;
        if (layer[i] & 1) duneTiles++;
        const x = i % w.size, y = (i - x) / w.size;
        if (!w.occ[i] && !w.road[i] && layer[i] & 2) expect(canPlace(w, 'house', x, y).ok).toBe(true);
      }
      for (const g of w.mapParams.groves) expect(w.terrain.filter((t) => t === T.MEADOW).length).toBeGreaterThan(g.r);
    }
    expect(wadiTiles > 20 && duneTiles > 40).toBe(true);
    expect(shapeLayer({ size: 8, mapParams: {} }).every((v) => v === 0)).toBe(true);        // a world with none: nothing marked
  });
  it('draws the choices from salts of their own, so no choice moves another', () => {
    for (const k of ['meander', 'channels', 'oxbow', 'outcrops', 'dunes', 'groves', 'wadis', 'clayWide']) expect(MAP_SALT[k] >= 4601 && MAP_SALT[k] <= 4619).toBe(true);
  });
});

describe('s46 map generator: sizes scale the counts with the area (ruling 333)', () => {
  it('scales the rock and the clay a map holds, and gives a Large map a third raider entry', () => {
    expect([areaScale(48), areaScale(64), areaScale(80)]).toEqual([0.5625, 1, 1.5625]);
    const avg = (size, t, v = 'middle') => SEEDS.slice(0, 20).reduce((s, seed) => s + count(generateMap(seed, size, v), t), 0) / 20;
    expect(avg(48, T.ROCKY) < avg(64, T.ROCKY) && avg(64, T.ROCKY) < avg(80, T.ROCKY)).toBe(true);
    expect(avg(48, T.CLAY) < avg(64, T.CLAY) && avg(64, T.CLAY) < avg(80, T.CLAY)).toBe(true);
    expect(Math.round(avg(80, T.ROCKY) / avg(64, T.ROCKY) * 100) / 100).toBeGreaterThan(1.4);   // ~1.56
    expect([48, 64, 80].map((s) => generateMap(1, s, 'classic').raiderEntries.length)).toEqual([2, 2, 3]);
    const three = generateMap(1, 80, 'classic').raiderEntries;
    expect(new Set(three.map((e) => `${e.x},${e.y}`)).size).toBe(3);
  });
});

describe('s46 map generator: clay is 2-3 tiles across along the banks (ruling 331)', () => {
  // A straight river down x = 9..10 with a one-tile bank each side, and dry land beyond: every row of clay a stretch lays across the bank is a run.
  function banks() {
    const size = 40, terrain = new Array(size * size).fill(T.DESERT);
    for (let y = 0; y < size; y++) { terrain[idx(size, 9, y)] = T.WATER; terrain[idx(size, 10, y)] = T.WATER; terrain[idx(size, 8, y)] = T.BANK; terrain[idx(size, 11, y)] = T.BANK; }
    return { size, terrain };
  }
  it('widens every stretch to 2 or 3 tiles across, never past MAP.shapes.clay.cap tiles a stretch', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { size, terrain } = banks();
      addClay(terrain, size, seed, () => true, { wide: true, target: 30 });
      const widths = new Set();
      for (let y = 0; y < size; y++) {
        for (const x0 of [0, 11]) {   // the west side (x 0..8) and the east side (x 11..39), each a row's run of clay next to the bank
          let run = 0;
          const [from, to, step] = x0 === 0 ? [8, 0, -1] : [11, size - 1, 1];
          for (let x = from; step > 0 ? x <= to : x >= to; x += step) { if (terrain[idx(size, x, y)] === T.CLAY) run++; else break; }
          if (run) widths.add(run);
        }
      }
      expect([seed, [...widths].every((w) => w >= 1 && w <= 3)]).toEqual([seed, true]);
      expect([seed, widths.has(2) || widths.has(3)]).toEqual([seed, true]);
      const total = terrain.filter((t) => t === T.CLAY).length;
      expect([seed, total >= 30 && total <= 30 + MAP.shapes.clay.cap]).toEqual([seed, true]);
    }
  });
  it('leaves the stretches as they were without it (migrations and classic at Normal call it with no options)', () => {
    const a = banks(), b = banks();
    addClay(a.terrain, a.size, 5, () => true, { target: 20 });
    addClay(b.terrain, b.size, 5, () => true, { target: 20, wide: false });
    expect(a.terrain).toEqual(b.terrain);
    const c = banks();
    addClay(c.terrain, c.size, 5, () => true, { target: 20, wide: true });
    expect(c.terrain.filter((t) => t === T.CLAY).length >= 20).toBe(true);
  });
});
