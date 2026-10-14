// The green band (Stage 4.7, Task 2, ruling 462): land greens along the water and fades through scrub into sand, with a soft, noisy edge.
// ONE moisture field per world drives both the terrain bake (src/render/terrainBaker.js drawGrassBand) and the decor (tufts and scrub baked
// into the ground, reeds on the banks, palms and acacias in src/render/renderer.js decorAt), so what is green and what grows there agree.
// It is how the ground is DRAWN: the sim's fertile land (where farms fit) does not move, and a map without new land (classic at Normal,
// every city saved before world version 8: mapParams.land) has no field and draws exactly as before.
//
// The field: distance to water (the river and the old lakes reach GRASS.river tiles, an oasis pool GRASS.oasis, so an oasis has its own
// small halo), pushed about by two octaves of value noise (S47_SALT.grass) so the edge wanders, then 1 at the water's edge falling to 0.
import { hasNewLand, S47_SALT, GRASS, OASES } from '../data/s47.js';
import { valueNoise, hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { inOasisPool, oasisNear } from '../sim/oases.js';

const fields = new WeakMap();   // world -> Float32Array of moisture 0..1 per tile (terrain never changes in play), or null without new land

// Distance (tiles, chamfer 1 / 1.414) from the nearest source tile, two sweeps over the grid.
function chamfer(size, source) {
  const INF = 1e9, d = new Float32Array(size * size);
  for (let i = 0; i < d.length; i++) d[i] = source[i] ? 0 : INF;
  const D = Math.SQRT2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - size] + 1);
        if (x > 0) v = Math.min(v, d[i - size - 1] + D);
        if (x < size - 1) v = Math.min(v, d[i - size + 1] + D);
      }
      d[i] = v;
    }
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      let v = d[i];
      if (x < size - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < size - 1) {
        v = Math.min(v, d[i + size] + 1);
        if (x < size - 1) v = Math.min(v, d[i + size + 1] + D);
        if (x > 0) v = Math.min(v, d[i + size - 1] + D);
      }
      d[i] = v;
    }
  }
  return d;
}

// The world's moisture field (0 dry .. 1 at the water), cached; null when the map has no new land.
export function moistureOf(world) {
  if (fields.has(world)) return fields.get(world);
  let field = null;
  if (hasNewLand(world)) {
    const n = world.size, river = new Uint8Array(n * n), pool = new Uint8Array(n * n);
    for (let i = 0; i < river.length; i++) {
      if (world.terrain[i] !== T.WATER) continue;
      if (inOasisPool(world, i % n, Math.floor(i / n))) pool[i] = 1; else river[i] = 1;
    }
    const dr = chamfer(n, river), dp = pool.some(Boolean) ? chamfer(n, pool) : null;
    const salt = (world.seed + S47_SALT.grass) | 0;
    field = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (world.terrain[i] === T.WATER) { field[i] = 1; continue; }
        const shift = (valueNoise(x, y, salt, GRASS.noiseScale) - 0.5) * GRASS.noise + (valueNoise(x, y, salt + 1, GRASS.noiseScale2) - 0.5) * GRASS.noise2 + (hash2(x, y, salt + 2) - 0.5) * GRASS.jitter;   // the last term breaks a tier's edge into ragged tiles
        let m = Math.min(1, Math.max(0, 1 - (dr[i] + shift) / GRASS.river));
        if (dp) m = Math.max(m, Math.min(1, Math.max(0, 1 - (dp[i] + shift) / GRASS.oasis)));
        field[i] = m;
      }
    }
  }
  fields.set(world, field);
  return field;
}

// The tile's moisture (0 when the map has none).
export function moistureAt(world, i) {
  const f = moistureOf(world);
  return f ? f[i] : 0;
}

// The decor's own draw for a tile: hash2 keyed by the seed with S47_SALT.grassDecor, `k` picking the draw.
export const decorDraw = (world, x, y, k = 0) => hash2(x, y + k * 4099, (world.seed + S47_SALT.grassDecor) | 0);

// The trees the field and the oases grow (Stage 4.7): palms and acacias, thicker round an oasis's pool, along the water and on its banks, thinning out
// with the moisture. Drawn only where the old rule (src/render/renderer.js decorAt) drew nothing, so every old tree stays; the draws are
// S47_SALT.grassDecor's. Worked out once a world (terrain, moisture and oases never change in play): a Uint8Array of 0 none, 1 palm, 2 acacia.
const treeCache = new WeakMap();
export const LAND_TREES = [null, 'palm', 'acacia'];
export function landTrees(world) {
  let trees = treeCache.get(world);
  if (trees) return trees;
  const n = world.size, field = moistureOf(world);
  trees = new Uint8Array(n * n);
  if (field) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x, t = world.terrain[i], m = field[i];
        if (t === T.WATER || t === T.CLAY || t === T.ROCKY || t === T.HILLS) continue;
        const o = oasisNear(world, x, y, OASES.decorNear), u = decorDraw(world, x, y);
        if (o) {
          const d = Math.hypot(x - o.x, y - o.y) - o.r;
          trees[i] = u < (d <= 1.5 ? 0.22 : d <= 2.6 ? 0.15 : 0.07) ? 1 : d > 2.6 && u < 0.11 ? 2 : 0;
        } else if (m >= GRASS.decorFrom) {
          trees[i] = t === T.BANK ? (u < 0.1 ? 1 : 0) : m >= 0.5 ? (u < 0.035 ? 1 : u < 0.05 ? 2 : 0) : u < 0.03 ? 2 : 0;
        }
      }
    }
  }
  treeCache.set(world, trees);
  return trees;
}
