import { createRng, valueNoise } from './rng.js';
import { idx } from './grid.js';
import { T } from './terrain.js';

// A river meanders down the west side; fertile land lines its east bank;
// rocky patches sit in the east; a trade road enters from the south edge.
export function generateMap(seed, size = 64) {
  const rng = createRng(seed);
  const terrain = new Array(size * size).fill(T.DESERT);
  const phase = rng.range(0, Math.PI * 2);
  const riverX = (y) => 7 + 2.5 * Math.sin(y / 9 + phase) + 1.5 * Math.sin(y / 4.3 + phase * 2);

  for (let y = 0; y < size; y++) {
    const cx = riverX(y);
    for (let x = 0; x < size; x++) {
      const dist = Math.abs(x - cx);
      let t = T.DESERT;
      if (dist <= 1.6) t = T.WATER;
      else if (dist <= 2.6) t = T.BANK;
      else if (dist <= 7 + valueNoise(x, y, seed, 6) * 5) t = T.FERTILE;
      else if (valueNoise(x, y, seed + 17, 9) > 0.72) t = T.MEADOW;
      terrain[idx(size, x, y)] = t;
    }
  }

  const patches = 2 + rng.int(2);
  for (let p = 0; p < patches; p++) {
    const px = 34 + rng.int(size - 40), py = 6 + rng.int(size - 12), r = 3 + rng.int(2);
    for (let y = py - r - 1; y <= py + r + 1; y++) {
      for (let x = px - r - 1; x <= px + r + 1; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, 3) * 4) terrain[idx(size, x, y)] = T.ROCKY;
      }
    }
  }

  const ex = Math.round(riverX(size - 1)) + 14;
  const tradeEntry = { x: ex, y: size - 1 };
  const startRoad = [];
  for (let y = size - 1; y >= size - 9; y--) {
    startRoad.push([ex, y]);
    const i = idx(size, ex, y);
    if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) terrain[i] = T.DESERT;
  }
  const focus = { x: ex - 4, y: size - 12 };
  const raiderEntries = [{ x: size - 1, y: Math.floor(size / 2) }, { x: Math.floor(size / 2), y: 0 }];
  return { size, terrain, tradeEntry, startRoad, focus, raiderEntries };
}
