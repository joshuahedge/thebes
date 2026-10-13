import { describe, it, expect } from '../../harness.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../../src/save/serialize.js';
import { createWorld, population, STAGE3_TALLY, newRaidState, newDangerState } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../../src/sim/commands.js';
import { RAIDS } from '../../../src/data/raids.js';

const V4_KEYS = ['wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId'];
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

// A version 3 save as Stage 2 wrote it: a lived-in city without the version 4 fields.
function v3City({ milestone = null, peak = null } = {}) {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v3 = JSON.parse(serialize(w));
  for (const k of V4_KEYS) delete v3[k];
  for (const k of STAGE3_TALLY) delete v3.tally[k];
  for (const b of Object.values(v3.buildings)) { delete b.risk; delete b.fire; }
  v3.newItems = v3.newItems.filter((t) => !['firehouse', 'wall', 'tower', 'barracks'].includes(t));   // Stage 2 never listed them
  if (milestone) v3.milestone = milestone;
  if (peak !== null) v3.tally.peakPeople = peak;
  v3.version = 3;
  return v3;
}

// A valid version 4 world as plain data, changed by fn, then validated.
function validAfter(fn) {
  const w = JSON.parse(serialize(createWorld({ seed: 3 })));
  fn(w);
  return validateWorld(w);
}

describe('s3 contract migrate v3 to v4', () => {
  it('adds no walls, no raid, no soldiers, no danger, no splits, seals, feats or city id, and keeps everything else', () => {
    const v3 = v3City();
    expect(population(v3)).toBeGreaterThan(0);
    const before = JSON.stringify(v3);
    const v4 = MIGRATIONS[3](v3);
    expect(JSON.stringify(v3)).toBe(before);                                  // the old object is not changed
    expect(v4.version).toBe(4);
    expect(v4.wall).toEqual(new Array(v3.size * v3.size).fill(0));
    expect([v4.wallVersion, v4.soldiers, v4.nextUnitId, v4.splits, v4.seals, v4.cityId]).toEqual([0, [], 1, {}, [], null]);
    expect(v4.raid).toEqual(newRaidState());                                    // under 250 people: no clock yet
    expect(v4.danger).toEqual(newDangerState());
    expect(v4.feats).toEqual({ earned: [], lost: [], counters: {} });
    expect(v4.tally).toEqual({ ...v3.tally, ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])) });
    for (const [id, b] of Object.entries(v3.buildings)) expect(v4.buildings[id]).toEqual({ ...b, risk: 0, fire: null });
    expect(v4.newItems).toEqual([...v3.newItems, 'firehouse']);                 // a Village gets the firehouse's New badge
    for (const k of Object.keys(v3)) {
      if (!['version', 'tally', 'buildings', 'newItems'].includes(k)) expect([k, v4[k]]).toEqual([k, v3[k]]);
    }
    expect(Object.keys(v4).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(v4)).toBe(true);
  });
  it('gives a Market town or bigger the defences New badges too, once each', () => {
    const v3 = v3City({ milestone: 'city' });
    v3.newItems = ['farm_barley', 'tower'];
    expect(MIGRATIONS[3](v3).newItems).toEqual(['farm_barley', 'tower', 'firehouse', 'wall', 'barracks']);
    expect(MIGRATIONS[3](v3City({ milestone: 'town' })).newItems).toEqual(['firehouse']);
  });
  it('starts the raid clock on the day it is loaded for a city that already had 250 people, so no raid lands at once', () => {
    const v3 = v3City({ peak: RAIDS.clockPeople });
    const v4 = MIGRATIONS[3](v3);
    expect(v4.raid.clockDay).toBe(v3.day);
    expect(v4.raid.nextWarnDay).toBe(v3.day + RAIDS.firstWarnAfter);
    expect([v4.raid.warning, v4.raid.active, v4.raid.index]).toEqual([null, null, 0]);
    expect(MIGRATIONS[3](v3City({ peak: RAIDS.clockPeople - 1 })).raid.clockDay).toBe(null);   // 249: the clock waits
  });
  it('runs through migrate, deserialize and unpackSave', () => {
    const v3 = v3City();
    expect(CURRENT_VERSION).toBe(6);
    expect(migrate(v3)).toEqual(MIGRATIONS[5](MIGRATIONS[4](MIGRATIONS[3](v3))));
    expect(deserialize(JSON.stringify(v3)).version).toBe(6);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v3 }));
    expect([back.savedAt, back.lastSpeed, back.world.version, back.world.gold]).toEqual([1760000000000, 2, 6, v3.gold]);
  });
  it('reports a malformed version 3 save as corrupt, not as a failed migration', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 3 })))).toBe('corrupt_save');
    const v3 = v3City();
    v3.buildings = null;
    expect(code(() => deserialize(JSON.stringify(v3)))).toBe('corrupt_save');
    const odd = v3City();
    odd.size = 'big';
    expect(code(() => deserialize(JSON.stringify(odd)))).toBe('corrupt_save');
  });
});

describe('s3 contract validateWorld v4', () => {
  it('requires each new field and each Stage 3 tally', () => {
    for (const k of V4_KEYS) expect([k, validAfter((w) => { delete w[k]; })]).toEqual([k, false]);
    for (const k of STAGE3_TALLY) expect([k, validAfter((w) => { delete w.tally[k]; })]).toEqual([k, false]);
    expect(validAfter((w) => { w.difficulty = 'peaceful'; })).toBe(true);
  });
  it('checks the wall layer: one whole number per tile, -1 for a breach at the least', () => {
    expect(validAfter((w) => { w.wall[3] = 40; w.wall[4] = -1; })).toBe(true);
    expect(validAfter((w) => { w.wall.pop(); })).toBe(false);
    expect(validAfter((w) => { w.wall[3] = -2; })).toBe(false);
    expect(validAfter((w) => { w.wall[3] = 1.5; })).toBe(false);
    expect(validAfter((w) => { w.wallVersion = 'x'; })).toBe(false);
    expect(validAfter((w) => { w.nextUnitId = 0; })).toBe(false);
  });
  it('checks every building has a risk and a fire that is null, a blaze or a fire', () => {
    const withHouse = (fn) => validAfter((w) => {
      w.buildings[1] = { id: 1, type: 'house', x: 2, y: 2, w: 1, d: 1, staff: 0, paused: false, store: {}, progress: 0, blocked: null, risk: 0, fire: null, rot: 0, health: 0, crime: 0, illness: null };
      w.occ[2 * w.size + 2] = 1;
      fn(w.buildings[1]);
    });
    expect(withHouse(() => {})).toBe(true);
    expect(withHouse((b) => { b.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 }; })).toBe(true);
    expect(withHouse((b) => { b.fire = { stage: 'fire', days: 0, left: 12 }; })).toBe(true);
    expect(withHouse((b) => { b.fire = { stage: 'smoke' }; })).toBe(false);
    expect(withHouse((b) => { delete b.risk; })).toBe(false);
    expect(withHouse((b) => { b.risk = NaN; })).toBe(false);
  });
  it('checks the raid, danger, splits, seals, feats and city id shapes', () => {
    expect(validAfter((w) => { w.raid = null; })).toBe(false);
    expect(validAfter((w) => { w.raid.clockDay = 1.5; })).toBe(false);
    expect(validAfter((w) => { w.raid.index = -1; })).toBe(false);
    expect(validAfter((w) => { w.raid.warning = []; })).toBe(false);
    expect(validAfter((w) => { w.raid.adaptation = null; })).toBe(false);
    expect(validAfter((w) => { w.soldiers = [1]; })).toBe(false);
    expect(validAfter((w) => { w.danger.burnDays = [1.5]; })).toBe(false);
    expect(validAfter((w) => { w.danger.firePaused = 0; })).toBe(false);
    expect(validAfter((w) => { w.splits = { town: 'soon' }; })).toBe(false);
    expect(validAfter((w) => { w.seals = [3]; })).toBe(false);
    expect(validAfter((w) => { w.feats = { earned: [], lost: [] }; })).toBe(false);
    expect(validAfter((w) => { w.feats.counters.fed = 'x'; })).toBe(false);
    expect(validAfter((w) => { w.cityId = ''; })).toBe(false);
    expect(validAfter((w) => { w.cityId = 'a1'; })).toBe(true);
  });
});
