import { describe, it, expect } from '../../harness.js';
import { fireDay, burnBuilding, coverageOf } from '../../../src/sim/fire.js';
import { buildingAt, population } from '../../../src/sim/world.js';
import { produceDay } from '../../../src/sim/production.js';
import { hash2 } from '../../../src/sim/rng.js';
import { FIRE, FIRE_SALT } from '../../../src/data/fire.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// The draws spec 4.12 names, worked out here the way the sim must.
const lengthOf = (w, id, day) => FIRE.fireDays[0] + Math.floor(hash2(id, day, w.seed + FIRE_SALT.length) * 6);
const goesOut = (w, id, day, cover) => hash2(id, day, w.seed + FIRE_SALT.out) < FIRE.outChance * cover;
const spreads = (w, from, to, day) => hash2(to, day, (w.seed + FIRE_SALT.spread + Math.imul(from, 7919)) | 0) < FIRE.spreadChance;

// A Town with a road along y = 10 in the 32x32 test world.
function street() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'town';
  return w;
}
const blaze = (need = 1) => ({ stage: 'blaze', days: 0, need, fought: 0 });
// Runs fireDay on each day from `from`, collecting events, until stop(events of the day) or `days` days have passed.
function run(w, from, days, stop = () => false) {
  const all = [];
  for (let d = from; d < from + days; d++) {
    w.day = d;
    const today = [];
    fireDay(w, today);
    all.push(...today.map((e) => ({ ...e, day: d })));
    if (stop(today)) break;
  }
  return all;
}

describe('s3 fire blazes', () => {
  it('puts a covered, staffed blaze out in the days it drew, and leaves the building as it was with risk 0', () => {
    const w = street();
    addRaw(w, 'firehouse', 16, 9, { staff: 4 });
    const one = addRaw(w, 'potter', 18, 11, { fire: blaze(1), store: { pottery: 5 }, staff: 8 });
    const two = addRaw(w, 'granary', 20, 11, { fire: blaze(2), store: { grain: 40 } });
    let events = run(w, 30, 1);
    expect([one.fire, one.risk, two.fire]).toEqual([null, 0, { stage: 'blaze', days: 1, need: 2, fought: 1 }]);
    events = events.concat(run(w, 31, 1));
    expect([two.fire, two.risk, two.store, one.store, w.tally.blazesOut, w.danger.lastFireDay]).toEqual([null, 0, { grain: 40 }, { pottery: 5 }, 2, null]);
    expect(events.map((e) => [e.type, e.id, e.stage, e.day])).toEqual([['fire_out', one.id, 'blaze', 30], ['fire_out', two.id, 'blaze', 31]]);
    expect([buildingAt(w, 18, 11), buildingAt(w, 20, 11)]).toEqual([one, two]);   // the same buildings, the same ids
  });

  it('grows an unfought blaze into a fire after three days, drawing 10-15 days, and pauses the first time', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11, { fire: blaze(1) });
    w.speed = 3;
    const events = run(w, 40, 3);
    expect(potter.fire).toEqual({ stage: 'fire', days: 0, left: lengthOf(w, potter.id, 42) });
    expect([potter.fire.left >= 10 && potter.fire.left <= 15, w.danger.lastFireDay, w.speed, w.danger.firePaused]).toEqual([true, 42, 0, true]);
    expect(events).toEqual([{ type: 'fire_grow', id: potter.id, covered: false, first: true, day: 42 }]);
    const lengths = new Set();
    for (let d = 0; d < 60; d++) lengths.add(lengthOf(w, potter.id, d));
    expect([...lengths].sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15]);
  });

  it('saves a blaze when a firehouse is built during it: each covered, staffed day counts from then', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 18, 11, { fire: blaze(2) });
    run(w, 50, 1);
    expect(potter.fire).toEqual({ stage: 'blaze', days: 1, need: 2, fought: 0 });
    const fh = addRaw(w, 'firehouse', 16, 9, { staff: 1 });                         // 25%: covered, not staffed
    run(w, 51, 1);
    expect(potter.fire).toEqual({ stage: 'blaze', days: 2, need: 2, fought: 0 });
    fh.staff = 4;
    run(w, 52, 1);
    expect(potter.fire.stage).toBe('fire');                                          // one fought day of the two it needed
    const saved = addRaw(w, 'granary', 20, 11, { fire: blaze(2), store: {} });
    saved.fire.days = 1;                                                             // a day lost before the firehouse came
    const events = run(w, 53, 2);
    expect([saved.fire, events.filter((e) => e.id === saved.id).map((e) => e.type)]).toEqual([null, ['fire_out']]);
  });
});

describe('s3 fire fires', () => {
  it('burns an unfought fire down on its last day: rubble on each tile under new ids, its stock gone', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11, { fire: { stage: 'fire', days: 0, left: 3 }, store: { pottery: 9 } });
    w.speed = 2;
    const events = run(w, 100, 3);
    expect(w.buildings[potter.id]).toBe(undefined);
    const tiles = [[2, 11], [3, 11], [2, 12], [3, 12]].map(([x, y]) => buildingAt(w, x, y));
    expect(tiles.map((b) => [b.type, b.store, b.fire, b.id > potter.id])).toEqual(tiles.map(() => ['rubble', {}, null, true]));
    const burned = events.find((e) => e.type === 'burned');
    expect(burned).toEqual({ type: 'burned', id: potter.id, kind: 'potter', to: tiles.map((b) => b.id), day: 102 });
    expect([w.tally.burned, w.danger.burnDays, w.danger.lastFireDay, w.speed]).toEqual([1, [102], 102, 2]);   // no pause: the fire was already burning
  });

  it('turns a burned home into empty plots on its tiles, four for a 2x2, and its residents leave the city', () => {
    const w = street();
    const manor = addRaw(w, 'house', 4, 11, { tier: 6, residents: 30, w: 2, d: 2, stock: { grain: 6 } });
    const hut = addRaw(w, 'house', 8, 11, { tier: 1, residents: 4 });
    expect(population(w)).toBe(34);
    const plots = burnBuilding(w, manor.id, []);
    const events = [];
    const one = burnBuilding(w, hut.id, events);
    expect([plots.length, one.length, population(w)]).toEqual([4, 1, 0]);
    const homes = [[4, 11], [5, 11], [4, 12], [5, 12], [8, 11]].map(([x, y]) => buildingAt(w, x, y));
    expect(homes.map((h) => [h.type, h.tier, h.residents, h.w, h.d, h.risk, h.fire])).toEqual(homes.map(() => ['house', 0, 0, 1, 1, 0, null]));
    expect(homes.map((h) => h.id)).toEqual([...plots, ...one]);
    expect(events).toEqual([{ type: 'burned', id: hut.id, kind: 'house', to: one }]);
    expect([w.tally.burned, burnBuilding(w, 999, [])]).toEqual([2, []]);
  });

  it('puts a covered fire out on 25% x coverage a day, and an uncovered one never goes out', () => {
    const w = street();
    addRaw(w, 'firehouse', 16, 9, { staff: 2 });                                     // half staffed: coverage 0.5
    const potter = addRaw(w, 'potter', 18, 11, { fire: { stage: 'fire', days: 0, left: 400 } });
    const far = addRaw(w, 'granary', 2, 11, { fire: { stage: 'fire', days: 0, left: 400 }, store: {} });
    expect([coverageOf(w, potter), coverageOf(w, far)]).toEqual([0.5, 0]);
    let out = 200;
    while (!goesOut(w, potter.id, out, 0.5)) out++;
    const events = run(w, 200, 400, (today) => today.some((e) => e.type === 'fire_out'));
    expect(events.filter((e) => e.type === 'fire_out')).toEqual([{ type: 'fire_out', id: potter.id, stage: 'fire', day: out }]);
    expect([potter.fire, potter.risk, w.tally.firesOut, far.fire.stage, far.fire.days, far.fire.left]).toEqual([null, 0, 1, 'fire', out - 199, 400 - (out - 199)]);
  });

  it('spreads only to buildings sharing an edge, never across a road or a corner, and each spread is a blaze', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 12, 11, { fire: { stage: 'fire', days: 0, left: 20 } });
    const booth = addRaw(w, 'booth', 14, 11);                                        // shares an edge
    const garden = addRaw(w, 'garden', 12, 13);                                      // shares an edge, never burns
    const corner = addRaw(w, 'house', 14, 13, { tier: 1, residents: 2 });            // a corner only
    const across = addRaw(w, 'granary', 12, 8, { store: {} });                       // across the road
    let day = 300;                                                                   // a day it spreads, after five days it does not
    while (!spreads(w, potter.id, booth.id, day) || [1, 2, 3, 4, 5].some((k) => spreads(w, potter.id, booth.id, day - k))) day++;
    const events = run(w, day - 5, 5);
    expect(booth.fire).toBe(null);
    const more = run(w, day, 1);
    expect(more.filter((e) => e.type === 'fire')).toEqual([{ type: 'fire', id: booth.id, covered: false, first: true, cause: 'spread', day }]);
    expect(booth.fire).toEqual({ stage: 'blaze', days: 0, need: booth.fire.need, fought: 0 });
    expect([events.length, garden.fire, corner.fire, across.fire]).toEqual([0, null, null, null]);
    run(w, day + 1, 1);
    expect(booth.fire.days).toBe(1);                                                 // its first blaze day was the day after
  });

  it('gives a 2x2 up to eight neighbours, and the fire can reach every one of them', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 12, 12, { fire: { stage: 'fire', days: 0, left: 400 } });
    const ring = [[12, 11], [13, 11], [12, 14], [13, 14], [11, 12], [11, 13], [14, 12], [14, 13]].map(([x, y]) => addRaw(w, 'house', x, y, { tier: 1, residents: 1 }));
    const caught = new Set();
    for (let d = 500; d < 900 && caught.size < 8; d++) {
      for (const e of run(w, d, 1)) if (e.type === 'fire' && e.cause === 'spread') caught.add(e.id);
      for (const h of ring) if (h.fire) h.fire = null;                               // put out by hand: only the spread is under test
      if (!w.buildings[potter.id]) break;
    }
    expect([...caught].sort((a, b) => a - b)).toEqual(ring.map((h) => h.id));
  });

  it('stops a burning workplace producing, and forgets burn days older than a year', () => {
    const w = street();
    addRaw(w, 'farm_grain', 0, 11, { staff: 10, fire: { stage: 'fire', days: 0, left: 12 } });
    addRaw(w, 'granary', 2, 11, { staff: 6 });
    const farm = buildingAt(w, 0, 11);
    produceDay(w);
    expect([farm.progress, farm.blocked]).toEqual([0, 'understaffed']);              // not working (alerts and sheets word it)
    farm.fire = { stage: 'blaze', days: 0, need: 1, fought: 0 };
    produceDay(w);
    expect([farm.blocked, farm.progress > 0 || (w.tally.made.grain || 0) > 0]).toEqual([null, true]);   // a blaze keeps it working
    w.danger.burnDays.push(10, 400, 700);
    w.day = 760;
    farm.fire = null;
    fireDay(w, []);
    expect(w.danger.burnDays).toEqual([700]);                                        // 400 is 360 days old
  });
});
