// The flood's water on the floodplain (Stage 4.6, River track, rulings 334, 362): render-only, spread over the floodplain's low tiles in
// the season and drained after; under Gentle a still blue sheen, under Still no movement. The River track owns this file. Called through
// src/render/s46.js s46Ground, in art px with the art origin set, over the terrain chunks and under the buildings.
//
// How far the water has spread (waterAt, src/sim/flood.js): it rises over the season's first month, stands to its end and drains over month
// 10 (Akhet is months 7-10). The floodplain is 3 tiles wide from the river; the level says how many of them the water reaches (FLOOD_LEVELS
// spread: Low 1, Fair 2, Good and High 3), and the tiles nearest the river go under first. A tile with a building or a road on it is left
// dry (the flood does no harm: it is a rhythm, ruling 334). Full: a slow shimmer and drifting glints on the water; Gentle and Still: a
// fixed sheen, the same colour, no movement (the level still follows the days).
import { FLOOD, floodLevelRow } from '../data/river.js';
import { waterAt } from '../sim/flood.js';
import { hash2 } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { T } from '../sim/terrain.js';
import { p } from './iso.js';
import { TERRAIN } from './art/palette.js';

export const FLOOD_COLOURS = { low: '#5CBDB6', fair: '#4DB6AE', good: '#3DA5A8', high: '#2E8C96' };
export const FLOOD_ALPHA = { low: 0.62, fair: 0.66, good: 0.7, high: 0.76 };
const SHEEN_SALT = 5151;

// Each floodplain tile's distance in tiles (1-3, the square of floodplainOf) from the nearest water tile, cached on the mask.
const distCache = new WeakMap();
export function floodDistances(world) {
  const mask = world.floodplain;
  if (!mask) return null;
  let d = distCache.get(mask);
  if (d) return d;
  const n = world.size, r = FLOOD.reach;
  d = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (mask[idx(n, x, y)] !== 1) continue;
      let best = r + 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (!inBounds(n, x + dx, y + dy) || world.terrain[idx(n, x + dx, y + dy)] !== T.WATER) continue;
        best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)));
      }
      d[idx(n, x, y)] = best;
    }
  }
  distCache.set(mask, d);
  return d;
}

// How much of a floodplain tile at distance `dist` is under water with the water at `w` (0-1) and a level's spread: 0 to 1.
export const coverageOf = (dist, w, spread) => Math.max(0, Math.min(1, spread * w - (dist - 1)));

const diamond = (x, y) => [p(x, y), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1)];

export function drawFlood(g, world, range, now, motion) {
  const f = world.flood;
  if (!f || !f.risen || !world.floodplain) return;
  const level = floodLevelRow(f.level);
  const w = waterAt(world, world.day);
  if (!level || w <= 0) return;
  const dist = floodDistances(world);
  const n = world.size;
  const groups = [[], [], []];
  const streaks = [];
  for (let y = Math.max(0, range.y0); y <= Math.min(n - 1, range.y1); y++) {
    for (let x = Math.max(0, range.x0); x <= Math.min(n - 1, range.x1); x++) {
      const i = idx(n, x, y);
      if (world.floodplain[i] !== 1 || world.occ[i] || world.road[i]) continue;
      const d = dist[i];
      const c = coverageOf(d, w, level.spread);
      if (c <= 0) continue;
      groups[Math.min(2, d - 1)].push({ x, y, c });
      if (hash2(x, y, SHEEN_SALT) < 0.55) streaks.push({ x, y, c, h: hash2(x, y, SHEEN_SALT + 1) });
    }
  }
  const colour = FLOOD_COLOURS[level.id], alpha = FLOOD_ALPHA[level.id];
  const t = motion === 'full' ? now / 1000 : 0;
  for (const list of groups) {
    if (!list.length) continue;
    // Tiles of one distance share one coverage, so each group is a single fill (its alpha follows the coverage).
    const c = list[0].c;
    const shimmer = motion === 'full' ? 0.05 * Math.sin(t * 0.9 + list[0].x * 0.3) : 0;
    g.polys(list.map((q) => diamond(q.x, q.y)), colour, { alpha: Math.max(0, (alpha + shimmer) * c) });
  }
  // The sheen: a pale glint across a share of the flooded tiles. Full lets each one fade in and out slowly (a change a few seconds apart);
  // Gentle and Still hold them at a middle strength.
  const glints = [];
  for (const s of streaks) {
    const a = motion === 'full' ? 0.5 + 0.5 * Math.sin(t * 0.7 + s.h * 6.28) : 0.55;
    glints.push({ a: a * s.c, q: [p(s.x + 0.2 + s.h * 0.2, s.y + 0.35 + s.h * 0.3), p(s.x + 0.6 + s.h * 0.2, s.y + 0.35 + s.h * 0.3)] });
  }
  for (const k of glints) g.line(k.q[0], k.q[1], TERRAIN.foam, 0.8, Math.min(0.85, 0.18 + 0.5 * k.a));
  // The water's edge: the outermost covered tiles get a soft lighter rim so the flood reads as a sheet, not a tint.
  const rim = groups.flat().filter((q) => q.c < 1);
  if (rim.length) g.polys(rim.map((q) => diamond(q.x, q.y)), TERRAIN.waterLight, { alpha: 0.25 });
}
