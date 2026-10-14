// Desert oases (Stage 4.7, Task 2, ruling 463). On every map with new land (src/data/s47.js newLandFor) generateMap places 0-1 oases on
// Small, 0-2 on Normal and 1-3 on Large, in open desert: a pool of 3-8 water tiles, a bank round it, a fertile ring with a little clay.
// The draws are hash2 keyed by the seed with S47_SALT.oases (where) and S47_SALT.oasisShape (the pool, the ring, the clay), never the
// generator's rng stream, so a map is still a function of (seed, size, layout). An oasis is stored as { x, y, r }: the pool's centre tile
// and the radius, in tiles, that holds every pool tile (world.oases; src/data/s47.js isOasis).
//
// A site is refused (and the next draw tried) unless it keeps every promise the plan makes: its water and bank at least OASES.fromRiver
// tiles from any other water and OASES.fromEdge from a map edge, OASES.fromStart from the start area's centre, OASES.fromEntry from a
// raider entry and the trade entry, OASES.apart from another oasis, on open desert or meadow only (no rock, clay or loam), and neither
// the bridge spot nor the road between the start area and an entry may change (a pool must not cut the start area off from a raider).
import { T } from './terrain.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { hash2 } from './rng.js';
import { bridgeSpot } from './bridges.js';
import { OASES, S47_SALT } from '../data/s47.js';

const round2 = (n) => Math.round(n * 100) / 100;

// The range of oases a map of this size may hold: [min, max].
export const oasisRange = (size) => (size <= OASES.smallMax ? OASES.small : size >= OASES.largeMin ? OASES.large : OASES.normal);

// ── Queries (the sim and the renderer) ──
// Whether a water tile at (x, y) is an oasis pool (not the river): the wharf may not fish it (fit.js) and herds favour it.
export function inOasisPool(world, x, y) {
  if (!world.oases || !world.oases.length || !inBounds(world.size, x, y) || world.terrain[idx(world.size, x, y)] !== T.WATER) return false;
  return world.oases.some((o) => Math.hypot(x - o.x, y - o.y) <= o.r);
}
// The oasis whose pool lies within `tiles` of (x, y), else null.
export function oasisNear(world, x, y, tiles = OASES.near) {
  return (world.oases || []).find((o) => Math.hypot(x - o.x, y - o.y) <= o.r + tiles) || null;
}
// Whether a building's footprint stands within OASES.near tiles of an oasis (src/data/s47.js: the "An oasis in the desert" first).
export function builtNearOasis(world, b) {
  for (let ty = b.y; ty < b.y + b.d; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) if (oasisNear(world, tx, ty)) return true;
  return false;
}
// The tile index list of every oasis pool tile on a map.
export const poolTiles = (world) => {
  const out = [];
  for (const o of world.oases || []) {
    for (let y = Math.floor(o.y - o.r); y <= Math.ceil(o.y + o.r); y++) {
      for (let x = Math.floor(o.x - o.r); x <= Math.ceil(o.x + o.r); x++) if (inOasisPool(world, x, y)) out.push(idx(world.size, x, y));
    }
  }
  return out;
};

// ── Generation ──
// Chebyshev tiles from the nearest water (255 where there is none), one breadth-first pass.
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

// The tiles a walker can reach from `from` without crossing water, 4 directions (as the raiders' flow fields step): a Uint8Array.
export function reachableFrom(terrain, size, from) {
  const seen = new Uint8Array(size * size), start = idx(size, from.x, from.y), queue = [start];
  seen[start] = 1;
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % size, y = (queue[k] - x) / size;
    for (const [dx, dy] of NEIGHBOURS4) {
      if (!inBounds(size, x + dx, y + dy)) continue;
      const n = (y + dy) * size + x + dx;
      if (seen[n] || terrain[n] === T.WATER) continue;
      seen[n] = 1; queue.push(n);
    }
  }
  return seen;
}

const spotKey = (terrain, size, focus) => {
  const z = new Uint8Array(size * size);
  return JSON.stringify(bridgeSpot({ size, terrain, road: z, occ: z }, focus));
};

// An oasis's tiles for a centre: { pool: [[x, y]], bank: [[x, y]], ring: [[x, y]], clay: [[x, y]], r } from the shape draws; null when the
// zone (11 x 11 tiles about the centre) is not all open desert or meadow.
function shapeAt(terrain, size, seed, cx, cy, k) {
  const sh = (a, b) => hash2(a, b, (seed + S47_SALT.oasisShape) | 0);
  const Z = OASES.zone;
  for (let dy = -Z; dy <= Z; dy++) for (let dx = -Z; dx <= Z; dx++) {
    if (!inBounds(size, cx + dx, cy + dy)) return null;
    const t = terrain[idx(size, cx + dx, cy + dy)];
    if (t !== T.DESERT && t !== T.MEADOW) return null;
  }
  // The pool: grown from the centre one 4-neighbour at a time, the next tile the lowest of a seeded draw plus its distance from the centre.
  const want = OASES.pool[0] + Math.floor(sh(k, 1) * (OASES.pool[1] - OASES.pool[0] + 1));
  const pool = [[cx, cy]], inPool = new Set([`${cx},${cy}`]);
  while (pool.length < want) {
    let best = null;
    for (const [px, py] of pool) {
      for (const [dx, dy] of NEIGHBOURS4) {
        const x = px + dx, y = py + dy, key = `${x},${y}`;
        if (inPool.has(key)) continue;
        const score = sh(x * 131 + y, k * 7 + 2) * 1.6 + Math.hypot(x - cx, y - cy) * 0.55;
        if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) < 1e-9 && (y < best.y || (y === best.y && x < best.x)))) best = { x, y, score };
      }
    }
    pool.push([best.x, best.y]);
    inPool.add(`${best.x},${best.y}`);
  }
  const near = (x, y) => pool.reduce((m, [px, py]) => Math.min(m, Math.hypot(x - px, y - py)), 99);
  const bank = [], ring = [];
  for (let y = cy - Z; y <= cy + Z; y++) {
    for (let x = cx - Z; x <= cx + Z; x++) {
      if (inPool.has(`${x},${y}`)) continue;
      const d = near(x, y);
      if (d <= 1.5) bank.push([x, y]);
      else if (d <= 2.3 + sh(x * 131 + y, k * 7 + 3) * 1.2) ring.push([x, y]);
    }
  }
  // A little clay: bank tiles on one side of the pool (the side the angle draw names), then the ring tile beside each, 3-7 in all.
  const a = sh(k, 4) * Math.PI * 2, wantClay = OASES.clay[0] + Math.floor(sh(k, 5) * (OASES.clay[1] - OASES.clay[0] + 1));
  const side = (x, y) => Math.cos(Math.atan2(y - cy, x - cx) - a);
  const clay = [];
  const byBank = [...bank].sort((p, q) => side(q[0], q[1]) - side(p[0], p[1]) || p[1] - q[1] || p[0] - q[0]);
  for (const t of byBank) if (clay.length < Math.ceil(wantClay / 2)) clay.push(t);
  const byRing = [...ring].sort((p, q) => side(q[0], q[1]) - side(p[0], p[1]) || p[1] - q[1] || p[0] - q[0]);
  for (const t of byRing) if (clay.length < wantClay) clay.push(t);
  const r = round2(Math.max(1, pool.reduce((m, [px, py]) => Math.max(m, Math.hypot(px - cx, py - cy)), 0) + 0.5));
  return { pool, bank, ring, clay, r };
}

// Places the oases on `terrain` in place and returns them ([{ x, y, r }], possibly none). ctx: focus (the start area's centre) and
// targets: the points that must stay connected to it as they were (the raider entries and the trade entry), each { x, y }.
export function placeOases(terrain, size, seed, { focus, targets }) {   // returns { oases, clay }: the oases and the clay tiles they laid
  const [lo, hi] = oasisRange(size);
  const salt = (seed + S47_SALT.oases) | 0;
  const want = lo + Math.floor(hash2(seed, 1, salt) * (hi - lo + 1));
  const out = [];
  let clay = 0;
  if (!want) return { oases: out, clay };
  const wd = waterDist(terrain, size);
  const spot0 = spotKey(terrain, size, focus);
  const reach0 = reachableFrom(terrain, size, focus);
  const keep = targets.filter((t) => reach0[idx(size, t.x, t.y)]);
  const edge = (x, y) => Math.min(x, y, size - 1 - x, size - 1 - y);
  for (let k = 0; k < OASES.tries && out.length < want; k++) {
    const cx = Math.floor(hash2(k, 2, salt) * size), cy = Math.floor(hash2(k, 3, salt) * size);
    if (edge(cx, cy) < OASES.fromEdge || wd[idx(size, cx, cy)] < OASES.fromRiver) continue;
    if (Math.hypot(cx - focus.x, cy - focus.y) < OASES.fromStart) continue;
    if (targets.some((t) => Math.hypot(cx - t.x, cy - t.y) < OASES.fromEntry)) continue;
    if (out.some((o) => Math.hypot(cx - o.x, cy - o.y) < OASES.apart)) continue;
    const s = shapeAt(terrain, size, seed, cx, cy, k);
    if (!s) continue;
    // every tile of the pool and its bank keeps its distances: at least fromRiver from other water, fromEdge from the map's edge
    if ([...s.pool, ...s.bank].some(([x, y]) => edge(x, y) < OASES.fromEdge || wd[idx(size, x, y)] < OASES.fromRiver)) continue;
    // no rock within OASES.fromRock of the pool (the generator keeps its rock off water)
    let rocky = false;
    for (let y = cy - OASES.fromRock - 3; y <= cy + OASES.fromRock + 3 && !rocky; y++) {
      for (let x = cx - OASES.fromRock - 3; x <= cx + OASES.fromRock + 3 && !rocky; x++) {
        if (inBounds(size, x, y) && terrain[idx(size, x, y)] === T.ROCKY && s.pool.some(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) <= OASES.fromRock)) rocky = true;
      }
    }
    if (rocky) continue;
    // apply, then keep it only if the start area is still joined to what it was joined to and the bridge spot has not moved
    const undo = [];
    const set = (list, t) => { for (const [x, y] of list) { const i = idx(size, x, y); undo.push([i, terrain[i]]); terrain[i] = t; } };
    set(s.ring, T.FERTILE); set(s.bank, T.BANK); set(s.pool, T.WATER); set(s.clay, T.CLAY);
    const now = reachableFrom(terrain, size, focus);
    if (keep.every((t) => now[idx(size, t.x, t.y)]) && spotKey(terrain, size, focus) === spot0) { out.push({ x: cx, y: cy, r: s.r }); clay += s.clay.length; continue; }
    for (let j = undo.length - 1; j >= 0; j--) terrain[undo[j][0]] = undo[j][1];
  }
  return { oases: out, clay };
}

// A building has just been placed: counts it (world.tally.oasisBuilds) when it stands within OASES.near tiles of an oasis (the first, src/data/s47.js).
export function noteBuilt(world, b) {
  if (b && b.type !== 'rubble' && builtNearOasis(world, b)) world.tally.oasisBuilds += 1;
}
