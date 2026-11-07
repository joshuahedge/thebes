// Version 9.0 wave 0 (ruling 1560, 1564): world version 12. world.heir ('steady' in a new and a migrated city, one of HEIRS) and the four
// month-end counts at 0. An 8.4 (v11) city loads as the Steady and plays a year as on 8.4; the lesson is always the Steady; New city takes
// the dynasty's heir.
import { describe, it, expect } from '../../harness.js';
import { V90_TALLY, HEIRS, HEIR_DEFAULT, isHeir } from '../../../src/data/v90.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { createWorld, WORLD_VERSION, STAGE90_TALLY, newTally } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, packSave, unpackSave, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { CURRENT_VERSION, MIGRATIONS } from '../../../src/save/migrate.js';
import { createSaveStore } from '../../../src/save/store.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { lessonWorld } from '../../../src/sim/lesson.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { boot } from '../../../src/boot.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

// The seed-11 sample Capital after 90 days, and the same city as an 8.4 (version 11) save: none of the version 12 fields.
function v11City() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  advanceDays(w, 90);
  const v11 = JSON.parse(serialize(w));
  delete v11.heir;
  for (const k of STAGE90_TALLY) delete v11.tally[k];
  v11.version = 11;
  return { w, v11 };
}

describe('v90 w0 save: world version 12', () => {
  it('creates a version 12 world, the Steady, with the four month-end counts at 0', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([12, 12, 12]);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect([REQUIRED.includes('heir'), w.heir, HEIR_DEFAULT]).toEqual([true, 'steady', 'steady']);
    expect(V90_TALLY).toEqual(['townMonths', 'fedMonths', 'tradeGold', 'billsPaid']);
    expect(STAGE90_TALLY).toEqual(V90_TALLY);
    for (const k of V90_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(new Set(TALLY_KEYS).size).toBe(TALLY_KEYS.length);
    expect(w.tally).toEqual(newTally());
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
  it('lists the six heirs, and createWorld takes one (anything else starts the Steady)', () => {
    expect(HEIRS).toEqual(['builder', 'unconquered', 'bountiful', 'merchant', 'generous', 'steady']);
    for (const h of HEIRS) expect([h, createWorld({ seed: 4, heir: h }).heir]).toEqual([h, h]);
    for (const bad of ['emperor', '', null, 3, 'Builder']) { expect([bad, isHeir(bad)]).toEqual([bad, false]); expect([bad, createWorld({ seed: 4, heir: bad }).heir]).toEqual([bad, 'steady']); }
  });
  it('saves and reloads a city with each heir, through the slot and an export alike', async () => {
    for (const h of HEIRS) {
      const w = createWorld({ seed: 6, heir: h });
      expect([h, deserialize(serialize(w)).heir]).toEqual([h, h]);
      expect([h, unpackSave(packSave(w, { savedAt: 1, lastSpeed: 2 })).world.heir]).toEqual([h, h]);
      const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
      expect((await store.save(packSave(w))).ok).toBe(true);
      const back = await store.load();
      expect([h, unpackSave(back.text).world]).toEqual([h, deserialize(serialize(w))]);
    }
  });
  it('refuses a world whose heir is missing or not one of HEIRS, and one missing a count', () => {
    for (const v of [undefined, 'emperor', null, 1]) {
      const o = JSON.parse(serialize(createWorld({ seed: 3 })));
      if (v === undefined) delete o.heir; else o.heir = v;
      expect([v, validateWorld(o)]).toEqual([v, false]);
    }
    for (const k of V90_TALLY) {
      const o = JSON.parse(serialize(createWorld({ seed: 3 })));
      delete o.tally[k];
      expect([k, validateWorld(o)]).toEqual([k, false]);
    }
  });
  it('loads an 8.4 (v11) city as the Steady with the counts at 0, and plays a year as the 8.4 city plays it', () => {
    const { w, v11 } = v11City();
    expect(validateWorld(v11)).toBe(false);                                           // not without its migration
    expect(validateWorld(MIGRATIONS[11](v11))).toBe(true);
    const loaded = deserialize(JSON.stringify(v11));
    expect([loaded.version, loaded.heir]).toEqual([12, 'steady']);
    for (const k of V90_TALLY) expect([k, loaded.tally[k]]).toEqual([k, 0]);
    expect(loaded.raid.nextWarnDay).toEqual(w.raid.nextWarnDay);
    // Track D (ruling 1560): the four counts start at the load, so they differ from the never-saved city's by its first 90 days' worth; every other
    // number is the same after a year. Was: the whole world equal, the counts 0 (wave 0 counted nothing).
    const counts = (x) => Object.fromEntries(V90_TALLY.map((k) => [k, x.tally[k]]));
    const before = counts(w);
    const without = (x) => { const o = JSON.parse(serialize(x)); for (const k of V90_TALLY) delete o.tally[k]; return o; };
    expect(without(loaded)).toEqual(without(w));
    advanceDays(w, 360);
    advanceDays(loaded, 360);
    expect(without(loaded)).toEqual(without(w));
    const after = counts(w);
    expect(counts(loaded)).toEqual(Object.fromEntries(V90_TALLY.map((k) => [k, after[k] - before[k]])));
    expect(loaded.tally.townMonths).toBe(12);
  });
});

describe('v90 w0 save: the lesson is the Steady, New city the dynasty\'s heir', () => {
  const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  async function bootWith(dynasty) {
    const width = 390, height = 844;
    const shell = await mountShell(width, height);
    const history = fakeHistory();
    const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true }), [RECORDS_KEY]: JSON.stringify({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty }) });
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
  }
  it('builds the lesson\'s world as the Steady', () => {
    expect(lessonWorld().heir).toBe('steady');
  });
  it('starts a new city with the dynasty\'s heir, and the lesson as the Steady whatever the device holds', async () => {
    const r = await bootWith({ name: 'Ana', heir: 'merchant' });
    try {
      expect(r.api.records.dynasty()).toEqual({ name: 'Ana', heir: 'merchant' });
      expect(r.api.freshWorld().heir).toBe('merchant');
      r.api.hooks.lesson({ step: 0 });
      await frame();
      expect([r.api.game().lesson, r.api.game().world.heir]).toEqual([true, 'steady']);
    } finally { r.cleanup(); }
  });
  it('starts the Steady on a device with no dynasty', async () => {
    const r = await bootWith(undefined);
    try { expect(r.api.freshWorld().heir).toBe('steady'); } finally { r.cleanup(); }
  });
});
