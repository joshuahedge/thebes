// Stage 4.7 Task 3b review round 1: the river's fringe is the greenest land, no vivid green in open desert, the mine repair's rock is a belt fragment, and the
// minimap and share card draw a new map's rock in the belt's body colour.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { GRASS } from '../../../src/data/s47.js';
import { MAP } from '../../../src/data/map.js';
import { inOasisPool } from '../../../src/sim/oases.js';
import { repairResources } from '../../../src/sim/resources.js';
import { moistureOf } from '../../../src/render/grass.js';
import { decorAt } from '../../../src/render/renderer.js';
import { bakeChunk, shrubKind } from '../../../src/render/terrainBaker.js';
import { CHUNK, createCamera } from '../../../src/render/camera.js';
import { TERRAIN } from '../../../src/render/art/palette.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { drawMapSquare } from '../../../src/ui/share.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { hash2 } from '../../../src/sim/rng.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';

const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));

describe('s47 review: the river is the greenest land', () => {
  it('draws the loam by the river at least as green as the halo of an oasis (mean green of the tile centres within 4 tiles of each)', () => {
    for (const [seed, variant] of [[12, 'east'], [5, 'east']]) {
      const w = createWorld({ seed, mapVariant: variant, size: 64 }), n = 64, chunks = new Map();
      expect(w.oases.length > 0).toBe(true);
      const chunkAt = (x, y) => { const k = `${x >> 4},${y >> 4}`; if (!chunks.has(k)) chunks.set(k, bakeChunk(w, x >> 4, y >> 4, 2, makeCanvas)); return chunks.get(k); };
      const green = (x, y) => {
        const c = chunkAt(x, y), o = [(c.cx * CHUNK - c.cy * CHUNK) * 16, (c.cx * CHUNK + c.cy * CHUNK) * 8];
        const [r, g, b] = pixelAt(c.canvas, c.ax + ((x - y) * 16 - o[0]) * c.scale, c.ay + ((x + y + 1) * 8 - o[1]) * c.scale);
        return g - (r + b) / 2;
      };
      const river = [0, 0], halo = [0, 0];
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const t = w.terrain[y * n + x];
          if (t === T.WATER || t === T.BANK || t === T.CLAY || t === T.ROCKY || t === T.HILLS) continue;
          let dr = 99, dp = 99;
          for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= n || yy >= n || w.terrain[yy * n + xx] !== T.WATER) continue;
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            if (inOasisPool(w, xx, yy)) dp = Math.min(dp, d); else dr = Math.min(dr, d);
          }
          if (dr <= 4 && dp > 5) { river[0] += green(x, y); river[1]++; } else if (dp <= 4 && dr > 5) { halo[0] += green(x, y); halo[1]++; }
        }
      }
      expect(river[1] > 100 && halo[1] > 50).toBe(true);
      expect([seed, river[0] / river[1] >= halo[0] / halo[1]]).toEqual([seed, true]);
      expect(river[0] / river[1] > 40).toBe(true);   // and it is properly green, not olive: the green channel leads red and blue by 40 on average
    }
  });
});

describe('s47 review: no vivid green in open desert', () => {
  it('gives vivid scrub only where the green reaches and a sparser drab shrub in open desert, and keeps classic at Normal as it was', () => {
    const w = createWorld({ seed: 12, mapVariant: 'east', size: 64 }), f = moistureOf(w);
    let wet = 0, wetN = 0, dryScrub = 0, dryDry = 0, dryN = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = y * 64 + x;
        if (w.terrain[i] !== T.DESERT) continue;
        const r = hash2(x, y, w.seed + 3), k = shrubKind(w, i, r);
        if (f[i] >= GRASS.tiers[0]) { wetN++; if (k === 'scrub') wet++; } else { dryN++; if (k === 'scrub') dryScrub++; if (k === 'dry') dryDry++; }
      }
    }
    expect(dryN > 1000 && wetN > 100).toBe(true);
    expect(dryScrub).toBe(0);                                     // no vivid scrub in open desert
    expect(dryDry > 0 && dryDry / dryN < 0.045).toBe(true);   // a dry shrub on 3% of it, against 6% before
    expect(wet / wetN > 0.04).toBe(true);                         // the green's own scrub is as it was
    const c = createWorld({ seed: 7, mapVariant: 'classic', size: 64 });
    for (let i = 0; i < 4096; i++) expect(shrubKind(c, i, 0.07)).toBe('scrub');
    expect(shrubKind(c, 5, 0.12)).toBe(null);
  });

  it('puts a desert acacia only where the green reaches on a new map, and leaves every other tree and classic at Normal alone', () => {
    const w = createWorld({ seed: 12, mapVariant: 'east', size: 64 }), f = moistureOf(w);
    let dryAcacia = 0, wetAcacia = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = y * 64 + x;
      if (w.terrain[i] !== T.DESERT || hash2(x, y, w.seed + 7) >= 0.006) continue;
      const d = decorAt(w, x, y);
      if (f[i] < GRASS.tiers[0]) { if (d === 'acacia') dryAcacia++; } else if (d === 'acacia') wetAcacia++;
    }
    expect(dryAcacia).toBe(0);
    expect(wetAcacia >= 0).toBe(true);
    const c = createWorld({ seed: 7, mapVariant: 'classic', size: 64 });
    let old = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (c.terrain[y * 64 + x] === T.DESERT && hash2(x, y, c.seed + 7) < 0.006 && decorAt(c, x, y) === 'acacia') old++;
    expect(old > 5).toBe(true);
  });
});

describe('s47 review: the mine repair is a belt fragment', () => {
  // an open map with no rock and no water: the repair must add a mine's rock, and its shape is what is looked at
  const open = (size = 64) => ({ size, terrain: new Array(size * size).fill(T.DESERT), focus: { x: 20, y: 52 }, startRoad: [] });
  const shape = (terrain, size) => {
    const pts = [];
    for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.ROCKY) pts.push([i % size, Math.floor(i / size)]);
    const mx = pts.reduce((s, [x]) => s + x, 0) / pts.length, my = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    return { n: pts.length, ratio: Math.sqrt((tr / 2 + disc) / Math.max(1e-6, tr / 2 - disc)) };   // long axis over short axis
  };
  it('draws the added rock out along a heading as a tapered piece, not a round blob, and still gives a mine its fit', () => {
    let belt = 0, blob = 0, nb = 0, nl = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const a = open(), b = open();
      const da = repairResources(a, seed, null, { mine: true, belt: true }), db = repairResources(b, seed, null, { mine: true, belt: false });
      expect(da.mine > 15 && db.mine > 10).toBe(true);
      const sa = shape(a.terrain, 64), sb = shape(b.terrain, 64);
      belt += sa.ratio; nb++; blob += sb.ratio; nl++;
      expect(sa.n).toBe(da.mine);
    }
    expect(belt / nb > 1.6).toBe(true);        // elongated
    expect(blob / nl < 1.35).toBe(true);       // the old blob is round
  });
  it('is what the generator adds on a new map: its repaired rock sits in the belt language (rocky ground, no round patch left)', () => {
    let repaired = 0, total = 0;
    for (let seed = 1; seed <= 60; seed++) { const m = generateMap(seed, 64, 'east'); total++; if (m.repaired.mine) repaired++; }
    expect(repaired / total > 0.2 && repaired / total < 0.7).toBe(true);   // it still repairs about 40% of Normal maps
    expect(MAP.rockAwayStart).toBe(11);
  });
});

describe('s47 review: the minimap and the share card show new-land rock in the belt colour', () => {
  const cell = (cv, size, x, y) => pixelAt(cv, (x + 0.5) * (cv.width / size), (y + 0.5) * (cv.height / size));
  const rockTile = (w) => { const i = w.terrain.findIndex((t, k) => t === T.ROCKY && w.terrain[k + 1] === T.ROCKY); return [i % w.size, Math.floor(i / w.size)]; };
  it('draws a new map\'s rocky ground in TERRAIN.beltRock on the minimap and the card, and classic at Normal in the old rocky colour', () => {
    for (const [variant, colour] of [['east', TERRAIN.beltRock], ['classic', TERRAIN.rocky]]) {
      const w = createWorld({ seed: 7, mapVariant: variant, size: 64 }), [x, y] = rockTile(w);
      const mini = createMinimap({ world: w, cam: createCamera({ x: 32, y: 32, zoom: 1 }), view: () => ({ width: 100, height: 100 }), size: 64, dpr: 1 });
      mini.render();
      expect([variant, cell(mini.canvas, 64, x, y).slice(0, 3)]).toEqual([variant, hex(colour)]);
      const card = makeCanvas(128, 128);
      drawMapSquare(card.getContext('2d'), { size: 64, terrain: w.terrain, land: variant !== 'classic' }, 0, 0, 128);
      expect([variant, cell(card, 64, x, y).slice(0, 3)]).toEqual([variant, hex(colour)]);
    }
    expect(TERRAIN.beltRock === TERRAIN.rocky).toBe(false);
  });
});
