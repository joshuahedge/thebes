// Saves (spec 7.5): staging -> validate -> current, previous current -> backup. IndexedDB holds the three
// records in one object store; localStorage holds the same three keys when IndexedDB is missing or fails.
// Loading reads the current record and falls back to the backup whenever the current one fails, except a newer version's save.
import { unpackSave } from './serialize.js';

const SLOTS = { staging: 'staging', current: 'current', backup: 'backup' };
const STORE = 'saves';

export function defaultIdb() { try { return typeof indexedDB !== 'undefined' ? indexedDB : null; } catch (e) { return null; } }
export function defaultLocal() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }

function openDb(idb, dbName) {
  return new Promise((resolve, reject) => {
    let req;
    try { req = idb.open(dbName, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('idb_open'));
    req.onblocked = () => reject(new Error('idb_blocked'));
  });
}

// Runs fn(store) inside one transaction and resolves with the last request's result once it commits.
function inTx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    let t;
    try { t = db.transaction(STORE, mode); } catch (e) { reject(e); return; }
    let last = null;
    try { last = fn(t.objectStore(STORE)); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(last && 'result' in last ? last.result : undefined);
    t.onerror = () => reject(t.error || new Error('idb_tx'));
    t.onabort = () => reject(t.error || new Error('idb_abort'));
  });
}

const isNewer = (e) => e && e.message === 'newer_version';
const quotaCode = (e) => (e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || '')) ? 'storage_full' : 'write_failed');

export function createSaveStore({ idb = defaultIdb(), local = defaultLocal(), dbName = 'thebes', key = 'thebes.save' } = {}) {
  let dbPromise = null;
  const api = { backend: idb ? 'idb' : local ? 'local' : 'none' };
  const localKey = (slot) => `${key}.${slot}`;

  // Opening IndexedDB can fail (private mode, blocked storage); then localStorage takes over for good.
  async function db() {
    if (!dbPromise) dbPromise = openDb(idb, dbName).catch((e) => { dbPromise = null; api.backend = local ? 'local' : 'none'; throw e; });
    return dbPromise;
  }

  async function idbSave(text) {
    const d = await db();
    await inTx(d, 'readwrite', (s) => s.put(text, SLOTS.staging));
    const staged = await inTx(d, 'readonly', (s) => s.get(SLOTS.staging));
    unpackSave(staged);                                    // the stored bytes must read back as a save
    await inTx(d, 'readwrite', (s) => {
      const cur = s.get(SLOTS.current);
      cur.onsuccess = () => {
        if (typeof cur.result === 'string') s.put(cur.result, SLOTS.backup);
        s.put(text, SLOTS.current);
        s.delete(SLOTS.staging);
      };
      return cur;
    });
  }

  function localSave(text) {
    local.setItem(localKey('staging'), text);
    unpackSave(local.getItem(localKey('staging')));
    const cur = local.getItem(localKey('current'));
    if (typeof cur === 'string') local.setItem(localKey('backup'), cur);
    local.setItem(localKey('current'), text);
    local.removeItem(localKey('staging'));
  }

  async function readSlot(slot) {
    if (api.backend === 'idb') { const d = await db(); return await inTx(d, 'readonly', (s) => s.get(slot)); }
    return local.getItem(localKey(slot));
  }

  api.save = async (text) => {
    try { unpackSave(text); } catch (e) { return { ok: false, backend: api.backend, code: e.message }; }
    if (api.backend === 'idb') {
      try { await idbSave(text); return { ok: true, backend: 'idb' }; } catch (e) { if (api.backend === 'idb') return { ok: false, backend: 'idb', code: quotaCode(e) }; }
    }
    if (api.backend === 'local') {
      try { localSave(text); return { ok: true, backend: 'local' }; } catch (e) { return { ok: false, backend: 'local', code: quotaCode(e) }; }
    }
    return { ok: false, backend: 'none', code: 'no_storage' };
  };

  api.load = async () => {
    if (api.backend === 'idb') { try { await db(); } catch (e) { /* backend switched to local or none */ } }
    if (api.backend === 'none') return null;
    const current = await readSlot(SLOTS.current);
    if (typeof current !== 'string') return null;
    try { unpackSave(current); return { text: current, backend: api.backend, usedBackup: false }; } catch (e) {
      if (isNewer(e)) throw e;                               // a newer version's save is refused, nothing is touched; any other failure offers the backup
      const backup = await readSlot(SLOTS.backup);
      if (typeof backup !== 'string') throw e;
      unpackSave(backup);                                    // a bad backup throws its own code
      return { text: backup, backend: api.backend, usedBackup: true };
    }
  };

  api.clear = async () => {
    if (api.backend === 'idb') { try { const d = await db(); await inTx(d, 'readwrite', (s) => { s.delete(SLOTS.staging); s.delete(SLOTS.current); return s.delete(SLOTS.backup); }); return; } catch (e) { /* fall through */ } }
    if (api.backend === 'local') for (const slot of Object.values(SLOTS)) local.removeItem(localKey(slot));
  };

  return api;
}
