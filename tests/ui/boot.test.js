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
