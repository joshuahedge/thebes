// Version 8.2.1 "Easier ferries" (rulings 1340-1359). Josh found a ferry hard to place: one drag had to run along one grid row or column (a diagonal on
// the screen), start and end on free dry land, and have a road beside both landings, so the far bank needed a road laid first. These functions are the
// new rule; the Ferry tool's shown crossings, its bar, its drag and the tests all read them (src/sim/ferries.js re-exports previewFerry from here).
//
//   ferryChoices(world, from)    the best few crossings near the player's roads, ranked (ruling 1344): what the map shows when the Ferry tool is picked
//   previewFerry(world, tiles)   a dragged line's verdict: it snaps to the nearest crossing that works (ruling 1347), and refuses only what no snap can mend
//   judgeCrossing(world, plan)   a crossing's verdict as previewFerry gives it: its price (the two landings and the road it lays) and whether the treasury can pay
//   crossingCost(world, plan)    that price
//
// A crossing is a straight run of FERRY.min to FERRY.max tiles of water along a row or a column, with a landing on the free dry tile at each end. Each
// landing must have a road beside it, as in 7.1, so its ferryman can come; what is new is that the crossing brings that road (ruling 1341):
//   the near landing   has a road beside it, or gets a stub of up to FERRY_FIND.nearStub road tiles over free dry land to the road network (ruling 1342)
//   the far landing    has a road beside it, or gets a stub of FERRY_FIND.farStub road tiles on from it, away from the water if it can, else along the bank,
//                      so buildings over there can join it (ruling 1343)
// A crossing either landing of which can have neither is not offered, and a drag there is refused with 'ferry_no_road'.
//
// The road network (ruling 1340) is the roads joined to the generator's road in from the trade edge (world.startRoad), over bridges and over every laid
// ferry crossing; a city whose start road is gone has its biggest piece of road for it. Everything here is pure and deterministic (no clock, no
// randomness); the candidates are kept per world while a fingerprint of everything they read (terrain, roads, buildings, walls, the start road, the
// next id) is unchanged, so a moved building or a laid road is seen at once, even one a test writes straight into the arrays (ruling 1346).
import { FERRY, FERRY_LANDING, FERRY_FIND } from '../data/ferries.js';
import { hasRiver } from '../data/map.js';
import { NEIGHBOURS4, idx, inBounds } from './grid.js';
import { T, buildable } from './terrain.js';
import { bridgeRuns, BRIDGE_MAX } from './bridges.js';
import { costOf, roadCostOf } from './costs.js';
import { canAfford } from './money.js';

const tileKey = (t) => `${t[0]},${t[1]}`;
const hasRoad = (world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);
const isWater = (world, x, y) => inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.WATER;
// Free dry land: a tile a landing or a stub may take (open ground, nothing built, no road, no wall).
export const freeLand = (world, x, y) => {
  if (!inBounds(world.size, x, y)) return false;
  const i = idx(world.size, x, y);
  return buildable(world, i) && !world.occ[i] && !world.road[i] && !world.wall[i];
};
const roadBeside = (world, [x, y]) => NEIGHBOURS4.some(([dx, dy]) => hasRoad(world, x + dx, y + dy));
const netBeside = (world, net, [x, y]) => NEIGHBOURS4.some(([dx, dy]) => inBounds(world.size, x + dx, y + dy) && net[idx(world.size, x + dx, y + dy)] === 1);

// ── The road network (ruling 1340) ──

// Marks (1) every road tile of the network: a Uint8Array over the map.
function networkOf(world) {
  const n = world.size, net = new Uint8Array(n * n);
  const flood = (seeds) => {
    const queue = [];
    for (const t of seeds) if (!net[t] && world.road[t]) { net[t] = 1; queue.push(t); }
    for (let q = 0; q < queue.length; q++) {
      const t = queue[q], x = t % n, y = (t - x) / n;
      for (const [dx, dy] of NEIGHBOURS4) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(n, nx, ny)) continue;
        const j = idx(n, nx, ny);
        if (!net[j] && world.road[j]) { net[j] = 1; queue.push(j); }
      }
    }
    return queue.length;
  };
  const start = (world.startRoad || []).filter(([x, y]) => hasRoad(world, x, y)).map(([x, y]) => idx(n, x, y));
  if (start.length) flood(start);
  else {
    // No start road left: the biggest piece of road (the lowest first tile breaks a tie), found on a scratch mark and then flooded for real.
    const seen = new Uint8Array(n * n);
    let best = -1, bestSize = 0;
    for (let i = 0; i < n * n; i++) {
      if (!world.road[i] || seen[i]) continue;
      const queue = [i];
      seen[i] = 1;
      for (let q = 0; q < queue.length; q++) {
        const t = queue[q], x = t % n, y = (t - x) / n;
        for (const [dx, dy] of NEIGHBOURS4) {
          const nx = x + dx, ny = y + dy;
          if (!inBounds(n, nx, ny)) continue;
          const j = idx(n, nx, ny);
          if (!seen[j] && world.road[j]) { seen[j] = 1; queue.push(j); }
        }
      }
      if (queue.length > bestSize) { best = i; bestSize = queue.length; }
    }
    if (best >= 0) flood([best]);
  }
  // A laid crossing joins its banks' roads, running or not (a crossing is part of the network the player is building; whether it runs is the landing's sheet's to say).
  const besideRoads = (b) => NEIGHBOURS4.map(([dx, dy]) => [b.x + dx, b.y + dy]).filter(([x, y]) => hasRoad(world, x, y)).map(([x, y]) => idx(n, x, y));
  const pairs = [];
  for (const a of Object.values(world.buildings)) {
    const b = a.type === FERRY_LANDING && a.ferry ? world.buildings[a.ferry.mate] : null;
    if (b && b.type === FERRY_LANDING && a.id < b.id) pairs.push([besideRoads(a), besideRoads(b)]);
  }
  for (let grew = true; grew;) {
    grew = false;
    for (const [ra, rb] of pairs) {
      if (ra.some((t) => net[t]) && rb.some((t) => !net[t]) && flood(rb)) grew = true;
      if (rb.some((t) => net[t]) && ra.some((t) => !net[t]) && flood(ra)) grew = true;
    }
  }
  return net;
}

// ── The stubs (rulings 1342, 1343) ──

// The near landing's stub: the shortest way over free dry land, at most FERRY_FIND.nearStub tiles, from a tile beside the landing to a tile beside the
// network ([] when the landing touches it already), or null. Breadth first in NEIGHBOURS4's order, so the same map gives the same stub.
function nearStubOf(world, net, landing, avoid) {
  if (netBeside(world, net, landing)) return [];
  const prev = new Map();
  let frontier = [];
  for (const [dx, dy] of NEIGHBOURS4) {
    const t = [landing[0] + dx, landing[1] + dy], k = tileKey(t);
    if (freeLand(world, t[0], t[1]) && !avoid.has(k) && !prev.has(k)) { prev.set(k, null); frontier.push(t); }
  }
  for (let depth = 1; depth <= FERRY_FIND.nearStub && frontier.length; depth++) {
    for (const t of frontier) {
      if (!netBeside(world, net, t)) continue;
      const path = [];
      for (let at = t; at; at = prev.get(tileKey(at))) path.unshift(at);
      return path;
    }
    if (depth === FERRY_FIND.nearStub) break;
    const next = [];
    for (const t of frontier) {
      for (const [dx, dy] of NEIGHBOURS4) {
        const u = [t[0] + dx, t[1] + dy], k = tileKey(u);
        if (prev.has(k) || avoid.has(k) || !freeLand(world, u[0], u[1])) continue;
        prev.set(k, t);
        next.push(u);
      }
    }
    frontier = next;
  }
  return null;
}

// The far landing's stub: FERRY_FIND.farStub tiles straight on from the landing, away from the water; failing that, along the bank one way, then the
// other. A stub that meets a road on its way stops there (it is joined). null when no way has the room.
function farStubOf(world, landing, away, avoid) {
  const [ax, ay] = away;
  for (const [dx, dy] of [[ax, ay], [-ay, ax], [ay, -ax]]) {
    const tiles = [];
    let ok = true;
    for (let k = 1; k <= FERRY_FIND.farStub; k++) {
      const x = landing[0] + dx * k, y = landing[1] + dy * k;
      if (hasRoad(world, x, y)) break;
      if (!freeLand(world, x, y) || avoid.has(tileKey([x, y]))) { ok = false; break; }
      tiles.push([x, y]);
    }
    if (ok && tiles.length) return tiles;
  }
  return null;
}

// The crossing between two landing tiles (ends, in the order given), with its stubs, or null when one landing can have no road. near is the landing that
// is reached from the roads (0 or 1); joins says whether that is the network itself (a crossing the finder may show) or only a road beside it (a drag's,
// as in 7.1). Of the two ways round, the one that joins the network wins, then the one with fewer stub tiles, then the drag's own order.
function planCrossing(world, net, ends, vertical, water) {
  const unit = (from, to) => [Math.sign(to[0] - from[0]), Math.sign(to[1] - from[1])];
  const away = [unit(ends[1], ends[0]), unit(ends[0], ends[1])];
  const options = [];
  for (const near of [0, 1]) {
    const far = 1 - near;
    const avoid = new Set(ends.map(tileKey));
    let nearStub = nearStubOf(world, net, ends[near], avoid), joins = nearStub !== null;
    if (!nearStub && roadBeside(world, ends[near])) nearStub = [];
    if (!nearStub) continue;
    for (const t of nearStub) avoid.add(tileKey(t));
    const farStub = roadBeside(world, ends[far]) ? [] : farStubOf(world, ends[far], away[far], avoid);
    if (!farStub) continue;
    const stubs = near === 0 ? [nearStub, farStub] : [farStub, nearStub];
    options.push({ near, joins, stubs, n: nearStub.length + farStub.length });
  }
  if (!options.length) return null;
  options.sort((p, q) => Number(q.joins) - Number(p.joins) || p.n - q.n || p.near - q.near);
  const { near, joins, stubs } = options[0];
  return { landings: ends.map((t) => [t[0], t[1]]), water, vertical, stubs, roads: [...stubs[0], ...stubs[1]], near, joins };
}

// ── The candidates, kept per world (ruling 1346) ──

// A fingerprint of everything the candidates read: two running hashes over the terrain, roads, buildings and walls, with the start road and the next id.
function fingerprint(world) {
  let h1 = (world.size * 7919 + (world.nextId | 0)) | 0, h2 = (world.size * 104729) ^ (world.nextId | 0);
  const mix = (arr, salt) => {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i] | 0;
      if (!v) continue;
      h1 = (Math.imul(h1 ^ (i + salt), 0x01000193) + v) | 0;
      h2 = (Math.imul(h2 + v * 31, 0x5bd1e995) ^ (i * 2654435761 + salt)) | 0;
    }
  };
  mix(world.terrain, 1); mix(world.road, 2); mix(world.occ, 3); mix(world.wall, 4);
  for (const [x, y] of world.startRoad || []) { h1 = (Math.imul(h1, 31) + x * 977 + y) | 0; h2 = (Math.imul(h2, 37) ^ (x * 131 + y)) | 0; }
  return `${world.mapVariant}|${h1}|${h2}`;
}

// The good ground a crossing opens (ruling 1344): free fertile, clay and rocky tiles within FERRY_FIND.opensR tiles of its far landing.
function opensOf(world, [lx, ly]) {
  const r = FERRY_FIND.opensR;
  let n = 0;
  for (let y = ly - r; y <= ly + r; y++) {
    for (let x = lx - r; x <= lx + r; x++) {
      if (!freeLand(world, x, y)) continue;
      const t = world.terrain[idx(world.size, x, y)];
      if (t === T.FERTILE || t === T.CLAY || t === T.ROCKY) n++;
    }
  }
  return n;
}

const memo = new WeakMap();   // world -> { fp, net, list }
// Every crossing the map has room for today, each with its stubs ({ landings (low end first along the axis), water, vertical, stubs, roads, near, joins,
// mid: the water's middle tile, key, opens }), and the network.
function candidatesOf(world) {
  const fp = fingerprint(world);
  const m = memo.get(world);
  if (m && m.fp === fp) return m;
  const net = networkOf(world), list = [], n = world.size;
  // Version 8.2 (ruling 1333): a map with no river (the Oasis) has no ferries: its pools and bays are bridged.
  for (let a = 0; a < (hasRiver(world.mapVariant) ? n : 0); a++) {
    for (const vertical of [false, true]) {
      const cell = (b) => (vertical ? [a, b] : [b, a]);
      let start = -1;
      for (let b = 0; b <= n; b++) {
        const wet = b < n && isWater(world, ...cell(b));
        if (wet && start < 0) start = b;
        if (wet || start < 0) continue;
        const b0 = start, b1 = b - 1, water = b1 - b0 + 1;
        start = -1;
        if (water < FERRY.min || water > FERRY.max) continue;
        const e0 = cell(b0 - 1), e1 = cell(b1 + 1);
        if (!freeLand(world, ...e0) || !freeLand(world, ...e1)) continue;
        const plan = planCrossing(world, net, [e0, e1], vertical, water);
        if (!plan) continue;
        const far = plan.landings[1 - plan.near];
        list.push({ ...plan, mid: cell(b0 + Math.floor(water / 2)), key: `${e0[0]},${e0[1]},${e1[0]},${e1[1]}`, opens: plan.joins ? opensOf(world, far) : 0 });
      }
    }
  }
  const out = { fp, net, list };
  memo.set(world, out);
  return out;
}

// ── What the tool and the tests read ──

// A crossing's price (ruling 1341): its two landings and every road tile its stubs lay.
export const crossingCost = (world, plan) => 2 * costOf(world, FERRY_LANDING) + plan.roads.length * roadCostOf(world);

// A crossing's verdict, as previewFerry gives one: { ok, reason (null or 'no_gold'), water, landings, vertical, stubs, roads, near, joins, cost, at, key }.
export function judgeCrossing(world, plan, extra = {}) {
  const cost = crossingCost(world, plan);
  const v = {
    water: plan.water, landings: plan.landings, vertical: plan.vertical, stubs: plan.stubs, roads: plan.roads, near: plan.near, joins: plan.joins,
    cost, at: null, key: plan.key || `${plan.landings[0][0]},${plan.landings[0][1]},${plan.landings[1][0]},${plan.landings[1][1]}`, ...extra,
  };
  return canAfford(world, cost) ? { ok: true, reason: null, ...v } : { ok: false, reason: 'no_gold', ...v };
}

// The crossings the Ferry tool shows (ruling 1344, 1345): those whose near landing joins the road network, narrowest water first; then the nearest to
// `from` ({ x, y }: where the player was looking when the tool was picked), counted in bands of FERRY_FIND.band tiles; within a band the one that lays
// less road (it costs less), then the one that opens more good ground; then the nearer; then the map's order. At most FERRY_FIND.shown, each at least FERRY_FIND.apart tiles from the ones before it and from
// every ferry already laid (ruling 1352). Each is
// judgeCrossing's verdict (with the price) plus mid and opens. [] when the roads reach no water a ferry can cross.
export function ferryChoices(world, from) {
  const f = from || world.focus || { x: world.size / 2, y: world.size / 2 };
  const ranked = candidatesOf(world).list.filter((c) => c.joins).map((c) => {
    const d = Math.hypot(c.mid[0] + 0.5 - f.x, c.mid[1] + 0.5 - f.y);
    return { c, d, band: Math.floor(d / FERRY_FIND.band) };
  });
  ranked.sort((p, q) => p.c.water - q.c.water || p.band - q.band || p.c.roads.length - q.c.roads.length || q.c.opens - p.c.opens || p.d - q.d || (p.c.key < q.c.key ? -1 : p.c.key > q.c.key ? 1 : 0));
  // A ferry already laid counts as shown (ruling 1352): no crossing is offered right beside one (its water's middle within FERRY_FIND.apart tiles of the laid one's).
  const shown = [], laid = [];
  for (const a of Object.values(world.buildings)) {
    const b = a.type === FERRY_LANDING && a.ferry ? world.buildings[a.ferry.mate] : null;
    if (b && a.id < b.id) laid.push({ mid: [Math.floor((a.x + b.x) / 2), Math.floor((a.y + b.y) / 2)] });
  }
  for (const { c } of ranked) {
    if (laid.some((s) => Math.max(Math.abs(s.mid[0] - c.mid[0]), Math.abs(s.mid[1] - c.mid[1])) < FERRY_FIND.apart)) continue;
    if (shown.length >= FERRY_FIND.shown) break;
    if (shown.some((s) => Math.max(Math.abs(s.mid[0] - c.mid[0]), Math.abs(s.mid[1] - c.mid[1])) < FERRY_FIND.apart)) continue;
    shown.push({ ...judgeCrossing(world, c), mid: c.mid, opens: c.opens });
  }
  return shown;
}

// Whether the map has any crossing near the roads: ferryChoices(world, from).length > 0, without the ranking.
export const anyCrossingNearRoads = (world) => candidatesOf(world).list.some((c) => c.joins);

// The water a crossing crosses: its tiles from one landing to the other, landings out.
export function crossingWater(plan) {
  const [[x0, y0], [x1, y1]] = plan.landings;
  const out = [];
  const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  for (let x = x0 + sx, y = y0 + sy; x !== x1 || y !== y1; x += sx, y += sy) out.push([x, y]);
  return out;
}

// Why a drag cannot lay a ferry, else the crossing it lays. tiles is the dragged line, each tile once, in order; it need not be straight (ruling 1347).
// The water it was dragged over (the middle of its first stretch of water) is crossed along the drag's own row or column (a bent line's: the way it
// went furthest), from the first dry land on one side to the first on the other; if that crossing cannot be laid as it is, the drag snaps to the nearest
// one that can, within FERRY_FIND.snap tiles. The verdict is judgeCrossing's ({ ok, reason, water, landings: [[x, y], [x, y]] in the drag's direction,
// vertical, stubs, roads, cost, at, snapped }); a refusal carries at, the tile it is about, for Show me. The reasons, in the order they are judged:
//   'ferry_no_water'  the line has no water on it
//   'ferry_bridge'    4 tiles of water or fewer there: a bridge does it (the road tool)
//   'ferry_too_wide'  more than FERRY.max tiles of water there
//   'ferry_no_land'   the water runs to the map's edge, or a landing's tile is taken (a building, a road, a wall, hills) with no crossing near to snap to
//   'ferry_no_road'   a landing could have no road: none beside either and the network out of a stub's reach, or no room for the far stub
//   'no_gold'         the treasury cannot pay the landings and the road
// ('ferry_bent' is 7.1's and is no longer given: a bent line is read along the way it went furthest.)
export function previewFerry(world, tiles) {
  const refuse = (reason, extra = {}) => ({ ok: false, reason, water: 0, landings: [], vertical: false, stubs: [[], []], roads: [], at: null, cost: 0, snapped: false, ...extra });
  const list = [];
  for (const t of tiles) if (!list.length || list[list.length - 1][0] !== t[0] || list[list.length - 1][1] !== t[1]) list.push([t[0], t[1]]);
  const runs = bridgeRuns(world, list);
  if (!runs.length) return refuse('ferry_no_water');
  const first = list[0], last = list[list.length - 1];
  const straight = list.length > 1 && (list.every((t) => t[0] === first[0]) || list.every((t) => t[1] === first[1]));
  const vertical = straight ? list.every((t) => t[0] === first[0]) : Math.abs(last[1] - first[1]) > Math.abs(last[0] - first[0]);
  const run = runs[0];
  const anchor = list[run.from + Math.floor((run.to - run.from) / 2)];
  const along = vertical ? 1 : 0;
  const cell = (b) => (vertical ? [anchor[0], b] : [b, anchor[1]]);
  let lo = anchor[along], hi = anchor[along];
  while (isWater(world, ...cell(lo - 1))) lo--;
  while (isWater(world, ...cell(hi + 1))) hi++;
  const water = hi - lo + 1;
  if (water <= BRIDGE_MAX) return refuse('ferry_bridge', { water, at: cell(lo) });
  if (water > FERRY.max) return refuse('ferry_too_wide', { water, at: cell(lo) });
  const e0 = cell(lo - 1), e1 = cell(hi + 1);
  if (!inBounds(world.size, ...e0) || !inBounds(world.size, ...e1)) return refuse('ferry_no_land', { water, at: inBounds(world.size, ...e0) ? cell(hi) : cell(lo) });
  // The drag's direction along the axis: the way from its first tile to its last (on its water when they are level).
  const dirOf = (axis) => Math.sign(last[axis] - first[axis]) || Math.sign(list[run.to][axis] - list[run.from][axis]) || 1;
  const orient = (plan) => {
    const backwards = dirOf(plan.vertical ? 1 : 0) < 0;
    if (!backwards) return plan;
    return { ...plan, landings: [plan.landings[1], plan.landings[0]], stubs: [plan.stubs[1], plan.stubs[0]], near: 1 - plan.near };
  };
  const ends = dirOf(along) < 0 ? [e1, e0] : [e0, e1];
  const { net, list: candidates } = candidatesOf(world);
  if (freeLand(world, ...e0) && freeLand(world, ...e1)) {
    const plan = planCrossing(world, net, ends, vertical, water);
    if (plan) return judgeCrossing(world, plan, { snapped: false });
  }
  // Snap (ruling 1347): the nearest crossing the map has room for whose water lies within FERRY_FIND.snap tiles of the anchor; the drag's own axis wins
  // a tie, then the narrower water, then the map's order.
  let best = null;
  for (const c of candidates) {
    const w = crossingWater(c);
    const xs = w.map((t) => t[0]), ys = w.map((t) => t[1]);
    const dx = Math.max(0, Math.min(...xs) - anchor[0], anchor[0] - Math.max(...xs)), dy = Math.max(0, Math.min(...ys) - anchor[1], anchor[1] - Math.max(...ys));
    const d = Math.max(dx, dy);
    if (d > FERRY_FIND.snap) continue;
    const rank = [d, c.vertical === vertical ? 0 : 1, c.water];
    const better = !best || rank[0] < best.rank[0] || (rank[0] === best.rank[0] && (rank[1] < best.rank[1] || (rank[1] === best.rank[1] && rank[2] < best.rank[2])));
    if (better) best = { c, rank };
  }
  if (best) return judgeCrossing(world, orient(best.c), { snapped: true });
  const taken = ends.find((t) => !freeLand(world, ...t));
  if (taken) return refuse('ferry_no_land', { water, landings: ends, vertical, at: taken });
  return refuse('ferry_no_road', { water, landings: ends, vertical, at: ends[0] });
}
