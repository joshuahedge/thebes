import { describe, it, expect } from '../harness.js';
import { createSaveStore } from '../../src/save/store.js';
import { packSave, unpackSave, validateWorld } from '../../src/save/serialize.js';
import { migrate, CURRENT_VERSION } from '../../src/save/migrate.js';
import { createWorld } from '../../src/sim/world.js';
import { place, drawRoad } from '../../src/sim/commands.js';
import { fakeIndexedDB, fakeLocal } from '../helpers/fakeStorage.js';

const code = async (p) => { try { await p; } catch (e) { return e.message; } return null; };
const city = (seed = 5) => { const w = createWorld({ seed }); drawRoad(w, w.focus.x - 3, w.focus.y, w.focus.x + 3, w.focus.y); return w; };

describe('save envelope', () => {
  it('packs the world with the wall-clock fields outside it and unpacks them', () => {
    const w = city();
    const text = packSave(w, { savedAt: 1760000000000, lastSpeed: 2 });
    const back = unpackSave(text);
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world).toEqual(w);
    expect(JSON.parse(text).world.savedAt).toBe(undefined);
  });
  it('accepts a bare world and falls back on odd envelope fields', () => {
    const w = city();
    expect(unpackSave(JSON.stringify(w)).savedAt).toBe(null);
    expect(unpackSave(JSON.stringify(w)).lastSpeed).toBe(1);
    expect(unpackSave(JSON.stringify({ version: 1, savedAt: 'x', lastSpeed: 9, world: w })).lastSpeed).toBe(1);
    expect(unpackSave(JSON.stringify({ version: 1, savedAt: 'x', lastSpeed: 9, world: w })).savedAt).toBe(null);
  });
  it('reports the save codes', async () => {
    const w = city();
    expect(await code(Promise.resolve().then(() => unpackSave('{nope')))).toBe('corrupt_save');
    expect(await code(Promise.resolve().then(() => unpackSave(JSON.stringify({ version: 2, world: w }))))).toBe('newer_version');
    expect(await code(Promise.resolve().then(() => unpackSave(JSON.stringify({ version: 1, world: { ...w, version: w.version + 1 } }))))).toBe('newer_version');
    expect(await code(Promise.resolve().then(() => unpackSave(JSON.stringify({ version: 1, world: { hello: 1 } }))))).toBe('not_a_save');
  });
  it('validates buildings, occupancy, goals and history', () => {
    const w = city();
    expect(place(w, 'well', w.focus.x, w.focus.y - 1).ok).toBe(true);
    expect(validateWorld(JSON.parse(JSON.stringify(w)))).toBe(true);
    const unknown = JSON.parse(JSON.stringify(w)); Object.values(unknown.buildings)[0].type = 'pyramid';
    expect(validateWorld(unknown)).toBe(false);
    const proto = JSON.parse(JSON.stringify(w)); Object.values(proto.buildings)[0].type = 'constructor';
    expect(validateWorld(proto)).toBe(false);                                  // prototype keys are not building types
    const strayProto = JSON.parse(JSON.stringify(w)); strayProto.occ[0] = 'toString';
    expect(validateWorld(strayProto)).toBe(false);
    const stray = JSON.parse(JSON.stringify(w)); stray.occ[0] = 999;
    expect(validateWorld(stray)).toBe(false);
    const noGoals = JSON.parse(JSON.stringify(w)); noGoals.goals = { completed: 'none' };
    expect(validateWorld(noGoals)).toBe(false);
    expect(w.startRoad.length).toBeGreaterThan(0);
    expect(w.history).toEqual([]);
  });
  it('refuses a migration that overshoots or throws', () => {
    const table = { 1: (o) => ({ ...o, version: 3 }), 2: () => { throw new Error('boom'); } };
    expect(() => migrate({ version: 1 }, table, 2)).toThrow();
    let msg = null; try { migrate({ version: 1 }, table, 2); } catch (e) { msg = e.message; }
    expect(msg).toBe('bad_migration_1');
    try { migrate({ version: 2 }, table, 3); } catch (e) { msg = e.message; }
    expect(msg).toBe('bad_migration_2');
    expect(CURRENT_VERSION).toBe(9);
  });
});

describe('save store', () => {
  it('writes staging then current, keeps the previous save as the backup, and reads the current one', async () => {
    const idb = fakeIndexedDB();
    const store = createSaveStore({ idb, local: null });
    const a = packSave(city(1)), b = packSave(city(2));
    expect((await store.save(a)).ok).toBe(true);
    expect(store.backend).toBe('idb');
    expect(idb.records.get('current')).toBe(a);
    expect(idb.records.has('staging')).toBe(false);
    expect((await store.save(b)).ok).toBe(true);
    expect(idb.records.get('backup')).toBe(a);
    const loaded = await store.load();
    expect(loaded.text).toBe(b);
    expect(loaded.usedBackup).toBe(false);
  });
  it('falls back to the backup whenever the current save fails, and refuses newer saves', async () => {
    const idb = fakeIndexedDB();
    const store = createSaveStore({ idb, local: null });
    const a = packSave(city(1));
    await store.save(a); await store.save(packSave(city(2)));
    idb.records.set('current', '{broken');
    const loaded = await store.load();
    expect(loaded.text).toBe(a);
    expect(loaded.usedBackup).toBe(true);
    idb.records.set('current', JSON.stringify({ version: 99, world: {} }));
    expect(await code(store.load())).toBe('newer_version');
    expect(idb.records.get('backup')).toBe(a);
    idb.records.set('current', JSON.stringify({ version: 1, world: {} }));        // not_a_save: the backup is offered too
    const second = await store.load();
    expect(second.text).toBe(a);
    expect(second.usedBackup).toBe(true);
    expect(await code(createSaveStore({ idb, local: null }).save('{nope'))).toBe(null);
    expect((await createSaveStore({ idb, local: null }).save('{nope')).code).toBe('corrupt_save');
  });
  it('uses localStorage when IndexedDB is missing or fails to open, and reports a full store', async () => {
    const local = fakeLocal();
    const store = createSaveStore({ idb: fakeIndexedDB({ failOpen: true }), local });
    const a = packSave(city(3));
    expect((await store.save(a)).ok).toBe(true);
    expect(store.backend).toBe('local');
    expect(local.data['thebes.save.current']).toBe(a);
    expect((await store.load()).text).toBe(a);
    const tiny = createSaveStore({ idb: null, local: fakeLocal({ quota: 10 }) });
    const r = await tiny.save(a);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('storage_full');
    const none = createSaveStore({ idb: null, local: null });
    expect((await none.save(a)).code).toBe('no_storage');
    expect(await none.load()).toBe(null);
    await store.clear();
    expect(await store.load()).toBe(null);
  });
});
