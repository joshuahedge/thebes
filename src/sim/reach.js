import { BUILDINGS } from '../data/buildings.js';
import { ring, idx, inBounds, NEIGHBOURS4 } from './grid.js';

const cache = new WeakMap(); // world -> { version, map }; kept outside the world so saves stay pure data

export function adjacentRoadTiles(world, b) {
  const out = [];
  for (const [x, y] of ring(b.x, b.y, b.w, b.d)) {
    if (!inBounds(world.size, x, y)) continue;
    const i = idx(world.size, x, y);
    if (world.road[i]) out.push(i);
  }
  return out;
}

export const touchesRoad = (world, b) => adjacentRoadTiles(world, b).length > 0;

// A building that needs a road and has none beside it (rulings P10, P11): it does nothing (no staff and no road to
// serve along, so no work or service, and no desirability), pays no upkeep or wages and counts for no "Build a" goal,
// first, achievement or daily goal until a road touches it. Plots, gardens and statues need no road.
export const lacksRoad = (world, b) => Boolean(BUILDINGS[b.type].needsRoad) && !touchesRoad(world, b);

// The returned Map is cached and shared, so callers must treat it as read-only. A caller asking about a footprint
// that is not a building (a ghost being previewed) passes { cache: false }: hovering would otherwise add an entry
// for every tile the ghost visits, kept until the roads next change.
export function roadReach(world, b, maxDist, { cache: keep = true } = {}) {
  if (maxDist < 1) return new Map();
  if (!keep) return walkRoads(world, b, maxDist);
  let c = cache.get(world);
  if (!c || c.version !== world.roadVersion) {
    c = { version: world.roadVersion, map: new Map() };
    cache.set(world, c);
  }
  const key = `${b.x},${b.y},${b.w},${b.d},${maxDist}`;
  if (c.map.has(key)) return c.map.get(key);
  const dist = walkRoads(world, b, maxDist);
  c.map.set(key, dist);
  return dist;
}

// How many footprints the reach cache holds for this world now (tests).
export function reachCacheSize(world) {
  const c = cache.get(world);
  return c && c.version === world.roadVersion ? c.map.size : 0;
}

// Road tile -> road distance from the footprint, breadth first along the roads, up to maxDist.
function walkRoads(world, b, maxDist) {
  const dist = new Map();
  const queue = [];
  for (const t of adjacentRoadTiles(world, b)) {
    if (!dist.has(t)) { dist.set(t, 1); queue.push(t); }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    const d = dist.get(t);
    if (d >= maxDist) continue;
    const x = t % world.size, y = (t - x) / world.size;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const nt = idx(world.size, nx, ny);
      if (world.road[nt] && !dist.has(nt)) { dist.set(nt, d + 1); queue.push(nt); }
    }
  }
  return dist;
}

export function reachDistance(reachMap, world, target) {
  let best = Infinity;
  for (const t of adjacentRoadTiles(world, target)) {
    const d = reachMap.get(t);
    if (d !== undefined && d < best) best = d;
  }
  return best;
}

export function buildingsInReach(world, b, maxDist, filter) {
  const rm = roadReach(world, b, maxDist);
  const out = [];
  for (const o of Object.values(world.buildings)) {
    if (o.id === b.id) continue;
    if (filter && !filter(o)) continue;
    const d = reachDistance(rm, world, o);
    if (d <= maxDist) out.push({ b: o, dist: d });
  }
  out.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return out;
}
