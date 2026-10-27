// Version 8.3 Track K (rulings 1410-1419): Keep stocked from a chosen source, in the sim. Each rule is set up both ways: a chosen source beats a
// nearer one; a dry one waits and says so, never falling back; Nearest restores today's rule; a demolished source; every refusal of setSource;
// Build another copies the source; the month's counts; the Supply lines list; and an 8.2.1 save (orders with no from) loads and plays as before.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { cartDay, setFetch, clearFetch, setSource, fetchStatus, fetchPreview, fetchSourceId, findSource, cartOf, ordersOf, orderSource, sourceChoices, chosenOf, lastMonthOf, roadLen } from '../../../src/sim/carts.js';
import { supplyLines } from '../../../src/sim/layers.js';
import { anotherOf, applySettings, settingsOf, settingsThatApply } from '../../../src/sim/another.js';
import { demolishAt } from '../../../src/sim/commands.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { isOrders } from '../../../src/data/s47.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { idx } from '../../../src/sim/grid.js';
import { adjacentRoadTiles } from '../../../src/sim/reach.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { buildCartsCity } from '../../../src/dev/s47/carts.js';
import { createWorld } from '../../../src/sim/world.js';

// A street along y = 10; stores south of it at y = 11.
function street(size = 64) {
  const w = makeTestWorld({ size, fertile: [] });
  setRoad(w, 0, 10, size - 1, 10);
  return w;
}
const store = (w, type, x, held = {}, extra = {}) => addRaw(w, type, x, 11, { staff: BUILDINGS[type].workers, store: { ...held }, ...extra });
const step = (w, n = 1, events = null) => { for (let i = 0; i < n; i++) { cartDay(w, events); w.day += 1; } };
// home at x 2, a near source at x 12 and a far one at x 40, both with pottery.
function three(nearHeld = 80, farHeld = 80) {
  const w = street();
  const home = store(w, 'storehouse', 2), near = store(w, 'storehouse', 12, { pottery: nearHeld }), far = store(w, 'storehouse', 40, { pottery: farHeld });
  return { w, home, near, far };
}

describe('v83 k sim: a chosen source', () => {
  it('beats a nearer one: the cart goes to the chosen store, and the order says so', () => {
    const { w, home, near, far } = three();
    expect(setFetch(w, home.id, 'pottery', 40).ok).toBe(true);
    expect(findSource(w, home, 'pottery').b.id).toBe(near.id);                         // today's rule: the nearest
    const r = setSource(w, home.id, 'pottery', far.id);
    expect(r).toEqual({ ok: true, from: far.id, len: roadLen(w, home, far), spare: 80, warnings: [] });
    expect(home.orders.pottery).toEqual({ fetch: 40, from: far.id });
    expect(chosenOf(home, 'pottery')).toBe(far.id);
    const found = findSource(w, home, 'pottery');
    expect([found.b.id, found.chosen]).toEqual([far.id, true]);
    expect(fetchStatus(w, home.id, 'pottery').source.id).toBe(far.id);
    expect(fetchStatus(w, home.id, 'pottery').chosen).toBe(far.id);
    step(w);
    expect(cartOf(w, home.id).from).toBe(far.id);
    expect(far.store.pottery).toBe(60);
    expect(near.store.pottery).toBe(80);
    expect(orderSource(w, home.id, 'pottery')).toEqual({ chosen: true, store: { id: far.id, type: 'storehouse', len: roadLen(w, home, far), dir: 'east' }, spare: 60, why: null });
  });

  it('is kept when a nearer store appears', () => {
    const { w, home, far } = three(0, 80);
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    const nearer = store(w, 'storehouse', 6, { pottery: 200 });
    expect(findSource(w, home, 'pottery').b.id).toBe(far.id);
    step(w);
    expect(cartOf(w, home.id).from).toBe(far.id);
    expect(nearer.store.pottery).toBe(200);
  });

  it('waits when it runs dry, says why, and never falls back to the nearest by itself', () => {
    const { w, home, near, far } = three(80, 0);
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    expect(findSource(w, home, 'pottery')).toBe(null);
    const st = fetchStatus(w, home.id, 'pottery');
    expect([st.state, st.why, st.source.id, st.chosen]).toEqual(['dry', 'empty', far.id, far.id]);
    expect(fetchSourceId(w, home.id, 'pottery')).toBe(far.id);                         // Show me goes to the chosen store
    step(w, 20);
    expect(cartOf(w, home.id)).toBe(null);
    expect(near.store.pottery).toBe(80);                                              // untouched
    expect(home.orders.pottery.from).toBe(far.id);                                    // still chosen
    // kept: it holds some but no more than its own order
    far.store.pottery = 30;
    far.orders = { pottery: { fetch: 30 } };
    expect(fetchStatus(w, home.id, 'pottery').why).toBe('kept');
    // and once it can spare some, the cart goes there
    far.store.pottery = 50;
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('ready');
    step(w);
    expect(cartOf(w, home.id).from).toBe(far.id);
    expect(cartOf(w, home.id).amount).toBe(20);
  });

  it('is dry when the road to it is cut, or it burns', () => {
    const { w, home, far } = three();
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    w.road[idx(w.size, 30, 10)] = 0; w.roadVersion++;
    expect([fetchStatus(w, home.id, 'pottery').state, fetchStatus(w, home.id, 'pottery').why]).toEqual(['dry', 'unlinked']);
    w.road[idx(w.size, 30, 10)] = 1; w.roadVersion++;
    far.fire = { stage: 'fire' };
    expect(fetchStatus(w, home.id, 'pottery').why).toBe('burning');
    far.fire = null;
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('ready');
  });

  it('Nearest instead (setSource null) restores today\'s rule at once', () => {
    const { w, home, near, far } = three(80, 0);
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('dry');
    expect(setSource(w, home.id, 'pottery', null)).toEqual({ ok: true, from: null, len: null, spare: null, warnings: [] });
    expect(home.orders.pottery).toEqual({ fetch: 40 });
    expect(fetchStatus(w, home.id, 'pottery').source.id).toBe(near.id);
    step(w);
    expect(cartOf(w, home.id).from).toBe(near.id);
  });

  it('a new amount keeps the chosen source; switching the order off forgets it', () => {
    const { w, home, far } = three();
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    expect(setFetch(w, home.id, 'pottery', 60).ok).toBe(true);
    expect(home.orders.pottery).toEqual({ fetch: 60, from: far.id });
    clearFetch(w, home.id, 'pottery');
    setFetch(w, home.id, 'pottery', 60);
    expect(home.orders.pottery).toEqual({ fetch: 60 });
  });
});

describe('v83 k sim: setSource refusals', () => {
  it('refuses with a reason each: not a store, no order, the same store, a store that cannot hold the good, no road', () => {
    const { w, home, far } = three();
    const granary = store(w, 'granary', 20, { grain: 50 });
    const farm = addRaw(w, 'farm_grain', 50, 11);
    const island = addRaw(w, 'storehouse', 30, 30, { staff: 6, store: { pottery: 90 } });
    expect(setSource(w, 999, 'pottery', far.id).reason).toBe('not_storage');
    expect(setSource(w, farm.id, 'grain', granary.id).reason).toBe('not_storage');
    expect(setSource(w, granary.id, 'pottery', far.id).reason).toBe('not_storage');    // a granary does not store pottery
    expect(setSource(w, home.id, 'pottery', far.id).reason).toBe('no_order');
    setFetch(w, home.id, 'pottery', 40);
    expect(setSource(w, home.id, 'pottery', home.id).reason).toBe('same_store');
    expect(setSource(w, home.id, 'pottery', granary.id).reason).toBe('not_holder');
    expect(setSource(w, home.id, 'pottery', farm.id).reason).toBe('not_holder');
    expect(setSource(w, home.id, 'pottery', 999).reason).toBe('not_holder');
    expect(setSource(w, home.id, 'pottery', island.id).reason).toBe('unlinked');
    expect(home.orders.pottery).toEqual({ fetch: 40 });                                // nothing refused changed the order
    expect(setSource(w, home.id, 'pottery', far.id).ok).toBe(true);
  });
});

describe('v83 k sim: a chosen store that goes', () => {
  it('demolished: the order is Nearest again, says so once (an event, and gone until the month ends)', () => {
    const { w, home, near, far } = three();
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    w.day = 5;
    expect(demolishAt(w, far.x, far.y).ok).toBe(true);
    expect(fetchStatus(w, home.id, 'pottery').gone).toBe(true);                       // at once, before the day's work
    expect(findSource(w, home, 'pottery').b.id).toBe(near.id);
    const events = [];
    step(w, 1, events);
    expect(events.filter((e) => e.type === 'sourceGone')).toEqual([{ type: 'sourceGone', id: home.id, good: 'pottery' }]);
    expect(home.orders.pottery.from).toBe(undefined);
    expect(home.orders.pottery.gone).toBe(true);
    expect(cartOf(w, home.id).from).toBe(near.id);
    const more = [];
    step(w, 3, more);
    expect(more.some((e) => e.type === 'sourceGone')).toBe(false);                     // once
    step(w, DAYS_PER_MONTH - 9);
    expect(fetchStatus(w, home.id, 'pottery').gone).toBe(true);
    step(w, 2);                                                                        // the month's first day's work
    expect(fetchStatus(w, home.id, 'pottery').gone).toBe(false);
  });
});

describe('v83 k sim: the choices the pick lights', () => {
  it('lists every other store that can hold the good, nearest by road first, with what each can spare and why not', () => {
    const { w, home, near, far } = three(0, 80);
    near.orders = {};
    const kept = store(w, 'storehouse', 22, { pottery: 30 }, { orders: { pottery: { fetch: 30 } } });
    const island = addRaw(w, 'storehouse', 30, 30, { staff: 6, store: { pottery: 90 } });
    store(w, 'granary', 50, { grain: 10 });
    setFetch(w, home.id, 'pottery', 40);
    const list = sourceChoices(w, home.id, 'pottery');
    expect(list.map((c) => [c.id, c.why, c.spare, c.nearest, c.chosen])).toEqual([
      [near.id, 'empty', 0, false, false], [kept.id, 'kept', 0, false, false], [far.id, null, 80, true, false], [island.id, 'unlinked', 90, false, false],
    ]);
    expect(list[0].len).toBe(roadLen(w, home, near));
    expect(list[3].len).toBe(Infinity);
    setSource(w, home.id, 'pottery', far.id);
    expect(sourceChoices(w, home.id, 'pottery').find((c) => c.id === far.id).chosen).toBe(true);
    expect(sourceChoices(w, island.id, 'grain')).toEqual([]);                          // a storehouse does not keep grain: no choices
  });
});

describe('v83 k sim: Build another', () => {
  it('copies the chosen source with the order; a copy without one has none', () => {
    const { w, home, far } = three();
    setFetch(w, home.id, 'pottery', 40);
    setSource(w, home.id, 'pottery', far.id);
    home.orders.linen = { fetch: 20 };                                                 // as a set order with no source today (setFetch would refuse it now)
    expect(settingsOf(home)).toEqual({ fetch: [{ good: 'pottery', fetch: 40, from: far.id }, { good: 'linen', fetch: 20 }], refuses: [] });
    const r = { copy: settingsOf(home) };                                              // what anotherOf hands the copy (copy: settingsOf), the storehouse being unlocked
    const copy = store(w, 'storehouse', 50);
    applySettings(w, copy.id, r.copy);
    expect(copy.orders).toEqual({ pottery: { fetch: 40, from: far.id }, linen: { fetch: 20 } });
    expect(settingsThatApply('storehouse', r.copy).fetch[0].from).toBe(far.id);
    step(w);
    expect(cartOf(w, copy.id).from).toBe(far.id);
  });
});

describe('v83 k sim: the month\'s counts', () => {
  it('counts what came home this month (moved) and rolls it into lastMonth at the month\'s first day\'s work', () => {
    const { w, home } = three();
    setFetch(w, home.id, 'pottery', 60);
    step(w, 10);
    expect(home.orders.pottery.moved).toBeGreaterThan(0);
    expect(lastMonthOf(home, 'pottery')).toBe(0);
    const moved = home.orders.pottery.moved;
    step(w, DAYS_PER_MONTH - 10);
    expect(home.orders.pottery.moved).toBe(moved);                                     // nothing more needed: it holds 60
    step(w, 1);
    expect(home.orders.pottery.lastMonth).toBe(moved);
    expect(home.orders.pottery.moved).toBe(undefined);
    step(w, DAYS_PER_MONTH);
    expect(home.orders.pottery.lastMonth).toBe(undefined);                             // a month with nothing moved: absent, read as 0
    expect(lastMonthOf(home, 'pottery')).toBe(0);
  });

  it('the save check accepts the new fields and refuses bad ones', () => {
    const stores = BUILDINGS.storehouse.stores;
    expect(isOrders({ pottery: { fetch: 40 } }, stores)).toBe(true);
    expect(isOrders({ pottery: { fetch: 40, from: 7, moved: 20, lastMonth: 40, gone: true } }, stores)).toBe(true);
    expect(isOrders({ pottery: { fetch: 40, from: 'x' } }, stores)).toBe(false);
    expect(isOrders({ pottery: { fetch: 40, lastMonth: -1 } }, stores)).toBe(false);
    expect(isOrders({ pottery: { fetch: 40, gone: 1 } }, stores)).toBe(false);
  });
});

describe('v83 k sim: supply lines', () => {
  it('one line per order along its road route, with its source, last month and state', () => {
    const { w, home, near, far } = three(80, 0);
    const granary = store(w, 'granary', 24);
    setFetch(w, home.id, 'pottery', 40);
    home.orders.linen = { fetch: 20 };                                                 // no store has linen: no source (an order set while one had some)
    granary.orders.grain = { fetch: 40 };
    let lines = supplyLines(w);
    expect(lines.map((l) => [l.home, l.good, l.source, l.state])).toEqual([
      [home.id, 'pottery', near.id, 'waiting'], [home.id, 'linen', null, 'none'], [granary.id, 'grain', null, 'none'],
    ]);
    const pot = lines[0];
    expect(pot.path.length).toBe(roadLen(w, home, near));
    expect(adjacentRoadTiles(w, home).includes(pot.path[0])).toBe(true);               // home first: a road tile beside the home
    expect(adjacentRoadTiles(w, near).includes(pot.path[pot.path.length - 1])).toBe(true);
    expect(lines[1].path).toBe(null);
    step(w);
    expect(supplyLines(w)[0].state).toBe('moving');
    setSource(w, home.id, 'pottery', far.id);
    expect(supplyLines(w)[0].source).toBe(near.id);                                    // the cart on the road is still the near store's
    step(w, 6);
    lines = supplyLines(w);
    expect([lines[0].source, lines[0].state, lines[0].chosen]).toEqual([far.id, 'dry', true]);
    expect(lines[0].path.length).toBe(roadLen(w, home, far));
    home.orders.pottery.lastMonth = 40;
    expect(supplyLines(w)[0].lastMonth).toBe(40);
  });
});

describe('v83 k sim: an 8.2.1 save', () => {
  it('orders with no from load as they are and play a year with today\'s rule, the same as before', () => {
    const w = createWorld({ seed: 11, size: 64, mapVariant: 'classic' });
    buildSampleCity(w);
    const info = buildCartsCity(w);
    setFetch(w, info.near, 'pottery', 100);
    // as 8.2.1 wrote it: orders of { fetch } only
    const text = serialize(w);
    expect(Object.values(JSON.parse(text).buildings || {}).some((o) => o && o.orders && Object.values(o.orders).some((r) => 'from' in r))).toBe(false);
    const a = deserialize(text), b = deserialize(text);
    expect(a.buildings[info.near].orders).toEqual({ pottery: { fetch: 100 } });
    advanceDays(a, DAYS_PER_MONTH * 12);
    advanceDays(b, DAYS_PER_MONTH * 12);
    expect(serialize(a)).toBe(serialize(b));
    expect(a.tally.cartTrips).toBeGreaterThan(0);
    expect(a.buildings[info.near].orders.pottery.from).toBe(undefined);
  });

  it('a city with a chosen source saves and loads with it, and both run on the same', () => {
    const { w, home, far } = three();
    setFetch(w, home.id, 'pottery', 60);
    setSource(w, home.id, 'pottery', far.id);
    step(w, 12);
    const copy = deserialize(serialize(w));
    expect(copy.buildings[home.id].orders.pottery.from).toBe(far.id);
    step(w, 40);
    step(copy, 40);
    expect(serialize(copy)).toBe(serialize(w));
    expect(copy.carts.every((c) => c.from === far.id)).toBe(true);
  });
});

describe('v83 k sim: orders list', () => {
  it('ordersOf names from only when chosen', () => {
    const { w, home, far } = three();
    setFetch(w, home.id, 'pottery', 40);
    expect(ordersOf(home)).toEqual([{ good: 'pottery', fetch: 40 }]);
    setSource(w, home.id, 'pottery', far.id);
    expect(ordersOf(home)).toEqual([{ good: 'pottery', fetch: 40, from: far.id }]);
    expect(fetchPreview(w, home.id, 'pottery', 40).chosen).toBe(far.id);
  });
});
