// Stage 4.7 Task 3b: green only from water, and rock in long belts. The generator lays meadow only where the ONE moisture field (src/sim/moisture.js, the
// field the picture draws from) is high, so the sim and the bake agree and there is no green in open desert; the rocky ground lies in 2-3 long belts on a Normal
// map (scaled by area), not round patches; the picture draws rock a value darker than sand, in three values, on new land only.
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { createWorld } from '../../../src/sim/world.js';
import { MAP_VARIANTS_70 as MAP_VARIANTS, MAP_SIZES } from '../../../src/data/map.js';   // Version 7.1: the 7.0 layouts (tests/v71/m sweeps the new ones)
import { BELTS, GRASS, S47_SALT } from '../../../src/data/s47.js';
import { T } from '../../../src/sim/terrain.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { moistureField } from '../../../src/sim/moisture.js';
import { moistureOf } from '../../../src/render/grass.js';
import { beltRange } from '../../../src/sim/belts.js';
import { bakeChunk } from '../../../src/render/terrainBaker.js';
import { rockDepth, BELT } from '../../../src/render/rockBelts.js';
import { TERRAIN } from '../../../src/render/art/palette.js';
import { CHUNK } from '../../../src/render/camera.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';

const SIZES = Object.values(MAP_SIZES), SEEDS = 40;
const NEW = MAP_VARIANTS;
let cache = null;
const maps = () => {
  if (cache) return cache;
  cache = [];
  for (const size of SIZES) for (const variant of NEW) for (let seed = 1; seed <= (size > 80 ? 12 : SEEDS); seed++) if (!(variant === 'classic' && size === 64)) cache.push({ size, variant, seed, m: generateMap(seed, size, variant) });
  return cache;
};
const rockish = (t) => t === T.ROCKY || t === T.HILLS;
// Chebyshev distance of every tile to the nearest water tile.
function waterDist(m) {
  const n = m.size, d = new Uint8Array(n * n).fill(255), q = [];
  for (let i = 0; i < d.length; i++) if (m.terrain[i] === T.WATER) { d[i] = 0; q.push(i); }
  for (let k = 0; k < q.length; k++) {
    const x = q[k] % n, y = (q[k] - x) / n;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inBounds(n, x + dx, y + dy) && d[(y + dy) * n + x + dx] > d[q[k]] + 1) { d[(y + dy) * n + x + dx] = d[q[k]] + 1; q.push((y + dy) * n + x + dx); }
  }
  return d;
}

describe('s47 green only from water', () => {
  it('lays meadow only where the moisture field is high, and none in open desert: every meadow tile is wet, no wet sand is left, and none lies more than 9 tiles from water', () => {
    const bad = [];
    let meadow = 0;
    for (const { size, variant, seed, m } of maps()) {
      const wet = moistureField(m.terrain, size, seed, m.oases), wd = waterDist(m), tag = `${size} ${variant} #${seed}`;
      for (let i = 0; i < m.terrain.length; i++) {
        if (m.terrain[i] === T.MEADOW) {
          meadow++;
          if (wet[i] < GRASS.meadowFrom) bad.push(`${tag}: meadow at ${i} with moisture ${wet[i].toFixed(2)}`);
          if (wd[i] > 9) bad.push(`${tag}: meadow ${wd[i]} tiles from water`);
        } else if (m.terrain[i] === T.DESERT && wet[i] >= GRASS.meadowFrom) bad.push(`${tag}: wet sand at ${i}`);
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(meadow > 1000).toBe(true);   // and there is some: a fringe by the water, round the oases, channels and lakes
  });

  it('is one field for the sim and the picture: the world the player gets draws from exactly the numbers the generator laid meadow with', () => {
    for (const [seed, variant] of [[5, 'east'], [12, 'middle'], [3, 'oasis']]) {
      const w = createWorld({ seed, mapVariant: variant, size: 64 }), m = generateMap(seed, 64, variant);
      const a = moistureOf(w), b = moistureField(m.terrain, 64, seed, m.oases);
      expect(a.every((v, i) => v === b[i])).toBe(true);
      expect(w.terrain.every((t, i) => t === m.terrain[i])).toBe(true);
    }
  });

  it('draws no noise meadow and no groves on a new map, and classic at Normal keeps its own', () => {
    for (const { m } of maps().slice(0, 20)) expect(m.params.groves).toBe(undefined);
    const classic = generateMap(7, 64, 'classic');
    expect(classic.terrain.filter((t) => t === T.MEADOW).length > 0).toBe(true);
  });
});

describe('s47 rock belts', () => {
  it('lays the rock in belts: 2-3 on Normal (scaled by area, a few more only to reach the rock it wants), each a long piece of rocky ground', () => {
    const bad = [], extent = [];
    for (const { size, variant, seed, m } of maps()) {
      const [lo, hi] = beltRange(size), tag = `${size} ${variant} #${seed}`;
      if (m.belts.length > hi + BELTS.extra) bad.push(`${tag}: ${m.belts.length} belts`);
      for (const b of m.belts) {
        if (b.len < Math.floor(BELTS.minLen * 0.75 * 0.6)) bad.push(`${tag}: a belt ${b.len} tiles long`);
        // the rock piece the belt's middle is in: how far it reaches
        const n = size, start = idx(n, b.x, b.y);
        if (!rockish(m.terrain[start])) continue;
        const seen = new Set([start]), q = [start];
        let x0 = b.x, x1 = b.x, y0 = b.y, y1 = b.y;
        for (let k = 0; k < q.length; k++) {
          const x = q[k] % n, y = (q[k] - x) / n;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const j = (y + dy) * n + x + dx;
            if (inBounds(n, x + dx, y + dy) && !seen.has(j) && rockish(m.terrain[j])) { seen.add(j); q.push(j); }
          }
        }
        extent.push([Math.max(x1 - x0, y1 - y0) + 1, seen.size, lo]);
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(extent.length > 500).toBe(true);
    const long = extent.filter(([e]) => e >= 12).length / extent.length;
    expect(long > 0.9).toBe(true);                              // a belt is a long piece, not a patch (the old outcrops were 7 tiles across)
    expect(extent.filter(([e, a]) => a / e > 8).length / extent.length < 0.1).toBe(true);   // and narrow: area over length is a width
    expect(beltRange(64)).toEqual([2, 3]);
    expect([beltRange(48), beltRange(80)]).toEqual([[1, 2], [3, 5]]);
  });

  it('keeps the rock off the water, the start area and the oases as it always did, and has more of it than the old patches', () => {
    let belts = 0, rock = 0;
    for (const { size, variant, seed, m } of maps()) {
      const wd = waterDist(m), tag = `${size} ${variant} #${seed}`;
      for (let i = 0; i < m.terrain.length; i++) if (rockish(m.terrain[i])) { rock++; if (wd[i] <= 4) expect([tag, i, wd[i]]).toEqual([tag, i, 5]); }
      belts += m.belts.length;
    }
    expect(belts / maps().length > 1.5).toBe(true);
    expect(rock / maps().length > 150).toBe(true);
    expect(S47_SALT.belts).toBe(4714);
  });

  it('draws rock a clear value darker than sand and clay on a new map, as a three-value ladder', () => {
    const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
    // a new map: the mean of the body tiles' centres against the mean of open sand's, chunk by chunk
    const w = createWorld({ seed: 12, mapVariant: 'east', size: 64 });
    const depth = rockDepth(w), wd = waterDist({ size: 64, terrain: w.terrain });
    const at = (chunk, tx, ty) => { const o = [(chunk.cx * CHUNK - chunk.cy * CHUNK) * 16, (chunk.cx * CHUNK + chunk.cy * CHUNK) * 8]; return pixelAt(chunk.canvas, chunk.ax + ((tx - ty) * 16 - o[0]) * chunk.scale, chunk.ay + ((tx + ty + 1) * 8 - o[1]) * chunk.scale); };
    const chunks = new Map();
    const chunkOf = (x, y) => { const k = `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`; if (!chunks.has(k)) chunks.set(k, bakeChunk(w, Math.floor(x / CHUNK), Math.floor(y / CHUNK), 2, makeCanvas)); return chunks.get(k); };
    let body = 0, bodyN = 0, edge = 0, edgeN = 0, sand = 0, sandN = 0, hill = 0, hillN = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = y * 64 + x, t = w.terrain[i];
        if (t === T.ROCKY && depth[i] >= 2) { body += lum(at(chunkOf(x, y), x, y)); bodyN++; }
        else if (t === T.ROCKY && depth[i] === 1) { edge += lum(at(chunkOf(x, y), x, y)); edgeN++; }
        else if (t === T.HILLS) { hill += lum(at(chunkOf(x, y), x, y)); hillN++; }
        else if (t === T.DESERT && wd[i] > 12 && (x + y) % 7 === 0) { sand += lum(at(chunkOf(x, y), x, y)); sandN++; }
      }
    }
    expect(bodyN > 30 && edgeN > 30 && sandN > 30 && hillN > 10).toBe(true);
    const S = sand / sandN;
    expect(body / bodyN < S * 0.86).toBe(true);                 // the body at least 14% darker than sand (the colour is about 20%; boulders and strata lighten the mean)
    expect(edge / edgeN < S && edge / edgeN > body / bodyN).toBe(true);   // the edge between the two
    expect(hill / hillN < body / bodyN).toBe(true);             // the ground under a hill the darkest
    // cooler than clay: rock has little saturation, clay a lot
    const sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    expect(sat(hex(BELT.body)) < 0.5 * sat(hex(TERRAIN.clay))).toBe(true);
    expect(lum(hex(BELT.body)) < lum(hex(TERRAIN.sand)) * 0.84 && lum(hex(BELT.body)) > lum(hex(BELT.hill))).toBe(true);
  });
});
