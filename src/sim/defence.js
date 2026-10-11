// Walls and gates (spec 4.13, 6.4 Drawing mode). Stage 3 contract: Track 0 fixed the names, signatures and shapes;
// Track B implements the STUBs. Walls are a tile layer, world.wall: 0 none, > 0 a standing tile's hit points, -1 a breach
// (broken stone, a gap until wall is drawn over it again at the normal price). A gate is a wall tile on a road: citizens,
// walkers and road reach pass it (it is still road), raiders treat it as wall. world.wallVersion goes up whenever a tile
// appears, goes or breaks (the path and terrain caches key on it). The commands keep buildings and roads off wall tiles
// (a tower may stand on a standing wall tile), and demolish and undo handle wall tiles (src/sim/commands.js, undo.js).
import { DEFENCE } from '../data/raids.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], tiles: [], gates: [], cost: 0, ...extra });

// A wall tile on a road.
export const isGate = (world, i) => world.wall[i] !== 0 && Boolean(world.road[i]);

// The hit points a newly drawn tile gets: a gate's on a road, a wall's elsewhere.
export const wallHpFor = (world, i) => (world.road[i] ? DEFENCE.gateHp : DEFENCE.wallHp);

// STUB. What drawing wall from (x0, y0) to (x1, y1) would do, in the road tool's L (flip picks the other L):
// { ok, reason, warnings, tiles, gates, cost } where tiles are the map indices that get wall (new tiles and breaches
// redrawn; standing wall is skipped), gates the subset on roads, and cost = walls x costOf(world, 'wall') + gates x
// costOf(world, 'gate'). Fails with 'locked' (before Market town), 'out_of_bounds', 'water', 'blocked' (a building in the
// way), 'nothing_to_place' (all of it is wall already) or 'no_gold' (below the debt floor), keeping tiles and cost.
export function previewWall(world, x0, y0, x1, y1, flip = false) {
  return fail('locked');
}

// STUB. The drawWall command (spec 7.3): draws the preview's tiles at full hit points, charges its cost, bumps
// wallVersion, adds tally.wallTiles, takes 'wall' out of newItems, and pushes the undo entry
// { kind: 'wall', tiles, before, cost } (before: each tile's value before, so undo puts breaches back). Returns the
// preview's result.
export function drawWall(world, x0, y0, x1, y1, flip = false) {
  return previewWall(world, x0, y0, x1, y1, flip);
}
