// Version 7.0 (Track 0): what the v70 dev scenes share. A scene is async (api, options) => a short description starting with its name and
// ': ', run through window.__thebes.devScene(name, options) (src/dev/scenes.js); api is boot's ({ phase, game, startGame, freshWorld, ... }).
// Version 6.0's helpers (sampleCity, look, wait) are reused as they are. Track 0 owns this file: a track that needs another helper writes it
// in its own scene file.
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { sampleCity, look, wait } from '../v60/base.js';

export { sampleCity, look, wait };

// The water tile nearest a point (the river by the city), or null on a map without water.
export function waterNear(world, x, y) {
  let best = null, bestD = Infinity;
  for (let ty = 0; ty < world.size; ty++) {
    for (let tx = 0; tx < world.size; tx++) {
      if (world.terrain[idx(world.size, tx, ty)] !== T.WATER) continue;
      const d = Math.hypot(tx - x, ty - y);
      if (d < bestD) { bestD = d; best = { x: tx, y: ty }; }
    }
  }
  return best;
}
