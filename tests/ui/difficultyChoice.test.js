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
import { T, DIFFICULTY_NAMES, difficultyHint, V80_U_TEXT } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../helpers/uiWorld.js';
import { mount, fire, openNewCity } from '../helpers/dom.js';

function storageWith(value) {
  const data = { 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true, ...value }) };   // Stage 4 (Track G): the picture cards were seen; Version 6.0 (Track D2): and the lesson done, so the title offers New city
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
  it('puts Peaceful, Relaxed, Normal and Hard as tiles on the new-city card, chooses the level it is given, and reports a new choice', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
      const container = root.querySelector('#title');
      const chosen = [];
      const card = createTitleCard({ container, hasSave: false, difficulty: 'hard', onContinue() {}, onNewCity() {}, onSound() {}, onDifficulty: (d) => chosen.push(d) });
      expect(container.querySelector('.title-difficulty')).toBe(null);                // Version 8.0: not on the title itself, on the card New city (Play) opens
      expect(document.activeElement).toBe(container.querySelector('.new-city'));     // focus starts on the first button
      openNewCity(container);
      const row = container.querySelector('.title-difficulty');
      const choices = [...row.querySelectorAll('.choice.difficulty')];
      expect(choices.map((b) => b.querySelector('.tile-name').textContent)).toEqual(DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]));
      expect(choices.map((b) => b.querySelector('.tile-line').textContent)).toEqual(DIFFICULTY_ORDER.map((d) => V80_U_TEXT.difficultyLine(d)));   // one line each, from the data
      expect(choices.map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON']);
      expect(row.getAttribute('role')).toBe('group');
      expect(row.getAttribute('aria-label')).toBe(T.difficultyForNewCities);
      expect(pressed(row)).toEqual(['hard']);
      expect(document.activeElement).toBe(choices[3]);                                 // the card opens on the chosen level
      fire(choices[1], 'click');
      expect([pressed(row), chosen]).toEqual([['relaxed'], ['relaxed']]);
      card.destroy();
      createTitleCard({ container, hasSave: true, difficulty: () => 'nonsense', onContinue() {}, onNewCity() {}, onSound() {} });
      expect(document.activeElement).toBe(container.querySelector('.continue'));
      openNewCity(container);
      expect(pressed(container)).toEqual(['normal']);                                  // anything else: Normal
    } finally { cleanup(); }
  });
  it('says what each level changes, from the data', () => {
    // Stage 3 (Track F): the first line names the danger (tests/stage3/balance/difficultyHint.test.js ties it to the sim).
    expect(difficultyHint('relaxed')).toBe('Later raids about 50% smaller. Fire, sickness and theft risk build 50% slower.\nBuildings and trade routes cost about 20% less.\nRoads: 2 gold a tile.');
    expect(difficultyHint('normal')).toBe('Raids, fire, sickness and theft risk as usual.\nBuildings and trade routes at their usual cost.\nRoads: 2 gold a tile.');
    expect(difficultyHint('hard')).toBe('Later raids about 50% bigger. Fire, sickness and theft risk build 50% faster.\nBuildings and trade routes cost about 25% more.\nRoads: 3 gold a tile.');
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
      openNewCity(title);
      expect(pressed(title)).toEqual(['hard']);
      fire(title.querySelector('.choice.difficulty[data-value="relaxed"]'), 'click');
      expect(JSON.parse(storage.data['thebes.settings']).difficulty).toBe('relaxed');   // the last one used, next time
      fire(title.querySelector('.start-city'), 'click');
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
      openNewCity(title);
      expect(pressed(title)).toEqual(['normal']);                                      // the first time: Normal
      fire(title.querySelector('.choice.difficulty[data-value="hard"]'), 'click');
      fire(title.querySelector('.start-city'), 'click');
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
      // The title itself, then the new-city card closed and with More choices open (Version 8.0).
      for (const step of ['title', 'card', 'more']) {
        if (step === 'card') openNewCity(r.root);
        if (step === 'more') fire(card.querySelector('.more-choices-toggle'), 'click');
        const box = card.getBoundingClientRect();
        expect([step, box.top >= shell.top - 0.5, box.bottom <= shell.bottom + 0.5, box.left >= shell.left, box.right <= shell.right + 0.5]).toEqual([step, true, true, true, true]);
        for (const b of card.querySelectorAll('button:not([hidden]), select')) {
          if (b.closest('[hidden]')) continue;
          const rect = b.getBoundingClientRect();
          expect([step, b.textContent, rect.width >= 44, rect.height >= 44]).toEqual([step, b.textContent, true, true]);
        }
        expect(card.scrollHeight <= card.clientHeight + 1 || getComputedStyle(card).overflowY === 'auto').toBe(true);   // all of it can be reached
      }
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
      const group = body.querySelector(`[role="group"][aria-label="${V80_U_TEXT.newCityLevel}"]`);   // Version 8.0: under Saves, "New cities start at"
      expect(group.closest('.row').textContent).toContain(V80_U_TEXT.newCityLevel);
      expect(group.closest('.options-group').classList.contains('saves')).toBe(true);
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
