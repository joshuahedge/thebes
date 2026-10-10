import { idx } from '../../src/sim/grid.js';
import { T } from '../../src/sim/terrain.js';
import { p } from '../../src/render/iso.js';
import { CHUNK } from '../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from './testWorld.js';
import { pixelAt } from './canvas.js';

// A 32 x 32 world with every terrain type and every Stage 1 building, for render tests.
export function riverWorld() {
  const w = makeTestWorld({ size: 32, fertile: [] });
  for (let y = 0; y < 32; y++) {
    const rx = 4 + Math.round(Math.sin(y / 5) * 1.5);
    for (let x = 0; x < 32; x++) {
      const i = idx(32, x, y);
      const d = Math.abs(x - rx);
      if (d <= 1) w.terrain[i] = T.WATER;
      else if (d <= 2) w.terrain[i] = T.BANK;
      else if (d <= 6) w.terrain[i] = T.FERTILE;
      else if (x >= 20 && x <= 25 && y >= 4 && y <= 9) w.terrain[i] = T.ROCKY;
      else if (y >= 18 && y <= 24 && x >= 12 && x <= 19) w.terrain[i] = T.MEADOW;
    }
  }
  setRoad(w, 10, 12, 28, 12);
  setRoad(w, 20, 12, 20, 26);
  for (let t = 1; t <= 4; t++) addRaw(w, 'house', 11 + t, 13, { tier: t, residents: 4 * t });
  addRaw(w, 'well', 16, 11);
  addRaw(w, 'bazaar', 22, 10, { store: { grain: 50 } });
  addRaw(w, 'temple', 24, 13);
  addRaw(w, 'farm_grain', 8, 10);
  addRaw(w, 'granary', 17, 13, { store: { grain: 100 } });
  staffAll(w);
  return w;
}

// The device pixel at the centre of tile (tx, ty) in a baked chunk sprite.
export function chunkPixel(sprite, tx, ty) {
  const o = p(sprite.cx * CHUNK, sprite.cy * CHUNK);
  const c = p(tx + 0.5, ty + 0.5);
  return pixelAt(sprite.canvas, sprite.ax + (c[0] - o[0]) * sprite.scale, sprite.ay + (c[1] - o[1]) * sprite.scale);
}
