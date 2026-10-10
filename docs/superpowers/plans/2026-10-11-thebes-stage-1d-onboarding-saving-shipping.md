# Thebes Stage 1d: Onboarding, Saving and Shipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Stage 1 so the game can be shared at a link: a title card over a drifting sample city, the goals list with Show me, autosave with a backup and a Welcome back card, export and import, the home-screen install flow and in-app browser notice, sound and haptics, an installable offline web app with a link preview, and the publish preparation.

**Architecture:** Saving lives in `src/save/` (envelope, IndexedDB store with a localStorage fallback, export/import, install flow) and touches the world only through `serialize`/`deserialize`. Goals are data (`src/data/goals.js`) checked daily by the sim (`src/sim/goals.js`), so they are deterministic and saved with the world. The interface gains four sheets and one strip (`goals`, `welcome`, `install`, the title card and the goals strip) through the existing `custom` sheet map and `createUI` hooks. `main.js` boots in two phases: title card, then the game. The service worker caches a generated file list; icons and the link-preview image are rendered by the art code with a small tool page.

**Tech Stack:** HTML + CSS + JavaScript ES modules, Canvas 2D, IndexedDB with a localStorage fallback, Web Audio, Web Share, service worker, the in-house test harness in headless Edge, `tests/serve.py`, PowerShell tools.

**Spec:** `docs/superpowers/specs/2026-10-09-thebes-design.md` sections 4.1 (title card, new city, goals), 4.17 (saving and returning, export/import, phones and saved data), 5.5 (sound and haptics), 6.3 ("update ready" toast, "save failing" critical alert), 7.1 (PWA, link preview), 7.5 (saves and storage), 8 (hosting), 9 (first-session play-test, real-device checks). Also binding: `docs/superpowers/notes/2026-10-11-stage-1d-plan-brief.md` (the decisions this plan argues from), the "Plan 1d" sections of `docs/superpowers/notes/2026-10-09-stage-1a-followups.md` and `docs/superpowers/notes/2026-10-10-stage-1b-followups.md`, and `docs/superpowers/notes/2026-10-10-stage-1c-followups.md`.

**Out of scope (Stage 2 and later):** fire, raids, the raid horn, the first-raid pause, goals for first-time events, the goods/entertainment/desirability overlays, PNG art slots, missions.

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules, plain CSS in `css/ui.css`. Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox, Safari.
- The sim stays deterministic: no wall clock, no `Math.random`, no storage access inside `src/sim`. Wall-clock values (`savedAt`) live in the save envelope, never in the world. The UI changes the world only through `src/sim/commands.js`, `src/sim/undo.js` and `assignLabour`; loading a save builds a new world object and a new UI around it (never `Object.assign` into the live world: the reach cache is keyed by world object).
- Save shape: the world gains `startRoad`, `goals` and `history` without a `WORLD_VERSION` bump, because no save exists outside this machine yet (1a rule). After Task 1 of this plan, every further world-shape change needs a migration.
- Spec 4.17: autosave every game-month and whenever the page is hidden; one city slot plus the previous autosave as a backup; the game always reopens paused; Carry on restores the last speed; a failing save shows a persistent warning.
- Spec 7.5: safe writes (staging → validate → current, previous → backup); load falls back to the backup when the current slot is corrupt; a newer-version save is refused politely without overwriting anything.
- Spec 4.1: the title card offers Continue (when a save exists), New city, Play with sound / Play muted, Install (where the platform allows); a new city starts paused with 2,000 gold, the camera on fertile land and the start road.
- Spec 5.5: about eight synthesised Web Audio effects, no music, off by default and remembered; `navigator.audioSession.type = 'ambient'` where supported; never the silent-switch unlock hack; short `navigator.vibrate` pulses on ✓ and milestones with a setting to turn them off.
- Spec 6.3: the "update ready" toast appears only when no placement is in progress; it saves first, then reloads. "Save failing" is a critical alert (banner with View).
- Spec 7.1: manifest, icons including `apple-touch-icon`, `theme-color`, a service worker caching all files, `og:title`, `og:description` and a 1200×630 `og:image` committed as a PNG.
- Spec 6.1 and 6.8 still bind every new control: real buttons with labels, 44 px targets, 4.5:1 text, one panel at a time, nothing over the middle of the map, Back closes one step.
- Copy rules: plain English, sentence case, no jargon; "Pharaoh" never appears in code or text; every string in `src/ui/text.js`.
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>` (already in `.git/config`). Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the project's standing line; it overrides any attribution rule of the implementing model).
- LF line endings. Run commands from `C:\dev\thebes` in PowerShell. The suite is `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` and must print `ALL PASSED` at the end of every task (373 tests now).
- Publishing is Josh's decision: no `git remote add`, no `git push`, no GitHub repo or Pages setup in any task. The last task prepares and stops.

## File Structure

```
thebes/
  index.html                       MODIFY: manifest link, icons, og tags; containers #title, #goals, #notice
  manifest.webmanifest             name, icons, display standalone, theme and background colour, start_url "./"
  sw.js                            service worker: cache-first over the list in sw-files.js, versioned by APP_VERSION
  sw-files.js                      generated: self.THEBES_FILES = [...] (tools/sw-files.ps1)
  icons/                           icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon-32.png (rendered, committed)
  og-image.png                     1200x630 link preview (rendered, committed)
  tools/assets.html                draws the icons and the og image with the art code and POSTs them to the server
  tools/render-assets.ps1          headless Edge driver for tools/assets.html
  tools/sw-files.ps1               writes sw-files.js from the files on disk
  src/data/goals.js                GOALS: the opening chain and milestone goals; GOAL_REWARD
  src/data/ui.js                   MODIFY: AUTOSAVE_HIDDEN_MS, TITLE_DRIFT_MS, SHOW_ME_PULSES, SW_PATH
  src/sim/world.js                 MODIFY: startRoad, goals, history fields; HISTORY_MONTHS
  src/sim/clock.js                 MODIFY: month event, history row, checkGoals in tickDay
  src/sim/goals.js                 checkGoals(world, events), openGoals(world, limit), goalById
  src/save/serialize.js            MODIFY: deeper validateWorld; packSave/unpackSave (the envelope)
  src/save/migrate.js              MODIFY: overshoot guard, step errors wrapped
  src/save/store.js                createSaveStore: staging/current/backup in IndexedDB or localStorage
  src/save/exportImport.js         exportSave (share or download), importSaveFile (File -> envelope)
  src/save/installFlow.js          detectEnvironment, createInstallFlow (guide, bring-a-city, in-app notice, persist)
  src/audio/sfx.js                 createSfx (seven synthesised effects, unlock on gesture), vibrate helper
  src/ui/goalsList.js              the goals strip under the top bar, the goals sheet renderer, showMe
  src/ui/welcomeBack.js            the Welcome back sheet renderer, elapsed-time and trend text
  src/ui/titleCard.js              the title overlay and the drifting backdrop
  src/ui/createUI.js               MODIFY: hooks (save, onMonth, onHidden, install), extra sheets, goals strip, sfx, update toast
  src/main.js                      MODIFY: two-phase boot, service worker registration, update-ready flow
  src/ui/text.js, css/ui.css       MODIFY: copy and styles for the new sheets, strip, title card, notice
  src/ui/sheets.js, confirmBar.js, rail.js, hud.js, overlayUi.js, modes.js, effects.js, spriteCache.js   MODIFY: 1c carry-overs (Task 12)
  tests/serve.py                   MODIFY: POST /__file (allow-listed), optional bind host
  tests/helpers/fakeStorage.js     fakeIndexedDB() and fakeLocal() for the save store tests
  tests/sim/goals.test.js, tests/save/store.test.js, tests/save/exportImport.test.js, tests/save/installFlow.test.js,
  tests/audio/sfx.test.js, tests/ui/goalsList.test.js, tests/ui/welcomeBack.test.js, tests/ui/titleCard.test.js,
  tests/ui/pwa.test.js, tests/ui/boot.test.js, tests/ui/carryovers.test.js
```

## Conventions every task relies on

- **The save envelope** (`src/save/serialize.js`): `packSave(world, { savedAt, lastSpeed }) → string` and `unpackSave(text) → { savedAt, lastSpeed, world }`. The string is JSON `{ version: 1, savedAt, lastSpeed, world }` where `world` is the plain world object (`serialize`'s shape). `unpackSave` throws the same codes as `deserialize` (`corrupt_save`, `not_a_save`, `newer_version`, `no_migration_<v>`, `bad_migration_<v>`); a bare world (no envelope) is accepted with `savedAt: null, lastSpeed: 1` so old exports still load.
- **The save store** (`src/save/store.js`): `createSaveStore({ idb, local, dbName = 'thebes', key = 'thebes.save' }) → { save(text) → Promise<{ ok, backend, code? }>, load() → Promise<{ text, backend, usedBackup } | null>, clear() → Promise, backend }`. `backend` is `'idb'`, `'local'` or `'none'`. The store never parses the text itself beyond `unpackSave` for validation of the staging write.
- **Sheet kinds** grow by `goals`, `welcome`, `install`; they render through `sheets.js`'s `custom` map like the menu. `store.sheet.kind` is the only thing that changes; `modes.js` already treats non-info sheets alike.
- **Hooks** (`createUI({ hooks })`): `newCity()`, `exportCity()`, `importCity()` (existing names), plus `save(reason) → Promise<boolean>` (called on `month`, `hidden` and before an update reload), `install()` (the Install button and the guide), `bringCity()`. `createUI` also accepts `extraSheets` (merged into `custom`) and `sfx`.
- **Events** from the sim now include `{ type: 'month' }` and `{ type: 'goal', id, reward }`; `createUI` forwards every event batch to `sfx` and to the goals strip through `ui.onEvents(events)` (new), which `main.js` calls from the loop's `onEvents` alongside `effects.fromEvents`.
- **Copy** comes from `src/ui/text.js`; tests use `mount()`/`fire()`/`key()` from `tests/helpers/dom.js` and `rigUI()` from `tests/helpers/uiWorld.js` where a whole interface is needed.
- Tests that need storage use `fakeIndexedDB()` and `fakeLocal()` from `tests/helpers/fakeStorage.js` (Task 1), never the page's real storage, so runs stay isolated.

## How to run tests

- `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` runs everything; `-Grep "save store"` runs one group.
- `python tests/serve.py 8000 .` then `http://localhost:8000/` is the game (`?seed=7`, `?sample=1`, `?stress=1`, `?speed=1`, and new in this plan `?skipTitle=1` to boot straight into a new city). `python tests/serve.py 8000 . "" 0.0.0.0` binds every interface for a phone on the LAN (Task 12).

---

### Task 1: Save envelope, deeper validation and the save store

**Files:**
- Modify: `src/sim/world.js` (three new fields), `src/save/serialize.js` (deeper `validateWorld`, `packSave`, `unpackSave`), `src/save/migrate.js` (overshoot guard, wrapped step errors)
- Create: `src/save/store.js`, `tests/helpers/fakeStorage.js`
- Test: `tests/save/store.test.js`; modify `tests/save/serialize.test.js`, `tests/all.js`

**Interfaces:**
- Consumes: `createWorld`, `WORLD_VERSION`, `BUILDINGS`, the existing `serialize`/`deserialize`/`migrate`.
- Produces (`world.js`): `createWorld` adds `startRoad` (the generator's `[x, y]` tiles, copied), `goals: { completed: [] }`, `history: []`; exports `HISTORY_MONTHS = 12`.
- Produces (`serialize.js`): `REQUIRED` gains `startRoad`, `goals`, `history`; `validateWorld` (now exported) also rejects a building whose `type` is not in `BUILDINGS`, an `occ` entry that names a missing building, a non-array `goals.completed` or `history`; `SAVE_VERSION = 1`; `packSave(world, { savedAt = null, lastSpeed = 1 }) → string`; `unpackSave(text) → { savedAt, lastSpeed, world }` (codes as in Conventions; a bare world is accepted with `savedAt: null, lastSpeed: 1`).
- Produces (`migrate.js`): a step that jumps past `target` or throws is reported as `bad_migration_<v>`.
- Produces (`store.js`): `createSaveStore({ idb, local, dbName, key })` as in Conventions; `defaultIdb()`/`defaultLocal()` return the globals or null, guarded with try/catch.
- Produces (`tests/helpers/fakeStorage.js`): `fakeIndexedDB({ failOpen = false })` (an in-memory IndexedDB with `open`, `objectStoreNames`, `createObjectStore`, `transaction`, `get`/`put`/`delete` requests, `oncomplete`; `.records` exposes the map for tampering) and `fakeLocal({ quota = Infinity })` (`getItem`/`setItem`/`removeItem`; `setItem` throws when the total length would pass `quota`; `.data`).

- [ ] **Step 1: Write the failing tests**

`tests/helpers/fakeStorage.js`:
```js
// In-memory stand-ins for IndexedDB and localStorage, so save tests never touch the page's real storage.
const later = (fn) => Promise.resolve().then(fn);

function request(run) {
  const req = { result: undefined, error: null, onsuccess: null, onerror: null };
  later(() => { try { req.result = run(); if (req.onsuccess) req.onsuccess({ target: req }); } catch (e) { req.error = e; if (req.onerror) req.onerror({ target: req }); } });
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
      const track = (r) => { pending.push(new Promise((res) => { const s = r.onsuccess, e = r.onerror; r.onsuccess = (ev) => { if (s) s(ev); res(); }; r.onerror = (ev) => { if (e) e(ev); res(); }; })); return r; };
      const store = {
        get: (k) => track(request(() => records.get(k))),
        put: (v, k) => { if (mode !== 'readwrite') throw new Error('read_only'); return track(request(() => { records.set(k, v); return k; })); },
        delete: (k) => track(request(() => { records.delete(k); })),
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
```

`tests/save/store.test.js`:
```js
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
    expect(CURRENT_VERSION).toBe(1);
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
  it('falls back to the backup only when the current save is corrupt, and refuses newer saves', async () => {
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
```

Append to `tests/all.js`:
```js
import './save/store.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "save store"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/save/store.js` and the helper do not exist).

- [ ] **Step 3: Extend the world shape, the validation and the migration guard**

In `src/sim/world.js`, add after `WORLD_VERSION`:
```js
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends
```
and in `createWorld`'s object literal, after `stats: { lastMonth: null },`:
```js
    startRoad: m.startRoad.map(([x, y]) => [x, y]),   // the generator's road in from the trade edge (goals, Show me)
    goals: { completed: [] },                           // ids of finished goals, in order
    history: [],                                        // { day, people, gold, mood } per month end, newest last
```

`src/save/serialize.js` (replace the whole file):
```js
import { migrate } from './migrate.js';
import { BUILDINGS } from '../data/buildings.js';

// Every top-level field createWorld produces (src/sim/world.js).
export const REQUIRED = [
  'version', 'seed', 'size', 'day', 'speed', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId',
  'mood', 'moodBreakdown', 'milestone', 'labour', 'alerts', 'undo', 'roadVersion', 'tradeEntry',
  'raiderEntries', 'focus', 'stats', 'startRoad', 'goals', 'history',
];

// The save envelope (spec 4.17): wall-clock fields sit beside the world, never inside it.
export const SAVE_VERSION = 1;

export function serialize(world) {
  return JSON.stringify(world);
}

export function validateWorld(w) {
  for (const k of REQUIRED) if (!(k in w)) return false;
  if (!Number.isInteger(w.size) || w.size <= 0) return false;
  const cells = w.size * w.size;
  for (const k of ['terrain', 'road', 'occ']) if (!Array.isArray(w[k]) || w[k].length !== cells) return false;
  if (!w.buildings || typeof w.buildings !== 'object') return false;
  if (!Number.isInteger(w.day) || !Number.isInteger(w.nextId) || !Number.isFinite(w.gold)) return false;
  for (const b of Object.values(w.buildings)) if (!b || !BUILDINGS[b.type]) return false;   // 1a note: unknown types
  for (const id of w.occ) if (id !== 0 && !w.buildings[id]) return false;                   // 1a note: stray occupancy
  if (!Array.isArray(w.startRoad) || !w.goals || !Array.isArray(w.goals.completed) || !Array.isArray(w.history)) return false;
  return true;
}

function finishLoad(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const w = migrate(obj);
  if (!validateWorld(w)) throw new Error('corrupt_save');
  return w;
}

// Version is checked before shape, so a newer or older save is reported as such and not as corrupt.
export function deserialize(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  return finishLoad(obj);
}

export function packSave(world, { savedAt = null, lastSpeed = 1 } = {}) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, lastSpeed, world });
}

// A bare world (an early export) is accepted as an envelope with no wall-clock data.
export function unpackSave(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const bare = !('world' in obj);
  if (!bare && Number.isInteger(obj.version) && obj.version > SAVE_VERSION) throw new Error('newer_version');
  const world = finishLoad(bare ? obj : obj.world);
  return {
    savedAt: !bare && Number.isFinite(obj.savedAt) ? obj.savedAt : null,
    lastSpeed: !bare && [1, 2, 3].includes(obj.lastSpeed) ? obj.lastSpeed : 1,
    world,
  };
}
```

In `src/save/migrate.js`, replace the loop body so a step that throws, stalls or overshoots is a bad migration:
```js
  while (w.version < target) {
    const step = table[w.version];
    if (!step) throw new Error('no_migration_' + w.version);
    let next;
    try { next = step(w); } catch (e) { throw new Error('bad_migration_' + w.version); }
    if (!next || !(next.version > w.version) || next.version > target) throw new Error('bad_migration_' + w.version);
    w = next;
  }
```
The existing `tests/save/serialize.test.js` round-trips a world through `deserialize(serialize(w))`; the three new fields ride along. If one of its synthetic-chain tests expected a step that jumps past the target to succeed, that test encoded the gap the 1a note flagged: change its expectation to `bad_migration_<v>` and say so in the report.

- [ ] **Step 4: Write the save store**

`src/save/store.js`:
```js
// Saves (spec 7.5): staging -> validate -> current, previous current -> backup. IndexedDB holds the three
// records in one object store; localStorage holds the same three keys when IndexedDB is missing or fails.
// Loading reads the current record and falls back to the backup only when the current one is corrupt.
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

const isCorrupt = (e) => e && e.message === 'corrupt_save';
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
      if (!isCorrupt(e)) throw e;                            // newer_version and friends are refused, nothing is touched
      const backup = await readSlot(SLOTS.backup);
      if (typeof backup !== 'string') throw e;
      unpackSave(backup);                                    // a corrupt backup throws its own corrupt_save
      return { text: backup, backend: api.backend, usedBackup: true };
    }
  };

  api.clear = async () => {
    if (api.backend === 'idb') { try { const d = await db(); await inTx(d, 'readwrite', (s) => { s.delete(SLOTS.staging); s.delete(SLOTS.current); return s.delete(SLOTS.backup); }); return; } catch (e) { /* fall through */ } }
    if (api.backend === 'local') for (const slot of Object.values(SLOTS)) local.removeItem(localKey(slot));
  };

  return api;
}
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `save envelope`, `save store` and the existing `save` group PASS, then `ALL PASSED`. If the fake IndexedDB's transaction completes before a request issued inside `onsuccess` has settled (the promote step issues three requests from the `get` callback), extend the fake so `track` also waits for requests created while others are pending (the `pending` loop already drains new entries because it re-reads `pending.length`). The long-run and integration sim tests still pass: the three new fields are inert in the sim.

- [ ] **Step 6: Commit**

```powershell
git add src/sim/world.js src/save/serialize.js src/save/migrate.js src/save/store.js tests/helpers/fakeStorage.js tests/save/store.test.js tests/save/serialize.test.js tests/all.js
git commit -m "Add the save envelope, deeper save validation and the staged save store`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Goals as data, the daily goal check, the month event and the history rows

**Files:**
- Create: `src/data/goals.js`, `src/sim/goals.js`
- Modify: `src/sim/clock.js`
- Test: `tests/sim/goals.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `housesOf`, `population`, `allBuildings`, `HISTORY_MONTHS` (world.js); `runMonth`/`tickDay` (clock.js); test helpers `makeTestWorld`, `setRoad`, `addRaw`, `staffAll`.
- Produces (`data/goals.js`): `GOAL_REWARD = 25`; `GOALS`: ordered plain objects `{ id, text, reward, need, showMe }` where `need` is declarative (`{ kind: 'road' }` = any road beyond the start road; `{ kind: 'houses', n }`; `{ kind: 'building', type, n = 1 }`; `{ kind: 'people', n }`; `{ kind: 'all', of: [...] }`) and `showMe` is `{ category, item, target: 'startRoad' | 'focus' | 'houses' }`. The chain: `road`, `plots` (6), `well`, `food` (farm + granary + bazaar), `temple`, `people100`, then `town` (150 people).
- Produces (`sim/goals.js`): `goalById(id)`, `goalMet(world, need) → boolean` (pure), `openGoals(world, limit = 3) → goal[]` (the first `limit` goals not in `world.goals.completed`, in chain order), `checkGoals(world, events = null) → goal | null` (completes the first open goal whose need is met, pays `reward` into `world.gold`, pushes `{ type: 'goal', id, reward }`; at most one per call).
- Produces (`clock.js`): `tickDay` calls `checkGoals(world, events)` after the day advances (and after a month end, so month-end population counts); `runMonth` pushes `{ type: 'month' }` and appends `{ day, people, gold, mood }` to `world.history`, keeping the newest `HISTORY_MONTHS` rows.

- [ ] **Step 1: Write the failing tests**

`tests/sim/goals.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { goalMet, openGoals, checkGoals, goalById } from '../../src/sim/goals.js';
import { createWorld, HISTORY_MONTHS } from '../../src/sim/world.js';
import { advanceDays, tickDay } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

describe('goals', () => {
  it('lists the opening chain in order and shows three at a time', () => {
    expect(GOALS.map((g) => g.id)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'people100', 'town']);
    for (const g of GOALS) { expect(g.text.length).toBeGreaterThan(0); expect(g.reward).toBe(GOAL_REWARD); expect(typeof g.showMe.category).toBe('string'); }
    const w = createWorld({ seed: 2 });
    expect(openGoals(w).map((g) => g.id)).toEqual(['road', 'plots', 'well']);
    expect(openGoals(w, 1).map((g) => g.id)).toEqual(['road']);
    expect(goalById('temple').need).toEqual({ kind: 'building', type: 'temple', n: 1 });
    expect(goalById('nope')).toBe(null);
  });
  it('completes one goal per check, in order, paying the reward and reporting an event', () => {
    const w = createWorld({ seed: 2 });
    const { x, y } = w.focus;
    const events = [];
    expect(checkGoals(w, events)).toBe(null);
    expect(drawRoad(w, x - 4, y, x + 4, y).ok).toBe(true);
    expect(paintHouses(w, x - 3, y + 1, x + 3, y + 1).ids.length).toBe(7);
    const gold = w.gold;
    expect(checkGoals(w, events).id).toBe('road');          // plots are met too, but one goal per day
    expect(w.gold).toBe(gold + GOAL_REWARD);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: GOAL_REWARD }]);
    expect(checkGoals(w, events).id).toBe('plots');
    expect(checkGoals(w, events)).toBe(null);
    expect(w.goals.completed).toEqual(['road', 'plots']);
    expect(openGoals(w).map((g) => g.id)).toEqual(['well', 'food', 'temple']);
  });
  it('only counts road the player laid, and evaluates the compound and people needs', () => {
    const w = makeTestWorld({ gold: 5000 });
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    setRoad(w, 0, 10, 31, 10);
    expect(goalMet(w, { kind: 'road' })).toBe(true);
    addRaw(w, 'farm_grain', 2, 11); addRaw(w, 'granary', 6, 11);
    expect(goalMet(w, goalById('food').need)).toBe(false);
    addRaw(w, 'bazaar', 9, 11);
    expect(goalMet(w, goalById('food').need)).toBe(true);
    for (let i = 0; i < 20; i++) addRaw(w, 'house', i, 9, { tier: 1, residents: 5 });
    expect(goalMet(w, { kind: 'people', n: 100 })).toBe(true);
    expect(goalMet(w, { kind: 'people', n: 150 })).toBe(false);
    expect(goalMet(w, { kind: 'nope' })).toBe(false);
  });
  it('is checked daily by the clock, which also records a month row and a month event', () => {
    const w = createWorld({ seed: 2 });
    const { x, y } = w.focus;
    drawRoad(w, x - 4, y, x + 4, y);
    const events = [];
    tickDay(w, events);
    expect(w.goals.completed).toEqual(['road']);
    expect(events.some((e) => e.type === 'goal')).toBe(true);
    events.length = 0;
    advanceDays(w, 29, events);
    expect(w.day).toBe(30);
    expect(events.filter((e) => e.type === 'month').length).toBe(1);
    expect(w.history.length).toBe(1);
    expect(w.history[0]).toEqual({ day: 30, people: w.history[0].people, gold: w.history[0].gold, mood: w.history[0].mood });
    expect(Object.keys(w.history[0]).sort()).toEqual(['day', 'gold', 'mood', 'people']);
    advanceDays(w, 30 * (HISTORY_MONTHS + 2));
    expect(w.history.length).toBe(HISTORY_MONTHS);
    expect(w.history[HISTORY_MONTHS - 1].day).toBe(w.day);
  });
  it('keeps the sim deterministic with goals in it', () => {
    const run = () => { const w = createWorld({ seed: 9 }); const { x, y } = w.focus; drawRoad(w, x - 4, y, x + 4, y); paintHouses(w, x - 3, y + 1, x + 3, y + 1); place(w, 'well', x, y - 1); advanceDays(w, 120); return w; };
    expect(run()).toEqual(run());
  });
});
```

Append to `tests/all.js`:
```js
import './sim/goals.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "goals"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the goal data and the goal check**

`src/data/goals.js`:
```js
// Goals (spec 4.1): the opening chain, then the next milestone. Plain data: needs are declarative so
// missions can define goals the same way later; src/sim/goals.js evaluates them.
export const GOAL_REWARD = 25;

export const GOALS = [
  { id: 'road', text: 'Lay a road', reward: GOAL_REWARD, need: { kind: 'road' }, showMe: { category: 'roads', item: 'road', target: 'startRoad' } },
  { id: 'plots', text: 'Place 6 housing plots', reward: GOAL_REWARD, need: { kind: 'houses', n: 6 }, showMe: { category: 'homes', item: 'house', target: 'startRoad' } },
  { id: 'well', text: 'Build a well so huts become shacks', reward: GOAL_REWARD, need: { kind: 'building', type: 'well', n: 1 }, showMe: { category: 'services', item: 'well', target: 'houses' } },
  { id: 'food', text: 'Build a farm, a granary and a bazaar', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_grain', n: 1 }, { kind: 'building', type: 'granary', n: 1 }, { kind: 'building', type: 'bazaar', n: 1 }] }, showMe: { category: 'food', item: 'farm_grain', target: 'focus' } },
  { id: 'temple', text: 'Build a temple', reward: GOAL_REWARD, need: { kind: 'building', type: 'temple', n: 1 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'people100', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'town', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
];
```

`src/sim/goals.js`:
```js
// Goal evaluation: pure checks against the world, one completion per day, the reward paid into the treasury.
import { GOALS } from '../data/goals.js';
import { housesOf, population, allBuildings } from './world.js';

export const goalById = (id) => GOALS.find((g) => g.id === id) || null;

const countOf = (world, type) => allBuildings(world).filter((b) => b.type === type).length;
const roadTiles = (world) => { let n = 0; for (const v of world.road) if (v) n++; return n; };

export function goalMet(world, need) {
  switch (need.kind) {
    case 'road': return roadTiles(world) > world.startRoad.length;
    case 'houses': return housesOf(world).length >= need.n;
    case 'building': return countOf(world, need.type) >= (need.n || 1);
    case 'people': return population(world) >= need.n;
    case 'all': return need.of.every((x) => goalMet(world, x));
    default: return false;
  }
}

export function openGoals(world, limit = 3) {
  const done = new Set(world.goals.completed);
  return GOALS.filter((g) => !done.has(g.id)).slice(0, limit);
}

export function checkGoals(world, events = null) {
  for (const g of openGoals(world)) {
    if (!goalMet(world, g.need)) continue;
    world.goals.completed.push(g.id);
    world.gold += g.reward;
    if (events) events.push({ type: 'goal', id: g.id, reward: g.reward });
    return g;
  }
  return null;
}
```

In `src/sim/clock.js`: import `checkGoals` from `./goals.js`, `population` and `HISTORY_MONTHS` from `./world.js`. At the end of `runMonth` (after `clearUndo(world)`):
```js
  world.history.push({ day: world.day, people: population(world), gold: world.gold, mood: world.mood });
  if (world.history.length > HISTORY_MONTHS) world.history.splice(0, world.history.length - HISTORY_MONTHS);
  if (events) events.push({ type: 'month' });
```
and at the end of `tickDay` (after the `runMonth` line):
```js
  checkGoals(world, events);
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `goals` PASS and the whole suite `ALL PASSED`. Goal rewards add gold to any scripted city that lays road, so an existing sim or save test that asserts an exact treasury can move by a multiple of 25 (`tests/sim/economy.test.js`, `tests/sim/integration.test.js`, `tests/sim/longrun.test.js`): update that expectation to the new value and say which in the report; a test that asserts a bound rather than an exact value should still pass. The determinism test and the round-trip save test must pass unchanged.

- [ ] **Step 5: Commit**

```powershell
git add src/data/goals.js src/sim/goals.js src/sim/clock.js tests/sim/goals.test.js tests/all.js
git commit -m "Add goals as data with a daily check, the month event and the month-end history`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Autosave on month end and on hidden, with the "save failing" banner

**Files:**
- Modify: `src/ui/createUI.js` (`hooks.save`, `onEvents`, visibility listener, `setSaveFailed`), `src/ui/alerts.js` (`CRITICAL` gains `save_failed`), `src/ui/text.js` (`alertText` case, `T` labels), `tests/helpers/uiWorld.js` (`rigUI({ hooks, doc })`, `fakeDoc()`)
- Test: `tests/ui/autosave.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `alertsFor`, `createAlerts`, `openSheet`, the speed control's `watchVisibility` (it already pauses on hidden), `rigUI`.
- Produces (`createUI`): `ui.onEvents(events)` — the loop's event batches go here (main.js calls it next to `effects.fromEvents`); a `{ type: 'month' }` event triggers `autosave('month')`. A `visibilitychange` to hidden on `doc` triggers `autosave('hidden')` (after the speed control paused the game). `ui.autosave(reason) → Promise<void>` calls `hooks.save(reason)` when present; a false result or a throw marks the save as failing. `ui.setSaveFailed(flag)` toggles the `save_failed` critical alert (through `getAlerts`) and refreshes the banner and badge. `viewAlert` opens the menu sheet for `save_failed`.
- Produces (`alerts.js`): `CRITICAL` = `debt`, `save_failed`. Produces (`text.js`): `alertText` for `save_failed` (title "Progress is not being saved", fix "Free up storage, or export the city from the menu").
- Produces (`uiWorld.js`): `fakeDoc()` → `{ hidden, addEventListener, removeEventListener, fireVisibility(), get activeElement }` (the getter forwards to the real document so sheets keep working); `rigUI({ width, height, hooks = {}, doc = fakeDoc() })` passes both to `createUI` and returns `doc` too.

- [ ] **Step 1: Write the failing tests**

Add to `tests/helpers/uiWorld.js` (before `rigUI`) and extend `rigUI`'s options and `createUI` call accordingly (`hooks` and `doc` passed through; `doc` returned):
```js
// A document stand-in for the visibility hook: the real document's hidden flag cannot be set from a test.
export function fakeDoc() {
  const listeners = [];
  return {
    hidden: false,
    addEventListener(type, fn) { if (type === 'visibilitychange') listeners.push(fn); },
    removeEventListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    fireVisibility() { for (const fn of [...listeners]) fn(); },
    get activeElement() { return document.activeElement; },
    get listenerCount() { return listeners.length; },
  };
}
```

`tests/ui/autosave.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';
import { advanceDays } from '../../src/sim/clock.js';
import { setSpeed } from '../../src/sim/commands.js';
import { alertText } from '../../src/ui/text.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ui autosave', () => {
  it('saves at the end of a game month and when the page is hidden, pausing first', async () => {
    const calls = [];
    const r = await rigUI({ hooks: { save: async (reason) => { calls.push(reason); return true; } } });
    const events = [];
    advanceDays(r.world, 30, events);
    r.ui.onEvents(events);
    await flush();
    expect(calls).toEqual(['month']);
    setSpeed(r.world, 2);
    r.doc.hidden = true; r.doc.fireVisibility();
    await flush();
    expect(r.world.speed).toBe(0);
    expect(calls).toEqual(['month', 'hidden']);
    r.doc.hidden = false; r.doc.fireVisibility();
    await flush();
    expect(calls.length).toBe(2);                           // coming back saves nothing
    expect(document.body.classList.contains('has-banner')).toBe(false);
    const before = r.doc.listenerCount;
    r.cleanup();
    expect(r.doc.listenerCount).toBeLessThan(before);
  });
  it('raises the save-failing banner when a save fails, clears it when one succeeds, and View opens the menu', async () => {
    let ok = false;
    const r = await rigUI({ hooks: { save: async () => ok } });
    await r.ui.autosave('month');
    expect(document.body.classList.contains('has-banner')).toBe(true);
    const row = r.root.querySelector('#banner .critical');
    expect(row.textContent).toContain(alertText({ code: 'save_failed' }, r.world).title);
    expect(r.root.querySelector('#corners .badge').hidden).toBe(true);   // critical, so not in the badge
    fire(row.querySelector('.view'), 'click');
    expect(r.store.get().sheet.kind).toBe('menu');
    ok = true;
    await r.ui.autosave('hidden');
    expect(document.body.classList.contains('has-banner')).toBe(false);
    const thrower = await (async () => { r.cleanup(); return rigUI({ hooks: { save: async () => { throw new Error('idb'); } } }); })();
    await thrower.ui.autosave('month');
    expect(document.body.classList.contains('has-banner')).toBe(true);
    thrower.cleanup();
  });
  it('does nothing without a save hook', async () => {
    const r = await rigUI();
    await r.ui.autosave('month');
    r.ui.onEvents([{ type: 'month' }]);
    expect(document.body.classList.contains('has-banner')).toBe(false);
    r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/autosave.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui autosave"`
Expected: FAIL (`r.ui.onEvents is not a function`, `fakeDoc` missing) rather than a load error once the helper exports exist; either way the group is red.

- [ ] **Step 3: Wire autosave and the save-failing alert**

In `src/ui/alerts.js`: `export const CRITICAL = new Set(['debt', 'save_failed']);`.

In `src/ui/text.js`, add to `alertText`'s switch before `default`:
```js
    case 'save_failed': return { title: 'Progress is not being saved', fix: 'Free up storage, or export the city from the menu' };
```

In `src/ui/createUI.js`:
- Declare near the top, after the ghost memo variables: `let saveFailed = false;`
- Change the alerts construction to feed the extra alert: 
  ```js
  const alerts = createAlerts({ world, banner: $('banner'), live: $('live'), onView: viewAlert, root, getAlerts: () => (saveFailed ? [...alertsFor(world), { code: 'save_failed' }] : alertsFor(world)) });
  ```
  (import `alertsFor` from `../sim/alerts.js`).
- In `viewAlert`, before the building branch: `if (alert.code === 'save_failed') { store.set(openSheet(store.get(), 'menu')); return; }`.
- Add, after `refreshChrome`:
  ```js
  // Autosave (spec 4.17): every game month and whenever the page is hidden. A failing save shows the
  // "save failing" banner (spec 6.3) until a save succeeds again.
  function setSaveFailed(flag) {
    if (flag === saveFailed) return;
    saveFailed = flag;
    alerts.refresh();
    corners.render();
  }
  async function autosave(reason) {
    if (typeof hooks.save !== 'function') return;
    let ok = false;
    try { ok = await hooks.save(reason); } catch (e) { ok = false; }
    setSaveFailed(!ok);
  }
  function onEvents(events) {
    for (const e of events) if (e.type === 'month') { autosave('month'); break; }
  }
  const onVisibility = () => { if (doc.hidden) autosave('hidden'); };
  doc.addEventListener('visibilitychange', onVisibility);
  ```
  Register the visibility listener after `speedControl.watchVisibility()` so the game is paused (and `lastSpeed` remembered) before the save is taken.
- Return `onEvents`, `autosave` and `setSaveFailed` from `createUI`; in `destroy()` add `doc.removeEventListener('visibilitychange', onVisibility);`.

In `src/main.js`, pass the events on: `onEvents: (events) => { ui.effects.fromEvents(world, events, performance.now()); ui.onEvents(events); }` (the real `hooks.save` arrives in Task 6 with the two-phase boot; until then the hook is absent and autosave is a no-op).

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui autosave` PASS, every earlier group PASS, then `ALL PASSED`. The `rigUI` change (a fake document) must keep the Task 17 and 18 tests green: the fake forwards `activeElement`, which is all `sheets`/`refreshDaily` read from the document.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/createUI.js src/ui/alerts.js src/ui/text.js src/main.js tests/helpers/uiWorld.js tests/ui/autosave.test.js tests/all.js
git commit -m "Autosave on month end and on hidden, and warn when saving fails`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The goals strip, the goals sheet and Show me

**Files:**
- Create: `src/ui/goalsList.js`
- Modify: `src/ui/createUI.js` (mount the strip, `goals` sheet, Show me, goal toasts, `has-overlay`), `src/ui/sheets.js` (summary lists open goals), `src/ui/text.js`, `css/ui.css`, `index.html` (`#goals` container)
- Test: `tests/ui/goalsList.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `openGoals`, `GOALS` (Task 2); `toolForItem` (data/ui.js); `pickCategory`, `openSheet`, `closeSheet` (modes.js); `placement.start`, `cameraControl.panTo`, `effects.pulse`; `el`, `button`, `clear`, `setText`; `plural`, `T`.
- Produces (`goalsList.js`):
  - `createGoalsStrip({ container, world, onShowMe, onOpen }) → { render() }`: one line under the top bar with the first open goal's text, its reward (`+25`), a **Show me** button and a **Goals** button (`onOpen`); hidden when every goal is done. `render()` re-reads the world (call it from `refreshChrome`).
  - `goalsSheet(world, { onShowMe }) → (body, { close }) => void`: a renderer for the `custom` map: progress line ("3 of 7 done"), up to three open goals each with text, reward and Show me, or "All goals done".
  - `showMeTarget(world, goal) → { x, y }`: `startRoad` → the start road's inner end (its last tile) plus half a tile; `focus` → `world.focus`; `houses` → the mean centre of the homes, or `world.focus` when there are none.
- Produces (`createUI`): `hooks` unchanged; a Show me from either place calls `showMe(goal)`: close the sheet, `pickCategory`, start the goal's tool through `pick(item)`, pan to `showMeTarget` and pulse it `SHOW_ME_PULSES` times (data/ui.js, 2, through `effects.pulse` with `now()` offsets of 400 ms). `onEvents` shows a toast for `{ type: 'goal' }`: "Goal done: Lay a road (+25 gold)". `root.classList` gains `has-overlay` while an overlay is on (the strip sits under the legend).
- Produces (`sheets.js`): the summary's goals section lists the open goals' text (no buttons) or "All goals done".

- [ ] **Step 1: Write the failing tests**

`tests/ui/goalsList.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createGoalsStrip, goalsSheet, showMeTarget } from '../../src/ui/goalsList.js';
import { GOALS } from '../../src/data/goals.js';
import { goalById } from '../../src/sim/goals.js';
import { T } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

describe('ui goals', () => {
  it('shows the first open goal in the strip with Show me, and hides when all are done', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    const shown = [], opened = [];
    const strip = createGoalsStrip({ container: root, world, onShowMe: (g) => shown.push(g.id), onOpen: () => opened.push(1) });
    expect(root.textContent).toContain(GOALS[0].text);
    expect(root.textContent).toContain('+25');
    fire(root.querySelector('.show-me'), 'click');
    expect(shown).toEqual(['road']);
    fire(root.querySelector('.open-goals'), 'click');
    expect(opened).toEqual([1]);
    world.goals.completed.push('road');
    strip.render();
    expect(root.textContent).toContain(GOALS[1].text);
    world.goals.completed = GOALS.map((g) => g.id);
    strip.render();
    expect(root.querySelector('.goal-strip').hidden).toBe(true);
    cleanup();
  });
  it('renders the goals sheet with progress and up to three goals', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    world.goals.completed.push('road');
    const shown = [];
    goalsSheet(world, { onShowMe: (g) => shown.push(g.id) })(root, { close: () => {} });
    expect(root.textContent).toContain('1 of 7 done');
    const rows = root.querySelectorAll('.goal');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain(GOALS[1].text);
    fire(rows[2].querySelector('.show-me'), 'click');
    expect(shown).toEqual(['food']);
    world.goals.completed = GOALS.map((g) => g.id);
    root.innerHTML = '';
    goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
    expect(root.textContent).toContain(T.goalsDone);
    cleanup();
  });
  it('finds the Show me target for each kind', () => {
    const world = makeTestWorld();
    world.startRoad = [[31, 31], [31, 30], [31, 29]];
    expect(showMeTarget(world, goalById('road'))).toEqual({ x: 31.5, y: 29.5 });
    expect(showMeTarget(world, goalById('food'))).toEqual({ x: world.focus.x, y: world.focus.y });
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no homes yet
    addRaw(world, 'house', 10, 10); addRaw(world, 'house', 12, 10);
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: 11.5, y: 10.5 });
  });
  it('wires Show me into the game: the right card starts, the camera moves, and done goals toast', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.ui.settings.set({ reducedMotion: 'off' });
    expect(r.root.querySelector('#goals .goal-strip').hidden).toBe(false);
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const s = r.store.get();
    expect(s.category).toBe('roads');
    expect(s.mode).toBe('drawing');
    expect(s.sheet).toBe(null);
    expect(r.ui.cameraControl.animating).toBe(true);
    r.store.set(openSheet(r.store.get(), 'goals'));
    expect(r.root.querySelectorAll('#sheet .goal').length).toBe(3);
    r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(GOALS[0].text);
    r.store.set(openSheet(r.store.get(), 'summary'));
    expect(r.root.querySelector('#sheet').textContent).toContain(GOALS[0].text);
    r.store.set({ overlay: 'water' });
    expect(document.body.classList.contains('has-overlay')).toBe(true);
    r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/goalsList.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui goals"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the goals strip and sheet**

`src/ui/goalsList.js`:
```js
// The goals list (spec 4.1): the first open goal as a strip under the top bar, up to three in a sheet,
// each with Show me. Goal state lives in the world (src/sim/goals.js); this file only reads it.
import { GOALS } from '../data/goals.js';
import { openGoals } from '../sim/goals.js';
import { housesOf } from '../sim/world.js';
import { el, button, clear } from './components.js';
import { T } from './text.js';

const rewardText = (goal) => `+${goal.reward}`;

export function showMeTarget(world, goal) {
  const kind = goal.showMe.target;
  if (kind === 'startRoad' && world.startRoad.length) {
    const [x, y] = world.startRoad[world.startRoad.length - 1];
    return { x: x + 0.5, y: y + 0.5 };
  }
  if (kind === 'houses') {
    const homes = housesOf(world);
    if (homes.length) {
      const sx = homes.reduce((n, h) => n + h.x + h.w / 2, 0), sy = homes.reduce((n, h) => n + h.y + h.d / 2, 0);
      return { x: sx / homes.length, y: sy / homes.length };
    }
  }
  return { x: world.focus.x, y: world.focus.y };
}

function goalRow(goal, onShowMe) {
  return el('li', { class: 'goal' }, [
    el('span', { class: 'text' }, [goal.text, ' ', el('span', { class: 'reward small muted', text: `${rewardText(goal)} ${T.gold.toLowerCase()}` })]),
    button(T.showMe, { class: 'show-me quiet', onClick: () => onShowMe(goal) }),
  ]);
}

export function createGoalsStrip({ container, world, onShowMe, onOpen }) {
  const strip = el('div', { class: 'goal-strip', hidden: true });
  container.append(strip);
  function render() {
    const [goal] = openGoals(world, 1);
    clear(strip);
    strip.hidden = !goal;
    if (!goal) return;
    strip.append(
      el('span', { class: 'label small muted', text: T.goal }),
      el('span', { class: 'text' }, [goal.text, ' ', el('span', { class: 'reward small muted', text: rewardText(goal) })]),
      button(T.showMe, { class: 'show-me quiet', onClick: () => onShowMe(goal) }),
      button(T.goals, { class: 'open-goals quiet', onClick: onOpen }),
    );
  }
  render();
  return { render };
}

export function goalsSheet(world, { onShowMe }) {
  return (body) => {
    const open = openGoals(world, 3);
    body.append(el('p', { class: 'muted', text: `${world.goals.completed.length} of ${GOALS.length} done` }));
    if (!open.length) { body.append(el('p', { text: T.goalsDone })); return; }
    body.append(el('ul', { class: 'goals' }, open.map((g) => goalRow(g, onShowMe))));
  };
}
```

Add to `src/ui/text.js`'s `T`: `goal: 'Goal', showMe: 'Show me', goalsDone: 'All goals done', goalDone: 'Goal done',` and replace `goalsLater: 'Goals arrive with the next update'` with `goalsNone: 'No goals open',` (the summary no longer needs the placeholder).

- [ ] **Step 4: Wire the strip, the sheet, Show me and the goal toast**

`index.html`: add `<div id="goals" role="region" aria-label="Goals"></div>` right after the `#legend` div.

Append to `css/ui.css`:
```css
/* The goals strip sits under the top bar, below the banner and the legend when they show. */
#goals { position: fixed; left: max(8px, var(--safe-left)); right: max(8px, var(--safe-right)); top: calc(var(--safe-top) + var(--topbar-h) + 6px); display: flex; pointer-events: none; }
#goals > * { pointer-events: auto; }
.goal-strip { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; background: var(--parchment); border-radius: var(--radius); padding: 2px 4px 2px 12px; box-shadow: var(--shadow); }
.goal-strip .text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goal-strip button { min-height: 40px; }
body.has-banner #goals { top: calc(var(--safe-top) + var(--topbar-h) + 62px); }
body.has-overlay #goals { top: calc(var(--safe-top) + var(--topbar-h) + 56px); }
body.has-banner.has-overlay #goals { top: calc(var(--safe-top) + var(--topbar-h) + 112px); }
body[data-layout="wide"] #goals { right: auto; max-width: 440px; }
body[data-layout="compact"] #goals { right: calc(var(--rail-w) + var(--safe-right) + 8px); }
.goals { list-style: none; padding: 0; }
.goals .goal { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
```

In `src/data/ui.js` add `export const SHOW_ME_PULSES = 2;` and `export const SHOW_ME_PULSE_MS = 400;`.

In `src/ui/createUI.js`:
- Import `createGoalsStrip`, `goalsSheet`, `showMeTarget` from `./goalsList.js`, `goalById` from `../sim/goals.js`, `SHOW_ME_PULSES`, `SHOW_ME_PULSE_MS` from `../data/ui.js`.
- Add (after `pick`):
  ```js
  // Show me (spec 4.1): open the right card, then pan to and pulse the place the goal is about.
  function showMe(goal) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));
    store.set(pickCategory(store.get(), goal.showMe.category));
    pick(goal.showMe.item);
    const t = showMeTarget(world, goal);
    cameraControl.panTo(t.x, t.y);
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(t.x, t.y, at + i * SHOW_ME_PULSE_MS);
  }
  ```
  (import `pickCategory` from `./modes.js`).
- Mount the strip after the corners: `const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals') });` and add `goalsStrip.render()` to `refreshChrome()`.
- Build the custom sheets with the goals renderer: `const menus = createMenuSheets({...}); const customSheets = { ...menus, goals: goalsSheet(world, { onShowMe: showMe }) };` and pass `custom: customSheets` to `createSheets`.
- In `onEvents`, add: `for (const e of events) if (e.type === 'goal') { const g = goalById(e.id); if (g) toasts.show(`${T.goalDone}: ${g.text} (+${e.reward} ${T.gold.toLowerCase()})`); }`.
- In the store subscription that sets `root.dataset.mode`, add `root.classList.toggle('has-overlay', Boolean(s.overlay));`.
- Add `goals: 'Goals'` to the sheet-head lookup: `T.goals` already exists, so `T[kind]` resolves.

In `src/ui/sheets.js` `summarySheet()`: import `openGoals` from `../sim/goals.js` and replace the `T.goalsLater` paragraph with:
```js
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui goals` PASS, then `ALL PASSED`. The Task 14 sheets test asserted `T.goalsLater` in the summary; it now asserts the open goal text (`GOALS[0].text`) instead: update that one assertion and say so. The a11y "every control has a name" test must still pass with the strip's two buttons (both have text).

- [ ] **Step 6: Commit**

```powershell
git add index.html css/ui.css src/data/ui.js src/ui/goalsList.js src/ui/createUI.js src/ui/sheets.js src/ui/text.js tests/ui/goalsList.test.js tests/ui/sheets.test.js tests/all.js
git commit -m "Add the goals strip and sheet with Show me`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The Welcome back sheet

**Files:**
- Create: `src/ui/welcomeBack.js`
- Modify: `src/ui/createUI.js` (`welcome` option → the `welcome` sheet opens at boot), `src/ui/text.js`, `tests/helpers/uiWorld.js` (`rigUI({ welcome })`)
- Test: `tests/ui/welcomeBack.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `population` (world.js), `dateParts` (clock.js), `openGoals` (Task 2), `alertText`, `dateText`, `plural`, `T`; the speed control (`set`), `closeSheet`.
- Produces (`welcomeBack.js`): `elapsedText(ms, now = Date.now()) → string` ("just now" under a minute, then "N minutes ago", "N hours ago", "N days ago"; `null`/non-finite → "a while ago"); `trendText(label, current, history, key) → string` (compares `current` with the row three months back, or the oldest row when fewer, or none: "People 120, up from 96" / "down from" / "steady at 96" / just "People 120"); `welcomeSheet({ world, savedAt, lastSpeed, now, getAlerts, onView, onCarryOn, onStayPaused }) → (body, { close }) => void`: the date line, "Last played …", three trend lines, open goals (text), alerts with View (or "All quiet"), then **Carry on** (primary, calls `onCarryOn(lastSpeed)`) and **Stay paused** (`onStayPaused()`).
- Produces (`createUI`): new option `welcome = null`; when `{ savedAt, lastSpeed }` is given, the `welcome` custom sheet is registered and opened after construction; Carry on sets the speed through `speedControl.set(lastSpeed)` and closes the sheet; Stay paused closes it. `T.welcome = 'Welcome back'` names the head.

- [ ] **Step 1: Write the failing tests**

Extend `rigUI` in `tests/helpers/uiWorld.js` with a `welcome = null` option passed straight to `createUI`.

`tests/ui/welcomeBack.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { elapsedText, trendText } from '../../src/ui/welcomeBack.js';
import { T, alertText } from '../../src/ui/text.js';
import { GOALS } from '../../src/data/goals.js';
import { fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

const H = 3600 * 1000;

describe('ui welcome back', () => {
  it('describes how long ago and which way the numbers moved', () => {
    const now = 1760000000000;
    expect(elapsedText(now - 20 * 1000, now)).toBe(T.justNow);
    expect(elapsedText(now - 5 * 60 * 1000, now)).toBe('5 minutes ago');
    expect(elapsedText(now - 1 * H, now)).toBe('1 hour ago');
    expect(elapsedText(now - 50 * H, now)).toBe('2 days ago');
    expect(elapsedText(null, now)).toBe(T.aWhileAgo);
    const history = [{ day: 30, people: 96, gold: 2000, mood: 60 }, { day: 60, people: 100, gold: 1900, mood: 58 }, { day: 90, people: 110, gold: 1800, mood: 55 }, { day: 120, people: 115, gold: 1700, mood: 52 }];
    expect(trendText('People', 120, history, 'people')).toBe('People 120, up from 96');
    expect(trendText('Gold', 1500, history, 'gold')).toBe('Gold 1500, down from 2000');
    expect(trendText('Mood', 60, history.slice(0, 1), 'mood')).toBe('Mood 60, steady at 60');
    expect(trendText('Mood', 60, [], 'mood')).toBe('Mood 60');
  });
  it('opens at boot with the date, trends, goals and alerts, and Carry on restores the speed', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - 2 * H, lastSpeed: 2 } });
    r.world.gold = -5;
    r.ui.alerts.refresh();
    r.ui.refresh();
    const s = r.store.get();
    expect(s.sheet.kind).toBe('welcome');
    const sheet = r.root.querySelector('#sheet');
    expect(sheet.querySelector('h2').textContent).toBe(T.welcome);
    expect(sheet.textContent).toContain('2 hours ago');
    expect(sheet.textContent).toContain('Year 1, month 1, day 1');
    expect(sheet.textContent).toContain(`${T.people} 8`);
    expect(sheet.textContent).toContain(GOALS[0].text);
    expect(sheet.textContent).toContain(alertText({ code: 'debt' }, r.world).title);
    fire(sheet.querySelector('.alert-list .view'), 'click');
    expect(r.store.get().sheet.kind).toBe('summary');
    r.store.set({ sheet: { kind: 'welcome', id: null } });
    fire(r.root.querySelector('#sheet .carry-on'), 'click');
    expect(r.world.speed).toBe(2);
    expect(r.store.get().lastSpeed).toBe(2);
    expect(r.store.get().sheet).toBe(null);
    r.cleanup();
    const stay = await rigUI({ welcome: { savedAt: null, lastSpeed: 3 } });
    expect(stay.root.querySelector('#sheet').textContent).toContain(T.aWhileAgo);
    fire(stay.root.querySelector('#sheet .stay-paused'), 'click');
    expect(stay.world.speed).toBe(0);
    expect(stay.store.get().sheet).toBe(null);
    stay.cleanup();
    const fresh = await rigUI();
    expect(fresh.store.get().sheet).toBe(null);
    fresh.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/welcomeBack.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui welcome back"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the Welcome back sheet and open it at boot**

`src/ui/welcomeBack.js`:
```js
// The Welcome back card (spec 4.17): the date, how long ago, trends, open goals, alerts with View, Carry on.
import { population } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { openGoals } from '../sim/goals.js';
import { el, button } from './components.js';
import { alertText, dateText, plural, T } from './text.js';

const MINUTE = 60 * 1000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

export function elapsedText(savedAt, now = Date.now()) {
  if (!Number.isFinite(savedAt)) return T.aWhileAgo;
  const ms = Math.max(0, now - savedAt);
  if (ms < MINUTE) return T.justNow;
  if (ms < HOUR) return `${plural(Math.floor(ms / MINUTE), 'minute', 'minutes')} ago`;
  if (ms < DAY) return `${plural(Math.floor(ms / HOUR), 'hour', 'hours')} ago`;
  return `${plural(Math.floor(ms / DAY), 'day', 'days')} ago`;
}

// Compares the current value with the row three months back (or the oldest row when there are fewer).
export function trendText(label, current, history, key) {
  if (!history.length) return `${label} ${current}`;
  const then = history[Math.max(0, history.length - 4)][key];
  if (current > then) return `${label} ${current}, ${T.upFrom} ${then}`;
  if (current < then) return `${label} ${current}, ${T.downFrom} ${then}`;
  return `${label} ${current}, ${T.steadyAt} ${then}`;
}

export function welcomeSheet({ world, savedAt, lastSpeed, now = () => Date.now(), getAlerts = () => [], onView = () => {}, onCarryOn = () => {}, onStayPaused = () => {} }) {
  return (body) => {
    body.append(el('p', { text: dateText(dateParts(world)) }), el('p', { class: 'muted', text: `${T.lastPlayed} ${elapsedText(savedAt, now())}` }));
    body.append(el('ul', { class: 'trends' }, [
      el('li', { text: trendText(T.people, population(world), world.history, 'people') }),
      el('li', { text: trendText(T.gold, world.gold, world.history, 'gold') }),
      el('li', { text: trendText(T.mood, world.mood, world.history, 'mood') }),
    ]));
    const goals = openGoals(world, 3);
    body.append(el('h3', { text: T.goals }), goals.length ? el('ul', { class: 'goals' }, goals.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    const alerts = getAlerts();
    body.append(el('h3', { text: T.alerts }));
    if (!alerts.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, alerts.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]); })));
    body.append(el('div', { class: 'actions' }, [
      button(T.carryOn, { class: 'carry-on primary', onClick: () => onCarryOn(lastSpeed) }),
      button(T.stayPaused, { class: 'stay-paused', onClick: () => onStayPaused() }),
    ]));
  };
}
```

Add to `src/ui/text.js`'s `T`: `welcome: 'Welcome back', lastPlayed: 'Last played', justNow: 'just now', aWhileAgo: 'a while ago', upFrom: 'up from', downFrom: 'down from', steadyAt: 'steady at', carryOn: 'Carry on', stayPaused: 'Stay paused',`.

In `src/ui/createUI.js`: add the option `welcome = null` to the signature; import `welcomeSheet`; when building `customSheets`, add:
```js
  if (welcome) {
    customSheets.welcome = welcomeSheet({
      world, savedAt: welcome.savedAt, lastSpeed: welcome.lastSpeed, now: () => Date.now(), getAlerts: () => alerts.list(), onView: viewAlert,
      onCarryOn: (speed) => { store.set(closeSheet(store.get())); speedControl.set(speed); },
      onStayPaused: () => store.set(closeSheet(store.get())),
    });
  }
```
and after `refreshDaily()` at the end of construction: `if (welcome) store.set(openSheet(store.get(), 'welcome'));`. `Date.now` is used only for the elapsed-time line, outside the sim.

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui welcome back` PASS, then `ALL PASSED`. The rig's world has two huts with 4 residents each, hence `People 8`.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/welcomeBack.js src/ui/createUI.js src/ui/text.js tests/helpers/uiWorld.js tests/ui/welcomeBack.test.js tests/all.js
git commit -m "Add the Welcome back sheet with trends, goals, alerts and Carry on`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
