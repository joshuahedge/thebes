// In-memory stand-ins for IndexedDB and localStorage, so save tests never touch the page's real storage.
const later = (fn) => Promise.resolve().then(fn);

// A request joins its transaction's pending list and settles after its callbacks run, so a callback that
// replaces onsuccess (or issues more requests) cannot strand the transaction.
function request(run, pending) {
  const req = { result: undefined, error: null, onsuccess: null, onerror: null };
  let settle;
  pending.push(new Promise((res) => { settle = res; }));
  later(() => {
    try { req.result = run(); if (req.onsuccess) req.onsuccess({ target: req }); } catch (e) { req.error = e; if (req.onerror) req.onerror({ target: req }); } finally { settle(); }
  });
  return req;
}

export function fakeIndexedDB({ failOpen = false } = {}) {
  const records = new Map();
  const db = {
    objectStoreNames: { contains: (n) => n === 'saves' && db.created },
    created: false,
    createObjectStore(name) { if (name === 'saves') db.created = true; return {}; },
    transaction(name, mode) {
      const pending = [];
      const store = {
        get: (k) => request(() => records.get(k), pending),
        put: (v, k) => { if (mode !== 'readwrite') throw new Error('read_only'); return request(() => { records.set(k, v); return k; }, pending); },
        delete: (k) => request(() => { records.delete(k); }, pending),
      };
      const t = { objectStore: () => store, oncomplete: null, onerror: null, onabort: null, error: null };
      later(async () => { while (pending.length) await pending.shift(); later(() => { if (t.oncomplete) t.oncomplete(); }); });
      return t;
    },
  };
  return {
    records,
    open(name, version) {
      const req = { result: db, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
      later(() => {
        if (failOpen) { req.error = new Error('open_failed'); if (req.onerror) req.onerror({ target: req }); return; }
        if (!db.created && req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
  };
}

export function fakeLocal({ quota = Infinity } = {}) {
  const data = {};
  const total = () => Object.values(data).reduce((n, v) => n + v.length, 0);
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem(k, v) { const s = String(v); if (total() - (data[k] ? data[k].length : 0) + s.length > quota) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } data[k] = s; },
    removeItem(k) { delete data[k]; },
  };
}
