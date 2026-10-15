// The moisture field (Stage 4.7, Task 3b): how wet each tile of a map with new land is, 1 at the water's edge falling to 0, from the distance to water
// (the river, the lakes and channels reach GRASS.river tiles, an oasis pool GRASS.oasis, so an oasis has its own smaller halo) pushed about by two octaves
// of value noise (S47_SALT.grass) and a per-tile jitter so the edge wanders.
//
// ONE field drives both the sim and the picture: the generator (src/sim/mapgen.js) lays MEADOW only where the field is high (GRASS.meadowFrom), and
// the renderer (src/render/grass.js) draws the green band, its tufts and its trees from the same numbers, so what is drawn green is where the sim
// put meadow. It reads only the water (and which water is an oasis pool), never rock, hills or meadow, so it is the same on the map as generateMap is
// still shaping it and on the finished one. Pure: no draws but hash2 / valueNoise keyed by the seed.
import { valueNoise, hash2 } from './rng.js';
import { T } from './terrain.js';
import { S47_SALT, GRASS } from '../data/s47.js';

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

// The moisture of every tile (0 dry .. 1 at the water) for a terrain array, a seed and the oases ([{ x, y, r }]: a water tile within an oasis's radius of
// its centre is its pool, the same test as sim/oases.js inOasisPool). A Float32Array.
export function moistureField(terrain, size, seed, oases = []) {
  const river = new Uint8Array(size * size), pool = new Uint8Array(size * size);
  for (let i = 0; i < river.length; i++) {
    if (terrain[i] !== T.WATER) continue;
    const x = i % size, y = (i - x) / size;
    if (oases.some((o) => Math.hypot(x - o.x, y - o.y) <= o.r)) pool[i] = 1; else river[i] = 1;
  }
  const dr = chamfer(size, river), dp = pool.some(Boolean) ? chamfer(size, pool) : null;
  const salt = (seed + S47_SALT.grass) | 0;
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (terrain[i] === T.WATER) { field[i] = 1; continue; }
      const shift = (valueNoise(x, y, salt, GRASS.noiseScale) - 0.5) * GRASS.noise + (valueNoise(x, y, salt + 1, GRASS.noiseScale2) - 0.5) * GRASS.noise2 + (hash2(x, y, salt + 2) - 0.5) * GRASS.jitter;   // the last term breaks a tier's edge into ragged tiles
      let m = Math.min(1, Math.max(0, 1 - (dr[i] + shift) / GRASS.river));
      if (dp) m = Math.max(m, Math.min(1, Math.max(0, 1 - (dp[i] + shift) / GRASS.oasis)));
      field[i] = m;
    }
  }
  return field;
}
