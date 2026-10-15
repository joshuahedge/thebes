// Hills (Stage 4.7, Task 3, ruling 464). On every map with new land (src/data/s47.js newLandFor) generateMap places clusters of hills: terrain
// T.HILLS, which nothing builds on and nothing walks over (src/sim/terrain.js buildable / passable), each ringed by a 1-2 tile rocky skirt (today's
// rocky ground, where mines stand now and quarries come later). The draws are hash2 keyed by the seed with S47_SALT.hills (how many, where),
// S47_SALT.hillShape (a cluster's tiles) and S47_SALT.hillSkirt (the skirt's width and ragged edge), never the generator's rng stream, so a map
// is still a function of (seed, size, layout).
//
// A cluster is refused (and the next draw tried) unless it keeps every promise the plan makes: its tiles on open desert or meadow in the x ranges the layout keeps its rock in (never rock, which
// stays an outcrop, nor loam, clay, a bank or water; every tile in a 2 x 2 block of hill tiles, so a cluster is a mound with a middle), HILLS.fromWater tiles from any water, HILLS.fromOasis from an oasis pool (so the skirt keeps the oasis's 8-tile gap to
// rock), HILLS.fromStart from the start area's centre, HILLS.fromEntry from a raider entry, the trade entry and the bridge spot, HILLS.fromRoad from the
// start road, HILLS.fromEdge from a map edge and HILLS.apart from another cluster; and it must not cut any land off: every tile the start area could
// reach (by land, joined across the water at the bridge spot) before the cluster is still reachable after it, apart from the hill tiles themselves.
import { T } from './terrain.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { hash2 } from './rng.js';
import { bridgeSpot } from './bridges.js';
import { areaScale } from '../data/map.js';
import { HILLS, S47_SALT } from '../data/s47.js';

// The range of clusters a map of this size may hold: [min, max] (Normal's HILLS.count scaled by the map's area, at least one).
export function hillRange(size) {
  const as = areaScale(size), lo = Math.max(1, Math.round(HILLS.count[0] * as));
  return [lo, Math.max(lo, Math.round(HILLS.count[1] * as))];
}

// Chebyshev tiles from the nearest water tile (255 where there is none), one breadth-first pass.
function waterDist(terrain, size) {
  const d = new Uint8Array(size * size).fill(255), queue = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.WATER) { d[i] = 0; queue.push(i); }
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % size, y = (queue[k] - x) / size;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || !inBounds(size, x + dx, y + dy)) continue;
      const n = (y + dy) * size + x + dx;
      if (d[n] > d[queue[k]] + 1) { d[n] = d[queue[k]] + 1; queue.push(n); }
    }
  }
  return d;
}

// The tiles a walker can reach from `from` on foot, 4 directions (as the raiders' flow fields step): land that is neither water nor hills, and the
// crossing at the bridge spot (its two land ends are joined, as a bridge would join them). A Uint8Array, 1 where reachable.
export function landReach(terrain, size, from, spot = null) {
  const seen = new Uint8Array(size * size), start = idx(size, from.x, from.y), queue = [start];
  const a = spot ? idx(size, spot.from[0], spot.from[1]) : -1, b = spot ? idx(size, spot.to[0], spot.to[1]) : -1;
  if (terrain[start] === T.WATER || terrain[start] === T.HILLS) return seen;
  seen[start] = 1;
  const visit = (n) => { if (!seen[n] && terrain[n] !== T.WATER && terrain[n] !== T.HILLS) { seen[n] = 1; queue.push(n); } };
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % size, y = (i - x) / size;
    for (const [dx, dy] of NEIGHBOURS4) if (inBounds(size, x + dx, y + dy)) visit((y + dy) * size + x + dx);
    if (i === a) visit(b); else if (i === b) visit(a);
  }
  return seen;
}

// A cluster's tiles for a centre: { core: [[x, y]], skirt: [[x, y]] } from the shape draws, or null when it cannot reach HILLS.size[0] tiles.
// ok(x, y) says whether a tile may be hills.
function shapeAt(size, seed, cx, cy, k, ok) {
  const sh = (a, b) => hash2(a, b, (seed + S47_SALT.hillShape) | 0);
  const want = HILLS.size[0] + Math.floor(sh(k, 1) * (HILLS.size[1] - HILLS.size[0] + 1));
  if (!ok(cx, cy)) return null;
  const core = [[cx, cy]], inCore = new Set([`${cx},${cy}`]);
  while (core.length < want) {
    let best = null;
    for (const [px, py] of core) {
      for (const [dx, dy] of NEIGHBOURS4) {
        const x = px + dx, y = py + dy, key = `${x},${y}`;
        if (inCore.has(key) || !ok(x, y)) continue;
        // compact: the draw and the distance from the centre, less a share for each tile of the cluster already beside it (a 2 x 2 block fills first)
        const beside = NEIGHBOURS4.reduce((m, [ex, ey]) => m + (inCore.has(`${x + ex},${y + ey}`) ? 1 : 0), 0);
        const score = sh(x * 131 + y, k * 7 + 2) * 1.0 + Math.hypot(x - cx, y - cy) * 0.3 - 0.9 * beside;
        if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) < 1e-9 && (y < best.y || (y === best.y && x < best.x)))) best = { x, y, score };
      }
    }
    if (!best) break;
    core.push([best.x, best.y]);
    inCore.add(`${best.x},${best.y}`);
  }
  // Every hill tile belongs to a 2 x 2 block of hill tiles (a mound with a middle for the picture to raise: src/render/hills.js); a tile that hangs off the
  // cluster by itself is dropped, and a cluster that is left with fewer than HILLS.size[0] tiles is refused.
  const hill = (x, y) => inCore.has(`${x},${y}`);
  const blocked = core.filter(([x, y]) => [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([bx, by]) => hill(x + bx, y + by) && hill(x + bx + 1, y + by) && hill(x + bx, y + by + 1) && hill(x + bx + 1, y + by + 1)));
  // and it stays one piece: of what is left, the largest 8-neighbour component
  const left = new Set(blocked.map(([x, y]) => `${x},${y}`));
  let best = [];
  for (const [sx, sy] of blocked) {
    if (!left.has(`${sx},${sy}`)) continue;
    const comp = [[sx, sy]];
    left.delete(`${sx},${sy}`);
    for (let q = 0; q < comp.length; q++) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const key = `${comp[q][0] + dx},${comp[q][1] + dy}`;
        if (left.delete(key)) comp.push(key.split(',').map(Number));
      }
    }
    if (comp.length > best.length) best = comp;
  }
  if (best.length < HILLS.size[0]) return null;
  core.length = 0;
  core.push(...best);
  // The rocky skirt: every tile beside the cluster (8 directions), and, on a cluster whose draw says two tiles wide, a ragged second ring.
  const width = HILLS.skirt[0] + Math.floor(hash2(k, 3, (seed + S47_SALT.hillSkirt) | 0) * (HILLS.skirt[1] - HILLS.skirt[0] + 1));
  const skirt = [], seen = new Set(core.map(([x, y]) => `${x},${y}`));
  const ring = (from, outer) => {
    const next = [];
    for (const [px, py] of from) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx, y = py + dy, key = `${x},${y}`;
        if (seen.has(key) || !inBounds(size, x, y)) continue;
        seen.add(key);
        if (outer && hash2(x, y, (seed + S47_SALT.hillSkirt) | 0) >= HILLS.skirtRagged) continue;
        next.push([x, y]);
      }
    }
    return next;
  };
  let front = core;
  for (let w = 0; w < width; w++) { front = ring(front, w > 0); skirt.push(...front); }
  return { core, skirt };
}

// Places the hills on `terrain` in place and returns { hills, skirt }: the clusters ([{ x, y, n }]: a cluster's centre tile and its hill tiles; possibly
// none) and how many tiles of rocky skirt they made. ctx: focus (the start area's centre); targets: the points that must stay joined to it (the raider
// entries and the trade entry), each { x, y }; startRoad: [[x, y]] (the trade road's first tiles); oases: [{ x, y, r }] as placed; ranges: [[x0, x1]] the x
// ranges the layout keeps its rock in (a hill is rock's kin: it stands where the outcrops do, so a layout keeps its character), or null for anywhere.
export function placeHills(terrain, size, seed, { focus, targets, startRoad = [], oases = [], ranges = null }) {
  const [lo, hi] = hillRange(size);
  const salt = (seed + S47_SALT.hills) | 0;
  const want = lo + Math.floor(hash2(seed, 1, salt) * (hi - lo + 1));
  const out = [];
  let skirt = 0;
  const wd = waterDist(terrain, size);
  const spot = bridgeSpot({ size, terrain, road: new Uint8Array(size * size), occ: new Uint8Array(size * size) }, focus);
  const pools = [];
  for (const o of oases) {
    for (let y = Math.floor(o.y - o.r); y <= Math.ceil(o.y + o.r); y++) for (let x = Math.floor(o.x - o.r); x <= Math.ceil(o.x + o.r); x++) {
      if (inBounds(size, x, y) && terrain[idx(size, x, y)] === T.WATER && Math.hypot(x - o.x, y - o.y) <= o.r) pools.push([x, y]);
    }
  }
  const edge = (x, y) => Math.min(x, y, size - 1 - x, size - 1 - y);
  const cheb = (x, y, [px, py]) => Math.max(Math.abs(x - px), Math.abs(y - py));
  let reach = landReach(terrain, size, focus, spot);
  const keep = targets.filter((t) => reach[idx(size, t.x, t.y)]);
  const taken = [];   // every hill tile so far, for HILLS.apart
  for (let k = 0; k < HILLS.tries && out.length < want; k++) {
    const cx = Math.floor(hash2(k, 2, salt) * size), cy = Math.floor(hash2(k, 3, salt) * size);
    const ok = (x, y) => {
      if (!inBounds(size, x, y) || edge(x, y) < HILLS.fromEdge) return false;
      if (ranges && !ranges.some(([x0, x1]) => x >= x0 && x <= x1)) return false;
      const i = idx(size, x, y), t = terrain[i];
      if (t !== T.DESERT && t !== T.MEADOW) return false;   // open ground only: an outcrop keeps its rock (the layouts count it)
      if (wd[i] < HILLS.fromWater) return false;
      if (Math.hypot(x - focus.x, y - focus.y) < HILLS.fromStart) return false;
      if (targets.some((e) => Math.hypot(x - e.x, y - e.y) < HILLS.fromEntry)) return false;
      if (spot && Math.hypot(x - spot.x, y - spot.y) < HILLS.fromEntry) return false;
      if (pools.some((q) => cheb(x, y, q) < HILLS.fromOasis)) return false;
      if (startRoad.some((q) => cheb(x, y, q) < HILLS.fromRoad)) return false;
      if (taken.some((q) => cheb(x, y, q) < HILLS.apart)) return false;
      return true;
    };
    const s = shapeAt(size, seed, cx, cy, k, ok);
    if (!s) continue;
    // apply, then keep it only if everything the start area reached is still reached (the hill tiles aside)
    const undo = [];
    const set = (list, t, only) => { let n = 0; for (const [x, y] of list) { const i = idx(size, x, y); if (only && !only.includes(terrain[i])) continue; undo.push([i, terrain[i]]); terrain[i] = t; n++; } return n; };
    const hillsInReach = s.core.filter(([x, y]) => reach[idx(size, x, y)]).length;
    set(s.core, T.HILLS);
    const made = set(s.skirt, T.ROCKY, [T.DESERT, T.MEADOW]);
    const now = landReach(terrain, size, focus, spot);
    let was = 0, is = 0;
    for (let i = 0; i < now.length; i++) { was += reach[i]; is += now[i]; }
    if (keep.every((t) => now[idx(size, t.x, t.y)]) && was - hillsInReach === is) {
      out.push({ x: Math.round(s.core.reduce((m, [x]) => m + x, 0) / s.core.length), y: Math.round(s.core.reduce((m, [, y]) => m + y, 0) / s.core.length), n: s.core.length });
      taken.push(...s.core);
      skirt += made;
      reach = now;   // the next cluster is judged against the map as it now stands
      continue;
    }
    for (let j = undo.length - 1; j >= 0; j--) terrain[undo[j][0]] = undo[j][1];
  }
  return { hills: out, skirt };
}
