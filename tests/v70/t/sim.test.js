// Version 7.0, Track T (rulings 870-899): trade by river and the rules every caravan and boat obeys. Nubia and Punt come by river to a
// Quay; the switches, Keep at least, and what is held back for the great temple and the court are honoured by the sim; the ledger keeps
// last year's profit per route. Each rule is set up both ways (floor met or not, offering held or not).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { PARTNERS, ARBITRAGE_MARGIN, QUAY_TYPE, INCENSE_GOOD, TRADE_SALT, isTradeSettings, partnerBy } from '../../../src/data/trade.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { GOODS, RAW_GOODS } from '../../../src/data/goods.js';
import { TIERS } from '../../../src/data/housing.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { DIFFICULTIES } from '../../../src/data/difficulty.js';
import {
  routeBlocker, openRoute, tradeMonth, setTradeOrder, setTradeSwitch, setKeepAtLeast, keepAtLeast, activeQuay, quayBlocker, arrivalBlocker,
  lastYearOf, thisYearOf, monthsToNextArrival, byRiver,
} from '../../../src/sim/trade.js';
import { tradeAllowed, heldBack } from '../../../src/sim/tradeRules.js';
import { canPlace } from '../../../src/sim/commands.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

// A Capital on a 32-tile map with the river along its top three rows, a Quay on the bank at (20, 3) with a road beside it (y = 4) that runs
// down to the main road (y = 10, on to the trade entry), and a storehouse in reach of both. No trading post unless asked for.
function riverCity({ post = false, quay = true } = {}) {
  const w = makeTestWorld({ gold: 5000 });
  for (let y = 0; y < 3; y++) for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  setRoad(w, 16, 4, 24, 4);
  setRoad(w, 16, 4, 16, 10);
  w.milestone = 'capital';
  const store = addRaw(w, 'storehouse', 17, 8);
  const q = quay ? addRaw(w, QUAY_TYPE, 20, 3) : null;
  const p = post ? addRaw(w, 'trading_post', 22, 8) : null;
  staffAll(w);
  return { w, store, q, p };
}
const caravanDay = (w) => { w.day = 90; };

describe('v70 t partners and the Quay', () => {
  it('adds Nubia at Capital and Punt at Great Capital, by river, after Memphis and Byblos', () => {
    expect(Object.keys(PARTNERS)).toEqual(['memphis', 'byblos', 'nubia', 'punt']);
    expect(['memphis', 'byblos', 'nubia', 'punt'].map(partnerBy)).toEqual(['road', 'road', 'river', 'river']);
    expect([PARTNERS.nubia.milestone, PARTNERS.punt.milestone]).toEqual(['capital', 'great_capital']);
    for (const id of ['nubia', 'punt']) expect(MILESTONES.some((m) => m.id === PARTNERS[id].milestone)).toBe(true);
    // Nubia sells stone and gems more cheaply than Memphis and Byblos, and buys grain and linen.
    expect(PARTNERS.nubia.sells.stone.price).toBeLessThan(PARTNERS.memphis.sells.stone.price);
    expect(PARTNERS.nubia.sells.gems.price).toBeLessThan(PARTNERS.byblos.sells.gems.price);
    expect(Object.keys(PARTNERS.nubia.buys)).toEqual(['grain', 'linen']);
    // Incense: only Punt sells it, nobody buys it, and the arbitrage rule holds for every pair.
    expect(Object.keys(PARTNERS).filter((id) => PARTNERS[id].sells[INCENSE_GOOD])).toEqual(['punt']);
    expect(Object.keys(PARTNERS).filter((id) => PARTNERS[id].buys[INCENSE_GOOD])).toEqual([]);
    for (const s of Object.values(PARTNERS)) for (const [g, sale] of Object.entries(s.sells)) for (const b of Object.values(PARTNERS)) {
      if (b.buys[g]) expect([s.name, b.name, g, sale.price >= b.buys[g].price * ARBITRAGE_MARGIN]).toEqual([s.name, b.name, g, true]);
    }
    expect(Object.values(TRADE_SALT).every((n) => n >= 6101 && n <= 6119)).toBe(true);
  });

  it('makes incense a raw good storehouses keep that no workshop, home or rank needs (ruling 853)', () => {
    expect(GOODS[INCENSE_GOOD]).toEqual({ name: 'Incense', kind: 'raw' });
    expect(RAW_GOODS.includes(INCENSE_GOOD)).toBe(true);
    expect(BUILDINGS.storehouse.stores.includes(INCENSE_GOOD)).toBe(true);
    expect(Object.values(BUILDINGS).filter((b) => b.consumes === INCENSE_GOOD || (b.produces && b.produces.good === INCENSE_GOOD))).toEqual([]);
    expect(TIERS.filter((t) => t && t.needs.includes(INCENSE_GOOD))).toEqual([]);
    expect(MILESTONES.filter((m) => m.needs && JSON.stringify(m.needs).includes(INCENSE_GOOD))).toEqual([]);
  });

  it('places the 2x1 Quay only with a long side on the river and a road beside it, unlocked at Capital', () => {
    const { w } = riverCity({ quay: false });
    expect([BUILDINGS.quay.w, BUILDINGS.quay.d, BUILDINGS.quay.water, BUILDINGS.quay.riverOnly, BUILDINGS.quay.needsRoad]).toEqual([2, 1, 'longSide', true, true]);
    expect(MILESTONES.find((m) => m.id === 'capital').unlocks.includes(QUAY_TYPE)).toBe(true);
    expect(canPlace(w, QUAY_TYPE, 20, 3).ok).toBe(true);
    const away = canPlace(w, QUAY_TYPE, 20, 6);                                       // dry land two rows from the water
    expect([away.ok, away.reason]).toEqual([false, 'needs_water']);
    w.milestone = 'great_city';
    expect(canPlace(w, QUAY_TYPE, 20, 3).ok).toBe(false);                             // locked before Capital
  });
});

describe('v70 t river routes', () => {
  it('needs a Quay, not a trading post, to open a river route, and says why it cannot', () => {
    const { w } = riverCity({ quay: false });
    expect(routeBlocker(w, 'nubia')).toBe('no_quay');
    expect(routeBlocker(w, 'memphis')).toBe('no_post');
    expect(routeBlocker(w, 'punt')).toBe('locked');
    addRaw(w, QUAY_TYPE, 20, 3);
    expect(routeBlocker(w, 'nubia')).toBe(null);
    expect(openRoute(w, 'nubia')).toEqual({ ok: true, cost: PARTNERS.nubia.routeCost, warnings: [] });
    w.milestone = 'great_capital';
    expect(routeBlocker(w, 'punt')).toBe(null);
    expect([byRiver('nubia'), byRiver('memphis')]).toEqual([true, false]);
  });

  it("lands a boat at the working Quay on the caravan rhythm: the gift, then the city's orders against the stores in reach", () => {
    const { w, store } = riverCity();
    w.trade.routes.nubia = { since: 0, gifted: false };
    store.store = { linen: 50 };
    setTradeOrder(w, 'linen', 'sell', 20);
    setTradeOrder(w, 'gems', 'buy', 30);
    expect([activeQuay(w).type, quayBlocker(w), arrivalBlocker(w, 'nubia'), arrivalBlocker(w, 'memphis')]).toEqual([QUAY_TYPE, null, null, 'no_post']);
    w.day = 60;
    expect(monthsToNextArrival(w)).toBe(1);
    const quiet = [];
    tradeMonth(w, quiet);
    expect(quiet).toEqual([]);                                                          // not a caravan month
    caravanDay(w);
    const events = [];
    tradeMonth(w, events);
    expect(events.length).toBe(1);
    expect([events[0].partner, events[0].gift, events[0].sold, events[0].bought]).toEqual(['nubia', { good: 'stone', n: 40 }, { linen: 25 }, { gems: 30 }]);   // a quarter of each yearly quota
    expect(store.store).toEqual({ linen: 25, stone: 40, gems: 30 });
  });

  it('sends no boat while the Quay is paused, short of workers or cut off from the roads, and says which', () => {
    const run = (set) => {
      const { w, q, store } = riverCity();
      w.trade.routes.nubia = { since: 0, gifted: true };
      store.store = { linen: 50 };
      setTradeOrder(w, 'linen', 'sell', 0);
      set(w, q);
      caravanDay(w);
      const events = [];
      tradeMonth(w, events);
      return [quayBlocker(w), events.length];
    };
    expect(run(() => {})).toEqual([null, 1]);
    expect(run((w, q) => { q.paused = true; })).toEqual(['paused', 0]);
    expect(run((w, q) => { q.staff = 0; })).toEqual(['short_staffed', 0]);
    expect(run((w) => { for (let x = 16; x <= 24; x++) w.road[idx(w.size, x, 4)] = 0; w.roadVersion++; })).toEqual(['no_road', 0]);
    expect(run((w, q) => { delete w.buildings[q.id]; })).toEqual(['no_quay', 0]);
  });
});

describe('v70 t switches and Keep at least', () => {
  it('stores only a switch turned off, removes it when turned on again, and refuses what a route does not trade', () => {
    const { w } = riverCity();
    expect(setTradeSwitch(w, 'nubia', 'buys', 'grain', false)).toEqual({ ok: true, warnings: [] });
    expect(w.trade.switches).toEqual({ nubia: { buys: { grain: false } } });
    expect(tradeAllowed(w, 'nubia', 'grain', 'buys')).toBe(false);
    expect(tradeAllowed(w, 'memphis', 'grain', 'buys')).toBe(true);
    setTradeSwitch(w, 'nubia', 'buys', 'grain', true);
    expect(w.trade.switches).toEqual({});
    expect(setTradeSwitch(w, 'nubia', 'sells', 'grain', false).reason).toBe('unknown_good');   // Nubia does not sell grain
    expect(setTradeSwitch(w, 'atlantis', 'buys', 'grain', false).reason).toBe('unknown_partner');
    expect(setTradeSwitch(w, 'nubia', 'both', 'grain', false).reason).toBe('bad_side');
    expect(isTradeSettings(w.trade)).toBe(true);
  });

  it('keeps one Keep at least per good: the floor and the order agree, and the boat sells above it and buys up to it', () => {
    const run = (keep) => {
      const { w, store } = riverCity();
      w.trade.routes.nubia = { since: 0, gifted: true };
      store.store = { linen: 60, gems: 5 };
      setTradeOrder(w, 'linen', 'sell', 0);
      setTradeOrder(w, 'gems', 'buy', 0);
      if (keep !== null) { setKeepAtLeast(w, 'linen', keep); setKeepAtLeast(w, 'gems', keep); }
      caravanDay(w);
      const events = [];
      tradeMonth(w, events);
      return [keepAtLeast(w, 'linen'), events[0].sold.linen || 0, events[0].bought.gems || 0, w.trade.floors];
    };
    expect(run(null)).toEqual([0, 25, 0, {}]);                                            // a quarter of the yearly quota: 100 / 4
    expect(run(50)).toEqual([50, 10, 30, { linen: 50, gems: 50 }]);                        // floor met: only what is over it goes; gems up to 30 a visit
    expect(run(80)).toEqual([80, 0, 30, { linen: 80, gems: 80 }]);                         // floor not met: nothing sells
    const { w } = riverCity();
    setKeepAtLeast(w, 'linen', 40);
    expect([keepAtLeast(w, 'linen'), w.trade.orders.linen]).toEqual([40, undefined]);     // a floor alone, no order made up
    setTradeOrder(w, 'linen', 'sell', keepAtLeast(w, 'linen'));
    setKeepAtLeast(w, 'linen', 0);
    expect([keepAtLeast(w, 'linen'), w.trade.floors, w.trade.orders.linen]).toEqual([0, {}, { mode: 'sell', keep: 0 }]);
    expect([setKeepAtLeast(w, 'linen', -10).reason, setKeepAtLeast(w, 'linen', 2.5).reason, setKeepAtLeast(w, 'nothing', 10).reason]).toEqual(['bad_keep', 'bad_keep', 'unknown_good']);
  });
});

describe('v70 t held for the temple and the court', () => {
  // The great temple founded at (2, 14), its first stage's offering of grain owed (or, offered = 1, already made).
  function templeCity(offered) {
    const { w, store } = riverCity();
    const gw = addRaw(w, GREAT_WORK.type, 2, 14);
    w.reign.greatWork = gw.id;
    w.reign.offered = offered;
    w.trade.routes.nubia = { since: 0, gifted: true };
    store.store = { linen: 300 };
    setTradeOrder(w, 'grain', 'sell', 0);
    return { w, gw };
  }
  const owed = (w) => Math.max(1, Math.round(GREAT_WORK.offerings[0].n * DIFFICULTIES[w.difficulty].cost));
  it("holds back the temple's waiting offering, and nothing once it is made", () => {
    const { w } = templeCity(0);
    expect(heldBack(w, 'grain')).toEqual({ units: owed(w), floor: 0, temple: owed(w), court: 0 });
    expect(heldBack(w, 'linen').temple).toBe(0);
    setKeepAtLeast(w, 'grain', 30);
    expect(heldBack(w, 'grain')).toEqual({ units: owed(w) + 30, floor: 30, temple: owed(w), court: 0 });
    const { w: made } = templeCity(1);
    expect(heldBack(made, 'grain')).toEqual({ units: 0, floor: 0, temple: 0, court: 0 });
  });

  it('never sells grain the temple is owed, and sells what is over it', () => {
    const sold = (offered, grain) => {
      const { w } = templeCity(offered);
      const granary = addRaw(w, 'granary', 12, 11, { staff: BUILDINGS.granary.workers, store: { grain } });
      caravanDay(w);
      const events = [];
      tradeMonth(w, events);
      return [events[0].sold.grain || 0, granary.store.grain];
    };
    const { w } = templeCity(0);
    const n = owed(w);
    expect(sold(0, n)).toEqual([0, n]);                                                 // offering held: nothing sold
    expect(sold(0, n + 20)).toEqual([20, n]);                                           // only what is over it
    expect(sold(1, n)).toEqual([75, n - 75]);                                           // offering made: a quarter of Nubia's 300
  });

  it("holds back an accepted court demand's goods, not one only offered", () => {
    const { w } = riverCity();
    const d = { id: 1, kind: 'goods', good: 'linen', type: null, amount: 60, accepted: false };
    w.demands.open.push(d);
    expect(heldBack(w, 'linen').court).toBe(0);
    d.accepted = true;
    expect(heldBack(w, 'linen')).toEqual({ units: 60, floor: 0, temple: 0, court: 60 });
    w.demands.open.push({ ...d, id: 2, amount: 40 });
    expect(heldBack(w, 'linen').court).toBe(100);
  });
});

describe('v70 t ledger', () => {
  it("keeps each route's income and spending by trade year, and last year's profit, through a save", () => {
    const { w, store, p } = riverCity({ post: true });
    w.trade.routes.nubia = { since: 0, gifted: true };
    w.trade.routes.memphis = { since: 0, gifted: true };
    store.store = { linen: 200, grain: 0 };
    setTradeOrder(w, 'linen', 'sell', 0);
    expect([lastYearOf(w, 'nubia'), thisYearOf(w, 'nubia'), w.trade.ledger]).toEqual([null, null, undefined]);   // none before the first visit
    let income = 0;
    for (const day of [90, 180]) {
      w.day = day;
      const events = [];
      tradeMonth(w, events);
      income += events.find((e) => e.partner === 'nubia').income;
    }
    expect(p.type).toBe('trading_post');
    expect(thisYearOf(w, 'nubia')).toEqual({ income, spent: 0, profit: income });
    expect(thisYearOf(w, 'memphis')).toEqual({ income: 0, spent: 0, profit: 0 });
    expect(lastYearOf(w, 'nubia')).toBe(null);
    w.day = 360;                                                                        // the year turns at this month's end
    tradeMonth(w, []);
    expect(lastYearOf(w, 'nubia')).toEqual({ income, spent: 0, profit: income });
    const back = deserialize(serialize(w));
    expect(back.trade.ledger).toEqual(w.trade.ledger);
    expect(isTradeSettings({ ...w.trade, ledger: { year: 1, now: { nubia: { income: -1, spent: 0 } }, last: {} } })).toBe(false);
    expect(isTradeSettings({ ...w.trade, ledger: { year: 1, now: {} } })).toBe(false);
  });
});
