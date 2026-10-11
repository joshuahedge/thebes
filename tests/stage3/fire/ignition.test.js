import { describe, it, expect } from '../../harness.js';
import { fireDay, igniteBuilding, coverageOf } from '../../../src/sim/fire.js';
import { isWorking } from '../../../src/sim/labour.js';
import { tickDay } from '../../../src/sim/clock.js';
import { hash2 } from '../../../src/sim/rng.js';
import { FIRE, FIRE_SALT } from '../../../src/data/fire.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;
// The draws spec 4.12 names, worked out here the way the sim must: hash2(building id, day, seed + salt).
const ignites = (w, id, day) => hash2(id, day, w.seed + FIRE_SALT.ignite) < FIRE.ignitionChance;
const needOf = (w, id, day) => FIRE.putOutDays[0] + Math.floor(hash2(id, day, w.seed + FIRE_SALT.putOut) * 2);
const firstIgnition = (w, id, from = 0) => { let d = from; while (!ignites(w, id, d)) d++; return d; };

// A Town with a road along y = 10 in the 32x32 test world.
function street() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'town';
  return w;
}
// One fire step on the given day (tickDay runs fireDay before it turns the day).
function stepOn(w, day, events = null) { w.day = day; fireDay(w, events); }

describe('s3 fire risk and ignition', () => {
  it('builds no risk before Town, then each day by the type, the level and a firehouse\'s cover', () => {
    const w = street();
    w.milestone = 'village';
    const potter = addRaw(w, 'potter', 2, 11), hut = addRaw(w, 'house', 6, 11, { tier: 1, residents: 3 });
    const never = ['garden', 'tower', 'rubble', 'house'].map((t, i) => addRaw(w, t, 8 + i, 11));   // the house is an empty plot
    for (let d = 0; d < 5; d++) stepOn(w, d);
    expect([potter.risk, hut.risk]).toEqual([0, 0]);                                // no risk before Town
    w.milestone = 'town';
    stepOn(w, 5);
    expect([potter.risk, near(hut.risk, 0.3), never.map((b) => b.risk)]).toEqual([1, true, [0, 0, 0, 0]]);
    addRaw(w, 'firehouse', 16, 9, { staff: 4 });                                    // its road tile is (16, 10)
    const covered = addRaw(w, 'potter', 18, 11);
    expect([coverageOf(w, covered), coverageOf(w, potter)]).toEqual([1, 0]);        // the first potter's road is 14 road tiles away
    stepOn(w, 6);
    expect([potter.risk, near(covered.risk, 0.2)]).toEqual([2, true]);              // 1 x (1 - 0.8 x 1)
    w.difficulty = 'hard';
    stepOn(w, 7);
    expect(near(potter.risk, 3.5)).toBe(true);                                      // x 1.5
    w.difficulty = 'peaceful';
    stepOn(w, 8);
    expect(near(potter.risk, 4)).toBe(true);                                        // x 0.5
  });

  it('catches fire only at 100 or more, on the seeded 3% draw for that building and day, with risk back to 0', () => {
    const v = street();
    const below = addRaw(v, 'potter', 6, 11, { risk: 50 });
    const lucky = firstIgnition(v, below.id, 50);
    stepOn(v, lucky);
    expect([below.fire, below.risk]).toEqual([null, 51]);                           // the draw came up, but it is below 100
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11, { risk: FIRE.threshold });
    const day = firstIgnition(w, potter.id, 10);
    for (let d = 10; d < day; d++) stepOn(w, d);
    expect([potter.fire, potter.risk]).toEqual([null, FIRE.threshold + day - 10]);  // at the threshold, but no draw yet
    const events = [];
    stepOn(w, day, events);
    expect(potter.fire).toEqual({ stage: 'blaze', days: 0, need: needOf(w, potter.id, day), fought: 0 });
    expect([potter.risk, w.tally.fires]).toEqual([0, 1]);
    expect(events.filter((e) => e.type === 'fire')).toEqual([{ type: 'fire', id: potter.id, covered: false, first: true, cause: 'ignite' }]);
  });

  it('draws each building on its own, so a street at the threshold does not all catch fire at once', () => {
    const w = street();
    const row = [0, 2, 4, 6, 8, 10, 12, 14].map((x) => addRaw(w, 'potter', x, 11, { risk: FIRE.threshold }));
    const seen = {};
    for (let d = 0; d < 400 && Object.keys(seen).length < row.length; d++) {
      const events = [];
      stepOn(w, d, events);
      for (const e of events) if (e.type === 'fire' && !(e.id in seen)) seen[e.id] = d;
      for (const b of row) b.fire = null;                                           // put out by hand: only ignition is under test
    }
    expect(row.map((b) => seen[b.id])).toEqual(row.map((b) => firstIgnition(w, b.id)));
    expect(new Set(Object.values(seen)).size).toBeGreaterThan(1);
    const needs = new Set();
    for (let d = 0; d < 40; d++) needs.add(needOf(w, row[0].id, d));
    expect([...needs].sort()).toEqual([1, 2]);                                      // a blaze needs 1 or 2 days, drawn
  });

  it('pauses the game for the city\'s first fire no staffed firehouse reaches, once; a covered blaze never pauses', () => {
    const w = street();
    addRaw(w, 'firehouse', 16, 9, { staff: 4 });
    const covered = addRaw(w, 'potter', 18, 11), far = addRaw(w, 'potter', 2, 11), other = addRaw(w, 'granary', 5, 11);
    const half = addRaw(w, 'firehouse', 28, 9, { staff: 1 });                       // 25%: working, but not staffed for fighting fires
    const thin = addRaw(w, 'bazaar', 29, 11);
    w.speed = 2;
    let events = [];
    expect(igniteBuilding(w, covered.id, events, 'raid')).toBe(true);
    expect(events).toEqual([{ type: 'fire', id: covered.id, covered: true, first: false, cause: 'raid' }]);
    expect([w.speed, w.danger.firePaused]).toEqual([2, false]);
    events = [];
    expect(igniteBuilding(w, far.id, events)).toBe(true);
    expect(events).toEqual([{ type: 'fire', id: far.id, covered: false, first: true, cause: 'ignite' }]);
    expect([w.speed, w.danger.firePaused]).toEqual([0, true]);
    w.speed = 3;
    events = [];
    expect([coverageOf(w, thin), igniteBuilding(w, thin.id, events, 'spread')]).toEqual([0.25, true]);
    expect(events).toEqual([{ type: 'fire', id: thin.id, covered: false, first: false, cause: 'spread' }]);
    expect(w.speed).toBe(3);                                                        // later fires are the interface's (On a fire)
    const garden = addRaw(w, 'garden', 22, 11), plot = addRaw(w, 'house', 23, 11);
    expect([igniteBuilding(w, 999), igniteBuilding(w, garden.id), igniteBuilding(w, plot.id), igniteBuilding(w, far.id)]).toEqual([false, false, false, false]);
    expect([w.tally.fires, garden.fire, plot.fire, other.fire, half.fire]).toEqual([3, null, null, null, null]);
  });

  it('stops a building working in the fire stage but not in a blaze, and a burning firehouse covers nothing', () => {
    const w = street();
    const fh = addRaw(w, 'firehouse', 16, 9, { staff: 4 });
    const potter = addRaw(w, 'potter', 18, 11, { staff: 8 });
    expect([isWorking(w, potter), coverageOf(w, potter)]).toEqual([true, 1]);
    potter.fire = { stage: 'blaze', days: 1, need: 2, fought: 1 };
    expect(isWorking(w, potter)).toBe(true);
    potter.fire = { stage: 'fire', days: 2, left: 9 };
    expect(isWorking(w, potter)).toBe(false);
    fh.fire = { stage: 'blaze', days: 0, need: 1, fought: 0 };
    expect(coverageOf(w, potter)).toBe(1);
    fh.fire = { stage: 'fire', days: 0, left: 12 };
    expect([isWorking(w, fh), coverageOf(w, potter)]).toEqual([false, 0]);
    fh.fire = null;
    expect(coverageOf(w, potter)).toBe(1);
  });

  it('runs inside tickDay, keyed on the day being simulated', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11, { risk: FIRE.threshold });
    const day = firstIgnition(w, potter.id, 3);
    w.day = day;
    const events = [];
    tickDay(w, events);
    expect([w.day, potter.fire && potter.fire.stage, events.filter((e) => e.type === 'fire').length]).toEqual([day + 1, 'blaze', 1]);
  });
});
