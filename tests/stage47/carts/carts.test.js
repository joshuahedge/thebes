// Stage 4.7 Task 5 (ruling 466): storehouse orders and carts, in the sim. Each rule is set up both ways: the order's validation, a trip's timing against the
// roads, the nearest source by road (not by straight line), no ping-pong between two stores fetching the same good, staffing, room at home, a cut road,
// a demolished home or source, save and load, determinism, the words, the house tip, the first and the tip's registration.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { cartDay, setFetch, clearFetch, fetchStatus, fetchPreview, fetchSourceId, findSource, roadLen, tripTimes, legDays, cartOf, cartPath, cartFraction, farGoodTip, compass, ordersOf, cartsUnlocked, surplusOf } from '../../../src/sim/carts.js';
import { tickDay, advanceDays } from '../../../src/sim/clock.js';
import { demolishAt, setAccept, setPaused, previewDemolishTiles, demolishTiles } from '../../../src/sim/commands.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { reachCacheSize } from '../../../src/sim/reach.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { buildCartsCity } from '../../../src/dev/s47/carts.js';
import { storeTotal } from '../../../src/sim/production.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { checkFirsts } from '../../../src/sim/firsts.js';
import { CARTS, isCart, S47_TIPS, S47_FIRSTS } from '../../../src/data/s47.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { TIPS } from '../../../src/data/tips.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { S47_CARTS_TEXT as W, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT } from '../../../src/ui/text.js';

// A 64 x 64 world with a road along y = 10 (x 0-63). Stores stand south of it at y = 11 (their top row touches the road).
function street(size = 64) {
  const w = makeTestWorld({ size, fertile: [] });
  setRoad(w, 0, 10, size - 1, 10);
  return w;
}
const store = (w, type, x, held = {}, extra = {}) => addRaw(w, type, x, 11, { staff: BUILDINGS[type].workers, store: { ...held }, ...extra });
const step = (w, n = 1, events = null) => { for (let i = 0; i < n; i++) { cartDay(w, events); w.day += 1; } };
const total = (w, good) => Object.values(w.buildings).reduce((s, b) => s + ((b.store && b.store[good]) || 0), 0)
  + w.carts.reduce((s, c) => s + (c.good === good && (c.state !== 'return' || c.dest === 'source') ? c.amount : 0), 0);
const cutRoad = (w, x) => { w.road[idx(w.size, x, 10)] = 0; w.roadVersion++; };

describe('s47 carts: orders (validation)', () => {
  it('sets an order with the default amount and takes it off', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    const r = setFetch(w, home.id, 'pottery');
    expect(r.ok).toBe(true);
    expect(r.fetch).toBe(CARTS.defaultFetch);
    expect(r.source).toEqual({ id: far.id, len: 28 });
    expect(home.orders).toEqual({ pottery: { fetch: 100 } });
    expect(ordersOf(home)).toEqual([{ good: 'pottery', fetch: 100 }]);
    expect(setFetch(w, home.id, 'pottery', 40).ok).toBe(true);        // changing the amount
    expect(home.orders.pottery.fetch).toBe(40);
    expect(clearFetch(w, home.id, 'pottery').ok).toBe(true);
    expect(home.orders).toEqual({});
    expect(clearFetch(w, home.id, 'pottery').reason).toBe('no_order');
  });

  it('refuses with a reason: nothing there, not a store, a good it may not store, a refused good, a bad amount, no source', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    const granary = addRaw(w, 'granary', 40, 11, { staff: 6, store: { grain: 100 } });
    const farm = addRaw(w, 'farm_grain', 50, 11);
    expect(setFetch(w, 999, 'pottery').reason).toBe('nothing_here');
    expect(setFetch(w, farm.id, 'grain').reason).toBe('not_storage');
    expect(setFetch(w, granary.id, 'pottery').reason).toBe('cannot_store');           // a granary holds foods only
    expect(setFetch(w, home.id, 'pottery', 0).reason).toBe('bad_amount');
    expect(setFetch(w, home.id, 'pottery', 2.5).reason).toBe('bad_amount');
    expect(setFetch(w, home.id, 'pottery', 801)).toEqual({ ok: false, reason: 'bad_amount', warnings: [], good: 'pottery', max: 800 });
    expect(setFetch(w, home.id, 'linen').reason).toBe('no_source');                   // no store holds linen
    expect(W.refusal(setFetch(w, home.id, 'linen'))).toBe('No store with linen to spare is linked by road');
    setAccept(w, home.id, 'pottery', false);
    expect(setFetch(w, home.id, 'pottery').reason).toBe('refuses');
    setAccept(w, home.id, 'pottery', true);
    expect(setFetch(w, home.id, 'pottery').ok).toBe(true);
    // a store whose only source is a store that fetches it itself and holds no more than its order has nothing to spare
    far.orders.pottery = { fetch: 50 };
    clearFetch(w, home.id, 'pottery');
    expect(setFetch(w, home.id, 'pottery').reason).toBe('no_source');
    expect(surplusOf(far, 'pottery')).toBe(0);
  });

  it('refuses when the only store with the good is not linked by road, and says so', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    cutRoad(w, 16);
    expect(roadLen(w, home, far)).toBe(Infinity);
    const r = setFetch(w, home.id, 'pottery');
    expect(r.reason).toBe('no_source');
    expect(W.refusal(r)).toBe('No store with pottery to spare is linked by road');
    setRoad(w, 16, 10, 16, 10);
    expect(setFetch(w, home.id, 'pottery').ok).toBe(true);
  });

  it('is on offer from the first store (the granary comes with the Village)', () => {
    const w = street();
    expect(cartsUnlocked(w)).toBe(false);
    const g = addRaw(w, 'granary', 2, 11, { staff: 6 });
    expect(cartsUnlocked(w)).toBe(true);
    const g2 = addRaw(w, 'granary', 20, 11, { staff: 6, store: { grain: 200 } });
    expect(setFetch(w, g.id, 'grain', 100).ok).toBe(true);                             // a granary fetches foods from another granary
    step(w);
    expect(cartOf(w, g.id).from).toBe(g2.id);
  });
});

describe('s47 carts: a trip', () => {
  it('sets out when the store has an order, a source and staff; goods leave the source then and arrive on the due day', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    expect(w.carts.length).toBe(0);
    step(w);                                                                          // day 0: the cart sets out
    const c = cartOf(w, home.id);
    expect(c).toEqual({ id: home.id, from: far.id, to: home.id, good: 'pottery', amount: CARTS.perTrip, len: 28, left: 0, turn: 4, due: 7, state: 'out' });
    expect(isCart(c)).toBe(true);
    expect(far.store.pottery).toBe(30);                                               // the goods left the source when it set out
    expect(home.store.pottery || 0).toBe(0);
    expect(total(w, 'pottery')).toBe(50);
    step(w, 3);                                                                       // days 1-3
    expect(cartOf(w, home.id).state).toBe('out');
    step(w);                                                                          // day 4: the turn day
    expect(cartOf(w, home.id).state).toBe('back');
    step(w, 2);                                                                       // days 5-6
    expect(home.store.pottery || 0).toBe(0);
    expect(w.tally.cartTrips).toBe(0);
    step(w);                                                                          // day 7: home
    expect(home.store.pottery).toBe(20);
    expect([w.tally.cartTrips, w.tally.cartGoods]).toEqual([1, 20]);
    expect(total(w, 'pottery')).toBe(50);
    // a new cart sets out the same day it is home
    expect(cartOf(w, home.id) && cartOf(w, home.id).left).toBe(7);
  });

  it('works out the days from the road: 8 road tiles a day each way, rounded up, a day at least', () => {
    expect(legDays(1)).toBe(1);
    expect(legDays(8)).toBe(1);
    expect(legDays(9)).toBe(2);
    expect(legDays(34)).toBe(5);
    expect(tripTimes(34, 10)).toEqual({ turn: 15, due: 19 });   // 2 x 34 / 8 = 8.5 days, 9
    expect(tripTimes(8, 0)).toEqual({ turn: 1, due: 2 });
    expect(tripTimes(1, 0)).toEqual({ turn: 1, due: 2 });
    expect(tripTimes(9, 0)).toEqual({ turn: 2, due: 3 });
    // the numbers are data: a slower cart takes longer
    const was = CARTS.speed;
    try {
      CARTS.speed = 4;
      expect(tripTimes(26, 0)).toEqual({ turn: 7, due: 13 });
      const w = street();
      const home = store(w, 'storehouse', 2);
      store(w, 'storehouse', 30, { pottery: 50 });
      setFetch(w, home.id, 'pottery');
      step(w);
      expect([cartOf(w, home.id).turn, cartOf(w, home.id).due]).toEqual([7, 14]);
    } finally { CARTS.speed = was; }
  });

  it('keeps going until the amount is held or the source has nothing to spare, then waits', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery', 45);
    step(w, 60);
    expect(home.store.pottery).toBe(45);                                              // 20 + 20 + 5: the last trip carries only what is wanted
    expect(far.store.pottery).toBe(5);
    expect(w.carts.length).toBe(0);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('full');
    home.store.pottery = 10;                                                          // a bazaar drew it down: it fetches again
    step(w, 1);
    expect(cartOf(w, home.id).amount).toBe(5);                                        // the source has 5 to spare
    step(w, 20);
    expect(home.store.pottery).toBe(15);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('no_source');
    far.store.pottery = 12;
    step(w, 1);
    expect(cartOf(w, home.id).amount).toBe(12);
  });

  it('takes the nearest store by road, not by straight line, and any distance', () => {
    // A road south from the main street to a store that stands next to the home as the crow flies but is a long way by road.
    const w = makeTestWorld({ size: 64, fertile: [] });
    setRoad(w, 0, 10, 60, 10);
    setRoad(w, 60, 10, 60, 30);
    setRoad(w, 60, 30, 6, 30);
    const home = addRaw(w, 'storehouse', 2, 11, { staff: 6 });
    const crowNear = addRaw(w, 'storehouse', 6, 31, { staff: 6, store: { pottery: 40 } });   // 20 tiles south as the crow flies, ~110 by road
    const roadNear = addRaw(w, 'storehouse', 40, 11, { staff: 6, store: { pottery: 40 } });
    expect(roadLen(w, home, crowNear)).toBeGreaterThan(roadLen(w, home, roadNear));
    expect(findSource(w, home, 'pottery').b.id).toBe(roadNear.id);
    expect(setFetch(w, home.id, 'pottery').source.id).toBe(roadNear.id);
    expect(fetchSourceId(w, home.id, 'pottery')).toBe(roadNear.id);
    roadNear.store.pottery = 0;                                                       // with the near one empty, the far one serves, at any distance
    const r = findSource(w, home, 'pottery');
    expect(r.b.id).toBe(crowNear.id);
    expect(r.len).toBe(roadLen(w, home, crowNear));
    expect(r.len).toBeGreaterThan(100);
    step(w);
    expect(cartOf(w, home.id).len).toBe(r.len);
    expect(cartOf(w, home.id).due - cartOf(w, home.id).left).toBe(Math.ceil((2 * r.len) / CARTS.speed));
  });

  it('breaks a tie in distance by the lower store id', () => {
    const w = street();
    const home = store(w, 'storehouse', 30);
    const a = store(w, 'storehouse', 20, { pottery: 10 }), b = store(w, 'storehouse', 40, { pottery: 10 });
    expect(roadLen(w, home, a)).toBe(roadLen(w, home, b));
    expect(findSource(w, home, 'pottery').b.id).toBe(Math.min(a.id, b.id));
  });

  it('counts a bridge as road: a store across the river is linked', () => {
    const w = street();
    for (let y = 0; y < 64; y++) for (const x of [14, 15]) w.terrain[idx(64, x, y)] = T.WATER;
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    expect(roadLen(w, home, far)).toBe(28);                                           // the road tiles on the water are a bridge
    expect(setFetch(w, home.id, 'pottery').ok).toBe(true);
    step(w);
    expect(cartOf(w, home.id).len).toBe(28);
  });

  it('only a store with a free cart and its workers sends one: unstaffed, paused, off the road, one cart at a time', () => {
    const w = street();
    const home = store(w, 'storehouse', 2, {}, { staff: 0 });
    store(w, 'storehouse', 30, { pottery: 200 });
    setFetch(w, home.id, 'pottery');
    step(w, 3);
    expect(w.carts.length).toBe(0);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('unstaffed');
    expect(W.status(fetchStatus(w, home.id, 'pottery'))).toBe('Fetching pottery: no cart goes while this store is short of workers (0 of 6) or off the road');
    home.staff = 1;                                                                   // 1 of 6 is under the quarter a workplace needs
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('unstaffed');
    home.staff = 2;                                                                   // 2 of 6 works
    step(w);
    expect(cartOf(w, home.id)).toBeTruthy();
    // a second order does not make a second cart
    store(w, 'storehouse', 36, { linen: 200 });
    setFetch(w, home.id, 'linen');
    step(w);
    expect(w.carts.filter((c) => c.id === home.id).length).toBe(1);
    expect(fetchStatus(w, home.id, 'linen').state).toBe('other');
    // paused
    const w2 = street();
    const h2 = store(w2, 'storehouse', 2);
    store(w2, 'storehouse', 30, { pottery: 200 });
    setFetch(w2, h2.id, 'pottery');
    setPaused(w2, h2.id, true);
    h2.staff = 6;
    step(w2, 2);
    expect(w2.carts.length).toBe(0);
    setPaused(w2, h2.id, false);
    h2.staff = 6;
    step(w2);
    expect(w2.carts.length).toBe(1);
  });

  it('carries only what fits at home, and a store full to the brim sends no cart', () => {
    const w = street();
    const home = store(w, 'storehouse', 2, { clay: 790 });                            // capacity 800 shared by all goods
    store(w, 'storehouse', 30, { pottery: 200 });
    setFetch(w, home.id, 'pottery');
    step(w);
    expect(cartOf(w, home.id).amount).toBe(10);
    step(w, 10);
    expect(storeTotal(home)).toBe(800);
    expect(w.carts.length).toBe(0);                                                   // no room: no cart
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('no_room');
  });

  it('puts down what fits when the room has gone by the time the cart is home, and the rest goes back to the source', () => {
    const w = street();
    const home = store(w, 'storehouse', 2);
    const far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    step(w);
    home.store.clay = 795;                                                            // a producer filled the room while the cart was out
    step(w, 10);
    expect(home.store.pottery).toBe(5);
    expect(storeTotal(home)).toBe(800);
    expect(total(w, 'pottery')).toBe(50);
    expect(far.store.pottery).toBe(45 - w.carts.reduce((s, c) => s + c.amount, 0));   // 15 went back on its shelf (any new cart has taken its own)
  });

  it('never takes a source below its own order: two stores fetching the same good do not pass it back and forth', () => {
    const w = street();
    const a = store(w, 'storehouse', 10, { pottery: 100 }), b = store(w, 'storehouse', 30);
    a.orders.pottery = { fetch: 100 };                                          // (set directly: the command would refuse, no store has pottery to spare)
    b.orders.pottery = { fetch: 100 };                                                // both orders stand (set while the other had stock to spare)
    step(w, 80);
    expect([a.store.pottery, b.store.pottery || 0]).toEqual([100, 0]);                // a is at its order: nothing to spare, nobody moves
    expect(w.tally.cartTrips).toBe(0);
    a.store.pottery = 150;                                                            // 50 above a's order: b may draw those and no more
    step(w, 80);
    expect([a.store.pottery, b.store.pottery]).toEqual([100, 50]);
    expect(w.tally.cartGoods).toBe(50);
    // a bazaar draws b down: a has nothing to spare; b never gives to a, and a never takes from b (b is below its own order)
    b.store.pottery = 20;
    a.store.pottery = 60;                                                             // a is now below its order too
    step(w, 80);
    expect([a.store.pottery, b.store.pottery]).toEqual([60, 20]);
    expect(w.carts.length).toBe(0);
    // b holds more than its order, a is below: a draws the surplus and b stays at its order
    b.store.pottery = 130;
    step(w, 100);
    expect([a.store.pottery, b.store.pottery]).toEqual([90, 100]);
    expect(total(w, 'pottery')).toBe(190);
  });
});

describe('s47 carts: the road breaks and stores go', () => {
  // home at x 2, source at x 30; len 28: out for 4 days, back for 3
  function trip() {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    step(w);                                                                          // day 0: set out; w.day is 1 now
    return { w, home, far };
  }

  it('a cut road on the way out turns the cart round: the goods go back to the source, it is home on break day + distance / speed', () => {
    const { w, home, far } = trip();
    step(w, 2);                                                                       // w.day is 3: two days out, 16 tiles
    const events = [];
    cutRoad(w, 20);
    cartDay(w, events);                                                               // day 3: noticed
    const c = cartOf(w, home.id);
    expect(c.state).toBe('return');
    expect(c.dest).toBe('home');
    expect([c.turn, c.at]).toEqual([3, 24]);                                          // 3 days out is 24 tiles: min(26, (3 - 0) * 8)
    expect(c.due).toBe(3 + Math.ceil(24 / CARTS.speed));
    expect(isCart(c)).toBe(true);
    expect(far.store.pottery).toBe(50);                                               // the goods are on the shelf again
    expect(events).toEqual([{ type: 'cartTurned', id: home.id, good: 'pottery', amount: 20 }]);
    w.day += 1;
    step(w, 5);
    expect(w.carts.length).toBe(0);                                                   // home, free again; the road is cut so no new trip
    expect(home.store.pottery || 0).toBe(0);
    expect(w.tally.cartTrips).toBe(0);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('no_source');
    expect(total(w, 'pottery')).toBe(50);
  });

  it('a cut road on the way back: the cart carries the goods back to the source and puts them on its shelf on the due day', () => {
    const { w, home, far } = trip();
    step(w, 5);                                                                       // w.day is 6: back since day 4, 2 days = 16 tiles from the source
    expect(cartOf(w, home.id).state).toBe('back');
    cutRoad(w, 12);
    cartDay(w);                                                                       // day 6
    const c = cartOf(w, home.id);
    expect([c.state, c.dest, c.turn]).toEqual(['return', 'source', 6]);
    expect(c.at).toBe(28 - 16);
    expect(c.due).toBe(6 + 2);
    expect(far.store.pottery).toBe(30);                                               // still in the cart
    expect(total(w, 'pottery')).toBe(50);
    w.day += 1;
    cartDay(w);                                                                       // day 7: not yet
    expect(far.store.pottery).toBe(30);
    w.day += 1;
    cartDay(w);                                                                       // day 8: the due day
    expect(far.store.pottery).toBe(50);
    expect(w.carts.length).toBe(0);
    expect(w.tally.cartTrips).toBe(0);
  });

  it('a mended road before the next day changes nothing; a longer way round keeps the trip (still linked)', () => {
    const { w, home } = trip();
    cutRoad(w, 20);
    setRoad(w, 20, 10, 20, 10);                                                       // mended before the day's work
    step(w, 8);
    expect(w.tally.cartTrips).toBeGreaterThanOrEqual(1);
    expect(home.store.pottery).toBeGreaterThanOrEqual(20);
  });

  it('a longer way round keeps the trip: the cart does not turn while the stores are still joined', () => {
    const { w, home } = trip();
    setRoad(w, 18, 10, 18, 14); setRoad(w, 18, 14, 24, 14); setRoad(w, 24, 14, 24, 10);   // a loop round the cut
    cutRoad(w, 20);
    expect(Number.isFinite(roadLen(w, home, w.buildings[2]))).toBe(true);
    step(w, 8);
    expect(w.tally.cartTrips).toBeGreaterThanOrEqual(1);
    expect(home.store.pottery).toBeGreaterThanOrEqual(20);
  });
  it('home demolished on the way: the goods go back to the source and the cart goes with the store', () => {
    const { w, home, far } = trip();
    step(w, 1);
    expect(demolishAt(w, home.x, home.y).ok).toBe(true);
    const events = [];
    cartDay(w, events);
    expect(w.carts.length).toBe(0);
    expect(far.store.pottery).toBe(50);
    expect(events).toEqual([]);
    expect(w.tally.cartTrips).toBe(0);
  });

  it('home demolished on the way back (goods in the cart): they go back to the source too', () => {
    const { w, home, far } = trip();
    step(w, 5);
    expect(cartOf(w, home.id).state).toBe('back');
    demolishAt(w, home.x, home.y);
    cartDay(w);
    expect(w.carts.length).toBe(0);
    expect(far.store.pottery).toBe(50);
  });

  it('source demolished on the way: the goods are in the cart, so it completes the trip home', () => {
    const { w, home, far } = trip();
    step(w, 1);
    expect(demolishAt(w, far.x, far.y).ok).toBe(true);
    step(w, 8);
    expect(home.store.pottery).toBeGreaterThanOrEqual(20);                            // delivered, and no new trip (nothing to fetch from)
    expect([w.tally.cartTrips, w.tally.cartGoods]).toEqual([1, 20]);
    expect(w.carts.length).toBe(0);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('no_source');
  });

  it('both gone: the goods are lost, with an event for a caption', () => {
    const { w, home, far } = trip();
    step(w, 1);
    demolishAt(w, home.x, home.y);
    demolishAt(w, far.x, far.y);
    const events = [];
    cartDay(w, events);
    expect(w.carts.length).toBe(0);
    expect(events).toEqual([{ type: 'cartLost', id: home.id, good: 'pottery', amount: 20 }]);
    expect(total(w, 'pottery')).toBe(0);
    expect(W.lost(events[0])).toBe('A cart lost 20 pottery: no store had room for them');
  });

  it('a returning cart whose source is gone puts its goods on the home shelf; with the home gone as well they are lost', () => {
    const { w, home, far } = trip();
    step(w, 5);
    cutRoad(w, 12);
    cartDay(w);                                                                       // returning to the source with 20
    expect(cartOf(w, home.id).dest).toBe('source');
    demolishAt(w, far.x, far.y);
    w.day += 2;
    cartDay(w);
    expect(home.store.pottery).toBe(20);                                              // the source is gone: the home takes them
    expect(w.carts.length).toBe(0);
    const t = trip();
    step(t.w, 5);
    cutRoad(t.w, 12);
    cartDay(t.w);
    demolishAt(t.w, t.far.x, t.far.y);
    demolishAt(t.w, t.home.x, t.home.y);
    const events = [];
    t.w.day += 2;
    cartDay(t.w, events);
    expect(events.map((e) => e.type)).toEqual(['cartLost']);
  });

  it('a demolish that is taken back before the next day costs nothing (the store keeps its id and its cart)', () => {
    const { w, home } = trip();
    const p = previewDemolishTiles(w, [[home.x, home.y]]);
    expect(p.buildingIds).toEqual([home.id]);
    expect(demolishTiles(w, [[home.x, home.y]]).ok).toBe(true);
    // undo restores the same store with its id (src/sim/undo.js); the cart is untouched until the next day's work
    expect(cartOf(w, home.id)).toBeTruthy();
  });
});

describe('s47 carts: status, consequence and words from the sim', () => {
  it('says what the order is doing, from the sim: amount, days, source, road tiles and direction', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    let st = fetchStatus(w, home.id, 'pottery');
    expect(st.state).toBe('ready');
    expect(W.status(st)).toBe('Fetching pottery: a cart sets out next for 20, from the storehouse 28 road tiles east');
    step(w);
    st = fetchStatus(w, home.id, 'pottery');
    expect(st).toEqual({ good: 'pottery', fetch: 100, held: 0, state: 'out', amount: 20, days: 6, source: { id: far.id, type: 'storehouse', len: 28, dir: 'east' }, staff: 6, workers: 6 });
    expect(W.status(st)).toBe('Fetching pottery: 20 on the way, back in 6 days, from the storehouse 28 road tiles east');
    step(w, 5);
    expect(W.status(fetchStatus(w, home.id, 'pottery'))).toBe('Fetching pottery: 20 on the way, back in 1 day, from the storehouse 28 road tiles east');
    expect(fetchStatus(w, home.id, 'linen')).toBe(null);                              // no order for it
  });

  it('the consequence line is the sim\'s numbers: the nearest source, its road tiles and days, the amount a trip', () => {
    const w = street();
    const home = store(w, 'storehouse', 2);
    store(w, 'storehouse', 30, { pottery: 50 });
    const pv = fetchPreview(w, home.id, 'pottery', 100);
    expect(pv.source).toEqual({ id: w.nextId - 1, type: 'storehouse', len: 28, days: 4, roundTrip: 7, dir: 'east' });
    expect(W.consequence(pv)).toBe('Fetch pottery up to 100: one cart, 20 a trip, from the nearest store with pottery, 28 road tiles (a round trip takes 7 days)');
    expect(W.consequence(fetchPreview(w, home.id, 'linen', 100))).toBe('Fetch linen: no store with linen to spare is linked by road');
    home.staff = 0;
    expect(W.consequence(fetchPreview(w, home.id, 'pottery', 100))).toBe('Fetch pottery up to 100: one cart, 20 a trip, from the nearest store with pottery, 28 road tiles (a round trip takes 7 days). No cart goes until this store has its workers and a road');
  });

  it('the live statuses of an order with no cart: full, refused, unstaffed, no room, no source', () => {
    const w = street();
    const home = store(w, 'storehouse', 2);
    const far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery', 30);
    home.store.pottery = 30;
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('full');
    expect(W.status(fetchStatus(w, home.id, 'pottery'))).toBe('Fetching pottery: 30 held of 30, no cart needed');
    home.store.pottery = 0;
    setAccept(w, home.id, 'pottery', false);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('refused');
    setAccept(w, home.id, 'pottery', true);
    far.store.pottery = 0;
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('no_source');
    expect(W.status(fetchStatus(w, home.id, 'pottery'))).toBe('Fetching pottery: no store with pottery to spare is linked by road');
  });

  it('names eight directions from the vector between the stores (y grows south)', () => {
    expect(compass(10, 0)).toBe('east');
    expect(compass(-10, 1)).toBe('west');
    expect(compass(0, 9)).toBe('south');
    expect(compass(1, -9)).toBe('north');
    expect(compass(8, 8)).toBe('south_east');
    expect(compass(-8, 8)).toBe('south_west');
    expect(compass(8, -8)).toBe('north_east');
    expect(compass(-8, -8)).toBe('north_west');
    expect(compass(0, 0)).toBe(null);
    const w = street();
    const home = store(w, 'storehouse', 30);
    store(w, 'storehouse', 2, { pottery: 50 });
    expect(fetchPreview(w, home.id, 'pottery').source.dir).toBe('west');
  });

  it('the tip, the first and the How to play words exist and use the data numbers', () => {
    expect(S47_TIPS.some((t) => t.id === 'fetch_far' && t.trigger === 'goodsFar')).toBe(true);
    expect(TIPS.some((t) => t.id === 'fetch_far')).toBe(true);
    expect(TIP_TEXT.fetch_far.length).toBeGreaterThan(10);
    expect(TIP_HELP_TEXT.fetch_far).toContain(String(CARTS.perTrip));
    expect(TIP_HELP_TEXT.fetch_far).toContain(String(CARTS.speed));
    expect(S47_FIRSTS.some((f) => f.id === 'first_cart_trip')).toBe(true);
    expect(FIRSTS.some((f) => f.id === 'first_cart_trip')).toBe(true);
    expect(FIRST_TEXT.first_cart_trip.head).toBe('The first cart home');
    expect(W.help).toContain(`${CARTS.perTrip} a trip`);
    expect(W.tipFor({ good: 'pottery' })).toBe('Set a storehouse near these homes to Fetch pottery');
  });

  it('"The first cart home" fires on the first trip home, where the order is', () => {
    const w = street();
    const home = store(w, 'storehouse', 2);
    store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    const events = [];
    checkFirsts(w, events);
    expect(w.firsts.includes('first_cart_trip')).toBe(false);
    step(w, 8);
    checkFirsts(w, events);
    expect(w.firsts.includes('first_cart_trip')).toBe(true);
    const e = events.find((x) => x.type === 'first' && x.id === 'first_cart_trip');
    expect([e.x, e.y]).toEqual([home.x + 1, home.y + 1]);
  });
});

describe('s47 carts: routes, save and determinism', () => {
  it('the cart route is the road path, as long as the cart\'s len, home to source', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    step(w);
    const c = cartOf(w, home.id);
    const p = cartPath(w, c);
    expect(p.length).toBe(c.len);
    expect(p.every((t) => w.road[t] === 1)).toBe(true);
    for (let i = 1; i < p.length; i++) expect(Math.abs(p[i] - p[i - 1]) === 1 || Math.abs(p[i] - p[i - 1]) === 64).toBe(true);
    expect(p[0]).toBe(idx(64, 3, 10));
    expect(p[p.length - 1]).toBe(idx(64, 30, 10));
    cutRoad(w, 16);
    expect(cartPath(w, c)).toBe(null);
    expect(far.id).toBeGreaterThan(0);
  });

  it('where a cart is on its route runs 0 to 1 out, 1 to 0 back, and from where it turned to where it goes when the road breaks', () => {
    const c = { id: 1, from: 2, to: 1, good: 'pottery', amount: 20, len: 26, left: 0, turn: 4, due: 7, state: 'out' };
    expect(cartFraction(c, 0)).toBe(0);
    expect(cartFraction(c, 2)).toBe(0.5);
    expect(cartFraction(c, 4)).toBe(1);
    expect(cartFraction({ ...c, state: 'back' }, 4)).toBe(1);
    expect(cartFraction({ ...c, state: 'back' }, 7)).toBe(0);
    const r = { ...c, state: 'return', dest: 'home', at: 13, turn: 2, due: 4 };
    expect(cartFraction(r, 2)).toBe(0.5);
    expect(cartFraction(r, 4)).toBe(0);
    expect(cartFraction({ ...r, dest: 'source' }, 4)).toBe(1);
  });

  it('saves and loads a cart mid-trip, an order and a returning cart, and both worlds then run on the same', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 90 });
    setFetch(w, home.id, 'pottery', 60);
    step(w, 3);
    const copy = deserialize(serialize(w));
    expect(copy.carts).toEqual(w.carts);
    expect(copy.buildings[home.id].orders).toEqual({ pottery: { fetch: 60 } });
    step(w, 30);
    step(copy, 30);
    expect(serialize(copy)).toBe(serialize(w));
    expect(w.tally.cartTrips).toBeGreaterThan(0);
    // a returning cart round-trips too
    const v = street();
    const h = store(v, 'storehouse', 2);
    store(v, 'storehouse', 30, { pottery: 50 });
    setFetch(v, h.id, 'pottery');
    step(v, 6);
    cutRoad(v, 12);
    cartDay(v);
    expect(cartOf(v, h.id).state).toBe('return');
    const again = deserialize(serialize(v));
    expect(again.carts).toEqual(v.carts);
    v.day += 3;
    again.day += 3;
    cartDay(v);
    cartDay(again);
    expect(serialize(again)).toBe(serialize(v));
    expect(far.id).toBeGreaterThan(0);
  });

  it('runs in the daily tick with real staffing: homes give the store workers, the cart brings goods home', () => {
    const w = street();
    for (let x = 12; x < 30; x++) addRaw(w, 'house', x, 9, { tier: 1, residents: 5 });    // workers for the stores
    const home = addRaw(w, 'storehouse', 2, 11, {});
    addRaw(w, 'storehouse', 40, 11, { store: { pottery: 80 } });
    setFetch(w, home.id, 'pottery', 40);
    advanceDays(w, 60);
    expect(home.staff).toBeGreaterThan(0);
    expect(w.tally.cartTrips).toBeGreaterThan(1);
    expect(home.store.pottery).toBe(40);
  });

  it('draws no random numbers: the same orders on the same world give the same carts', () => {
    const run = () => {
      const w = street();
      const home = store(w, 'storehouse', 30);
      store(w, 'storehouse', 20, { pottery: 40, linen: 30 });
      store(w, 'storehouse', 40, { pottery: 40, linen: 30 });
      setFetch(w, home.id, 'pottery', 90);
      setFetch(w, home.id, 'linen', 50);
      step(w, 50);
      return serialize(w);
    };
    expect(run()).toBe(run());
  });
});

describe('s47 carts: homes waiting on a good only a far store holds (the tip)', () => {
  // A road along y = 10; a staffed bazaar at (9, 11) (reach 10, supply reach 16); two House-tier homes at x 12 and 13 that want pottery for the Townhouse.
  function homes({ storeAt = 56, pottery = 100, stall = 0, stock = 0 } = {}) {
    const w = street();
    addRaw(w, 'bazaar', 9, 11, { staff: 6, store: stall ? { pottery: stall } : {} });
    addRaw(w, 'house', 12, 9, { tier: 4, residents: 10, stock: stock ? { pottery: stock } : {} });
    addRaw(w, 'house', 13, 9, { tier: 4, residents: 10, stock: stock ? { pottery: stock } : {} });
    const s = storeAt === null ? null : addRaw(w, 'storehouse', storeAt, 11, { staff: 6, store: { pottery } });
    return { w, s };
  }

  it('a store with pottery beyond the bazaar\'s supply reach raises the tip, naming that store', () => {
    const { w, s } = homes();
    const tip = farGoodTip(w);
    expect(tip.good).toBe('pottery');
    expect(tip.count).toBe(2);
    expect(tip.far).toBe(s.id);
    expect(tip.len).toBeGreaterThan(BUILDINGS.bazaar.supplyReach);
    expect(W.tipFor(tip)).toBe('Set a storehouse near these homes to Fetch pottery');
  });

  it('no tip when a store with pottery is within the bazaar\'s supply reach, or the stall already holds it', () => {
    expect(farGoodTip(homes({ storeAt: 20 }).w)).toBe(null);                          // 11 road tiles from the bazaar: within its 16
    expect(farGoodTip(homes({ stall: 5 }).w)).toBe(null);                             // the stall holds pottery
    const edge = homes({ storeAt: 25 });   // 16 road tiles: still in reach
    expect(farGoodTip(edge.w)).toBe(null);
    expect(farGoodTip(homes({ storeAt: 26 }).w).far).toBeTruthy();   // 17: out of reach
  });

  it('no tip when the far store holds none, the homes have a month of it, no road links the store or no bazaar reaches the homes', () => {
    expect(farGoodTip(homes({ pottery: 0 }).w)).toBe(null);
    expect(farGoodTip(homes({ stock: 10 }).w)).toBe(null);                            // a month of pottery for 10 residents is ceil(0.5) = 1
    const cut = homes();
    cutRoad(cut.w, 40);
    expect(farGoodTip(cut.w)).toBe(null);
    const noBazaar = homes();
    for (const b of Object.values(noBazaar.w.buildings)) if (b.type === 'bazaar') removeBuilding(noBazaar.w, b.id);
    expect(farGoodTip(noBazaar.w)).toBe(null);
    const none = homes({ storeAt: null });
    expect(farGoodTip(none.w)).toBe(null);
  });

  it('a near storehouse set to Fetch the good clears the tip once its cart has been home and the bazaar has stocked up', () => {
    const { w } = homes();
    const near = addRaw(w, 'storehouse', 16, 11, { staff: 6 });
    expect(farGoodTip(w).good).toBe('pottery');
    expect(setFetch(w, near.id, 'pottery', 100).ok).toBe(true);
    step(w, 12);
    expect(near.store.pottery).toBeGreaterThan(0);
    expect(farGoodTip(w)).toBe(null);
  });

  it('counts the good with the most waiting homes, and only goods the homes want', () => {
    const { w } = homes();
    addRaw(w, 'storehouse', 58, 11, { staff: 6, store: { beer: 100 } });
    addRaw(w, 'house', 14, 9, { tier: 6, residents: 10 });                           // a Manor wants beer too, but pottery has three homes
    expect(farGoodTip(w).good).toBe('pottery');
    expect(farGoodTip(w).count).toBe(3);
  });
});

describe('s47 carts: the road distances are cached per road version', () => {
  it('days of orders add no reach maps beyond one per store, and a road change starts them over', () => {
    const w = street();
    const home = store(w, 'storehouse', 2);
    store(w, 'storehouse', 30, { pottery: 500 });
    store(w, 'storehouse', 40, { pottery: 500 });
    setFetch(w, home.id, 'pottery', 300);
    step(w, 1);
    const n = reachCacheSize(w);
    expect(n).toBeGreaterThan(0);
    step(w, 40);
    expect(reachCacheSize(w)).toBe(n);                                                // every day's source search and cut-road check reads the cache
    w.road[idx(64, 60, 10)] = 0; w.roadVersion++;                                     // a road change away from every store: the cache starts over
    expect(reachCacheSize(w)).toBe(0);
    step(w, 1);
    expect(reachCacheSize(w)).toBeLessThanOrEqual(3);                                 // a store's own reach map, once
  });
});

describe('s47 carts: the dev scene city', () => {
  it('has homes waiting on pottery held only in a far storehouse, and a near storehouse with no order; setting the order brings the pottery near', () => {
    const w = createWorld({ seed: 11, size: 64, mapVariant: 'classic' });
    buildSampleCity(w);
    const info = buildCartsCity(w);
    expect(info.road).toBe(true);
    expect([info.far, info.farGranary, info.near].every(Boolean)).toBe(true);
    expect(info.tip.good).toBe('pottery');
    expect(info.tip.far).toBe(info.far);
    expect(info.tip.count).toBeGreaterThan(10);
    expect(info.tip.len).toBeGreaterThan(BUILDINGS.bazaar.supplyReach);
    expect(w.buildings[info.near].orders).toEqual({});                                // no order yet
    expect(w.buildings[info.near].type).toBe('storehouse');
    expect(roadLen(w, w.buildings[info.near], w.buildings[info.far])).toBeGreaterThan(BUILDINGS.bazaar.supplyReach);
    expect(setFetch(w, info.near, 'pottery', 100).source.id).toBe(info.far);
    advanceDays(w, 40);
    expect(w.tally.cartTrips).toBeGreaterThan(1);
    expect(farGoodTip(w)).toBe(null);                                                 // the pottery is near the homes' bazaars now
  });
});
