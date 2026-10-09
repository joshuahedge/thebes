import { createRng, valueNoise } from './rng.js';
import { idx } from './grid.js';
import { T } from './terrain.js';
import { MAP } from '../data/map.js';

// A river meanders down the west side; fertile land lines both banks of the river;
// rocky patches sit in the east; a trade road enters from the south edge.
export function generateMap(seed, size = MAP.size) {
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
  return { size, terrain, tradeEntry, startRoad, focus, raiderEntries };
}
