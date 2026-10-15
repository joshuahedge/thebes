// Version 5.0 (Task 5, rulings 560-569): roads that find their way. routeRoad(world, x0, y0, x1, y1) is the cheapest road from one tile to another over open
// land: round buildings and hills, over existing road for nothing, through a wall as a gate and over water by a bridge wherever the bridge rule allows it
// (a straight run of at most BRIDGE_MAX tiles of water with free land at both ends: src/sim/bridges.js runReason, the rule the road tool's preview judges
// with). It answers with the tiles in order and with previewRoadTiles' own answer for them (cost, bridges, gates, the treasury's verdict), so what the
// bar shows is what drawRoute charges: the search only decides WHICH tiles; the sim's one road preview prices and judges them.
//
// The search is A* over (tile, last direction) states (the pathfinding.js heap, ties to the lower state, so a route is a function of the ground, the roads,
// the buildings and the two ends alone: no draws, no clocks), 4 directions as a road goes. A step costs, in order of weight: the gold the tile would be
// charged (road, gate or bridge, the same prices the preview uses), then 2 for a new tile and 1 for a road already there (so existing road is preferred
// even where it costs the same), then 1 for a turn (so a road runs straight where it can). A bridge is one move over 1-BRIDGE_MAX water tiles in a line.
// The search looks at no more than ROUTE.expand states (a huge map, or an end no road can reach, cannot freeze a frame): past that it says 'too_far'.
//
// A refusal says why and where: 'too_wide' (water the bridge rule cannot cross; water: its widest run on the cheapest way across), 'boxed_in' (buildings
// close it off; at: the first one), 'hemmed_in' (hills), 'no_way' (a bit of each), 'too_far', and for an end that cannot take a road its own reason ('water', 'hills',
// 'blocked', 'out_of_bounds'). Each failed search is followed by up to four cheap relaxed ones (a wider bridge, buildings passable, hills passable, all
// three) to name the obstacle; `at` is the first tile of the obstacle on that way, for Show me.
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T, buildable } from './terrain.js';
import { BRIDGE_MAX, bridgeRuns, runReason } from './bridges.js';
import { costOf, roadCostOf } from './costs.js';
import { previewRoadTiles, drawRoadTiles } from './commands.js';
import { buildingsVersion } from './world.js';
import { heapPush, heapPop } from './pathfinding.js';

export const ROUTE = {
  expand: 60000,    // the most states one search looks at before giving up ('too_far')
  gold: 100000,     // one gold in search units, so the tie-breakers (below) never outweigh it on any path a map can hold
  newTile: 2,       // a tile that gets road, a gate or a bridge
  oldTile: 1,       // a tile with road already
  turn: 1,          // a bend
  obstacle: 1000,   // what a relaxed search charges for passing an obstacle (so it passes the fewest)
};

const NONE = 4;   // "no direction yet" at the start

// Does tile (x, y) take a road, as the road tool judges a tile: on the map, nothing built on it, open land, or water that already carries a bridge.
// relax: { occ: ignore buildings, hills: hills are open }.
function open(world, x, y, relax) {
  if (!inBounds(world.size, x, y)) return false;
  const i = idx(world.size, x, y);
  if (!relax.occ && world.occ[i]) return false;
  const t = world.terrain[i];
  if (t === T.WATER) return Boolean(world.road[i]);
  return buildable(world, i) || (relax.hills && t === T.HILLS);
}

// The search's gold for entering a tile with a road: what previewRoadTiles would charge it.
function goldOf(world, i, prices) {
  const wall = world.wall[i];
  if (wall < 0) return prices.gate;
  if (world.road[i]) return 0;
  return wall > 0 ? prices.gate : prices.road;
}

// The cheapest way from tile a to tile b (indices). relax: { occ, hills, wide } as above, `wide` letting a bridge span any run of water. A normal search
// (relax {}) prices by gold; a relaxed one counts obstacles (every tile it passes through that the normal rule would refuse costs ROUTE.obstacle) and steps.
// Returns { path: [[x, y], ...] (a first, b last) | null, looked, capped }.
function search(world, a, b, relax) {
  const n = world.size, size = n * n, relaxed = Boolean(relax.occ || relax.hills || relax.wide);
  const prices = { road: roadCostOf(world), gate: costOf(world, 'gate'), bridge: costOf(world, 'bridge') };
  const bx = b % n, by = (b - bx) / n;
  const g = new Float64Array(size * 5).fill(Infinity), from = new Int32Array(size * 5).fill(-1), span = new Uint8Array(size * 5), done = new Uint8Array(size * 5);
  const heap = [];
  const h = (t) => Math.abs((t % n) - bx) + Math.abs(Math.floor(t / n) - by);
  // What entering tile t costs: gold for the normal search, obstacle counts for a relaxed one; plus the tie-breakers.
  const enter = (t) => {
    const base = world.road[t] ? ROUTE.oldTile : ROUTE.newTile;
    if (!relaxed) return goldOf(world, t, prices) * ROUTE.gold + base;
    const ter = world.terrain[t];
    const bad = (world.occ[t] && relax.occ) || (ter === T.HILLS && relax.hills);
    return base + (bad ? ROUTE.obstacle : 0);
  };
  const start = a * 5 + NONE;
  g[start] = 0;
  heapPush(heap, h(a), start);
  let looked = 0;
  while (heap.length) {
    if (looked >= ROUTE.expand) return { path: null, looked, capped: true };
    const s = heapPop(heap)[1];
    if (done[s]) continue;
    done[s] = 1;
    looked++;
    const cur = Math.floor(s / 5), dir = s % 5, x = cur % n, y = (cur - x) / n;
    if (cur === b) {
      const tiles = [];
      for (let k = s; k !== -1; k = from[k]) {
        const t = Math.floor(k / 5);
        tiles.push(t);
        const w = span[k];
        if (w) {                                                          // the water tiles a bridge move passed over, last first
          const p = Math.floor(from[k] / 5), px = p % n, py = (p - px) / n, dx = Math.sign((t % n) - px), dy = Math.sign(Math.floor(t / n) - py);
          for (let j = w; j >= 1; j--) tiles.push(idx(n, px + dx * j, py + dy * j));
        }
      }
      return { path: tiles.reverse().map((t) => [t % n, Math.floor(t / n)]), looked, capped: false };
    }
    const relaxStep = (nd, to, cost, w) => {
      const ns = to * 5 + nd;
      if (done[ns]) return;
      const total = g[s] + cost + (dir !== NONE && dir !== nd ? ROUTE.turn : 0);
      if (total < g[ns]) { g[ns] = total; from[ns] = s; span[ns] = w; heapPush(heap, total + h(to), ns); }
    };
    for (let nd = 0; nd < 4; nd++) {
      const [dx, dy] = NEIGHBOURS4[nd], nx = x + dx, ny = y + dy;
      if (!inBounds(n, nx, ny)) continue;
      const t = ny * n + nx;
      if (open(world, nx, ny, relax)) { relaxStep(nd, t, enter(t), 0); continue; }
      if (world.terrain[cur] === T.WATER || world.terrain[t] !== T.WATER || world.occ[t]) continue;
      // Open water ahead of a dry tile: a bridge over 1 to BRIDGE_MAX tiles (any number when relaxed), straight, to free land.
      const limit = relax.wide ? n : BRIDGE_MAX;
      let cost = 0, w = 0;
      for (let k = 1; k <= limit; k++) {
        const wx = x + dx * k, wy = y + dy * k;
        if (!inBounds(n, wx, wy)) break;
        const wt = wy * n + wx;
        if (world.terrain[wt] !== T.WATER || world.occ[wt]) break;
        w = k;
        cost += relaxed ? (world.road[wt] ? ROUTE.oldTile : ROUTE.obstacle) : (world.road[wt] ? 0 : prices.bridge * ROUTE.gold) + (world.road[wt] ? ROUTE.oldTile : ROUTE.newTile);
        const lx = wx + dx, ly = wy + dy;
        if (!inBounds(n, lx, ly) || world.terrain[ly * n + lx] === T.WATER) continue;
        if (!open(world, lx, ly, relax) || (!relax.wide && runReason({ n: w, straight: true, bounded: true }))) break;   // landing on open land is all a bridge asks; its length is the rule's
        relaxStep(nd, ly * n + lx, cost + enter(ly * n + lx), w);
        break;
      }
    }
  }
  return { path: null, looked, capped: false };
}

// Memo of one world's searches (the tile path or null, per pair of ends), valid while the roads, the buildings, the walls and the ground are as they were:
// a preview asks again at every redraw, and the answer is a function of those alone (the treasury is judged afterwards, not here).
const memo = new WeakMap();   // world -> { sig, map: Map(a * size^2 + b -> { path, reason, at, water, looked }) }
export const ROUTE_MEMO_MAX = 200;
const signature = (world) => `${world.roadVersion}|${buildingsVersion(world)}|${world.wallVersion}`;

const refusalOf = (reason, extra = {}) => ({ ok: false, reason, path: [], tiles: [], gates: [], bridges: [], bridgeCost: 0, cost: 0, at: null, water: 0, used: 0, crossings: 0, looked: 0, ...extra });

// Why one end cannot take a road, else null.
function endReason(world, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBounds(world.size, x, y)) return 'out_of_bounds';
  const i = idx(world.size, x, y), t = world.terrain[i];
  if (t === T.WATER && !world.road[i]) return 'water';
  if (t === T.HILLS) return 'hills';
  return world.occ[i] ? 'blocked' : null;
}

// The widest run of water tiles on a path, and the first tile of it.
function widestRun(world, path) {
  let best = { n: 0, at: null }, run = 0, first = null;
  for (const [x, y] of path) {
    if (world.terrain[idx(world.size, x, y)] === T.WATER && !world.road[idx(world.size, x, y)]) { if (!run) first = [x, y]; run++; if (run > best.n) best = { n: run, at: first }; } else run = 0;
  }
  return best;
}

// First tile of the path that the relaxed rule let through (a building, a hill).
const firstOf = (world, path, test) => path.find(([x, y]) => test(idx(world.size, x, y))) || null;

// Names why a search found no way: the cheapest ways with one obstacle relaxed at a time.
function explain(world, a, b) {
  const wide = search(world, a, b, { wide: true });
  if (wide.path) { const run = widestRun(world, wide.path); if (run.n > BRIDGE_MAX) return { reason: 'too_wide', water: run.n, at: run.at }; }
  const occ = search(world, a, b, { occ: true });
  if (occ.path) return { reason: 'boxed_in', at: firstOf(world, occ.path, (i) => world.occ[i]) };
  const hills = search(world, a, b, { hills: true });
  if (hills.path) return { reason: 'hemmed_in', at: firstOf(world, hills.path, (i) => world.terrain[i] === T.HILLS) };
  const all = search(world, a, b, { occ: true, hills: true, wide: true });
  const at = all.path ? firstOf(world, all.path, (i) => world.occ[i] || world.terrain[i] === T.HILLS || (world.terrain[i] === T.WATER && !world.road[i])) : null;
  return { reason: 'no_way', at };
}

function found(world, a, b) {
  let m = memo.get(world);
  const sig = signature(world);
  if (!m || m.sig !== sig) { m = { sig, map: new Map() }; memo.set(world, m); }
  const key = a * world.size * world.size + b;
  let r = m.map.get(key);
  if (r) return r;
  const s = search(world, a, b, {});
  if (s.path) r = { path: s.path, looked: s.looked };
  else if (s.capped) r = { path: null, reason: 'too_far', looked: s.looked };
  else r = { path: null, looked: s.looked, ...explain(world, a, b) };
  if (m.map.size >= ROUTE_MEMO_MAX) m.map.clear();
  m.map.set(key, r);
  return r;
}

// The cheapest road from (x0, y0) to (x1, y1): { ok, reason, path, tiles, gates, bridges, bridgeCost, cost, used, crossings (bridges built), looked, at, water, warnings }. path is
// every tile in order, ends included (existing road too: `used` counts those); tiles, gates, bridges, bridgeCost and cost are previewRoadTiles' answer for the
// path (what drawRoute lays and charges); a treasury that cannot pay refuses it ('no_gold') with the same cost. A refusal has an empty path, and `at` ([x, y] or
// null) is where Show me goes.
export function routeRoad(world, x0, y0, x1, y1) {
  for (const [x, y] of [[x0, y0], [x1, y1]]) { const why = endReason(world, x, y); if (why) return refusalOf(why, { at: Number.isInteger(x) && Number.isInteger(y) && inBounds(world.size, x, y) ? [x, y] : null }); }
  const a = idx(world.size, x0, y0), b = idx(world.size, x1, y1);
  const r = found(world, a, b);
  if (!r.path) return refusalOf(r.reason, { at: r.at || null, water: r.water || 0, looked: r.looked });
  const p = previewRoadTiles(world, r.path, { skipBlocked: false });
  const used = r.path.filter(([x, y]) => world.road[idx(world.size, x, y)]).length;
  if (!p.ok && p.reason !== 'no_gold') return refusalOf(p.reason, { at: null, looked: r.looked });
  const crossings = bridgeRuns(world, r.path).filter((run) => r.path.slice(run.from, run.to + 1).some(([x, y]) => !world.road[idx(world.size, x, y)])).length;   // the bridges it would build
  return { ...p, path: r.path, used, crossings, looked: r.looked, at: null, water: 0 };
}

// Lays the route (drawRoadTiles over its path: one undo step, the preview's cost taken from the treasury).
export function drawRoute(world, x0, y0, x1, y1) {
  const r = routeRoad(world, x0, y0, x1, y1);
  if (!r.ok) return r;
  const laid = drawRoadTiles(world, r.path, { skipBlocked: false });
  return { ...laid, path: r.path, used: r.used, crossings: r.crossings, looked: r.looked };
}
