// Version 7.1.1: the page as a screen opens the lesson, shared by the v711 tests (as tests/v71/fa/lesson.test.js does it: the game booted on the real shell, then the lesson hook).
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { LESSON_STEPS } from '../../src/data/lesson.js';
import { tickDay } from '../../src/sim/clock.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';

export const stepIndex = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
export const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
export const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

// settings: what the device has saved (a string of JSON is merged under the defaults); stepId: the lesson step to open at (null: stay on the title); store: a save store.
export async function pageAt(stepId, { width = 390, height = 844, textSize = 100, settings = {}, store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, textSize, motion: 'still', ...settings }) });
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  if (stepId !== null) api.hooks.lesson({ step: stepIndex(stepId) });
  await frame();
  const g = () => api.game();
  const io = {
    tick() { const events = []; tickDay(g().world, events); g().ui.onEvents(events); g().ui.refresh(); },
    did() { g().ui.afterCommand({ kind: 'lesson-test', text: '' }); },
  };
  return { api, g, root: shell.root, io, storage, store, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-names-alert', 'lesson-card-up'); delete window.__thebes; } };
}
export const cardOf = (s) => { const c = s.root.querySelector('.lesson-card'); return c && c.offsetParent !== null ? c : null; };
export const rect = (n) => { const r = n.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
export const overlaps = (a, b) => a.width > 0 && b.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
