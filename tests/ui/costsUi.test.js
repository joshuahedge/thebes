import { describe, it, expect } from '../harness.js';
import { cardInfo } from '../../src/ui/cards.js';
import { toolPreview, createPlacement } from '../../src/ui/placement.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { nudgeLineText } from '../../src/ui/nudge.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { alertText, T } from '../../src/ui/text.js';
import { GOALS } from '../../src/data/goals.js';
import { ECONOMY } from '../../src/data/economy.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { place } from '../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';

// Road along y = 10, at the given difficulty.
function cityAt(difficulty, gold = 1000) {
  const w = makeTestWorld({ gold });
  w.difficulty = difficulty;
  setRoad(w, 0, 10, 31, 10);
  return w;
}

function storageWith(value) {
  const data = value ? { 'thebes.settings': JSON.stringify(value) } : {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

// The real page shell with boot, rigged as tests/ui/boot.test.js rigs it, but with settings storage of our own.
async function bootWith({ storage, params = '' }) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params), now: () => 0,
    clock: () => 1760000000000, storage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('ui costs by difficulty', () => {
  it('shows each city its own costs on cards, and judges them affordable against those', () => {
    const hard = cityAt('hard');
    expect(cardInfo(hard, 'well')).toEqual({ item: 'well', name: 'Well', cost: 38, costText: '38 gold', affordable: true, locked: false, lockText: '' });
    expect(cardInfo(hard, 'road').costText).toBe('3 gold per tile');
    expect(cardInfo(hard, 'house').costText).toBe('6 gold per plot');
    expect(cardInfo(cityAt('relaxed'), 'temple').costText).toBe('96 gold');
    expect(cardInfo(cityAt('normal'), 'temple').costText).toBe('120 gold');
    expect(cardInfo(hard, 'demolish').costText).toBe('Refunds a quarter');
    const gold = ECONOMY.debtFloor + 35;                                      // a Normal well fits, a Hard one does not
    expect(cardInfo(cityAt('normal', gold), 'well').affordable).toBe(true);
    expect(cardInfo(cityAt('hard', gold), 'well').affordable).toBe(false);
  });
  it('previews the scaled cost for a building, a road, plots and a demolish', () => {
    const w = cityAt('hard');
    const ok = toolPreview(w, { tool: { kind: 'building', type: 'well' }, ghost: { x: 12, y: 9 } });
    expect([ok.state, ok.cost]).toEqual(['ok', 38]);
    const blocked = toolPreview(w, { tool: { kind: 'building', type: 'well' }, ghost: { x: 20, y: 20 } });
    expect([blocked.state, blocked.cost]).toEqual(['bad', 38]);
    expect(toolPreview(w, { tool: { kind: 'road' }, line: { x0: 12, y0: 14, x1: 16, y1: 14, flip: false } }).cost).toBe(15);
    expect(toolPreview(w, { tool: { kind: 'houses' }, area: { x0: 12, y0: 15, x1: 14, y1: 15 } }).cost).toBe(18);
    expect(place(w, 'temple', 12, 8).ok).toBe(true);
    expect(toolPreview(w, { tool: { kind: 'demolish' }, area: { x0: 12, y0: 8, x1: 13, y1: 9 } }).refund).toBe(37);
  });
  it('puts the scaled cost in the confirm bar and charges it on confirm', () => {
    const { root, cleanup } = mount();
    try {
      const world = cityAt('hard');
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      const bar = createConfirmBar({ container: root, store, placement, onCancel: () => {}, onConfirm: () => {}, onUndo: () => {} });
      placement.start({ kind: 'building', type: 'well' }, { x: 12, y: 9 });
      placement.moveGhost(12, 9);
      bar.render();
      expect(root.querySelector('.cost').textContent).toBe('38 gold');
      placement.confirm();
      expect(world.gold).toBe(1000 - 38);
    } finally { cleanup(); }
  });
  it('names a fix in the nudge only when this city can pay for it', () => {
    const goal = GOALS[0];
    for (const [d, named] of [['relaxed', true], ['hard', false]]) {
      const w = cityAt(d, 90);                                                 // a granary: 64 on Relaxed, 100 on Hard
      const farm = addRaw(w, 'farm_grain', 2, 8);
      const alert = { code: 'no_storage', id: farm.id };
      const t = alertText(alert, w);
      expect([d, nudgeLineText(w, [alert], goal)]).toEqual([d, named ? `${T.next}: ${t.title}. ${t.fix}` : `${T.next}: ${goal.text}`]);
    }
  });
});

describe('ui difficulty setting', () => {
  it('starts at Normal, keeps a level that is set and ignores anything else', () => {
    const { root, cleanup } = mount();
    try {
      expect(DEFAULT_SETTINGS.difficulty).toBe('normal');
      const storage = storageWith(null);
      const s = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(s.get().difficulty).toBe('normal');
      s.set({ difficulty: 'hard' });
      expect(s.get().difficulty).toBe('hard');
      expect(JSON.parse(storage.data['thebes.settings']).difficulty).toBe('hard');
      s.set({ difficulty: 'brutal' });
      expect(s.get().difficulty).toBe('hard');
      expect(createSettings({ storage, root, systemReducedMotion: () => false }).get().difficulty).toBe('hard');
      expect(createSettings({ storage: storageWith({ difficulty: 'easy' }), root, systemReducedMotion: () => false }).get().difficulty).toBe('normal');
    } finally { cleanup(); }
  });
  it('starts every new city at the difficulty the settings hold', async () => {
    let r = await bootWith({ storage: storageWith({ difficulty: 'hard' }), params: 'skipTitle=1&seed=8' });
    try {
      expect(r.api.game().world.difficulty).toBe('hard');
      r.api.hooks.newCity();
      expect(r.api.game().world.difficulty).toBe('hard');
    } finally { r.cleanup(); }
    r = await bootWith({ storage: storageWith({ difficulty: 'relaxed' }) });
    try {
      expect(r.api.phase()).toBe('title');
      fire(r.root.querySelector('#title .new-city'), 'click');
      expect(r.api.game().world.difficulty).toBe('relaxed');
    } finally { r.cleanup(); }
    r = await bootWith({ storage: storageWith(null), params: 'skipTitle=1&seed=8' });
    try { expect(r.api.game().world.difficulty).toBe('normal'); } finally { r.cleanup(); }
  });
});
