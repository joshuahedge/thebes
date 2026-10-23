// Version 7.0, Track A (wave 2, rulings 960-974): the two Advice fixes from 6.0 and the Advice items for trade. Track 0 (contract,
// docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left stubs; Track A owns this file and src/sim/advice.js, which asks towerFix from
// towerItem and strandedFix from fixFor (so the house sheet's next step and City advice say the same thing). Pure and deterministic: no memo, no
// randomness, no clock; ties break on fixed orders.
//
//   towerSpotsFor(world, target)        -> [{ x, y }]: the tiles a tower may stand on (the placing rule's own: checkTiles) that a road touches (so it
//                                          can be staffed) and that lie within DEFENCE.towerRange of the target (the building the first band
//                                          strikes, or a point { x, y }: the city's start), nearest first; [] when none
//   towerFix(world, target)             -> { spot: { x, y } } | { road: { x, y, tiles, from } } | null: the tower's spot, else the road that would
//                                          give a free tile in range its road (the end it reaches, the new tiles, the road tile it starts from), else null
//   strandedFix(world, good, bazaar)    -> null, or { item, x, y, len, store, perMonth, maker }: a valid store spot near the bazaar (item: the
//                                          store that keeps the good, a storehouse for a household good), when the good is stored beyond a cart's
//                                          sensible reach of it; len the road tiles to the store that holds it, perMonth what one cart would bring
//   adviceFixItems(world, alerts, out)  the trade Advice items: 'quay' (a river route open and no Quay to land at) and 'trade_floor' (a Keep at least
//                                          level that holds back sales while the treasury runs out), pushed onto cityAdvice's list (src/sim/v70.js)
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { DEFENCE } from '../data/raids.js';
import { ADVICE } from '../data/advice.js';
import { ADVICE_FIX } from '../data/adviceFixes.js';
import { CARTS } from '../data/s47.js';
import { PARTNERS, QUAY_TYPE, CARAVAN_EVERY_MONTHS } from '../data/trade.js';
import { GOODS } from '../data/goods.js';
import { allBuildings, buildingsVersion } from './world.js';
import { checkTiles } from './commands.js';
import { routeRoad } from './route.js';
import { isUnlocked } from './progression.js';
import { roadReach, reachDistance } from './reach.js';
import { roundTripDays } from './carts.js';
import { costOf } from './costs.js';
import { canAfford } from './money.js';
import { inBounds, idx } from './grid.js';
import { T as TERRAIN } from './terrain.js';
import { inOasisPool } from './oases.js';
import { DAYS_PER_MONTH } from './time.js';
import { monthForecast } from './economy.js';
import { byRiver, quays, tradePost, arrivalAt, tradeStock, tradePrices, keepAtLeast, sellAbove } from './trade.js';
import { tradeAllowed, heldBack } from './tradeRules.js';
import { goodStoresFor } from './housing.js';

// A target is a building (x, y, w, d: its centre) or a point { x, y } (itself).
const centreOf = (t) => (t.w === undefined ? { x: t.x, y: t.y } : { x: t.x + t.w / 2, y: t.y + t.d / 2 });
const centreOfBuilding = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// ── Raid towers: where a tower defends ──

// The tiles a tower may stand on within range of the target, with a road beside them, in the order Show me's own search finds them (src/ui/placement.js nearestFit: the rings
// round the tile a tower centred on the target starts on, nearest ring first, then the nearer, then the upper row and the left column), so where that search already lands a
// tower in range the advice names the same tile, and where it would land one out of range the advice names the first in range. The range is the one Advice already counts a
// guarding tower by (centre to centre within DEFENCE.towerRange), so a spot counts the moment the tower works.
export function towerSpotsFor(world, target) {
  if (!target || !world) return [];
  const c = centreOf(target), R = DEFENCE.towerRange;
  const sx = Math.round(c.x - 0.5), sy = Math.round(c.y - 0.5);
  const out = [];
  for (let y = Math.floor(c.y - R) - 1; y <= Math.ceil(c.y + R); y++) {
    for (let x = Math.floor(c.x - R) - 1; x <= Math.ceil(c.x + R); x++) {
      if (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) > R || checkTiles(world, 'tower', x, y) !== null) continue;
      out.push({ x, y, ring: Math.max(Math.abs(x - sx), Math.abs(y - sy)), near: (x - sx) ** 2 + (y - sy) ** 2 });
    }
  }
  out.sort((a, b) => a.ring - b.ring || a.near - b.near || a.y - b.y || a.x - b.x);
  return out.map(({ x, y }) => ({ x, y }));
}

// The k road tiles nearest a tile (Manhattan, then reading order) within `max` tiles of it: [{ x, y, d }].
function nearRoads(world, x, y, max, k) {
  const found = [];
  for (let r = 0; r <= max && found.length < k; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = x + dx, ty = y + dy;
        if (inBounds(world.size, tx, ty) && world.road[idx(world.size, tx, ty)]) found.push({ x: tx, y: ty, d: Math.abs(dx) + Math.abs(dy) });
      }
    }
  }
  return found.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x).slice(0, k);
}

// With no tile in range that a road touches: the free tiles in range that lack only the road (checkTiles says 'needs_road'), each with a free tile beside
// it the road may end at, and the road tool's own Route from there to one of the nearest road tiles (src/sim/route.js routeRoad: round buildings and water the way
// the road tool goes, the tiles and the price it would charge). The fewest new tiles wins (then the cheaper, then the end nearest the target, then reading
// order): { x, y: the road's end, tiles: how many it lays, cost, from: the road tile it joins, spot: the tower's tile }. null when no road can reach any.
function roadToSpot(world, target) {
  const c = centreOf(target), R = DEFENCE.towerRange;
  const ends = new Map();
  for (let y = Math.floor(c.y - R) - 1; y <= Math.ceil(c.y + R); y++) {
    for (let x = Math.floor(c.x - R) - 1; x <= Math.ceil(c.x + R); x++) {
      const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
      if (d > R || checkTiles(world, 'tower', x, y) !== 'needs_road') continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const ex = x + dx, ey = y + dy;
        if (!inBounds(world.size, ex, ey) || world.road[idx(world.size, ex, ey)] || world.occ[idx(world.size, ex, ey)] || ends.has(`${ex},${ey}`)) continue;
        const roads = nearRoads(world, ex, ey, ADVICE_FIX.roadSearch, ADVICE_FIX.roadsTried);
        if (roads.length) ends.set(`${ex},${ey}`, { ex, ey, spot: { x, y }, d, roads, near: roads[0].d });
      }
    }
  }
  const tries = [...ends.values()].sort((a, b) => a.near - b.near || a.d - b.d || a.spot.y - b.spot.y || a.spot.x - b.spot.x || a.ey - b.ey || a.ex - b.ex);
  let best = null;
  for (const t of tries.slice(0, ADVICE_FIX.endsTried)) {
    for (const rd of t.roads) {
      const r = routeRoad(world, t.ex, t.ey, rd.x, rd.y);
      if (!r.ok && r.reason !== 'no_gold') continue;       // a price the treasury cannot pay is the bar's to say, not the road's fault
      if (r.tiles.length > 0 && (!best || r.tiles.length < best.tiles || (r.tiles.length === best.tiles && r.cost < best.cost))) best = { x: t.ex, y: t.ey, tiles: r.tiles.length, cost: r.cost, from: { x: rd.x, y: rd.y }, spot: t.spot };
    }
  }
  return best;
}

// What the fix for a tower defending `target` is: its spot (a tile a road touches, in range), else the road to give one a road, else null.
export function towerFix(world, target) {
  const spots = towerSpotsFor(world, target);
  if (spots.length) return { spot: spots[0], spots: spots.length };
  const road = roadToSpot(world, target);
  return road ? { road } : null;
}

// ── Stranded goods: a store by the bazaar ──

// The building type that keeps a good: the first whose stores list holds it (src/sim/advice.js storeFor, without its import).
const storeTypeOf = (good) => Object.keys(BUILDINGS).find((t) => (BUILDINGS[t].stores || []).includes(good)) || null;
const makerTypeOf = (good) => Object.keys(BUILDINGS).find((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good) || null;

// What one cart brings in a month from a store `len` road tiles away: CARTS.perTrip a trip, as many round trips as the month holds (the sim's own
// trip days: src/sim/carts.js roundTripDays).
export const cartMonthly = (len) => CARTS.perTrip * Math.floor(DAYS_PER_MONTH / roundTripDays(len));
// The most a cart must bring a month for a far store to be worth fetching from: ADVICE_FIX.strandedOrders of the default Fetch order.
export const sensibleMonthly = () => ADVICE_FIX.strandedOrders * CARTS.defaultFetch;

// The store holding the good nearest the bazaar by road: { store, len }, the lower id on a tie, or null (none linked by road holds any).
function holderNear(world, good, bazaar) {
  const rm = roadReach(world, bazaar, Infinity);
  let best = null;
  for (const s of allBuildings(world)) {
    if (!(BUILDINGS[s.type].stores || []).includes(good) || !((s.store[good] || 0) > 0)) continue;
    const len = reachDistance(rm, world, s);
    if (Number.isFinite(len) && (!best || len < best.len || (len === best.len && s.id < best.store.id))) best = { store: s, len };
  }
  return best;
}

// The free spot for a store (type) the bazaar draws from: a tile the placing rule accepts, with a road beside it, within the bazaar's supply reach by road
// (goodStoresFor: so the bazaar sees what it holds). A spot a working maker of the good also reaches comes first (what it makes goes into it: the maker's
// producer reach), then the nearest to the bazaar (straight distance between centres, then reading order). { x, y, maker: the id it serves, or null }, or null.
function searchStoreSpot(world, type, bazaar, good) {
  const reach = BUILDINGS[bazaar.type].supplyReach;
  const rm = roadReach(world, bazaar, reach);
  if (!rm.size) return null;
  const { w, d } = dimsOf(type);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of rm.keys()) { const tx = t % world.size, ty = (t - tx) / world.size; x0 = Math.min(x0, tx); y0 = Math.min(y0, ty); x1 = Math.max(x1, tx); y1 = Math.max(y1, ty); }
  const makerType = makerTypeOf(good);
  const makers = makerType ? allBuildings(world).filter((b) => b.type === makerType && !b.paused).map((b) => ({ b, rm: roadReach(world, b, BUILDINGS[makerType].producerReach) })) : [];
  const cx = bazaar.x + bazaar.w / 2, cy = bazaar.y + bazaar.d / 2;
  let best = null;
  for (let y = y0 - d; y <= y1 + 1; y++) {
    for (let x = x0 - w; x <= x1 + 1; x++) {
      if (checkTiles(world, type, x, y) !== null) continue;
      const foot = { x, y, w, d };
      if (reachDistance(rm, world, foot) > reach) continue;
      const m = makers.find((o) => reachDistance(o.rm, world, foot) <= BUILDINGS[makerType].producerReach);
      const key = [m ? 0 : 1, (x + w / 2 - cx) ** 2 + (y + d / 2 - cy) ** 2, y, x];
      if (!best || before(key, best.key)) best = { x, y, maker: m ? m.b.id : null, key };
    }
  }
  return best ? { x: best.x, y: best.y, maker: best.maker } : null;
}
// One answer per place while nothing that decides it has changed: every home that waits on the same far good asks the same question at every reading of the advice. The key
// holds everything the search reads (the buildings, the roads, the walls, the milestone's unlocks, which makers work: a paused maker reaches nothing); the ground is fixed.
const spotMemo = new WeakMap();   // world -> { key, spots: Map 'type|good|bazaar id|makers' -> spot }
function storeSpot(world, type, bazaar, good) {
  const key = `${buildingsVersion(world)}|${world.roadVersion}|${world.wallVersion}|${world.milestone}`;
  let m = spotMemo.get(world);
  if (!m || m.key !== key) { m = { key, spots: new Map() }; spotMemo.set(world, m); }
  const makerType = makerTypeOf(good);
  const working = makerType ? allBuildings(world).filter((b) => b.type === makerType && !b.paused).map((b) => b.id).join(',') : '';
  const k = `${type}|${good}|${bazaar.id}|${bazaar.x},${bazaar.y}|${working}`;
  if (!m.spots.has(k)) m.spots.set(k, searchStoreSpot(world, type, bazaar, good));
  return m.spots.get(k);
}
// Whether sort key a (a list of numbers) comes before b.
function before(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

// A good held only in a store beyond the bazaar's supply reach (housing.js good_far), with no store that keeps it standing by the bazaar, whose nearest holder a cart
// would bring too little from (under one default order a month: cartMonthly against sensibleMonthly): { item, x, y, len, store, perMonth, maker } with a valid spot for the
// store by the bazaar, else null. A store within a cart's sensible reach stays a Fetch order's to answer (fetchStoreFor); so does a good once a store stands by the
// bazaar (the store is laid: the Fetch order is next), a good whose store is locked and a bazaar with no room for one.
export function strandedFix(world, good, bazaar) {
  if (!world || !good || !bazaar || !BUILDINGS[bazaar.type] || !BUILDINGS[bazaar.type].supplyReach) return null;
  const item = storeTypeOf(good);
  if (!item || !isUnlocked(world, item)) return null;
  if (goodStoresFor(world, bazaar, good).length) return null;   // a store that keeps the good already stands by the bazaar, empty or not: the Fetch order is the next step (fetchStoreFor), not another store
  const far = holderNear(world, good, bazaar);
  if (!far) return null;
  const perMonth = cartMonthly(far.len);
  if (perMonth >= sensibleMonthly()) return null;
  const spot = storeSpot(world, item, bazaar, good);
  return spot ? { item, x: spot.x, y: spot.y, len: far.len, store: far.store.id, perMonth, maker: spot.maker } : null;
}

// ── Trade: the Quay and the Keep at least level ──

// Where a Quay may stand, nearest the trading post (else the city's start): the water tile nearest it that is a river's (never an oasis pool: fit.js
// refuses it), then the origin and turn beside it the placing rule accepts. A spot a road touches comes first; one that lacks only the road (laid after, as
// the building tool allows) is the fallback. { x, y, rot, road: whether a road already touches it } or null when no bank has room.
export function quaySpot(world) {
  if (!world || !world.terrain) return null;
  const post = tradePost(world);
  const from = post ? centreOfBuilding(post) : world.focus ? { x: world.focus.x + 0.5, y: world.focus.y + 0.5 } : { x: world.size / 2, y: world.size / 2 };
  const water = [];
  for (let y = 0; y < world.size; y++) {
    for (let x = 0; x < world.size; x++) {
      if (world.terrain[idx(world.size, x, y)] !== TERRAIN.WATER || inOasisPool(world, x, y)) continue;
      water.push({ x, y, d: Math.hypot(x + 0.5 - from.x, y + 0.5 - from.y) });
    }
  }
  water.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  let roadless = null;   // the nearest bank with room that lacks only a road (the building tool lets it through, the road comes after)
  for (const t of water) {
    for (const rot of [0, 1]) {
      const { w, d } = dimsOf(QUAY_TYPE, rot);
      for (let y = t.y - d; y <= t.y + 1; y++) {
        for (let x = t.x - w; x <= t.x + 1; x++) {
          const why = checkTiles(world, QUAY_TYPE, x, y, rot);
          if (why === null) return { x, y, rot, road: true };
          if (why === 'needs_road' && !roadless) roadless = { x, y, rot, road: false };
        }
      }
    }
  }
  return roadless;
}

// The goods a route would sell today if "Keep at least" were nothing, and the Keep at least level holds back instead: per good the partner paying most,
// { good, partner, at: 'post' | 'quay', level, stock, blocked, price, gold }; only the player's own level counts (what the temple and the court are owed is
// held back in any case: heldBack). Read from the caravan's own numbers (src/sim/trade.js): its room, the stock near its landing and sellAbove.
export function heldBackSales(world) {
  const out = [];
  for (const good of Object.keys(GOODS)) {
    const order = world.trade.orders[good];
    if (!order || order.mode !== 'sell') continue;
    const level = keepAtLeast(world, good);
    if (level <= 0) continue;
    const held = heldBack(world, good), owed = held.temple + held.court;
    let best = null;
    for (const id of Object.keys(PARTNERS)) {
      if (!world.trade.routes[id] || !tradeAllowed(world, id, good, 'buys')) continue;
      const price = tradePrices(world, id).buys[good];
      const site = arrivalAt(world, id);
      if (price === undefined || !site) continue;
      const quota = PARTNERS[id].buys[good].quota, used = (world.trade.used[id] || {})[good] || 0;
      const room = Math.max(0, Math.min(Math.floor(quota / 4), quota - used));
      const stock = tradeStock(world, good, site);
      const blocked = Math.min(room, Math.max(0, stock - owed)) - Math.min(room, Math.max(0, stock - sellAbove(world, good)));
      if (blocked >= 1 && (!best || blocked * price > best.gold)) best = { good, partner: id, at: byRiver(id) ? 'quay' : 'post', level, stock, blocked, price, gold: blocked * price };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.gold - a.gold);
}

// The Quay item: a river route is open (its gold paid) and no Quay stands for its boats. Show me starts the Quay where one fits (quaySpot).
function quayItem(world, out) {
  const open = Object.keys(PARTNERS).filter((id) => world.trade.routes[id] && byRiver(id));
  if (!open.length || quays(world).length) return;
  const spot = isUnlocked(world, QUAY_TYPE) ? quaySpot(world) : null;
  const { w, d } = dimsOf(QUAY_TYPE, spot ? spot.rot : 0);
  const cost = costOf(world, QUAY_TYPE);
  out.push({
    key: 'quay', kind: 'quay', weight: ADVICE_FIX.quay, count: open.length, id: null, data: { partners: open, noSpot: !spot },
    fix: spot ? { item: QUAY_TYPE, at: 'near', target: { x: spot.x + w / 2, y: spot.y + d / 2 }, rot: spot.rot } : null,
    cost: spot ? cost : null, afford: spot ? canAfford(world, cost) : null,
  });
}

// The Keep at least item: sales held back while the treasury runs out within the forecast's amber months (the treasury item's own condition: income is
// what the city lacks). Weighs the gold of a visit's held-back sales spread over the months between visits, in the treasury's points.
function floorItem(world, out) {
  const f = monthForecast(world);
  if (!f.active || !f.runsOut) return;
  const goods = heldBackSales(world);
  if (!goods.length) return;
  const gold = goods.reduce((n, g) => n + g.gold, 0);
  const weight = Math.max(1, Math.round(gold / CARAVAN_EVERY_MONTHS / ADVICE.goldPerPoint)) * (f.goesBelow ? ADVICE.goldSoon : 1);
  out.push({
    key: 'trade_floor', kind: 'trade_floor', weight, count: goods.length, id: null,
    data: { goods, gold, monthsLeft: f.monthsLeft, soon: f.goesBelow, net: f.net, have: f.gold },
    fix: { view: 'summary', section: 'trade', target: null }, cost: null, afford: null,
  });
}

export function adviceFixItems(world, alerts, out) {
  quayItem(world, out);
  floorItem(world, out);
}
