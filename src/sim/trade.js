// Trade (spec 4.15). A trading post joined by road to the trade entry lets the city open a route to each partner
// once its milestone is reached. Every CARAVAN_EVERY_MONTHS months, at a month end, each open route sends a caravan:
// the first one brings a gift, then it buys the city's goods above the level to keep (per good, mode 'sell') and
// sells the city goods up to that level (mode 'buy'), at most a quarter of each yearly quota per visit, never taking
// the treasury below zero, moving goods from and to stores within TRADE_REACH road tiles of the post. Prices drift
// each year within PRICE_DRIFT, seeded by the city's seed and the year, so the same city always sees the same prices.
//
// world.trade: routes { partnerId: { since: day, gifted, giftLanded } } (giftLanded: gift units stored so far, set
// by the first caravan), orders { good: { mode, keep } }, drift { partnerId: { good: fraction } } (no entry means no
// drift), used { partnerId: { good: units this year } }, year (the year the quota and drift belong to).
import { PARTNERS, CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH } from '../data/trade.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { adjacentRoadTiles, buildingsInReach } from './reach.js';
import { isWorking } from './labour.js';
import { atLeast } from './progression.js';
import { canAfford, spend } from './money.js';
import { routeCostOf } from './costs.js';
import { storeAccepts, storeTotal } from './production.js';
import { createRng, hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

export const TRADE_MODES = ['buy', 'sell', 'ignore'];

const fail = (reason) => ({ ok: false, reason, warnings: [] });
const CARAVAN_DAYS = CARAVAN_EVERY_MONTHS * DAYS_PER_MONTH;
const yearOf = (day) => Math.floor(Math.floor(day / DAYS_PER_MONTH) / MONTHS_PER_YEAR) + 1;

// Whether the city has reached the partner's milestone.
export const partnerUnlocked = (world, partnerId) => Boolean(PARTNERS[partnerId]) && atLeast(world, PARTNERS[partnerId].milestone);

const posts = (world) => allBuildings(world).filter((b) => b.type === 'trading_post');

// True when the road from this footprint joins the trade entry: a walk along road tiles from the tiles beside it
// reaches the entry tile (any distance).
function joinsEntry(world, b) {
  const { x: ex, y: ey } = world.tradeEntry;
  if (!inBounds(world.size, ex, ey)) return false;
  const goal = idx(world.size, ex, ey);
  if (!world.road[goal]) return false;
  const seen = new Set(adjacentRoadTiles(world, b));
  const queue = [...seen];
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    if (t === goal) return true;
    const x = t % world.size, y = (t - x) / world.size;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const n = idx(world.size, nx, ny);
      if (world.road[n] && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return false;
}

// How many trade routes the city has opened (goals, daily goals).
export const openRoutes = (world) => Object.values(world.trade.routes).filter(Boolean).length;

// True when some trading post, working or not, is joined by road to the trade entry.
export const postConnected = (world) => posts(world).some((p) => joinsEntry(world, p));

// The post caravans come to: the first (lowest id) trading post that works and is joined to the trade entry.
export const activePost = (world) => posts(world).find((p) => isWorking(world, p) && joinsEntry(world, p)) || null;

// Why no caravan will come, or null when one will (exactly when activePost finds a post): 'no_post', 'not_connected'
// (no post is joined by road to the trade entry), 'paused' (every joined post is paused) or 'short_staffed' (a joined
// post is not paused but has under a quarter of its workers).
export function caravanBlocker(world) {
  const all = posts(world);
  if (!all.length) return 'no_post';
  const joined = all.filter((p) => joinsEntry(world, p));
  if (!joined.length) return 'not_connected';
  if (joined.some((p) => isWorking(world, p))) return null;
  return joined.some((p) => !p.paused) ? 'short_staffed' : 'paused';
}

// The post the city's trade is counted at: the one caravans come to, else the first post (null with no post).
export const tradePost = (world) => activePost(world) || posts(world)[0] || null;

// Today's prices: what the partner pays for each good it buys, and asks for each good it sells, after this
// year's drift, in whole gold (never below 1). Stage 4: a good with from (Memphis's stone) is listed only from that
// milestone (ruling 255), here and so in the caravans and the trade sheet.
export function tradePrices(world, partnerId) {
  const p = PARTNERS[partnerId];
  const drift = world.trade.drift[partnerId] || {};
  const price = (good, base) => Math.max(1, Math.round(base * (1 + (drift[good] || 0))));
  const side = (list) => Object.fromEntries(Object.entries(list).filter(([, t]) => !t.from || atLeast(world, t.from)).map(([good, t]) => [good, price(good, t.price)]));
  return { buys: side(p.buys), sells: side(p.sells) };
}

// The day of the next caravan month end: caravans come at the end of every CARAVAN_EVERY_MONTHS-th month.
export const nextCaravanDay = (world) => (Math.floor(world.day / CARAVAN_DAYS) + 1) * CARAVAN_DAYS;

// This year's drift for every partner and good, from the city's seed and the year alone.
export function drawDrift(seed, year) {
  const rng = createRng(Math.floor(hash2(seed, year, 7349) * 4294967296));
  const drift = {};
  for (const [id, p] of Object.entries(PARTNERS)) {
    drift[id] = {};
    for (const good of [...Object.keys(p.buys), ...Object.keys(p.sells)]) drift[id][good] = Math.round(rng.range(-PRICE_DRIFT, PRICE_DRIFT) * 1000) / 1000;
  }
  return drift;
}

// Why a route cannot be opened now, or null when it can: the one rule openRoute follows and the trade sheet reads.
// The partner exists and is not open yet, its milestone is reached, a trading post stands, and the cost (scaled by
// difficulty) is affordable (the treasury may go as far into debt as every other purchase allows).
export function routeBlocker(world, partnerId) {
  if (!PARTNERS[partnerId]) return 'unknown_partner';
  if (world.trade.routes[partnerId]) return 'already_open';
  if (!partnerUnlocked(world, partnerId)) return 'locked';
  if (!posts(world).length) return 'no_post';
  if (!canAfford(world, routeCostOf(world, partnerId))) return 'no_gold';
  return null;
}

// Opens the route to a partner (see routeBlocker). A route that opens while no post is joined to the trade entry
// warns 'not_connected'.
export function openRoute(world, partnerId) {
  const reason = routeBlocker(world, partnerId);
  if (reason) return fail(reason);
  const cost = routeCostOf(world, partnerId);
  spend(world, cost);
  world.trade.routes[partnerId] = { since: world.day, gifted: false };
  return { ok: true, cost, warnings: postConnected(world) ? [] : ['not_connected'] };
}

// What caravans do with one good: 'buy' (the city buys it up to keep), 'sell' (the city sells it above keep) or
// 'ignore'. keep is a whole number of units, 0 or more.
export function setTradeOrder(world, good, mode, keep) {
  if (!GOODS[good]) return fail('unknown_good');
  if (!TRADE_MODES.includes(mode)) return fail('bad_mode');
  if (!Number.isInteger(keep) || keep < 0) return fail('bad_keep');
  world.trade.orders[good] = { mode, keep };
  return { ok: true, warnings: [] };
}

const storesOf = (b, good) => (BUILDINGS[b.type].stores || []).includes(good);

// How much of a good the stores in the post's reach hold.
function stockNear(world, post, good) {
  return buildingsInReach(world, post, TRADE_REACH, (o) => storesOf(o, good)).reduce((n, { b }) => n + (b.store[good] || 0), 0);
}

// How much of a good a caravan can count and take: what the stores within reach of the trade post hold (0 with no post).
export const tradeStock = (world, good, post = tradePost(world)) => (post ? stockNear(world, post, good) : 0);

// Takes up to n of a good from the stores in the post's reach, nearest first; returns how many it took.
function takeNear(world, post, good, n) {
  let left = n;
  for (const { b } of buildingsInReach(world, post, TRADE_REACH, (o) => storesOf(o, good) && (o.store[good] || 0) > 0)) {
    const k = Math.min(left, b.store[good]);
    b.store[good] -= k;
    left -= k;
    if (left <= 0) break;
  }
  return n - left;
}

// Room for a good in the working stores in the post's reach that accept it.
const roomIn = (b) => BUILDINGS[b.type].capacity - storeTotal(b);
const targetsNear = (world, post, good) =>
  buildingsInReach(world, post, TRADE_REACH, (o) => storeAccepts(o, good) && isWorking(world, o) && roomIn(o) > 0).map((e) => e.b);
const roomNear = (world, post, good) => targetsNear(world, post, good).reduce((n, b) => n + roomIn(b), 0);

// Puts up to n of a good into those stores, nearest first; returns how many it put.
function putNear(world, post, good, n) {
  let left = n;
  for (const b of targetsNear(world, post, good)) {
    const k = Math.min(left, roomIn(b));
    b.store[good] = (b.store[good] || 0) + k;
    left -= k;
    if (left <= 0) break;
  }
  return n - left;
}

// One caravan from an open route, at the given post. Returns the gold the city paid it.
function caravan(world, partnerId, post, events) {
  const p = PARTNERS[partnerId];
  const route = world.trade.routes[partnerId];
  const used = world.trade.used[partnerId] || (world.trade.used[partnerId] = {});
  const prices = tradePrices(world, partnerId);
  const room = (good, side) => Math.max(0, Math.min(Math.floor(p[side][good].quota / 4), p[side][good].quota - (used[good] || 0)));
  let gift = null;
  if (!route.gifted) {                                   // the gift waits for room near the post, and no part comes twice
    const n = putNear(world, post, p.gift.good, p.gift.n - (route.giftLanded || 0));
    route.giftLanded = (route.giftLanded || 0) + n;
    route.gifted = route.giftLanded >= p.gift.n;
    if (n > 0) gift = { good: p.gift.good, n };
  }
  const sold = {}, bought = {};
  let income = 0, spent = 0;
  for (const good of Object.keys(p.buys)) {
    const order = world.trade.orders[good];
    if (!order || order.mode !== 'sell') continue;
    const n = takeNear(world, post, good, Math.min(room(good, 'buys'), Math.max(0, stockNear(world, post, good) - order.keep)));
    if (n <= 0) continue;
    sold[good] = n;
    used[good] = (used[good] || 0) + n;
    income += n * prices.buys[good];
  }
  world.gold += income;
  for (const good of Object.keys(prices.sells)) {   // Stage 4: only the goods listed now (a good with from waits for its milestone)
    const order = world.trade.orders[good];
    if (!order || order.mode !== 'buy') continue;
    const price = prices.sells[good];
    const want = Math.min(room(good, 'sells'), Math.max(0, order.keep - stockNear(world, post, good)), roomNear(world, post, good), Math.floor(Math.max(0, world.gold) / price));
    const n = want > 0 ? putNear(world, post, good, want) : 0;
    if (n <= 0) continue;
    bought[good] = n;
    used[good] = (used[good] || 0) + n;
    spent += n * price;
    world.gold -= n * price;
  }
  const t = world.tally;
  t.sold += Object.values(sold).reduce((a, b) => a + b, 0);
  t.bought += Object.values(bought).reduce((a, b) => a + b, 0);
  t.tradeIncome += income;
  t.caravans += 1;
  if (events) events.push({ type: 'caravan', partner: partnerId, sold, bought, income, spent, gift });
  return spent;
}

// The month-end trade step (runMonth): a new year resets the quotas used and redraws the drift; on a caravan
// month every open route sends a caravan, in PARTNERS order, if a working trading post is joined to the trade entry.
// Returns the gold the city paid caravans this month (the summary's purchases).
export function tradeMonth(world, events = null) {
  const t = world.trade;
  const year = yearOf(world.day);
  if (year !== t.year) {
    t.year = year;
    t.used = {};
    t.drift = drawDrift(world.seed, year);
  }
  if (world.day % CARAVAN_DAYS !== 0) return 0;
  const open = Object.keys(PARTNERS).filter((id) => t.routes[id]);
  if (!open.length) return 0;
  const post = activePost(world);
  if (!post) return 0;
  return open.reduce((spent, id) => spent + caravan(world, id, post, events), 0);
}
