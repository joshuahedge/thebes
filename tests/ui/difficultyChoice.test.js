import { describe, it, expect } from '../harness.js';
import { createTitleCard } from '../../src/ui/titleCard.js';
import { createMenuSheets } from '../../src/ui/menu.js';
import { createSettings } from '../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { boot, loadSave } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { packSave } from '../../src/save/serialize.js';
import { createWorld } from '../../src/sim/world.js';
import { roadCostOf } from '../../src/sim/costs.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
import { T, DIFFICULTY_NAMES, difficultyHint } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

function storageWith(value) {
  const data = value ? { 'thebes.settings': JSON.stringify(value) } : {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

// boot on the real page shell at a given size, with settings storage of our own (tests/ui/boot.test.js rigs it the same way).
async function bootAt({ width = 1280, height = 800, storage = storageWith(null), store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const pressed = (root) => [...root.querySelectorAll('.choice.difficulty')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.value);

describe('ui difficulty choice', () => {
  it('puts Peaceful, Relaxed, Normal and Hard under New city, chooses the level it is given, and reports a new choice', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
      const container = root.querySelector('#title');
      const chosen = [];
      const card = createTitleCard({ container, hasSave: false, difficulty: 'hard', onContinue() {}, onNewCity() {}, onSound() {}, onDifficulty: (d) => chosen.push(d) });
      const row = container.querySelector('.title-difficulty');
      expect(row.previousElementSibling.classList.contains('new-city')).toBe(true);   // directly under New city
      const choices = [...row.querySelectorAll('.choice.difficulty')];
      expect(choices.map((b) => b.textContent)).toEqual(DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]));
      expect(choices.map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON']);
      expect(row.querySelector('[role="group"]').getAttribute('aria-label')).toBe(T.difficultyForNewCities);
      expect(pressed(row)).toEqual(['hard']);
      expect(row.querySelector('.difficulty-hint').textContent).toBe(difficultyHint('hard'));
      expect(choices[0].getAttribute('aria-describedby')).toBe(row.querySelector('.difficulty-hint').id);
      fire(choices[1], 'click');
      expect([pressed(row), chosen]).toEqual([['relaxed'], ['relaxed']]);
      expect(row.querySelector('.difficulty-hint').textContent).toBe(difficultyHint('relaxed'));
      expect(document.activeElement).toBe(container.querySelector('.new-city'));     // focus still starts on the first button
      card.destroy();
      createTitleCard({ container, hasSave: true, difficulty: 'nonsense', onContinue() {}, onNewCity() {}, onSound() {} });
      expect(pressed(container)).toEqual(['normal']);                                  // anything else: Normal
      expect(document.activeElement).toBe(container.querySelector('.continue'));
    } finally { cleanup(); }
  });
  it('says what each level changes, from the data', () => {
    expect(difficultyHint('relaxed')).toBe('Buildings and trade routes cost about 20% less.\nRoads: 2 gold a tile.');
    expect(difficultyHint('normal')).toBe('Buildings and trade routes at their usual cost.\nRoads: 2 gold a tile.');
    expect(difficultyHint('hard')).toBe('Buildings and trade routes cost about 25% more.\nRoads: 3 gold a tile.');
  });
  it('ties the hint to the sim: the road price is the one a city of that level charges, the percentage is the level\'s', () => {
    for (const level of DIFFICULTY_ORDER) {
      const hint = difficultyHint(level);
      const road = Number(/Roads: (\d+) gold a tile\.$/.exec(hint)[1]);
      expect([level, road]).toEqual([level, roadCostOf(createWorld({ seed: 1, difficulty: level }))]);
      const pct = /about (\d+)% (less|more)/.exec(hint);
      const multiplier = DIFFICULTIES[level].cost;
      if (multiplier === 1) expect(pct).toBe(null);                                   // Normal: "at their usual cost", no percentage
      else expect([level, 100 + Number(pct[1]) * (pct[2] === 'less' ? -1 : 1)]).toEqual([level, Math.round(multiplier * 100)]);
    }
    expect(roadCostOf(createWorld({ seed: 1, difficulty: 'relaxed' }))).toBe(roadCostOf(createWorld({ seed: 1, difficulty: 'normal' })));   // the rounding the hint owns up to: Relaxed roads cost no less
  });
  it('preselects the setting on the title card, keeps a new choice, and starts New city with it', async () => {
    const storage = storageWith({ difficulty: 'hard' });
    const r = await bootAt({ storage });
    try {
      const title = r.root.querySelector('#title');
      expect(pressed(title)).toEqual(['hard']);
      fire(title.querySelector('.choice.difficulty[data-value="relaxed"]'), 'click');
      expect(JSON.parse(storage.data['thebes.settings']).difficulty).toBe('relaxed');   // the last one used, next time
      fire(title.querySelector('.new-city'), 'click');
      expect(r.api.phase()).toBe('game');
      expect(r.api.game().world.difficulty).toBe('relaxed');
    } finally { r.cleanup(); }
  });
  it('starts the city with the chosen level through the confirmation over a saved city', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await store.save(packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 7200000, lastSpeed: 1 }));
    const storage = storageWith(null);
    const r = await bootAt({ store, storage });
    try {
      const title = r.root.querySelector('#title');
      expect(pressed(title)).toEqual(['normal']);                                      // the first time: Normal
      fire(title.querySelector('.choice.difficulty[data-value="hard"]'), 'click');
      fire(title.querySelector('.new-city'), 'click');
      expect(r.api.phase()).toBe('title');                                             // it asks first
      fire(title.querySelector('.start-new'), 'click');
      expect(r.api.game().world.difficulty).toBe('hard');
      await flush(); await flush();                                                    // the new city's first autosave
      expect((await loadSave(store)).world.difficulty).toBe('hard');
    } finally { r.cleanup(); }
  });
  it('keeps every title button and choice 44 px and the card on a small phone at 150% text', async () => {
    const r = await bootAt({ width: 360, height: 640, storage: storageWith({ textSize: 150, difficulty: 'hard' }) });
    try {
      const card = r.root.querySelector('.title-card');
      const shell = r.root.getBoundingClientRect();
      const box = card.getBoundingClientRect();
      expect([box.top >= shell.top - 0.5, box.bottom <= shell.bottom + 0.5, box.left >= shell.left, box.right <= shell.right + 0.5]).toEqual([true, true, true, true]);
      for (const b of card.querySelectorAll('button:not([hidden])')) {
        const rect = b.getBoundingClientRect();
        expect([b.textContent, rect.width >= 44, rect.height >= 44]).toEqual([b.textContent, true, true]);
      }
      expect(card.scrollHeight <= card.clientHeight + 1 || getComputedStyle(card).overflowY === 'auto').toBe(true);   // all of it can be reached
    } finally { r.cleanup(); }
  });
  it('holds the level for new cities in Settings, and leaves the city being played as it began', async () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const settings = createSettings({ storage: storageWith(null), root, systemReducedMotion: () => false });
      const store = createStore(INITIAL_UI_STATE);
      const menus = createMenuSheets({ store, settings, toasts: { show() {} } });
      const body = root.querySelector('#body');
      menus.settings(body, { close() {} });
      const group = body.querySelector(`[role="group"][aria-label="${T.difficultyForNewCities}"]`);
      expect(group.closest('.row').textContent).toContain(T.difficultyForNewCities);
      expect([...group.querySelectorAll('.choice.difficulty')].map((b) => b.textContent)).toEqual(['Peaceful', 'Relaxed', 'Normal', 'Hard']);
      expect(pressed(group)).toEqual(['normal']);
      fire(group.querySelector('[data-value="hard"]'), 'click');
      expect([settings.get().difficulty, pressed(group)]).toEqual(['hard', ['hard']]);
      expect(body.querySelector('.difficulty-note').textContent).toBe(T.difficultyNote);
    } finally { cleanup(); }
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.difficulty = 'hard';
      r.store.set(openSheet(r.store.get(), 'summary'));
      const summary = () => r.root.querySelector('#sheet').textContent;
      expect(summary()).toContain(T.difficulty);
      expect(summary()).toContain(DIFFICULTY_NAMES.hard);
      r.ui.settings.set({ difficulty: 'relaxed' });                                     // the next city's level, not this one's
      r.ui.refresh();
      expect(r.world.difficulty).toBe('hard');
      expect(summary()).toContain(DIFFICULTY_NAMES.hard);
      expect(summary().includes(DIFFICULTY_NAMES.relaxed)).toBe(false);
    } finally { r.cleanup(); }
  });
});
