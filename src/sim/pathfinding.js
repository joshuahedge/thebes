// Raider pathfinding (spec 4.13): one flow field per band target, rebuilt when walls, roads or buildings change, cached
// outside the world (a WeakMap, as reach.js does), so saves stay pure data. Stage 3 contract: Track B implements the
// STUB and may change tileCost's internals, never its meaning.
//
// The cache is keyed on the tile costs themselves (every tile's tileCost, compared exactly), not only on the versions:
// a wall's hit points fall on every hit without a wallVersion bump, so a field kept across a hit would differ from the
// one a city loaded mid-raid computes afresh, and the two would walk different ways. Comparing 64 x 64 numbers a call
// is far cheaper than one search, and a field is still built only when a cost changed.
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { passable } from './terrain.js';

// What crossing a tile costs a raider (spec 4.13): open ground and roads 1; water and buildings cannot be crossed
// (Infinity), but a bridge (Stage 4.5, ruling 314: a road tile on water) is crossed like any road, 1; a standing wall, gate or tower-on-wall tile 1 + its hit points / 2 (the days one raider needs to break
// it); a breach 1. A tower stands on a wall tile with the wall's hit points (DEFENCE.towerOnWallHp), so its tile is a
// wall tile here; a tower on open ground is a building.
export function tileCost(world, x, y) {
  if (!inBounds(world.size, x, y)) return Infinity;
  const i = idx(world.size, x, y);
  if (!passable(world, i)) return Infinity;   // Stage 4.7: water but a bridge, and hills (src/sim/terrain.js passable)
  if (world.wall[i] > 0) return 1 + world.wall[i] / 2;
  if (world.wall[i] < 0) return 1;
  return world.occ[i] ? Infinity : 1;
}

const cache = new WeakMap();   // world -> { costs: Float64Array, fields: Map(goal key -> field) }

function costsOf(world) {
  const n = world.size, costs = new Float64Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) costs[y * n + x] = tileCost(world, x, y);
  return costs;
}

function sameCosts(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// A binary heap of [priority, tile], smallest first; ties go to the lower tile index, so the search is deterministic.
function heapPush(h, p, t) {
  h.push([p, t]);
  let i = h.length - 1;
  while (i > 0) {
    const j = (i - 1) >> 1;
    if (h[j][0] < p || (h[j][0] === p && h[j][1] <= t)) break;
    h[i] = h[j]; i = j;
  }
  h[i] = [p, t];
}
function heapPop(h) {
  const top = h[0], last = h.pop();
  if (h.length) {
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i, mp = last;
      if (l < h.length && (h[l][0] < mp[0] || (h[l][0] === mp[0] && h[l][1] < mp[1]))) { m = l; mp = h[l]; }
      if (r < h.length && (h[r][0] < mp[0] || (h[r][0] === mp[0] && h[r][1] < mp[1]))) { m = r; mp = h[r]; }
      if (m === i) break;
      h[i] = h[m]; i = m;
    }
    h[i] = last;
  }
  return top;
}

// The search: dist[u] is the cheapest sum of entry costs from u to a goal (a goal itself 0). Every tile gets a dist, even
// one a raider cannot enter (so a band standing where it should not, as on its entry, can still step off), but only
// tiles that can be crossed carry the search on.
function buildField(world, costs, goals) {
  const n = world.size, dist = new Float64Array(n * n).fill(Infinity), heap = [];
  for (const [x, y] of goals) {
    if (!inBounds(n, x, y)) continue;
    const i = idx(n, x, y);
    if (costs[i] === Infinity || dist[i] === 0) continue;
    dist[i] = 0;
    heapPush(heap, 0, i);
  }
  while (heap.length) {
    const [d, v] = heapPop(heap);
    if (d > dist[v] || costs[v] === Infinity) continue;
    const step = d + costs[v], vx = v % n, vy = (v - vx) / n;
    for (const [dx, dy] of NEIGHBOURS4) {
      const ux = vx + dx, uy = vy + dy;
      if (!inBounds(n, ux, uy)) continue;
      const u = uy * n + ux;
      if (step < dist[u]) { dist[u] = step; if (costs[u] !== Infinity) heapPush(heap, step, u); }
    }
  }
  const next = (x, y) => {
    if (!inBounds(n, x, y)) return null;
    const here = dist[idx(n, x, y)];
    if (here === 0 || here === Infinity) return null;
    let best = null, bestCost = Infinity;
    for (const [dx, dy] of NEIGHBOURS4) {
      const vx = x + dx, vy = y + dy;
      if (!inBounds(n, vx, vy)) continue;
      const v = vy * n + vx, c = dist[v] + costs[v];
      if (c < bestCost) { bestCost = c; best = [vx, vy]; }
    }
    return best;
  };
  return { dist, next };
}

// The flow field towards the goal tiles ([[x, y], ...]): { dist, next } where dist is a Float64Array of size² (the
// cheapest cost from each tile to a goal, Infinity where none is reachable) and next(x, y) is the neighbouring tile
// [x, y] one step cheaper, or null at a goal or where none is (ties go to NEIGHBOURS4's order: east, west, south,
// north). Goals that cannot be crossed (water, a building) are left out. Shared and cached: callers must not write to it.
export function flowField(world, goals) {
  const costs = costsOf(world);
  let c = cache.get(world);
  if (!c || !sameCosts(c.costs, costs)) {
    c = { costs, fields: new Map() };
    cache.set(world, c);
  }
  const key = goals.map(([x, y]) => `${x},${y}`).join(' ');
  let f = c.fields.get(key);
  if (!f) {
    f = buildField(world, costs, goals);
    c.fields.set(key, f);
  }
  return f;
}

// How many fields the cache holds for this world now (tests).
export function flowCacheSize(world) {
  const c = cache.get(world);
  return c ? c.fields.size : 0;
}
