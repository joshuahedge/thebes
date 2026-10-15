// The green band (Stage 4.7, Task 2, ruling 462): land greens along the water and fades through scrub into sand, with a soft, noisy edge.
// ONE moisture field per world drives both the terrain bake (src/render/terrainBaker.js drawGrassBand) and the decor (tufts and scrub baked
// into the ground, reeds on the banks, palms and acacias in src/render/renderer.js decorAt), so what is green and what grows there agree.
// It is how the ground is DRAWN: the sim's fertile land (where farms fit) does not move, and a map without new land (classic at Normal,
// every city saved before world version 8: mapParams.land) has no field and draws exactly as before.
//
// The field (Task 3b: src/sim/moisture.js, shared with the generator): distance to water (the river and the old lakes reach GRASS.river tiles, an oasis pool
// GRASS.oasis, so an oasis has its own small halo), pushed about by two octaves of value noise so the edge wanders, then 1 at the water's edge falling to 0.
// MEADOW only lies where the field is GRASS.meadowFrom or more, so the green hugs the water.
import { hasNewLand, S47_SALT, GRASS, OASES } from '../data/s47.js';
import { hash2 } from '../sim/rng.js';
import { moistureField } from '../sim/moisture.js';
import { T } from '../sim/terrain.js';
import { oasisNear } from '../sim/oases.js';

const fields = new WeakMap();   // world -> Float32Array of moisture 0..1 per tile (terrain never changes in play), or null without new land

// The world's moisture field (0 dry .. 1 at the water), cached; null when the map has no new land. The field itself is the sim's
// (src/sim/moisture.js: the generator lays meadow from the same numbers).
export function moistureOf(world) {
  if (fields.has(world)) return fields.get(world);
  const field = hasNewLand(world) ? moistureField(world.terrain, world.size, world.seed, world.oases || []) : null;
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
