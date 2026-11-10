// Version 9.3 Track U: the page as a screen shows the title and the decree's game, shared by the v93 u tests (the shape of tests/v711/lessonPage.js).
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

export const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
export const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function waitFor(fn, ms = 3000) { for (let t = 0; t < ms; t += 40) { if (fn()) return true; await wait(40); } return fn(); }

export const MONDAY_47 = Date.UTC(2026, 10, 16, 12);   // 2026-W47, the epoch week: the Sea Peoples
export const MONDAY_48 = Date.UTC(2026, 10, 23, 12);   // 2026-W48: Low Nile
export const MONDAY_50 = Date.UTC(2026, 11, 7, 12);    // 2026-W50: index 3, a pair week (Low Nile and Golden caravans)
export const WITH_TOWN = { cities: [{ id: 'c1', seed: 5, difficulty: 'normal', scoreVersion: 3, best: 200, bestDay: 300, medal: null, splits: { town: 120 }, updated: 1 }] };

// records: a records blob to write first (merged over the empty one); clock: the device's time; decreeStore: the decree slot; runs on a phone-sized shell by default.
export async function titleAt({ width = 390, height = 844, textSize = 100, records = null, clock = MONDAY_47, decreeStore = createSaveStore({ idb: fakeIndexedDB(), local: null }), store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const data = { 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true, textSize, motion: 'still', motionRig: true }) };
  if (records) data[RECORDS_KEY] = JSON.stringify({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty: { name: '', heir: 'steady' }, ...records });
  const storage = memory(data);
  const api = await boot(document, window, {
    root: document.body, store, decreeStore, params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => clock, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  await frame();
  return { api, root: document.body, shell, storage, decreeStore, store, g: () => api.game(), kind: () => { const g = api.game(); const s = g && g.ui.store.get().sheet; return s && s.kind; },
    cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'decree-on'); delete window.__thebes; } };
}

// A decree run of `week`, begun (the first screen answered).
export async function runAt(week, opts = {}) {
  const t = await titleAt(opts);
  t.api.startDecree(week);
  await frame();
  return t;
}
