// What is under a screen point (spec 5.3): the tile, or a building whose footprint or drawn height covers
// the point; taps between buildings, and every tap at minimum zoom, go to the nearest building centre.
import { screenToTile, MIN_ZOOM } from '../render/camera.js';
import { buildingAt, allBuildings } from '../sim/world.js';
import { inBounds } from '../sim/grid.js';
import { ART, slotFor } from '../render/art/registry.js';

export function tileAt(cam, view, size, sx, sy) {
  const t = screenToTile(cam, view, sx, sy);
  const x = Math.floor(t.x), y = Math.floor(t.y);
  return inBounds(size, x, y) ? { x, y } : null;
}

const heightOf = (b) => { const def = ART[slotFor(b)]; return def ? def.height : 0; };

export function pickBuilding(world, cam, view, sx, sy, { radius = 1.5 } = {}) {
  const t = screenToTile(cam, view, sx, sy);
  const tx = Math.floor(t.x), ty = Math.floor(t.y);
  const at = (x, y) => (inBounds(world.size, x, y) ? buildingAt(world, x, y) : null);
  const direct = at(tx, ty);
  if (direct) return direct;
  // A sprite rises along the -(x + y) diagonal by its height: one footprint step (1, 1) is 16 art px.
  for (let k = 1; k <= 2; k++) {
    const b = at(tx + k, ty + k);
    if (b && heightOf(b) >= 16 * k - 8) return b;
  }
  let best = null;
  let bestDist = cam.zoom <= MIN_ZOOM + 1e-9 ? Infinity : radius;
  for (const b of allBuildings(world)) {
    const d = Math.hypot(b.x + b.w / 2 - t.x, b.y + b.d / 2 - t.y);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best;
}
