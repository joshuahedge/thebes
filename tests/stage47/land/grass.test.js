// Stage 4.7 Task 2 (ruling 462): the green band. One moisture field (distance to water, oasis pools included, plus value noise) drives both the
// terrain bake and the decor; sim land does not move; a map without new land (classic at Normal, every city saved before version 8) draws as before.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { hasNewLand, GRASS, S47_SALT, OASES } from '../../../src/data/s47.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { hash2 } from '../../../src/sim/rng.js';
import { moistureOf } from '../../../src/render/grass.js';
import { decorAt } from '../../../src/render/renderer.js';
import { bakeChunk } from '../../../src/render/terrainBaker.js';
import { poolTiles } from '../../../src/sim/oases.js';

const land = (seed = 5, size = 64, variant = 'east') => createWorld({ seed, mapVariant: variant, size });

// The decor rule as it was before Stage 4.7 (trees by terrain and one hash).
const oldDecor = (w, x, y) => {
  const i = idx(w.size, x, y);
  if (w.occ[i] || w.road[i] || (w.wall && w.wall[i] !== 0)) return null;
  const t = w.terrain[i], r = hash2(x, y, w.seed + 7);
  if (t === T.MEADOW) return r < 0.08 ? 'palm' : r < 0.12 ? 'acacia' : null;
  if (t === T.FERTILE) return r < 0.025 ? 'palm' : null;
  if (t === T.BANK) return r < 0.06 ? 'palm' : null;
  if (t === T.DESERT) return r < 0.006 ? 'acacia' : null;
  return null;
};

describe('s47 grass band', () => {
  it('has no moisture field on classic at Normal or on a city saved before version 8, and draws every tree as before', () => {
    for (const seed of [1, 7, 11]) {
      const w = land(seed, 64, 'classic');
      expect([hasNewLand(w), moistureOf(w)]).toEqual([false, null]);
      const bad = [];
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (decorAt(w, x, y) !== oldDecor(w, x, y)) bad.push([x, y]);
      expect([seed, bad.length]).toEqual([seed, 0]);
    }
    const v7 = land(5, 64, 'east');
    delete v7.mapParams.land;   // a v7 city of a non-classic layout: its maps keep their look
    expect(moistureOf(v7)).toBe(null);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) expect(decorAt(v7, x, y)).toBe(oldDecor(v7, x, y));
  });

  it('is one field per world: 1 at the water, falling to 0 within the reach, noisy rather than a straight line, and it does not touch the terrain', () => {
    const w = land(5, 64, 'east');
    const before = [...w.terrain];
    const f = moistureOf(w);
    expect(moistureOf(w)).toBe(f);   // cached
    expect(w.terrain).toEqual(before);
    expect([f.length, f.every((v) => v >= 0 && v <= 1)]).toEqual([64 * 64, true]);
    for (let i = 0; i < f.length; i++) if (w.terrain[i] === T.WATER) expect(f[i]).toBe(1);
    // by distance from the river's bank, on the desert side of the 'east' river: the mean falls with distance and is 0 well past the reach
    const pool = new Set(poolTiles(w)), mean = (d0, d1) => {
      let s = 0, n = 0;
      for (let y = 0; y < 64; y++) {
        let edge = null;
        for (let x = 0; x < 64; x++) if (w.terrain[idx(64, x, y)] === T.WATER && !pool.has(idx(64, x, y)) && (edge === null || x < edge)) edge = x;
        if (edge === null) continue;
        for (let x = edge - d1; x <= edge - d0; x++) if (x >= 0) { s += f[idx(64, x, y)]; n++; }
      }
      return s / n;
    };
    expect(mean(2, 3) > mean(6, 7) && mean(6, 7) > mean(10, 11)).toBe(true);
    expect(f.filter((v) => v === 0).length > 0.2 * f.length).toBe(true);   // the far desert holds none
    // the edge is noisy: the column where moisture first falls below the middle tier, row by row, takes many values
    const cols = new Set();
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) if (w.terrain[idx(64, x, y)] === T.DESERT && f[idx(64, x, y)] >= GRASS.tiers[2]) { cols.add(`${y}:${x}`); break; }
    }
    expect(cols.size > 20).toBe(true);
    const firsts = new Set([...cols].map((c) => c.split(':')[1]));
    expect(firsts.size >= 5).toBe(true);
  });

  it('gives an oasis its own field, smaller than the river\'s, so the sand round a pool greens', () => {
    const w = land(5, 64, 'east');
    const o = w.oases[0], f = moistureOf(w), pool = new Set(poolTiles(w));
    const river = [];
    for (let i = 0; i < w.terrain.length; i++) if (w.terrain[i] === T.WATER && !pool.has(i)) river.push([i % 64, Math.floor(i / 64)]);
    const awayFromRiver = (x, y) => river.every(([rx, ry]) => Math.hypot(rx - x, ry - y) > GRASS.river + 2);
    const ring = (d) => {   // the mean moisture of dry ground d tiles (+- 0.5) from the pool's edge, where only the oasis can reach
      let s = 0, n = 0;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const dd = Math.hypot(x - o.x, y - o.y) - o.r;
        if (dd >= d - 0.5 && dd < d + 0.5 && w.terrain[idx(64, x, y)] !== T.WATER && awayFromRiver(x, y)) { s += f[idx(64, x, y)]; n++; }
      }
      return n ? s / n : -1;
    };
    expect(GRASS.oasis < GRASS.river).toBe(true);
    expect(ring(2) > 0.3 && ring(2) > ring(4) && ring(4) > ring(GRASS.oasis + 3)).toBe(true);
    expect(ring(GRASS.oasis + 3) < 0.05).toBe(true);
  });

  it('drives the decor from the same field: trees and scrub grow where it is moist, every old tree stays, and sand far from water stays bare', () => {
    const w = land(5, 80, 'east');
    const f = moistureOf(w);
    let wet = 0, wetN = 0, dry = 0, dryN = 0, lost = 0;
    for (let y = 0; y < 80; y++) {
      for (let x = 0; x < 80; x++) {
        const i = idx(80, x, y), d = decorAt(w, x, y), o = oldDecor(w, x, y);
        if (o && d !== o) lost++;
        if (w.terrain[i] !== T.DESERT && w.terrain[i] !== T.MEADOW) continue;   // Task 3b: the moist fringe is meadow now, not sand
        if (f[i] >= 0.5) { wetN++; if (d) wet++; } else if (f[i] === 0) { dryN++; if (d) dry++; }
      }
    }
    expect(lost).toBe(0);
    expect(wetN > 50 && dryN > 500).toBe(true);
    expect(wet / wetN > 3 * (dry / dryN)).toBe(true);
    expect(S47_SALT.grass).toBe(4706);
    expect(S47_SALT.grassDecor).toBe(4707);
  });

  it('palms crowd an oasis\'s banks and loam, thinning out with distance', () => {
    const w = land(5, 64, 'east');
    const o = w.oases[0];
    let near = 0, nearN = 0, far = 0, farN = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x - o.x, y - o.y) - o.r;
      const t = w.terrain[idx(64, x, y)];
      if (t === T.WATER || t === T.CLAY) continue;
      if (d <= 2.6) { nearN++; if (decorAt(w, x, y) === 'palm') near++; } else if (d > OASES.decorNear + 2 && d < OASES.decorNear + 8) { farN++; if (decorAt(w, x, y) === 'palm') far++; }
    }
    expect(near / nearN > 0.12).toBe(true);
    expect(near / nearN > 2 * (far / farN)).toBe(true);
  });

  it('bakes the band on a map with new land and not on classic at Normal or a pre-version-8 map (no green tier colour is ever filled)', () => {
    const tiers = new Set(GRASS.colours.map((c) => c.toLowerCase()));
    const used = (w, cx, cy) => {
      const seen = new Set(), orig = CanvasRenderingContext2D.prototype.fill;
      CanvasRenderingContext2D.prototype.fill = function fillSpy(...a) { seen.add(String(this.fillStyle).toLowerCase()); return orig.apply(this, a); };
      try { bakeChunk(w, cx, cy, 1); } finally { CanvasRenderingContext2D.prototype.fill = orig; }
      return [...seen].filter((c) => tiers.has(c)).length;
    };
    const a = land(5, 64, 'east');
    expect(used(a, 3, 1) >= 3).toBe(true);
    const classic = land(5, 64, 'classic');
    expect(used(classic, 3, 1)).toBe(0);
    const v7 = land(5, 64, 'east');
    delete v7.mapParams.land;
    expect(used(v7, 3, 1)).toBe(0);
  });

  it('leaves the sim\'s fertile land where it was: the terrain of a new map is the generator\'s, the band only a picture', () => {
    const m = generateMap(5, 64, 'east'), w = land(5, 64, 'east');
    expect(w.terrain).toEqual(m.terrain);
    moistureOf(w);
    expect(w.terrain).toEqual(m.terrain);
    const fertile = m.terrain.filter((t) => t === T.FERTILE).length;
    expect(fertile > 300).toBe(true);
  });
});
