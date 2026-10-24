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
import { fire, startNewCity } from '../helpers/dom.js';
import { openSheet } from '../../src/ui/modes.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
// Stage 4 (Track G): the picture cards were seen on this device, so New city starts the city at once.
const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true,"lessonDone":true}' : null), setItem: () => {} };   // Version 6.0 (Track D2): the picture cards were seen and the lesson done, so the title offers New city
const until = async (cond) => { for (let i = 0; i < 50 && !cond(); i++) await flush(); };

// The real page shell, a fake store and no animation frames: loops never run, so every frame is explicit.
async function bootRig({ params = '', store = createSaveStore({ idb: fakeIndexedDB(), local: null }), clock = () => 1760000000000, platform = {}, sw = null, envInput = { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' } } = {}) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(params), now: () => 0, clock, storage: noStorage, platform, envInput, sw,
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
    startNewCity(title);
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
    startNewCity(title);
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
  it('builds a clean second game when a new city replaces the first, and leaves the shell empty on destroy', async () => {
    const r = await bootRig({ params: 'skipTitle=1&seed=8' });
    const first = r.api.game();
    r.api.hooks.newCity();
    const second = r.api.game();
    expect(second === first).toBe(false);
    expect(second.world === first.world).toBe(false);
    expect(r.root.querySelectorAll('#topbar .menu').length).toBe(1);
    expect(r.root.querySelectorAll('#dock .handle').length).toBe(1);
    expect(r.root.querySelectorAll('#confirm').length).toBe(1);
    expect(r.root.querySelectorAll('.goal-strip').length).toBe(1);
    expect(r.root.querySelector('#sheet').hidden).toBe(true);
    expect(document.body.dataset.mode).toBe('browse');
    r.api.startGame(createWorld({ seed: 9 }));                                 // and once more, to be sure
    expect(r.root.querySelectorAll('#topbar .menu').length).toBe(1);
    expect(r.root.querySelectorAll('#confirm').length).toBe(1);
    r.api.destroy();
    expect(r.root.querySelector('#topbar').children.length).toBe(0);
    expect(r.root.querySelector('#dock').children.length).toBe(0);
    expect(r.root.querySelectorAll('#confirm').length).toBe(0);
    r.cleanup();
  });
  it('exports after saving (Options > Saves), has no import (Version 8.0), and offers Export first before a new city', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const shared = [], downloaded = [];
    let canShare = true;
    const platform = { share: async (d) => { shared.push(d); }, canShare: () => canShare, download: (f) => downloaded.push(f) };
    const r = await bootRig({ store, params: 'skipTitle=1&seed=8', platform });
    const g = r.api.game();
    const menuButton = (text) => [...r.root.querySelectorAll('#sheet button')].find((b) => b.textContent.trim() === text);
    g.ui.store.set(openSheet(g.ui.store.get(), 'settings'));
    expect(r.root.querySelector('#sheet .options-group.saves .export-city')).toBeTruthy();   // Version 8.0: Export city lives under Saves
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
    expect([typeof r.api.hooks.importCity, [...r.root.querySelectorAll('#sheet button')].some((b) => /import/i.test(b.textContent))]).toEqual(['undefined', false]);   // no import hook, no Import row
    const g2 = g;
    g2.ui.store.set(openSheet(g2.ui.store.get(), 'menu'));
    expect(menuButton(T.exportCity)).toBe(undefined);                          // the menu no longer lists Export (it is under Options > Saves)
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
    startNewCity(title);
    const gi = r.api.game();
    const notice = r.root.querySelector('#notice');
    expect(getComputedStyle(notice).display === 'none').toBe(false);                    // and during play, under the top bar
    expect(notice.getBoundingClientRect().top >= r.root.querySelector('#topbar').getBoundingClientRect().bottom).toBe(true);
    gi.world.gold = -30; gi.ui.alerts.refresh();
    expect(r.root.querySelector('#banner').getBoundingClientRect().top >= notice.getBoundingClientRect().bottom).toBe(true);
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
    startNewCity(title);
    const g = r.api.game();
    g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
    const installItem = [...r.root.querySelectorAll('#sheet button')].find((b) => b.textContent.trim() === T.installMenu);
    expect(installItem).toBeTruthy();
    fire(installItem, 'click');
    await flush();
    expect(prompts).toEqual(['prompt', 'prompt']);
    r.cleanup();
    r = await bootRig({ envInput: { ua: IOS, standalone: true } });
    title = r.root.querySelector('#title');
    expect(title.querySelector('.install').hidden).toBe(true);
    expect(title.querySelector('.bring')).toBe(null);                                   // Version 8.0: the home-screen app offers no Bring a city
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
});

describe('ui boot, final review', () => {
  it('asks before a new city replaces a saved one: Export first leaves the slot alone, Back returns, Start new city begins afresh', async () => {
    const idb = fakeIndexedDB();
    const store = createSaveStore({ idb, local: null });
    const saved = packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 7200000, lastSpeed: 2 });
    await store.save(saved);
    const downloaded = [];
    const r = await bootRig({ store, platform: { share: null, canShare: null, download: (f) => downloaded.push(f) } });
    const title = r.root.querySelector('#title');
    startNewCity(title);
    await flush(); await flush();
    expect(r.api.phase()).toBe('title');                                       // nothing started, nothing demoted
    expect(title.querySelector('.guide').textContent).toContain(T.newCityConfirm);
    expect(title.querySelector('.title-buttons').hidden).toBe(true);
    fire(title.querySelector('.panel-back'), 'click');
    expect(title.querySelector('.guide')).toBe(null);
    expect(title.querySelector('.title-buttons').hidden).toBe(false);
    startNewCity(title);
    fire(title.querySelector('.export-first'), 'click');
    await flush(); await flush();
    expect(downloaded.length).toBe(1);
    expect(await downloaded[0].text()).toBe(saved);                            // the saved city, byte for byte
    expect(title.querySelector('.message').textContent).toBe(T.exported);
    expect(r.api.phase()).toBe('title');
    expect(idb.records.get('current')).toBe(saved);
    expect(idb.records.has('backup')).toBe(false);
    fire(title.querySelector('.start-new'), 'click');
    expect(r.api.phase()).toBe('game');
    expect(r.api.game().world.seed === 4).toBe(false);
    await flush(); await flush();
    expect((await loadSave(store)).world.seed).toBe(r.api.game().world.seed);
    expect(idb.records.get('backup')).toBe(saved);                             // only now does the old city become the backup
    r.cleanup();
  });
  it('lets the development flags look in the slot but never write to it, and never overwrite a newer save', async () => {
    const idb = fakeIndexedDB();
    const store = createSaveStore({ idb, local: null });
    let r = await bootRig({ store, params: 'skipTitle=1&seed=8' });
    await flush(); await flush();
    expect(idb.records.has('current')).toBe(false);                            // nothing is written before an autosave
    r.cleanup();
    r = await bootRig({ store, params: 'welcome=1&seed=8' });
    await flush(); await flush();
    expect(idb.records.has('current')).toBe(false);
    r.cleanup();
    const newer = JSON.stringify({ version: 99, world: {} });
    idb.records.set('current', newer);
    for (const params of ['skipTitle=1&seed=8', 'welcome=1&seed=8']) {
      r = await bootRig({ store, params });
      await r.api.game().ui.autosave('month');
      expect(idb.records.get('current')).toBe(newer);
      expect(idb.records.has('backup')).toBe(false);
      r.cleanup();
    }
  });
  it('shares one audio context across games', async () => {
    const r = await bootRig({ params: 'skipTitle=1&seed=8' });
    const first = r.api.game().ui.sfx;
    r.api.hooks.newCity();
    expect(r.api.game().ui.sfx).toBe(first);
    r.cleanup();
  });
  it('says the installed app starts without the city in the install guide when a city is saved, and the title exports it from Options > Saves', async () => {
    const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
    let r;
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await store.save(packSave(createWorld({ seed: 4 })));
    r = await bootRig({ store, envInput: { ua: IOS } });
    const title = r.root.querySelector('#title');
    if (!title.querySelector('.guide')) { fire(title.querySelector('.install'), 'click'); await flush(); }
    expect(title.querySelector('.guide').textContent).toContain(T.installExportFirst);
    fire(title.querySelector('.guide-back'), 'click');
    // Options on the title, with a city saved: Saves > Export city exports the city in the slot (Version 8.0).
    fire(title.querySelector('.title-settings'), 'click');
    expect(title.querySelector('.options-group.saves .export-city')).toBeTruthy();
    r.cleanup();
  });
  it('keeps the update waiting and says so when the restart cannot save', async () => {
    const worker = { state: 'installed', posted: [], addEventListener() {}, postMessage(m) { worker.posted.push(m); } };
    const reg = { waiting: worker, installing: null, addEventListener() {} };
    const sw = { controller: {}, async register() { return reg; }, addEventListener() {} };
    const idb = fakeIndexedDB();
    idb.records.set('current', JSON.stringify({ version: 99, world: {} }));      // saving is off, so the restart's save fails
    const r = await bootRig({ store: createSaveStore({ idb, local: null }), params: 'skipTitle=1&seed=3', sw });
    await flush(); await flush();
    fire(r.root.querySelector('#toasts .toast button'), 'click');
    await flush(); await flush();
    expect(worker.posted).toEqual([]);
    expect(r.root.querySelector('#toasts').textContent).toContain(T.updateSaveFailed);
    r.cleanup();
  });
});
