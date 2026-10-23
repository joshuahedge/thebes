// Version 7.0, Track T (rulings 870-899): trade you can see. Caravans walk the entry road to the trading post and boats sail the river to the
// Quay and back, sampled from trade's own arrival schedule (src/sim/trade.js: every CARAVAN_EVERY_MONTHS months, at the month's end, for each
// open route whose post or Quay works: arrivalAt): render only, never in the sim or the save. Like the walkers, this reads the world and the
// time and keeps nothing but caches of paths: the same frame always looks the same. src/render/v70.js calls both from createUI's frame.
//   tradeWalkers(world, timeDays, range, motion)       figures joined to the walkers and depth-sorted with them, each { id, kind, x, y, dir },
//                                                       kind an art slot fig.<kind> of src/render/art/trade.js, ids from TRADE_ID_BASE up
//   drawTradeGround(g, world, range, now, motion)      a boat's wake: drawn with the boat itself (its figure), so nothing here
//
// A visit (ruling 876): the caravan or boat sets out ARRIVAL.inDays (scaled to its path, within [minDays, maxDays]) before the caravan day, so
// it reaches the post or Quay as the sim trades, stays ARRIVAL.stayDays, and goes back the way it came. Motion: Full and Gentle both show it
// walking or sailing at that pace, as the carts do (Gentle has no faster movement to calm); Still shows nothing moving: only the caravan
// standing at the post or the boat moored at the Quay while it stays, and the arrival's caption says the rest.
import { PARTNERS, CARAVAN_EVERY_MONTHS, TRADE_SALT } from '../data/trade.js';
import { DAYS_PER_MONTH } from '../sim/time.js';
import { arrivalAt, byRiver } from '../sim/trade.js';
import { adjacentRoadTiles } from '../sim/reach.js';
import { wharfSide } from './art/river.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx, inBounds, NEIGHBOURS4 } from '../sim/grid.js';

export const TRADE_ID_BASE = 4000000;   // after the carts (3000000 + store id)
export const ARRIVAL = { tilesPerDay: 3, minDays: 2, maxDays: 8, stayDays: 2, caravanGap: 0.8, boatGap: 1.6 };
const VISIT_DAYS = CARAVAN_EVERY_MONTHS * DAYS_PER_MONTH;

const inRange = (range, x, y, m = 3) => !range || (x >= range.x0 - m && x <= range.x1 + m && y >= range.y0 - m && y <= range.y1 + m);
const tileOf = (world, t) => ({ x: (t % world.size) + 0.5, y: Math.floor(t / world.size) + 0.5 });

// ── Paths (cached per world: the roads by roadVersion, the river by the terrain) ──
const roadCache = new WeakMap();
// The road path from the trade entry to the road beside the post, entry first, as tile indices; null when no road joins them.
export function caravanPath(world, post) {
  let c = roadCache.get(world);
  if (!c || c.version !== world.roadVersion) { c = { version: world.roadVersion, paths: new Map() }; roadCache.set(world, c); }
  const key = `${post.id}:${post.x}:${post.y}`;
  if (!c.paths.has(key)) c.paths.set(key, roadPath(world, post));
  return c.paths.get(key);
}
function roadPath(world, post) {
  const { x: ex, y: ey } = world.tradeEntry;
  if (!inBounds(world.size, ex, ey)) return null;
  const start = idx(world.size, ex, ey);
  if (!world.road[start]) return null;
  const goals = new Set(adjacentRoadTiles(world, post));
  return bfs(world, start, (t) => goals.has(t), (t) => Boolean(world.road[t]));
}
// Breadth-first from start over tiles `pass` allows, to the first tile `done` accepts: the path start -> it, or null.
function bfs(world, start, done, pass) {
  const from = new Map([[start, -1]]);
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    if (done(t)) {
      const path = [];
      for (let k = t; k !== -1; k = from.get(k)) path.push(k);
      return path.reverse();
    }
    const x = t % world.size, y = (t - x) / world.size;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const n = idx(world.size, nx, ny);
      if (!from.has(n) && pass(n)) { from.set(n, t); queue.push(n); }
    }
  }
  return null;
}

const riverCache = new WeakMap();
const wet = (world, t) => world.terrain[t] === T.WATER;
// Where a boat moors at the Quay: off the middle of its water side, `slot` 0 or 1 along the bank (two boats side by side). In tiles.
export function mooringOf(world, q, slot = 0) {
  const side = wharfSide(world, q);
  const along = slot === 0 ? -0.45 : 0.55;
  if (side === 's') return { x: q.x + q.w / 2 + along, y: q.y + q.d + 0.55, side };
  if (side === 'n') return { x: q.x + q.w / 2 + along, y: q.y - 0.55, side };
  if (side === 'e') return { x: q.x + q.w + 0.55, y: q.y + q.d / 2 + along, side };
  return { x: q.x - 0.55, y: q.y + q.d / 2 + along, side };
}
// The river path a boat sails from the map's edge to the water beside the Quay, edge first, as tile indices; null when the Quay's water
// reaches no edge (an oasis pool never holds a Quay: the fit rule asks for the river).
export function boatPath(world, q) {
  let c = riverCache.get(world.terrain);
  if (!c) { c = new Map(); riverCache.set(world.terrain, c); }
  const key = `${q.id}:${q.x}:${q.y}:${q.w}`;
  if (!c.has(key)) {
    const m = mooringOf(world, q);
    const sx = Math.floor(m.x), sy = Math.floor(m.y);
    const start = inBounds(world.size, sx, sy) && wet(world, idx(world.size, sx, sy)) ? idx(world.size, sx, sy) : null;
    const edge = (t) => { const x = t % world.size, y = (t - x) / world.size; return x === 0 || y === 0 || x === world.size - 1 || y === world.size - 1; };
    const out = start === null ? null : bfs(world, start, edge, (t) => wet(world, t));
    c.set(key, out ? out.reverse() : null);
  }
  return c.get(key);
}

// Where a figure stands at fraction f (0 the path's start, 1 its end) of a path of tile indices, and the direction of the leg it is on.
function along(world, path, f) {
  const n = path.length;
  if (n === 1) return { ...tileOf(world, path[0]), dx: 1, dy: 0 };
  const s = Math.min(n - 1, Math.max(0, f * (n - 1))), i = Math.min(n - 2, Math.floor(s)), k = s - i;
  const a = tileOf(world, path[i]), b = tileOf(world, path[i + 1]);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: b.x - a.x, dy: b.y - a.y };
}
const daysFor = (len) => Math.min(ARRIVAL.maxDays, Math.max(ARRIVAL.minDays, len / ARRIVAL.tilesPerDay));
// The screen's x runs with x - y: a figure heading down-left or up-left faces left.
const facesLeft = (dx, dy) => dx - dy < 0;

// Where a visit stands at time t, for a path of `len` tiles: { f (0 at the start of the path, 1 at the post or Quay), stay (it is there),
// left (heading back) }, or null outside every visit. offset delays this route's visit (the second boat behind the first).
export function visitAt(timeDays, len, since, offset = 0) {
  const inDays = daysFor(len), stay = ARRIVAL.stayDays;
  for (const D of [Math.ceil((timeDays - offset) / VISIT_DAYS) * VISIT_DAYS, Math.floor((timeDays - offset) / VISIT_DAYS) * VISIT_DAYS]) {
    if (D <= since || D <= 0) continue;
    const t = timeDays - offset - D;
    if (t >= -inDays && t < 0) return { f: 1 + t / inDays, stay: false, left: false };
    if (t >= 0 && t < stay) return { f: 1, stay: true, left: false };
    if (t >= stay && t < stay + inDays) return { f: 1 - (t - stay) / inDays, stay: false, left: true };
  }
  return null;
}

// The caravans and boats in view as walker entries.
export function tradeWalkers(world, timeDays, range = null, motion = 'full') {
  const routes = world.trade && world.trade.routes;
  if (!routes) return [];
  const open = Object.keys(PARTNERS).filter((id) => routes[id]);
  if (!open.length) return [];
  const still = motion === 'still';
  const out = [];
  let caravans = 0, boats = 0;
  open.forEach((id, k) => {
    const at = arrivalAt(world, id);
    if (!at) return;
    const since = routes[id].since || 0;
    const base = TRADE_ID_BASE + k * 16;
    if (byRiver(id)) {
      const slot = boats++;
      const path = boatPath(world, at);
      if (!path) return;
      const v = visitAt(timeDays, path.length, since, slot * ARRIVAL.boatGap);
      if (!v || (still && !v.stay)) return;
      const m = mooringOf(world, at, slot);
      if (v.stay) {
        const left = m.side === 'n' || m.side === 'w';
        if (inRange(range, m.x, m.y)) out.push({ id: base, kind: left ? 'trade_boat_moored_l' : 'trade_boat_moored', x: m.x, y: m.y, dir: left ? 3 : 1 });
        return;
      }
      const pt = along(world, path, v.f);
      const left = facesLeft(pt.dx, pt.dy) !== v.left;
      if (inRange(range, pt.x, pt.y)) out.push({ id: base, kind: left ? 'trade_boat_l' : 'trade_boat', x: pt.x, y: pt.y, dir: left ? 3 : 1 });
      return;
    }
    const slot = caravans++;
    const path = caravanPath(world, at);
    if (!path) return;
    const v = visitAt(timeDays, path.length, since, slot * ARRIVAL.caravanGap);
    if (!v || (still && !v.stay)) return;
    // The trader leads and the donkeys follow (a seeded one or two of them, render only), a little behind along the road.
    const donkeys = 1 + Math.floor(hash2(k, since, (world.seed + TRADE_SALT.caravan) | 0) * 2);
    const step = 0.7 / Math.max(1, path.length - 1);
    for (let i = 0; i <= donkeys; i++) {
      const f = v.left ? Math.min(1, v.f + i * step) : Math.max(0, v.f - i * step);
      const pt = along(world, path, f);
      if (!inRange(range, pt.x, pt.y)) continue;
      const left = v.stay ? false : facesLeft(pt.dx, pt.dy) !== v.left;
      const kind = i === 0 ? 'trader' : i % 2 ? 'pack_donkey' : 'pack_donkey_b';
      // While it stays, the caravan stands in a short line by the post's road, not on one spot.
      const x = pt.x + (v.stay ? (i % 2 ? 0.25 : -0.25) * i : 0), y = pt.y + (v.stay ? 0.3 * i : 0);
      out.push({ id: base + 1 + i, kind: left ? `${kind}_l` : kind, x, y, dir: left ? 3 : 1 });
    }
  });
  return out;
}

export function drawTradeGround() {}
