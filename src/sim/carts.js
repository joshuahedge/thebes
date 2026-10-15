// Stage 4.7 (Task 5, ruling 466): storehouse orders and carts, in the sim. A storehouse or granary can be set to Fetch a good it may store, up to
// an amount. One cart per store, staffed by the store's own workers, hauls up to CARTS.perTrip of the good a trip from the nearest other store
// (by road distance, bridges count, any distance) that holds some above its own fetch order, at CARTS.speed road tiles a game day each way. The
// goods leave the source when the cart sets out and arrive when it comes home. The numbers are data (src/data/s47.js CARTS), the shapes are the
// contract note's (docs/superpowers/notes/2026-10-14-stage-4-7-contract.md, sections 4 and 12), the words are src/ui/text.js S47_CARTS_TEXT.
//
// Everything here is pure and deterministic: no clock, no random draw (ties go to the lower store id), nothing kept outside the world but
// caches keyed on roadVersion.
import { BUILDINGS } from '../data/buildings.js';
import { HOUSEHOLD_GOODS } from '../data/goods.js';
import { CARTS } from '../data/s47.js';
import { MAX_TIER } from '../data/housing.js';
import { allBuildings, housesOf } from './world.js';
import { roadReach, reachDistance, touchesRoad, adjacentRoadTiles } from './reach.js';
import { storeTotal, storeAccepts } from './production.js';
import { isWorking } from './labour.js';
import { bazaarsByHouse, monthlyNeed } from './distribution.js';
import { wantedNeeds } from './housing.js';
import { NEIGHBOURS4 } from './grid.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });

export const isStore = (b) => Boolean(b && BUILDINGS[b.type] && BUILDINGS[b.type].stores);
export const storesOf = (world) => allBuildings(world).filter(isStore);
export const storeById = (world, id) => { const b = world.buildings[id]; return isStore(b) ? b : null; };
export const cartOf = (world, storeId) => world.carts.find((c) => c.id === storeId) || null;

// What a store has of a good, what it is ordered to hold, and what it can spare for another store: the amount above its own order.
export const heldOf = (b, good) => b.store[good] || 0;
export const orderOf = (b, good) => (b.orders && b.orders[good]) || null;
export const surplusOf = (b, good) => Math.max(0, heldOf(b, good) - (orderOf(b, good) ? orderOf(b, good).fetch : 0));
// The orders a store has, in the order of the goods it stores: [{ good, fetch }].
export const ordersOf = (b) => (isStore(b) ? BUILDINGS[b.type].stores.filter((g) => orderOf(b, g)).map((g) => ({ good: g, fetch: b.orders[g].fetch })) : []);

// Road tiles between two stores, along the roads: the nearest pair of road tiles beside them, the first one counted (a store beside the same road
// tile as another is 1 away). Infinity when no road joins them. Worked from the first store's reach map, kept per road version (reach.js).
export function roadLen(world, a, b) {
  return reachDistance(roadReach(world, a, Infinity), world, b);
}

// Days a cart is on the road. Each leg takes at least a day; the round trip is its length both ways at CARTS.speed, rounded up to a whole day.
export const legDays = (len) => Math.max(1, Math.ceil(len / CARTS.speed));
export function tripTimes(len, day) {
  const turn = day + legDays(len);
  return { turn, due: Math.max(turn + 1, day + Math.ceil((2 * len) / CARTS.speed)) };
}
// Days the whole round trip takes, as the sim counts it (the due day less the day it sets out).
export const roundTripDays = (len) => tripTimes(len, 0).due;

// The eight compass words from one point to another (y grows to the south, as the raids' directions and the score's say it).
export function compass(dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return null;
  const ns = dy < 0 ? 'north' : 'south', ew = dx > 0 ? 'east' : 'west';
  if (ay <= ax * 0.4142) return ew;
  if (ax <= ay * 0.4142) return ns;
  return `${ns}_${ew}`;
}
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
export const directionTo = (from, to) => { const a = centreOf(from), c = centreOf(to); return compass(c.x - a.x, c.y - a.y); };

const burning = (b) => Boolean(b.fire && b.fire.stage === 'fire');

// The nearest other store that can spare the good: it is built to hold it, is linked to the home by road, and holds some above its own fetch order
// (so a store is never drawn below what it fetches itself and two stores fetching a good never pass it back and forth). Ties go to the lower id.
// stores: the world's stores, when the caller has them. Returns { b, len, surplus } or null.
export function findSource(world, home, good, stores = storesOf(world)) {
  const rm = roadReach(world, home, Infinity);
  let best = null;
  for (const o of stores) {
    if (o.id === home.id || burning(o) || !BUILDINGS[o.type].stores.includes(good)) continue;
    const surplus = surplusOf(o, good);
    if (surplus < 1) continue;
    const len = reachDistance(rm, world, o);
    if (!Number.isFinite(len)) continue;
    if (!best || len < best.len || (len === best.len && o.id < best.b.id)) best = { b: o, len, surplus };
  }
  return best;
}

const holdsGoods = (c) => c.state === 'out' || c.state === 'back' || (c.state === 'return' && c.dest === 'source');
// Room a store has for more goods (all its goods share the capacity).
export const roomOf = (b) => Math.max(0, BUILDINGS[b.type].capacity - storeTotal(b));

// A store can send a cart when it works (not paused, not burning, enough of its staff) and a road touches it.
export const canStaff = (world, b) => isWorking(world, b) && touchesRoad(world, b);

// ── Commands ──

// Sets or changes an order: the store fetches `good` up to `amount` (CARTS.defaultFetch when not given). Refusals: 'nothing_here', 'not_storage'
// (not a store), 'cannot_store' (a good the store may not hold), 'refuses' (the storehouse's accept switch for the good is off), 'bad_amount'
// (a whole number from 1 to the store's capacity; max in the result), 'no_source' (no other store linked by road holds the good above its own
// order; a store that already has the order may change its amount with none). { ok: true, fetch, source: { id, len } | null, warnings: [] }.
export function setFetch(world, id, good, amount = CARTS.defaultFetch) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  if (!isStore(b)) return fail('not_storage');
  const def = BUILDINGS[b.type];
  if (!def.stores.includes(good)) return fail('cannot_store', { good });
  if (!storeAccepts(b, good)) return fail('refuses', { good });
  if (!Number.isInteger(amount) || amount < 1 || amount > def.capacity) return fail('bad_amount', { good, max: def.capacity });
  const source = findSource(world, b, good);
  if (!source && !orderOf(b, good)) return fail('no_source', { good });
  if (!b.orders) b.orders = {};
  b.orders[good] = { fetch: amount };
  return { ok: true, fetch: amount, source: source ? { id: source.b.id, len: source.len } : null, warnings: [] };
}

// Takes an order off. A cart already on the road finishes its trip and brings what it carries home.
export function clearFetch(world, id, good) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  if (!isStore(b)) return fail('not_storage');
  if (!orderOf(b, good)) return fail('no_order', { good });
  delete b.orders[good];
  return { ok: true, warnings: [] };
}

// Goods on the road, for a store's sheet so they never seem to vanish: what left this store on a cart and has not come home (leaving: [{ good, amount, to }],
// to the store it is bound for) and what is coming to this store (arriving: [{ good, amount, from }]). A cart that turned back with its goods carries them to the
// source (state 'return', dest 'source'); one turned back on the way out has already put them back on the shelf (nothing on the road).
export function roadGoods(world, id) {
  const leaving = [], arriving = [];
  for (const c of world.carts) {
    if (!holdsGoods(c)) continue;
    const bound = c.state === 'return' ? c.from : c.to;
    const typeOf = (sid) => (world.buildings[sid] ? world.buildings[sid].type : null);
    if (c.from === id && bound !== id) leaving.push({ good: c.good, amount: c.amount, to: bound, type: typeOf(bound) });
    if (bound === id) arriving.push({ good: c.good, amount: c.amount, from: c.from === id ? null : c.from, type: c.from === id ? null : typeOf(c.from), back: c.state === 'return' });
  }
  return { leaving, arriving };
}

// Why no order can be set for a good although some store holds it: the nearest other store (by the straight line between their centres, the lower id on a tie) that
// is built to hold the good and holds some, with why it cannot be drawn on: 'unlinked' (no road joins it to this store) or 'kept' (it holds no more than its own
// order for the good). null when no other store holds any, or one can be drawn on (then there is a source, not a refusal). For the refusal's Show me.
export function holderOf(world, id, good) {
  const b = world.buildings[id];
  if (!isStore(b) || findSource(world, b, good)) return null;
  const c = centreOf(b);
  let best = null;
  for (const o of storesOf(world)) {
    if (o.id === id || !BUILDINGS[o.type].stores.includes(good) || heldOf(o, good) < 1) continue;
    const oc = centreOf(o), d = Math.abs(oc.x - c.x) + Math.abs(oc.y - c.y);
    if (!best || d < best.d || (d === best.d && o.id < best.b.id)) best = { b: o, d };
  }
  if (!best) return null;
  return { id: best.b.id, type: best.b.type, why: Number.isFinite(roadLen(world, b, best.b)) ? 'kept' : 'unlinked' };
}

// ── What the interface says (the words are text.js's; these are the parts, from the sim) ──

// The consequence of an order before it is set: one cart, perTrip a trip, from the nearest store that can spare the good, len road tiles, days
// each way. { good, fetch, perTrip, held, state: 'full' | 'no_room' | null, source: { id, type, len, days, roundTrip, dir, spare, keeps } | null, staffed }. source is null when no store can spare it (the order
// would be refused).
export function fetchPreview(world, id, good, amount = CARTS.defaultFetch) {
  const b = world.buildings[id];
  if (!isStore(b)) return null;
  const found = findSource(world, b, good);
  const held = heldOf(b, good);
  return {
    good, fetch: amount, perTrip: CARTS.perTrip, speed: CARTS.speed,
    held, state: held >= amount ? 'full' : roomOf(b) < 1 ? 'no_room' : null,   // the live status's 'full' and 'no_room' (fetchStatus), so the line before the tap and the line after agree
    source: found ? {
      id: found.b.id, type: found.b.type, len: found.len, days: legDays(found.len), roundTrip: roundTripDays(found.len), dir: directionTo(b, found.b),
      spare: found.surplus, keeps: orderOf(found.b, good) ? orderOf(found.b, good).fetch : 0,   // what it can give, and what it keeps for its own order (0: no order of its own, so it can be emptied)
    } : null,
    staffed: canStaff(world, b),
  };
}

// The order's live status for the store sheet. state:
//   'out' | 'back' | 'return'   a cart of this order is on the road (amount carried, days to its due day, the source it goes to, len, dir)
//   'other'                     the store's one cart is on the road for another good, or another order goes first
//   'full'                      the store already holds the amount
//   'refused'                   the store's accept switch for the good is off
//   'unstaffed'                 no cart: the store is paused, burning, without a road or short of workers (staff, workers in the result)
//   'no_room'                   no cart: the store has no room for more
//   'no_source'                 no cart: no other store can spare the good
//   'ready'                     a cart will set out at the next day's work (source, len, dir)
// { good, fetch, held, state, amount, days, source: { id, type, len, dir } | null, staff, workers }.
export function fetchStatus(world, id, good) {
  const b = world.buildings[id];
  const order = isStore(b) ? orderOf(b, good) : null;
  if (!order) return null;
  const out = { good, fetch: order.fetch, held: heldOf(b, good), state: 'ready', amount: 0, days: 0, source: null, staff: b.staff, workers: BUILDINGS[b.type].workers };
  const cart = cartOf(world, id);
  const describe = (src, len) => (src ? { id: src.id, type: src.type, len, dir: directionTo(b, src) } : null);
  if (cart && cart.good === good) {
    const src = storeById(world, cart.from);
    return { ...out, state: cart.state, amount: cart.amount, days: Math.max(0, cart.due - world.day), source: describe(src, cart.len) };
  }
  if (cart) return { ...out, state: 'other' };
  if (out.held >= order.fetch) return { ...out, state: 'full' };
  if (!storeAccepts(b, good)) return { ...out, state: 'refused' };
  if (!canStaff(world, b)) return { ...out, state: 'unstaffed' };
  if (roomOf(b) < 1) return { ...out, state: 'no_room' };
  const found = findSource(world, b, good);
  if (!found) return { ...out, state: 'no_source' };
  const next = nextTrip(world, b);
  if (next && next.good !== good) return { ...out, state: 'other' };   // another order goes first: this one waits its turn
  return { ...out, state: 'ready', amount: Math.min(CARTS.perTrip, order.fetch - out.held, found.surplus, roomOf(b)), days: legDays(found.len), source: describe(found.b, found.len) };
}

// The store the order's goods come from, for Show me: the cart's source while one is on the road for the good, else the store it would draw on.
export function fetchSourceId(world, id, good) {
  const b = world.buildings[id];
  if (!isStore(b)) return null;
  const cart = cartOf(world, id);
  if (cart && cart.good === good && storeById(world, cart.from)) return cart.from;
  const found = findSource(world, b, good);
  return found ? found.b.id : null;
}

// Whether the Fetch control is on offer: any store stands (the granary comes with the Village, the storehouse with the Town).
export const cartsUnlocked = (world) => allBuildings(world).some(isStore);

// ── The road a cart takes ──

const pathCache = new WeakMap();   // world -> { version, paths: Map }
// The road tiles from the home store's door to the source's, as tile indices, home first; null when no road joins them or a store is gone. Its
// length is the cart's len while the roads are as they were. Cached per road version.
export function cartPath(world, cart) {
  const home = storeById(world, cart.to), src = storeById(world, cart.from);
  if (!home || !src) return null;
  let c = pathCache.get(world);
  if (!c || c.version !== world.roadVersion) { c = { version: world.roadVersion, paths: new Map() }; pathCache.set(world, c); }
  const key = `${home.id}>${src.id}`;
  if (c.paths.has(key)) return c.paths.get(key);
  const dist = roadReach(world, home, Infinity);
  let best = null, bestD = Infinity;
  for (const t of adjacentRoadTiles(world, src)) { const d = dist.get(t); if (d !== undefined && d < bestD) { best = t; bestD = d; } }
  let path = null;
  if (best !== null) {
    path = [best];
    let t = best, d = bestD;
    while (d > 1) {
      const x = t % world.size, y = (t - x) / world.size;
      let next = null;
      for (const [dx, dy] of NEIGHBOURS4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= world.size || ny >= world.size) continue;
        const nt = nx + ny * world.size;
        if (dist.get(nt) === d - 1) { next = nt; break; }
      }
      if (next === null) { path = null; break; }
      path.push(next); t = next; d--;
    }
    if (path) path.reverse();
  }
  c.paths.set(key, path);
  return path;
}

// How far along its route from home (0) to the source (1) a cart is on a day: out, from 0 up to 1 on its turn day; back, from 1 down to 0 on its
// due day; return, from where it turned (at / len) to where it is going (dest).
export function cartFraction(cart, day) {
  const len = Math.max(1, cart.len), span = (a, b) => Math.min(1, Math.max(0, (day - a) / Math.max(1, b - a)));
  if (cart.state === 'out') return span(cart.left, cart.turn);
  if (cart.state === 'back') return 1 - span(cart.turn, cart.due);
  const from = Math.min(1, (cart.at || 0) / len), to = cart.dest === 'home' ? 0 : 1;
  return from + (to - from) * span(cart.turn, cart.due);
}

// ── The day's work ──

// Puts what a cart carries on the shelves of the stores listed (a missing one is skipped), each up to its room. Returns what went into each (puts,
// in the order listed) and what fitted nowhere (lost).
function land(world, cart, targets) {
  let left = cart.amount;
  const puts = targets.map((t) => {
    if (!t || left <= 0) return 0;
    const put = Math.min(left, roomOf(t));
    if (put <= 0) return 0;
    t.store[cart.good] = heldOf(t, cart.good) + put;
    left -= put;
    return put;
  });
  return { puts, lost: left };
}

const lostEvent = (events, cart, lost) => { if (events && lost > 0) events.push({ type: 'cartLost', id: cart.id, good: cart.good, amount: lost }); };

// One cart's day. Returns true while the cart stays on the road. What happens when something on the way changes (documented in the contract
// note, section 12):
//  - the home store is gone: the cart goes with it; what it carried goes back to the source's shelf (to the extent it fits; with no source,
//    or no room, it is lost);
//  - the source is gone: the goods are already in the cart (they left the source when it set out), so the cart finishes its trip home;
//  - the road between them is cut (home and source no longer linked): the cart turns round (state 'return'). On the way out the goods go back
//    on the source's shelf at once; on the way back it carries them to the source, and they are put down there on its due day;
//  - the home has less room on arrival than at the start: what fits is put down and the rest goes back to the source (else it is lost).
function advance(world, c, events) {
  const home = storeById(world, c.to), src = storeById(world, c.from), day = world.day;
  if (!home) {
    if (holdsGoods(c)) lostEvent(events, c, land(world, c, [src]).lost);
    return false;
  }
  // A cart on its way back whose day has come lands first: it is home, so a road cut that day changes nothing (no turning round at the door).
  const arriving = c.state === 'back' && day >= c.due;
  if (!arriving && (c.state === 'out' || c.state === 'back') && src && !Number.isFinite(roadLen(world, home, src))) {
    const leg = c.state === 'out' ? c.left : c.turn;
    const travelled = Math.min(c.len, Math.max(0, (day - leg) * CARTS.speed));
    if (c.state === 'out') {
      Object.assign(c, { dest: 'home', at: travelled });
      lostEvent(events, c, land(world, c, [src]).lost);   // the goods never left the shelf in the end
    } else {
      Object.assign(c, { dest: 'source', at: c.len - travelled });
    }
    Object.assign(c, { state: 'return', turn: day, due: day + Math.ceil(travelled / CARTS.speed) });
    if (events) events.push({ type: 'cartTurned', id: c.id, good: c.good, amount: c.amount });
  }
  if (c.state === 'out' && day >= c.turn) c.state = 'back';
  if (c.state === 'back' && day >= c.due) {
    const { puts, lost } = land(world, c, [home, src]);
    if (puts[0] > 0) {
      world.tally.cartTrips += 1;
      world.tally.cartGoods += puts[0];
      if (events) events.push({ type: 'cartHome', id: c.id, good: c.good, amount: puts[0] });
    }
    lostEvent(events, c, lost);
    return false;
  }
  if (c.state === 'return' && day >= c.due) {
    if (c.dest === 'source') lostEvent(events, c, land(world, c, [src, home]).lost);
    return false;
  }
  return true;
}

// Sets out a cart from a store, when it has an order to fill, a free cart and the staff for it. The order with the biggest share of its amount
// still to fetch goes first (so one good cannot starve another of the one cart); it takes the nearest source that can spare the good, and the
// trip carries what is wanted, what the source can spare and what fits at home, up to CARTS.perTrip.
// The order a free, staffed cart would serve now: { good, found, amount } or null. The day's dispatch and the order's status line both use it, so
// the words name the order that really goes first.
export function nextTrip(world, home, stores = storesOf(world)) {
  if (cartOf(world, home.id) || !canStaff(world, home)) return null;
  const room = roomOf(home);
  if (room < 1) return null;
  const wanting = ordersOf(home)
    .map((o) => ({ ...o, gap: o.fetch - heldOf(home, o.good) }))
    .filter((o) => o.gap > 0 && storeAccepts(home, o.good))
    .sort((p, q) => q.gap / q.fetch - p.gap / p.fetch);   // stable: ties keep the store's own order of goods
  for (const o of wanting) {
    const found = findSource(world, home, o.good, stores);
    if (!found) continue;
    const amount = Math.min(CARTS.perTrip, o.gap, found.surplus, room);
    if (amount < 1) continue;
    return { good: o.good, found, amount };
  }
  return null;
}
function dispatch(world, home, stores) {
  const trip = nextTrip(world, home, stores);
  if (!trip) return;
  const { good, found, amount } = trip;
  found.b.store[good] -= amount;
  const { turn, due } = tripTimes(found.len, world.day);
  world.carts.push({ id: home.id, from: found.b.id, to: home.id, good, amount, len: found.len, left: world.day, turn, due, state: 'out' });
}

// Every day (tickDay, after the producers): the carts on the road move on, then the stores with an order and a free cart send one.
export function cartDay(world, events = null) {
  if (world.carts.length) {
    const keep = world.carts.filter((c) => advance(world, c, events));
    world.carts.length = 0;
    world.carts.push(...keep);
  }
  const stores = storesOf(world);
  if (!stores.some((b) => b.orders && Object.keys(b.orders).length)) return;
  for (const home of stores) if (home.orders && Object.keys(home.orders).length) dispatch(world, home, stores);
}

// ── Homes waiting on a good a far store holds ──

// The house tip (ruling 466): homes whose next or present tier asks for a household good they have not got a month of, that a bazaar reaches but
// that no bazaar can draw (neither a stall holds it nor a store in the bazaar's supply reach holds it), while a store somewhere else, linked by
// road to one of those bazaars, holds it. The good with the most such homes wins (ties go in the goods' own order). Returns null, or
// { good, homes: [ids], count, far: the store holding it nearest to a bazaar that reaches them, len: road tiles from that bazaar, bazaar: its id }.
// Only the household goods are looked at (pottery, beer, linen, jewellery): the foods are eaten from grain and figs the farms put in granaries
// beside the homes' bazaars, and a missing food is a farm's problem, not a cart's.
export function farGoodTip(world) {
  const waiting = new Map();   // good -> homes
  for (const h of housesOf(world)) {
    if (h.tier < 1 || h.residents < 1) continue;
    const wants = wantedNeeds(h);
    const grows = Math.max(h.tier, Math.min(h.tier + 1, MAX_TIER));   // stocked for the tier it grows into (ruling 471), as topUpHouse does
    for (const g of HOUSEHOLD_GOODS) {
      if (wants.includes(g) && (h.stock[g] || 0) < monthlyNeed(h, g, grows)) {
        if (!waiting.has(g)) waiting.set(g, []);
        waiting.get(g).push(h);
      }
    }
  }
  if (!waiting.size) return null;
  const bazaars = bazaarsByHouse(world);
  const stores = storesOf(world);
  const reachOf = new Map();   // bazaar id -> its supply reach map
  const supplied = (bz, g) => {
    if (heldOf(bz, g) > 0) return true;
    const def = BUILDINGS[bz.type];
    if (!reachOf.has(bz.id)) reachOf.set(bz.id, roadReach(world, bz, def.supplyReach));
    const rm = reachOf.get(bz.id);
    return stores.some((s) => BUILDINGS[s.type].stores.includes(g) && heldOf(s, g) > 0 && reachDistance(rm, world, s) <= def.supplyReach);
  };
  let best = null;
  for (const g of HOUSEHOLD_GOODS) {
    const homes = (waiting.get(g) || []).filter((h) => {
      const list = bazaars.get(h.id);
      return list && list.length && !list.some(({ b }) => supplied(b, g));
    });
    if (!homes.length || (best && homes.length <= best.count)) continue;
    // the nearest store holding it, from a bazaar that reaches one of the homes
    const baz = new Map();
    for (const h of homes) for (const { b } of bazaars.get(h.id)) baz.set(b.id, b);
    let far = null;
    for (const bz of [...baz.values()].sort((p, q) => p.id - q.id)) {
      const rm = roadReach(world, bz, Infinity);
      for (const s of stores) {
        if (!BUILDINGS[s.type].stores.includes(g) || heldOf(s, g) < 1) continue;
        const len = reachDistance(rm, world, s);
        if (Number.isFinite(len) && (!far || len < far.len || (len === far.len && s.id < far.far))) far = { far: s.id, len, bazaar: bz.id };
      }
    }
    if (far) best = { good: g, homes: homes.map((h) => h.id), count: homes.length, ...far };
  }
  return best;
}
