import { describe, it, expect } from '../harness.js';
import { produceDay, storeAccepts, storeTotal } from '../../src/sim/production.js';
import { setAccept, canPlace } from '../../src/sim/commands.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { makeBuilding } from '../../src/sim/world.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { DAYS_PER_MONTH } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw, staffAll, layClay } from '../helpers/testWorld.js';

// Road along y = 10; 2x2 buildings at y = 8 touch it. Two such buildings at x and x' (x' >= x + 2) sit x' - x road
// tiles apart, so with a producer reach of 12 a store 12 along is in reach and one 13 along is not.
function row() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const month = (w) => { for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w); };
const alertKeys = (w) => alertsFor(w).map((a) => `${a.code}:${a.id}`);

describe('production chains', () => {
  it('fills a storehouse from a clay pit at 40 a month, counting what was made but not as a harvest', () => {
    const w = row();
    const pit = addRaw(w, 'clay_pit', 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    staffAll(w);
    month(w);
    expect(store.store.clay).toBe(40);
    expect(pit.blocked).toBe(null);
    expect(w.tally.made.clay).toBe(40);
    expect(w.tally.harvested).toBe(0);
  });
  it('still counts grain reaching a granary as a harvest, and as grain made', () => {
    const w = row();
    addRaw(w, 'farm_grain', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    month(w);
    expect(granary.store.grain).toBe(30);
    expect(w.tally.harvested).toBe(30);
    expect(w.tally.made.grain).toBe(30);
  });
  it('makes 30 pottery a month at full staff, one clay for each pot, from and to the storehouse', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 100 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    month(w);
    expect(store.store.pottery).toBe(30);
    expect(store.store.clay).toBe(70);
    expect(potter.blocked).toBe(null);
    expect(w.tally.made.pottery).toBe(30);
    expect(w.tally.made.clay).toBe(undefined);
  });
  it('makes half as much at half staff', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 100 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    potter.staff = BUILDINGS.potter.workers / 2;
    month(w);
    expect(store.store.pottery).toBe(15);
    expect(store.store.clay).toBe(85);
  });
  it('runs a whole chain: clay pit to storehouse to potter and back', () => {
    const w = row();
    addRaw(w, 'clay_pit', 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    addRaw(w, 'potter', 16, 8);
    staffAll(w);
    month(w);
    month(w);
    expect(w.tally.made.clay).toBe(80);
    expect(store.store.pottery).toBe(60);   // the pit digs at least one clay a day, so the potter never waits
    expect(store.store.clay).toBe(20);      // every pot used up one of the 80 clay dug
  });
  it('waits with no_input while no store within producer reach holds clay, and says so in the alerts', () => {
    const w = row();
    const near = addRaw(w, 'storehouse', 13, 8);
    const far = addRaw(w, 'storehouse', 23, 8, { store: { clay: 50 } });   // 13 road tiles from the potter: out of reach
    const potter = addRaw(w, 'potter', 10, 8);
    staffAll(w);
    produceDay(w);
    expect(potter.blocked).toBe('no_input');
    expect(potter.progress).toBe(0);
    expect(far.store.clay).toBe(50);
    expect(alertKeys(w)).toContain(`no_input:${potter.id}`);
    near.store.clay = 5;
    produceDay(w);
    expect(potter.blocked).toBe(null);
    expect(alertKeys(w).some((k) => k.startsWith('no_input'))).toBe(false);
  });
  it('draws on a store exactly at the edge of its reach', () => {
    const w = row();
    const edge = addRaw(w, 'storehouse', 22, 8, { store: { clay: 50 } });   // 12 road tiles from the potter
    const potter = addRaw(w, 'potter', 10, 8);
    staffAll(w);
    month(w);
    expect(potter.blocked).toBe(null);
    expect(edge.store.pottery).toBe(30);
  });
  it('stops mid-month with no_input when the clay runs out', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 4 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    month(w);
    expect(store.store.pottery).toBe(4);
    expect(store.store.clay).toBe(0);
    expect(potter.blocked).toBe('no_input');
  });
  it('takes clay from the nearest store holding it', () => {
    const w = row();
    const far = addRaw(w, 'storehouse', 5, 8, { store: { clay: 20 } });   // 11 road tiles from the potter
    const near = addRaw(w, 'storehouse', 13, 8, { store: { clay: 20 } });
    addRaw(w, 'potter', 16, 8);
    staffAll(w);
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(near.store.clay).toBe(10);
    expect(near.store.pottery).toBe(10);
    expect(far.store.clay).toBe(20);
  });
  it('keeps a full storehouse that holds clay working: each pot takes the place of its clay', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 800 } });
    const potter = addRaw(w, 'potter', 16, 8);
    const pit = addRaw(w, 'clay_pit', 10, 8);
    staffAll(w);
    month(w);
    expect(store.store.pottery).toBe(30);
    expect(store.store.clay).toBe(770);
    expect(storeTotal(store)).toBe(800);
    expect(potter.blocked).toBe(null);
    expect(pit.blocked).toBe('no_storage');
  });
  // Storehouse A is nearest the potter and holds clay but takes no pottery; B is full of clay and takes pottery. The
  // potter must draw on B (a pot takes the place of its clay) rather than stop on A's clay and never use B's.
  const fullStoreBeyondANonTarget = (makeANonTarget) => {
    const w = row();
    const a = addRaw(w, 'storehouse', 13, 8, { store: { clay: 10 } });    // 3 road tiles from the potter
    const b = addRaw(w, 'storehouse', 5, 8, { store: { clay: 800 } });    // 11 road tiles from the potter
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    makeANonTarget(w, a);
    month(w);
    expect(potter.blocked).toBe(null);
    expect(b.store.pottery).toBe(30);
    expect(b.store.clay).toBe(770);
    expect(storeTotal(b)).toBe(800);
    expect(a.store.clay).toBe(10);
    expect(a.store.pottery).toBe(undefined);
  };
  it('does not deadlock when its nearest clay is in a store that is not working, while a full working store holds clay', () => {
    fullStoreBeyondANonTarget((w, a) => { a.paused = true; });
  });
  it('does not deadlock when its nearest clay is in a store that refuses pottery, while a full store that takes it holds clay', () => {
    fullStoreBeyondANonTarget((w, a) => { setAccept(w, a.id, 'pottery', false); });
  });
  it('sends a refused good to the next store that takes it, and stops with no_storage when none does', () => {
    const w = row();
    const pit = addRaw(w, 'clay_pit', 10, 8);
    const near = addRaw(w, 'storehouse', 13, 8);
    const next = addRaw(w, 'storehouse', 16, 8);
    staffAll(w);
    expect(setAccept(w, near.id, 'clay', false).ok).toBe(true);
    for (let d = 0; d < 3; d++) produceDay(w);
    expect(near.store.clay || 0).toBe(0);
    expect(next.store.clay).toBe(4);
    expect(setAccept(w, next.id, 'clay', false).ok).toBe(true);
    produceDay(w);
    expect(pit.blocked).toBe('no_storage');
    expect(alertKeys(w)).toContain(`no_storage:${pit.id}`);
    expect(next.store.clay).toBe(4);                     // refusing keeps what it already holds
    expect(setAccept(w, near.id, 'clay', true).ok).toBe(true);
    produceDay(w);
    expect(pit.blocked).toBe(null);
  });
  it('still lets a workshop draw on a good its storehouse refuses, but never delivers to it', () => {
    const w = row();
    const refusing = addRaw(w, 'storehouse', 13, 8, { store: { clay: 10 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    setAccept(w, refusing.id, 'clay', false);
    for (let d = 0; d < 3; d++) produceDay(w);
    expect(refusing.store.clay).toBe(7);
    expect(refusing.store.pottery).toBe(3);
    setAccept(w, refusing.id, 'pottery', false);
    produceDay(w);
    expect(potter.blocked).toBe('no_storage');
    expect(refusing.store.clay).toBe(7);
  });
  it('lets a granary take only food: figs yes, clay no', () => {
    const w = row();
    const orchard = addRaw(w, 'farm_fig', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    const pit = addRaw(w, 'clay_pit', 10, 8);
    staffAll(w);
    month(w);
    expect(granary.store.figs).toBe(24);
    expect(granary.store.clay).toBe(undefined);
    expect(orchard.blocked).toBe(null);
    expect(pit.blocked).toBe('no_storage');
    expect(w.tally.harvested).toBe(24);                  // figs are food: they count as a harvest too
    expect(w.tally.made.figs).toBe(24);
  });
  it('delivers only to a working store', () => {
    const w = row();
    const pit = addRaw(w, 'clay_pit', 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    staffAll(w);
    store.paused = true;
    produceDay(w);
    expect(pit.blocked).toBe('no_storage');
    store.paused = false;
    produceDay(w);
    expect(pit.blocked).toBe(null);
  });
  it('raises storage_full on any full store, granary or storehouse', () => {
    const w = row();
    const granary = addRaw(w, 'granary', 2, 8, { store: { grain: 600 } });
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 500, pottery: 299 } });
    staffAll(w);
    expect(alertKeys(w)).toContain(`storage_full:${granary.id}`);
    expect(alertKeys(w).includes(`storage_full:${store.id}`)).toBe(false);
    store.store.pottery = 300;
    expect(alertKeys(w)).toContain(`storage_full:${store.id}`);
  });
  it('says which stores accept a good', () => {
    const w = row();
    const granary = addRaw(w, 'granary', 2, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    expect(storeAccepts(granary, 'grain')).toBe(true);
    expect(storeAccepts(granary, 'figs')).toBe(true);
    expect(storeAccepts(granary, 'clay')).toBe(false);
    expect(storeAccepts(store, 'pottery')).toBe(true);
    expect(storeAccepts(store, 'grain')).toBe(false);
    expect(storeAccepts(addRaw(w, 'potter', 16, 8), 'pottery')).toBe(false);
    setAccept(w, store.id, 'pottery', false);
    expect(storeAccepts(store, 'pottery')).toBe(false);
    expect(storeAccepts(store, 'clay')).toBe(true);
  });
  it('gives a new storehouse an empty accepts record and nothing else one', () => {
    const w = row();
    expect(makeBuilding(w, 'storehouse', 13, 8).accepts).toEqual({});
    expect('accepts' in makeBuilding(w, 'granary', 2, 8)).toBe(false);
    expect('accepts' in makeBuilding(w, 'potter', 2, 8)).toBe(false);
  });
  it('setAccept: only a storehouse, and only for a good it stores', () => {
    const w = row();
    const granary = addRaw(w, 'granary', 2, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    expect(setAccept(w, 999, 'clay', false)).toEqual({ ok: false, reason: 'nothing_here', warnings: [] });
    expect(setAccept(w, granary.id, 'grain', false).reason).toBe('not_storage');
    expect(setAccept(w, store.id, 'grain', false).reason).toBe('not_storage');
    expect(setAccept(w, store.id, 'nonsense', false).reason).toBe('not_storage');
    expect(setAccept(w, store.id, 'beer', false)).toEqual({ ok: true, warnings: [] });
    expect(store.accepts).toEqual({ beer: false });
    expect(JSON.parse(JSON.stringify(store)).accepts).toEqual({ beer: false });   // plain data: it saves
    expect(setAccept(w, store.id, 'beer', true).ok).toBe(true);
    expect(store.accepts).toEqual({});
  });
  it('warns on placement when no store within reach accepts the good', () => {
    const w = row();
    layClay(w, 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    w.milestone = 'town';                                  // clay pits unlock at Town
    expect(canPlace(w, 'clay_pit', 10, 8).warnings).toEqual([]);
    setAccept(w, store.id, 'clay', false);
    expect(canPlace(w, 'clay_pit', 10, 8).warnings).toEqual(['no_storage']);
  });
});
