// Task 3b (ruling 313): six river layouts picked from the seed for new cities; tests, dev and sample cities stay classic;
// every variant keeps fertile banks, 90-150 rocky tiles off the river, land raider entries and a buildable start area.
import { describe, it, expect } from '../harness.js';
import { generateMap, variantFor } from '../../src/sim/mapgen.js';
import { createWorld } from '../../src/sim/world.js';
import { T } from '../../src/sim/terrain.js';
import { idx, inBounds } from '../../src/sim/grid.js';
import { MAP_VARIANTS } from '../../src/data/map.js';
import { riverSpans, riverIsle, riverPools } from '../../src/render/terrainWater.js';
import { buildSampleCity } from '../../src/dev/sampleCity.js';
import { boot } from '../../src/boot.js';
import { STAGE45_SCENES, devScene } from '../../src/dev/scenes.js';
import { createSaveStore } from '../../src/save/store.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';

const SEEDS = Array.from({ length: 30 }, (_, k) => k + 1);
const NEW_VARIANTS = MAP_VARIANTS.filter((v) => v !== 'classic');
const count = (m, t) => m.terrain.filter((v) => v === t).length;
const at = (m, x, y) => m.terrain[idx(m.size, x, y)];

// Chebyshev distance from a tile to the nearest water tile, searched out to r tiles (r + 1 when none).
function waterWithin(m, x, y, r) {
  for (let d = 0; d <= r; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d || !inBounds(m.size, x + dx, y + dy)) continue;
        if (at(m, x + dx, y + dy) === T.WATER) return d;
      }
    }
  }
  return r + 1;
}

// Whether the land tiles of the map's edge-to-focus walk connect (4-neighbour steps over any tile but water).
function landReaches(m, from, to) {
  const seen = new Uint8Array(m.size * m.size), queue = [idx(m.size, from.x, from.y)];
  seen[queue[0]] = 1;
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % m.size, y = (i - x) / m.size;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!inBounds(m.size, x + dx, y + dy)) continue;
      const j = idx(m.size, x + dx, y + dy);
      if (!seen[j] && m.terrain[j] !== T.WATER) { seen[j] = 1; queue.push(j); }
    }
  }
  return seen[idx(m.size, to.x, to.y)] === 1;
}

// A straight run of at most 3 water tiles with land at both ends, along a row or a column: a place to bridge.
function hasNarrowSpot(m) {
  const n = m.size;
  for (let a = 0; a < n; a++) {
    for (const vertical of [false, true]) {
      let run = 0;
      for (let b = 0; b <= n; b++) {
        const water = b < n && at(m, vertical ? a : b, vertical ? b : a) === T.WATER;
        if (water) { run++; continue; }
        if (run > 0 && run <= 3 && b - run - 1 >= 0 && b < n) return true;
        run = 0;
      }
    }
  }
  return false;
}

describe('s45 variants (the six layouts)', () => {
  it('names six variants, picks one from the seed alone, and reaches all of them', () => {
    expect(MAP_VARIANTS).toEqual(['classic', 'east', 'middle', 'wide-bends', 'island', 'oasis']);
    const seen = new Set();
    for (let seed = 1; seed <= 60; seed++) { expect(variantFor(seed)).toBe(variantFor(seed)); seen.add(variantFor(seed)); }
    expect([...seen].sort()).toEqual([...MAP_VARIANTS].sort());
    expect(generateMap(5, 64, 'east').variant).toBe('east');
    expect(generateMap(5).variant).toBe('classic');
    expect(generateMap(5, 64, 'swamp').variant).toBe('classic');                 // an unknown name is classic
  });
  it('is deterministic for a seed and a variant, and the variants differ from one another', () => {
    for (const v of MAP_VARIANTS) expect(generateMap(8, 64, v).terrain).toEqual(generateMap(8, 64, v).terrain);
    const terrains = MAP_VARIANTS.map((v) => JSON.stringify(generateMap(8, 64, v).terrain));
    expect(new Set(terrains).size).toBe(6);
  });
  it('keeps fertile banks, 90-150 rocky tiles off the river (130 at most from the patches), land raider entries and a buildable start, for 30 seeds of every variant', () => {
    for (const v of MAP_VARIANTS) {
      for (const seed of SEEDS) {
        const m = generateMap(seed, 64, v), tag = `${v} ${seed}`;
        const rocky = count(m, T.ROCKY);
        // Classic keeps its own patches, draw for draw (so the fixtures and old seeds do not move): its rock is 52-172.
        expect([tag, v === 'classic' ? rocky >= 40 && rocky <= 180 : rocky >= 90 && rocky <= 150]).toEqual([tag, true]);
        expect([tag, count(m, T.FERTILE) >= 400]).toEqual([tag, true]);
        let nearFertile = 0, minRock = 99;
        for (let y = 0; y < m.size; y++) {
          for (let x = 0; x < m.size; x++) {
            const t = at(m, x, y), d = waterWithin(m, x, y, 4);
            if (t === T.FERTILE && d <= 4) nearFertile++;
            if (t === T.ROCKY) minRock = Math.min(minRock, d);
          }
        }
        expect([tag, nearFertile >= 100]).toEqual([tag, true]);                    // fertile land lies along the water
        expect([tag, minRock > 4]).toEqual([tag, true]);                           // no rock within 4 tiles of any water
        expect(m.raiderEntries.length).toBe(2);
        for (const e of m.raiderEntries) {
          expect([tag, e.x === 0 || e.y === 0 || e.x === m.size - 1 || e.y === m.size - 1]).toEqual([tag, true]);
          expect([tag, at(m, e.x, e.y) !== T.WATER]).toEqual([tag, true]);
          expect([tag, landReaches(m, e, m.focus)]).toEqual([tag, true]);          // a raider can walk in without a bridge
        }
        let free = 0;
        for (let y = m.focus.y - 3; y <= m.focus.y + 3; y++) for (let x = m.focus.x - 3; x <= m.focus.x + 3; x++) if (![T.WATER, T.ROCKY].includes(at(m, x, y))) free++;
        expect([tag, free]).toEqual([tag, 49]);                                    // the start area is all buildable
        expect([tag, waterWithin(m, m.focus.x, m.focus.y, 24) <= 24]).toEqual([tag, true]);   // and near the river
        for (const [x, y] of m.startRoad) expect(at(m, x, y) === T.WATER).toBe(false);
        const clay = count(m, T.CLAY);
        expect([tag, clay >= 40 && clay <= 90]).toEqual([tag, true]);
      }
    }
  });
  it('gives every variant but classic a spot where the river is 3 tiles wide or narrower, for a bridge', () => {
    for (const v of NEW_VARIANTS) for (const seed of SEEDS) expect([`${v} ${seed}`, hasNarrowSpot(generateMap(seed, 64, v))]).toEqual([`${v} ${seed}`, true]);
  });
});

describe('s45 variants (what each one is)', () => {
  const centre = (m) => {
    const xs = [];
    for (let y = 0; y < m.size; y++) { const row = []; for (let x = 0; x < m.size; x++) if (at(m, x, y) === T.WATER) row.push(x); if (row.length) xs.push((row[0] + row[row.length - 1]) / 2); }
    return { mean: xs.reduce((a, b) => a + b, 0) / xs.length, range: Math.max(...xs) - Math.min(...xs) };
  };
  it('east runs the river down the east side with the rock on the west, middle down the middle with rock on both sides', () => {
    for (const seed of SEEDS) {
      const east = generateMap(seed, 64, 'east'), middle = generateMap(seed, 64, 'middle'), classic = generateMap(seed);
      expect([seed, centre(east).mean > 48, centre(classic).mean < 16]).toEqual([seed, true, true]);
      expect([seed, Math.abs(centre(middle).mean - 32) < 4]).toEqual([seed, true]);
      const side = (m, left) => { let n = 0; for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) if (at(m, x, y) === T.ROCKY && (x < 32) === left) n++; return n; };
      expect([seed, side(east, true) > 80, side(east, false) < 10]).toEqual([seed, true, true]);
      expect([seed, side(middle, true) >= 20, side(middle, false) >= 20]).toEqual([seed, true, true]);
    }
  });
  it('wide-bends meanders more than any other variant, and the island splits the river round 4-8 rows of land', () => {
    for (const seed of SEEDS) {
      expect([seed, centre(generateMap(seed, 64, 'wide-bends')).range >= 11, centre(generateMap(seed)).range <= 9]).toEqual([seed, true, true]);
      const w = createWorld({ seed, mapVariant: 'island' });
      const isle = riverIsle(w);
      expect([seed, isle.length >= 8]).toEqual([seed, true]);
      const columns = {};
      for (const [x, y] of isle) (columns[x] = columns[x] || []).push(y);
      const longest = Math.max(...Object.values(columns).map((ys) => { let best = 1, run = 1; for (let k = 1; k < ys.length; k++) { run = ys[k] === ys[k - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); } return best; }));
      expect([seed, longest >= 4 && longest <= 8]).toEqual([seed, true]);
      for (const [x, y] of isle) expect([seed, riverSpans(w)[y][0] < x && x < riverSpans(w)[y][1]]).toEqual([seed, true]);   // land with water either side of it
      expect([seed, riverPools(w).length > 0]).toEqual([seed, (w.mapParams.pools || []).length > 0]);   // Stage 4.6 (ruling 332): the only other water is its side channels and oxbow lakes
    }
  });
  it('oasis adds a lake of its own, ringed by bank and fertile land, with a little clay on its edge', () => {
    for (const seed of SEEDS) {
      const w = createWorld({ seed, mapVariant: 'oasis' });
      const pool = riverPools(w);
      expect([seed, pool.length >= 15]).toEqual([seed, true]);
      let bank = 0, fertile = 0, clay = 0;
      const m = { size: w.size, terrain: w.terrain };
      const seen = new Set(pool.map(([x, y]) => idx(w.size, x, y)));
      for (const [x, y] of pool) {
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            if (!inBounds(w.size, x + dx, y + dy) || seen.has(idx(w.size, x + dx, y + dy))) continue;
            seen.add(idx(w.size, x + dx, y + dy));
            const t = at(m, x + dx, y + dy);
            if (t === T.BANK) bank++; else if (t === T.FERTILE) fertile++; else if (t === T.CLAY) clay++;
          }
        }
      }
      expect([seed, bank + clay >= 12, fertile >= 12, clay >= 1]).toEqual([seed, true, true, true]);
    }
  });
});

describe('s45 variants (the dev scenes)', () => {
  it('names the variant, bridge and clay scenes, and refuses with no city open', async () => {
    expect(STAGE45_SCENES).toEqual(['variant', 'bridge', 'clay']);
    for (const name of STAGE45_SCENES) {
      let error = null;
      try { await devScene({ game: () => null }, name); } catch (e) { error = e.message; }
      expect([name, error]).toEqual([name, `devScene ${name}: no city is open (use ?skipTitle=1&sample=1)`]);
    }
  });
});

describe('s45 variants (new cities)', () => {
  it('createWorld({ mapVariant: "auto" }) takes the seed\'s layout; no variant, an unknown one and the fixtures stay classic', () => {
    for (const seed of [3, 7, 11, 21, 34]) {
      const w = createWorld({ seed, mapVariant: 'auto' });
      expect([seed, w.mapVariant]).toEqual([seed, variantFor(seed)]);
      expect(w.terrain).toEqual(generateMap(seed, 64, variantFor(seed)).terrain);
      expect([w.tradeEntry, w.focus, w.raiderEntries]).toEqual([generateMap(seed, 64, variantFor(seed)).tradeEntry, generateMap(seed, 64, variantFor(seed)).focus, generateMap(seed, 64, variantFor(seed)).raiderEntries]);
    }
    expect(createWorld({ seed: 7 }).mapVariant).toBe('classic');
    expect(createWorld({ seed: 7, mapVariant: 'swamp' }).mapVariant).toBe('classic');
    expect(createWorld({ seed: 7, mapVariant: 'island' }).mapVariant).toBe('island');
    expect(createWorld({ seed: 7 }).terrain).toEqual(generateMap(7).terrain);
    expect(buildSampleCity(createWorld({ seed: 11 })).mapVariant).toBe('classic');
  });
  it('the interface starts New city with the seed\'s layout, and a ?seed= flag, the sample city and ?variant= stay as asked', async () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));
    const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true}' : null), setItem: () => {} };
    const open = async (params) => {
      const shell = await mountShell(1280, 800);
      const history = fakeHistory();
      const api = await boot(document, window, {
        root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage: noStorage,
        platform: {}, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
        uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
        loopOptions: { raf: () => 0, caf: () => {} },
      });
      await flush();
      fire(shell.root.querySelector('#title .new-city'), 'click');
      const world = api.game().world;
      api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes;
      return world;
    };
    const other = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((s) => variantFor(s) !== 'classic');
    const fresh = await open('');
    expect(fresh.mapVariant).toBe(variantFor(fresh.seed));                                   // no flags: the seed's own
    expect((await open(`seed=${other}`)).mapVariant).toBe('classic');                        // a seed flag: classic, as the dev flags always were
    expect((await open(`seed=${other}&sample=1`)).mapVariant).toBe('classic');
    expect((await open(`seed=${other}&variant=oasis`)).mapVariant).toBe('oasis');
    expect((await open(`seed=${other}&variant=nowhere`)).mapVariant).toBe('classic');
  });
});
