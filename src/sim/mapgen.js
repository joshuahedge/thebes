import { createRng, valueNoise, hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T } from './terrain.js';
import { MAP, MAP_VARIANTS } from '../data/map.js';

// Clay (Stage 4.5, ruling 312): the bank tiles are chained along the water, so a stretch is a walk of 4-10 of them from a
// seeded start, 8-neighbour steps in a fixed order; some stretches are two tiles deep, taking the dry land tile beside each
// bank tile (desert, meadow or fertile, never rock or a bank) as well. Stretches go on until the map holds its target
// (MAP.clay), counted in tiles turned to clay. free(i) says a tile may change: always on a new map, and, when an old
// map is migrated, only a tile with no building, road or wall on it. Returns the number of tiles turned. Deterministic
// in (terrain, size, seed); the draws have their own salt, so they never move the generator's.
export function addClay(terrain, size, seed, free = () => true) {
  const C = MAP.clay;
  const rng = createRng((seed ^ C.salt) >>> 0);
  const banks = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.BANK && free(i)) banks.push(i);
  if (!banks.length) return 0;
  const target = C.targetMin + rng.int(C.targetExtra + 1);
  const dry = (t) => t === T.DESERT || t === T.MEADOW || t === T.FERTILE;
  let turned = 0;
  for (let tries = 0; tries < C.maxTries && turned < target; tries++) {
    const start = banks[rng.int(banks.length)];
    if (terrain[start] !== T.BANK) continue;
    const want = C.stretchMin + rng.int(C.stretchExtra), deep = rng.chance(C.deepChance);
    const stretch = [start], seen = new Set([start]);
    for (let k = 0; k < stretch.length && stretch.length < want; k++) {
      const x = stretch[k] % size, y = (stretch[k] - x) / size;
      for (let dy = -1; dy <= 1 && stretch.length < want; dy++) for (let dx = -1; dx <= 1 && stretch.length < want; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!inBounds(size, nx, ny)) continue;
        const n = idx(size, nx, ny);
        if (!seen.has(n) && terrain[n] === T.BANK && free(n)) { seen.add(n); stretch.push(n); }
      }
    }
    for (const b of stretch) {
      terrain[b] = T.CLAY; turned++;
      if (!deep) continue;
      const x = b % size, y = (b - x) / size;
      for (const [dx, dy] of NEIGHBOURS4) {
        if (!inBounds(size, x + dx, y + dy)) continue;
        const n = idx(size, x + dx, y + dy);
        if (dry(terrain[n]) && free(n)) { terrain[n] = T.CLAY; turned++; }
      }
    }
  }
  return turned;
}

// The variant a seed picks when a city is started with 'auto' (ruling 313): one draw, hash2 keyed by the seed with a salt.
export const variantFor = (seed) => MAP_VARIANTS[Math.floor(hash2(seed, 0, MAP.variantSalt) * MAP_VARIANTS.length)];

// A river meanders down the west side; fertile land lines both banks of the river;
// rocky patches sit in the east; a trade road enters from the south edge.
export function generateMap(seed, size = MAP.size, variant = 'classic') {
  const rng = createRng(seed);
  const terrain = new Array(size * size).fill(T.DESERT);
  const phase = rng.range(0, Math.PI * 2);
  const riverX = (y) => MAP.riverBaseX
    + MAP.riverWave1.amp * Math.sin(y / MAP.riverWave1.period + phase)
    + MAP.riverWave2.amp * Math.sin(y / MAP.riverWave2.period + phase * 2);

  for (let y = 0; y < size; y++) {
    const cx = riverX(y);
    for (let x = 0; x < size; x++) {
      const dist = Math.abs(x - cx);
      let t = T.DESERT;
      if (dist <= MAP.waterHalfWidth) t = T.WATER;
      else if (dist <= MAP.bankHalfWidth) t = T.BANK;
      else if (dist <= MAP.fertileBase + valueNoise(x, y, seed, MAP.fertileNoiseScale) * MAP.fertileNoise) t = T.FERTILE;
      else if (valueNoise(x, y, seed + 17, MAP.meadowNoiseScale) > MAP.meadowThreshold) t = T.MEADOW;
      terrain[idx(size, x, y)] = t;
    }
  }

  const rp = MAP.rockPatches;
  const patches = rp.min + rng.int(rp.extra);
  for (let p = 0; p < patches; p++) {
    const px = rp.minX + rng.int(size - rp.marginX), py = rp.minY + rng.int(size - rp.marginY), r = rp.radiusMin + rng.int(rp.radiusExtra);
    for (let y = py - r - 1; y <= py + r + 1; y++) {
      for (let x = px - r - 1; x <= px + r + 1; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, rp.edgeNoiseScale) * rp.edgeNoise) terrain[idx(size, x, y)] = T.ROCKY;
      }
    }
  }

  addClay(terrain, size, seed);

  const ex = Math.round(riverX(size - 1)) + MAP.tradeRoadOffsetX;
  const tradeEntry = { x: ex, y: size - 1 };
  const startRoad = [];
  for (let y = size - 1; y >= size - MAP.startRoadLength; y--) {
    startRoad.push([ex, y]);
    const i = idx(size, ex, y);
    if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) terrain[i] = T.DESERT;
  }
  const focus = { x: ex + MAP.focusOffset.x, y: size + MAP.focusOffset.y };
  const raiderEntries = [{ x: size - 1, y: Math.floor(size / 2) }, { x: Math.floor(size / 2), y: 0 }];
  return { size, terrain, tradeEntry, startRoad, focus, raiderEntries, variant: 'classic' };
}
