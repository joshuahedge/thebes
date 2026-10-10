import { describe, it, expect } from '../harness.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../src/save/serialize.js';
import { createWorld, population } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';

const NEW_KEYS = ['firsts', 'achievements', 'daily', 'guide', 'tally'];
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

// A version 1 save as Stage 1d wrote it: a lived-in city without the version 2 fields.
function v1City() {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v1 = JSON.parse(serialize(w));
  for (const k of NEW_KEYS) delete v1[k];
  v1.goals = { completed: v1.goals.completed.slice() };
  v1.version = 1;
  return v1;
}

// A valid version 2 world as plain data, changed by fn, then validated.
function validAfter(fn) {
  const w = JSON.parse(serialize(createWorld({ seed: 3 })));
  fn(w);
  return validateWorld(w);
}

describe('migrate v1 to v2', () => {
  it('adds the new fields, turns the guide off and keeps everything else', () => {
    const v1 = v1City();
    expect(population(v1)).toBeGreaterThan(0);
    expect(v1.goals.completed.length).toBeGreaterThan(0);
    const before = JSON.stringify(v1);
    const v2 = MIGRATIONS[1](v1);
    expect(JSON.stringify(v1)).toBe(before);                      // the old object is not changed
    expect(v2.version).toBe(2);
    expect(v2.firsts).toBe(null);
    expect(v2.achievements).toBe(null);
    expect(v2.daily).toBe(null);
    expect(v2.guide).toEqual({ on: false, done: true });
    expect(v2.tally).toEqual({ harvested: 0, profitMonths: 0, peakPeople: population(v1), upgrades: 0, dailyDone: 0 });
    expect(v2.goals).toEqual({ completed: v1.goals.completed, triggered: [] });
    expect(v2.goals.completed === v1.goals.completed).toBe(false); // a copy, not the same array
    for (const k of Object.keys(v1)) if (k !== 'version' && k !== 'goals') expect([k, v2[k]]).toEqual([k, v1[k]]);
    expect(Object.keys(v2).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(v2)).toBe(true);
  });
  it('runs through migrate, deserialize and unpackSave', () => {
    const v1 = v1City();
    expect(CURRENT_VERSION).toBe(2);
    expect(migrate(v1)).toEqual(MIGRATIONS[1](v1));
    expect(deserialize(JSON.stringify(v1)).version).toBe(2);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v1 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(2);
    expect(back.world.guide.on).toBe(false);
    expect(back.world.tally.peakPeople).toBe(population(v1));
    expect(back.world.buildings).toEqual(v1.buildings);
  });
  it('reports a malformed version 1 save as corrupt, not as a failed migration', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 1 })))).toBe('corrupt_save');
    const v1 = v1City();
    v1.goals = { completed: 'none' };
    expect(code(() => deserialize(JSON.stringify(v1)))).toBe('corrupt_save');
  });
});

describe('validateWorld v2', () => {
  it('accepts a new world, a drawn daily and a migrated city', () => {
    expect(validAfter(() => {})).toBe(true);
    expect(validAfter((w) => { w.daily = { date: '2026-10-11', picks: ['plots4', 'roads10', 'well1'], base: { plots4: 0, roads10: 3, well1: 1 }, done: ['well1'], swapped: false }; })).toBe(true);
    expect(validAfter((w) => { w.firsts = null; w.achievements = null; w.guide = { on: false, done: true }; })).toBe(true);
    expect(validAfter((w) => { w.firsts = ['first_family']; w.achievements = ['way_in']; w.goals.triggered = ['fix_bazaar']; })).toBe(true);
  });
  it('requires each new field', () => {
    for (const k of NEW_KEYS) expect([k, validAfter((w) => { delete w[k]; })]).toEqual([k, false]);
    expect(validAfter((w) => { delete w.goals.triggered; })).toBe(false);
  });
  it('rejects bad firsts and achievements', () => {
    expect(validAfter((w) => { w.firsts = 'first_family'; })).toBe(false);
    expect(validAfter((w) => { w.firsts = [1]; })).toBe(false);
    expect(validAfter((w) => { w.achievements = {}; })).toBe(false);
  });
  it('rejects a bad daily', () => {
    const good = () => ({ date: '2026-10-11', picks: ['plots4'], base: { plots4: 0 }, done: [], swapped: false });
    expect(validAfter((w) => { w.daily = { ...good(), date: 20261011 }; })).toBe(false);
    expect(validAfter((w) => { const d = good(); delete d.picks; w.daily = d; })).toBe(false);
    expect(validAfter((w) => { w.daily = { ...good(), done: 'none' }; })).toBe(false);
    expect(validAfter((w) => { w.daily = { ...good(), base: [] }; })).toBe(false);
    expect(validAfter((w) => { w.daily = { ...good(), swapped: 'no' }; })).toBe(false);
    expect(validAfter((w) => { w.daily = []; })).toBe(false);
  });
  it('rejects a bad guide', () => {
    expect(validAfter((w) => { w.guide = null; })).toBe(false);
    expect(validAfter((w) => { w.guide = { on: 'yes', done: false }; })).toBe(false);
    expect(validAfter((w) => { w.guide = { on: true }; })).toBe(false);
  });
  it('rejects a bad tally', () => {
    expect(validAfter((w) => { w.tally = null; })).toBe(false);
    expect(validAfter((w) => { delete w.tally.upgrades; })).toBe(false);
    expect(validAfter((w) => { w.tally.harvested = '12'; })).toBe(false);
    expect(validAfter((w) => { w.tally.peakPeople = NaN; })).toBe(false);
    expect(validAfter((w) => { w.tally.dailyDone = Infinity; })).toBe(false);
  });
});
