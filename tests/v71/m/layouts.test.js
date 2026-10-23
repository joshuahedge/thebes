// Version 7.1, Track M (rulings 1020-1039): the six new river layouts. Each is playable on 200 seeds at every offered size (25 on Huge, as the
// other sweeps take): the start, the trade road and every raider entry on one piece of land, the resource guarantee on that land, a Quay
// site on water a boat reaches from the edge, water under MAP.courses.maxWater; each is what its name says; 'auto' picks the new ones about
// two times in three; the older six do not move (tests/stage46/contract/mapSizes.test.js holds their fingerprints); the render and the
// words follow.
import { describe, it, expect } from '../../harness.js';
import { generateMap, variantFor } from '../../../src/sim/mapgen.js';
import { createWorld } from '../../../src/sim/world.js';
import { MAP, MAP_VARIANTS, MAP_VARIANTS_70, MAP_VARIANTS_71, MAP_SIZES } from '../../../src/data/map.js';
import { T } from '../../../src/sim/terrain.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { fitOf } from '../../../src/sim/fit.js';
import { floodplainOf } from '../../../src/sim/flood.js';
import { serialize, deserialize, validateWorld } from '../../../src/save/serialize.js';
import { riverSpans, riverPools } from '../../../src/render/terrainWater.js';
import { bakeChunk } from '../../../src/render/terrainBaker.js';
import { CHUNK } from '../../../src/render/camera.js';
import { chunkPixel } from '../../helpers/renderWorld.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { MAPS_HELP, LAYOUT_NAMES } from '../../../src/ui/v71/mapsText.js';
import { playability, ownLand, riverWater, quaySite } from './check.js';

const SIZES = Object.values(MAP_SIZES);
const seedsFor = (size) => (size > 80 ? 25 : 200);
const at = (m, x, y) => m.terrain[idx(m.size, x, y)];

// The 4-linked pieces of water that reach the map's edge, each as a list of tile indices.
function edgePieces(m) {
  const n = m.size, piece = new Int32Array(n * n).fill(-1), out = [];
  for (let s = 0; s < n * n; s++) {
    if (m.terrain[s] !== T.WATER || piece[s] >= 0) continue;
    const q = [s];
    piece[s] = out.length;
    for (let k = 0; k < q.length; k++) {
      const x = q[k] % n, y = (q[k] - x) / n;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!inBounds(n, x + dx, y + dy)) continue;
        const j = idx(n, x + dx, y + dy);
        if (m.terrain[j] === T.WATER && piece[j] < 0) { piece[j] = out.length; q.push(j); }
      }
    }
    out.push(q);
  }
  const edge = (i) => { const x = i % n, y = (i - x) / n; return x === 0 || y === 0 || x === n - 1 || y === n - 1; };
  return out.filter((q) => q.some(edge));
}
// The runs of water along one edge of the map: [length, ...].
function edgeRuns(m, edge) {
  const n = m.size, runs = [];
  let run = 0;
  for (let k = 0; k <= n; k++) {
    const [x, y] = edge === 'north' ? [k, 0] : edge === 'south' ? [k, n - 1] : edge === 'west' ? [0, k] : [n - 1, k];
    if (k < n && at(m, x, y) === T.WATER) run++;
    else { if (run) runs.push(run); run = 0; }
  }
  return runs;
}
// Whether a straight run of at most `max` water tiles joins the start's own land to land beyond it (a bridge to the far bank).
function bridgeAcross(m, max) {
  const n = m.size, own = ownLand(m), land = (x, y) => inBounds(n, x, y) && ![T.WATER, T.HILLS].includes(at(m, x, y));
  for (let a = 0; a < n; a++) for (const vertical of [false, true]) {
    let start = -1;
    for (let b = 0; b <= n; b++) {
      const [x, y] = vertical ? [a, b] : [b, a];
      const wet = b < n && at(m, x, y) === T.WATER;
      if (wet && start < 0) start = b;
      if (wet || start < 0) continue;
      const run = b - start, [x0, y0] = vertical ? [a, start - 1] : [start - 1, a];
      if (run <= max && land(x0, y0) && land(x, y) && own[idx(n, x0, y0)] !== own[idx(n, x, y)]) return true;
      start = -1;
    }
  }
  return false;
}

describe('v71 m layouts (the list and the pick)', () => {
  it('appends six layouts after the 7.0 six, each drawn by the course generator, and validates, links and saves them', () => {
    expect(MAP_VARIANTS).toEqual([...MAP_VARIANTS_70, ...MAP_VARIANTS_71]);
    expect(MAP_VARIANTS_71).toEqual(['delta', 'confluence', 'twin', 'wide-nile', 'cataract', 'lake-fed']);
    for (const v of MAP_VARIANTS_71) expect([v, MAP.variants[v].course, generateMap(3, 64, v).variant]).toEqual([v, v, v]);
    for (const v of MAP_VARIANTS_70) expect([v, MAP.variants[v].course]).toEqual([v, undefined]);
    for (const v of MAP_VARIANTS) expect([v, typeof LAYOUT_NAMES[v]]).toEqual([v, 'string']);
    // a city of a new layout saves, loads with its own terrain and layout, and a share link carries it
    const w = createWorld({ seed: 21, mapVariant: 'delta' });
    const back = deserialize(serialize(w));
    expect([validateWorld(JSON.parse(serialize(w))), back.mapVariant, back.terrain.join('') === w.terrain.join('')]).toEqual([true, 'delta', true]);
    // (a share link names one as it names any layout: tests/stage45/variantLinks.test.js round-trips every one)
  });
  it("'auto' draws the new layouts about two times in three, every layout from the seed alone", () => {
    let fresh = 0;
    const seen = new Set();
    for (let seed = 1; seed <= 3000; seed++) { const v = variantFor(seed); seen.add(v); if (MAP_VARIANTS_71.includes(v)) fresh++; }
    expect([fresh / 3000 > 0.62, fresh / 3000 < 0.71]).toEqual([true, true]);
    expect([...seen].sort()).toEqual([...MAP_VARIANTS].sort());
    const w = createWorld({ seed: 77, mapVariant: 'auto' });
    expect(w.mapVariant).toBe(variantFor(77));
    expect(w.terrain).toEqual(generateMap(77, 64, variantFor(77)).terrain);
  });
  it('draws a map from (seed, size, layout) alone, and a seed, a size or a layout changes it', () => {
    for (const v of MAP_VARIANTS_71) for (const size of SIZES) {
      const a = generateMap(5, size, v);
      expect([v, size, JSON.stringify(a)]).toEqual([v, size, JSON.stringify(generateMap(5, size, v))]);
      expect([v, size, a.terrain.join('') === generateMap(6, size, v).terrain.join('')]).toEqual([v, size, false]);
    }
  });
});

describe('v71 m layouts (playable on 200 seeds at every size)', () => {
  for (const v of MAP_VARIANTS_71) {
    it(`${v}: one piece of land for the start, the trade road and the raiders; clay, a mine and farms on it; a Quay site; water under ${Math.round(MAP.courses.maxWater * 100)}%`, () => {
      const bad = [];
      for (const size of SIZES) for (let seed = 1; seed <= seedsFor(size); seed++) {
        const m = generateMap(seed, size, v), r = playability(m);
        if (r.bad.length) bad.push(`${v} ${size} #${seed}: ${r.bad.join('; ')}`);
      }
      expect(bad.slice(0, 6)).toEqual([]);
    });
  }
  it('the check refuses a map that breaks each promise (a start cut off by water, no Quay site, too much water)', () => {
    const m = generateMap(4, 64, 'twin');
    expect(playability(m).bad).toEqual([]);
    const cut = { ...m, terrain: [...m.terrain] };
    for (let x = 0; x < 64; x++) cut.terrain[idx(64, x, m.focus.y - 5)] = T.WATER;   // a channel across the map north of the start
    expect(playability(cut).bad.some((b) => b.startsWith('raider entry'))).toBe(true);
    const dry = { ...m, terrain: m.terrain.map((t) => (t === T.WATER ? T.DESERT : t)) };
    expect(quaySite(dry, ownLand(dry), riverWater(dry))).toBe(null);
    const wet = { ...m, terrain: m.terrain.map((t, i) => (i % 64 < 20 ? T.WATER : t)) };
    expect(playability(wet).bad.some((b) => b.startsWith('water'))).toBe(true);
  });
  it('a Quay fits by the game\'s own rule on a fresh city of every new layout, its water joined to the map\'s edge', () => {
    for (const v of MAP_VARIANTS_71) for (const seed of [1, 2, 3]) {
      const w = createWorld({ seed, mapVariant: v }), m = { size: w.size, terrain: w.terrain, focus: w.focus, oases: w.oases };
      const q = quaySite(m);
      expect([v, seed, q !== null && fitOf(w, 'quay', q.x, q.y, q.rot).ok]).toEqual([v, seed, true]);
      expect([v, seed, floodplainOf(w.terrain, w.size).some(Boolean)]).toEqual([v, seed, true]);   // the flood has a floodplain to rise over
    }
  });
});

describe('v71 m layouts (each is what its name says)', () => {
  const seeds = Array.from({ length: 60 }, (_, k) => k + 1);
  it('runs each layout north-south on either side or east-west, from the seed', () => {
    for (const v of MAP_VARIANTS_71) {
      const ways = new Set(seeds.map((s) => { const c = generateMap(s, 64, v).params.course; return `${c.axis}-${c.side}`; }));
      const want = MAP.courses[v].axes.includes('ew') ? 4 : 2;
      expect([v, ways.size]).toEqual([v, want]);
    }
    expect(generateMap(1, 64, 'classic').params.course).toBe(undefined);
  });
  it('delta: 2 or 3 arms (2 on a Small map) reach one edge, the widest mouth 6 tiles or more, with sandbars in the wide ones', () => {
    let bars = 0;
    for (const size of [48, 64]) for (const s of seeds) {
      const m = generateMap(s, size, 'delta'), c = m.params.course;
      const edge = c.axis === 'ns' ? 'north' : c.side;
      const runs = edgeRuns(m, edge);
      expect([size, s, runs.length >= 2 && runs.length <= (size < 64 ? 2 : 3) + 2, Math.max(...runs) >= 6]).toEqual([size, s, true, true]);
      if (islets(m) > 0) bars++;
    }
    expect(bars > 20).toBe(true);
  });
  it('confluence: the river meets the west and the east edges and the start lies in the fork, its land never touching the north edge', () => {
    for (const s of seeds) {
      const m = generateMap(s, 64, 'confluence'), own = ownLand(m);
      expect([s, edgeRuns(m, 'west').length >= 1, edgeRuns(m, 'east').length >= 1, edgePieces(m).length]).toEqual([s, true, true, 1]);
      let north = false;
      for (let x = 0; x < 64; x++) if (own[idx(64, x, 0)]) north = true;
      expect([s, north]).toEqual([s, false]);
    }
  });
  it('twin: two rivers cross the map and never join', () => {
    for (const s of seeds) {
      const m = generateMap(s, 64, 'twin'), c = m.params.course;
      const pieces = edgePieces(m).filter((q) => q.length >= 40);
      const across = (q) => { const xs = q.map((i) => i % 64), ys = q.map((i) => Math.floor(i / 64)); return c.axis === 'ns' ? Math.min(...ys) === 0 && Math.max(...ys) === 63 : Math.min(...xs) === 0 && Math.max(...xs) === 63; };
      expect([s, pieces.length, pieces.every(across)]).toEqual([s, 2, true]);
    }
  });
  it('wide-nile: 6 to 8 tiles of water across, no bridge to the far bank, and fertile land on the far bank', () => {
    const [lo, hi] = MAP.courses['wide-nile'].hw.map((h) => Math.round(h * 2));
    for (const s of seeds) {
      const m = generateMap(s, 64, 'wide-nile'), c = m.params.course, own = ownLand(m);
      const widths = [];
      for (let k = 0; k < 64; k++) { let n = 0; for (let j = 0; j < 64; j++) if ((c.axis === 'ns' ? at(m, j, k) : at(m, k, j)) === T.WATER) n++; widths.push(n); }
      widths.sort((a, b) => a - b);
      expect([s, widths[0] >= lo, widths[32] <= hi + 1]).toEqual([s, true, true]);
      expect([s, bridgeAcross(m, MAP.bridgeMax)]).toEqual([s, false]);
      expect([s, m.terrain.filter((t, i) => t === T.FERTILE && !own[i]).length >= 100]).toEqual([s, true]);
    }
    expect(bridgeAcross(generateMap(1, 64, 'twin'), MAP.bridgeMax)).toBe(true);   // the check finds a crossing where the river narrows to one
  });
  it('cataract: a rocky gorge (rock on the water\'s edge) narrow enough to bridge, and a chain of 3 or more islands', () => {
    for (const s of seeds) {
      const m = generateMap(s, 64, 'cataract');
      let wall = 0;
      for (let i = 0; i < m.terrain.length; i++) if (m.terrain[i] === T.ROCKY && near(m, i, T.WATER)) wall++;
      expect([s, wall >= 8, bridgeAcross(m, 3), islets(m) >= 3]).toEqual([s, true, true, true]);
    }
  });
  it('lake-fed: a lake (water 3 tiles deep every way, which no river here is) on an edge, the river running out of it to the far edge', () => {
    for (const s of seeds) {
      const m = generateMap(s, 64, 'lake-fed'), n = 64;
      let deep = null;
      for (let y = 3; y < n - 3 && !deep; y++) for (let x = 3; x < n - 3 && !deep; x++) {
        let all = true;
        for (let dy = -3; dy <= 3 && all; dy++) for (let dx = -3; dx <= 3 && all; dx++) if (at(m, x + dx, y + dy) !== T.WATER) all = false;
        if (all) deep = { x, y };
      }
      expect([s, deep !== null, edgePieces(m).length]).toEqual([s, true, 1]);
    }
  });
});

// The islands in the water: pieces of land (4-linked) of under 40 tiles that touch no edge of the map.
function islets(m) {
  const n = m.size, seen = new Uint8Array(n * n);
  let count = 0;
  for (let s = 0; s < n * n; s++) {
    if (seen[s] || m.terrain[s] === T.WATER) continue;
    const q = [s];
    seen[s] = 1;
    let edge = false;
    for (let k = 0; k < q.length; k++) {
      const x = q[k] % n, y = (q[k] - x) / n;
      if (x === 0 || y === 0 || x === n - 1 || y === n - 1) edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!inBounds(n, x + dx, y + dy)) continue;
        const j = idx(n, x + dx, y + dy);
        if (!seen[j] && m.terrain[j] !== T.WATER) { seen[j] = 1; q.push(j); }
      }
    }
    if (!edge && q.length < 40) count++;
  }
  return count;
}
const near = (m, i, t) => { const x = i % m.size, y = (i - x) / m.size; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inBounds(m.size, x + dx, y + dy) && at(m, x + dx, y + dy) === t) return true; return false; };

describe('v71 m layouts (the render and the words)', () => {
  it('draws a new layout\'s water as pools (any shape), and an older layout\'s river as its row spans, as in 7.0', () => {
    const w = createWorld({ seed: 2, mapVariant: 'confluence' });
    const water = w.terrain.filter((t) => t === T.WATER).length;
    expect([riverSpans(w).every((s) => s === null), riverPools(w).length]).toEqual([true, water]);
    const old = createWorld({ seed: 2, mapVariant: 'east' });
    expect(riverSpans(old).filter(Boolean).length).toBe(64);
    // the baked chunk paints open water blue and desert sand-coloured
    let wet = null, dry = null;
    for (let i = 0; i < w.terrain.length && (!wet || !dry); i++) {
      const x = i % 64, y = (i - x) / 64;
      if (x < 2 || y < 2 || x > 61 || y > 61) continue;
      if (!wet && w.terrain[i] === T.WATER && [-1, 0, 1].every((d) => [-1, 0, 1].every((e) => at(w, x + d, y + e) === T.WATER))) wet = { x, y };
      if (!dry && w.terrain[i] === T.DESERT && [-2, 0, 2].every((d) => [-2, 0, 2].every((e) => at(w, x + d, y + e) === T.DESERT))) dry = { x, y };
    }
    const px = (t) => chunkPixel(bakeChunk(w, Math.floor(t.x / CHUNK), Math.floor(t.y / CHUNK), 2), t.x, t.y);
    const [wr, , wb] = px(wet), [dr, , db] = px(dry);
    expect([wb > wr, dr > db]).toEqual([true, true]);
  });
  it('How to play has a Maps note whose numbers are the generator\'s: the count of layouts, the bridge limit, a wide Nile\'s and a delta mouth\'s width', async () => {
    const [note] = MAPS_HELP, C = MAP.courses;
    expect(note.head).toBe('Maps');
    expect(note.text).toContain(`one of ${MAP_VARIANTS.length} layouts`);
    expect(note.text).toContain(`at most ${MAP.bridgeMax} tiles of water`);
    expect(note.text).toContain(`${Math.round(C['wide-nile'].hw[0] * 2)} to ${Math.round(C['wide-nile'].hw[1] * 2)} tiles wide`);
    expect(note.text).toContain(`widen to ${Math.round(C.delta.mouth[0] * 2)} to ${Math.round(C.delta.mouth[1] * 2)} tiles`);
    for (const v of MAP_VARIANTS_71) expect(note.text).toContain(`${LAYOUT_NAMES[v]}:`);
    const r = await rigUI({});
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const heads = [...r.root.querySelectorAll('#sheet h3')].map((h) => h.textContent);
      expect(heads.includes('Maps')).toBe(true);
      expect(r.root.querySelector('#sheet').textContent).toContain(note.text);
    } finally { r.cleanup(); }
  });
});
