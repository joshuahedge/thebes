// Version 7.0, Track S (rulings 930-959): the season on the land, a render-side colour grade and the fields', palms' and river's states from
// src/sim/seasons.js seasonAt (looks only, ruling 851). Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left it
// empty; Track S owns this file (src/render/v70.js calls it from createUI's frame).
//   drawSeasonGround(g, world, range, now, motion)   in art px with the art origin set, over the terrain chunks and under the ground shadows
//                                                    and the ambient life: a wash of the season's colour over the land, the river's state
//                                                    (silted and high in the flood, clear in the growing, low and green at the harvest) and a
//                                                    mark at each palm's foot. Over a season's last month the land turns to the next (the
//                                                    blend); Still shows the season's look with no blend, switching at the month's end.
// The farms' own states are slots (src/render/art/seasons.js); the palms' marks are drawn here because a palm is decor, not a building.
import { SEASON_LOOK, SEASON_MARKS, SEASON_SALT } from '../data/seasons.js';
import { seasonAt } from '../sim/seasons.js';
import { hash2 } from '../sim/rng.js';
import { p } from './iso.js';
import { riverBanks, smoothPath, blobWater } from './terrainWater.js';
import { blobFor } from './terrainBaker.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { decorAt } from './renderer.js';

// The looks to lay down, as [season id, weight]: the season, and over its last month the next one as the blend rises (Still: the season only).
export function seasonLooks(world, motion) {
  const s = seasonAt(world);
  if (s.blend > 0 && motion !== 'still') return [[s.season, 1 - s.blend], [s.next, s.blend]];
  return [[s.season, 1]];
}

// The season a still image shows: the one whose weight is the larger (a palm's mark does not fade, it switches half way through the turn).
const leadOf = (looks) => (looks.length > 1 && looks[1][1] > 0.5 ? looks[1][0] : looks[0][0]);

const ring = (cx, cy, rx, ry, n = 8) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 2 * Math.PI), cy + ry * Math.sin((i / n) * 2 * Math.PI)]);

// A palm's mark at its foot: where the palm stands wet (the flood), in flower (the growing) or has dropped dates (the harvest). Drawn as flat
// shapes batched by colour, so a view of a few hundred palms is a few fills.
function palmMarks(g, world, range, season) {
  if (g.cssScale < SEASON_MARKS.minCss * 2) return;                   // too small to see (zoomed far out): the wash alone says the season
  const look = SEASON_LOOK[season].palms, seed = (world.seed + SEASON_SALT.marks) | 0, n = world.size;
  const by = new Map();
  const add = (colour, poly, alpha) => { const k = `${colour}|${alpha}`; (by.get(k) || by.set(k, { colour, alpha, list: [] }).get(k)).list.push(poly); };
  for (let y = Math.max(0, range.y0); y <= Math.min(n - 1, range.y1); y++) {
    let x0 = Math.max(0, range.x0), x1 = Math.min(n - 1, range.x1);
    if (g.cull) { const [a, b] = g.cull.row(y, 40); if (a > x0) x0 = a; if (b < x1) x1 = b; }
    for (let x = x0; x <= x1; x++) {
      if (decorAt(world, x, y) !== 'palm') continue;
      const c = p(x + 0.5, y + 0.5);
      if (look === 'puddle') {
        add('#6FC1CC', ring(c[0] + 1, c[1] + 0.8, 7, 2.6), 0.42);
        add('#DDF4F1', ring(c[0] - 2, c[1] + 0.4, 2.2, 0.7, 6), 0.55);
      } else if (look === 'bloom') {
        for (let k = 0; k < 4; k++) {
          const a = hash2(x, y, seed + k) * 2 * Math.PI, r = 4 + 4 * hash2(x, y, seed + 10 + k);
          add(['#FFFFFF', '#F6D46A', '#E58AA0', '#FFFFFF'][k], ring(c[0] + Math.cos(a) * r, c[1] + 1 + Math.sin(a) * r * 0.5, 1.1, 0.75, 6), 0.95);
        }
      } else if (look === 'dates') {
        for (let k = 0; k < 4; k++) {
          const a = hash2(x, y, seed + k) * 2 * Math.PI, r = 3 + 4 * hash2(x, y, seed + 10 + k);
          add(k % 2 ? '#C9722F' : '#7A3E1C', ring(c[0] + Math.cos(a) * r, c[1] + 1 + Math.sin(a) * r * 0.5, 1.2, 0.8, 6), 0.95);
        }
        add('#D8B04A', ring(c[0] + 5, c[1] + 1.4, 5.5, 1.4, 8), 0.4);   // a golden fallen frond
      }
    }
  }
  for (const { colour, alpha, list } of by.values()) g.polys(list, colour, { alpha });
}

// The river's state: a wash over the water, in the river's own banks (src/render/terrainWater.js), so it follows its curve and never spills.
function riverWash(g, world, range, looks) {
  const { left, right } = riverBanks(world, range.y0 - 2, range.y1 + 2);
  if (left.length < 2) return;
  const l = smoothPath(left), r = smoothPath([...right].reverse());
  if (!l.length || !r.length) return;
  r[0][0] = 'L';
  const shape = [...l, ...r, ['Z']];
  for (const [id, w] of looks) { const [colour, alpha] = SEASON_LOOK[id].water; if (alpha * w > 0.004) g.path(shape, colour, { alpha: alpha * w }); }
}

// Version 7.1.1 (ruling 1024 mended): a 7.1 layout's water has no banks to follow (it is drawn as tile blobs, terrainWater.js riverPools), so the same wash is laid
// over each water tile's blob, the shape the baked water pass uses, all of a look as one path (no seams, no doubled alpha). The blobs are kept per world.
const blobCache = new WeakMap();   // world -> Map(tile index -> polygon); the terrain never changes after the map is made
function blobWash(g, world, range, looks) {
  let blobs = blobCache.get(world);
  if (!blobs) blobCache.set(world, blobs = new Map());
  const n = world.size, list = [];
  for (let y = Math.max(0, range.y0 - 1); y <= Math.min(n - 1, range.y1 + 1); y++) {
    let x0 = Math.max(0, range.x0 - 1), x1 = Math.min(n - 1, range.x1 + 1);
    if (g.cull) { const [a, b] = g.cull.row(y, 24); if (a > x0) x0 = a; if (b < x1) x1 = b; }
    for (let x = x0; x <= x1; x++) {
      const i = idx(n, x, y);
      if (world.terrain[i] !== T.WATER) continue;
      let pts = blobs.get(i);
      if (!pts) blobs.set(i, pts = blobFor(world, x, y, T.WATER, 3, -0.1));
      list.push(pts);
    }
  }
  if (!list.length) return;
  for (const [id, w] of looks) { const [colour, alpha] = SEASON_LOOK[id].water; if (alpha * w > 0.004) g.polys(list, colour, { alpha: alpha * w }); }
}

export function drawSeasonGround(g, world, range, now, motion) {
  const looks = seasonLooks(world, motion), n = world.size;
  const x0 = Math.max(0, range.x0), y0 = Math.max(0, range.y0), x1 = Math.min(n, range.x1 + 1), y1 = Math.min(n, range.y1 + 1);
  if (x1 <= x0 || y1 <= y0) return;
  const land = [p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)];
  for (const [id, w] of looks) { const [colour, alpha] = SEASON_LOOK[id].wash; if (alpha * w > 0.004) g.poly(land, colour, { alpha: alpha * w }); }
  if (blobWater(world)) blobWash(g, world, range, looks); else riverWash(g, world, range, looks);
  palmMarks(g, world, range, leadOf(looks));
}
