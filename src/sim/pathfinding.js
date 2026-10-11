// Raider pathfinding (spec 4.13): one flow field per band target, rebuilt when walls, roads or buildings change, cached
// outside the world (a WeakMap, as reach.js does), so saves stay pure data. Stage 3 contract: Track B implements the
// STUB and may change tileCost's internals, never its meaning.
import { idx, inBounds } from './grid.js';
import { T } from './terrain.js';

// What crossing a tile costs a raider (spec 4.13): open ground and roads 1; water and buildings cannot be crossed
// (Infinity); a standing wall, gate or tower-on-wall tile 1 + its hit points / 2 (the days one raider needs to break
// it); a breach 1. A tower stands on a wall tile with the wall's hit points (DEFENCE.towerOnWallHp), so its tile is a
// wall tile here; a tower on open ground is a building.
export function tileCost(world, x, y) {
  if (!inBounds(world.size, x, y)) return Infinity;
  const i = idx(world.size, x, y);
  if (world.terrain[i] === T.WATER) return Infinity;
  if (world.wall[i] > 0) return 1 + world.wall[i] / 2;
  if (world.wall[i] < 0) return 1;
  return world.occ[i] ? Infinity : 1;
}

// STUB. The flow field towards the goal tiles ([[x, y], ...]): { dist, next } where dist is a Float64Array of size²
// (the cheapest cost from each tile to a goal, Infinity where none is reachable) and next(x, y) is the neighbouring
// tile [x, y] one step cheaper, or null at a goal or where none is. Shared and cached: callers must not write to it.
export function flowField(world, goals) {
  return null;
}
