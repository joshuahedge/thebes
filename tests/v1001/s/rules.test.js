// Version 10.0.1, Track S (the rules; rulings 2355-2374): defenders go anywhere (S.1), raiders and defenders 1.5x faster with a band's fractional step
// (S.2), the balance check (S.3: ./bench.js and the lesson) and storehouses that fetch for their neighbours (S.4).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { raidDay } from '../../../src/sim/raids.js';
import { combatDay, threatBands } from '../../../src/sim/combat.js';
import { cartDay, autoFetchMap, autoOrdersOf, autoFetchFor, findSource, farGoodTip, setFetch, nextTrip } from '../../../src/sim/carts.js';
import { produceDay } from '../../../src/sim/production.js';
import { serialize } from '../../../src/save/serialize.js';
import { RAIDS, UNITS, DEFENCE } from '../../../src/data/raids.js';
import { UNIT_TYPES, ENEMY_TYPES, footMix } from '../../../src/data/armies.js';
import { AUTO_FETCH } from '../../../src/data/s47.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { alertText, S46_ARMY_TEXT, V1001S_TEXT } from '../../../src/ui/text.js';
import { raidBench } from './bench.js';
import { walkLesson } from '../../v91/f/lesson.test.js';

const EAST = { x: 39, y: 20 };
// A 40x40 town raided from the east, a road along y = 20 and a storehouse for the band to go for (at (30, 16), or at the far west end, where the band's
// way runs straight along y = 20).
function town({ west = false } = {}) {
  const w = makeTestWorld({ size: 40, gold: 2000, raiderEntries: [EAST] });
  setRoad(w, 0, 20, 39, 20);
  w.milestone = 'market_town';
  addRaw(w, 'storehouse', west ? 2 : 30, west ? 18 : 16);
  return w;
}
const unit = (w, kind, b) => { const def = UNIT_TYPES[kind]; const s = { id: w.nextUnitId++, kind, barracks: b.id, x: b.x + b.w / 2, y: b.y + b.d / 2, hp: def.hp, hit: false, task: 'wait' }; w.soldiers.push(s); return s; };
function arriveNow(w, mix) {
  const size = Object.values(mix).reduce((s, n) => s + n, 0);
  w.raid.index = 3;
  w.day = 2000;
  w.raid.warning = { index: 2, entry: { ...EAST }, dir: 'east', size, tribute: 240, target: 'storehouse', day: w.day - RAIDS.warningDays, arrives: w.day, first: false, mix: { ...footMix(0), ...mix } };
  raidDay(w, []);
}
const runRaid = (w, days = 300) => { const events = []; for (let k = 0; k < days && w.raid.active; k++) { w.day += 1; raidDay(w, events); } return events; };

describe('v1001 s S.1 defenders go anywhere', () => {
  it('sends a unit out to a raider far beyond the old patrol, fights it, and walks it home once no raider is left', () => {
    const w = town();
    const bar = addRaw(w, 'barracks', 2, 22);                                       // about 30 tiles from the band's way in: the old patrol was 8
    staffAll(w);
    const s = unit(w, 'soldier', bar);
    unit(w, 'soldier', bar); unit(w, 'soldier', bar);
    arriveNow(w, { foot: 2 });
    // Version 10.0.1 (ruling 2372): it waits while the band is at the map's edge, and goes once the band comes within SORTIE.cityReach of the store it is after.
    w.day += 1; raidDay(w, []);
    expect(s.task).toBe('wait');
    let out = false;
    for (let k = 0; k < 40 && w.raid.active && !out; k++) { w.day += 1; raidDay(w, []); out = s.task === 'out' && s.x > bar.x + bar.w / 2; }
    expect(out).toBe(true);
    const events = runRaid(w);
    const end = events.find((e) => e.type === 'raid_end');
    expect(Boolean(end)).toBe(true);
    for (let k = 0; k < 40; k++) { w.day += 1; raidDay(w, []); }
    for (const u of w.soldiers) expect([u.task, u.x, u.y]).toEqual(['wait', bar.x + bar.w / 2, bar.y + bar.d / 2]);
  });
  it('goes to the raider nearest the unit, the lower id on a tie, and never to a kind it shuns', () => {
    const w = town();
    const st = addRaw(w, 'stables', 10, 22);
    staffAll(w);
    const c = unit(w, 'chariot', st);
    w.raid.active = { index: 0, entry: { ...EAST }, dir: 'east', size: 3, target: 'storehouse', day: 0, raiders: [], phase: 'strike', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [] };
    const r = (id, kind, x, y) => ({ id, kind, x, y, hp: ENEMY_TYPES[kind].hp, hit: false });
    w.raid.active.raiders = [r(900, 'elephant', c.x + 2, c.y), r(902, 'foot', c.x, c.y - 6), r(901, 'foot', c.x, c.y + 6)];
    combatDay(w);
    expect(c.task).toBe('out');
    expect(c.y).toBeGreaterThan(st.y + st.d / 2);                                     // toward 901 (same distance as 902, lower id), not the elephant beside it
  });
  it('picks the band that threatens most (striking first), lets a band falling back or leaving go, and fights a raider beside it whatever its band does', () => {
    const w = town();
    const bar = addRaw(w, 'barracks', 2, 22);
    staffAll(w);
    const s = unit(w, 'soldier', bar);
    const r = (id, x, y, band) => ({ id, kind: 'foot', x, y, hp: 10, hit: false, ...(band ? { band: 1 } : {}) });
    const rec = { entry: { x: 0, y: 0 }, dir: 'north', x: 0, y: 0, phase: 'attack', targetId: null, struck: [], wait: 0, blocked: null };
    w.raid.active = { index: 0, entry: { ...EAST }, dir: 'east', size: 2, target: 'storehouse', day: 0, phase: 'retreat', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [],
      raiders: [r(900, 6, 26), r(901, 31, 15, true)], second: { ...rec, phase: 'strike' } };
    expect(threatBands(w, w.raid.active)).toEqual([1]);                               // band 0 falls back; band 1 strikes
    combatDay(w);
    expect([s.task, s.x > bar.x + bar.w / 2]).toEqual(['out', true]);                // past the retreating raider beside its barracks, to the striking band
    w.raid.active.second.phase = 'leave';
    expect(threatBands(w, w.raid.active)).toEqual([]);
    s.x = 6; s.y = 25.5;                                                               // beside the retreating raider: it fights it
    const hp = w.raid.active.raiders[0].hp;
    combatDay(w);
    expect(w.raid.active.raiders.find((u) => u.id === 900).hp).toBeLessThan(hp);
  });
  it('plays the same raid the same way twice (deterministic)', () => {
    const run = () => {
      const w = town();
      const bar = addRaw(w, 'barracks', 2, 22), rng = addRaw(w, 'archery_range', 20, 23), st = addRaw(w, 'stables', 12, 26);
      addRaw(w, 'tower', 28, 18);
      staffAll(w);
      for (let n = 0; n < 4; n++) { unit(w, 'soldier', bar); unit(w, 'archer', rng); }
      for (let n = 0; n < 3; n++) unit(w, 'chariot', st);
      arriveNow(w, { foot: 8, archer: 3, chariot: 3 });
      runRaid(w);
      return serialize(w);
    };
    expect(run()).toBe(run());
  });
  it('says no patrol radius anywhere: the sheets\' Patrol row and the raid alert\'s fix', () => {
    expect([DEFENCE.patrol, UNIT_TYPES.soldier.patrol, UNIT_TYPES.archer.patrol, UNIT_TYPES.chariot.patrol]).toEqual([undefined, undefined, undefined, undefined]);
    expect(V1001S_TEXT.anywhere).toBe('Anywhere on the map');
    expect(S46_ARMY_TEXT.patrolLine('archer')).toBe('Goes out to the nearest raider, anywhere on the map');
    const w = town();
    arriveNow(w, { foot: 2 });
    expect(alertText({ code: 'raid', x: 39, y: 20, left: 2 }, w).fix).toBe(`Towers hit raiders within ${DEFENCE.towerRange} tiles; soldiers go after raiders anywhere`);
  });
});

describe('v1001 s S.2 raiders a bit faster, defenders to match', () => {
  it('moves raiders 1.5 tiles a day and every unit and enemy kind x 1.5, so the ratios hold', () => {
    expect([UNITS.raider.speed, UNITS.soldier.speed]).toEqual([1.5, 3]);
    expect(['soldier', 'archer', 'chariot'].map((k) => UNIT_TYPES[k].speed)).toEqual([3, 3, 4.5]);
    expect(['foot', 'archer', 'chariot', 'boat', 'elephant'].map((k) => ENEMY_TYPES[k].speed)).toEqual([1.5, 1.5, 3, 1.5, 1.5]);
  });
  it('walks a band three tiles every two days on open ground, carrying the half tile over (active.stride)', () => {
    const w = town({ west: true });
    arriveNow(w, { foot: 3 });
    const a = w.raid.active, xs = [a.x], strides = [];
    for (let d = 0; d < 6; d++) { w.day += 1; raidDay(w, []); xs.push(a.x); strides.push(a.stride || 0); }
    expect(xs.slice(1).map((x, i) => xs[i] - x)).toEqual([1, 2, 1, 2, 1, 2]);
    expect(strides).toEqual([0.5, 0, 0.5, 0, 0.5, 0]);
  });
  it('keeps a whole pace as it was: a band of chariots alone (3 a day) walks 3 tiles a day and keeps no stride', () => {
    const w = town({ west: true });
    arriveNow(w, { chariot: 2 });
    const a = w.raid.active, x0 = a.x;
    w.day += 1; raidDay(w, []);
    expect([x0 - a.x, 'stride' in a]).toEqual([3, false]);
  });
});

describe('v1001 s S.3 the balance check', () => {
  // Ruling 2366: measured on 10.0 (the unchanged tree) and after S.1 + S.2. The bench: buildings struck 6 -> 6, gold stolen 1,309 -> 1,269 (-3%), defenders
  // lost 16 -> 30 (+88%), raids lost 2 of 5 -> 2 of 5. Losses per raid did not drop by a third, so no band was toughened (ruling 2367).
  it('the bench\'s five raids: what they cost the town, after S.1, S.2 and the fix', () => {
    const { raids, total } = raidBench();
    // Ruling 2373: with the units going to the band that threatens (ruling 2372) 1 of 5 raids is lost, 3 struck, 744 gold, 20 defenders lost (10.0: 2 lost, 6,
    // 1,309, 16; S.1 + S.2 before the fix: 2 lost, 6, 1,269, 30).
    expect(raids.map((r) => r.won)).toEqual([true, true, true, false, true]);
    expect(total).toEqual({ struck: 3, gold: 744, food: 30, fled: 1, defenders: 20, lost: 1 });
  });
  it('keeps the lesson\'s raid winnable as the lesson teaches it: one tower beats its three raiders', () => {
    const { world } = walkLesson();
    const l = world.raid.last;
    expect([l.won, l.size, l.byTowers, world.tally.soldiersWounded]).toEqual([true, 3, 3, 0]);
  });
});

// A road along y = 10 (x 0-63); a potter at (4, 11) (producer reach 12) with a storehouse beside it at (8, 11) and none of its clay in reach.
function street() {
  const w = makeTestWorld({ size: 64, fertile: [] });
  setRoad(w, 0, 10, 63, 10);
  return w;
}
const store = (w, type, x, held = {}) => addRaw(w, type, x, 11, { staff: BUILDINGS[type].workers, store: { ...held } });
const days = (w, n, events = null) => { for (let i = 0; i < n; i++) { w.day += 1; produceDay(w); cartDay(w, events); } };
function workshop() {
  const w = street();
  const potter = addRaw(w, 'potter', 4, 11, { staff: BUILDINGS.potter.workers });
  const near = store(w, 'storehouse', 8), far = store(w, 'storehouse', 40, { clay: 100 });
  return { w, potter, near, far };
}

describe('v1001 s S.4 storehouses fetch for their neighbours', () => {
  it('a store with no orders keeps a starved workshop\'s input stocked from a far store, and the workshop works', () => {
    const { w, potter, near, far } = workshop();
    produceDay(w);
    expect(potter.blocked).toBe('no_input');
    expect(autoOrdersOf(w, near)).toEqual([{ good: 'clay', fetch: AUTO_FETCH.amount, auto: true }]);
    expect(autoOrdersOf(w, far)).toEqual([]);                                        // beyond the potter's reach
    expect(autoFetchFor(w, near)).toEqual({ who: 'workshops', goods: ['clay'] });
    expect(V1001S_TEXT.fetchingFor('workshops', ['barley', 'clay'])).toBe('Fetching for nearby workshops: barley, clay');
    days(w, 20);
    expect(far.store.clay).toBeLessThan(100);
    expect(w.tally.made.pottery).toBeGreaterThan(0);
    expect(potter.blocked).toBe(null);
  });
  it('stops once a store in the workshop\'s reach holds the good, and a player\'s order on the store replaces every automatic one', () => {
    const { w, near } = workshop();
    const other = store(w, 'storehouse', 12, { clay: 5 });
    expect(autoOrdersOf(w, near)).toEqual([]);                                       // `other` holds clay within the potter's reach
    other.store = {};
    expect(autoOrdersOf(w, near).map((o) => o.good)).toEqual(['clay']);
    store(w, 'storehouse', 50, { beer: 30 });
    expect(setFetch(w, near.id, 'beer', 20).ok).toBe(true);
    expect([autoOrdersOf(w, near), nextTrip(w, near).good]).toEqual([[], 'beer']);
  });
  it('never fetches between two stores fetching the same good for their neighbours, and keeps its amount from other stores\' orders', () => {
    // Two potters, each with a store beside it; the second store holds a little clay, the far one plenty.
    const w = street();
    addRaw(w, 'potter', 4, 11, { staff: 8 });
    const a = store(w, 'storehouse', 8);
    addRaw(w, 'potter', 24, 11, { staff: 8 });
    const b = store(w, 'storehouse', 20, { clay: 30 });
    const far = store(w, 'storehouse', 44, { clay: 100 });
    const auto = autoFetchMap(w);
    expect([auto.get(a.id).has('clay'), auto.get(b.id).has('clay')]).toEqual([true, true]);
    expect(findSource(w, a, 'clay').b.id).toBe(far.id);                              // b is nearer, but it fetches clay itself
    const legs = new Set();
    for (let d = 0; d < 60; d++) { w.day += 1; produceDay(w); cartDay(w); for (const c of w.carts) legs.add(`${c.from}>${c.to}`); }
    expect([legs.has(`${a.id}>${b.id}`), legs.has(`${b.id}>${a.id}`)]).toEqual([false, false]);
    // A player's order elsewhere draws on b only above AUTO_FETCH.amount.
    const p = store(w, 'storehouse', 60);
    b.store.clay = AUTO_FETCH.amount + 5;
    far.store.clay = 0;
    expect(setFetch(w, p.id, 'clay', 100).ok).toBe(true);
    expect(nextTrip(w, p).amount).toBe(5);
  });
  it('never fetches a good while it is the source of a cart carrying it', () => {
    const { w, near } = workshop();
    w.carts.push({ id: 999, from: near.id, to: 999, good: 'clay', amount: 5, len: 10, left: w.day, turn: w.day + 2, due: w.day + 3, state: 'out' });
    expect(autoOrdersOf(w, near)).toEqual([]);
  });
  it('fetches a bazaar\'s missing goods, and the far-good tip stops where it does', () => {
    // A staffed bazaar at (9, 11), two Townhouse-tier homes wanting pottery, the pottery 40+ road tiles away, a storehouse with no orders by the bazaar.
    const w = street();
    addRaw(w, 'bazaar', 9, 11, { staff: 6, store: {} });
    addRaw(w, 'house', 12, 9, { tier: 4, residents: 10, stock: {} });
    addRaw(w, 'house', 13, 9, { tier: 4, residents: 10, stock: {} });
    addRaw(w, 'storehouse', 56, 11, { staff: 6, store: { pottery: 100 } });
    expect(farGoodTip(w).good).toBe('pottery');
    const near = store(w, 'storehouse', 16);
    expect(autoFetchFor(w, near)).toEqual({ who: 'bazaars', goods: ['pottery'] });
    expect(farGoodTip(w)).toBe(null);
  });
  it('keeps no new state: the automatic orders are worked out from the world, and the same city plays the same way twice', () => {
    const run = () => { const { w } = workshop(); days(w, 40); return serialize(w); };
    const a = run();
    expect(a).toBe(run());
    const { w, near } = workshop();
    days(w, 3);
    expect(near.orders === undefined || Object.keys(near.orders).length === 0).toBe(true);
  });
});
