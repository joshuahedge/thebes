import { describe, it, expect } from '../../harness.js';
import {
  createWorld, makeBuilding, insertBuilding, WORLD_VERSION, STAGE4_TALLY, newTally, newSite, newPrestigeUnlocks, isMonument, isSite, isFinished,
} from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { migrate, MIGRATIONS, CURRENT_VERSION, STAGE4_ITEMS } from '../../../src/save/migrate.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../../src/sim/commands.js';

// A version 4 save as Stage 3 wrote it: a lived-in city without the version 5 fields, with month-end rows that carry v1 scores.
function v4City({ milestone = null } = {}) {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v4 = JSON.parse(serialize(w));
  delete v4.prestigeUnlocks;
  for (const k of STAGE4_TALLY) delete v4.tally[k];
  for (const b of Object.values(v4.buildings)) delete b.rot;
  for (const r of v4.history) { delete r.version; delete r.parts.monuments; }
  if (milestone) v4.milestone = milestone;
  v4.newItems = [];
  v4.version = 4;
  return v4;
}
const validAfter = (fn) => { const w = JSON.parse(serialize(createWorld({ seed: 3 }))); fn(w); return validateWorld(w); };

describe('s4 contract world v5', () => {
  it('creates a version 5 world with no prestige unlocks and the Stage 4 tallies at zero', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([5, 5, 5]);
    expect(w.prestigeUnlocks).toEqual({ pyramid_small: null, pyramid_great: null });
    expect(w.prestigeUnlocks).toEqual(newPrestigeUnlocks());
    expect(STAGE4_TALLY).toEqual(['stoneLaid', 'bricksLaid', 'stoneDelivered', 'bricksDelivered', 'courses', 'monumentsDone', 'enlargements']);
    for (const k of STAGE4_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(w.tally).toEqual(newTally());
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
  it('gives every building a rotation, a monument an empty site and the palace its first style', () => {
    const w = createWorld({ seed: 4 });
    expect(makeBuilding(w, 'well', 3, 3).rot).toBe(0);
    const m = makeBuilding(w, 'mastaba_large', 3, 3, 1);
    expect([m.w, m.d, m.rot]).toEqual([3, 4, 1]);
    const p = makeBuilding(w, 'pyramid_small', 3, 3, 1);                          // a pyramid does not turn
    expect([p.w, p.d, p.rot]).toEqual([4, 4, 0]);
    expect(m.site).toEqual({
      course: 0, laid: { stone: 0, bricks: 0 }, stock: { stone: 0, bricks: 0 }, carry: 0, extraPaid: false, crews: [], idle: 0, reason: null,
      month: { units: 0, gold: 0, crews: 0, crewDays: 0, starvedDays: 0 }, last: null, starved: false, done: null,
    });
    expect(m.site).toEqual(newSite());
    const pal = makeBuilding(w, 'palace', 3, 3);
    expect([pal.style, pal.works, 'site' in pal]).toEqual([0, null, false]);
    expect([isMonument(m), isSite(m), isFinished(m), isMonument(pal)]).toEqual([true, true, false, false]);
    m.site.done = 40;
    expect([isSite(m), isFinished(m)]).toEqual([false, true]);
    expect('site' in makeBuilding(w, 'quarry', 3, 3)).toBe(false);
  });
  it('round-trips a world with a rotated site mid-course, a finished monument, a palace under works and an unlock day', () => {
    const w = createWorld({ seed: 6 });
    const s = insertBuilding(w, makeBuilding(w, 'mastaba_small', 10, 10, 1));
    Object.assign(s.site, { course: 2, laid: { stone: 0, bricks: 133.33 }, stock: { stone: 12, bricks: 40.5 }, carry: 0.4, crews: [9], idle: 1, reason: 'no_bricks', last: { units: 40, gold: 200, crews: 2 } });
    const f = insertBuilding(w, makeBuilding(w, 'obelisk_small', 20, 20));
    Object.assign(f.site, { course: 3, done: 300 });
    const pal = insertBuilding(w, makeBuilding(w, 'palace', 30, 30));
    Object.assign(pal, { style: 2, works: { style: 3, left: 44 } });
    w.prestigeUnlocks.pyramid_small = 900;
    w.splits = { town: 100, pyramids: 900 };
    expect(deserialize(serialize(w))).toEqual(w);
  });
  it('checks every building\'s rotation, a monument\'s site, the palace\'s style and works and the unlock days', () => {
    const withB = (type, fn) => validAfter((w) => {
      const b = makeBuilding(w, type, 2, 2);
      w.buildings[b.id] = b;
      for (let y = 2; y < 2 + b.d; y++) for (let x = 2; x < 2 + b.w; x++) w.occ[y * w.size + x] = b.id;
      fn(b);
    });
    expect(withB('well', () => {})).toBe(true);
    expect(withB('well', (b) => { b.rot = 2; })).toBe(false);
    expect(withB('well', (b) => { delete b.rot; })).toBe(false);
    expect(withB('colossus', () => {})).toBe(true);
    expect(withB('colossus', (b) => { delete b.site; })).toBe(false);
    expect(withB('colossus', (b) => { b.site.course = -1; })).toBe(false);
    expect(withB('colossus', (b) => { b.site.stock.stone = -3; })).toBe(false);
    expect(withB('colossus', (b) => { b.site.done = 'soon'; })).toBe(false);
    expect(withB('colossus', (b) => { b.site.crews = ['x']; })).toBe(false);
    expect(withB('palace', () => {})).toBe(true);
    expect(withB('palace', (b) => { b.style = 5; })).toBe(false);
    expect(withB('palace', (b) => { b.works = { style: 1, left: 30 }; })).toBe(true);
    expect(withB('palace', (b) => { b.works = { style: 0, left: 30 }; })).toBe(false);
    expect(validAfter((w) => { w.prestigeUnlocks = {}; })).toBe(false);
    expect(validAfter((w) => { w.prestigeUnlocks.pyramid_great = 1.5; })).toBe(false);
    expect(validAfter((w) => { w.tally.stoneLaid = 'x'; })).toBe(false);
  });
});

describe('s4 contract migrate v4 to v5', () => {
  it('adds rot 0, no prestige unlocks and the Stage 4 tallies, marks scored rows v1, and keeps everything else', () => {
    const v4 = v4City();
    const v5 = MIGRATIONS[4](v4);
    expect(v5.version).toBe(5);
    expect(validateWorld(v5)).toBe(true);
    expect(v5.prestigeUnlocks).toEqual({ pyramid_small: null, pyramid_great: null });
    for (const k of STAGE4_TALLY) expect([k, v5.tally[k]]).toEqual([k, 0]);
    for (const b of Object.values(v5.buildings)) expect([b.id, b.rot]).toEqual([b.id, 0]);
    expect(v5.history.length).toBeGreaterThan(0);
    for (const r of v5.history) expect([r.day, r.version, Object.keys(r.parts)]).toEqual([r.day, 1, ['people', 'prosperity', 'culture', 'safety']]);
    const strip = (w) => { const o = JSON.parse(JSON.stringify(w)); delete o.version; delete o.prestigeUnlocks; for (const k of STAGE4_TALLY) delete o.tally[k]; for (const b of Object.values(o.buildings)) delete b.rot; for (const r of o.history) delete r.version; return o; };
    expect(strip(v5)).toEqual(strip(v4));
    expect(v4.history[0].version).toBe(undefined);                               // the migration copies, never edits the save it was given
  });
  it('leaves a row with no score (a Stage 2 row) unmarked, and gives New badges for the Stage 4 cards the milestone unlocks', () => {
    const v4 = v4City({ milestone: 'great_city' });
    v4.history.unshift({ day: 0, people: 0, gold: 2000, mood: 60 });
    const v5 = MIGRATIONS[4](v4);
    expect(v5.history[0]).toEqual({ day: 0, people: 0, gold: 2000, mood: 60 });
    expect(v5.newItems).toEqual(['palace', 'builders_guild', 'quarry', 'brickworks', 'obelisk_small', 'obelisk_large', 'plaza', 'colossus', 'mastaba_small', 'sphinx']);
    expect(MIGRATIONS[4](v4City()).newItems).toEqual([]);                        // a Village has none yet
    expect(STAGE4_ITEMS.length).toBe(11);
  });
  it('runs through migrate and deserialize, and reports a malformed version 4 save as corrupt', () => {
    const v4 = v4City();
    expect(migrate(v4)).toEqual(MIGRATIONS[4](v4));
    expect(deserialize(JSON.stringify(v4)).version).toBe(5);
    let msg = null;
    try { deserialize(JSON.stringify({ version: 4 })); } catch (e) { msg = e.message; }
    expect(msg).toBe('corrupt_save');
  });
});
