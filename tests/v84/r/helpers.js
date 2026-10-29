// Version 8.4 Track R: shared pieces of the raid tests. Ruling 1463: the raid clock's 8.4 numbers are not in data until wave 2, so each test sets them itself, through at84, which puts
// the data back however the test ends (a test that leaked them would move every raid number of every later test).
import { RAIDS } from '../../../src/data/raids.js';
import { raidDay } from '../../../src/sim/raids.js';
import { footMix } from '../../../src/data/armies.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

export const NUMBERS_84 = { firstWarnAfter: 300, laterMin: 360, laterMax: 600, leanDays: 60 };

export function at84(fn, numbers = NUMBERS_84) {
  const old = { ...RAIDS };
  Object.assign(RAIDS, numbers);
  try { return fn(); } finally { Object.assign(RAIDS, old); }
}

export const EAST = { x: 31, y: 16 };

// A 32x32 Market town raided from the east only, with a storehouse and a road; towers: staffed towers beside the road.
export function raidCity({ towers = 0, soldiers = 0, gold = 5000, entries = [EAST] } = {}) {
  const w = makeTestWorld({ gold, raiderEntries: entries });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  addRaw(w, 'storehouse', 6, 15);
  for (let k = 0; k < towers; k++) addRaw(w, 'tower', 20 + 2 * k, 18);
  if (soldiers) {
    const bk = addRaw(w, 'barracks', 14, 11);
    w.soldiers = Array.from({ length: soldiers }, () => ({ id: w.nextUnitId++, kind: 'soldier', barracks: bk.id, x: bk.x + 1, y: bk.y + 1, hp: 12, hit: false, task: 'wait' }));
  }
  staffAll(w);
  return w;
}

// Puts a warning up that arrives today and runs the arrival day (the shape raid.test.js uses).
export function arriveNow(w, size, { first = false, day = 1000, entry = EAST } = {}) {
  w.raid.index = first ? 1 : 2;
  w.raid.warning = { index: w.raid.index - 1, entry: { ...entry }, dir: 'east', size, tribute: first ? null : 240, target: 'storehouse', day: day - RAIDS.warningDays, arrives: day, first, mix: footMix(size) };
  w.day = day;
  const events = [];
  raidDay(w, events);
  return events;
}

// Runs raid days until the raid ends (or `days`); returns the events.
export function runRaid(w, days = 300) {
  const events = [];
  for (let k = 0; k < days && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
  return events;
}
