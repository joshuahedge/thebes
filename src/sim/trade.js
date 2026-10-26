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
//
// Version 7.0, Track T (rulings 870-899): Nubia and Punt come by river (PARTNERS[id].by === 'river'): their route needs a Quay to open,
// and their boats land at the first working Quay (activeQuay) and trade with the stores within TRADE_REACH of it, as a caravan does at the
// trading post, on the same day and quota rules. Every caravan and boat obeys the route's switches and what trade holds back
// (src/sim/tradeRules.js), and writes what it paid and was paid into world.trade.ledger (src/data/trade.js), which the Trade sheet reads
// for last year's profit. setTradeSwitch and setKeepAtLeast are the Trade sheet's commands.
import { PARTNERS, CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH, QUAY_TYPE, TRADE_SIDES, partnerBy } from '../data/trade.js';
import { BUILDINGS } from '../data/buildings.js';
import { hasRiver } from '../data/map.js';
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
import { ferryEdges } from './ferries.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';
import { tradeAllowed, heldBack } from './tradeRules.js';

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
  const links = ferryEdges(world);   // Version 7.1 (Track F): a running ferry joins the roads on its two banks
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    if (t === goal) return true;
    for (const e of links.get(t) || []) if (!seen.has(e.to)) { seen.add(e.to); queue.push(e.to); }
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

// ── Version 7.0 (Track T): the Quay, where river partners' boats land (ruling 872) ──
export const quays = (world) => allBuildings(world).filter((b) => b.type === QUAY_TYPE);
const quayRoad = (world, q) => adjacentRoadTiles(world, q).length > 0;
// The Quay boats come to: the first (lowest id) that works and has a road beside it (its goods go by road to the stores), or null.
export const activeQuay = (world) => quays(world).find((q) => isWorking(world, q) && quayRoad(world, q)) || null;
// Why no boat will land, or null when one will (exactly when activeQuay finds one): 'no_quay', 'no_road' (no Quay has a road beside it),
// 'paused' (every Quay with a road is paused) or 'short_staffed' (one is not paused but has under a quarter of its workers).
export function quayBlocker(world) {
  const all = quays(world);
  if (!all.length) return 'no_quay';
  const roaded = all.filter((q) => quayRoad(world, q));
  if (!roaded.length) return 'no_road';
  if (roaded.some((q) => isWorking(world, q))) return null;
  return roaded.some((q) => !q.paused) ? 'short_staffed' : 'paused';
}
// Whether a partner comes by river (a boat to the Quay) rather than by road (a caravan to the trading post).
export const byRiver = (partnerId) => partnerBy(partnerId) === 'river';
// Why this partner's next caravan or boat will not come, or null when it will: caravanBlocker for a road partner, quayBlocker for a river one.
export const arrivalBlocker = (world, partnerId) => (byRiver(partnerId) ? quayBlocker(world) : caravanBlocker(world));
// Where this partner trades: the active trading post (road) or the active Quay (river), or null.
export const arrivalAt = (world, partnerId) => (byRiver(partnerId) ? activeQuay(world) : activePost(world));

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
// difficulty) is affordable (the treasury may go as far into debt as every other purchase allows). Version 7.0 (ruling 872): a river
// partner needs a Quay standing instead of a trading post ('no_quay').
export function routeBlocker(world, partnerId) {
  if (!PARTNERS[partnerId]) return 'unknown_partner';
  if (world.trade.routes[partnerId]) return 'already_open';
  if (byRiver(partnerId) && !hasRiver(world.mapVariant)) return 'no_river';   // Version 8.2 (Track G, ruling 1306): no river reaches the Great oasis: no boat comes
  if (!partnerUnlocked(world, partnerId)) return 'locked';
  if (byRiver(partnerId)) { if (!quays(world).length) return 'no_quay'; }
  else if (!posts(world).length) return 'no_post';
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
  return { ok: true, cost, warnings: byRiver(partnerId) || postConnected(world) ? [] : ['not_connected'] };
}

// ── Version 7.0 (Track T): the Trade sheet's commands (rulings 874, 875) ──
// Turns one good on one side of one route on or off (side as PARTNERS lists it: 'buys', the city sells; 'sells', the city buys). Only an
// off switch is stored (src/data/trade.js); turning it on again removes it, and an empty route or side goes with it.
export function setTradeSwitch(world, partnerId, side, good, on) {
  const p = PARTNERS[partnerId];
  if (!p) return fail('unknown_partner');
  if (!TRADE_SIDES.includes(side)) return fail('bad_side');
  if (!p[side][good]) return fail('unknown_good');
  const all = world.trade.switches;
  if (on) {
    if (all[partnerId] && all[partnerId][side]) {
      delete all[partnerId][side][good];
      if (!Object.keys(all[partnerId][side]).length) delete all[partnerId][side];
      if (!Object.keys(all[partnerId]).length) delete all[partnerId];
    }
  } else {
    const route = all[partnerId] || (all[partnerId] = {});
    (route[side] || (route[side] = {}))[good] = false;
  }
  return { ok: true, warnings: [] };
}

// A good's "Keep at least": the one level the Trade sheet shows (ruling 874), the larger of the 6.0 order's keep and the 7.0 floor. The
// sheet's command writes both, so caravans buy up to it (the order) and never sell below it (the order and the floor) alike.
export const keepAtLeast = (world, good) => Math.max(world.trade.orders[good] ? world.trade.orders[good].keep : 0, world.trade.floors[good] || 0);

// The level a caravan or boat sells a good only above (the caravan's own rule, which the Trade sheet words): the larger of the order's
// keep and what trade holds back (the floor plus what the temple and the court are owed).
export const sellAbove = (world, good) => Math.max(world.trade.orders[good] ? world.trade.orders[good].keep : 0, heldBack(world, good).units);

// Sets a good's Keep at least to n whole units: the floor (absent at 0) and the order's keep, when the good has an order.
export function setKeepAtLeast(world, good, n) {
  if (!GOODS[good]) return fail('unknown_good');
  if (!Number.isInteger(n) || n < 0) return fail('bad_keep');
  if (n > 0) world.trade.floors[good] = n;
  else delete world.trade.floors[good];
  if (world.trade.orders[good]) world.trade.orders[good].keep = n;
  return { ok: true, warnings: [] };
}

// ── Version 7.0 (Track T): the ledger, what each route paid and was paid by year (ruling 874) ──
const emptyBook = () => ({ income: 0, spent: 0 });
function ledgerOf(world) {
  const t = world.trade;
  if (!t.ledger) t.ledger = { year: t.year, now: {}, last: {} };
  return t.ledger;
}
// A new trade year: this year's book becomes last year's (an empty one when the ledger skipped a year).
function rollLedger(t, year) {
  if (!t.ledger || t.ledger.year === year) return;
  t.ledger = { year, now: {}, last: t.ledger.year === year - 1 ? t.ledger.now : {} };
}
// What a route's caravans or boats did for the treasury last trade year, { income, spent, profit }, or null when none came that year.
export function lastYearOf(world, partnerId) {
  const l = world.trade.ledger;
  const r = l && l.last[partnerId];
  return r ? { income: r.income, spent: r.spent, profit: r.income - r.spent } : null;
}
// The same for the year under way so far (null before its first visit).
export function thisYearOf(world, partnerId) {
  const l = world.trade.ledger;
  const r = l && l.year === world.trade.year ? l.now[partnerId] : null;
  return r ? { income: r.income, spent: r.spent, profit: r.income - r.spent } : null;
}

// Whole game months until the next caravan or boat (at least 1: one due today has already come at the month's end).
export const monthsToNextArrival = (world) => Math.max(1, Math.ceil((nextCaravanDay(world) - world.day) / DAYS_PER_MONTH));

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

// One caravan (or, from a river partner, one boat) from an open route, at the given post (or Quay). Returns the gold the city paid it.
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
    if (!tradeAllowed(world, partnerId, good, 'buys')) continue;      // Version 7.0 (Track 0 seam, src/sim/tradeRules.js): the route's switch
    const keep = sellAbove(world, good);                               // and what trade must leave: the floor, the temple's offering, the court's demands
    const n = takeNear(world, post, good, Math.min(room(good, 'buys'), Math.max(0, stockNear(world, post, good) - keep)));
    if (n <= 0) continue;
    sold[good] = n;
    used[good] = (used[good] || 0) + n;
    income += n * prices.buys[good];
  }
  world.gold += income;
  for (const good of Object.keys(prices.sells)) {   // Stage 4: only the goods listed now (a good with from waits for its milestone)
    const order = world.trade.orders[good];
    if (!order || order.mode !== 'buy') continue;
    if (!tradeAllowed(world, partnerId, good, 'sells')) continue;     // Version 7.0 (Track 0 seam): the route's switch
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
  const book = ledgerOf(world).now, rec = book[partnerId] || (book[partnerId] = emptyBook());   // Version 7.0: the route's ledger
  rec.income += income;
  rec.spent += spent;
  if (events) events.push({ type: 'caravan', partner: partnerId, sold, bought, income, spent, gift });
  return spent;
}

// The month-end trade step (runMonth): a new year resets the quotas used and redraws the drift; on a caravan
// month every open route sends a caravan, in PARTNERS order, if a working trading post is joined to the trade entry.
// Returns the gold the city paid caravans this month (the summary's purchases). Version 7.0: a river route's boat lands at the
// active Quay instead (arrivalAt), and the new year turns the ledger's page.
export function tradeMonth(world, events = null) {
  const t = world.trade;
  const year = yearOf(world.day);
  if (year !== t.year) {
    t.year = year;
    t.used = {};
    t.drift = drawDrift(world.seed, year);
    rollLedger(t, year);
  }
  if (world.day % CARAVAN_DAYS !== 0) return 0;
  const open = Object.keys(PARTNERS).filter((id) => t.routes[id]);
  if (!open.length) return 0;
  return open.reduce((spent, id) => {
    const at = arrivalAt(world, id);
    return at ? spent + caravan(world, id, at, events) : spent;
  }, 0);
}
