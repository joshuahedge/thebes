// Version 9.0 Track L (rulings 1585-1587): the list, Play this map, the export's records and the install ask, through boot.js, where they are wired. The lesson has
// none of the list, Bring rulers or the ruler name.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { packSave } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { INSTALL_ASK_KEY, createInstallFlow, detectEnvironment, installAskDue } from '../../../src/save/installFlow.js';
import { installGuide } from '../../../src/ui/installUi.js';
import { openSheet } from '../../../src/ui/modes.js';
import { T, V90_L_TEXT } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire, mount } from '../../helpers/dom.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const until = async (cond) => { for (let i = 0; i < 60 && !cond(); i++) await flush(); };
const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const ruler = (i, over = {}) => ({ id: `c${i}:3600`, n: 1, name: 'Ramesses', title: 'builder', heir: 'steady', rank: 'city', day: 3600, score: 200 + i, parts: PARTS, medal: 'silver', version: 2, seed: 4000 + i, difficulty: 'hard', mapVariant: 'island', mapSize: 80, map: '', feats: [], date: i, ...over });
const rival = { name: 'Ana', heir: 'merchant', seed: 4001, difficulty: 'hard', mapVariant: 'island', mapSize: 80, score: 300, parts: PARTS, splits: {}, version: 2, added: 5 };
const RECORDS = { version: 2, cities: [], chronicle: [], rulers: [ruler(1), ruler(2)], rivals: [rival], dynasty: { name: 'Khufu', heir: 'steady' } };
const CHROME = 'Mozilla/5.0 (Linux; Android 14) Chrome/124.0 Mobile';

function memory(start = {}) {
  const data = { 'thebes.settings': '{"cardsSeen":true,"lessonDone":true}', ...start };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

async function bootRig({ params = '', records = RECORDS, store = createSaveStore({ idb: fakeIndexedDB(), local: null }), storage = memory(records ? { [RECORDS_KEY]: JSON.stringify(records) } : {}),
  env = { ua: CHROME, standalone: false, hasBeforeInstallPrompt: true }, platform = {} } = {}) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage, platform, envInput: env, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: { getItem: () => null, setItem() {} } },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, storage, store, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}
const sheetText = (r) => r.root.querySelector('#sheet');
const toasts = (r) => [...r.root.querySelectorAll('#toasts .toast .text')].map((n) => n.textContent);

describe('v90 l boot: the export carries the rulers and rivals', () => {
  it('writes the device\'s rulers, rivals and dynasty into the exported file', async () => {
    const files = [];
    const r = await bootRig({ params: 'skipTitle=1', platform: { download: (f) => files.push(f), share: null, canShare: null } });
    try {
      await r.api.hooks.exportCity();
      const file = JSON.parse(await files[0].text());
      expect([file.records.rulers.map((x) => x.id), file.records.rivals.map((v) => v.name), file.records.dynasty.name]).toEqual([['c1:3600', 'c2:3600'], ['Ana'], 'Khufu']);
    } finally { r.cleanup(); }
  });
});

describe('v90 l boot: the list in the game', () => {
  it('opens the list from the menu\'s Rulers as one sheet, newest first', async () => {
    const r = await bootRig({ params: 'skipTitle=1' });
    try {
      const ui = r.api.game().ui;
      ui.store.set(openSheet(ui.store.get(), 'menu'));
      const rulers = [...r.root.querySelectorAll('#sheet .menu-list button')].find((b) => b.classList.contains('menu-rulers'));
      expect(rulers.textContent).toBe('Rulers');
      fire(rulers, 'click');
      expect(ui.store.get().sheet.kind).toBe('rulers');
      expect(sheetText(r).querySelector('h2').textContent).toBe('Rulers');
      expect([...sheetText(r).querySelectorAll('.ruler')].map((x) => x.dataset.id)).toEqual(['c2:3600', 'c1:3600']);
    } finally { r.cleanup(); }
  });
  it('Play this map keeps the row\'s seed, level, layout and size, opens New city over a paused game, and Start asks the replace question first', async () => {
    const r = await bootRig({ params: 'skipTitle=1' });
    try {
      const g = r.api.game(), old = g.world;
      g.ui.speedControl.set(1);
      r.api.hooks.rulers();
      fire(sheetText(r).querySelector('.ruler-row'), 'click');
      fire(sheetText(r).querySelector('.play-map'), 'click');
      expect(g.ui.store.get().sheet.kind).toBe('newCity');
      expect(old.speed).toBe(0);
      expect(r.api.hooks.newCityChoices.get()).toEqual({ mapSize: 'large', layout: 'island', seed: 4002 });
      const card = sheetText(r);
      expect(card.querySelector('.choice.difficulty[aria-pressed="true"]').dataset.value).toBe('hard');
      fire(card.querySelector('.start-city'), 'click');
      expect(r.root.querySelector('#dialog').textContent.includes(T.newCityConfirm)).toBe(true);   // the replace question, as New city asks it
      expect(r.api.game().world).toBe(old);
      fire(r.root.querySelector('#dialog .ok'), 'click');
      const w = r.api.game().world;
      expect([w === old, w.seed, w.difficulty, w.mapVariant, w.mapSize]).toEqual([false, 4002, 'hard', 'island', 80]);
    } finally { r.cleanup(); }
  });
});

describe('v90 l boot: the list on the title card', () => {
  it('shows the records box\'s Rulers button, opens the list as the card\'s one panel with Back, and Play this map opens the new-city card on that map', async () => {
    const r = await bootRig();
    try {
      const title = r.root.querySelector('#title');
      const open = title.querySelector('.title-records .rulers-open');
      expect([open.textContent, open.getAttribute('aria-label')]).toEqual(['Rulers (2)', 'Open the ruler list, 2 rulers kept on this device']);
      fire(open, 'click');
      expect([...title.querySelectorAll('.ruler')].map((x) => x.dataset.id)).toEqual(['c2:3600', 'c1:3600']);
      expect(title.querySelectorAll('.guide').length).toBe(1);                          // one panel at a time
      fire(title.querySelector('.guide .guide-back'), 'click');
      expect(title.querySelector('.guide')).toBe(null);
      fire(title.querySelector('.rulers-open'), 'click');
      fire(title.querySelector('.ruler-row'), 'click');
      fire(title.querySelector('.play-map'), 'click');
      expect(title.querySelector('.new-city-body')).toBeTruthy();
      expect(title.querySelector('.choice.difficulty[aria-pressed="true"]').dataset.value).toBe('hard');
      expect(title.querySelector('.layout-select').value).toBe('island');
      expect(title.querySelector('.choice.mapsize[aria-pressed="true"]').dataset.value).toBe('large');
      fire(title.querySelector('.start-city'), 'click');
      await until(() => r.api.phase() === 'game');
      const w = r.api.game().world;
      expect([w.seed, w.difficulty, w.mapVariant, w.mapSize]).toEqual([4002, 'hard', 'island', 80]);
    } finally { r.cleanup(); }
  });
  it('asks the replace question when a city is saved, and has no Rulers button on a device with none', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await store.save(packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 3600000, lastSpeed: 1 }));
    const r = await bootRig({ store });
    try {
      const title = r.root.querySelector('#title');
      fire(title.querySelector('.rulers-open'), 'click');
      fire(title.querySelector('.ruler-row'), 'click');
      fire(title.querySelector('.play-map'), 'click');
      fire(title.querySelector('.start-city'), 'click');
      expect(title.querySelector('.start-new')).toBeTruthy();
      expect(title.textContent.includes(T.newCityConfirm)).toBe(true);
      expect(r.api.phase()).toBe('title');
    } finally { r.cleanup(); }
    const none = await bootRig({ records: null });
    try { expect(none.root.querySelector('#title .rulers-open')).toBe(null); } finally { none.cleanup(); }
  });
});

describe('v90 l boot: the lesson has none of it', () => {
  it('leaves Rulers out of the lesson\'s menu and the ruler name and Bring rulers out of its Options', async () => {
    const r = await bootRig({ storage: memory({ [RECORDS_KEY]: JSON.stringify(RECORDS), 'thebes.settings': '{"cardsSeen":true}' }) });
    try {
      r.api.hooks.lesson({ step: 0 });
      const g = r.api.game();
      expect(g.lesson).toBe(true);
      g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
      expect(r.root.querySelector('#sheet .menu-rulers')).toBe(null);
      g.ui.store.set(openSheet(g.ui.store.get(), 'settings'));
      expect([r.root.querySelector('#sheet .ruler-name-row'), r.root.querySelector('#sheet .bring-row')]).toEqual([null, null]);
      g.ui.store.set(openSheet(g.ui.store.get(), 'rulers'));
      expect(r.root.querySelector('#sheet .ruler')).toBe(null);                          // no sheet of that name in the lesson
      await flush();
      expect(toasts(r).filter((t) => t === V90_L_TEXT.installAsk(false))).toEqual([]);
    } finally { r.cleanup(); }
  });
});

describe('v90 l boot: the install ask', () => {
  const asks = (r) => toasts(r).filter((t) => t === V90_L_TEXT.installAsk(false));
  const withPersist = async (fn) => {
    const calls = [];
    const had = Object.getOwnPropertyDescriptor(navigator.storage, 'persist');
    Object.defineProperty(navigator.storage, 'persist', { configurable: true, value: () => { calls.push(1); return Promise.resolve(true); } });
    try { await fn(calls); } finally { if (had) Object.defineProperty(navigator.storage, 'persist', had); else delete navigator.storage.persist; }
  };
  it('comes once at the first city after a ruler, with Install, and asks storage to persist again', async () => {
    await withPersist(async (calls) => {
      const r = await bootRig({ params: 'skipTitle=1' });
      try {
        expect(asks(r)).toEqual([V90_L_TEXT.installAsk(false)]);
        expect(r.root.querySelector('#toasts .toast .action').textContent).toBe('Install');
        expect(r.storage.getItem(INSTALL_ASK_KEY)).toBe('1');
        await flush();
        const first = calls.length;                                                      // the Pass's own ask (skipTitle's city is not saved yet, so no save's)
        expect(first).toBe(1);
        r.api.hooks.newCity();                                                           // a second city: the toast is not made again; only its first save asks
        await flush(); await flush();
        expect(asks(r).length <= 1).toBe(true);
        expect(calls.length - first <= 1).toBe(true);
      } finally { r.cleanup(); }
      const before = calls.length;
      const none = await bootRig({ params: 'skipTitle=1', records: null });              // the same start with no ruler asks nothing
      try { await flush(); expect(calls.length).toBe(before); } finally { none.cleanup(); }
    });
  });
  it('keeps the ask for later when the device cannot install yet (Chrome before its prompt), and marks an installed device as done', async () => {
    const early = await bootRig({ params: 'skipTitle=1', env: { ua: CHROME, standalone: false, hasBeforeInstallPrompt: false } });
    try { expect([asks(early), early.storage.getItem(INSTALL_ASK_KEY)]).toEqual([[], null]); } finally { early.cleanup(); }
    const installed = await bootRig({ params: 'skipTitle=1', env: { ua: CHROME, standalone: true, hasBeforeInstallPrompt: true } });
    try { expect([asks(installed), installed.storage.getItem(INSTALL_ASK_KEY)]).toEqual([[], '1']); } finally { installed.cleanup(); }
  });
  it('does not come on a device with no ruler, one already asked, or one that cannot install', async () => {
    const none = await bootRig({ params: 'skipTitle=1', records: null });
    try { expect([asks(none), none.storage.getItem(INSTALL_ASK_KEY)]).toEqual([[], null]); } finally { none.cleanup(); }
    const asked = await bootRig({ params: 'skipTitle=1', storage: memory({ [RECORDS_KEY]: JSON.stringify(RECORDS), [INSTALL_ASK_KEY]: '1' }) });
    try { expect(asks(asked)).toEqual([]); } finally { asked.cleanup(); }
    const installed = await bootRig({ params: 'skipTitle=1', env: { ua: CHROME, standalone: true, hasBeforeInstallPrompt: true } });
    try { expect(asks(installed)).toEqual([]); } finally { installed.cleanup(); }
    const inApp = await bootRig({ params: 'skipTitle=1', env: { ua: 'Mozilla/5.0 (iPhone) Instagram', standalone: false, hasBeforeInstallPrompt: false } });
    try { expect(asks(inApp)).toEqual([]); } finally { inApp.cleanup(); }
  });
  it('is the list\'s top line while a ruler is kept and the device can install, gone once it is installed', async () => {
    const r = await bootRig({ params: 'skipTitle=1' });
    try {
      r.api.hooks.rulers();
      expect(sheetText(r).querySelector('.rulers-install .install-ask').textContent).toBe(V90_L_TEXT.installAsk(false));
    } finally { r.cleanup(); }
    const done = await bootRig({ params: 'skipTitle=1', env: { ua: CHROME, standalone: true, hasBeforeInstallPrompt: true } });
    try {
      done.api.hooks.rulers();
      expect([sheetText(done).querySelector('.rulers-install'), sheetText(done).querySelectorAll('.ruler').length]).toEqual([null, 2]);
    } finally { done.cleanup(); }
  });
  it('decides from the flow: due only with a ruler, not asked, and a device that can install; and the iOS guide adds the export-then-bring line', () => {
    const flow = (env) => createInstallFlow({ env: detectEnvironment(env) });
    const android = flow({ ua: CHROME, standalone: false, hasBeforeInstallPrompt: true }), ios = flow({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari', standalone: false }), standalone = flow({ ua: CHROME, standalone: true, hasBeforeInstallPrompt: true });
    expect([installAskDue(android, { rulers: 1 }), installAskDue(android, { rulers: 0 }), installAskDue(android, { rulers: 1, asked: true }), installAskDue(ios, { rulers: 2 }), installAskDue(standalone, { rulers: 2 })]).toEqual([true, false, false, true, false]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      installGuide(ios, { hasCity: true })(body);
      expect(body.querySelector('.install-bring').textContent).toBe('The installed app starts empty. Export first, then Bring rulers from a file in the app.');
      const other = mount('<div id="b2"></div>');
      installGuide(android, {})(other.root.querySelector('#b2'));
      expect(other.root.querySelector('.install-bring')).toBe(null);
      other.cleanup();
    } finally { cleanup(); }
  });
});

describe('v90 l boot: fix wave (Play this map backed out of; the install ask on iOS)', () => {
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari';
  const playFirst = (r) => { r.api.hooks.rulers(); fire(sheetText(r).querySelector('.ruler-row'), 'click'); fire(sheetText(r).querySelector('.play-map'), 'click'); };
  const levelOf = (card) => card.querySelector('.choice.difficulty[aria-pressed="true"]').dataset.value;
  it('puts the level, size, layout and seed back when New city is backed out of with Back or Esc, and keeps them when a city starts', async () => {
    const r = await bootRig({ params: 'skipTitle=1' });
    try {
      const g = r.api.game(), before = r.api.hooks.newCityChoices.get();
      playFirst(r);
      expect(r.api.hooks.newCityChoices.get()).toEqual({ mapSize: 'large', layout: 'island', seed: 4002 });
      fire(sheetText(r).querySelector('.guide-back'), 'click');                           // Back
      expect([g.ui.store.get().sheet, r.api.hooks.newCityChoices.get()]).toEqual([null, before]);
      g.ui.store.set(openSheet(g.ui.store.get(), 'newCity'));
      expect(levelOf(sheetText(r))).toBe('normal');                                       // the device's level is as it was
      const shown = r.api.hooks.newCityChoices.get();                                     // the card drew a preview seed of its own
      g.ui.store.set({ sheet: null });
      playFirst(r);
      g.ui.store.set({ sheet: null });                                                    // Esc closes the sheet the same way
      expect(r.api.hooks.newCityChoices.get()).toEqual(shown);
      playFirst(r);
      fire(sheetText(r).querySelector('.start-city'), 'click');
      fire(r.root.querySelector('#dialog .ok'), 'click');
      expect(r.api.game().world.seed).toBe(4002);
      expect(r.api.hooks.newCityChoices.get().mapSize).toBe('large');                     // a Start keeps what Play this map chose
    } finally { r.cleanup(); }
  });
  it('does the same on the title card: Back from the card it opened restores the choices', async () => {
    const r = await bootRig();
    try {
      const title = r.root.querySelector('#title'), before = r.api.hooks.newCityChoices.get();
      fire(title.querySelector('.rulers-open'), 'click');
      fire(title.querySelector('.ruler-row'), 'click');
      fire(title.querySelector('.play-map'), 'click');
      expect(title.querySelector('.choice.mapsize[aria-pressed="true"]').dataset.value).toBe('large');
      fire(title.querySelector('.guide-back'), 'click');
      expect(r.api.hooks.newCityChoices.get()).toEqual(before);
      fire(title.querySelector('.new-city'), 'click');
      expect([title.querySelector('.choice.mapsize[aria-pressed="true"]').dataset.value, levelOf(title)]).toEqual([before.mapSize, 'normal']);
    } finally { r.cleanup(); }
  });
  it('says the Safari line in the toast and the list on an iOS device, and the plain ask on any other', async () => {
    const ios = await bootRig({ params: 'skipTitle=1', env: { ua: IOS, standalone: false, hasBeforeInstallPrompt: false } });
    try {
      expect(toasts(ios)).toContain(V90_L_TEXT.installAsk(true));
      ios.api.hooks.rulers();
      expect(sheetText(ios).querySelector('.install-ask').textContent.includes('Safari clears a site\'s data after 7 days')).toBe(true);
    } finally { ios.cleanup(); }
    const other = await bootRig({ params: 'skipTitle=1' });
    try {
      expect(toasts(other)).toContain('Install Thebes to keep your rulers');
      other.api.hooks.rulers();
      expect(sheetText(other).querySelector('.install-ask').textContent).toBe('Install Thebes to keep your rulers');
    } finally { other.cleanup(); }
  });
});
