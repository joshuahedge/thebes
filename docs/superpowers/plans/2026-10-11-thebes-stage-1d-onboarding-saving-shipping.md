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
  .nojekyll                        keeps GitHub Pages from processing the files (Task 13)
  tools/assets.js, tools/assets.html   draw the icons and the og image with the art code and POST them to the server
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
  src/save/installFlow.js          detectEnvironment, readEnvironment, createInstallFlow (install button, guide, bring-a-city, notice)
  src/ui/installUi.js              installGuide renderer, noticeText, showNotice
  src/audio/sfx.js                 createSfx (seven synthesised effects, unlock on gesture), vibrate helper
  src/ui/goalsList.js              the goals strip under the top bar, the goals sheet renderer, showMe
  src/ui/welcomeBack.js            the Welcome back sheet renderer, elapsed-time and trend text
  src/ui/titleCard.js              the title overlay and the drifting backdrop
  src/ui/createUI.js               MODIFY: hooks (save, onMonth, onHidden, install), extra sheets, goals strip, sfx, update toast
  src/main.js                      MODIFY: one call into boot.js
  src/boot.js                      two-phase boot (title, then the game), the save/export/import/install hooks, worker registration
  src/pwa.js                       registerServiceWorker, applyUpdate (the update-ready flow)
  src/ui/text.js, css/ui.css       MODIFY: copy and styles for the new sheets, strip, title card, notice
  src/ui/sheets.js, confirmBar.js, rail.js, hud.js, overlayUi.js, modes.js, effects.js, spriteCache.js   MODIFY: 1c carry-overs (Task 12)
  tests/serve.py                   MODIFY: POST /__file (allow-listed), optional bind host
  tests/helpers/fakeStorage.js     fakeIndexedDB() and fakeLocal() for the save store tests
  tests/sim/goals.test.js, tests/save/store.test.js, tests/save/exportImport.test.js, tests/save/installFlow.test.js,
  tests/audio/sfx.test.js, tests/ui/autosave.test.js, tests/ui/goalsList.test.js, tests/ui/welcomeBack.test.js,
  tests/ui/titleCard.test.js, tests/ui/boot.test.js, tests/ui/installUi.test.js, tests/render/assets.test.js,
  tests/ui/pwa.test.js, tests/ui/carryovers.test.js
```

## Conventions every task relies on

- **The save envelope** (`src/save/serialize.js`): `packSave(world, { savedAt, lastSpeed }) → string` and `unpackSave(text) → { savedAt, lastSpeed, world }`. The string is JSON `{ version: 1, savedAt, lastSpeed, world }` where `world` is the plain world object (`serialize`'s shape). `unpackSave` throws the same codes as `deserialize` (`corrupt_save`, `not_a_save`, `newer_version`, `no_migration_<v>`, `bad_migration_<v>`); a bare world (no envelope) is accepted with `savedAt: null, lastSpeed: 1` so old exports still load.
- **The save store** (`src/save/store.js`): `createSaveStore({ idb, local, dbName = 'thebes', key = 'thebes.save' }) → { save(text) → Promise<{ ok, backend, code? }>, load() → Promise<{ text, backend, usedBackup } | null>, clear() → Promise, backend }`. `backend` is `'idb'`, `'local'` or `'none'`. The store never parses the text itself beyond `unpackSave` for validation of the staging write.
- **Sheet kinds** grow by `goals`, `welcome`, `install`; they render through `sheets.js`'s `custom` map like the menu. `store.sheet.kind` is the only thing that changes; `modes.js` already treats non-info sheets alike.
- **Hooks** (`createUI({ hooks })`): `newCity()`, `exportCity()`, `importCity()` (existing names), plus `save(reason) → Promise<boolean>` (called on `month`, `hidden` and before an update reload), `install()` and `canInstall()` (the menu's Install item; Bring a city reuses `importCity()`). `createUI` also accepts `settings`, `clock`, `welcome`, `extraSheets` (merged into `custom`) and `sfx`.
- **Events** from the sim now include `{ type: 'month' }` and `{ type: 'goal', id, reward }`; `createUI` forwards every event batch to `sfx` and to the goals strip through `ui.onEvents(events)` (new), which `main.js` calls from the loop's `onEvents` alongside `effects.fromEvents`.
- **Copy** comes from `src/ui/text.js`; tests use `mount()`/`fire()`/`key()` from `tests/helpers/dom.js` and `rigUI()` from `tests/helpers/uiWorld.js` where a whole interface is needed.
- Tests that need storage use `fakeIndexedDB()` and `fakeLocal()` from `tests/helpers/fakeStorage.js` (Task 1), never the page's real storage, so runs stay isolated.

## How to run tests

- `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` runs everything; `-Grep "save store"` runs one group.
- `python tests/serve.py 8000 .` then `http://localhost:8000/` is the game (`?seed=7`, `?sample=1`, `?stress=1`, `?speed=1`, and new in this plan `?skipTitle=1` (straight into a new city), `?welcome=1` (the Welcome back card) and `?nosw=1` (no offline cache)). `python tests/serve.py 8000 . "" 0.0.0.0` binds every interface for a phone on the LAN (Task 10).

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

Add to `src/ui/text.js`'s `T`: `goal: 'Goal', showMe: 'Show me', goalsDone: 'All goals done', goalDone: 'Goal done',` and replace `goalsLater: 'Goals arrive with the next update'` with `goalsNone: 'No goals open',` (the summary no longer needs the placeholder), and add `goalsHelp: 'Goals show under the top bar. Show me opens the right card and points at the place.',`. In `src/ui/menu.js` `help()` the goals paragraph becomes `el('p', { class: 'muted', text: T.goalsHelp })`; in `tests/ui/menu.test.js` the assertion `expect(r.body.textContent).toContain(T.goalsLater);` becomes `toContain(T.goalsHelp)`.

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
git add index.html css/ui.css src/data/ui.js src/ui/goalsList.js src/ui/createUI.js src/ui/sheets.js src/ui/menu.js src/ui/text.js tests/ui/goalsList.test.js tests/ui/sheets.test.js tests/ui/menu.test.js tests/all.js
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

### Task 6: The title card, the drifting backdrop and the two-phase boot

**Files:**
- Create: `src/ui/titleCard.js`, `src/boot.js`
- Modify: `src/main.js` (one call into `boot`), `src/ui/createUI.js` (`settings` option), `src/data/ui.js` (`TITLE_SEED`, `TITLE_DRIFT_MS`), `src/ui/text.js`, `css/ui.css`, `index.html` (`#title` container)
- Test: `tests/ui/titleCard.test.js`, `tests/ui/boot.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `createSaveStore` (Task 1), `packSave`/`unpackSave` (Task 1), `createUI` with `hooks.save`, `onEvents`, `autosave` (Task 3) and `welcome` (Task 5), `buildSampleCity`, `createCameraControl` (`panTo(x, y, ms)`, `jumpTo`, `cancel`, `tick`, `animating`), `createGameLoop({ world, render, onEvents, raf, caf })`, `createSettings`.
- Produces (`data/ui.js`): `TITLE_SEED = 11`, `TITLE_DRIFT_MS = 9000`.
- Produces (`titleCard.js`):
  - `createTitleCard({ container, hasSave, canInstall = false, sound = false, message = null, onContinue, onNewCity, onSound, onInstall = () => {} }) → { element, destroy() }`: fills `container` (the `#title` div) with the card and unhides it. Buttons in order: `.continue` (only with `hasSave`, primary), `.new-city` (primary when there is no save), `.sound` (text `T.playWithSound` while sound is off, `T.playMuted` while on; a click flips it and calls `onSound(on)`), `.install` (only with `canInstall`). `message` renders as `.message`. The first button takes focus. `destroy()` empties and hides the container.
  - `driftPoints(world) → [[x, y], ...]`: four points around the sample city's centre (`tradeEntry.x`, `size - 22`).
  - `createBackdrop({ world, cam, cameraControl, reducedMotion = () => false, driftMs = TITLE_DRIFT_MS }) → { tick(now), points, stop() }`: jumps the camera to the first point; each `tick` starts the next `panTo(..., driftMs)` once the previous drift's time is up; under reduced motion `tick` does nothing (the view stays still); `stop()` cancels the tween and ignores further ticks.
- Produces (`boot.js`): `loadSave(store) → Promise<{ state: 'none' } | { state: 'ok', savedAt, lastSpeed, world, usedBackup } | { state: 'error', code }>`; `boot(doc, win, { root = doc.body, store = createSaveStore(), params = new URLSearchParams(win.location.search), now = () => performance.now(), clock = () => Date.now(), storage = undefined, uiOptions = {}, loopOptions = {} }) → Promise<api>` where `api = { phase: () => 'title' | 'game', game: () => { world, ui, loop, cam } | null, startGame(world, opts), hooks, destroy() }`. `uiOptions` is spread into `createUI` (tests inject `getSize`, `history`, `keyTarget` and friends exactly as `rigUI` does); `loopOptions` is spread into every `createGameLoop` call (`raf`, `caf`). URL parameters: `seed`, `sample`, `stress`, `speed` as before; `skipTitle=1` skips the title and loads nothing; `welcome=1` starts the sample city as if continued from a save two hours old at speed 2 (screenshots).
- Produces (`createUI`): option `settings = null`; when given it is used instead of a fresh `createSettings` (the title card's sound choice and the game share one settings object).
- Produces (`text.js`): `T.playWithSound = 'Play with sound'`, `T.playMuted = 'Play muted'`, `T.install = 'Install'`, `T.tagline = 'Build a city on the Nile'`, `T.restoredBackup = 'Restored the previous autosave'`, `T.saveNewer = 'This city was saved by a newer version of the game'`, `T.saveUnreadable = "This save can't be read"`.

Rules the boot keeps: a loaded world is handed to `createUI` as is (never assigned into another world); speed is forced to 0 before the game starts (`setSpeed(world, 0)`); `hooks.save` packs `{ savedAt: clock(), lastSpeed: ui.store.get().lastSpeed }`; the first successful save asks for `navigator.storage.persist()` once; when the stored save was refused as `newer_version` the boot blocks every save (`hooks.save` returns false, so the Task 3 banner shows) so the newer save is never overwritten; `usedBackup` becomes a toast after the game starts; a new city (from the title or the menu) autosaves at once (`ui.autosave('new')`) so the previous city becomes the backup rather than silently surviving as "current".

- [ ] **Step 1: Write the failing tests**

`tests/ui/titleCard.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createTitleCard, createBackdrop, driftPoints } from '../../src/ui/titleCard.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createCamera } from '../../src/render/camera.js';
import { createWorld } from '../../src/sim/world.js';
import { T } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui title card', () => {
  it('offers Continue only with a save, flips the sound label, and Install only where allowed', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    const container = root.querySelector('#title');
    const log = [];
    const card = createTitleCard({ container, hasSave: false, canInstall: false, sound: false, onContinue: () => log.push('continue'), onNewCity: () => log.push('new'), onSound: (on) => log.push(`sound:${on}`) });
    expect(container.hidden).toBe(false);
    expect(container.querySelector('.continue')).toBe(null);
    expect(container.querySelector('.install')).toBe(null);
    expect(container.querySelector('.new-city').classList.contains('primary')).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('.new-city'));
    const sound = container.querySelector('.sound');
    expect(sound.textContent).toBe(T.playWithSound);
    fire(sound, 'click');
    expect(sound.textContent).toBe(T.playMuted);
    fire(container.querySelector('.new-city'), 'click');
    expect(log).toEqual(['sound:true', 'new']);
    card.destroy();
    expect(container.hidden).toBe(true);
    expect(container.children.length).toBe(0);
    const withSave = createTitleCard({ container, hasSave: true, canInstall: true, sound: true, message: 'hello', onContinue: () => log.push('continue'), onNewCity: () => {}, onSound: () => {}, onInstall: () => log.push('install') });
    expect(withSave.element.querySelector('h1').textContent).toBe('Thebes');
    expect(container.querySelector('.continue').classList.contains('primary')).toBe(true);
    expect(container.querySelector('.new-city').classList.contains('primary')).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('.continue'));
    expect(container.querySelector('.sound').textContent).toBe(T.playMuted);
    expect(container.querySelector('.message').textContent).toBe('hello');
    fire(container.querySelector('.install'), 'click');
    fire(container.querySelector('.continue'), 'click');
    expect(log).toEqual(['sound:true', 'new', 'install', 'continue']);
    withSave.destroy();
    cleanup();
  });
  it('drifts the camera between points of the city and stays still under reduced motion', () => {
    const world = createWorld({ seed: 3 });
    const cam = createCamera({ x: 0, y: 0, zoom: 1 });
    let reduced = false;
    const cc = createCameraControl({ cam, view: () => ({ width: 800, height: 600 }), reducedMotion: () => reduced, now: () => 0 });
    const points = driftPoints(world);
    expect(points.length).toBe(4);
    for (const [x, y] of points) { expect(x >= 0 && x < world.size).toBe(true); expect(y >= 0 && y < world.size).toBe(true); }
    const b = createBackdrop({ world, cam, cameraControl: cc, reducedMotion: () => reduced, driftMs: 1000 });
    expect(b.points).toEqual(points);
    expect([cam.x, cam.y]).toEqual(points[0]);
    b.tick(0);
    expect(cc.animating).toBe(true);
    cc.tick(1000);
    expect([cam.x, cam.y]).toEqual(points[1]);
    b.tick(500);                                            // too early for the next drift
    expect(cc.animating).toBe(false);
    b.tick(1000);
    cc.tick(2000);
    expect([cam.x, cam.y]).toEqual(points[2]);
    b.stop();
    b.tick(3000);
    expect(cc.animating).toBe(false);
    reduced = true;
    const still = createBackdrop({ world, cam, cameraControl: cc, reducedMotion: () => reduced, driftMs: 1000 });
    still.tick(0); still.tick(5000);
    expect(cc.animating).toBe(false);
    expect([cam.x, cam.y]).toEqual(points[0]);
    still.stop();
  });
});
```

`tests/ui/boot.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { boot, loadSave } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { packSave } from '../../src/save/serialize.js';
import { createWorld } from '../../src/sim/world.js';
import { drawRoad } from '../../src/sim/commands.js';
import { ECONOMY } from '../../src/data/economy.js';
import { T } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const noStorage = { getItem: () => null, setItem: () => {} };

// The real page shell, a fake store and no animation frames: loops never run, so every frame is explicit.
async function bootRig({ params = '', store = createSaveStore({ idb: fakeIndexedDB(), local: null }), clock = () => 1760000000000 } = {}) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(params), now: () => 0, clock, storage: noStorage,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('ui boot', () => {
  it('shows the title without Continue when nothing is saved; New city starts paused and autosaves', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    expect(await loadSave(store)).toEqual({ state: 'none' });
    const r = await bootRig({ store });
    expect(r.api.phase()).toBe('title');
    expect(document.body.classList.contains('on-title')).toBe(true);
    const title = r.root.querySelector('#title');
    expect(title.hidden).toBe(false);
    expect(title.querySelector('.continue')).toBe(null);
    expect(getComputedStyle(r.root.querySelector('#topbar')).display).toBe('none');
    fire(title.querySelector('.new-city'), 'click');
    expect(r.api.phase()).toBe('game');
    expect(document.body.classList.contains('on-title')).toBe(false);
    expect(title.hidden).toBe(true);
    expect(getComputedStyle(r.root.querySelector('#topbar')).display === 'none').toBe(false);
    const g = r.api.game();
    expect(g.world.speed).toBe(0);
    expect(g.world.gold).toBe(ECONOMY.startGold);
    expect(g.ui.store.get().sheet).toBe(null);
    expect(window.__thebes.world).toBe(g.world);
    await flush(); await flush();
    const saved = await loadSave(store);
    expect(saved.state).toBe('ok');
    expect(saved.world.seed).toBe(g.world.seed);
    expect(saved.savedAt).toBe(1760000000000);
    expect(document.body.classList.contains('has-banner')).toBe(false);
    r.cleanup();
  });
  it('offers Continue with a save, opens Welcome back paused, and Carry on restores the saved speed', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const w = createWorld({ seed: 4 });
    drawRoad(w, w.focus.x - 3, w.focus.y, w.focus.x + 3, w.focus.y);
    w.speed = 2;
    await store.save(packSave(w, { savedAt: 1760000000000 - 7200000, lastSpeed: 3 }));
    const r = await bootRig({ store });
    const title = r.root.querySelector('#title');
    expect(title.querySelector('.continue')).toBeTruthy();
    fire(title.querySelector('.continue'), 'click');
    const g = r.api.game();
    expect(g.world.seed).toBe(4);
    expect(g.world.speed).toBe(0);                                             // always reopens paused
    expect(g.world.road).toEqual(w.road);
    expect(g.ui.store.get().sheet.kind).toBe('welcome');
    expect(r.root.querySelector('#sheet').textContent).toContain('2 hours ago');
    fire(r.root.querySelector('#sheet .carry-on'), 'click');
    expect(g.world.speed).toBe(3);
    expect(g.ui.store.get().sheet).toBe(null);
    r.cleanup();
  });
  it('restores the backup with a toast, refuses a newer save without touching it, reports unreadable saves, and ?skipTitle=1 goes straight in', async () => {
    const idb = fakeIndexedDB();
    const store = createSaveStore({ idb, local: null });
    await store.save(packSave(createWorld({ seed: 5 })));
    await store.save(packSave(createWorld({ seed: 6 })));
    idb.records.set('current', '{broken');
    let r = await bootRig({ store });
    fire(r.root.querySelector('#title .continue'), 'click');
    expect(r.api.game().world.seed).toBe(5);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(T.restoredBackup);
    r.cleanup();
    const newer = JSON.stringify({ version: 99, world: {} });
    idb.records.set('current', newer);
    r = await bootRig({ store });
    let title = r.root.querySelector('#title');
    expect(title.querySelector('.continue')).toBe(null);
    expect(title.querySelector('.message').textContent).toBe(T.saveNewer);
    fire(title.querySelector('.new-city'), 'click');
    await r.api.game().ui.autosave('month');
    expect(idb.records.get('current')).toBe(newer);                            // nothing overwritten
    expect(document.body.classList.contains('has-banner')).toBe(true);        // and the game says saving is off
    r.cleanup();
    idb.records.set('current', '{broken'); idb.records.delete('backup');
    r = await bootRig({ store });
    title = r.root.querySelector('#title');
    expect(title.querySelector('.continue')).toBe(null);
    expect(title.querySelector('.message').textContent).toBe(T.saveUnreadable);
    r.cleanup();
    r = await bootRig({ params: 'skipTitle=1&seed=8' });
    expect(r.api.phase()).toBe('game');
    expect(document.body.classList.contains('on-title')).toBe(false);
    expect(r.api.game().world.seed).toBe(8);
    expect(r.api.game().ui.store.get().sheet).toBe(null);
    r.cleanup();
    r = await bootRig({ params: 'welcome=1&seed=8' });
    expect(r.api.game().ui.store.get().sheet.kind).toBe('welcome');
    r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/titleCard.test.js';
import './ui/boot.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui title"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/ui/titleCard.js` and `src/boot.js` do not exist).

- [ ] **Step 3: Write the title card and the backdrop**

In `src/data/ui.js` add:
```js
export const TITLE_SEED = 11;          // the sample city behind the title card
export const TITLE_DRIFT_MS = 9000;    // one slow camera drift between two points of it
```

`src/ui/titleCard.js`:
```js
// The title card (spec 4.1): Continue, New city, Play with sound / Play muted and Install over a paused,
// slowly drifting sample city. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS } from '../data/ui.js';
import { el, button, clear } from './components.js';
import { T } from './text.js';

export function createTitleCard({ container, hasSave, canInstall = false, sound = false, message = null, onContinue, onNewCity, onSound, onInstall = () => {} }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
  soundButton.addEventListener('click', () => { on = !on; soundButton.textContent = on ? T.playMuted : T.playWithSound; onSound(on); });
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity }));
  buttons.push(soundButton);
  if (canInstall) buttons.push(button(T.install, { class: 'install', onClick: onInstall }));
  const element = el('div', { class: 'title-card', role: 'dialog', 'aria-labelledby': 'title-name' }, [
    el('h1', { id: 'title-name', text: 'Thebes' }),
    el('p', { class: 'tagline muted', text: T.tagline }),
    message ? el('p', { class: 'message coral', text: message }) : null,
    el('div', { class: 'title-buttons' }, buttons),
  ]);
  clear(container);
  container.append(element);
  container.hidden = false;
  buttons[0].focus();
  return { element, destroy() { clear(container); container.hidden = true; } };
}

// Four points around the sample city's centre; the camera drifts from one to the next.
export function driftPoints(world) {
  const cx = world.tradeEntry.x, cy = world.size - 22;
  const clamp = (v) => Math.max(0, Math.min(world.size - 1, v));
  return [[cx - 4, cy - 3], [cx + 4, cy], [cx, cy + 4], [cx - 3, cy + 1]].map(([x, y]) => [clamp(x), clamp(y)]);
}

export function createBackdrop({ world, cam, cameraControl, reducedMotion = () => false, driftMs = TITLE_DRIFT_MS }) {
  const points = driftPoints(world);
  let i = 0, nextAt = null, stopped = false;
  cameraControl.jumpTo(points[0][0], points[0][1]);
  return {
    points,
    tick(now) {
      if (stopped || reducedMotion()) return;          // reduced motion: the view stays still (spec 5.4)
      if (nextAt !== null && now < nextAt) return;
      i = (i + 1) % points.length;
      cameraControl.panTo(points[i][0], points[i][1], driftMs);
      nextAt = now + driftMs;
    },
    stop() { stopped = true; cameraControl.cancel(); },
  };
}
```

Add to `src/ui/text.js`'s `T`: `playWithSound: 'Play with sound', playMuted: 'Play muted', install: 'Install', tagline: 'Build a city on the Nile', restoredBackup: 'Restored the previous autosave', saveNewer: 'This city was saved by a newer version of the game', saveUnreadable: "This save can't be read",`.

`index.html`: add `<div id="title" hidden></div>` as the last child of `#ui` (after `#map-summary`).

Append to `css/ui.css`:
```css
/* The title card (spec 4.1) over the drifting sample city. While it shows, the game chrome stays hidden. */
#title { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(43, 31, 14, 0.25); }
.title-card { background: var(--parchment); border-radius: 16px; box-shadow: var(--shadow); padding: 24px; width: min(360px, 100%); display: flex; flex-direction: column; gap: 8px; text-align: center; box-sizing: border-box; }
.title-card h1 { margin: 0; font-size: calc(32px * var(--ui-scale)); letter-spacing: 0.08em; }
.title-card .tagline { margin: 0 0 8px; }
.title-card .message { margin: 0 0 8px; }
.title-buttons { display: flex; flex-direction: column; gap: 8px; }
body.on-title #ui > :not(#title) { display: none !important; }
```

In `src/ui/createUI.js`: add `settings: givenSettings = null, clock = () => Date.now()` to the options; replace `const settings = createSettings({ storage, root });` with `const settings = givenSettings || createSettings({ storage, root });`; in the Task 5 welcome block pass `now: clock` instead of `now: () => Date.now()`. Nothing else changes.

- [ ] **Step 4: Write the boot and point main.js at it**

`src/boot.js`:
```js
// Boot in two phases (spec 4.1, 4.17): the title card over a drifting sample city, then the game. Saves go
// through the save store; a loaded world is used as it is (never assigned into a live world) and the game
// always reopens paused. ?skipTitle=1 boots straight into a new city; ?welcome=1 shows the Welcome back card.
import { createWorld } from './sim/world.js';
import { setSpeed } from './sim/commands.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { buildSampleCity, buildStressCity } from './dev/sampleCity.js';
import { createUI } from './ui/createUI.js';
import { createSettings } from './ui/settings.js';
import { createCameraControl } from './ui/cameraControl.js';
import { createTitleCard, createBackdrop } from './ui/titleCard.js';
import { createSaveStore } from './save/store.js';
import { packSave, unpackSave } from './save/serialize.js';
import { TITLE_SEED } from './data/ui.js';
import { T } from './ui/text.js';

const HOUR = 3600 * 1000;

// What the slot holds, as the title card needs it. Load errors are reported, never repaired here.
export async function loadSave(store) {
  let loaded;
  try { loaded = await store.load(); } catch (e) { return { state: 'error', code: (e && e.message) || 'corrupt_save' }; }
  if (!loaded) return { state: 'none' };
  try { return { state: 'ok', ...unpackSave(loaded.text), usedBackup: Boolean(loaded.usedBackup) }; }
  catch (e) { return { state: 'error', code: (e && e.message) || 'corrupt_save' }; }
}
```

Continue `src/boot.js` (same file):
```js
export async function boot(doc, win, {
  root = doc.body, store = createSaveStore(), params = new URLSearchParams(win.location.search),
  now = () => performance.now(), clock = () => Date.now(), storage = undefined, uiOptions = {}, loopOptions = {},
} = {}) {
  const canvas = root.querySelector('#map');
  const renderer = createRenderer({ canvas });
  const settings = createSettings({ storage, root });
  const view = uiOptions.getSize || (() => ({ width: canvas.clientWidth || win.innerWidth, height: canvas.clientHeight || win.innerHeight }));
  const stress = params.get('stress') === '1', sample = params.get('sample') === '1';
  const seedOf = () => Number(params.get('seed')) || Math.floor(Math.random() * 1e9);

  function freshWorld() {
    const world = createWorld({ seed: seedOf() });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
    return world;
  }

  let current = null;        // { world, ui, loop, cam } while the game runs
  let title = null;          // { card, loop, backdrop } while the title shows
  let saveBlocked = false;   // a newer version's save sits in the slot: never overwrite it (spec 7.5)
  let persisted = false;

  const hooks = {
    async save() {
      if (!current || saveBlocked) return false;
      const text = packSave(current.world, { savedAt: clock(), lastSpeed: current.ui.store.get().lastSpeed });
      const r = await store.save(text);
      if (r.ok && !persisted) {                         // spec 4.17: ask to keep the data once a city exists
        persisted = true;
        try { const s = win.navigator && win.navigator.storage; if (s && s.persist) s.persist().catch(() => {}); } catch (e) { /* not offered */ }
      }
      return r.ok;
    },
    newCity() { startGame(freshWorld()); },
  };

  function stopGame() { if (!current) return; current.loop.stop(); current.ui.destroy(); current = null; }

  function startGame(world, { fromSave = false, savedAt = null, lastSpeed = 1, notice = null } = {}) {
    leaveTitle();
    stopGame();
    if (fromSave) setSpeed(world, 0);                   // the game always reopens paused (spec 4.17)
    const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
    const ui = createUI({ world, canvas, cam, renderer, root, doc, win, settings, hooks, now, clock, welcome: fromSave ? { savedAt, lastSpeed } : null, ...uiOptions });
    const loop = createGameLoop({ world, onEvents: (events) => { ui.effects.fromEvents(world, events, now()); ui.onEvents(events); }, render: ui.render, ...loopOptions });
    current = { world, ui, loop, cam };
    if (notice) ui.toasts.show(notice);
    if (!fromSave) ui.autosave('new');                  // the previous city becomes the backup at once
    loop.start();
    win.__thebes = { world, cam, renderer, loop, ui };
    return current;
  }

  function showTitle(loaded) {
    const world = buildSampleCity(createWorld({ seed: TITLE_SEED }));
    const cam = createCamera({ x: world.tradeEntry.x, y: world.size - 22, zoom: 1 });
    const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
    const backdrop = createBackdrop({ world, cam, cameraControl, reducedMotion: settings.reducedMotion });
    const loop = createGameLoop({ world, render: ({ now: t }) => { backdrop.tick(t); cameraControl.tick(t); renderer.renderFrame(world, cam, { view: view() }); }, ...loopOptions });
    let message = null;
    if (loaded.state === 'error') {
      saveBlocked = loaded.code === 'newer_version';
      message = saveBlocked ? T.saveNewer : T.saveUnreadable;
      console.warn('Thebes: the saved city was not loaded:', loaded.code);
    }
    root.classList.add('on-title');
    const card = createTitleCard({
      container: root.querySelector('#title'), hasSave: loaded.state === 'ok', canInstall: false, sound: settings.get().sound, message,
      onContinue: () => startGame(loaded.world, { fromSave: true, savedAt: loaded.savedAt, lastSpeed: loaded.lastSpeed, notice: loaded.usedBackup ? T.restoredBackup : null }),
      onNewCity: () => startGame(freshWorld()),
      onSound: (on) => settings.set({ sound: on }),
    });
    title = { card, loop, backdrop };
    loop.start();
  }

  function leaveTitle() {
    if (!title) return;
    title.loop.stop(); title.backdrop.stop(); title.card.destroy();
    root.classList.remove('on-title');
    title = null;
  }

  if (params.get('skipTitle') === '1') startGame(freshWorld());
  else if (params.get('welcome') === '1') {
    const world = freshWorld();
    if (!sample && !stress) buildSampleCity(world);
    startGame(world, { fromSave: true, savedAt: clock() - 2 * HOUR, lastSpeed: 2 });
  } else showTitle(await loadSave(store));

  return {
    phase: () => (title ? 'title' : 'game'),
    game: () => current,
    startGame, hooks,
    destroy() { leaveTitle(); stopGame(); },
  };
}
```

`src/main.js` (replace the whole file):
```js
// Boot (spec 4.1): the title card, then the game. Everything lives in src/boot.js so tests can boot the
// page shell with a fake store and without animation frames.
import { boot } from './boot.js';

boot(document, window);
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui title card` and `ui boot` PASS, then `ALL PASSED`. Then start `python tests/serve.py 8000 .` and open `http://localhost:8000/`: the title card shows over the drifting city with New city, Play with sound; New city starts a paused fresh city; reload shows Continue, and Continue opens the Welcome back card. `http://localhost:8000/?skipTitle=1&seed=1&sample=1` goes straight in (the screenshot URLs from 1c now need `skipTitle=1`).

- [ ] **Step 6: Commit**

```powershell
git add index.html css/ui.css src/boot.js src/main.js src/data/ui.js src/ui/titleCard.js src/ui/createUI.js src/ui/text.js tests/ui/titleCard.test.js tests/ui/boot.test.js tests/all.js
git commit -m "Add the title card over a drifting sample city and the two-phase boot`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Export and import

**Files:**
- Create: `src/save/exportImport.js`
- Modify: `src/boot.js` (`exportCity`/`importCity` hooks, `platform` option, `saveNow`), `src/ui/menu.js` (`createDialog` extra action; New city offers Export first), `src/ui/text.js`
- Test: `tests/save/exportImport.test.js`; modify `tests/ui/menu.test.js`, `tests/ui/boot.test.js`, `tests/all.js`

**Interfaces:**
- Consumes: `packSave`/`unpackSave` (Task 1), `boot`'s `startGame`, `hooks`, `current` (Task 6), `ui.autosave(reason)` (Task 3), `store.confirmDialog` and `createDialog` (menu.js).
- Produces (`exportImport.js`):
  - `exportFileName(date = new Date()) → 'thebes-city-YYYY-MM-DD.json'` (UTC date).
  - `exportSave(text, { share = null, canShare = null, download, date = new Date() }) → Promise<'shared' | 'downloaded' | 'cancelled'>`: builds a `File` of the text; when `share` and `canShare` are given and `canShare({ files: [file] })` is true it calls `share({ files: [file], title: 'Thebes city' })` (`'shared'`; an `AbortError` from the share sheet is `'cancelled'` and downloads nothing; any other failure falls back to a download); otherwise `download(file)` (`'downloaded'`).
  - `downloadFile(file, doc = document, urls = URL)`: an `<a download>` with an object URL, appended, clicked, removed; the URL is revoked a second later.
  - `pickFile(doc = document) → Promise<File | null>`: a hidden `<input type="file" accept="application/json,.json">` appended to `doc.body` and clicked; resolves with the first chosen file on `change`, `null` on `cancel`; the input is removed either way.
  - `readFileText(file) → Promise<string>` (`file.text()` when present, else a `FileReader`); `importSaveFile(file) → Promise<{ savedAt, lastSpeed, world }>` (throws `read_failed` when the file cannot be read, else the `unpackSave` codes).
- Produces (`text.js`): `importErrorText(code)` → `T.saveNewer` for `newer_version`, `T.fileUnreadable` for `read_failed`, else `T.saveUnreadable`; `T.exported = 'City file downloaded'`, `T.exportFailed = "Couldn't export the city"`, `T.exportFirst = 'Export first'`, `T.replaceCityConfirm = 'Replace the current city with the imported one?'`, `T.fileUnreadable = "Couldn't read that file"`.
- Produces (`menu.js`): `store.confirmDialog` may carry `extraLabel` and `onExtra`; `createDialog` then renders a third button `.extra` between Cancel and OK that closes the dialog and calls `onExtra()`. The menu's New city dialog sets `extraLabel: T.exportFirst, onExtra: hooks.exportCity` whenever `hooks.exportCity` is a function.
- Produces (`boot.js`): option `platform = {}` overriding `io = { share, canShare, download, pick }` (defaults: `navigator.share`/`navigator.canShare` bound to the navigator or `null` when absent, `downloadFile(file, doc)`, `pickFile(doc)`); `startGame(world, { ..., saveNow = !fromSave })` autosaves with reason `'import'` or `'new'` when `saveNow`; `hooks.exportCity()` runs `ui.autosave('export')`, packs the world and calls `exportSave` (toast `T.exported` after a download, `T.exportFailed` on a throw); `hooks.importCity()` picks a file, `importSaveFile`s it (a failure toasts `importErrorText(code)`), then with a city open asks `T.replaceCityConfirm` (confirm label `T.importCity`) and on confirm `startGame(world, { fromSave: true, savedAt, lastSpeed, saveNow: true })`; with no city open (the title phase, Task 9) it starts at once.

- [ ] **Step 1: Write the failing tests**

`tests/save/exportImport.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { exportFileName, exportSave, downloadFile, pickFile, importSaveFile } from '../../src/save/exportImport.js';
import { packSave } from '../../src/save/serialize.js';
import { createWorld } from '../../src/sim/world.js';
import { T, importErrorText } from '../../src/ui/text.js';
import { mount } from '../helpers/dom.js';

const code = async (p) => { try { await p; } catch (e) { return e.message; } return null; };
const date = new Date(Date.UTC(2026, 9, 11, 12));

describe('save export and import', () => {
  it('names the file by date, shares it where files can be shared, else downloads it', async () => {
    expect(exportFileName(date)).toBe('thebes-city-2026-10-11.json');
    const text = packSave(createWorld({ seed: 2 }));
    const shared = [], downloaded = [];
    const download = (f) => downloaded.push(f);
    expect(await exportSave(text, { share: async (d) => { shared.push(d); }, canShare: () => true, download, date })).toBe('shared');
    expect(shared[0].files[0].name).toBe('thebes-city-2026-10-11.json');
    expect(await shared[0].files[0].text()).toBe(text);
    expect(downloaded.length).toBe(0);
    expect(await exportSave(text, { share: async () => {}, canShare: () => false, download, date })).toBe('downloaded');
    expect(downloaded[0].name).toBe('thebes-city-2026-10-11.json');
    expect(downloaded[0].type).toBe('application/json');
    expect(await exportSave(text, { download, date })).toBe('downloaded');
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    expect(await exportSave(text, { share: async () => { throw abort; }, canShare: () => true, download, date })).toBe('cancelled');
    expect(await exportSave(text, { share: async () => { throw new Error('nope'); }, canShare: () => true, download, date })).toBe('downloaded');
    expect(await exportSave(text, { share: async () => {}, canShare: () => { throw new Error('odd'); }, download, date })).toBe('downloaded');
    expect(downloaded.length).toBe(4);
  });
  it('downloads through a temporary link and picks a file through a hidden input', async () => {
    const { root, cleanup } = mount();
    const clicked = [];
    const doc = { createElement: (tag) => { const n = document.createElement(tag); n.click = () => clicked.push(n); return n; }, body: root };
    const urls = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
    downloadFile(new File(['{}'], 'x.json', { type: 'application/json' }), doc, urls);
    expect(clicked.length).toBe(1);
    expect(clicked[0].tagName).toBe('A');
    expect(clicked[0].download).toBe('x.json');
    expect(clicked[0].getAttribute('href')).toBe('blob:test');
    expect(root.querySelector('a')).toBe(null);                              // removed after the click
    const cancelled = pickFile(doc);
    const input = clicked[1];
    expect(input.type).toBe('file');
    expect(input.accept).toBe('application/json,.json');
    expect(root.contains(input)).toBe(true);
    input.dispatchEvent(new Event('cancel'));
    expect(await cancelled).toBe(null);
    expect(root.contains(input)).toBe(false);
    const picked = pickFile(doc);
    const input2 = clicked[2];
    const dt = new DataTransfer();
    dt.items.add(new File(['{}'], 'c.json', { type: 'application/json' }));
    input2.files = dt.files;
    input2.dispatchEvent(new Event('change'));
    expect((await picked).name).toBe('c.json');
    expect(root.contains(input2)).toBe(false);
    cleanup();
  });
  it('reads a file back into an envelope and reports the save codes', async () => {
    const w = createWorld({ seed: 3 });
    const text = packSave(w, { savedAt: 5, lastSpeed: 2 });
    const back = await importSaveFile(new File([text], 'city.json', { type: 'application/json' }));
    expect(back.world).toEqual(w);
    expect(back.savedAt).toBe(5);
    expect(back.lastSpeed).toBe(2);
    expect((await importSaveFile(new File([JSON.stringify(w)], 'bare.json'))).lastSpeed).toBe(1);
    expect(await code(importSaveFile(new File(['{nope'], 'x.json')))).toBe('corrupt_save');
    expect(await code(importSaveFile(new File([JSON.stringify({ version: 9, world: {} })], 'x.json')))).toBe('newer_version');
    expect(await code(importSaveFile({ text: () => Promise.reject(new Error('io')) }))).toBe('read_failed');
    expect(importErrorText('newer_version')).toBe(T.saveNewer);
    expect(importErrorText('read_failed')).toBe(T.fileUnreadable);
    expect(importErrorText('corrupt_save')).toBe(T.saveUnreadable);
    expect(importErrorText('not_a_save')).toBe(T.saveUnreadable);
  });
});
```

In `tests/ui/menu.test.js`, add to the `ui menu` group:
```js
  it('new city offers Export first when a hook can export, and the dialog runs the extra action', () => {
    const plain = rig();
    plain.menus.menu(plain.body, { close: plain.close });
    fire(buttonNamed(plain.body, T.newCity), 'click');
    expect(plain.dialogNode.querySelector('.extra')).toBe(null);
    plain.cleanup();
    const r = rig({ exportCity: () => r.log.push('export') });
    r.menus.menu(r.body, { close: r.close });
    fire(buttonNamed(r.body, T.newCity), 'click');
    const extra = r.dialogNode.querySelector('.extra');
    expect(extra.textContent).toBe(T.exportFirst);
    expect([...r.dialogNode.querySelectorAll('button')].map((b) => b.className.split(' ')[0])).toEqual(['cancel', 'extra', 'ok']);
    fire(extra, 'click');
    expect(r.log).toEqual(['export']);
    expect(r.store.get().confirmDialog).toBe(null);
    expect(r.dialogNode.hidden).toBe(true);
    r.cleanup();
  });
```

In `tests/ui/boot.test.js`: import `openSheet` from `../../src/ui/modes.js`; give `bootRig` a `platform = {}` option passed straight to `boot`; add to the `ui boot` group:
```js
  it('exports after saving, imports a file after confirming, and offers Export first before a new city', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const shared = [], downloaded = [];
    let nextFile = null, canShare = true;
    const platform = { share: async (d) => { shared.push(d); }, canShare: () => canShare, download: (f) => downloaded.push(f), pick: async () => nextFile };
    const r = await bootRig({ store, params: 'skipTitle=1&seed=8', platform });
    const g = r.api.game();
    const menuButton = (text) => [...r.root.querySelectorAll('#sheet button')].find((b) => b.textContent.trim() === text);
    g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
    fire(menuButton(T.exportCity), 'click');
    await flush(); await flush();
    expect(shared.length).toBe(1);
    expect(shared[0].files[0].name.startsWith('thebes-city-')).toBe(true);
    expect((await loadSave(store)).world.seed).toBe(8);                        // saved before sharing
    canShare = false;
    fire(menuButton(T.exportCity), 'click');
    await flush(); await flush();
    expect(downloaded.length).toBe(1);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(T.exported);
    const w = createWorld({ seed: 9 });
    nextFile = new File([packSave(w, { savedAt: 1, lastSpeed: 2 })], 'c.json', { type: 'application/json' });
    fire(menuButton(T.importCity), 'click');
    await flush(); await flush();
    expect(g.ui.store.get().confirmDialog.text).toBe(T.replaceCityConfirm);
    fire(r.root.querySelector('#dialog .ok'), 'click');
    const g2 = r.api.game();
    expect(g2 === g).toBe(false);                                              // a fresh game around the imported world
    expect(g2.world.seed).toBe(9);
    expect(g2.world.speed).toBe(0);
    expect(g2.ui.store.get().sheet.kind).toBe('welcome');
    await flush(); await flush();
    expect((await loadSave(store)).world.seed).toBe(9);                        // an imported city is saved at once
    nextFile = new File(['{nope'], 'x.json');
    g2.ui.store.set(openSheet(g2.ui.store.get(), 'menu'));
    fire(menuButton(T.importCity), 'click');
    await flush(); await flush();
    expect(r.api.game()).toBe(g2);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(T.saveUnreadable);
    fire(menuButton(T.newCity), 'click');
    const extra = r.root.querySelector('#dialog .extra');
    expect(extra.textContent).toBe(T.exportFirst);
    fire(extra, 'click');
    await flush(); await flush();
    expect(downloaded.length).toBe(2);
    expect(g2.ui.store.get().confirmDialog).toBe(null);
    expect(r.api.game()).toBe(g2);                                             // export first does not start the new city
    r.cleanup();
  });
```

Append to `tests/all.js`:
```js
import './save/exportImport.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "export"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/save/exportImport.js` does not exist).

- [ ] **Step 3: Write export and import**

`src/save/exportImport.js`:
```js
// Export and import (spec 4.17): export shares the save as a .json file where the share sheet takes files,
// else downloads it; import reads a chosen file back into an envelope. Nothing here touches the live world.
import { unpackSave } from './serialize.js';

export const exportFileName = (date = new Date()) => `thebes-city-${date.toISOString().slice(0, 10)}.json`;

export async function exportSave(text, { share = null, canShare = null, download, date = new Date() } = {}) {
  const file = new File([text], exportFileName(date), { type: 'application/json' });
  if (share && canShare) {
    let ok = false;
    try { ok = Boolean(canShare({ files: [file] })); } catch (e) { ok = false; }
    if (ok) {
      try { await share({ files: [file], title: 'Thebes city' }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }   // dismissed: nothing more to do
    }
  }
  download(file);
  return 'downloaded';
}

export function downloadFile(file, doc = document, urls = URL) {
  const url = urls.createObjectURL(file);
  const a = doc.createElement('a');
  a.href = url; a.download = file.name; a.rel = 'noopener'; a.hidden = true;
  doc.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => urls.revokeObjectURL(url), 1000);
}

export function pickFile(doc = document) {
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json'; input.hidden = true;
    const done = (file) => { input.remove(); resolve(file); };
    input.addEventListener('change', () => done((input.files && input.files[0]) || null));
    input.addEventListener('cancel', () => done(null));
    doc.body.append(input);
    input.click();
  });
}

export function readFileText(file) {
  if (file && typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsText(file);
  });
}

export async function importSaveFile(file) {
  let text;
  try { text = await readFileText(file); } catch (e) { throw new Error('read_failed'); }
  return unpackSave(text);
}
```

In `src/ui/text.js`: add to `T`: `exported: 'City file downloaded', exportFailed: "Couldn't export the city", exportFirst: 'Export first', replaceCityConfirm: 'Replace the current city with the imported one?', fileUnreadable: "Couldn't read that file",` and export:
```js
export const importErrorText = (code) => (code === 'newer_version' ? T.saveNewer : code === 'read_failed' ? T.fileUnreadable : T.saveUnreadable);
```

- [ ] **Step 4: Wire the dialog's extra action and the boot hooks**

In `src/ui/menu.js`:
- The New city button becomes:
  ```js
  button(T.newCity, { onClick: () => store.set({ confirmDialog: {
    text: T.newCityConfirm, confirmLabel: T.newCity, onConfirm: onNewCity,
    extraLabel: typeof hooks.exportCity === 'function' ? T.exportFirst : null, onExtra: hookOr('exportCity'),
  } }) }),
  ```
- In `createDialog`'s `render`, after `cancel` is built:
  ```js
    const extra = d.extraLabel ? button(d.extraLabel, { class: 'extra', onClick: () => { store.set({ confirmDialog: null }); if (typeof d.onExtra === 'function') d.onExtra(); } }) : null;
  ```
  and the buttons row becomes `el('div', { class: 'buttons' }, [cancel, extra, ok])` (`el` skips a `null` child). Update the comment above `createDialog`: `store.confirmDialog = { text, confirmLabel, onConfirm, extraLabel?, onExtra? }`.

In `src/boot.js`:
- Import `exportSave, downloadFile, pickFile, importSaveFile` from `./save/exportImport.js` and `importErrorText` with `T` from `./ui/text.js`.
- Add `platform = {}` to `boot`'s options and, after `settings`:
  ```js
  // The share sheet, the download and the file picker, replaceable by tests.
  const nav = win.navigator || {};
  const io = {
    share: typeof nav.share === 'function' ? (d) => nav.share(d) : null,
    canShare: typeof nav.canShare === 'function' ? (d) => nav.canShare(d) : null,
    download: (file) => downloadFile(file, doc),
    pick: () => pickFile(doc),
    ...platform,
  };
  ```
- `startGame`'s options gain `saveNow = !fromSave`; replace `if (!fromSave) ui.autosave('new');` with `if (saveNow) ui.autosave(fromSave ? 'import' : 'new');`.
- Add to `hooks`:
  ```js
    async exportCity() {
      if (!current) return;
      const { ui, world } = current;
      await ui.autosave('export');                      // the slot is current before the file leaves
      const text = packSave(world, { savedAt: clock(), lastSpeed: ui.store.get().lastSpeed });
      try {
        const r = await exportSave(text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
        if (r === 'downloaded') ui.toasts.show(T.exported);
      } catch (e) { ui.toasts.show(T.exportFailed); }
    },
    async importCity() {
      const file = await io.pick();
      if (!file) return;
      let save;
      try { save = await importSaveFile(file); } catch (e) { if (current) current.ui.toasts.show(importErrorText(e && e.message)); return; }
      const go = () => startGame(save.world, { fromSave: true, savedAt: save.savedAt, lastSpeed: save.lastSpeed, saveNow: true });
      if (current) current.ui.store.set({ confirmDialog: { text: T.replaceCityConfirm, confirmLabel: T.importCity, onConfirm: go } });
      else go();                                        // the title phase has no city to replace (Task 9)
    },
  ```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `save export and import` PASS, the new `ui menu` and `ui boot` cases PASS, then `ALL PASSED`. The Task 16 menu test's first case still expects the export and import buttons to toast `T.notYet` without hooks: unchanged. In a browser, Menu → Export city downloads `thebes-city-<date>.json` (desktop Edge has no file share) and Menu → Import city reopens it with the Welcome back card.

- [ ] **Step 6: Commit**

```powershell
git add src/save/exportImport.js src/boot.js src/ui/menu.js src/ui/text.js tests/save/exportImport.test.js tests/ui/menu.test.js tests/ui/boot.test.js tests/all.js
git commit -m "Export the city through the share sheet or a download, and import a file`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Sound and haptics

**Files:**
- Create: `src/audio/sfx.js`
- Modify: `src/ui/createUI.js` (`sfx` option, unlock on the first gesture, play on commands, events, a new critical alert; buzz on ✓ and milestones), `src/ui/alerts.js` (`onNewCritical`), `tests/helpers/uiWorld.js` (`rigUI({ sfx })`)
- Test: `tests/audio/sfx.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `settings.get().sound` / `.vibration`, `afterCommand` events (`kind` is `building`, `road`, `houses`, `demolish`, `undo`, `pause` or `speed`; `undoable` is true for the four placement kinds), sim events (`upgrade`, `downgrade`, `milestone`, `goal`, `month`, `arrivals`), `createAlerts`.
- Produces (`sfx.js`): `SFX` (the seven effects as note lists `{ f, type, t, d, g, slide? }`: frequency, oscillator type, start offset and length in seconds, peak gain, optional frequency slide target); `createSfx({ context = null, create = () => new AudioContext(), enabled = () => false, vibrate = navigator.vibrate bound or null, canVibrate = () => false, audioSession = navigator.audioSession or null }) → { names, play(name) → boolean, unlock() → boolean, buzz(ms) → boolean, get context }`. `unlock()` does nothing while `enabled()` is false; otherwise it creates the context on first use (a `create` that throws leaves it absent) and resumes a suspended one; it returns true when a context exists. `play(name)` is silent (false) while disabled, before the first unlock, or for an unknown name; otherwise one oscillator plus gain per note, each with a 10 ms attack and an exponential fade to silence, and returns true. `buzz(ms)` calls `vibrate(ms)` when `canVibrate()` and `vibrate` exist (a throw returns false). `audioSession.type` is set to `'ambient'` at creation when the session exists. No `<audio>` element, no `new Audio(...)`: the silent switch is respected (spec 5.5).
- Produces (`alerts.js`): `createAlerts({ ..., onNewCritical = () => {} })` is called from `refresh()` when the critical set gains an alert key it did not have before.
- Produces (`createUI`): option `sfx = null` (default `createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration })`); `pointerdown` and `keydown` listeners on `root` call `sfx.unlock()` and detach once it returns true; `afterCommand` plays `place` (`building`, `houses`), `road` or `demolish` and buzzes 20 ms for every undoable command; `onEvents` plays `upgrade`, `goal`, and `milestone` (with a 40 ms buzz); a new critical alert plays `alert`. `ui.sfx` is returned.
- Produces (`uiWorld.js`): `rigUI({ sfx })` passes it through.

- [ ] **Step 1: Write the failing tests**

`tests/audio/sfx.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSfx, SFX } from '../../src/audio/sfx.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { screenToTile } from '../../src/render/camera.js';
import { buildingAt } from '../../src/sim/world.js';

// Records every oscillator and gain node the effects build, so envelopes can be checked without sound.
function fakeAudio() {
  const ctx = {
    state: 'suspended', currentTime: 0, destination: { name: 'out' }, oscillators: [], gains: [], resumed: 0,
    resume() { ctx.resumed++; ctx.state = 'running'; return Promise.resolve(); },
    createOscillator() {
      const o = { type: 'sine', freq: [], started: null, stopped: null, to: null, connect: (n) => { o.to = n; }, start: (t) => { o.started = t; }, stop: (t) => { o.stopped = t; } };
      o.frequency = { setValueAtTime: (v, t) => o.freq.push([v, t]), exponentialRampToValueAtTime: (v, t) => o.freq.push([v, t]) };
      ctx.oscillators.push(o);
      return o;
    },
    createGain() {
      const g = { ramps: [], to: null, connect: (n) => { g.to = n; } };
      g.gain = { setValueAtTime: (v, t) => g.ramps.push([v, t]), linearRampToValueAtTime: (v, t) => g.ramps.push([v, t]), exponentialRampToValueAtTime: (v, t) => g.ramps.push([v, t]) };
      ctx.gains.push(g);
      return g;
    },
  };
  return ctx;
}

describe('audio sfx', () => {
  it('stays silent until enabled and unlocked, then plays the seven effects as short envelopes', () => {
    let on = false, created = 0;
    const ctx = fakeAudio();
    const sfx = createSfx({ create: () => { created++; return ctx; }, enabled: () => on, vibrate: null, audioSession: null });
    expect(sfx.names).toEqual(['place', 'road', 'demolish', 'upgrade', 'milestone', 'alert', 'goal']);
    expect(sfx.play('place')).toBe(false);
    expect(sfx.unlock()).toBe(false);
    expect(created).toBe(0);
    on = true;
    expect(sfx.play('place')).toBe(false);                 // no gesture yet
    expect(sfx.unlock()).toBe(true);
    expect(created).toBe(1);
    expect(ctx.resumed).toBe(1);
    expect(ctx.state).toBe('running');
    expect(sfx.unlock()).toBe(true);
    expect(created).toBe(1);
    expect(sfx.context).toBe(ctx);
    expect(sfx.play('place')).toBe(true);
    expect(ctx.oscillators.length).toBe(SFX.place.length);
    const o = ctx.oscillators[0];
    expect(o.type).toBe(SFX.place[0].type);
    expect(o.freq[0]).toEqual([SFX.place[0].f, SFX.place[0].t]);
    expect(o.started).toBe(SFX.place[0].t);
    expect(o.stopped - o.started).toBeGreaterThan(SFX.place[0].d);
    expect(o.stopped - o.started).toBeLessThan(0.5);
    expect(o.to).toBe(ctx.gains[0]);
    expect(ctx.gains[0].to).toBe(ctx.destination);
    for (const name of sfx.names) expect(sfx.play(name)).toBe(true);
    expect(sfx.play('nope')).toBe(false);
    for (const g of ctx.gains) expect(g.ramps[g.ramps.length - 1][0]).toBeLessThan(0.001);   // every note fades to silence
    for (const name of sfx.names) for (const n of SFX[name]) { expect(n.d).toBeGreaterThan(0); expect(n.d).toBeLessThanOrEqual(0.4); expect(n.g).toBeLessThanOrEqual(0.35); }
    on = false;
    expect(sfx.play('place')).toBe(false);
  });
  it('marks the audio session ambient, never uses an audio element, and survives a context that fails to open', async () => {
    const session = { type: 'auto' };
    createSfx({ audioSession: session, enabled: () => true, create: () => fakeAudio(), vibrate: null });
    expect(session.type).toBe('ambient');
    const broken = createSfx({ enabled: () => true, create: () => { throw new Error('no audio'); }, audioSession: null, vibrate: null });
    expect(broken.unlock()).toBe(false);
    expect(broken.play('goal')).toBe(false);
    const src = await (await fetch('/src/audio/sfx.js')).text();
    expect(/new Audio\(|createElement\(\s*['"]audio['"]|<audio/i.test(src)).toBe(false);
  });
  it('buzzes only when the setting allows and the device can', () => {
    const buzzes = [];
    let allowed = true;
    const sfx = createSfx({ vibrate: (ms) => { buzzes.push(ms); return true; }, canVibrate: () => allowed, audioSession: null });
    expect(sfx.buzz(20)).toBe(true);
    allowed = false;
    expect(sfx.buzz(20)).toBe(false);
    expect(buzzes).toEqual([20]);
    expect(createSfx({ vibrate: null, canVibrate: () => true, audioSession: null }).buzz(20)).toBe(false);
    expect(createSfx({ vibrate: () => { throw new Error('x'); }, canVibrate: () => true, audioSession: null }).buzz(20)).toBe(false);
  });
```

Continue `tests/audio/sfx.test.js` (same `describe`):
```js
  it('plays from the game: commands and ✓, events, and a new critical alert; buzzes on ✓ and milestones', async () => {
    const played = [], buzzes = [];
    const sfx = { names: [], play: (n) => { played.push(n); return true; }, unlock: () => { played.push('unlock'); return true; }, buzz: (ms) => { buzzes.push(ms); return true; }, context: null };
    const r = await rigUI({ width: 1280, height: 800, sfx });
    expect(r.ui.sfx).toBe(sfx);
    fire(r.root.querySelector('#topbar'), 'pointerdown');
    fire(r.root.querySelector('#topbar'), 'pointerdown');
    expect(played).toEqual(['unlock']);                                       // detached after the first success
    const c = screenToTile(r.cam, { width: 1280, height: 800 }, 640, 320);
    r.cam.x += 5.2 - c.x; r.cam.y += 9.2 - c.y;
    key(r.root, '5');
    fire(r.root.querySelector('#panel .cards .card'), 'click');
    key(r.root, 'Enter');
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    expect(played).toEqual(['unlock', 'place']);
    expect(buzzes).toEqual([20]);
    key(r.root, 'z', { ctrlKey: true });                                      // undo: no sound, no buzz
    expect(played.length).toBe(2);
    key(r.root, 'Escape');
    key(r.root, '1');
    fire(r.root.querySelectorAll('#panel .cards .card')[0], 'click');         // the road card
    r.ui.placement.pointAt(5, 14); r.ui.placement.pointAt(8, 14);          // open desert below the services
    key(r.root, 'Enter');
    expect(played[played.length - 1]).toBe('road');
    expect(buzzes).toEqual([20, 20]);
    key(r.root, 'Escape');
    r.ui.onEvents([{ type: 'upgrade', id: 1, from: 1, to: 2 }, { type: 'arrivals', count: 2 }, { type: 'goal', id: 'road', reward: 25 }, { type: 'milestone', id: 'town' }]);
    expect(played.slice(-3)).toEqual(['upgrade', 'goal', 'milestone']);
    expect(buzzes).toEqual([20, 20, 40]);
    r.world.gold = -5;
    r.ui.alerts.refresh();
    expect(played[played.length - 1]).toBe('alert');
    r.ui.alerts.refresh();
    expect(played.filter((n) => n === 'alert').length).toBe(1);               // the same alert does not repeat
    r.cleanup();
  });
});
```

In `tests/helpers/uiWorld.js`: `rigUI` gains `sfx = null` and passes `sfx` to `createUI`.

Append to `tests/all.js`:
```js
import './audio/sfx.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "audio sfx"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/audio/sfx.js` does not exist).

- [ ] **Step 3: Write the effects**

`src/audio/sfx.js`:
```js
// Sound and haptics (spec 5.5): seven short synthesised effects, off by default, unlocked on the first user
// gesture; an ambient audio session so the iPhone silent switch is respected; short vibration pulses.
// No <audio> element and no silent-switch unlock hack: when the phone is muted, the game is quiet.
export const SFX = {
  place: [{ f: 440, type: 'triangle', t: 0, d: 0.08, g: 0.25 }, { f: 660, type: 'triangle', t: 0.06, d: 0.1, g: 0.2 }],
  road: [{ f: 300, type: 'square', t: 0, d: 0.05, g: 0.12 }],
  demolish: [{ f: 220, type: 'sawtooth', t: 0, d: 0.18, g: 0.2, slide: 80 }],
  upgrade: [{ f: 523, type: 'sine', t: 0, d: 0.1, g: 0.2 }, { f: 659, type: 'sine', t: 0.1, d: 0.1, g: 0.2 }, { f: 784, type: 'sine', t: 0.2, d: 0.16, g: 0.2 }],
  milestone: [{ f: 523, type: 'triangle', t: 0, d: 0.15, g: 0.25 }, { f: 659, type: 'triangle', t: 0.15, d: 0.15, g: 0.25 }, { f: 784, type: 'triangle', t: 0.3, d: 0.15, g: 0.25 }, { f: 1047, type: 'triangle', t: 0.45, d: 0.3, g: 0.3 }],
  alert: [{ f: 330, type: 'square', t: 0, d: 0.12, g: 0.15 }, { f: 330, type: 'square', t: 0.2, d: 0.12, g: 0.15 }],
  goal: [{ f: 587, type: 'sine', t: 0, d: 0.1, g: 0.2 }, { f: 880, type: 'sine', t: 0.1, d: 0.2, g: 0.25 }],
};

const ATTACK = 0.01, TAIL = 0.02, SILENT = 0.0001;

function defaultCreate() {
  const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
  if (!Ctx) throw new Error('no_audio');
  return new Ctx();
}
function defaultVibrate() {
  try { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? (ms) => navigator.vibrate(ms) : null; } catch (e) { return null; }
}
function defaultSession() {
  try { return typeof navigator !== 'undefined' && navigator.audioSession ? navigator.audioSession : null; } catch (e) { return null; }
}

export function createSfx({
  context = null, create = defaultCreate, enabled = () => false,
  vibrate = defaultVibrate(), canVibrate = () => false, audioSession = defaultSession(),
} = {}) {
  let ctx = context;
  if (audioSession) { try { audioSession.type = 'ambient'; } catch (e) { /* older Safari: no session type */ } }

  function note(n, t0) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const start = t0 + n.t, end = start + n.d;
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.f, start);
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, end);
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.linearRampToValueAtTime(n.g, start + ATTACK);
    gain.gain.exponentialRampToValueAtTime(SILENT, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + TAIL);
  }

  return {
    names: Object.keys(SFX),
    get context() { return ctx; },
    // The first user gesture: create or resume the context, but only once the player asked for sound.
    unlock() {
      if (!enabled()) return false;
      if (!ctx) { try { ctx = create(); } catch (e) { ctx = null; return false; } }
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') { try { ctx.resume().catch(() => {}); } catch (e) { /* stays suspended */ } }
      return true;
    },
    play(name) {
      const notes = SFX[name];
      if (!notes || !enabled() || !ctx) return false;
      const t0 = ctx.currentTime;
      try { for (const n of notes) note(n, t0); } catch (e) { return false; }
      return true;
    },
    buzz(ms) {
      if (!vibrate || !canVibrate()) return false;
      try { vibrate(ms); return true; } catch (e) { return false; }
    },
  };
}
```

- [ ] **Step 4: Wire sound into the interface**

In `src/ui/alerts.js`, add `onNewCritical = () => {}` to `createAlerts`'s options and replace the critical-keys block in `refresh()` with:
```js
      const criticalKeys = current.critical.map(keyOf).sort().join('|');
      if (criticalKeys !== lastCriticalKeys) {
        const before = new Set((lastCriticalKeys || '').split('|').filter(Boolean));
        if (current.critical.some((a) => !before.has(keyOf(a)))) onNewCritical();   // a fresh problem, not a cleared one
        lastCriticalKeys = criticalKeys;
        renderBanner();
      }
```

In `src/ui/createUI.js`:
- Import `createSfx` from `../audio/sfx.js`.
- Add the option `sfx: givenSfx = null` and, right after `settings` is built: `const sfx = givenSfx || createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });`.
- Pass `onNewCritical: () => sfx.play('alert')` to `createAlerts`.
- After the alerts are built, the gesture unlock:
  ```js
  // Web Audio needs a user gesture before it plays (spec 5.5): the first pointer or key does it, then the
  // listeners go. While sound is off, unlock() declines and the listeners stay for a later switch-on.
  const onGesture = () => { if (sfx.unlock()) { root.removeEventListener('pointerdown', onGesture); root.removeEventListener('keydown', onGesture); } };
  root.addEventListener('pointerdown', onGesture);
  root.addEventListener('keydown', onGesture);
  ```
  and in `destroy()`: `root.removeEventListener('pointerdown', onGesture); root.removeEventListener('keydown', onGesture);`.
- In `afterCommand`, before the toast line:
  ```js
    if (e.undoable) {                                  // a ✓ outcome: place, road, plots or demolish
      sfx.play(e.kind === 'road' ? 'road' : e.kind === 'demolish' ? 'demolish' : 'place');
      sfx.buzz(20);
    }
  ```
- In `onEvents` (Task 3 and 4), add one pass:
  ```js
    for (const e of events) {
      if (e.type === 'upgrade') sfx.play('upgrade');
      else if (e.type === 'goal') sfx.play('goal');
      else if (e.type === 'milestone') { sfx.play('milestone'); sfx.buzz(40); }
    }
  ```
- Return `sfx` from `createUI`.

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `audio sfx` PASS, then `ALL PASSED`. The default `createSfx` in every other rig test never creates a context: sound is off by default and `unlock()` declines. In a browser with Play with sound chosen on the title card, the first tap unlocks audio and placing a building clicks; on an iPhone with the silent switch on there is no sound.

- [ ] **Step 6: Commit**

```powershell
git add src/audio/sfx.js src/ui/createUI.js src/ui/alerts.js tests/helpers/uiWorld.js tests/audio/sfx.test.js tests/all.js
git commit -m "Add synthesised sound effects and vibration pulses, off by default`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The install flow, the install guide, Bring a city and the in-app browser notice

**Files:**
- Create: `src/save/installFlow.js`, `src/ui/installUi.js`
- Modify: `src/ui/titleCard.js` (`canBring`/`onBring`, a hidden Install button with `setCanInstall`, `showGuide`/`showCard`), `src/boot.js` (`envInput` option, the captured `beforeinstallprompt`, `hooks.install`/`hooks.canInstall`, the `install` sheet, the notice), `src/ui/createUI.js` (`extraSheets`), `src/ui/menu.js` (Install item), `src/ui/text.js`, `css/ui.css`, `index.html` (`#notice`)
- Test: `tests/save/installFlow.test.js`, `tests/ui/installUi.test.js`; modify `tests/ui/titleCard.test.js`, `tests/ui/boot.test.js`, `tests/all.js`

**Interfaces:**
- Consumes: `createTitleCard` (Task 6), `boot`'s `io`, `hooks`, `current`, `title` (Tasks 6 and 7), `openSheet`, `createMenuSheets`'s `hooks`.
- Produces (`installFlow.js`):
  - `IN_APP`: the in-app browser patterns (`FBAN`/`FBAV`/`FB_IAB`, `Instagram`, `Messenger`, `LinkedInApp`, `Twitter`).
  - `detectEnvironment({ ua = '', standalone = false, hasBeforeInstallPrompt = false }) → { platform: 'ios' | 'android' | 'desktop', inApp, standalone, canPrompt }` (`ios` = iPhone, iPad or iPod in the UA; `android` = Android; `canPrompt` = `hasBeforeInstallPrompt && !standalone`).
  - `readEnvironment(win) → { ua, standalone, hasBeforeInstallPrompt }` from `navigator.userAgent`, `navigator.standalone === true` or the `(display-mode: standalone)` media query, and `'onbeforeinstallprompt' in win`.
  - `createInstallFlow({ env, hasSave = () => false, getPrompt = () => null }) → { env, canInstall(), shouldShowGuide(), canBring(), notice(), promptInstall() }`: `canInstall` = not standalone, not in-app, and iOS or `env.canPrompt` or a captured prompt event; `shouldShowGuide` = iOS Safari (not standalone, not in-app) with no save; `canBring` = standalone with no save; `notice()` = `'safari'` on an iOS in-app browser, `'chrome'` on any other in-app browser, else `null`; `promptInstall()` resolves `'accepted'` or `'dismissed'` through the captured event's `prompt()`/`userChoice`, or `'guide'` when there is no event or it throws.
- Produces (`installUi.js`): `installGuide(flow, { hasCity = false, onPrompt = () => {}, onBring = () => {} }) → (body) => void` (a renderer for the `custom` sheet map and the title card): when `flow.canBring()` the Bring-a-city help and a `.bring` primary button; otherwise `T.installWhy`, then on iOS the three `T.installIosSteps` as an `ol.steps` (preceded by `T.installExportFirst` when `hasCity`), and on Android/desktop an `.install-now` primary button calling `onPrompt` plus `T.installNotOffered` in small print. `noticeText(kind)` → `T.openInSafari` / `T.openInChrome` / `null`. `showNotice(container, text)` fills `#notice` with a `.notice` row (an ⓘ glyph and the text) or hides it when `text` is null.
- Produces (`titleCard.js`): `createTitleCard` gains `canBring = false`, `onBring = () => {}` (a `.bring` button after New city, text `T.bringCity`); the `.install` button is always built and hidden unless `canInstall`; the returned object gains `setCanInstall(flag)`, `showGuide(render)` (hides the buttons, renders the guide into a `.guide` box with a `.guide-back` Back button) and `showCard()` (back to the buttons, focus on the first).
- Produces (`createUI`): option `extraSheets = {}` merged into `customSheets` after the menus and the goals sheet.
- Produces (`menu.js`): the menu lists `T.installMenu` after Import city when `typeof hooks.install === 'function'` and `hooks.canInstall()` is true; it calls `hooks.install()`.
- Produces (`boot.js`): option `envInput = readEnvironment(win)`; `io.installPrompt` (default: the event captured from `win`'s `beforeinstallprompt`, `preventDefault`ed; a late event re-evaluates the title card's Install button through `setCanInstall`); `hooks.canInstall = () => flow.canInstall()`; `hooks.install()` prompts, and on `'guide'` opens the `install` sheet (or toasts `T.installNotOffered` when that sheet is already open); the title's Install button prompts or shows the guide in the card; `flow.shouldShowGuide()` shows the guide at once on the title; `flow.canBring()` shows the Bring button, which calls `hooks.importCity()` (no city is open, so the import starts at once); `showNotice(#notice, noticeText(flow.notice()))` runs at boot. `destroy()` removes the `beforeinstallprompt` listener.
- Produces (`text.js`): `T.installMenu = 'Install on this device'`, `T.bringCity = 'Bring a city from Safari'`, `T.bringCityHelp = 'If you saved a city in Safari, open the menu there and choose Export city. Then import that file here.'`, `T.installWhy = 'Installed on the home screen, the game works offline and keeps your city safe.'`, `T.installIosSteps = ['Tap Share (the square with an arrow)', 'Scroll down and tap Add to Home Screen', 'Tap Add']`, `T.installExportFirst = 'Export your city first: the installed app keeps its own storage. Then import the file from the home-screen app.'`, `T.installNow = 'Install now'`, `T.installNotOffered = 'Your browser did not offer to install. Look for Install app or Add to Home screen in its menu.'`, `T.openInSafari = 'Open in Safari to keep your city'`, `T.openInChrome = 'Open in Chrome to keep your city'`.

- [ ] **Step 1: Write the failing tests**

`tests/save/installFlow.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { detectEnvironment, createInstallFlow, readEnvironment } from '../../src/save/installFlow.js';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0';
const IN_APP_IOS = `${IOS} [FBAN/FBIOS;FBAV/400.0]`;
const INSTAGRAM = `${ANDROID} Instagram 300.0`;

describe('install flow', () => {
  it('tells iOS Safari, the home-screen app, in-app browsers, Android and desktop apart', () => {
    expect(detectEnvironment({ ua: IOS })).toEqual({ platform: 'ios', inApp: false, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: IOS, standalone: true })).toEqual({ platform: 'ios', inApp: false, standalone: true, canPrompt: false });
    expect(detectEnvironment({ ua: IN_APP_IOS })).toEqual({ platform: 'ios', inApp: true, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: INSTAGRAM })).toEqual({ platform: 'android', inApp: true, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: `${ANDROID} FB_IAB/FB4A Messenger` }).inApp).toBe(true);
    expect(detectEnvironment({ ua: `${DESKTOP} LinkedInApp` }).inApp).toBe(true);
    expect(detectEnvironment({ ua: `${IOS} Twitter for iPhone` }).inApp).toBe(true);
    expect(detectEnvironment({ ua: ANDROID, hasBeforeInstallPrompt: true })).toEqual({ platform: 'android', inApp: false, standalone: false, canPrompt: true });
    expect(detectEnvironment({ ua: DESKTOP })).toEqual({ platform: 'desktop', inApp: false, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: DESKTOP, standalone: true, hasBeforeInstallPrompt: true }).canPrompt).toBe(false);
    expect(detectEnvironment({})).toEqual({ platform: 'desktop', inApp: false, standalone: false, canPrompt: false });
    const read = readEnvironment({ navigator: { userAgent: IOS, standalone: true }, matchMedia: () => ({ matches: false }) });
    expect(read).toEqual({ ua: IOS, standalone: true, hasBeforeInstallPrompt: false });
    expect(readEnvironment({ navigator: { userAgent: DESKTOP }, matchMedia: () => ({ matches: true }), onbeforeinstallprompt: null })).toEqual({ ua: DESKTOP, standalone: true, hasBeforeInstallPrompt: true });
    expect(readEnvironment({ navigator: { userAgent: DESKTOP }, matchMedia: () => { throw new Error('x'); } }).standalone).toBe(false);
  });
  it('decides the guide, the install button, Bring a city and the notice from the environment', () => {
    const flow = (input, hasSave = false, prompt = null) => createInstallFlow({ env: detectEnvironment(input), hasSave: () => hasSave, getPrompt: () => prompt });
    const ios = flow({ ua: IOS });
    expect([ios.shouldShowGuide(), ios.canInstall(), ios.canBring(), ios.notice()]).toEqual([true, true, false, null]);
    expect(flow({ ua: IOS }, true).shouldShowGuide()).toBe(false);
    const home = flow({ ua: IOS, standalone: true });
    expect([home.shouldShowGuide(), home.canInstall(), home.canBring()]).toEqual([false, false, true]);
    expect(flow({ ua: IOS, standalone: true }, true).canBring()).toBe(false);
    const inApp = flow({ ua: IN_APP_IOS });
    expect([inApp.shouldShowGuide(), inApp.canInstall(), inApp.notice()]).toEqual([false, false, 'safari']);
    expect(flow({ ua: INSTAGRAM }).notice()).toBe('chrome');
    expect(flow({ ua: ANDROID }).canInstall()).toBe(false);
    expect(flow({ ua: ANDROID }, false, { prompt() {} }).canInstall()).toBe(true);     // the event arrived later
    expect(flow({ ua: DESKTOP, hasBeforeInstallPrompt: true }).canInstall()).toBe(true);
    expect(flow({ ua: DESKTOP }).shouldShowGuide()).toBe(false);
    expect(flow({ ua: DESKTOP, standalone: true }).canBring()).toBe(true);
  });
  it('prompts through the captured event, else falls back to the guide', async () => {
    const calls = [];
    const f = (prompt) => createInstallFlow({ env: detectEnvironment({ ua: ANDROID }), getPrompt: () => prompt });
    expect(await f({ prompt() { calls.push('prompt'); }, userChoice: Promise.resolve({ outcome: 'accepted' }) }).promptInstall()).toBe('accepted');
    expect(calls).toEqual(['prompt']);
    expect(await f({ prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) }).promptInstall()).toBe('dismissed');
    expect(await f({ prompt() { throw new Error('once only'); } }).promptInstall()).toBe('guide');
    expect(await f(null).promptInstall()).toBe('guide');
  });
});
```

`tests/ui/installUi.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { installGuide, noticeText, showNotice } from '../../src/ui/installUi.js';
import { createTitleCard } from '../../src/ui/titleCard.js';
import { detectEnvironment, createInstallFlow } from '../../src/save/installFlow.js';
import { T } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
const flowFor = (input, hasSave = false) => createInstallFlow({ env: detectEnvironment(input), hasSave: () => hasSave, getPrompt: () => ({ prompt() {} }) });

describe('ui install guide', () => {
  it('renders the iOS steps, the Android button, the export-first warning and Bring a city', () => {
    const { root, cleanup } = mount();
    const log = [];
    installGuide(flowFor({ ua: IOS }), {})(root);
    expect(root.querySelectorAll('ol.steps li').length).toBe(T.installIosSteps.length);
    expect(root.textContent).toContain(T.installIosSteps[1]);
    expect(root.textContent).toContain(T.installWhy);
    expect(root.textContent.includes(T.installExportFirst)).toBe(false);
    expect(root.querySelector('.install-now')).toBe(null);
    root.innerHTML = '';
    installGuide(flowFor({ ua: IOS }, true), { hasCity: true })(root);
    expect(root.textContent).toContain(T.installExportFirst);
    root.innerHTML = '';
    installGuide(flowFor({ ua: ANDROID }), { onPrompt: () => log.push('prompt') })(root);
    expect(root.querySelector('ol.steps')).toBe(null);
    fire(root.querySelector('.install-now'), 'click');
    expect(log).toEqual(['prompt']);
    expect(root.textContent).toContain(T.installNotOffered);
    root.innerHTML = '';
    installGuide(flowFor({ ua: IOS, standalone: true }), { onBring: () => log.push('bring') })(root);
    expect(root.textContent).toContain(T.bringCityHelp);
    fire(root.querySelector('.bring'), 'click');
    expect(log).toEqual(['prompt', 'bring']);
    expect(noticeText('safari')).toBe(T.openInSafari);
    expect(noticeText('chrome')).toBe(T.openInChrome);
    expect(noticeText(null)).toBe(null);
    const notice = document.createElement('div');
    notice.hidden = true;
    showNotice(notice, T.openInSafari);
    expect(notice.hidden).toBe(false);
    expect(notice.querySelector('.notice').textContent).toContain(T.openInSafari);
    showNotice(notice, null);
    expect(notice.hidden).toBe(true);
    expect(notice.children.length).toBe(0);
    cleanup();
  });
  it('title card: Bring a city, a late Install button, and the guide in place of the buttons', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    const container = root.querySelector('#title');
    const log = [];
    const card = createTitleCard({ container, hasSave: false, canInstall: false, canBring: true, sound: false, onContinue: () => {}, onNewCity: () => {}, onSound: () => {}, onInstall: () => log.push('install'), onBring: () => log.push('bring') });
    const bring = container.querySelector('.bring');
    expect(bring.textContent).toBe(T.bringCity);
    expect(bring.previousElementSibling.classList.contains('new-city')).toBe(true);
    fire(bring, 'click');
    expect(log).toEqual(['bring']);
    const install = container.querySelector('.install');
    expect(install.hidden).toBe(true);
    card.setCanInstall(true);
    expect(install.hidden).toBe(false);
    fire(install, 'click');
    expect(log).toEqual(['bring', 'install']);
    card.showGuide((body) => body.append(Object.assign(document.createElement('p'), { textContent: 'guide here', className: 'probe' })));
    expect(container.querySelector('.title-buttons').hidden).toBe(true);
    expect(container.querySelector('.guide .probe').textContent).toBe('guide here');
    const back = container.querySelector('.guide-back');
    expect(back.textContent).toBe(T.back);
    expect(document.activeElement).toBe(back);
    fire(back, 'click');
    expect(container.querySelector('.guide')).toBe(null);
    expect(container.querySelector('.title-buttons').hidden).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('.new-city'));
    card.destroy();
    cleanup();
  });
});
```

In `tests/ui/titleCard.test.js`, the Install button is now always present: change `expect(container.querySelector('.install')).toBe(null);` to `expect(container.querySelector('.install').hidden).toBe(true);` and, in the `withSave` half, add `expect(container.querySelector('.install').hidden).toBe(false);` before the click on it.

In `tests/ui/boot.test.js`: import `detectEnvironment` is not needed; give `bootRig` an `envInput = { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }` option passed to `boot` (every earlier boot test then runs as plain desktop Chrome with no prompt: no Install button, no guide, no notice), and add:
```js
  it('shows the install guide first on iOS Safari, the notice in an in-app browser, prompts on Android, and brings a city into the home-screen app', async () => {
    const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
    const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
    let r = await bootRig({ envInput: { ua: IOS } });
    let title = r.root.querySelector('#title');
    expect(title.querySelector('.guide')).toBeTruthy();                                 // first launch, no city: the guide
    expect(title.querySelector('.guide').textContent).toContain(T.installIosSteps[0]);
    expect(r.root.querySelector('#notice').hidden).toBe(true);
    fire(title.querySelector('.guide-back'), 'click');
    expect(title.querySelector('.install').hidden).toBe(false);
    fire(title.querySelector('.install'), 'click');
    await flush();
    expect(title.querySelector('.guide')).toBeTruthy();                                 // iOS: Install opens the guide again
    r.cleanup();
    r = await bootRig({ envInput: { ua: `${IOS} [FBAN/FBIOS;FBAV/400.0]` } });
    title = r.root.querySelector('#title');
    expect(title.querySelector('.guide')).toBe(null);
    expect(title.querySelector('.install').hidden).toBe(true);
    expect(r.root.querySelector('#notice').hidden).toBe(false);
    expect(r.root.querySelector('#notice').textContent).toContain(T.openInSafari);
    expect(getComputedStyle(r.root.querySelector('#notice')).display === 'none').toBe(false);   // visible over the title
    r.cleanup();
    expect(r.root.querySelector('#notice').hidden).toBe(true);
    const prompts = [];
    const event = { prompt() { prompts.push('prompt'); }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
    r = await bootRig({ envInput: { ua: ANDROID }, platform: { installPrompt: () => event } });
    title = r.root.querySelector('#title');
    expect(title.querySelector('.guide')).toBe(null);
    expect(title.querySelector('.install').hidden).toBe(false);
    fire(title.querySelector('.install'), 'click');
    await flush();
    expect(prompts).toEqual(['prompt']);
    expect(title.querySelector('.guide')).toBe(null);                                    // the browser's own sheet did the work
    fire(title.querySelector('.new-city'), 'click');
    const g = r.api.game();
    g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
    const installItem = [...r.root.querySelectorAll('#sheet button')].find((b) => b.textContent.trim() === T.installMenu);
    expect(installItem).toBeTruthy();
    fire(installItem, 'click');
    await flush();
    expect(prompts).toEqual(['prompt', 'prompt']);
    r.cleanup();
    const w = createWorld({ seed: 12 });
    const platform = { pick: async () => new File([packSave(w, { savedAt: 1, lastSpeed: 1 })], 'c.json', { type: 'application/json' }) };
    r = await bootRig({ envInput: { ua: IOS, standalone: true }, platform });
    title = r.root.querySelector('#title');
    expect(title.querySelector('.install').hidden).toBe(true);
    const bring = title.querySelector('.bring');
    expect(bring.textContent).toBe(T.bringCity);
    fire(bring, 'click');
    await flush(); await flush(); await flush();
    expect(r.api.phase()).toBe('game');
    expect(r.api.game().world.seed).toBe(12);
    expect(r.api.game().ui.store.get().sheet.kind).toBe('welcome');
    r.cleanup();
    r = await bootRig({ envInput: { ua: ANDROID } });                                   // no prompt yet
    title = r.root.querySelector('#title');
    expect(title.querySelector('.install').hidden).toBe(true);
    const late = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt() { prompts.push('late'); }, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(late);
    expect(late.defaultPrevented).toBe(true);
    expect(title.querySelector('.install').hidden).toBe(false);
    fire(title.querySelector('.install'), 'click');
    await flush();
    expect(prompts[prompts.length - 1]).toBe('late');
    r.cleanup();
  });
```

Append to `tests/all.js`:
```js
import './save/installFlow.test.js';
import './ui/installUi.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "install"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/save/installFlow.js` and `src/ui/installUi.js` do not exist).

- [ ] **Step 3: Write the flow and the guide**

`src/save/installFlow.js`:
```js
// Where the game runs and what that means for saved data (spec 4.17): iOS Safari (home-screen storage is
// separate, so the install guide comes first), the home-screen app (offer to bring a city in), in-app
// browsers (cannot install, keep separate storage: say so), and Android or desktop (the install prompt).
export const IN_APP = [/FBAN|FBAV|FB_IAB/, /Instagram/, /Messenger/, /LinkedInApp/, /Twitter/];

export function detectEnvironment({ ua = '', standalone = false, hasBeforeInstallPrompt = false } = {}) {
  const platform = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
  return { platform, inApp: IN_APP.some((re) => re.test(ua)), standalone: Boolean(standalone), canPrompt: Boolean(hasBeforeInstallPrompt) && !standalone };
}

export function readEnvironment(win) {
  const nav = win.navigator || {};
  let standalone = nav.standalone === true;
  try { if (!standalone && typeof win.matchMedia === 'function') standalone = Boolean(win.matchMedia('(display-mode: standalone)').matches); } catch (e) { /* no media queries */ }
  return { ua: nav.userAgent || '', standalone, hasBeforeInstallPrompt: 'onbeforeinstallprompt' in win };
}

export function createInstallFlow({ env, hasSave = () => false, getPrompt = () => null }) {
  const installable = () => !env.standalone && !env.inApp;
  return {
    env,
    canInstall: () => installable() && (env.platform === 'ios' || env.canPrompt || Boolean(getPrompt())),
    shouldShowGuide: () => env.platform === 'ios' && installable() && !hasSave(),
    canBring: () => env.standalone && !hasSave(),
    notice: () => (env.inApp ? (env.platform === 'ios' ? 'safari' : 'chrome') : null),
    async promptInstall() {
      const ev = getPrompt();
      if (!ev || typeof ev.prompt !== 'function') return 'guide';
      try {
        ev.prompt();
        const choice = await ev.userChoice;
        return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch (e) { return 'guide'; }
    },
  };
}
```

`src/ui/installUi.js`:
```js
// The install guide (a sheet in the game, a panel on the title card), the Bring-a-city offer and the
// in-app browser notice (spec 4.17). Decisions come from src/save/installFlow.js; this file only draws them.
import { el, button, clear } from './components.js';
import { T } from './text.js';

export function installGuide(flow, { hasCity = false, onPrompt = () => {}, onBring = () => {} } = {}) {
  return (body) => {
    if (flow.canBring()) {
      body.append(el('p', { text: T.bringCityHelp }), el('div', { class: 'actions' }, [button(T.bringCity, { class: 'bring primary', onClick: onBring })]));
      return;
    }
    body.append(el('p', { text: T.installWhy }));
    if (flow.env.platform === 'ios') {
      if (hasCity) body.append(el('p', { class: 'amber', text: T.installExportFirst }));
      body.append(el('ol', { class: 'steps' }, T.installIosSteps.map((s) => el('li', { text: s }))));
    } else {
      body.append(el('div', { class: 'actions' }, [button(T.installNow, { class: 'install-now primary', onClick: onPrompt })]));
      body.append(el('p', { class: 'small muted', text: T.installNotOffered }));
    }
  };
}

export const noticeText = (kind) => (kind === 'safari' ? T.openInSafari : kind === 'chrome' ? T.openInChrome : null);

export function showNotice(container, text) {
  clear(container);
  if (!text) { container.hidden = true; return; }
  container.append(el('div', { class: 'notice', role: 'status' }, [el('span', { class: 'icon', 'aria-hidden': 'true', text: 'ⓘ' }), el('span', { class: 'text', text })]));
  container.hidden = false;
}
```

Add to `src/ui/text.js`'s `T`: `installMenu: 'Install on this device', bringCity: 'Bring a city from Safari', bringCityHelp: 'If you saved a city in Safari, open the menu there and choose Export city. Then import that file here.', installWhy: 'Installed on the home screen, the game works offline and keeps your city safe.', installIosSteps: ['Tap Share (the square with an arrow)', 'Scroll down and tap Add to Home Screen', 'Tap Add'], installExportFirst: 'Export your city first: the installed app keeps its own storage. Then import the file from the home-screen app.', installNow: 'Install now', installNotOffered: 'Your browser did not offer to install. Look for Install app or Add to Home screen in its menu.', openInSafari: 'Open in Safari to keep your city', openInChrome: 'Open in Chrome to keep your city',`.

In `src/ui/titleCard.js`, `createTitleCard` becomes:
```js
export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, message = null, onContinue, onNewCity, onSound, onInstall = () => {}, onBring = () => {} }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
  soundButton.addEventListener('click', () => { on = !on; soundButton.textContent = on ? T.playMuted : T.playWithSound; onSound(on); });
  const install = button(T.install, { class: 'install', hidden: !canInstall, onClick: onInstall });
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity }));
  if (canBring) buttons.push(button(T.bringCity, { class: 'bring', onClick: onBring }));
  buttons.push(soundButton, install);
  const buttonBox = el('div', { class: 'title-buttons' }, buttons);
  const element = el('div', { class: 'title-card', role: 'dialog', 'aria-labelledby': 'title-name' }, [
    el('h1', { id: 'title-name', text: 'Thebes' }),
    el('p', { class: 'tagline muted', text: T.tagline }),
    message ? el('p', { class: 'message coral', text: message }) : null,
    buttonBox,
  ]);
  let guide = null;
  const showCard = () => { if (guide) { guide.remove(); guide = null; } buttonBox.hidden = false; buttons[0].focus(); };
  clear(container);
  container.append(element);
  container.hidden = false;
  buttons[0].focus();
  return {
    element,
    setCanInstall(flag) { install.hidden = !flag; },
    // The install guide takes the buttons' place until Back (iOS, or a browser without the install prompt).
    showGuide(render) {
      showCard();
      const body = el('div', { class: 'guide-body' });
      render(body);
      const back = button(T.back, { class: 'guide-back', onClick: showCard });
      guide = el('div', { class: 'guide' }, [body, el('div', { class: 'actions' }, [back])]);
      buttonBox.hidden = true;
      element.append(guide);
      back.focus();
    },
    showCard,
    destroy() { clear(container); container.hidden = true; },
  };
}
```
(`el` sets `hidden: true` as an attribute and skips `hidden: false`, so the button starts hidden only when `canInstall` is false.)

- [ ] **Step 4: Wire the flow into the boot, the menu and the page**

`index.html`: add `<div id="notice" role="region" aria-label="Notice" hidden></div>` right after the `#title` div.

Append to `css/ui.css`:
```css
/* The in-app browser notice (spec 4.17): persistent, above everything, visible on the title card too. */
#notice { position: fixed; left: max(8px, var(--safe-left)); right: max(8px, var(--safe-right)); top: calc(var(--safe-top) + 8px); z-index: 4; display: flex; justify-content: center; pointer-events: none; }
#notice .notice { pointer-events: auto; display: inline-flex; align-items: center; gap: 8px; background: var(--amber-soft); color: var(--amber-text); border: 1px solid var(--amber-text); border-radius: var(--radius); padding: 8px 12px; box-shadow: var(--shadow); }
body.on-title #ui > :not(#title):not(#notice) { display: none !important; }
.guide { text-align: left; }
.guide .steps { padding-left: 20px; margin: 8px 0; }
```
and delete the Task 6 line `body.on-title #ui > :not(#title) { display: none !important; }` (the new rule replaces it).

In `src/ui/createUI.js`: add the option `extraSheets = {}` and, after the Task 5 welcome block, `Object.assign(customSheets, extraSheets);`.

In `src/ui/menu.js` `menu()`, after the Import city button:
```js
      typeof hooks.install === 'function' && (typeof hooks.canInstall !== 'function' || hooks.canInstall()) ? button(T.installMenu, { class: 'install', onClick: () => hooks.install() }) : null,
```
(`el` skips the `null`).

In `src/boot.js`:
- Import `detectEnvironment, readEnvironment, createInstallFlow` from `./save/installFlow.js`, `installGuide, noticeText, showNotice` from `./ui/installUi.js`, `openSheet` from `./ui/modes.js`.
- Add the option `envInput = readEnvironment(win)`.
- After `io` is built (Task 7), capture the prompt and build the flow:
  ```js
  // The install prompt arrives on its own time (Android, desktop Chrome and Edge): keep it for the button.
  let promptEvent = null;
  const onPrompt = (e) => { e.preventDefault(); promptEvent = e; if (title) title.card.setCanInstall(flow.canInstall()); };
  win.addEventListener('beforeinstallprompt', onPrompt);
  if (!io.installPrompt) io.installPrompt = () => promptEvent;
  let loadedOk = false;
  const flow = createInstallFlow({ env: detectEnvironment(envInput), hasSave: () => loadedOk || Boolean(current), getPrompt: io.installPrompt });
  showNotice(root.querySelector('#notice'), noticeText(flow.notice()));
  ```
- Add to `hooks`:
  ```js
    canInstall: () => flow.canInstall(),
    async install() {
      const r = await flow.promptInstall();
      if (r !== 'guide' || !current) return;
      const s = current.ui.store.get();
      if (s.sheet && s.sheet.kind === 'install') current.ui.toasts.show(T.installNotOffered);
      else current.ui.store.set(openSheet(s, 'install'));
    },
  ```
- In `startGame`, pass to `createUI`: `extraSheets: { install: installGuide(flow, { hasCity: true, onPrompt: () => hooks.install(), onBring: () => hooks.importCity() }) }`.
- In `showTitle`: set `loadedOk = loaded.state === 'ok';` first; pass to `createTitleCard`: `canInstall: flow.canInstall(), canBring: flow.canBring(), onBring: () => hooks.importCity(),` and
  ```js
      onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); },
  ```
  where `const guide = installGuide(flow, { hasCity: false, onPrompt: () => flow.promptInstall(), onBring: () => hooks.importCity() });` is built before the card; after `title = { card, loop, backdrop };` add `if (flow.shouldShowGuide()) card.showGuide(guide);`.
- In `destroy()`: `win.removeEventListener('beforeinstallprompt', onPrompt); showNotice(root.querySelector('#notice'), null);`.

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `install flow`, `ui install guide`, the changed `ui title card` and the new `ui boot` case PASS, then `ALL PASSED`. The a11y name test covers the menu sheet: the Install item has text. In desktop Edge the title shows Install (Edge has `onbeforeinstallprompt`); without a manifest (Task 10) the browser never fires the event, so the button opens the guide, whose Install now reports `T.installNotOffered`. That resolves itself in Task 10.

- [ ] **Step 6: Commit**

```powershell
git add index.html css/ui.css src/save/installFlow.js src/ui/installUi.js src/ui/titleCard.js src/ui/createUI.js src/ui/menu.js src/boot.js src/ui/text.js tests/save/installFlow.test.js tests/ui/installUi.test.js tests/ui/titleCard.test.js tests/ui/boot.test.js tests/all.js
git commit -m "Add the install guide, Bring a city from Safari and the in-app browser notice`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Icons and the link preview image, rendered by the art code

(The handoff listed this after the PWA task; it comes first so the manifest and the service worker in Task 11 can point at files that exist.)

**Files:**
- Create: `tools/assets.js`, `tools/assets.html`, `tools/render-assets.ps1`, and the rendered `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-512-maskable.png`, `icons/apple-touch-icon.png`, `icons/favicon-32.png`, `og-image.png` (committed)
- Modify: `tests/serve.py` (`POST /__file` with an allow-list; optional bind host)
- Test: `tests/render/assets.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `ART.temple` (`bounds`, `draw`), `makeDraw`, `createRenderer`, `buildSampleCity`, `createWorld`, `createCamera`, `TITLE_SEED`, `T.tagline`.
- Produces (`tools/assets.js`): `ASSETS`: `[{ name, kind: 'icon', size, maskable, rounded, width, height }, ..., { name: 'og-image.png', kind: 'og', width: 1200, height: 630 }]` in the order 192, 512, 512 maskable, apple-touch-icon (180, opaque), favicon-32, og-image; `renderIcon({ size, maskable = false, rounded = !maskable, createCanvas }) → canvas` (parchment ground, the temple centred and scaled to 70% of the side, 55% when maskable so it sits in the safe zone; `rounded` clips to a 20% corner radius, else the square is opaque); `renderOgImage({ createCanvas }) → canvas` (1200×630: the sample city at zoom 1.5 with every chunk baked, a parchment panel bottom-left with "Thebes" and `T.tagline`); `renderAsset(asset, createCanvas) → canvas`.
- Produces (`tests/serve.py`): `POST /__file?name=<path>` writes the base64 body to that path under the served directory when `<path>` is one of the six asset names (403 otherwise), through a temp file and a rename; `python tests/serve.py PORT DIR [RESULTS_FILE] [HOST]` binds `HOST` (default `127.0.0.1`; `0.0.0.0` for a phone on the LAN).
- Produces (`tools/assets.html`): draws every asset, POSTs it to `/__file`, then POSTs a log to `/__results` ending in `DONE` (or the error). `tools/render-assets.ps1` serves the repo, opens that page in headless Edge, waits for the log and prints it.

- [ ] **Step 1: Write the failing tests**

`tests/render/assets.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { ASSETS, renderIcon, renderOgImage, renderAsset } from '../../tools/assets.js';

const px = (c, x, y) => [...c.getContext('2d').getImageData(x, y, 1, 1).data];
const distinct = (c, points) => new Set(points.map(([x, y]) => px(c, x, y).join(','))).size;

describe('render assets', () => {
  it('draws the icons with the temple in the middle, maskable ones full-bleed, and the 1200x630 preview', () => {
    expect(ASSETS.map((a) => a.name)).toEqual(['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'og-image.png']);
    const icon = renderIcon({ size: 192 });
    expect([icon.width, icon.height]).toEqual([192, 192]);
    expect(px(icon, 96, 96)[3]).toBe(255);
    expect(px(icon, 1, 1)[3]).toBe(0);                                       // rounded corners are clear
    expect(distinct(icon, [[96, 60], [96, 96], [96, 130], [40, 96], [150, 96]])).toBeGreaterThan(2);
    const mask = renderIcon({ size: 512, maskable: true });
    expect(px(mask, 1, 1)[3]).toBe(255);                                      // full-bleed for the mask
    expect(px(mask, 1, 1).slice(0, 3)).toEqual(px(mask, 510, 1).slice(0, 3));   // the same ground right across the top edge
    const apple = renderAsset(ASSETS[3]);
    expect([apple.width, apple.height]).toEqual([180, 180]);
    expect(px(apple, 1, 1)[3]).toBe(255);                                     // iOS wants an opaque square
    const og = renderOgImage();
    expect([og.width, og.height]).toEqual([1200, 630]);
    expect(distinct(og, [[100, 100], [600, 300], [1100, 500], [300, 400], [900, 150]])).toBeGreaterThan(3);
    expect(px(og, 2, 2)[3]).toBe(255);
  });
  it('serves the committed files at their sizes', async () => {
    for (const a of ASSETS) {
      const r = await fetch(`/${a.name}`);
      expect(r.status).toBe(200);
      const bmp = await createImageBitmap(await r.blob());
      expect([a.name, bmp.width, bmp.height]).toEqual([a.name, a.width, a.height]);
    }
  });
});
```

Append to `tests/all.js`:
```js
import './render/assets.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "render assets"`
Expected: `LOAD ERROR` naming `tests/all.js` (`tools/assets.js` does not exist).

- [ ] **Step 3: Write the asset renderer**

`tools/assets.js`:
```js
// Icons and the link preview (spec 7.1), drawn by the art code so they match the game. tools/assets.html
// runs this in a browser and POSTs the PNGs to tests/serve.py; the results are committed.
import { ART } from '../src/render/art/registry.js';
import { makeDraw } from '../src/render/art/ctx.js';
import { createRenderer } from '../src/render/renderer.js';
import { createCamera } from '../src/render/camera.js';
import { createWorld } from '../src/sim/world.js';
import { buildSampleCity } from '../src/dev/sampleCity.js';
import { TITLE_SEED } from '../src/data/ui.js';
import { T } from '../src/ui/text.js';

const PARCHMENT = '#F3E7CB', PARCHMENT_3 = '#DCC9A0', INK = '#2B1F0E', INK_SOFT = '#5A4832';

const icon = (name, size, extra = {}) => ({ name, kind: 'icon', size, width: size, height: size, maskable: false, rounded: true, ...extra });
export const ASSETS = [
  icon('icons/icon-192.png', 192),
  icon('icons/icon-512.png', 512),
  icon('icons/icon-512-maskable.png', 512, { maskable: true, rounded: false }),
  icon('icons/apple-touch-icon.png', 180, { rounded: false }),
  icon('icons/favicon-32.png', 32),
  { name: 'og-image.png', kind: 'og', width: 1200, height: 630 },
];

export function defaultCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// The temple, centred, on a parchment ground. Maskable icons keep the art inside the 80% safe zone.
export function renderIcon({ size, maskable = false, rounded = !maskable, createCanvas = defaultCanvas }) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (rounded) { roundedRect(ctx, 0, 0, size, size, size * 0.2); ctx.clip(); }
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = PARCHMENT_3;
  ctx.fillRect(0, size * 0.62, size, size * 0.38);
  const def = ART.temple;
  const [l, t, r, b] = def.bounds;
  const scale = (size * (maskable ? 0.55 : 0.7)) / Math.max(r - l, b - t);
  ctx.save();
  ctx.translate(size / 2 - (l + (r - l) / 2) * scale, size / 2 - (t + (b - t) / 2) * scale);
  def.draw(makeDraw(ctx, scale), 0, 0);
  ctx.restore();
  return canvas;
}
```

Continue `tools/assets.js` (same file):
```js
// The link preview: the sample city with every chunk baked, and the name on a parchment panel.
export function renderOgImage({ createCanvas = defaultCanvas } = {}) {
  const canvas = createCanvas(1200, 630);
  const world = buildSampleCity(createWorld({ seed: TITLE_SEED }));
  const cam = createCamera({ x: world.tradeEntry.x, y: world.size - 22, zoom: 1.5 });
  const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: 64 });
  const view = { width: 1200, height: 630 };
  for (let i = 0; i < 3; i++) renderer.renderFrame(world, cam, { view });   // bakes settle on the first frame; two more for safety
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PARCHMENT;
  roundedRect(ctx, 48, 630 - 48 - 176, 520, 176, 24);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 88px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Thebes', 80, 630 - 48 - 72);
  ctx.fillStyle = INK_SOFT;
  ctx.font = '34px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(T.tagline, 82, 630 - 48 - 24);
  return canvas;
}

export function renderAsset(asset, createCanvas = defaultCanvas) {
  if (asset.kind === 'og') return renderOgImage({ createCanvas });
  return renderIcon({ size: asset.size, maskable: asset.maskable, rounded: asset.rounded, createCanvas });
}
```

`tools/assets.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Thebes assets</title>
<style>body { font: 14px/1.5 ui-monospace, Consolas, monospace; margin: 16px; } canvas { display: block; margin: 8px 0; max-width: 100%; border: 1px solid #ccc; }</style>
</head>
<body>
<pre id="log">RUNNING</pre>
<script type="module">
  // Draws every asset with the art code and POSTs the PNG bytes to tests/serve.py, which writes them to disk.
  import { ASSETS, renderAsset } from './assets.js';
  const log = document.getElementById('log');
  const lines = [];
  try {
    for (const asset of ASSETS) {
      const canvas = renderAsset(asset);
      document.body.append(canvas);
      const data = canvas.toDataURL('image/png').split(',')[1];
      const r = await fetch(`/__file?name=${encodeURIComponent(asset.name)}`, { method: 'POST', body: data });
      lines.push(`${r.status === 204 ? 'WROTE' : 'FAILED ' + r.status} ${asset.name} ${canvas.width}x${canvas.height}`);
    }
    lines.push('DONE');
  } catch (e) {
    lines.push('ERROR ' + (e && e.stack ? e.stack : String(e)));
  }
  log.textContent = lines.join('\n');
  document.title = lines[lines.length - 1] === 'DONE' ? 'DONE' : 'FAIL';
  try { await fetch('/__results', { method: 'POST', body: log.textContent }); } catch (e) { /* no server */ }
</script>
</body>
</html>
```

In `tests/serve.py`: import `base64` and `urllib.parse`; add the allow-list and extend `do_POST`:
```python
ALLOWED_FILES = {
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png',
    'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'og-image.png',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    results_file = None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        path, _, query = self.path.partition('?')
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length)
        if path == '/__results':
            if self.results_file:
                tmp = self.results_file + '.tmp'
                with open(tmp, 'wb') as f:
                    f.write(body)
                os.replace(tmp, self.results_file)
            self.send_response(204)
            self.end_headers()
            return
        if path == '/__file':
            # tools/assets.html writes the rendered icons here. Only the six known names, only under the served dir.
            name = urllib.parse.parse_qs(query).get('name', [''])[0]
            if name not in ALLOWED_FILES:
                self.send_error(403)
                return
            target = os.path.join(self.directory, *name.split('/'))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            tmp = target + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(base64.b64decode(body))
            os.replace(tmp, target)
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404)
```
and the entry point takes the host:
```python
if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    Handler.results_file = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    host = sys.argv[4] if len(sys.argv) > 4 else '127.0.0.1'   # 0.0.0.0 to reach it from a phone on the LAN
    handler = functools.partial(Handler, directory=directory)
    Server((host, port), handler).serve_forever()
```
Update the module docstring: `Usage: python tests/serve.py PORT DIRECTORY [RESULTS_FILE] [HOST]` and a line about `/__file`.

`tools/render-assets.ps1`:
```powershell
# Renders the icons and the link preview with the art code: serves the repo, opens tools/assets.html in
# headless Edge, and waits for the page's log (POSTed to /__results). The PNGs land in icons/ and og-image.png.
param([int]$Port = 0)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
if ($Port -eq 0) {
  $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $Port = $l.LocalEndpoint.Port; $l.Stop()
}
$runId = [guid]::NewGuid().ToString('N')
$profileDir = Join-Path $env:TEMP ("thebes-assets-" + $runId)
$resultsFile = Join-Path $env:TEMP ("thebes-assets-" + $runId + ".txt")
$server = Start-Process -FilePath python -ArgumentList "`"$(Join-Path $root 'tests/serve.py')`"", "$Port", "`"$root`"", "`"$resultsFile`"" -PassThru -WindowStyle Hidden
$browser = $null
try {
  $up = $false
  for ($i = 0; $i -lt 40 -and -not $up; $i++) {
    try { $up = (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/tools/assets.html" -TimeoutSec 2).StatusCode -eq 200 } catch { $up = $false }
    if (-not $up) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $up) { Write-Output "Server did not answer on port $Port"; exit 1 }
  $edgeArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', "--user-data-dir=`"$profileDir`"", "http://127.0.0.1:$Port/tools/assets.html")
  $browser = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru -WindowStyle Hidden
  $clock = [Diagnostics.Stopwatch]::StartNew()
  while ($clock.Elapsed.TotalSeconds -lt 60 -and -not (Test-Path -LiteralPath $resultsFile)) { Start-Sleep -Milliseconds 200 }
  if (-not (Test-Path -LiteralPath $resultsFile)) { Write-Output 'TIMEOUT: the asset page never reported'; exit 1 }
  $text = [System.IO.File]::ReadAllText($resultsFile, [System.Text.Encoding]::UTF8)
  Write-Output $text
  if ($text -notmatch '(?m)^DONE\s*$') { exit 1 }
} finally {
  if ($browser) { Stop-Process -Id $browser.Id -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $resultsFile -Force -ErrorAction SilentlyContinue
}
```

- [ ] **Step 4: Render the files and run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tools/render-assets.ps1`
Expected: six `WROTE ...` lines then `DONE`; `icons/` holds five PNGs and `og-image.png` sits at the root. Open `og-image.png` and one icon in the file viewer and check they look like the game (a temple on parchment; the city with the name panel). `.gitattributes` already marks `*.png` binary.

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `render assets` PASS (both cases, the second because the files now exist), then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add tools/assets.js tools/assets.html tools/render-assets.ps1 tests/serve.py icons og-image.png tests/render/assets.test.js tests/all.js
git commit -m "Render the app icons and the link preview image with the art code`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The installable, offline web app and the "Update ready" toast

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `sw-files.js` (generated), `tools/sw-files.ps1`, `src/pwa.js`
- Modify: `index.html` (head: manifest, icons, Apple meta, Open Graph), `src/boot.js` (register the worker, `?nosw=1`, `platform.reload`, the update offer), `src/ui/createUI.js` (`offerUpdate`), `src/data/ui.js` (`SW_PATH`, `UPDATE_TOAST_MS`), `src/ui/text.js`
- Test: `tests/ui/pwa.test.js`; modify `tests/ui/boot.test.js`, `tests/all.js`

**Interfaces:**
- Consumes: the icons (Task 10), `APP_VERSION` (data/ui.js), `hooks.save` (Task 6), `toasts.show(text, { action, onAction, ms })`, `isToolMode`.
- Produces (`manifest.webmanifest`): name and short_name `Thebes`, `start_url "./"`, `scope "./"`, `display "standalone"`, `background_color "#DCC9A0"`, `theme_color "#F3E7CB"`, icons 192, 512 and 512 maskable.
- Produces (`sw-files.js`, generated): `self.THEBES_VERSION` (copied from `APP_VERSION`), `self.THEBES_BUILD` (12 hex chars: a SHA-1 over every listed file, so any change makes a new cache), `self.THEBES_FILES` (`'./'`, `./index.html`, `./manifest.webmanifest`, `./css/ui.css`, every `./src/**/*.js`, every `./icons/*.png`; sorted; `og-image.png`, `sw.js` and the tools and tests are not cached).
- Produces (`sw.js`): `importScripts('./sw-files.js')`; cache name `thebes-<VERSION>-<BUILD>`; install adds every listed file; activate deletes other `thebes-*` caches and claims clients; fetch answers same-origin GETs cache-first (`ignoreSearch`, so `?seed=7` still hits `index.html`) with a network fallback, and ignores `/__` dev endpoints; a `'skipWaiting'` message calls `self.skipWaiting()`.
- Produces (`data/ui.js`): `SW_PATH = './sw.js'`, `UPDATE_TOAST_MS = 20000`.
- Produces (`pwa.js`): `registerServiceWorker({ sw, path = SW_PATH, onWaiting = () => {} }) → Promise<registration | null>` (null without a `sw` object or when `register` throws; `onWaiting(worker)` fires for a worker that is waiting while the page is controlled, at registration or after `updatefound` → `statechange` to `installed`); `applyUpdate(worker, sw, { save, reload }) → Promise<void>` (awaits `save()`, listens once for `controllerchange` → `reload()`, then posts `'skipWaiting'` to the worker).
- Produces (`createUI`): `ui.offerUpdate(apply)`: shows the toast `T.updateReady` with the action `T.restart` (which calls `apply`) for `UPDATE_TOAST_MS`, but only while no tool is active (spec 6.3); an offer made during placement waits and shows when the tool closes.
- Produces (`boot.js`): option `sw = (win.navigator && win.navigator.serviceWorker) || null`; `platform.reload` (default `() => win.location.reload()`); `?nosw=1` unregisters every registration instead of registering (development); a waiting worker becomes `ui.offerUpdate(apply)` with `apply = () => applyUpdate(worker, sw, { save: () => hooks.save('update'), reload: io.reload })`; during the title phase the offer is kept and made once the game starts.
- Produces (`text.js`): `T.updateReady = 'Update ready'`, `T.restart = 'Restart'`.
- Produces (`index.html` head): `<meta name="description">`, `<link rel="manifest" href="./manifest.webmanifest">`, `<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">`, `<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (`default`), `apple-mobile-web-app-title`, `og:title`, `og:description`, `og:type` (`website`), `og:url` and `og:image` (absolute: `https://joshuahedge.github.io/thebes/og-image.png`, the one address on the page that cannot be relative because link previews are fetched by other sites), `twitter:card` (`summary_large_image`).

- [ ] **Step 1: Write the failing tests**

`tests/ui/pwa.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { registerServiceWorker, applyUpdate } from '../../src/pwa.js';
import { APP_VERSION } from '../../src/data/ui.js';
import { T } from '../../src/ui/text.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';

// Evaluates the generated list the way the worker does: a classic script that assigns to `self`.
async function swFiles() {
  const src = await (await fetch('/sw-files.js')).text();
  const self = {};
  new Function('self', src)(self);
  return self;
}
const resolveImport = (from, spec) => { const parts = from.split('/'); parts.pop(); for (const p of spec.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); } return parts.join('/'); };

function fakeSw({ controlled = true } = {}) {
  const listeners = {};
  const reg = { waiting: null, installing: null, listeners: {}, addEventListener(t, fn) { (reg.listeners[t] = reg.listeners[t] || []).push(fn); } };
  const sw = {
    controller: controlled ? {} : null, registered: [],
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    async register(p) { sw.registered.push(p); return reg; },
    fire(t) { for (const fn of listeners[t] || []) fn(); },
  };
  return { sw, reg, fireReg: (t) => { for (const fn of reg.listeners[t] || []) fn(); } };
}
const fakeWorker = () => { const w = { state: 'installing', posted: [], listeners: {}, addEventListener(t, fn) { (w.listeners[t] = w.listeners[t] || []).push(fn); }, postMessage(m) { w.posted.push(m); }, fire(t) { for (const fn of w.listeners[t] || []) fn(); } }; return w; };

describe('ui pwa', () => {
  it('lists every file the game needs, each one served, and every import inside src resolves to a listed file', async () => {
    const { THEBES_FILES: files, THEBES_VERSION: version, THEBES_BUILD: build } = await swFiles();
    expect(version).toBe(APP_VERSION);
    expect(/^[0-9a-f]{12}$/.test(build)).toBe(true);
    const chunks = [];
    for (const f of files.filter((x) => x !== './')) chunks.push(new Uint8Array(await (await fetch(f.slice(1))).arrayBuffer()));
    const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const c of chunks) { all.set(c, at); at += c.length; }
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(digest.slice(0, 12)).toBe(build);                                   // a stale list fails: rerun tools/sw-files.ps1
    for (const must of ['./', './index.html', './manifest.webmanifest', './css/ui.css', './src/main.js', './src/boot.js', './src/ui/createUI.js', './icons/icon-192.png', './icons/icon-512-maskable.png']) expect(files).toContain(must);
    expect(files.includes('./sw.js')).toBe(false);
    expect(files.includes('./og-image.png')).toBe(false);
    expect(files.some((f) => f.startsWith('./tests/') || f.startsWith('./tools/'))).toBe(false);
    for (const f of files) {
      expect(f.startsWith('./')).toBe(true);
      expect((await fetch(f.slice(1))).status).toBe(200);
    }
    const listed = new Set(files);
    for (const f of files.filter((x) => x.startsWith('./src/') && x.endsWith('.js'))) {
      const src = await (await fetch(f.slice(1))).text();
      for (const m of src.matchAll(/from\s+'([^']+)'/g)) expect([f, m[1], listed.has(resolveImport(f, m[1]))]).toEqual([f, m[1], true]);
    }
  });
  it('ships a manifest, the head tags and a worker that caches the list and honours skipWaiting', async () => {
    const r = await fetch('/manifest.webmanifest');
    expect(r.status).toBe(200);
    const m = await r.json();
    expect([m.name, m.short_name, m.start_url, m.scope, m.display, m.background_color, m.theme_color]).toEqual(['Thebes', 'Thebes', './', './', 'standalone', '#DCC9A0', '#F3E7CB']);
    expect(m.icons.map((i) => [i.src, i.sizes, i.type, i.purpose || 'any'])).toEqual([['icons/icon-192.png', '192x192', 'image/png', 'any'], ['icons/icon-512.png', '512x512', 'image/png', 'any'], ['icons/icon-512-maskable.png', '512x512', 'image/png', 'maskable']]);
    for (const i of m.icons) expect((await fetch(`/${i.src}`)).status).toBe(200);
    const html = await (await fetch('/index.html')).text();
    for (const needle of ['rel="manifest" href="./manifest.webmanifest"', 'rel="apple-touch-icon" href="./icons/apple-touch-icon.png"', 'rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png"', 'name="theme-color" content="#F3E7CB"', 'property="og:title" content="Thebes"', 'property="og:description"', 'property="og:image" content="https://joshuahedge.github.io/thebes/og-image.png"', 'name="apple-mobile-web-app-capable" content="yes"', 'name="description"']) expect([needle, html.includes(needle)]).toEqual([needle, true]);
    expect(/href="\/|src="\//.test(html)).toBe(false);                          // every path relative, for /thebes/
    const sw = await (await fetch('/sw.js')).text();
    expect(sw).toContain("importScripts('./sw-files.js')");
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('THEBES_FILES');
    expect(sw).toContain('ignoreSearch');
    expect(/clients\.claim\(\)/.test(sw)).toBe(true);
  });
```

Continue `tests/ui/pwa.test.js` (same `describe`):
```js
  it('registers the worker, offers a waiting one only when the page is controlled, and the restart saves then reloads', async () => {
    const { sw, reg, fireReg } = fakeSw();
    const offered = [];
    expect(await registerServiceWorker({ sw, path: './sw.js', onWaiting: (w) => offered.push(w) })).toBe(reg);
    expect(sw.registered).toEqual(['./sw.js']);
    expect(offered).toEqual([]);
    const worker = fakeWorker();
    reg.installing = worker;
    fireReg('updatefound');
    worker.state = 'installed'; reg.waiting = worker; reg.installing = null;
    worker.fire('statechange');
    expect(offered).toEqual([worker]);
    const log = [];
    await applyUpdate(worker, sw, { save: async () => { log.push('save'); return true; }, reload: () => log.push('reload') });
    expect(log).toEqual(['save']);
    expect(worker.posted).toEqual(['skipWaiting']);
    sw.fire('controllerchange'); sw.fire('controllerchange');
    expect(log).toEqual(['save', 'reload']);                                   // once
    const already = fakeSw();
    already.reg.waiting = fakeWorker();
    const got = [];
    await registerServiceWorker({ sw: already.sw, onWaiting: (w) => got.push(w) });
    expect(got).toEqual([already.reg.waiting]);                                // waiting since before this page loaded
    const first = fakeSw({ controlled: false });
    first.reg.waiting = fakeWorker();
    const none = [];
    await registerServiceWorker({ sw: first.sw, onWaiting: (w) => none.push(w) });
    expect(none).toEqual([]);                                                  // the first install is not an update
    expect(await registerServiceWorker({ sw: null })).toBe(null);
    expect(await registerServiceWorker({ sw: { register: async () => { throw new Error('insecure'); } } })).toBe(null);
  });
  it('shows the Update ready toast only when no tool is active, and Restart runs the update', async () => {
    const r = await rigUI();
    const applied = [];
    fire(r.root.querySelectorAll('#dock .cat')[4], 'click');
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
    expect(r.store.get().mode).toBe('placing');
    r.ui.offerUpdate(() => applied.push(1));
    expect(r.root.querySelector('#toasts .toast')).toBe(null);                 // not during a placement (spec 6.3)
    fire(r.root.querySelector('#confirm .cancel'), 'click');
    const toast = r.root.querySelector('#toasts .toast');
    expect(toast.textContent).toContain(T.updateReady);
    expect(toast.querySelector('button').textContent).toBe(T.restart);
    fire(toast.querySelector('button'), 'click');
    expect(applied).toEqual([1]);
    expect(r.root.querySelector('#toasts .toast')).toBe(null);
    r.cleanup();
  });
});
```

In `tests/ui/boot.test.js`: `bootRig` passes `sw: null` to `boot` by default and accepts `sw` and `platform.reload` overrides; add to the `ui boot` group:
```js
  it('offers a waiting worker once the game runs; Restart saves, hands over and reloads', async () => {
    const listeners = {};
    const worker = { state: 'installed', posted: [], addEventListener() {}, postMessage(m) { worker.posted.push(m); } };
    const reg = { waiting: worker, installing: null, addEventListener() {} };
    const sw = { controller: {}, async register() { return reg; }, addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); } };
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const reloads = [];
    const r = await bootRig({ store, params: 'skipTitle=1&seed=3', sw, platform: { reload: () => reloads.push(1) } });
    await flush(); await flush();
    const toast = r.root.querySelector('#toasts .toast');
    expect(toast.textContent).toContain(T.updateReady);
    fire(toast.querySelector('button'), 'click');
    await flush(); await flush();
    expect((await loadSave(store)).world.seed).toBe(3);
    expect(worker.posted).toEqual(['skipWaiting']);
    for (const fn of listeners.controllerchange) fn();
    expect(reloads).toEqual([1]);
    r.cleanup();
  });
```

Append to `tests/all.js`:
```js
import './ui/pwa.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui pwa"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/pwa.js` does not exist).

- [ ] **Step 3: Write the manifest, the worker and the file-list tool**

`manifest.webmanifest`:
```json
{
  "name": "Thebes",
  "short_name": "Thebes",
  "description": "A city builder for phone and desktop browsers, inspired by the classic Egyptian city builders.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#DCC9A0",
  "theme_color": "#F3E7CB",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`sw.js`:
```js
// Service worker (spec 7.1): caches every file in sw-files.js under one cache named by version and build,
// answers same-origin GETs cache-first with a network fallback, and drops older caches when it takes over.
// A waiting worker takes over when the page posts 'skipWaiting' (the Update ready toast, spec 6.3).
importScripts('./sw-files.js');

const CACHE = `thebes-${self.THEBES_VERSION}-${self.THEBES_BUILD}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(self.THEBES_FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('thebes-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/__')) return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)));
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
```

`tools/sw-files.ps1`:
```powershell
# Writes sw-files.js: the files the service worker caches, and a build stamp that changes whenever any of
# them does, so a deploy installs a fresh cache. Run it after adding or changing files and before a publish.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$rel = { param($path) $path.Substring($root.Length + 1) -replace '\\', '/' }
$files = @('index.html', 'manifest.webmanifest', 'css/ui.css') +
  @(Get-ChildItem -Path (Join-Path $root 'src') -Recurse -Filter *.js | ForEach-Object { & $rel $_.FullName }) +
  @(Get-ChildItem -Path (Join-Path $root 'icons') -Filter *.png | ForEach-Object { 'icons/' + $_.Name })
$files = @($files | Sort-Object -Unique)
$version = (Select-String -Path (Join-Path $root 'src/data/ui.js') -Pattern "APP_VERSION = '([^']+)'").Matches[0].Groups[1].Value
$all = New-Object System.IO.MemoryStream
foreach ($f in $files) { $bytes = [IO.File]::ReadAllBytes((Join-Path $root $f)); $all.Write($bytes, 0, $bytes.Length) }
$sha = [System.Security.Cryptography.SHA1]::Create()
$build = ([BitConverter]::ToString($sha.ComputeHash($all.ToArray())) -replace '-', '').Substring(0, 12).ToLower()
$list = ($files | ForEach-Object { "  './$_'," }) -join "`n"
$text = "// Generated by tools/sw-files.ps1. Do not edit: run the tool after adding or changing files.`n" +
  "self.THEBES_VERSION = '$version';`nself.THEBES_BUILD = '$build';`nself.THEBES_FILES = [`n  './',`n$list`n];`n"
[IO.File]::WriteAllText((Join-Path $root 'sw-files.js'), $text, [Text.UTF8Encoding]::new($false))
Write-Output "Wrote sw-files.js: $($files.Count + 1) entries, version $version, build $build"
```
Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` and check `sw-files.js` lists `./`, the three page files, every `src` module and the five icons, with LF endings.

In `src/data/ui.js` add `export const SW_PATH = './sw.js';` and `export const UPDATE_TOAST_MS = 20000;`. Add to `src/ui/text.js`'s `T`: `updateReady: 'Update ready', restart: 'Restart',`.

`src/pwa.js`:
```js
// Service worker registration and the update flow (spec 6.3, 7.1). A new worker that finishes installing
// while an old one controls the page is "waiting": the interface offers a restart, which saves, tells the
// worker to take over, and reloads once it has.
import { SW_PATH } from './data/ui.js';

export async function registerServiceWorker({ sw, path = SW_PATH, onWaiting = () => {} }) {
  if (!sw || typeof sw.register !== 'function') return null;
  let reg;
  try { reg = await sw.register(path); } catch (e) { console.warn('Thebes: the service worker was not registered:', e); return null; }
  const offer = () => { if (reg.waiting && sw.controller) onWaiting(reg.waiting); };   // no controller: a first install, not an update
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => { if (worker.state === 'installed') offer(); });
  });
  offer();
  return reg;
}

export async function applyUpdate(worker, sw, { save = async () => true, reload = () => location.reload() } = {}) {
  await save();
  let done = false;
  sw.addEventListener('controllerchange', () => { if (!done) { done = true; reload(); } });
  worker.postMessage('skipWaiting');
}
```

- [ ] **Step 4: Wire the head tags, the update toast and the registration**

`index.html` head, after the `theme-color` meta:
```html
<meta name="description" content="A city builder for phone and desktop browsers, inspired by the classic Egyptian city builders.">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Thebes">
<meta property="og:type" content="website">
<meta property="og:title" content="Thebes">
<meta property="og:description" content="A city builder for phone and desktop browsers, inspired by the classic Egyptian city builders.">
<meta property="og:url" content="https://joshuahedge.github.io/thebes/">
<meta property="og:image" content="https://joshuahedge.github.io/thebes/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

In `src/ui/createUI.js`: import `UPDATE_TOAST_MS` from `../data/ui.js` and add after `onEvents`:
```js
  // The "update ready" toast (spec 6.3) waits until no tool is active; Restart saves, then reloads (boot.js).
  let pendingUpdate = null;
  function showUpdateToast() {
    if (!pendingUpdate || isToolMode(store.get().mode)) return;
    const apply = pendingUpdate;
    pendingUpdate = null;
    toasts.show(T.updateReady, { action: T.restart, onAction: apply, ms: UPDATE_TOAST_MS });
  }
  function offerUpdate(apply) { pendingUpdate = apply; showUpdateToast(); }
```
In the store subscription that sets `root.dataset.mode`, add `if (pendingUpdate && !isToolMode(s.mode)) showUpdateToast();`. Return `offerUpdate` from `createUI`.

In `src/boot.js`:
- Import `registerServiceWorker, applyUpdate` from `./pwa.js`.
- Add the option `sw = (win.navigator && win.navigator.serviceWorker) || null`; give `io` a `reload: () => win.location.reload()` default (before the `...platform` spread).
- Declare `let pendingUpdate = null;` next to `current`; in `startGame` after `loop.start()`: `if (pendingUpdate) { ui.offerUpdate(pendingUpdate); pendingUpdate = null; }`.
- At the end of `boot`, before the phase choice:
  ```js
  // The offline cache (spec 7.1). ?nosw=1 drops it while developing, so edits show without a restart.
  if (params.get('nosw') === '1') { if (sw && sw.getRegistrations) sw.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {}); }
  else {
    registerServiceWorker({ sw, onWaiting: (worker) => {
      const apply = () => applyUpdate(worker, sw, { save: () => hooks.save('update'), reload: io.reload });
      if (current) current.ui.offerUpdate(apply); else pendingUpdate = apply;
    } });
  }
  ```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui pwa` PASS (the import-resolution case fails loudly if a module is missing from `sw-files.js`: rerun `tools/sw-files.ps1`), the new `ui boot` case PASS, then `ALL PASSED`. In Edge at `http://localhost:8000/`, DevTools → Application → Service workers shows `sw.js` activated and the cache `thebes-0.1-<build>` holding the list; the title's Install button now prompts (the manifest is live). Edit any file and reload: a new worker installs, the "Update ready" toast appears in browse mode and Restart reloads onto the new build; `?nosw=1` clears the worker for development.

- [ ] **Step 6: Commit**

```powershell
git add manifest.webmanifest sw.js sw-files.js tools/sw-files.ps1 src/pwa.js index.html src/boot.js src/ui/createUI.js src/data/ui.js src/ui/text.js tests/ui/pwa.test.js tests/ui/boot.test.js tests/all.js
git commit -m "Make the game an installable offline web app with an update-ready toast`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The cheap Stage 1c carry-overs

Eight small fixes from `docs/superpowers/notes/2026-10-10-stage-1c-followups.md` that touch code this plan is already in. (The `tests/serve.py` bind host from that list landed in Task 10.)

**Files:**
- Modify: `css/ui.css` (left-handed confirm bar and rail; legend words under a banner), `src/ui/modes.js` (`back` closes a tray), `src/ui/sheets.js` (focus restore; summary labels from `T`), `src/render/effects.js` (reduced motion read live), `src/ui/createUI.js` (pass the function), `src/render/renderer.js` (live `dpr`, sprite cache cleared on change), `src/ui/text.js` (`bazaar_empty` fix text; `grain`, `lasts`, `working`, `jobs`)
- Test: `tests/ui/carryovers.test.js`; modify `tests/all.js`

**Interfaces:**
- Consumes: `rigUI`, `back`, `INITIAL_UI_STATE`, `createEffects`, `createRenderer`, `createSpriteCache`, `alertText`.
- Produces (`modes.js`): `back(state)` returns `{ dock: 'slim' }` when nothing else is open and `state.dock === 'tray'` in a non-wide layout (after the dialog, sheet, tool and selection cases; the back stack never counts a tray as a step, so this is Esc and right-click only).
- Produces (`sheets.js`): `render()` remembers the index and class of the focused button inside the sheet and focuses the button at the same index after the rebuild when its class matches and it is enabled; the summary's food, employment rows use `T.grain`, `T.lasts`, `T.working`, `T.jobs`.
- Produces (`effects.js`): `createEffects({ reducedMotion })` accepts a boolean or a function (default: the `prefersReducedMotion` function, read live); `fx.reducedMotion` becomes a getter.
- Produces (`renderer.js`): `createRenderer({ dpr })` accepts a number or a function (default: a function reading `window.devicePixelRatio`); when the value changes between frames the sprite cache is cleared; `renderer.dpr` is a getter for the current value.
- Produces (`text.js`): `alertText` for `bazaar_empty` → fix `Build a granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles`; `T.grain = 'Grain'`, `T.lasts = 'Lasts'`, `T.working = 'Working'`, `T.jobs = 'Jobs'`.
- Produces (`css/ui.css`): `body[data-hand="left"] .confirm { flex-direction: row-reverse; }`, `body[data-hand="left"] #rail .bottom { flex-direction: column-reverse; }`; the legend's words under a banner become screen-reader-only instead of `display: none`.

- [ ] **Step 1: Write the failing tests**

`tests/ui/carryovers.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { back, openSheet, select } from '../../src/ui/modes.js';
import { INITIAL_UI_STATE } from '../../src/ui/store.js';
import { createEffects } from '../../src/render/effects.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { createCamera } from '../../src/render/camera.js';
import { makeTestWorld, addRaw, setRoad } from '../helpers/testWorld.js';
import { buildingAt } from '../../src/sim/world.js';
import { alertText, T } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';

describe('ui carry-overs', () => {
  it('mirrors the confirm bar and the rail ticks for left-handed play', async () => {
    const r = await rigUI({ width: 844, height: 390 });                        // compact: the rail
    fire(r.root.querySelectorAll('#rail .cat')[4], 'click');
    fire(r.root.querySelector('#rail .drawer .card'), 'click');
    expect(r.store.get().mode).toBe('placing');
    const bottom = r.root.querySelector('#rail .bottom');
    const bar = r.root.querySelector('#confirm .confirm');
    expect(getComputedStyle(bottom).flexDirection).toBe('column');
    expect(getComputedStyle(bar).flexDirection).toBe('row');
    r.ui.settings.set({ leftHanded: true });
    expect(document.body.dataset.hand).toBe('left');
    expect(getComputedStyle(bottom).flexDirection).toBe('column-reverse');
    expect(getComputedStyle(bar).flexDirection).toBe('row-reverse');
    r.cleanup();
  });
  it('Esc closes an open tray or drawer, and that is not a history step', async () => {
    const r = await rigUI();
    const len = r.history.length;
    fire(r.root.querySelectorAll('#dock .cat')[4], 'click');
    expect(r.store.get().dock).toBe('tray');
    expect(r.history.length).toBe(len);
    key(r.root, 'Escape');
    expect(r.store.get().dock).toBe('slim');
    key(r.root, 'Escape');
    expect(r.store.get().dock).toBe('slim');
    expect(r.history.length).toBe(len);
    expect(back({ ...INITIAL_UI_STATE, layout: 'portrait', dock: 'tray' })).toEqual({ dock: 'slim' });
    expect(back({ ...INITIAL_UI_STATE, layout: 'compact', dock: 'tray' })).toEqual({ dock: 'slim' });
    expect(back({ ...INITIAL_UI_STATE, layout: 'wide', dock: 'tray' })).toBe(null);
    expect(back({ ...INITIAL_UI_STATE, layout: 'portrait', dock: 'tray', sheet: { kind: 'menu', id: null } }).sheet).toBe(null);   // a sheet closes first
    r.cleanup();
  });
  it('puts focus back on the same button after a sheet rebuilds', async () => {
    const r = await rigUI();
    r.store.set(select(r.store.get(), buildingAt(r.world, 15, 11).id));      // the well: Pause and Demolish
    const pause = r.root.querySelector('#sheet .pause');
    pause.focus();
    expect(document.activeElement).toBe(pause);
    r.ui.refresh();                                                             // after a command the sheet is rebuilt
    const again = r.root.querySelector('#sheet .pause');
    expect(again === pause).toBe(false);
    expect(document.activeElement).toBe(again);
    r.store.set(openSheet(r.store.get(), 'minimap'));
    r.root.querySelector('#sheet .zoom-out').focus();
    r.ui.refresh();
    expect(document.activeElement.classList.contains('zoom-out')).toBe(true);
    r.cleanup();
  });
  it('keeps the legend words readable under a banner, and reads reduced motion live', async () => {
    const r = await rigUI();
    r.store.set({ overlay: 'water' });
    r.world.gold = -5;
    r.ui.alerts.refresh();
    expect(document.body.classList.contains('has-banner')).toBe(true);
    const words = r.root.querySelectorAll('#legend .strip .text');
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) { const cs = getComputedStyle(w); expect(cs.display === 'none').toBe(false); expect(cs.width).toBe('1px'); }
    r.ui.settings.set({ reducedMotion: 'off' });
    r.ui.effects.pulse(1, 1, 0);
    expect(r.ui.effects.count(0)).toBe(1);
    r.ui.settings.set({ reducedMotion: 'on' });
    r.ui.effects.pulse(2, 2, 0);
    expect(r.ui.effects.count(0)).toBe(1);                                      // no new pulse once reduced
    expect(r.ui.effects.reducedMotion).toBe(true);
    let flag = false;
    const fx = createEffects({ reducedMotion: () => flag });
    fx.puff(0, 0, 0);
    flag = true;
    fx.puff(0, 0, 0);
    expect(fx.count(0)).toBe(1);
    expect(fx.labelLift(1)).toBe(0);
    expect(createEffects({ reducedMotion: false }).reducedMotion).toBe(false);
    r.cleanup();
  });
```

Continue `tests/ui/carryovers.test.js` (same `describe`):
```js
  it('names the fix for an empty bazaar, keeps every summary label in T, and clears sprites when the pixel ratio changes', async () => {
    const w = makeTestWorld();
    const bazaar = addRaw(w, 'bazaar', 10, 10);
    expect(alertText({ code: 'bazaar_empty', id: bazaar.id }, w).fix).toBe(`Build a granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles`);
    for (const k of ['grain', 'lasts', 'working', 'jobs']) expect(typeof T[k]).toBe('string');
    const src = await (await fetch('/src/ui/sheets.js')).text();
    expect(/row\('[A-Z]/.test(src)).toBe(false);                               // no literal labels left in the sheets
    const r = await rigUI();
    r.store.set(openSheet(r.store.get(), 'summary'));
    const text = r.root.querySelector('#sheet').textContent;
    for (const k of ['grain', 'lasts', 'working', 'jobs']) expect(text).toContain(T[k]);
    r.cleanup();
    const canvas = document.createElement('canvas');
    const counter = {};
    const cache = createSpriteCache({ counter });
    let dpr = 1;
    const renderer = createRenderer({ canvas, dpr: () => dpr, spriteCache: cache, maxBakesPerFrame: Infinity });
    const world = makeTestWorld();
    setRoad(world, 0, 10, 31, 10);
    addRaw(world, 'well', 5, 11);
    addRaw(world, 'temple', 8, 11);
    const cam = createCamera({ x: 6, y: 11, zoom: 1 });
    const view = { width: 300, height: 200 };
    renderer.renderFrame(world, cam, { view });
    expect(renderer.dpr).toBe(1);
    const before = cache.size();
    expect(before).toBeGreaterThan(0);
    renderer.renderFrame(world, cam, { view });
    expect(cache.size()).toBe(before);
    const misses = counter.misses;
    dpr = 2;
    renderer.renderFrame(world, cam, { view });
    expect(renderer.dpr).toBe(2);
    expect(canvas.width).toBe(600);
    expect(cache.size()).toBe(before);                                          // cleared and refilled at 2x, not doubled
    expect(counter.misses).toBe(misses + before);
    expect(createRenderer({ canvas: document.createElement('canvas'), dpr: 3 }).dpr).toBe(3);
  });
});
```

Append to `tests/all.js`:
```js
import './ui/carryovers.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "carry-overs"`
Expected: the five cases FAIL (`flexDirection` is `row`, Esc leaves the tray open, focus lands on `body`, the words are `display: none`, the old fix text, `renderer.dpr` is a function value and sprites double).

- [ ] **Step 3: Make the fixes**

`css/ui.css`: replace `body.has-banner #legend .strip .text { display: none; }` with
```css
/* Under a banner the legend shrinks to its dot and ring; the words stay for screen readers (sr-only). */
body.has-banner #legend .strip .text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
body[data-hand="left"] .confirm { flex-direction: row-reverse; }
body[data-hand="left"] #rail .bottom { flex-direction: column-reverse; }
```

`src/ui/modes.js` `back()`: add before `return null;`:
```js
  if (state.dock === 'tray' && state.layout !== 'wide') return { dock: 'slim' };   // Esc closes an open tray or drawer; never a history step
```

`src/ui/sheets.js` `render()`:
```js
  function render() {
    const s = store.get();
    // A rebuild drops keyboard focus: put it back on the button at the same position when its class matches (spec 6.8).
    const buttons = [...container.querySelectorAll('button')];
    const focusIndex = buttons.indexOf(document.activeElement);
    const focusClass = focusIndex >= 0 ? buttons[focusIndex].className : null;
    clear(container);
    ...unchanged branches...
    container.hidden = false;
    container.append(...parts);
    if (focusIndex >= 0) {
      const again = container.querySelectorAll('button')[focusIndex];
      if (again && again.className === focusClass && !again.disabled) again.focus();
    }
  }
```
and in `summarySheet()` use `row(T.grain, ...)`, `row(T.lasts, ...)`, `row(T.working, ...)`, `row(T.jobs, ...)`.

`src/ui/text.js`: `case 'bazaar_empty': return { title: 'Bazaar is empty', fix: \`Build a granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles\` };` and add to `T`: `grain: 'Grain', lasts: 'Lasts', working: 'Working', jobs: 'Jobs',`.

`src/render/effects.js`: the signature becomes `createEffects({ reducedMotion = prefersReducedMotion, onMilestone = null } = {})` (the function, not its value); add `const reduced = () => (typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : Boolean(reducedMotion));` and use `reduced()` in `puff`, `glow`, `pulse` and `labelLift`; replace the `reducedMotion,` property with `get reducedMotion() { return reduced(); },`. In `src/ui/createUI.js` pass `reducedMotion: settings.reducedMotion` (the function).

`src/render/renderer.js`: 
```js
const defaultDpr = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

export function createRenderer({ canvas, spriteCache = createSpriteCache(), baker = createTerrainBaker(), dpr = defaultDpr, registry = ART, maxBakesPerFrame = 2 }) {
  const dprOf = typeof dpr === 'function' ? dpr : () => dpr;
  let currentDpr = dprOf();
  ...
  function renderFrame(world, cam, opts = {}) {
    const started = performance.now();
    const nextDpr = dprOf();
    if (nextDpr !== currentDpr) { currentDpr = nextDpr; spriteCache.clear(); }   // browser zoom changed: sprites at the old ratio would only pile up
    const dpr = currentDpr;
    ...the rest unchanged...
  }
  return { renderFrame, stats, spriteCache, baker, get dpr() { return currentDpr; } };
}
```
(The terrain baker keys chunks by scale and evicts by its own cap, so it needs no clearing.)

Then regenerate the cache list, because the edited files change the build stamp: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`.

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui carry-overs` PASS, the existing `ui text` (it checks the fix contains the reach number), `render effects`, `ui modes` and `ui pwa` (the build stamp) groups PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add css/ui.css src/ui/modes.js src/ui/sheets.js src/ui/text.js src/render/effects.js src/render/renderer.js src/ui/createUI.js sw-files.js tests/ui/carryovers.test.js tests/all.js
git commit -m "Take the cheap 1c carry-overs: left-handed bar, Esc closes trays, focus restore, live reduced motion, sprite cache on zoom`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: README, publish preparation and the play-test screenshots

**Files:**
- Create: `.nojekyll`, `docs/superpowers/notes/screenshots/1d-title-*.png` and `1d-welcome-*.png` (eight files)
- Modify: `README.md`, `sw-files.js` (regenerated)
- Test: the whole suite; `tests/ui/pwa.test.js` already proves every path is relative and the cache list is current.

**Interfaces:** none new. This task writes words, runs tools and stops.

- [ ] **Step 1: Update the README**

Replace the "Play it" section of `README.md` with:
```markdown
## Play it

    python tests/serve.py 8000 .

Then open http://localhost:8000/. The title card shows a sample city; **New city** starts a fresh one, paused, with 2,000 gold and a road in from the edge. The goals strip under the top bar says what to do next, and **Show me** opens the right card and points at the place.

**Saving.** The game saves on its own at the end of every game month and whenever you leave the page, keeping the previous save as a backup. Come back and **Continue** opens the Welcome back card: how long you were away, what moved, open goals and alerts; **Carry on** restores your speed. A warning banner appears if saving stops working (private browsing, full storage): export your city from the menu.

**Export and import.** Menu → **Export city** shares a `thebes-city-<date>.json` file (or downloads it); **Import city** loads one. Starting a new city offers to export first.

**Install.** On an iPhone the game shows how to add it to the home screen (Share → Add to Home Screen) before you build anything, because the installed app keeps its own storage; if you built in Safari first, export there and **Bring a city from Safari** in the installed app. Android and desktop Chrome or Edge offer **Install** on the title card and in the menu. Installed, it works offline; when a new version is ready, a toast offers **Restart**. Chat apps' built-in browsers cannot install or keep saves: open the link in Safari or Chrome.

**Sound and vibration** are off by default: **Play with sound** on the title card or the Settings sheet turns them on. The iPhone silent switch is respected.

Add `?seed=7` for another map, `?sample=1` for a small ready-made city, `?stress=1` for a full 64×64 city, `?speed=1` to start running, `?skipTitle=1` to skip the title card, `?welcome=1` to see the Welcome back card, or `?nosw=1` to drop the offline cache while developing.

Keys: Space pauses, + and − change the speed, 1–7 pick a build category, arrows or WASD move the view, M opens the minimap, O cycles the overlays, Enter confirms, Esc goes back one step (it also closes an open tray), Ctrl+Z (Cmd+Z) undoes, ? lists the shortcuts. With a mouse: drag to pan, wheel to zoom, click to place. On a phone: one finger pans, two fingers zoom, tap to select or to move the ghost, then ✓.

To try it on a phone on the same network: `python tests/serve.py 8000 . "" 0.0.0.0`, then open `http://<this computer's address>:8000/` on the phone (saving and installing need HTTPS or localhost, so the phone can play but not install from here).

`tests/screenshot.ps1 -Url '/?skipTitle=1&seed=1&sample=1' -Out shot.png -Width 390 -Height 844` saves a PNG of the page from headless Edge at that size.
```
and add before "## Design":
```markdown
## Tools

`tools/render-assets.ps1` redraws the app icons and `og-image.png` with the art code (commit the PNGs). `tools/sw-files.ps1` rewrites `sw-files.js`, the list of files the offline cache holds, with a build stamp; run it after adding or changing files, before a publish (the test suite fails when it is stale).

## Publishing

The site is plain files: GitHub Pages serves `main` from the repository root at `https://joshuahedge.github.io/thebes/`. Every path in the page is relative so it works under that `/thebes/` folder; `.nojekyll` keeps Pages from processing the files.
```

- [ ] **Step 2: Publish preparation**

Create an empty `.nojekyll` at the repository root (`New-Item -ItemType File .nojekyll`). Regenerate the cache list: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`. Check `git status` shows no stray files (the asset tool's `.tmp` files are renamed away; `*.log` is ignored).

- [ ] **Step 3: Run the whole suite**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED` with every group from Tasks 1 to 12.

- [ ] **Step 4: Screenshots at the four spec sizes**

Run, from `C:\dev\thebes`, each line in turn (headless Edge reports reduced motion, so the title backdrop is still):
```powershell
foreach ($s in @(@('phone-portrait', 390, 844), @('phone-landscape', 844, 390), @('tablet', 1024, 768), @('laptop', 1280, 800))) {
  powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?seed=1' -Out "docs/superpowers/notes/screenshots/1d-title-$($s[0]).png" -Width $s[1] -Height $s[2] -BudgetMs 2500
  powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?welcome=1&seed=1' -Out "docs/superpowers/notes/screenshots/1d-welcome-$($s[0]).png" -Width $s[1] -Height $s[2] -BudgetMs 2500
}
```
Expected: eight `Wrote ...` lines. Open each PNG: the title card sits centred over the sample city with New city, Play with sound and (in Edge) Install; the Welcome back card shows the date, "2 hours ago", three trend lines, goals, alerts and Carry on, as a bottom sheet on the phone, a drawer in landscape and in the panel column on the tablet and laptop; nothing covers the middle of the map except the card itself; text is legible at every size. Fix anything the screenshots show before committing, and rerun the suite if code changed.

- [ ] **Step 5: Commit**

```powershell
git add README.md .nojekyll sw-files.js docs/superpowers/notes/screenshots
git commit -m "Prepare the first publish: README, .nojekyll, cache list and the 1d screenshots`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Stop**

Do not create the GitHub repository, add a remote, push, or enable Pages: those are Josh's decisions (spec 8). Report: the branch, the test count, the eight screenshots, and the real-device checks from spec 9 that only he can do (iPhone Safari → install → import; Android Chrome install; a chat app's in-app browser; the link preview).

---

## Self-review

**Spec coverage** (every requirement in the sections this plan owns, and the task that delivers it):

| Spec | Requirement | Task |
|---|---|---|
| 4.1 | Title card: Continue (with a save), New city, Play with sound / Play muted, Install where allowed; a paused, drifting sample city behind it | 6, 9 |
| 4.1 | A new city starts paused with 2,000 gold, the camera on fertile land and the start road | 6 (`createWorld` already does it; the boot keeps it) |
| 4.1 | Goals list: up to three, Show me opens the card and pulses the target, a reward reveals the next; the opening chain; the milestone goal; goals are data | 2, 4 |
| 4.17 | Autosave every game month and when hidden; one slot plus a backup | 1, 3, 6 |
| 4.17 | Reopens paused with Welcome back: date, time since, trends, open goals, alerts with View; Carry on restores the speed | 2 (history), 5, 6 |
| 4.17 | Export through the share sheet with a file, else download; import a file; New city asks and offers Export first | 7 |
| 4.17 | iOS install guide before a city exists; Bring a city from Safari; `navigator.storage.persist()`; in-app browser notice; storage-failure banner | 9, 6, 3 |
| 5.5 | About eight synthesised effects, no music, off by default and remembered, ambient audio session, no silent-switch hack, vibration on ✓ and milestones with a setting | 8 (seven effects; the raid horn is Stage 3) |
| 6.3 | "Update ready" toast only when no placement is in progress; saves first then reloads; "save failing" is a critical banner | 11, 3 |
| 7.1 | Manifest, icons with apple-touch-icon, theme-color, a service worker caching all files; og tags and a committed 1200×630 og:image | 10, 11 |
| 7.5 | IndexedDB with a localStorage fallback; staging → validate → current, previous → backup; backup on a corrupt current; versioned saves, newer refused politely | 1, 6 |
| 8 | Relative paths for `/thebes/`, `.nojekyll`; no repo or Pages setup in the plan | 13 |
| 9 | Saving tests (round trip, migration, backup fallback); first-session flow and screenshots at the four sizes; real-device checks left to Josh | 1, 13 |
| 1a/1b/1c follow-ups | Load error codes, deeper validation, migration guard, no `Object.assign` into the live world, history for trends; sprite cache on dpr change; the cheap 1c items | 1, 6, 12 |

Not covered, on purpose: first-time-event goals, the raid horn, PNG art slots (Stage 2 and later, per the plan header).

**Placeholder scan:** no "TBD", "TODO", "implement later", "similar to Task N" or "add validation" anywhere; every code step shows the code.

**Name consistency** (checked across tasks): `hooks.save(reason)` (3, 6, 7, 11) · `ui.onEvents(events)` (3, 4, 6, 8) · `ui.autosave(reason)` (3, 6, 7) · `ui.setSaveFailed(flag)` (3) · `ui.offerUpdate(apply)` (11) · `ui.sfx` (8) · `customSheets` + `extraSheets` (4, 5, 9) · the `welcome` option `{ savedAt, lastSpeed }` (5, 6) · `rigUI({ width, height, hooks, doc, welcome, sfx })` (3, 5, 8) · `createSaveStore(...).save/load/clear` (1, 6, 7) · `packSave`/`unpackSave` (1, 6, 7) · `startGame(world, { fromSave, savedAt, lastSpeed, notice, saveNow })` (6, 7, 9, 11) · `io = { share, canShare, download, pick, installPrompt, reload }` (7, 9, 11) · `createTitleCard(...).setCanInstall/showGuide/showCard/destroy` (6, 9) · `flow.canInstall/shouldShowGuide/canBring/notice/promptInstall` (9) · `T` keys as listed in each task's Produces block · `TITLE_SEED`, `TITLE_DRIFT_MS`, `SHOW_ME_PULSES`, `SHOW_ME_PULSE_MS`, `SW_PATH`, `UPDATE_TOAST_MS` (data/ui.js).

**Fixes made during the review:** Task 4 also has to replace the help sheet's `T.goalsLater` line in `src/ui/menu.js` (and the matching `tests/ui/menu.test.js` assertion) with `T.goalsHelp`, because `goalsLater` goes away; Task 10 moved ahead of the PWA so the manifest and cache list point at files that exist; the `tests/serve.py` bind host moved from Task 12 to Task 10; Task 11's cache test also checks the build stamp against the served bytes, so a stale `sw-files.js` fails the suite (Tasks 12 and 13 regenerate it).

## Execution notes for the controller

Run with superpowers:subagent-driven-development as 1c was: a fresh implementer per task (haiku for the transcription-heavy tasks 1, 2, 7, 10, 12; sonnet for the integration tasks 3, 4, 5, 6, 8, 9, 11, 13), a sonnet reviewer after each task with the task's named risks, a fable final review of the whole branch, one fix wave, then merge to main and screenshots for Josh. Every implementer commit carries the `Co-Authored-By: Claude Opus 5.5` trailer; amend any that does not. Headless Edge reports `prefers-reduced-motion: reduce`: tests that expect a tween set the setting off first (Task 4 does). After the merge, write `docs/superpowers/notes/2026-10-11-stage-1d-followups.md` from the review leftovers, then stop and ask Josh about the public repository and Pages.
