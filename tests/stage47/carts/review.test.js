// Stage 4.7 Task 5 review fixes (landed with Task 6): a cart home on its due day lands even when the road is cut that very day; three stores
// fetching one good settle with no trips at the end; goods are conserved over many days of road cuts, mends, demolishes and rebuilds; the words
// match the sim (refusal, round trip, the order that goes first).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { cartDay, setFetch, cartOf, fetchStatus, roundTripDays, tripTimes, fetchPreview, nextTrip } from '../../../src/sim/carts.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { idx } from '../../../src/sim/grid.js';
import { S47_CARTS_TEXT as W } from '../../../src/ui/text.js';

function street(size = 128) {
  const w = makeTestWorld({ size, fertile: [] });
  setRoad(w, 0, 10, size - 1, 10);
  return w;
}
const store = (w, type, x, held = {}, extra = {}) => addRaw(w, type, x, 11, { staff: BUILDINGS[type].workers, store: { ...held }, ...extra });
const step = (w, n = 1, events = null) => { for (let i = 0; i < n; i++) { cartDay(w, events); w.day += 1; } };
const cutRoad = (w, x) => { w.road[idx(w.size, x, 10)] = 0; w.roadVersion++; };
const inFlight = (c) => c.state === 'out' || c.state === 'back' || (c.state === 'return' && c.dest === 'source');
const total = (w, good) => Object.values(w.buildings).reduce((s, b) => s + ((b.store && b.store[good]) || 0), 0)
  + w.carts.reduce((s, c) => s + (c.good === good && inFlight(c) ? c.amount : 0), 0);

describe('s47 carts review: landing beats a road cut on the due day', () => {
  it('a cart on its way back whose due day has come puts its goods down even if the road is cut that day', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    step(w, 7);                                                                       // set out on day 0, due day 7 (28 tiles: 4 out, 7 round trip)
    expect(cartOf(w, home.id).due).toBe(7);
    expect(cartOf(w, home.id).state).toBe('back');
    cutRoad(w, 20);
    const events = [];
    cartDay(w, events);                                                               // day 7: the due day, and the road is cut
    expect(events.map((e) => e.type)).toEqual(['cartHome']);                          // no turning round at the door
    expect(home.store.pottery).toBe(20);
    expect(far.store.pottery).toBe(30);
    expect(w.tally.cartTrips).toBe(1);
    expect(w.carts.length).toBe(0);
  });

  it('a cut the day before the due day still turns the cart round', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    setFetch(w, home.id, 'pottery');
    step(w, 6);                                                                       // day 6, the day before
    cutRoad(w, 20);
    cartDay(w);
    expect(cartOf(w, home.id).state).toBe('return');
    expect(w.tally.cartTrips).toBe(0);
    expect(far.store.pottery).toBe(30);
  });
});

describe('s47 carts review: no ping-pong between three stores', () => {
  const settle = (w, days = 200) => {
    step(w, days / 2);
    const tripsHalf = w.tally.cartTrips;
    step(w, days / 2);
    expect(w.tally.cartTrips).toBe(tripsHalf);                                        // the second half sends nobody
    expect(w.carts.length).toBe(0);
  };

  it('three stores fetching one good, all with the same order, settle with no trips at the end', () => {
    const w = street();
    const a = store(w, 'storehouse', 2, { pottery: 150 }), b = store(w, 'storehouse', 22), c = store(w, 'storehouse', 42);
    a.orders = { pottery: { fetch: 100 } };
    expect(setFetch(w, b.id, 'pottery').ok).toBe(true);
    expect(setFetch(w, c.id, 'pottery').ok).toBe(true);
    settle(w);
    expect(a.store.pottery).toBe(100);                                                // never drawn below its own order
    expect((b.store.pottery || 0) + (c.store.pottery || 0)).toBe(50);                 // the 50 that were spare went to the two that fetch
    expect(total(w, 'pottery')).toBe(150);
  });

  it('three stores short of the order and one long: the long one is drawn to its order and no further, then nothing moves', () => {
    const w = street();
    const a = store(w, 'storehouse', 2, { pottery: 90 }), b = store(w, 'storehouse', 22, { pottery: 80 }), c = store(w, 'storehouse', 42, { pottery: 300 });
    for (const s of [a, b, c]) s.orders = { pottery: { fetch: 100 } };
    settle(w);
    expect([a.store.pottery, b.store.pottery, c.store.pottery]).toEqual([100, 100, 270]);
    expect(total(w, 'pottery')).toBe(470);
  });

  it('three stores with the same order and none long enough settle where they are', () => {
    const w = street();
    const a = store(w, 'storehouse', 2, { pottery: 60 }), b = store(w, 'storehouse', 22, { pottery: 50 }), c = store(w, 'storehouse', 42, { pottery: 40 });
    for (const s of [a, b, c]) s.orders = { pottery: { fetch: 100 } };
    settle(w, 100);
    expect([a.store.pottery, b.store.pottery, c.store.pottery]).toEqual([60, 50, 40]);
  });
});

describe('s47 carts review: goods are conserved over many days of cuts, mends, demolishes and rebuilds', () => {
  // A small deterministic generator for the test's own choices (the sim draws nothing).
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

  for (const seed of [3, 11, 29]) {
    it(`seed ${seed}: stores plus carts on the road equal what went in, less what a cart lost and what a demolished store held`, () => {
      const rand = rng(seed), pick = (n) => Math.floor(rand() * n);
      const w = street();
      const xs = [2, 12, 22, 32, 42, 52];
      const goods = ['pottery', 'linen'];
      const slot = new Map();                                                          // x -> store id (absent when demolished)
      const expected = { pottery: 0, linen: 0 };
      const build = (x) => {
        const held = { pottery: pick(3) * 60, linen: pick(2) * 70 };
        const b = store(w, 'storehouse', x, held);
        b.orders = {};
        for (const g of goods) if (rand() < 0.6) b.orders[g] = { fetch: 40 + pick(5) * 30 };
        for (const g of goods) expected[g] += held[g];
        slot.set(x, b.id);
      };
      xs.forEach(build);
      const cut = new Set();
      let trips = 0;
      for (let day = 0; day < 260; day++) {
        const roll = rand();
        if (roll < 0.10) {                                                              // cut a road tile between the stores
          const x = 4 + pick(54);
          if (!cut.has(x)) { cutRoad(w, x); cut.add(x); }
        } else if (roll < 0.22 && cut.size) {                                           // mend one
          const x = [...cut][pick(cut.size)];
          setRoad(w, x, 10, x, 10); cut.delete(x);
        } else if (roll < 0.28) {                                                       // demolish a store, its shelves go with it
          const x = xs[pick(xs.length)], id = slot.get(x);
          if (id !== undefined && w.buildings[id]) {
            const b = removeBuilding(w, id);
            for (const g of goods) expected[g] -= (b.store[g] || 0);
            slot.delete(x);
          }
        } else if (roll < 0.36) {                                                       // rebuild one where none stands
          const free = xs.filter((x) => !slot.has(x));
          if (free.length) build(free[pick(free.length)]);
        }
        const events = [];
        cartDay(w, events);
        w.day += 1;
        for (const e of events) {
          if (e.type === 'cartLost') expected[e.good] -= e.amount;
          if (e.type === 'cartHome') trips++;
        }
        for (const g of goods) {
          if (total(w, g) !== expected[g]) throw new Error(`seed ${seed} day ${day}: ${g} ${total(w, g)} != ${expected[g]}`);
        }
      }
      expect(trips).toBeGreaterThan(0);                                                // the loop really moved goods
    });
  }
});

describe('s47 carts review: the words tell what the sim does', () => {
  it('the refusal and the consequence both say "to spare", true of a store with no surplus', () => {
    const w = street();
    const home = store(w, 'storehouse', 2), far = store(w, 'storehouse', 30, { pottery: 50 });
    far.orders = { pottery: { fetch: 50 } };                                          // holds 50, wants 50: nothing to spare
    expect(W.refusal(setFetch(w, home.id, 'pottery'))).toBe('No store with pottery to spare is linked by road');
    expect(W.consequence(fetchPreview(w, home.id, 'pottery', 100))).toBe('Keep pottery stocked: no store with pottery to spare is linked by road');   // Version 8.3: Keep stocked
    far.orders = {};
    expect(setFetch(w, home.id, 'pottery').ok).toBe(true);
  });

  it('the trip length is the sim\'s round trip, ceil(2 * len / speed), not twice the leg', () => {
    for (const farX of [10, 16, 30, 44, 70, 110]) {
      const w = street();
      const home = store(w, 'storehouse', 2);
      const far = store(w, 'storehouse', farX, { pottery: 50 });
      setFetch(w, home.id, 'pottery', 20);
      const pv = fetchPreview(w, home.id, 'pottery', 20);
      const len = pv.source.len;
      expect(pv.source.roundTrip).toBe(roundTripDays(len));
      expect(roundTripDays(len)).toBe(tripTimes(len, 0).due);
      expect(roundTripDays(len)).toBe(Math.max(Math.ceil(len / 8) + 1, Math.ceil((2 * len) / 8)));
      expect(W.consequence(pv)).toContain(`(a round trip takes ${pv.source.roundTrip} day`);
      let n = 1;
      step(w, 1);
      while (w.carts.length && n < 100) { step(w); n++; }
      expect(n - 1).toBe(pv.source.roundTrip);                                         // the cart is home on exactly that day
      expect(home.store.pottery).toBe(20);
      expect(far.store.pottery).toBe(30);
    }
  });

  it('"a cart sets out next" names only the order that really goes first; the others say the cart serves another good first', () => {
    const w = street();
    const home = store(w, 'storehouse', 2);
    store(w, 'storehouse', 30, { pottery: 80, linen: 80 });
    home.orders = { pottery: { fetch: 100 }, linen: { fetch: 40 } };
    home.store.pottery = 50;                                                          // pottery: 50 of its 100 still to get; linen: all of its 40; linen goes first
    expect(nextTrip(w, home).good).toBe('linen');
    const sl = fetchStatus(w, home.id, 'linen'), sp = fetchStatus(w, home.id, 'pottery');
    expect(sl.state).toBe('ready');
    expect(W.status(sl)).toContain('A cart sets out next');
    expect(sp.state).toBe('other');
    expect(W.status(sp)).toBe('The cart serves another good first');   // Version 8.3: the row names the good
    step(w);                                                                          // linen's cart is out; pottery still waits
    expect(cartOf(w, home.id).good).toBe('linen');
    expect(fetchStatus(w, home.id, 'pottery').state).toBe('other');
    expect(W.status(fetchStatus(w, home.id, 'linen'))).toContain('on the way');
  });
});
