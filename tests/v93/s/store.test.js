// Version 9.3 S.1 (ruling 1965): the decree slot beside the main one.
import { describe, it, expect } from '../../harness.js';
import { createSaveStore } from '../../../src/save/store.js';
import { createWorld } from '../../../src/sim/world.js';
import { packSave } from '../../../src/save/serialize.js';
import { fakeIndexedDB, fakeLocal } from '../../helpers/fakeStorage.js';

const save = (seed) => packSave(createWorld({ seed }), { savedAt: 1, lastSpeed: 1 });

describe('v93 s slot', () => {
  it('writes the decree slot under decree.* in IndexedDB and leaves the main keys alone, both ways', async () => {
    const idb = fakeIndexedDB();
    const main = createSaveStore({ idb, local: fakeLocal() }), decree = createSaveStore({ idb, local: fakeLocal(), slot: 'decree' });
    await main.save(save(1));
    await decree.save(save(2));
    expect([...idb.records.keys()].sort()).toEqual(['current', 'decree.current']);
    await decree.save(save(3));
    expect([...idb.records.keys()].sort()).toEqual(['current', 'decree.backup', 'decree.current']);
    await decree.clear();
    expect([...idb.records.keys()]).toEqual(['current']);
    expect((await main.load()).text).toBe(save(1));
    await decree.save(save(4));
    await main.clear();
    expect([...idb.records.keys()].sort()).toEqual(['decree.current']);
    expect((await decree.load()).text).toBe(save(4));
  });
  it('writes localStorage keys thebes.save.decree.* and keeps the slots apart', async () => {
    const local = fakeLocal();
    const main = createSaveStore({ idb: null, local }), decree = createSaveStore({ idb: null, local, slot: 'decree' });
    await main.save(save(1)); await decree.save(save(2)); await decree.save(save(3));
    expect(Object.keys(local.data).sort()).toEqual(['thebes.save.current', 'thebes.save.decree.backup', 'thebes.save.decree.current']);
    await main.clear();
    expect(Object.keys(local.data).sort()).toEqual(['thebes.save.decree.backup', 'thebes.save.decree.current']);
    await decree.clear();
    expect(Object.keys(local.data)).toEqual([]);
  });
  it('falls back to the decree backup when the decree current fails, and the main slot is not consulted', async () => {
    for (const idbMode of [true, false]) {
      const idb = idbMode ? fakeIndexedDB() : null, local = fakeLocal();
      const main = createSaveStore({ idb, local }), decree = createSaveStore({ idb, local, slot: 'decree' });
      await main.save(save(1)); await decree.save(save(2)); await decree.save(save(3));
      if (idbMode) idb.records.set('decree.current', '{broken'); else local.data['thebes.save.decree.current'] = '{broken';
      const got = await decree.load();
      expect(got.usedBackup).toBe(true);
      expect(got.text).toBe(save(2));
      expect((await main.load()).text).toBe(save(1));
    }
  });
  it('a main store with no slot uses exactly the old keys', async () => {
    const idb = fakeIndexedDB(), local = fakeLocal();
    const s = createSaveStore({ idb, local: null });
    await s.save(save(1)); await s.save(save(2));
    expect([...idb.records.keys()].sort()).toEqual(['backup', 'current']);
    const l = createSaveStore({ idb: null, local, slot: '' });
    await l.save(save(1));
    expect(Object.keys(local.data)).toEqual(['thebes.save.current']);
  });
});
