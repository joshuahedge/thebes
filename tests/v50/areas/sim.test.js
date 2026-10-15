// Version 5.0 Task 4 (rulings 550-559): the area core in the sim (src/sim/areas.js) and Build another's rule (src/sim/another.js). Each rule both ways: the world
// set up so it holds and then changed so it does not, the numbers compared with the sim's own functions (costOf, checkTiles, canAfford, canPlace).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { previewAreaTiles, paintAreaTiles } from '../../../src/sim/areas.js';
import { anotherOf, applySettings, settingsOf } from '../../../src/sim/another.js';
import { checkTiles, canPlace, rectTiles, setAccept } from '../../../src/sim/commands.js';
import { costOf } from '../../../src/sim/costs.js';
import { undo } from '../../../src/sim/undo.js';
import { ordersOf, setFetch } from '../../../src/sim/carts.js';
import { allBuildings } from '../../../src/sim/world.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

const rect = (w, x0, y0, x1, y1) => rectTiles(x0, y0, x1, y1, w.size);
const city = (opts = {}) => { const w = makeTestWorld(opts); w.milestone = 'capital'; return w; };

describe('v50 areas: farms', () => {
  it('packs as many whole farms as fit, each on fertile ground, at the sim\'s price', () => {
    const w = city();                                                   // fertile land: x 0-7, every row
    const r = previewAreaTiles(w, 'farm_grain', rect(w, 0, 0, 5, 5));   // 6 x 6 tiles: three farms a row, three rows
    expect(r.ok).toBe(true);
    expect(r.positions.length).toBe(9);
    expect(r.unit).toBe(costOf(w, 'farm_grain'));
    expect(r.cost).toBe(9 * costOf(w, 'farm_grain'));
    for (const [x, y] of r.positions) expect(checkTiles(w, 'farm_grain', x, y)).toBe('needs_road');   // valid ground; only the road is missing
    expect(r.warnings.includes('needs_road')).toBe(true);
    const taken = new Set();
    for (const [x, y] of r.positions) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = `${x + dx},${y + dy}`; expect(taken.has(k)).toBe(false); taken.add(k); }
  });
  it('packs 2 x 2 farms into odd rectangles without overlap', () => {
    const w = city();
    expect(previewAreaTiles(w, 'farm_grain', rect(w, 0, 0, 4, 2)).positions.length).toBe(2);   // 5 x 3: two a row, one row
    expect(previewAreaTiles(w, 'farm_grain', rect(w, 0, 0, 2, 4)).positions.length).toBe(2);   // 3 x 5
    expect(previewAreaTiles(w, 'farm_grain', rect(w, 0, 0, 0, 7)).reason).toBe('nothing_to_place');   // a single column fits no 2 x 2
  });
  it('takes columns when they pack more than rows', () => {
    const w = city();
    w.terrain[idx(w.size, 0, 0)] = T.WATER;                              // a 4 x 3 patch with its corner under water: rows lay one farm, columns two
    const r = previewAreaTiles(w, 'farm_grain', rect(w, 0, 0, 3, 2));
    expect(r.positions).toEqual([[0, 1], [2, 0]]);
    for (const [x, y] of r.positions) expect(checkTiles(w, 'farm_grain', x, y)).toBe('needs_road');
  });
  it('leaves out water, sand and taken tiles, and names them as skipped by the sim\'s own tile reason', () => {
    const w = city();
    for (let y = 2; y <= 3; y++) for (let x = 2; x <= 3; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
    addRaw(w, 'house', 5, 0);
    const r = previewAreaTiles(w, 'farm_grain', rect(w, 0, 0, 9, 5));  // x 8-9 is sand
    expect([...new Set(r.skipped.map((k) => k.reason))].sort()).toEqual(['needs_fertile', 'occupied', 'water']);
    expect(r.skipped.filter((k) => k.reason === 'water').length).toBe(4);
    expect(r.skipped.filter((k) => k.reason === 'needs_fertile').length).toBe(12);   // two columns of six
    expect(r.skipped.filter((k) => k.reason === 'occupied').length).toBe(1);
    for (const [x, y] of r.positions) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(r.skipped.some((k) => k.x === x + dx && k.y === y + dy)).toBe(false);
  });
  it('carries no road warning once a road touches every farm, and lays nothing on bare sand', () => {
    const w = city();
    setRoad(w, 4, 0, 4, 5);                                              // beside the farms of x 2-3
    const r = previewAreaTiles(w, 'farm_grain', rect(w, 2, 0, 3, 5));
    expect(r.positions.length).toBe(3);
    expect(r.warnings.includes('needs_road')).toBe(false);
    const sand = previewAreaTiles(w, 'farm_grain', rect(w, 10, 0, 15, 5));
    expect(sand.reason).toBe('nothing_to_place');
    expect(sand.skipped.length).toBe(36);
  });
  it('lays them all in one go, charged once, as one undo step', () => {
    const w = city({ gold: 1000 });
    const before = Object.keys(w.buildings).length;
    const r = paintAreaTiles(w, 'farm_grain', rect(w, 0, 0, 5, 3));
    expect(r.ok).toBe(true);
    expect(r.ids.length).toBe(6);
    expect(Object.keys(w.buildings).length).toBe(before + 6);
    expect(w.gold).toBe(1000 - 6 * costOf(w, 'farm_grain'));
    expect(w.undo.length).toBe(1);
    expect(undo(w).ok).toBe(true);
    expect(Object.keys(w.buildings).length).toBe(before);
    expect(w.gold).toBe(1000);
    expect(w.undo.length).toBe(0);
  });
  it('does not change the world to preview, and says the same twice', () => {
    const w = city();
    const snap = JSON.stringify([w.gold, Object.keys(w.buildings), Array.from(w.occ)]);
    const a = previewAreaTiles(w, 'farm_fig', rect(w, 0, 0, 5, 5));
    const b = previewAreaTiles(w, 'farm_fig', rect(w, 0, 0, 5, 5));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify([w.gold, Object.keys(w.buildings), Array.from(w.occ)])).toBe(snap);
  });
});

describe('v50 areas: gardens and statues', () => {
  it('fills the rectangle at the chosen spacing, anchored at its top-left corner', () => {
    const w = city();
    const tiles = rect(w, 10, 10, 18, 16);                                // 9 x 7
    expect(previewAreaTiles(w, 'garden', tiles, { spacing: 1 }).positions.length).toBe(63);
    expect(previewAreaTiles(w, 'garden', tiles, { spacing: 2 }).positions.length).toBe(5 * 4);
    const three = previewAreaTiles(w, 'statue', tiles, { spacing: 3 });
    expect(three.positions.length).toBe(3 * 3);
    expect(three.positions[0]).toEqual([10, 10]);
    expect(three.positions.every(([x, y]) => (x - 10) % 3 === 0 && (y - 10) % 3 === 0)).toBe(true);
    expect(three.cost).toBe(9 * costOf(w, 'statue'));
  });
  it('skips lattice tiles the ground refuses, and counts them with the sim\'s reason', () => {
    const w = city();
    w.terrain[idx(w.size, 12, 10)] = T.WATER;
    addRaw(w, 'house', 14, 10);
    const r = previewAreaTiles(w, 'garden', rect(w, 10, 10, 16, 10), { spacing: 2 });   // x 10, 12, 14, 16
    expect(r.positions.map((p) => p[0])).toEqual([10, 16]);
    expect(r.skipped.map((k) => [k.x, k.reason])).toEqual([[12, 'water'], [14, 'occupied']]);
  });
  it('is refused before the statue comes (Town), by the sim\'s unlock', () => {
    const w = city();
    w.milestone = 'village';
    expect(previewAreaTiles(w, 'statue', rect(w, 10, 10, 14, 14)).reason).toBe('locked');
    expect(previewAreaTiles(w, 'garden', rect(w, 10, 10, 14, 14)).ok).toBe(true);        // gardens come with the Village
    w.milestone = 'town';
    expect(previewAreaTiles(w, 'statue', rect(w, 10, 10, 14, 14)).ok).toBe(true);
  });
  it('knows no other building, and an area of nothing', () => {
    const w = city();
    expect(previewAreaTiles(w, 'well', rect(w, 10, 10, 14, 14)).reason).toBe('unknown');
    expect(previewAreaTiles(w, 'garden', []).reason).toBe('nothing_to_place');
  });
});

describe('v50 areas: the treasury rule', () => {
  it('refuses the whole area when it crosses the debt floor, says how many the treasury could pay, and lays nothing', () => {
    const w = city({ gold: -400 });
    const unit = costOf(w, 'statue');
    const tiles = rect(w, 10, 10, 19, 10);                                // ten statues at spacing 1
    const r = previewAreaTiles(w, 'statue', tiles, { spacing: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_gold');
    expect(r.positions.length).toBe(10);
    expect(r.afford).toBe(Math.floor((-400 - ECONOMY.debtFloor) / unit));
    const p = paintAreaTiles(w, 'statue', tiles, { spacing: 1 });
    expect(p.ok).toBe(false);
    expect(p.ids).toEqual([]);
    expect([w.gold, allBuildings(w).length, w.undo.length]).toEqual([-400, 0, 0]);
  });
  it('lets through exactly what the floor allows (the placing rule\'s own boundary)', () => {
    const w = city({ gold: 0 });
    const unit = costOf(w, 'garden');
    const fits = Math.floor(-ECONOMY.debtFloor / unit);
    w.gold = ECONOMY.debtFloor + fits * unit;                             // enough for `fits` gardens and not one more
    const block = (n) => Array.from({ length: n }, (_, i) => [10 + (i % 20), 10 + Math.floor(i / 20)]);   // n tiles, twenty to a row
    const at = (n) => previewAreaTiles(w, 'garden', block(n), { spacing: 1 });
    expect(at(fits).ok).toBe(true);
    expect(at(fits + 1).ok).toBe(false);
    expect(at(fits + 1).afford).toBe(fits);
    expect(paintAreaTiles(w, 'garden', block(fits), { spacing: 1 }).ok).toBe(true);
    expect(w.gold).toBe(ECONOMY.debtFloor);
  });
});

describe('v50 areas: Build another, the sim\'s rule', () => {
  it('copies type and a store\'s Fetch orders and switches', () => {
    const w = city();
    setRoad(w, 0, 10, 31, 10);
    const store = addRaw(w, 'storehouse', 12, 11);
    const far = addRaw(w, 'storehouse', 20, 11, { store: { pottery: 300, linen: 300 } });
    staffAll(w);
    expect(setFetch(w, store.id, 'pottery', 100).ok).toBe(true);
    expect(setFetch(w, store.id, 'linen', 40).ok).toBe(true);
    expect(setAccept(w, store.id, 'beer', false).ok).toBe(true);
    const r = anotherOf(w, store);
    expect(r.ok).toBe(true);
    expect(r.type).toBe('storehouse');
    expect(r.cost).toBe(costOf(w, 'storehouse'));
    expect(r.copy).toEqual({ fetch: [{ good: 'pottery', fetch: 100 }, { good: 'linen', fetch: 40 }], refuses: ['beer'] });
    const copy = addRaw(w, 'storehouse', 12, 14);
    const done = applySettings(w, copy.id, r.copy);
    expect(ordersOf(copy)).toEqual(ordersOf(store));
    expect(copy.accepts.beer).toBe(false);
    expect(done.fetch.length).toBe(2);
    expect(settingsOf(far)).toBe(null);                                  // a store with no settings copies none
    expect(anotherOf(w, far).copy).toBe(null);
  });
  it('a copied order never lands on a good the new building refuses', () => {
    const w = city();
    const store = addRaw(w, 'storehouse', 12, 11);
    const copy = addRaw(w, 'storehouse', 12, 14);
    const done = applySettings(w, copy.id, { fetch: [{ good: 'pottery', fetch: 100 }], refuses: ['pottery'] });
    expect(done.fetch).toEqual([]);
    expect(ordersOf(copy)).toEqual([]);
    expect(done.refuses).toEqual(['pottery']);
    expect(store.orders).toEqual({});
  });
  it('copies a monument\'s style, at that style\'s price', () => {
    const w = city({ gold: 100000 });
    const m = addRaw(w, 'obelisk_small', 12, 12);
    m.style = 'gilded';
    const r = anotherOf(w, m);
    expect(r.ok).toBe(true);
    expect(r.style).toBe('gilded');
    expect(r.cost).toBe(costOf(w, 'obelisk_small', { style: 'gilded' }));
    expect(r.cost).toBeGreaterThan(costOf(w, 'obelisk_small', { style: 'whitewashed' }));
  });
  it('is refused, by the sim\'s own rules, when locked, when only one is allowed, and when the price cannot be paid', () => {
    const w = city();
    const well = addRaw(w, 'well', 12, 12);
    expect(anotherOf(w, well).ok).toBe(true);
    w.milestone = 'village';
    const store = addRaw(w, 'storehouse', 14, 12);                        // a storehouse comes with the Town
    const locked = anotherOf(w, store);
    expect([locked.ok, locked.reason]).toEqual([false, 'locked']);
    w.milestone = 'capital';
    const palace = addRaw(w, 'palace', 20, 20);
    const one = anotherOf(w, palace);
    expect([one.ok, one.reason, one.id]).toEqual([false, 'one_only', palace.id]);
    expect(canPlace(w, 'palace', 3, 20).reason).toBe('one_only');         // the placing rule agrees
    w.gold = ECONOMY.debtFloor + costOf(w, 'well') - 1;
    const poor = anotherOf(w, well);
    expect([poor.ok, poor.reason, poor.cost, poor.have]).toEqual([false, 'no_gold', costOf(w, 'well'), w.gold]);
    expect(canPlace(w, 'well', 3, 20, { roadLater: true }).reason).toBe('no_gold');
    w.gold += 1;
    expect(anotherOf(w, well).ok).toBe(true);
    expect(canPlace(w, 'well', 3, 20, { roadLater: true }).ok).toBe(true);
  });
  it('a monument\'s founding never takes the treasury below 0, so a copy is refused there too', () => {
    const w = city({ gold: 100000 });
    const m = addRaw(w, 'obelisk_small', 12, 12);
    w.gold = costOf(w, 'obelisk_small') - 1;
    const r = anotherOf(w, m);
    expect([r.ok, r.reason, r.monument]).toEqual([false, 'no_gold', true]);
  });
  it('knows rubble as nothing to build', () => {
    const w = city();
    const rubble = addRaw(w, 'rubble', 12, 12);
    expect(anotherOf(w, rubble).reason).toBe('unknown');
  });
});
