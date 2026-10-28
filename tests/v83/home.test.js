// After 8.3 (ruling 1454), Josh's ask: a Home in the game menu, since nothing took a player back to the title. Home saves the city, then shows the title with
// Continue, which brings the same city back; a city that cannot be saved stays open and says why. The lesson keeps its own way home (Leave the lesson).
import { describe, it, expect } from '../harness.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { T } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';
import { fire, openNewCity } from '../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

async function bootAt({ width = 390, height = 844, store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true }) });
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}
const title = (r) => r.root.querySelector('#title');
async function intoGame(r) { openNewCity(r.root); fire(title(r).querySelector('.start-city'), 'click'); await frame(); return r.api.game(); }
const settle = async () => { for (let i = 0; i < 6; i++) await frame(); };
function openMenu(r) { const g = r.api.game(); g.ui.store.set(openSheet(g.ui.store.get(), 'menu')); return r.root.querySelector('.menu-list'); }

describe('v83 home: the game menu has Home, back to the title', () => {
  it('sits right under Continue, a 44 px button named Home', async () => {
    const r = await bootAt();
    try {
      await intoGame(r);
      const list = openMenu(r);
      const buttons = [...list.querySelectorAll('button')];
      expect(buttons.slice(0, 2).map((b) => b.textContent)).toEqual([T.continueGame, T.home]);
      const home = list.querySelector('.menu-home');
      expect(home.getBoundingClientRect().height >= 44).toBe(true);
    } finally { r.cleanup(); }
  });
  it('saves the city and shows the title with Continue; Continue brings the same city back', async () => {
    const r = await bootAt();
    try {
      const g = await intoGame(r);
      g.world.gold = 4321;
      fire(openMenu(r).querySelector('.menu-home'), 'click');
      await settle();
      expect([Boolean(title(r)), r.api.game()]).toEqual([true, null]);
      const cont = title(r).querySelector('.continue');
      expect(Boolean(cont)).toBe(true);
      fire(cont, 'click');
      await settle();
      expect(Math.round(r.api.game().world.gold)).toBe(4321);
    } finally { r.cleanup(); }
  });
  it('keeps the city open and says why when it cannot be saved', async () => {
    const real = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const failing = { ...real, save: async () => ({ ok: false, code: 'quota' }) };
    const r = await bootAt({ store: failing });
    try {
      const g = await intoGame(r);
      fire(openMenu(r).querySelector('.menu-home'), 'click');
      await settle();
      expect(r.api.game() === g).toBe(true);
      expect(r.root.textContent.includes(T.homeNotSaved)).toBe(true);
    } finally { r.cleanup(); }
  });
});
