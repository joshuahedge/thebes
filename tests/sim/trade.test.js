import { describe, it, expect } from '../harness.js';
import { PARTNERS, PRICE_DRIFT } from '../../src/data/trade.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import {
  openRoute, setTradeOrder, tradeMonth, tradePrices, nextCaravanDay, postConnected, drawDrift, partnerUnlocked, openRoutes,
} from '../../src/sim/trade.js';
import { runMonth } from '../../src/sim/clock.js';
import { routeCostOf } from '../../src/sim/costs.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// A Market town on a 32-tile map: a road along y = 10 joined down x = 31 to the trade entry at (31, 31), a
// trading post on it at (20, 8) and a storehouse and a granary within its 16 road tiles.
function market({ post = true } = {}) {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  w.milestone = 'market_town';
  const store = addRaw(w, 'storehouse', 16, 8);
  const granary = addRaw(w, 'granary', 12, 8);
  const tp = post ? addRaw(w, 'trading_post', 20, 8) : null;
  staffAll(w);
  return { w, store, granary, tp };
}

// The same, with the Memphis route open and its gift already given, on the first caravan day.
function withRoute() {
  const m = market();
  m.w.trade.routes.memphis = { since: 0, gifted: true };
  m.w.day = 90;
  return m;
}

describe('sim trade', () => {
  it('opens a route once the partner is unlocked and a trading post stands, for its cost at the city\'s difficulty', () => {
    const { w } = market({ post: false });
    expect(openRoute(w, 'atlantis')).toEqual({ ok: false, reason: 'unknown_partner', warnings: [] });
    w.milestone = 'town';
    expect(partnerUnlocked(w, 'memphis')).toBe(false);
    expect(openRoute(w, 'memphis').reason).toBe('locked');
    w.milestone = 'market_town';
    expect(openRoute(w, 'memphis').reason).toBe('no_post');
    const tp = addRaw(w, 'trading_post', 20, 8);
    w.gold = -300;                                                         // 300 more would pass the debt floor of -500
    expect(openRoute(w, 'memphis').reason).toBe('no_gold');
    w.gold = 1000;
    expect(openRoute(w, 'memphis')).toEqual({ ok: true, cost: PARTNERS.memphis.routeCost, warnings: [] });
    expect(w.gold).toBe(700);
    expect(w.trade.routes.memphis).toEqual({ since: 0, gifted: false });
    expect(openRoutes(w)).toBe(1);
    expect(openRoute(w, 'memphis').reason).toBe('already_open');
    expect(openRoute(w, 'byblos').reason).toBe('locked');                 // Byblos waits for the Great city
    w.milestone = 'great_city';
    w.difficulty = 'hard';
    expect(routeCostOf(w, 'byblos')).toBe(750);
    w.road[idx(w.size, 31, 20)] = 0;                                       // cut the way to the trade entry
    w.roadVersion++;
    expect(postConnected(w)).toBe(false);
    expect(openRoute(w, 'byblos')).toEqual({ ok: true, cost: 750, warnings: ['not_connected'] });
    expect(w.gold).toBe(-50);
    const relaxed = market().w;
    relaxed.difficulty = 'relaxed';
    expect(openRoute(relaxed, 'memphis').cost).toBe(240);
    expect(tp.type).toBe('trading_post');
  });
  it('takes a buy, sell or ignore order per good with a whole number to keep', () => {
    const { w } = market();
    expect(setTradeOrder(w, 'pottery', 'sell', 20)).toEqual({ ok: true, warnings: [] });
    expect(setTradeOrder(w, 'clay', 'buy', 0)).toEqual({ ok: true, warnings: [] });
    expect(w.trade.orders).toEqual({ pottery: { mode: 'sell', keep: 20 }, clay: { mode: 'buy', keep: 0 } });
    expect(setTradeOrder(w, 'pottery', 'ignore', 20).ok).toBe(true);
    expect(w.trade.orders.pottery).toEqual({ mode: 'ignore', keep: 20 });  // the level is kept for later
    expect(setTradeOrder(w, 'gold_dust', 'sell', 1).reason).toBe('unknown_good');
    expect(setTradeOrder(w, 'pottery', 'swap', 1).reason).toBe('bad_mode');
    expect(setTradeOrder(w, 'pottery', 'sell', -1).reason).toBe('bad_keep');
    expect(setTradeOrder(w, 'pottery', 'sell', 2.5).reason).toBe('bad_keep');
    expect(w.trade.orders.pottery).toEqual({ mode: 'ignore', keep: 20 });
  });
  it('sells only what is above the level to keep and buys only up to it, from and into stores near the post', () => {
    const { w, store } = withRoute();
    store.store = { pottery: 60, clay: 10 };
    setTradeOrder(w, 'pottery', 'sell', 20);
    setTradeOrder(w, 'clay', 'buy', 30);
    setTradeOrder(w, 'figs', 'ignore', 50);
    expect(tradePrices(w, 'memphis')).toEqual({ buys: { grain: 1, pottery: 8, beer: 10 }, sells: { clay: 2, figs: 3, barley: 3 } });
    const events = [];
    tradeMonth(w, events);
    expect(events).toEqual([{ type: 'caravan', partner: 'memphis', sold: { pottery: 40 }, bought: { clay: 20 }, income: 320, spent: 40, gift: null }]);
    expect(store.store).toEqual({ pottery: 20, clay: 30 });
    expect(w.gold).toBe(1000 + 320 - 40);
    w.day = 180;
    tradeMonth(w, events);
    expect(events[1]).toEqual({ type: 'caravan', partner: 'memphis', sold: {}, bought: {}, income: 0, spent: 0, gift: null });   // nothing above or below the levels
  });
  it('never takes the treasury below zero, and spends the caravan\'s own takings first', () => {
    const { w, store } = withRoute();
    setTradeOrder(w, 'clay', 'buy', 100);
    w.gold = 25;
    tradeMonth(w);
    expect([store.store.clay, w.gold]).toEqual([12, 1]);                   // 12 clay at 2 gold: 24 of the 25
    w.day = 180;
    w.gold = -50;
    tradeMonth(w);
    expect([store.store.clay, w.gold]).toEqual([12, -50]);                 // in debt: buys nothing
    w.day = 270;
    store.store.pottery = 10;
    setTradeOrder(w, 'pottery', 'sell', 0);
    tradeMonth(w);
    expect([store.store.pottery, store.store.clay, w.gold]).toEqual([0, 27, 0]);   // -50 + 80 for the pottery leaves 30: 15 clay
  });
  it('carries at most a quarter of each yearly quota per visit, and no more than the quota in a year', () => {
    const { w, store } = withRoute();
    store.store = { pottery: 500 };
    setTradeOrder(w, 'pottery', 'sell', 0);
    const sold = [];
    for (const day of [90, 180, 270]) {
      w.day = day;
      const events = [];
      tradeMonth(w, events);
      sold.push(events[0].sold.pottery);
    }
    expect(sold).toEqual([50, 50, 50]);                                    // a quarter of Memphis's 200
    expect(w.trade.used.memphis.pottery).toBe(150);
    w.trade.used.memphis.pottery = 180;
    w.day = 330;                                                           // not a caravan month: nothing moves
    tradeMonth(w);
    expect(store.store.pottery).toBe(350);
    w.day = 270;
    const events = [];
    tradeMonth(w, events);
    expect(events[0].sold).toEqual({ pottery: 20 });                       // the last 20 of this year's 200
    w.day = 360;                                                           // a new year: the quota starts again
    tradeMonth(w, events);
    expect([w.trade.year, events[1].sold.pottery, w.trade.used.memphis.pottery]).toEqual([2, 50, 50]);
  });
  it('brings the first caravan\'s gift once, into stores near the post', () => {
    const { w, store, granary } = market();
    w.trade.routes.memphis = { since: 0, gifted: false };
    w.day = 90;
    const events = [];
    tradeMonth(w, events);
    expect(events[0].gift).toEqual({ good: PARTNERS.memphis.gift.good, n: 40 });
    expect(store.store.clay).toBe(40);
    expect(w.trade.routes.memphis.gifted).toBe(true);
    w.day = 180;
    tradeMonth(w, events);
    expect([events[1].gift, store.store.clay]).toEqual([null, 40]);
    const full = market();
    full.store.store = { pottery: 790 };                                   // room for 10 of the 800
    full.w.trade.routes.memphis = { since: 0, gifted: false };
    full.w.day = 90;
    const ev = [];
    tradeMonth(full.w, ev);
    expect([ev[0].gift, full.store.store.clay]).toEqual([{ good: 'clay', n: 10 }, 10]);
    expect(granary.store).toEqual({});                                     // clay never goes to a granary
    full.store.store.pottery = 0;                                          // room again: the other 30 come next time
    full.w.day = 180;
    tradeMonth(full.w, ev);
    expect([ev[1].gift, full.store.store.clay, full.w.trade.routes.memphis.gifted]).toEqual([{ good: 'clay', n: 30 }, 40, true]);
    full.w.day = 270;
    tradeMonth(full.w, ev);
    expect([ev[2].gift, full.store.store.clay]).toEqual([null, 40]);
  });
  it('keeps the gift until there is room for it near the post, then brings it once', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    setRoad(w, 31, 10, 31, 31);
    w.milestone = 'market_town';
    addRaw(w, 'trading_post', 20, 8);
    staffAll(w);
    w.trade.routes.memphis = { since: 0, gifted: false };
    w.day = 90;
    const events = [];
    tradeMonth(w, events);                                                 // no store near the post: nothing lands
    expect([events.length, events[0].gift, w.trade.routes.memphis.gifted]).toEqual([1, null, false]);
    const store = addRaw(w, 'storehouse', 16, 8);
    staffAll(w);
    w.day = 180;
    tradeMonth(w, events);
    expect([events[1].gift, store.store.clay, w.trade.routes.memphis.gifted]).toEqual([{ good: 'clay', n: 40 }, 40, true]);
    w.day = 270;
    tradeMonth(w, events);
    expect([events[2].gift, store.store.clay]).toEqual([null, 40]);
  });
  it('drifts prices each new year by at most 10%, the same for the same seed and year', () => {
    expect(drawDrift(1, 2)).toEqual(drawDrift(1, 2));
    expect(JSON.stringify(drawDrift(1, 2)) === JSON.stringify(drawDrift(2, 2))).toBe(false);
    expect(JSON.stringify(drawDrift(1, 2)) === JSON.stringify(drawDrift(1, 3))).toBe(false);
    for (const year of [2, 3, 4, 5]) {
      for (const [id, goods] of Object.entries(drawDrift(7, year))) {
        expect(Object.keys(goods).sort()).toEqual([...Object.keys(PARTNERS[id].buys), ...Object.keys(PARTNERS[id].sells)].sort());
        for (const d of Object.values(goods)) { expect(d).toBeGreaterThanOrEqual(-PRICE_DRIFT); expect(d).toBeLessThanOrEqual(PRICE_DRIFT); }
      }
    }
    const { w } = market();
    w.day = 360;
    tradeMonth(w);
    expect([w.trade.year, w.trade.used]).toEqual([2, {}]);
    expect(w.trade.drift).toEqual(drawDrift(w.seed, 2));
    for (const id of Object.keys(PARTNERS)) {
      const prices = tradePrices(w, id);
      for (const side of ['buys', 'sells']) {
        for (const [good, t] of Object.entries(PARTNERS[id][side])) {
          expect(prices[side][good]).toBeGreaterThanOrEqual(Math.max(1, Math.round(t.price * (1 - PRICE_DRIFT))));
          expect(prices[side][good]).toBeLessThanOrEqual(Math.round(t.price * (1 + PRICE_DRIFT)));
        }
      }
    }
  });
  it('sends no caravan while the post is unstaffed, paused or not joined to the trade entry', () => {
    const { w, store, tp } = withRoute();
    store.store = { pottery: 100 };
    setTradeOrder(w, 'pottery', 'sell', 0);
    const events = [];
    tp.staff = 0;
    tradeMonth(w, events);
    tp.staff = BUILDINGS.trading_post.workers;
    tp.paused = true;
    tradeMonth(w, events);
    tp.paused = false;
    w.road[idx(w.size, 31, 20)] = 0;
    w.roadVersion++;
    expect(postConnected(w)).toBe(false);
    tradeMonth(w, events);
    expect([events, store.store.pottery, w.tally.caravans]).toEqual([[], 100, 0]);
    w.road[idx(w.size, 31, 20)] = 1;
    w.roadVersion++;
    expect(postConnected(w)).toBe(true);
    tradeMonth(w, events);
    expect(events.length).toBe(1);
    const closed = market();
    closed.w.day = 90;
    tradeMonth(closed.w, events);                                          // no route open: no caravan
    expect(events.length).toBe(1);
  });
  it('runs at month ends through the clock and counts caravans, goods and trade income in the tallies', () => {
    const { w, store } = withRoute();
    store.store = { pottery: 70 };
    setTradeOrder(w, 'pottery', 'sell', 10);
    setTradeOrder(w, 'clay', 'buy', 15);
    w.day = 60;
    const events = [];
    runMonth(w, events);
    expect(events.some((e) => e.type === 'caravan')).toBe(false);
    w.day = 90;
    runMonth(w, events);
    expect(events.filter((e) => e.type === 'caravan')).toEqual([{ type: 'caravan', partner: 'memphis', sold: { pottery: 50 }, bought: { clay: 15 }, income: 400, spent: 30, gift: null }]);
    expect([w.tally.sold, w.tally.bought, w.tally.tradeIncome, w.tally.caravans]).toEqual([50, 15, 400, 1]);
    expect([nextCaravanDay({ day: 0 }), nextCaravanDay({ day: 89 }), nextCaravanDay({ day: 90 }), nextCaravanDay({ day: 100 })]).toEqual([90, 90, 180, 180]);
  });
});
