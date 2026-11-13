// Version 10.0.1, Track S, the review's fixes (rulings 2390-2397): the store sheet's line, findSource between two stores fetching for their neighbours,
// the kept map, the sortie's hold on its band, a band the unit cannot walk to, and the cases the review asked to see.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { raidDay } from '../../../src/sim/raids.js';
import { combatDay, threatBands } from '../../../src/sim/combat.js';
import { cartDay, autoFetchMap, autoFetchMapUncached, autoFetchFor, findSource } from '../../../src/sim/carts.js';
import { produceDay } from '../../../src/sim/production.js';
import { restockBazaars } from '../../../src/sim/distribution.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { RAIDS } from '../../../src/data/raids.js';
import { UNIT_TYPES, footMix } from '../../../src/data/armies.js';
import { AUTO_FETCH } from '../../../src/data/s47.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { V1001S_TEXT } from '../../../src/ui/text.js';

// A road along y = 10 (x 0-63); stores, workshops and bazaars stand south of it at y = 11.
function street() {
  const w = makeTestWorld({ size: 64, fertile: [] });
  setRoad(w, 0, 10, 63, 10);
  return w;
}
const at = (w, type, x, extra = {}) => addRaw(w, type, x, 11, { staff: BUILDINGS[type].workers, ...extra });
// A staffed bazaar at (9, 11) with an empty stall, a storehouse with no orders by it at (16, 11), and pottery 40 road tiles away at (56, 11).
function bazaarStreet({ near = {}, stall = {} } = {}) {
  const w = street();
  const bazaar = at(w, 'bazaar', 9, { store: { ...stall } });
  const store = at(w, 'storehouse', 16, { store: { ...near } });
  const far = at(w, 'storehouse', 56, { store: { pottery: 100 } });
  return { w, bazaar, store, far };
}

describe('v1001 s review: the store sheet says what the store really does (ruling 2391)', () => {
  it('fetching while it holds less than AUTO_FETCH.amount, staffs a cart and has a source; "keeps stocked" once it holds that much; nothing it cannot fetch', () => {
    const empty = bazaarStreet();
    const f = autoFetchFor(empty.w, empty.store);
    expect([f.fetching, f.goods.includes('pottery')]).toEqual([true, true]);
    const full = bazaarStreet({ near: { pottery: AUTO_FETCH.amount + 340 } });
    const k = autoFetchFor(full.w, full.store);
    expect([k.fetching, k.goods.includes('pottery'), V1001S_TEXT.keepsFor(k.who, ['pottery'])]).toEqual([false, true, 'Keeps stocked for nearby bazaars: pottery']);
    const idle = bazaarStreet();
    idle.store.staff = 0;
    expect(autoFetchFor(idle.w, idle.store)).toBe(null);                              // no cart to send
    const cut = bazaarStreet();
    cut.w.road[idx(64, 40, 10)] = 0; cut.w.roadVersion++;                             // the far store's road cut: no source
    expect(autoFetchFor(cut.w, cut.store)).toBe(null);
  });
  it('leaves out a bazaar whose stall still holds the good', () => {
    const { w, store } = bazaarStreet({ stall: { pottery: 5 } });
    const m = autoFetchMap(w);
    expect(Boolean(m.get(store.id) && m.get(store.id).has('pottery'))).toBe(false);
  });
  it('sends a real cart for a bazaar: the pottery comes from the far store, lands at the near one and fills the stall', () => {
    const { w, bazaar, store, far } = bazaarStreet();
    for (let d = 0; d < 20 && !(store.store.pottery > 0); d++) { w.day += 1; cartDay(w); }
    expect([store.store.pottery > 0, far.store.pottery < 100, w.tally.cartTrips > 0]).toEqual([true, true, true]);
    restockBazaars(w);
    expect(bazaar.store.pottery).toBeGreaterThan(0);
  });
});

describe('v1001 s review: two stores fetching the same good (ruling 2392)', () => {
  it('draws on one that holds plenty above the amount it keeps, and never passes the good back', () => {
    // Potter 1 at (4, 11) with store A at (8, 11), empty; potter 2 at (30, 11) with store C at (26, 11), 200 clay, the only store in its reach; a far store at
    // (56, 11) with 10 clay. Both A and C fetch clay for their neighbours.
    const w = street();
    at(w, 'potter', 4); const a = at(w, 'storehouse', 8, { store: {} });
    at(w, 'potter', 30); const c = at(w, 'storehouse', 26, { store: { clay: 200 } });
    at(w, 'storehouse', 56, { store: { clay: 10 } });
    const auto = autoFetchMap(w);
    expect([auto.get(a.id).has('clay'), auto.get(c.id).has('clay')]).toEqual([true, true]);
    const src = findSource(w, a, 'clay');
    expect([src.b.id, src.surplus]).toEqual([c.id, 200 - AUTO_FETCH.amount]);
    for (let d = 0; d < 30; d++) { w.day += 1; cartDay(w); }
    expect(w.carts.some((x) => x.from === a.id && x.to === c.id)).toBe(false);
    expect(c.store.clay).toBeGreaterThanOrEqual(AUTO_FETCH.amount);
  });
});

describe('v1001 s review: the kept map (ruling 2393)', () => {
  it('gives the same map while nothing it reads changes, and a new one once a store\'s stock does', () => {
    const { w, store } = bazaarStreet();
    const m1 = autoFetchMap(w), m2 = autoFetchMap(w);
    expect(m1 === m2).toBe(true);
    store.store.pottery = 5;
    const m3 = autoFetchMap(w);
    expect(m3 === m1).toBe(false);
    expect(JSON.stringify([...m3].map(([k, v]) => [k, [...v.keys()]]))).toBe(JSON.stringify([...m1].map(([k, v]) => [k, [...v.keys()]])));   // still fetching: held by itself only
  });
  it('is the map worked out afresh on every day of a city where carts, workshops and a bazaar move goods', () => {
    const w = street();
    at(w, 'potter', 4); at(w, 'storehouse', 8, { store: {} });
    at(w, 'bazaar', 20, { store: {} }); at(w, 'storehouse', 26, { store: {} });
    at(w, 'storehouse', 56, { store: { clay: 120, pottery: 60, beer: 40 } });
    const plain = (m) => JSON.stringify([...m].map(([k, v]) => [k, [...v].map(([g, x]) => [g, x.workshop, x.bazaar])]));
    for (let d = 0; d < 40; d++) {
      w.day += 1;
      produceDay(w); cartDay(w); restockBazaars(w);
      expect([d, plain(autoFetchMap(w))]).toEqual([d, plain(autoFetchMapUncached(w))]);
    }
  });
});

// A 40x40 town: a barracks at (2, 22), a storehouse the band goes for at (30, 16), raiders from the east.
const EAST = { x: 39, y: 20 };
function town() {
  const w = makeTestWorld({ size: 40, gold: 2000, raiderEntries: [EAST] });
  setRoad(w, 0, 20, 39, 20);
  w.milestone = 'market_town';
  addRaw(w, 'storehouse', 30, 16);
  return w;
}
const unit = (w, kind, b, x, y) => { const s = { id: w.nextUnitId++, kind, barracks: b.id, x, y, hp: UNIT_TYPES[kind].hp, hit: false, task: 'wait' }; w.soldiers.push(s); return s; };
const raider = (id, x, y, band) => ({ id, kind: 'foot', x, y, hp: 10, hit: false, ...(band ? { band: 1 } : {}) });
const raidWith = (w, raiders, phase = 'attack', second = null) => {
  w.raid.active = { index: 0, entry: { ...EAST }, dir: 'east', size: raiders.length, target: 'storehouse', day: w.day, raiders, phase, targetId: null, struck: [], wait: 0,
    byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [], ...(second ? { second: { entry: { x: 0, y: 0 }, dir: 'north', x: 0, y: 0, targetId: null, struck: [], wait: 0, blocked: null, ...second } } : {}) };
  return w.raid.active;
};

describe('v1001 s review: the sortie (rulings 2394, 2395)', () => {
  it('keeps the band it went for while that band attacks, though the band\'s way bends off from its target', () => {
    const w = town();
    const bar = addRaw(w, 'barracks', 2, 22);
    const s = unit(w, 'soldier', bar, 3, 23);
    const a = raidWith(w, [raider(900, 36, 4)]);                                      // attacking, far from every building: no threat by distance
    expect(threatBands(w, a, s)).toEqual([]);
    s.task = 'out'; s.chase = 0;
    expect(threatBands(w, a, s)).toEqual([0]);                                       // the unit out keeps its band
    combatDay(w);
    expect([s.task, s.chase, s.x > 3]).toEqual(['out', 0, true]);
    a.phase = 'retreat';
    combatDay(w);
    expect([s.task === 'back' || s.task === 'wait', 'chase' in s]).toEqual([true, false]);   // the band falls back: it lets it go and walks home
  });
  it('keeps its band over a second band about as near', () => {
    const w = town();
    const bar = addRaw(w, 'barracks', 2, 22);
    const s = unit(w, 'soldier', bar, 20, 20);
    const a = raidWith(w, [raider(900, 24, 20), raider(901, 16, 20, true)], 'strike', { phase: 'strike' });
    s.task = 'out'; s.chase = 1;
    expect(threatBands(w, a, s)[0]).toBe(1);
    combatDay(w);
    expect(s.x).toBeLessThan(20);                                                     // toward band 1's raider, not band 0's
  });
  it('passes over a band it cannot walk to, for the next one it can, and with none waits at home', () => {
    const w = town();
    for (let y = 0; y < 40; y++) w.terrain[idx(40, 25, y)] = T.WATER;               // a river down x = 25 ...
    w.road[idx(40, 25, 20)] = 0; w.roadVersion++;                                    // ... and no bridge where the road met it
    const bar = addRaw(w, 'barracks', 2, 22);
    const s = unit(w, 'soldier', bar, 3, 23);
    raidWith(w, [raider(900, 32.5, 23.5)], 'strike');
    combatDay(w);
    expect([s.task, s.x]).toEqual(['wait', 3]);                                       // across the river: it stays at home
    raidWith(w, [raider(900, 32.5, 23.5), raider(901, 10.5, 30.5, true)], 'strike', { phase: 'strike' });
    combatDay(w);
    expect([s.task, s.chase]).toEqual(['out', 1]);
  });
  it('lets a unit whose building is destroyed mid-sortie leave service, and the raid goes on', () => {
    const w = town();
    const bar = addRaw(w, 'barracks', 2, 22);
    staffAll(w);
    const s = unit(w, 'soldier', bar, 3, 23);
    raidWith(w, [raider(900, 6, 23)], 'strike');
    combatDay(w);
    expect(s.task).toBe('out');
    removeBuilding(w, bar.id);
    w.day += 1; raidDay(w, []);
    expect(w.soldiers.some((u) => u.id === s.id)).toBe(false);
    expect(Boolean(w.raid.active)).toBe(true);
  });
});

describe('v1001 s review: a save mid-raid with half a tile carried (ruling 2397)', () => {
  it('loads with active.stride 0.5 and plays on exactly as the world it was saved from', () => {
    const w = makeTestWorld({ size: 40, gold: 2000, raiderEntries: [EAST] });
    setRoad(w, 0, 20, 39, 20);
    w.milestone = 'market_town';
    addRaw(w, 'storehouse', 2, 18);
    w.raid.index = 3; w.day = 2000;
    w.raid.warning = { index: 2, entry: { ...EAST }, dir: 'east', size: 3, tribute: 240, target: 'storehouse', day: w.day - RAIDS.warningDays, arrives: w.day, first: false, mix: { ...footMix(0), foot: 3 } };
    raidDay(w, []);
    w.day += 1; raidDay(w, []);
    expect(w.raid.active.stride).toBe(0.5);
    const c = deserialize(serialize(w));
    expect(c.raid.active.stride).toBe(0.5);
    for (let d = 0; d < 10; d++) { w.day += 1; raidDay(w, []); c.day += 1; raidDay(c, []); }
    expect(serialize(c)).toBe(serialize(w));
  });
});
