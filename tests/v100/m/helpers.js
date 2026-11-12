// Version 10.0, Track M: the phone leftovers' tests boot the real game at a phone's size and text size, the way tests/v931/l/layout.test.js does.
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };
export const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const LESSON_CITY = 'skipTitle=1&seed=7';
export const SAMPLE_CITY = 'skipTitle=1&seed=11&sample=1';

export async function bootAt(params, width, height, textSize, { settings = {}, uiOptions = {} } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  let skew = 0;
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params),
    now: () => performance.now() + skew, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage, ...uiOptions },
  });
  api.game().ui.settings.set({ textSize, reducedMotion: 'on', ...settings });
  await frame();
  return {
    api, root: shell.root, skip(ms) { skew += ms; },
    cleanup() { document.documentElement.style.removeProperty('--safe-right'); api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; },
  };
}
export const rect = (root, sel) => { const n = root.querySelector(sel); return n ? n.getBoundingClientRect() : null; };
export const visible = (n) => Boolean(n) && !n.hidden && n.getBoundingClientRect().height > 0;
